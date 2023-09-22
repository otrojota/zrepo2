class MultiColTable extends ZDashboardElement {
    get code() { return "multi-col-table" }
    get exportable() { return true }
    async refresh(start, end, operation = "refresh") {
        try {
            this.start = start;
            this.end = end;
           if (!this.options.agrupadores || !this.options.agrupadores.length) throw "No ha configurado las columnas";
            if (operation == "refresh") {
            }
            let startRow = 0;
            let nRows = 20;

            let rows = await zPost("getDSRows.zrepo", {dsCode:this.options.dataSet, startRow, nRows, fromTime:this.start.valueOf(), toTime: this.end.valueOf(), filter:""})
            
            let agrupadoresHeaders = this.options.agrupadores.reduce((html, a) => {
                html += `<td>${a.tituloColumna}</td>`;
                return html;
            }, "");
            let html = `
                <table class="table table-dark table-striped">
                    <thead>
                        <tr>
                            ${agrupadoresHeaders}
                        </tr>
                    </thead>
                    <tbody>
            `;
            let totales = { sum: 0, n: 0 };
            for (let row of rows) {
                html += `<tr>`;

                for (let i = 0; i < this.options.agrupadores.length; i++) {
                    let idColumna = this.options.agrupadores[i].idColumna;
                    html += `   <td>${row[idColumna]}</td>`;
                }
                html += `</tr>`;
                if (row.n !== undefined) {
                    totales.n += row.n;
                    totales.sum += row.value;
                    if (totales.min === undefined || row.min < totales.min) totales.min = row.min;
                    if (totales.max === undefined || row.max > totales.max) totales.max = row.max;
                }
            }
            let tfoot = "";
            if (this.options.totalsRow) {
                tfoot += "<tfoot><tr><td>Totales</td>";
                for (let i = 1; i < this.options.agrupadores.length; i++) {
                    tfoot += `   <td></td>`;
                }
                tfoot += `<td class="text-end">${this.getTotal()}</td>`;
                tfoot += "</tr></tfoot>";
            }
            html += `
                    </tbody>
                    ${tfoot}
                </table>
            `;
            this.tableContainer.innerHTML = html;
            // Guardar para exportación
            this.data = rows;
        } catch (error) {
            console.error(error);
            this.showError(error.toString());
        }
    }

    async refreshData() {
        let ds = this.edDataSet.selectedRow;
        if (!ds) {
            for (let i = 0; i < 21; i++) this.rowsList.hideColumn(i);
            return;
        }
        if (ds.temporality == "none") {
            this.rowsList.hideColumn(0);
        } else {
            this.rowsList.showColumn(0);
        }
        for (let i = 0; i < 20; i++) {
            if (i < ds.columns.length) {
                let th = this.find("[data-z-field='c" + (i + 1) + "']")
                let col = i < ds.columns.length ? ds.columns[i] : null;
                if (col) {
                    this.rowsList.showColumn(i + 1);
                    th.innerText = col.name;
                    th.className = "text-center";
                    this.rowsList.columns[i + 1].cellClass = null;
                    if (col.type == "number") {
                        th.className = "text-right"
                        this.rowsList.columns[i + 1].cellClass = "text-right"
                    }
                }
            } else {
                this.rowsList.hideColumn(i + 1);
            }
        }
        this.rowsList.refresh();
    }

    getTotal() {
        return 11;
    }

    doResize() {
        super.doResize();
    }

    export() {
        let nDec = this.q.variable.options ? this.q.variable.options.decimals : 2;
        if (isNaN(nDec)) nDec = 2;
        let periodo = describePeriodoParaBloqueTemporalidad(this.dashboard.indiceBloqueTemporalidad, this.dashboard.start, this.dashboard.end);
        let titulo = this.options && this.options.titulo ? this.options.titulo : "Exportación de Datos";
        let unit;
        if (this.q.accum == "n") unit = "N°";
        else unit = this.q.variable.options ? this.q.variable.options.unit : "S/U";
        let subtitulo = this.options.tituloColumnaDimension || "";

        // https://docs.sheetjs.com/docs/getting-started/example

        let rows = [[titulo], [periodo], []];

        for (let i = 0; i < this.options.agrupadores.length; i++) {
            rows[2].push(this.options.agrupadores[i].tituloColumnaDimension);
        }
        rows[2].push(unit);
        for (let i = 2; i < 6; i++) {
            let accum = eval("this.options.accum" + i);
            if (accum && accum != "no") {
                rows[2].push(this.getTituloAccum(accum));
            }
        }

        // Fila con etiquetas de dimension horizontal        
        for (let r of this.data) {
            let row = [];
            for (let i = 1; i <= this.options.agrupadores.length; i++) {
                let dim = "dim_" + i;
                row.push(r[dim].name);
            }
            row.push(r.resultado);

            for (let i = 2; i < 6; i++) {
                let accum = eval("this.options.accum" + i);
                if (accum && accum != "no") row.push(this.extraeAccum(accum, r))
            }

            rows.push(row);
        }

        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Export");
        XLSX.writeFile(workbook, "export.xlsx", { compression: true });
    }
}
ZVC.export(MultiColTable);
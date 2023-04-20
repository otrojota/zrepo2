class MultiDimTable extends ZDashboardElement {
    get code() { return "multi-dim-table" }
    get exportable() { return true }
    async refresh(start, end, operation = "refresh") {
        try {
            this.start = start;
            this.end = end;

            if (!this.q) throw "No ha configurado variable";
            if (!this.options.agrupadores || !this.options.agrupadores.length) throw "No ha configurado las columnas de agrupación";
            if (operation == "refresh") {
                this.q.groupingDimensions = this.options.agrupadores.map(a => (a.ruta));
                this.q.filters = this.prepareFilters();
            }
            let { promise, controller } = await this.q.query({
                format: "multi-dim", startTime: start.valueOf(), endTime: end.valueOf()
            });
            let data = await promise;
            //console.log("data", data);

            // Si el dimData es "soure" se usan los datos originales de la dimension por la que se agrupa
            data = data.sort((d1, d2) => (this.comparaOrdenFilas(d1, d2)));

            let unit;
            if (this.q.accum == "n") unit = "N°";
            else unit = this.q.variable.options ? this.q.variable.options.unit : "S/U";
            let agrupadoresHeaders = this.options.agrupadores.reduce((html, a) => {
                html += `<td>${a.tituloColumnaDimension}</td>`;
                return html;
            }, "");
            let extraHeaders = "";
            if (this.options.accum2 && this.options.accum2 != "no") extraHeaders += `<td class="text-end">${this.getTituloAccum(this.options.accum2)}</td>`;
            if (this.options.accum3 && this.options.accum3 != "no") extraHeaders += `<td class="text-end">${this.getTituloAccum(this.options.accum3)}</td>`;
            if (this.options.accum4 && this.options.accum4 != "no") extraHeaders += `<td class="text-end">${this.getTituloAccum(this.options.accum4)}</td>`;
            if (this.options.accum5 && this.options.accum5 != "no") extraHeaders += `<td class="text-end">${this.getTituloAccum(this.options.accum5)}</td>`;
            let html = `
                <table class="table table-dark table-striped">
                    <thead>
                        <tr>
                            ${agrupadoresHeaders}
                            <td class="text-end">${unit}</td>
                            ${extraHeaders}
                        </tr>
                    </thead>
                    <tbody>
            `;
            let totales = { sum: 0, n: 0 };
            for (let row of data) {
                html += `<tr>`;
                for (let i = 0; i < this.options.agrupadores.length; i++) {
                    html += `   <td>${row["dim_" + (i + 1)].name}</td>`;
                }

                let stVal = this.options.zeroFill ? "0" : "";
                if (row.resultado !== undefined) {
                    stVal = (row.resultado || 0).toLocaleString();
                }
                html += `   <td class="text-end">${stVal}</td>`;

                if (this.options.accum2 && this.options.accum2 != "no") html += `<td class="text-end">${this.extraeAccum(this.options.accum2, row)}</td>`;
                if (this.options.accum3 && this.options.accum3 != "no") html += `<td class="text-end">${this.extraeAccum(this.options.accum3, row)}</td>`;
                if (this.options.accum4 && this.options.accum4 != "no") html += `<td class="text-end">${this.extraeAccum(this.options.accum4, row)}</td>`;
                if (this.options.accum5 && this.options.accum5 != "no") html += `<td class="text-end">${this.extraeAccum(this.options.accum5, row)}</td>`;

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
                tfoot += `<td class="text-end">${this.getTotal(this.q.accum, totales)}</td>`;
                if (this.options.accum2 && this.options.accum2 != "no") tfoot += `<td class="text-end">${this.getTotal(this.options.accum2, totales)}</td>`;
                if (this.options.accum3 && this.options.accum3 != "no") tfoot += `<td class="text-end">${this.getTotal(this.options.accum3, totales)}</td>`;
                if (this.options.accum4 && this.options.accum4 != "no") tfoot += `<td class="text-end">${this.getTotal(this.options.accum4, totales)}</td>`;
                if (this.options.accum5 && this.options.accum5 != "no") tfoot += `<td class="text-end">${this.getTotal(this.options.accum5, totales)}</td>`;
                tfoot += "</tr></tfoot>";
            }
            html += `
                    </tbody>
                    ${tfoot}
                </table>
            `;
            this.tableContainer.innerHTML = html;
            // Guardar para exportación
            this.data = data;
        } catch (error) {
            console.error(error);
            this.showError(error.toString());
        }
    }

    comparaOrdenFilas(r1, r2) {
        let idx = 1;
        do {
            if (idx >= this.options.agrupadores.length) return 0; // iguales
            let o1 = r1["dim_" + (idx)].order;
            let o2 = r2["dim_" + (idx)].order;
            if (o1 != o2) return o1 - o2;
            idx++;
        } while (true);
    }
    getTituloAccum(accum) {
        switch (accum) {
            case "n": return "Nª";
            case "sum": return this.q.variable.options ? this.q.variable.options.unit : "S/U";
            case "min": return "Min";
            case "max": return "Max";
            case "avg": return "Prom.";
            default: return "??: " + accum;
        }
    }
    extraeAccum(accum, row) {
        switch (accum) {
            case "n": return (row.n || 0).toLocaleString();
            case "sum": return (row.value || 0).toLocaleString();
            case "min": return (row.min !== undefined ? row.min.toLocaleString() : "");
            case "max": return (row.max !== undefined ? row.max.toLocaleString() : "");
            case "avg": return (row.n !== undefined && row.n > 0 ? (row.value / row.n).toLocaleString() : "");
            default: return "??: " + accum;
        }
    }

    getTotal(accum, totales) {
        switch (accum) {
            case "n": return totales.n;
            case "sum":
            case "value":
                return totales.sum.toLocaleString();
            case "min": return (totales.min !== undefined ? totales.min.toLocaleString() : "");
            case "max": return (totales.max !== undefined ? totales.max.toLocaleString() : "")
            case "avg": return (totales.n !== undefined && totales.n > 0 ? (totales.sum / totales.n).toLocaleString() : "");
            default: return "??: " + accum;
        }
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
                let dim = "dim_"+i;
                row.push(r[dim].name);              
            }
            row.push(r.resultado); 
            
            for (let i = 2; i < 6; i++) {
                let accum = eval("this.options.accum"+i);
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
ZVC.export(MultiDimTable);
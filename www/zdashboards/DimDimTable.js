class DimDimTable extends ZDashboardElement {
    get code() {return "dim-dim-table"}
    get exportable() {return true}
    async refresh(start, end, operation = "refresh") {
        try {
            if (operation == "refresh") {
                this.drillStack = [];
                this.hDrillFilter = null;
                this.vDrillFilter = null;
            }
            this.start = start;
            this.end = end;

            this.dispose();

            let totHorizontal = this.options.totHorizontal || "none";
            let totVertical = this.options.totVertical || "none";
            let totGlobal = this.options.totGlobal || "none";
            let vacio = this.options.vacio || "none";

            if (!this.q || !this.options.rutaH || !this.options.rutaV) return;            
            if (operation == "refresh") {
                this.q.hGroupingDimension = this.options.rutaH;
                this.q.vGroupingDimension = this.options.rutaV;
                this.q.filters = this.prepareFilters();
            } // else viene en la query de los drills down/up
            let {promise, controller} = await this.q.query({
                format:"dim-dim", startTime:start.valueOf(), endTime:end.valueOf()
            });
            // TODO: Implementar DrillDown
            let canDrillDownH = this.q.hGroupingDimension.indexOf(".") > 0;
            let canDrillDownV = this.q.vGroupingDimension.indexOf(".") > 0;
            let data = await promise;
            data = data.map(d => ({
                hName:d.hDim.name, hCode:d.hDim.code, hOrder:d.hDim.order,
                vName:d.vDim.name, vCode:d.vDim.code, vOrder:d.vDim.order,
                valor:d.resultado
            }));

            data = data.sort((d1, d2) => {
                if (d1.hOrder > d2.hOrder) return 1;
                else if (d1.hOrder < d2.hOrder) return -1;
                else if (d1.vOrder > d2.vOrder) return 1;
                else if (d1.vOrder < d2.vOrder) return -1;
                else return 0;
            });

            //console.log("data", data, canDrillDownH, canDrillDownV);

            // Contar filas y columnas para calcular tamaño mínimo
            let filas = {}, columnas = {}, valores = {}, originalData = {};
            data.forEach(row => {
                filas[row.vCode] = {code:row.vCode, name:row.vName};
                columnas[row.hCode] = {code:row.hCode, name:row.hName};
                valores[row.vCode + "-" + row.hCode] = row.valor;
                originalData[row.vCode + "-" + row.hCode] = row;
            })
            filas = Object.keys(filas).map(key => (filas[key]));
            columnas = Object.keys(columnas).map(key => (columnas[key]));

            let nDec = this.q.variable.options?this.q.variable.options.decimals:2;
            if (isNaN(nDec)) nDec = 2;

            let html = `
                <table class="table table-dark table-striped dim-dim-table">
                    <tr class="dim-dim-table-row">
                        <td></td>
            `;
            for (let iCol=0; iCol<columnas.length; iCol++) {
                let columna = columnas[iCol];
                html += `
                        <th class="dim-dim-table-col-hdr">${columna.name}</th>
                `;
            }
            if (totHorizontal != "none" || totGlobal != "none") {
                html += `
                        <th class="dim-dim-table-col-hdr text-end">TOTALES</th>
                `;
            }
            html += `
                    </tr>
            `;
            let acumGlobal, acumColumnas = {};
            for (let iRow=0; iRow<filas.length; iRow++) {
                let fila = filas[iRow], acumFila;
                html += `
                    <tr class="dim-dim-table-row">
                        <th class="dim-dim-table-row-hdr">${fila.name}</th>
                `;
                for (let iCol=0; iCol<columnas.length; iCol++) {
                    let columna = columnas[iCol];
                    let valor = parseFloat(valores[fila.code + "-" + columna.code]);
                    if (isNaN(valor) && vacio == "cero") valor = 0;
                    let stValor = "";
                    if (!isNaN(valor)) {
                        stValor = "" + valor.toFixed(nDec);
                        // Acumulador horizontal (fila)
                        if (totHorizontal == "sum") {
                            acumFila = (acumFila === undefined?0:acumFila) + valor;
                        } else if (totHorizontal == "avg_cells") {
                            if (acumFila === undefined) acumFila = {n:0, sum:0};
                            acumFila.n++;
                            acumFila.sum += valor;
                        } else if (totHorizontal == "avg_data") {
                            let d = originalData[fila.code + "-" + columna.code];
                            if (d) {
                                if (acumFila === undefined) acumFila = {n:0, sum:0};
                                acumFila.n += d.n;
                                acumFila.sum += d.value;    
                            }
                        }

                        // Acumuladores verticales (columnas)
                        if (totVertical == "sum") {
                            if (!acumColumnas[columna.code]) acumColumnas[columna.code] = 0;
                            acumColumnas[columna.code] += valor;
                        } else if (totVertical == "avg_cells") {
                            if (!acumColumnas[columna.code]) acumColumnas[columna.code] = {n:0, sum:0};
                            acumColumnas[columna.code].n++;
                            acumColumnas[columna.code].sum += valor;
                        } else if (totVertical == "avg_data") {
                            let d = originalData[fila.code + "-" + columna.code];
                            if (d) {
                                if (!acumColumnas[columna.code]) acumColumnas[columna.code] = {n:0, sum:0};
                                acumColumnas[columna.code].n += d.n;
                                acumColumnas[columna.code].sum += d.value;
                            }
                        }

                        // Acumulador Global
                        if (totGlobal == "sum") {
                            if (!acumGlobal) acumGlobal = 0;
                            acumGlobal += valor;
                        } else if (totGlobal == "avg_cells") {
                            if (!acumGlobal) acumGlobal = {n:0, sum:0};
                            acumGlobal.n++;
                            acumGlobal.sum += valor;
                        } else if (totGlobal == "avg_cells") {
                            let d = originalData[fila.code + "-" + columna.code];
                            if (d) {
                                if (!acumGlobal) acumGlobal = {n:0, sum:0};
                                acumGlobal.n += d.n;
                                acumGlobal.sum += d.value;
                            }
                        }
                    }
                    html += `
                        <td class="dim-dim-table-cell">${stValor}</td>
                    `;
                }
                if (totHorizontal != "none" || totGlobal != "none") {
                    let v = "";
                    if (acumFila !== undefined) {
                        if (totHorizontal == "sum") {
                            v = "" + acumFila.toFixed(nDec);
                        } else if (totHorizontal == "avg_cells") {
                            v = "" + (acumFila.sum / acumFila.n).toFixed(nDec);
                        } else if (totHorizontal == "avg_data") {
                            v = "" + (acumFila.sum / acumFila.n).toFixed(nDec);
                        }
                    }
                    html += `
                        <td class="dim-dim-table-cell-total">${v}</td>
                    `;
                }
                html += `
                    </tr>
                `;
            }
            if (totVertical != "none" || totGlobal != "none") {
                html += `<tr>`;
                html += `<td>TOTALES</td>`;
                for (let iCol=0; iCol<columnas.length; iCol++) {
                    let columna = columnas[iCol];
                    let v = "", accum = acumColumnas[columna.code];
                    if (accum !== undefined) {
                        if (totVertical == "sum") {
                            v = "" + accum.toFixed(nDec);
                        } else if (totVertical == "avg_cells") {
                            v = "" + (accum.sum / accum.n).toFixed(nDec);
                        } else if (totVertical == "avg_cells") {
                            v = "" + (accum.sum / accum.n).toFixed(nDec);
                        }
                    }                    
                    html += `
                            <td class="dim-dim-table-cell-total">${v}</td>
                    `;
                }
                if (totGlobal != "none" || totHorizontal != "none") {
                    let v = "";
                    if (totGlobal == "sum" && acumGlobal) v = "" + acumGlobal.toFixed(nDec);
                    else if (totGlobal == "avg_cells" && acumGlobal) v = "" + (acumGlobal.sum / acumGlobal.n).toFixed(nDec);
                    else if (totGlobal == "avg_data" && acumGlobal) v = "" + (acumGlobal.sum / acumGlobal.n).toFixed(nDec);
                    html += `
                            <td class="dim-dim-table-cell-total">${v}</td>
                    `;
                }
                html += `</tr>`;
            }
            html += `
                </table>
            `;

            this.tableContainer.innerHTML = html;

            // Guardar los datos para exportación
            this.filas = filas;
            this.columnas = columnas;
            this.valores = valores;
                        
        } catch(error) {
            console.error(error);
            this.showError(error.toString());
        }
    }

    handleHover(column) {
        if (!isNaN(column.dataItem.value)) {
            this.heatLegend.valueAxis.showTooltipAt(column.dataItem.value)
        } else {
            this.heatLegend.valueAxis.hideTooltip();
        }
    }

    drilldown(pos, dimValue) {
        this.drillStack.push({query:this.q, hDrillFilter:this.hDrillFilter, vDrillFilter:this.vDrillFilter});
        let q2 = MinZQuery.cloneQuery(this.q);
        if (pos == "h") {
            this.hDrillFilter = {ruta:this.q.hGroupingDimension, valor:dimValue};
            let p = q2.hGroupingDimension.lastIndexOf(".");
            q2.hGroupingDimension = this.q.hGroupingDimension.substr(0,p);
        } else {
            this.vDrillFilter = {ruta:this.q.vGroupingDimension, valor:dimValue};
            let p = q2.vGroupingDimension.lastIndexOf(".");
            q2.vGroupingDimension = this.q.vGroupingDimension.substr(0,p);
        }
        // Reconstruir filtros, desde la query 0 (filtro original) agregando el drill de este nivel
        q2.filters = this.drillStack[0].query.filters?JSON.parse(JSON.stringify(this.drillStack[0].query.filters)):[]; 
        if (this.hDrillFilter) q2.filters.push(this.hDrillFilter);
        if (this.vDrillFilter) q2.filters.push(this.vDrillFilter);

        this.setQuery(q2);
        this.refresh(this.start, this.end, "push");
    }
    drillUp() {
        let e = this.drillStack[this.drillStack.length - 1];
        this.drillStack.splice(this.drillStack.length - 1, 1);
        this.setQuery(e.query);
        this.hDrillFilter = e.hDrillFilter;
        this.vDrillFilter = e.vDrillFilter;
        this.refresh(this.start, this.end, "pop");
    }

    doResize() {
        super.doResize();
    }

    export() {
        let nDec = this.q.variable.options?this.q.variable.options.decimals:2;
        if (isNaN(nDec)) nDec = 2;
        let periodo = describePeriodoParaBloqueTemporalidad(this.dashboard.indiceBloqueTemporalidad, this.dashboard.start, this.dashboard.end);
        let titulo = this.options && this.options.titulo?this.options.titulo:"Exportación de Datos";

        // https://docs.sheetjs.com/docs/getting-started/example

        let rows = [[titulo], [periodo]];

        // Fila con etiquetas de dimension horizontal
        let row = [""];
        for (let iCol=0; iCol<this.columnas.length; iCol++) {
            let columna = this.columnas[iCol];
            row.push(columna.name);            
        }
        rows.push(row);

        // Filas con Etiqueta Vertical y Datos
        for (let iRow=0; iRow<this.filas.length; iRow++) {
            let fila = this.filas[iRow];
            row = [fila.name];
            for (let iCol=0; iCol<this.columnas.length; iCol++) {
                let columna = this.columnas[iCol];
                let valor = this.valores[fila.code + "-" + columna.code];
                if (!isNaN(valor)) {
                    valor = parseFloat(valor).toFixed(nDec);
                } else {
                    valor = "";
                }
                row.push(valor);            
            }
            rows.push(row);
        }


        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Export");
        XLSX.writeFile(workbook, "export.xlsx", { compression: true });
    }
}
ZVC.export(DimDimTable);
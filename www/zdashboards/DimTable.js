class DimTable extends ZDashboardElement {
    get code() {return "dim-table"}
    get exportable() {return true}
    async refresh(start, end, operation = "refresh") {
        try {
            if (operation == "refresh") this.drillStack = [];
            this.start = start;
            this.end = end;

            if (!this.q || !this.options.ruta) throw "No ha configurado variable";            
            if (operation == "refresh") {
                this.q.groupingDimension = this.options.ruta;
                this.q.filters = this.prepareFilters();
            } // else viene en la query de los drills down/up
            let {promise, controller} = await this.q.query({
                format:"dim-serie", startTime:start.valueOf(), endTime:end.valueOf()
            });
            let canDrillDown = this.q.groupingDimension.indexOf(".") > 0;
            let data = await promise;            

            // Si el dimData es "soure" se usan los datos originales de la dimension por la que se agrupa
            if (this.options.dimData == "source") {
                // obtener dimension
                let dimension = await this.q.getDimensionDeRuta(this.options.ruta);
                let dimQuery = new MinZQuery(window.zRepoClient, dimension, null, null, null);    
                dimQuery.filters = this.prepareFilters(this.options.dimFilter);          
                let rows = await dimQuery.query({format:"dim-rows"});
                // agregar campo "dim"
                for (let row of rows) {
                    row.dim = {code: row.code, name: row.name};
                }
                // crear mapa para acelerar mapeao
                let map = rows.reduce((map, row) => {
                    map[row.code] = row;
                    return map;
                }, {});
                for (let row of data) {
                    let r = map[row.dim.code];
                    if (r) {
                        r.resultado = row.resultado;
                        r.min = row.min;
                        r.max = row.max;
                        r.n = row.n;
                        r.value = row.value;
                    }
                }
                data = rows;
            } else {
                data = data.sort((d1, d2) => (d1.dim.order - d2.dim.order));
            }

            
            let unit;
            if (this.q.accum == "n") unit = "N°";
            else unit = this.q.variable.options?this.q.variable.options.unit:"S/U";
            let titulo = this.options.tituloColumnaDimension || "";
            let extraHeaders = "";
            if (this.options.accum2 && this.options.accum2 != "no") extraHeaders += `<td class="text-end">${this.getTituloAccum(this.options.accum2)}</td>`;
            if (this.options.accum3 && this.options.accum3 != "no") extraHeaders += `<td class="text-end">${this.getTituloAccum(this.options.accum3)}</td>`;
            if (this.options.accum4 && this.options.accum4 != "no") extraHeaders += `<td class="text-end">${this.getTituloAccum(this.options.accum4)}</td>`;
            if (this.options.accum5 && this.options.accum5 != "no") extraHeaders += `<td class="text-end">${this.getTituloAccum(this.options.accum5)}</td>`;            
            let html = `
                <table class="table table-dark table-striped">
                    <thead>
                        <tr>
                            <td>${titulo}</td>
                            <td class="text-end">${unit}</td>
                            ${extraHeaders}
                        </tr>
                    </thead>
                    <tbody>
            `;
            let totales = {sum:0, n:0};
            for (let row of data) {
                html += `<tr>`;
                html += `   <td>${row.dim.name}</td>`;
                let stVal = this.options.zeroFill?"0":"";
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
        } catch(error) {
            console.error(error);
            this.showError(error.toString());
        }
    }

    getTituloAccum(accum) {
        switch(accum) {
            case "n":   return "Nª";
            case "sum": return this.q.variable.options?this.q.variable.options.unit:"S/U";
            case "min": return "Min";
            case "max": return "Max";
            case "avg": return "Prom.";
            default: return "??: " + accum;
        }
    }
    extraeAccum(accum, row) {
        switch(accum) {
            case "n":   return (row.n || 0);
            case "sum": return (row.value || 0).toLocaleString();
            case "min": return (row.min !== undefined?row.min.toLocaleString():"");
            case "max": return (row.max !== undefined?row.max.toLocaleString():"");
            case "avg": return (row.n !== undefined && row.n > 0?(row.value / row.n).toLocaleString():"");
            default: return "??: " + accum;
        }
    }

    getTotal(accum, totales) {
        switch(accum) {
            case "n":   return totales.n;
            case "sum": return totales.sum.toLocaleString();
            case "min": return (totales.min !== undefined?totales.min.toLocaleString():"");
            case "max": return (totales.max !== undefined?totales.max.toLocaleString():"")
            case "avg": return (totales.n !== undefined && totales.n > 0?(totales.sum / totales.n).toLocaleString():"");
            default: return "??: " + accum;
        }
    }

    drilldown(dimValue) {
        this.drillStack.push(this.q);
        let q2 = MinZQuery.cloneQuery(this.q);
        let p = q2.groupingDimension.lastIndexOf(".");
        q2.groupingDimension = this.q.groupingDimension.substr(0,p);
        // Reconstruir filtros, desde la query 0 (filtro original) agregando el drill de este nivel
        q2.filters = this.drillStack[0].filters?JSON.parse(JSON.stringify(this.drillStack[0].filters)):[];        
        q2.filters.push({ruta:this.q.groupingDimension, valor:dimValue});
        this.setQuery(q2);
        this.refresh(this.start, this.end, "push");
    }
    drillUp() {
        let q = this.drillStack[this.drillStack.length - 1];
        this.drillStack.splice(this.drillStack.length - 1, 1);
        this.setQuery(q);
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
        let unit;
        if (this.q.accum == "n") unit = "N°";
        else unit = this.q.variable.options?this.q.variable.options.unit:"S/U";
        let subtitulo = this.options.tituloColumnaDimension || "";

        // https://docs.sheetjs.com/docs/getting-started/example

        let rows = [[titulo], [periodo], [subtitulo, unit]];

        // Fila con etiquetas de dimension horizontal        
        for (let r of this.data) {
            let row = [];
            row.push(r.dim.name);
            row.push(r.resultado);
            rows.push(row);
        }

        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Export");
        XLSX.writeFile(workbook, "export.xlsx", { compression: true });
    }
}
ZVC.export(DimTable);
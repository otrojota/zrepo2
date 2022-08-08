class DimTable extends ZDashboardElement {
    get code() {return "dim-table"}
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
            data = data.sort((d1, d2) => (d1.dim.order - d2.dim.order));
            let unit;
            if (this.q.accum == "n") unit = "N°";
            else unit = this.q.variable.options?this.q.variable.options.unit:"S/U";
            let titulo = this.options.tituloColumnaDimension || "";
            let html = `
                <table class="table table-dark table-striped">
                    <thead>
                        <tr>
                            <td>${titulo}</td>
                            <td class="text-end">${unit}</td>
                        </tr>
                    </thead>
                    <tbody>
            `;
            for (let row of data) {
                html += `<tr>`;
                html += `   <td>${row.dim.name}</td>`;
                html += `   <td class="text-end">${(row.resultado || 0).toLocaleString()}</td>`;
                html += `</tr>`;
            }
            html += `
                    </tbody>
                </table>
            `;
            this.tableContainer.innerHTML = html;
        } catch(error) {
            console.error(error);
            this.showError(error.toString());
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
}
ZVC.export(DimTable);
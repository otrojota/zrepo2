class ResumeTable extends ZDashboardElement {
    get code() {return "resume-table"}    
    async refresh(start, end, operation = "refresh") {
        try {
            if (operation == "refresh") this.drillStack = [];
            this.start = start;
            this.end = end;

            if (!this.q) throw "No ha configurado variable";            
            if (operation == "refresh") {
                this.q.groupingDimension = this.options.ruta;
                delete this.q.accum;
                this.q.filters = this.prepareFilters();
            } // else viene en la query de los drills down/up
            let {promise, controller} = await this.q.query({
                format:"period-summary", startTime:start.valueOf(), endTime:end.valueOf()
            });
            let data = await promise;
            let html = `
                <table class="table table-dark table-striped">
                    <tbody>
            `;
            if (this.options.showN) {
                html += `<tr>`;
                html += `   <td>${this.options.showN}</td>`;
                html += `   <td class="text-end">${(data.n || 0).toLocaleString()}</td>`;
                html += `</tr>`;
            }
            if (this.options.showSum) {
                html += `<tr>`;
                html += `   <td>${this.options.showSum}</td>`;
                html += `   <td class="text-end">${(data.value || 0).toLocaleString()}</td>`;
                html += `</tr>`;
            }
            if (this.options.showAvg) {
                html += `<tr>`;
                html += `   <td>${this.options.showAvg}</td>`;
                html += `   <td class="text-end">${(data.n > 0?(data.value / data.n).toLocaleString():"")}</td>`;
                html += `</tr>`;
            }
            if (this.options.showMin) {
                html += `<tr>`;
                html += `   <td>${this.options.showMin}</td>`;
                html += `   <td class="text-end">${(data.min || 0).toLocaleString()}</td>`;
                html += `</tr>`;
            }
            if (this.options.showMax) {
                html += `<tr>`;
                html += `   <td>${this.options.showMax}</td>`;
                html += `   <td class="text-end">${(data.max || 0).toLocaleString()}</td>`;
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
ZVC.export(ResumeTable);
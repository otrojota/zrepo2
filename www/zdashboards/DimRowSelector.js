class DimRowSelector extends ZDashboardElement {        
    onThis_init(options) {
        this.setOptions(options);
        this["onEd-" + zId + "_change"] = _ => {            
            let code = this.ed.selectedRow?this.ed.selectedRow.code:null;
            this.setParam(this.paramName, code?code:this.minzQuery);
        }
    }

    get ed() {return this["ed-" + zId]}
    get dependsOnTime() {return false}

    get paramName() {return this.options.paramName}
    get dimension() {return this.options.dimension}
    get dimensionObject() {
        return window.zRepoClient.getDimension(this.dimension);
    }
    get emptyText() {return this.options.emptyText}
    get nonEmptyPrefix() {return this.options.nonEmptyPrefix}
    get filters() {return this.options.filters}

    get code() {return "dimRowSelector"}
    doResize() {}

    get preferedHeight() {return 50;}

    declareParams() {return [{name:this.paramName, type:this.dimension}]}

    isEmpty() {
        if (!this.minzQuery) return true;
        return this.minzQuery.filters.length == 0 && this.minzQuery.fixedFilters.length == 0;
    }

    async initElement() {
        this.dim = await this.dimensionObject;
        if (!this.dim) {
            this.showError("No se ha configurado la dimensión");
            return;
        }
        this.minzQuery = new MinZQuery(window.zRepoClient, this.dim, null, this.filters, null);
        await this.minzQuery.construyeDescripcionFiltros();
    }

    async refresh(start, end) {
        if (!this.minzQuery) return;
        try {
            let fixedFilters = this.prepareFilters();
            // Limpiar query actual y aplicar filtros fijos
            this.minzQuery.filters = [];
            this.minzQuery.fixedFilters = fixedFilters;            
            let rows = await this.minzQuery.query({format:"dim-rows"});
            if (this.nonEmptyPrefix) rows = rows.map(r => ({code:r.code, name:this.nonEmptyPrefix + " " + r.name}));
            if (this.emptyText) rows = [{code:null, name:"[" + this.emptyText + "]"}].concat(rows);
            this.ed.setRows(rows);
            this["onEd-" + zId + "_change"]();
        } catch(error) {
            console.error(error);
            this.showError(error.toString());
        }
    }

}

ZVC.export(DimRowSelector);
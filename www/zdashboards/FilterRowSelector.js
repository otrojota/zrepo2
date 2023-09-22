class FilterRowSelector extends ZDashboardElement {
    onThis_init(options) {
        this.setOptions(options);
        this.filtro = options.filtro;
        console.log("options ", options);
        this["onEd-" + zId + "_change"] = _ => {
            let code = this.ed.selectedRow ? this.ed.selectedRow.code : null;
            //this.setParam(this.paramName, code ? code : "nose");
        }
    }

    get ed() { return this["ed-" + zId] }
    get dependsOnTime() { return false }

    get paramName() { return this.options.paramName }

    get emptyText() { return this.options.emptyText }
    get nonEmptyPrefix() { return this.options.nonEmptyPrefix }
    get filters() { return this.options.filters }

    get code() { return "filterText" }
    doResize() { }

    get preferedHeight() { return 50; }

    declareParams() { return [{ name: this.paramName, type: this.dimension }] }

    isEmpty() {
        if (!this.minzQuery) return true;
        return this.minzQuery.filters.length == 0 && this.minzQuery.fixedFilters.length == 0;
    }

    async initElement() {
        if (!this.filtro) {
            this.showError("No se ha configurado el filtro");
            return;
        }
    }

    async refresh(start, end) {
        try {
            //TODO GABO traer listado según tipo filtro en FilterRowSelectorConfig
/*             if(filtro == combinacion){
                muestra lista de combianciones
            } */
            let rows = [
                { "code": "000", "name": this.options.paramName },
                { "code": "001", "name": "Item 1" },
                { "code": "002", "name": "Item 2" },
                { "code": "003", "name": "Item 3" }];
            this.ed.setRows(rows);
            this["onEd-" + zId + "_change"]();
        } catch (error) {
            console.error(error);
            this.showError(error.toString());
        }
    }
}

ZVC.export(FilterRowSelector);
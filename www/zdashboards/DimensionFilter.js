class DimensionFilter extends ZDashboardElement {
    onThis_init(options) {
        this.setOptions(options);
    }

    get dependsOnTime() {return false}

    get paramName() {return this.options.paramName}
    get dimension() {return this.options.dimension}
    get dimensionObject() {
        return window.zRepoClient.getDimension(this.dimension);
    }
    get emptyText() {return this.options.emptyText}
    get nonEmptyPrefix() {return this.options.nonEmptyPrefix}
    get filters() {return this.options.filters}

    get code() {return "dimFilter"}
    doResize() {}
    get preferedHeight() {
        //return 68;
        let h = parseInt(this.borderedContainer.view.getBoundingClientRect().height) + 2;
        //console.log("h", h);
        return h;
    }

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
        this.minzQuery = new MinZQuery(window.zRepoClient, this.dim,null, this.filters, null);
        await this.minzQuery.construyeDescripcionFiltros();
    }
    async refresh(start, end) {        
        //console.log("DimensionFilter refresh", this.dimension);
        if (!this.minzQuery) return;
        try {
            let fixedFilters = this.prepareFilters();
            // Limpiar query actual y aplicar filtros fijos
            this.minzQuery.filters = [];
            this.minzQuery.fixedFilters = fixedFilters;
            this.setParam(this.paramName, this.minzQuery);
            await this.minzQuery.construyeDescripcionFiltros();
            await this.refreshDescription();
        } catch(error) {
            console.error(error);
            this.showError(error.toString());
        }
    }

    async refreshDescription() {
        let msg = this.emptyText;
        if (!this.isEmpty()) {
            if (this.minzQuery.descripcionFiltros.length == 1 && this.minzQuery.descripcionFiltros[0].ruta == "") {
                msg = this.minzQuery.descripcionFiltros[0].etiqueta;
            } else {
                msg = this.nonEmptyPrefix + " " + this.minzQuery.descripcionFiltros.map(f => (f.etiqueta)).join(" Y ");
            }
        }
        this.dimFilter.text = msg;
    }
    async onDimFilter_click() {        
        this.showDialog("common/WMinZFilters", {esDimension:true, consulta: this.minzQuery}, async q => {
            this.minzQuery = q;
            await this.minzQuery.construyeDescripcionFiltros();
            this.setParam(this.paramName, this.minzQuery);
            this.refreshDescription();
            this.dashboard.callResize();
        })
    }
}
ZVC.export(DimensionFilter);
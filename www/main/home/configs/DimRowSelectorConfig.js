class DimRowSelectorConfig extends ZCustomController {
    async onThis_init(component) {
        this.msgError.hide();
        this.component = component;
        if (!this.component.dimension) {
            let dims = window.zRepoClient.dimensiones;
            if (dims.length) {
                this.component.dimension = dims[0].code;
                setTimeout(_ => this.triggerEvent("designChange"), 200);
            }
        }
        this.edDimension.setGroups(window.zrepo.dimensionsTree, "name", "dimensions", this.component.dimension);        

        await this.refresh();
    }

    async getDashboard() {
        return await this.triggerEvent("getDashboard")
    }

    async refresh() {
        this.edParamName.value = this.component.paramName;
        this.edDimension.value = this.component.dimension;
        this.edEmptyText.value = this.component.emptyText;
        this.edNonEmptyPrefix.value = this.component.nonEmptyPrefix;
        let q = await this.getMinzQueryFiltros();
        await q.construyeDescripcionFiltros();
        if (q.filters.length) {
            this.cmdFiltro.text = q.descripcionFiltros.map(d => d.etiqueta).join(" y ");
        }  else {
            this.cmdFiltro.text = "Filtrar";
        }
    }

    validate() {
        this.msgError.hide();
        try {            
            return true;
        } catch(error) {
            this.msgError.text = error;
            this.msgError.show();
            return false;
        }
    }

    async onEdParamName_change() {
        if (!this.validate()) return;
        this.component.paramName = this.edParamName.value;
        this.triggerEvent("currentNodeRenamed", "${" + this.component.paramName + "}");
        await this.triggerEvent("designChange");
    }
    async onEdDimension_change() {
        if (!this.validate()) return;
        this.component.dimension = this.edDimension.value;
        await this.triggerEvent("designChange");
    }
    async onEdEmptyText_change() {
        if (!this.validate()) return;
        this.component.emptyText = this.edEmptyText.value;
        await this.triggerEvent("designChange");
    }
    async onEdNonEmptyPrefix_change() {
        if (!this.validate()) return;
        this.component.nonEmptyPrefix = this.edNonEmptyPrefix.value;
        await this.triggerEvent("designChange");
    }
    async getMinzQueryFiltros() {
        let v = await window.zRepoClient.dimensiones.find(d => d.code == this.component.dimension);
        if (!v) {
            this.showDialog("common/WError", {message:"No se encontró la Dimensión " + this.component.dimension});
            return null;
        }
        return new MinZQuery(window.zRepoClient, v, null, null, this.component.filters || []);
    }
    async onCmdFiltro_click() {
        let q = await this.getMinzQueryFiltros();        
        if (!q) return;
        let dsb = await this.getDashboard();
        this.showDialog("common/WMinZFilters", {consulta:q, paramsProvider:dsb}, newQ => {
            this.component.filters = newQ.filters;
            this.triggerEvent("designChange");
            this.refresh();
        })
    }

    async onCmpOptions_eliminar() {await this.triggerEvent("eliminar")}
}
ZVC.export(DimRowSelectorConfig);
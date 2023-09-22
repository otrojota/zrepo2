class FilterRowSelectorConfig extends ZCustomController {
    async onThis_init(component) {
        this.msgError.hide();
        this.component = component;
        this.edFiltros.setRows([{ //TODO GABO debe ser un arreglo dentro de zrepo-->ñib
            code: "combinacion", name: "Combinación", lista: [{},{},{},{}] 
        }, {    code: "nTarjeta", name: "N° Tarjeta"
        }, {
            code: "rut", name: "Rut"
        }, {
            code: "nombreFuncionario", name: "Nombre Funcionario"
        }, {
            code: "empresa", name: "Empresa"
        }, {
            code: "origen", name: "Origen"
        }])


        await this.refresh();
    }

    async getDashboard() {
        return await this.triggerEvent("getDashboard")
    }

    async refresh() {
        this.edParamName.value = this.component.paramName ? this.component.paramName: "";
        this.edFiltros.value = this.component.filtro ? this.component.filtro: "";
    }

    validate() {
        this.msgError.hide();
        try {
            return true;
        } catch (error) {
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
    async onEdFiltros_change() {
        if (!this.validate()) return;
        this.component.filtro = this.edFiltros.value;
        await this.triggerEvent("designChange");
    }

    async onCmpOptions_eliminar() { await this.triggerEvent("eliminar") }
    onCmpOptions_mover() { this.triggerEvent("mover") }
}
ZVC.export(FilterRowSelectorConfig);
class DinamicTable extends ZCustomController {
    async onThis_init(component) {
        this.msgError.hide();
        this.component = component;
        this.refresh();
    }

    get dataSet() { return this.edDataSet.selectedRow }

    async getDashboard() {
        return await this.triggerEvent("getDashboard")
    }

    async refresh() {
        this.component.variable = "sin_variable";
        this.edHeight.value = this.component.height || 60;
        this.edTitulo.value = this.component.titulo || "";
        if (!this.component.dataSet && window.zRepoClient.dataSets.length) {
            this.component.dataSet = window.zRepoClient.dataSets[0].code;
            setTimeout(_ => this.triggerEvent("designChange"), 100);
        }
        this.edDataSet.setGroups(window.zrepo.dataSetsTree, "name", "dataSets", this.component.dataSet);
        this.component.dataSetSelected = this.dataSet;
        this.cmpDef = ZDashboardElement.getComponent(this.component.type);
        if (this.cmpDef.propsPath) this.cmpOptions.showConfigurar();
        else this.cmpOptions.hideConfigurar();
    }


    validate() {
        this.msgError.hide();
        try {
            let v = parseInt(this.edHeight.value);
            if (isNaN(v) || v < 0 || v > 10000) throw "La altura es inválida";
            if (!this.edDataSet) throw "Debe seleccionar un DataSet";
            return true;
        } catch (error) {
            this.msgError.text = error;
            this.msgError.show();
            return false;
        }
    }


    async onEdDataSet_change() {
        if (!this.validate()) return;
        this.component.dataSet = this.dataSet.code;
        await this.triggerEvent("designChange");
    }

    async onEdHeight_change() {
        if (!this.validate()) return;
        this.component.height = parseInt(this.edHeight.value);
        await this.triggerEvent("designChange");
    }
    async onEdTitulo_change() {
        if (!this.validate()) return;
        this.component.titulo = this.edTitulo.value;
        await this.triggerEvent("designChange");
    }


    async onCmpOptions_eliminar() { await this.triggerEvent("eliminar") }
    async onCmpOptions_configurar() {
        let w = this.cmpDef.propsPath;
        if (!w) {
            this.showDialog("common/WError", { message: "Componente " + this.component.type + " no manejado" });
            return;
        }
        this.component.dashboard = this.getDashboard();
        this.showDialog(w, this.component, opts => {
            delete this.component.dashboard;
            Object.keys(opts).forEach(k => this.component[k] = opts[k]);
            this.triggerEvent("designChange");
        })
    }
    onCmpOptions_mover() { this.triggerEvent("mover") }

}
ZVC.export(DinamicTable);
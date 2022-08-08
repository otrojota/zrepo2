class RootConfig extends ZCustomController {
    async onThis_init(dashboard) {
        this.dashboard = dashboard;
        let bloques = bloquesTemporalidad.map((b, idx) => ({code:nivelesTemporalidad[idx], name:b}));
        this.edTemporalidad.setRows(bloques, this.dashboard.config.temporality); 
        this.refresh();
    }

    refresh() {
        this.edName.value = this.dashboard.name;
        this.edIcono.value = this.dashboard.icon;
        this.edTitulo.value = this.dashboard.config.title;
    }

    onCmdBuscarIcono_click() {
        window.open("https://fontawesome.com/search?m=free", "_blank");
    }

    async onEdName_change() {this.dashboard.name = this.edName.value; await this.triggerEvent("designChange");}
    async onEdIcono_change() {this.dashboard.icon = this.edIcono.value; await this.triggerEvent("designChange");}
    async onEdTemporalidad_change() {this.dashboard.config.temporality = this.edTemporalidad.value; await this.triggerEvent("designChange");}
    async onEdTitulo_change() {this.dashboard.config.title = this.edTitulo.value; await this.triggerEvent("designChange");}
}
ZVC.export(RootConfig);
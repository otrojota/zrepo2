class RootConfig extends ZCustomController {
    async onThis_init(dashboard) {
        this.dashboard = dashboard;
        let bloques = bloquesTemporalidad.map((b, idx) => ({code:nivelesTemporalidad[idx], name:b}));
        this.edTemporalidad.setRows(bloques, this.dashboard.config.temporality); 
        await this.refrescaPeriodosInicio();
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

    refrescaPeriodosInicio() {
        let t = this.edTemporalidad.value;
        let rows = getPeriodosParaTemporalidad(t);
        let periodoActual = this.dashboard.config.periodoInicio, periodoSeleccionar;
        if (periodoActual && rows.findIndex(p => p.code == periodoActual) >= 0) {
            periodoSeleccionar = periodoActual;
        } else {
            periodoSeleccionar = getPeriodoDefaultTemporalidad(t);
        }
        this.edPeriodoInicio.setRows(rows, periodoSeleccionar);
    }
    async onEdName_change() {this.dashboard.name = this.edName.value; await this.triggerEvent("designChange");}
    async onEdIcono_change() {this.dashboard.icon = this.edIcono.value; await this.triggerEvent("designChange");}
    async onEdTemporalidad_change() {this.dashboard.config.temporality = this.edTemporalidad.value; this.refrescaPeriodosInicio(); await this.triggerEvent("designChange");}
    async onEdPeriodoInicio_change() {this.dashboard.config.periodoInicio = this.edPeriodoInicio.value; await this.triggerEvent("designChange");}
    async onEdTitulo_change() {this.dashboard.config.title = this.edTitulo.value; await this.triggerEvent("designChange");}
}
ZVC.export(RootConfig);
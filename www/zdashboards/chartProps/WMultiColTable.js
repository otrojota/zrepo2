class WMultiColTable extends ZDialog {
    onThis_init(options) {
        this.options = options;
        this.agrupadores = options.agrupadores || [];
        this.edTotalsRow.checked = options.totalsRow ? true : false;

        console.log("WMultiColTable  this.options  " +  this.options)
        this.refrescaAgrupadores();
    }

    refrescaAgrupadores() {
        this.rptAgrupadores.refresh();
    }
    onRptAgrupadores_getRows() {
        let rows = this.agrupadores.map((r, idx) => ({
            agrupador: r,
            index: idx,
            datatSet: this.options.datatSet
        }))
        return rows;
    }

    onRptAgrupadores_eliminar(index) {
        this.agrupadores.splice(index, 1);
        this.refrescaAgrupadores();
    }

    onCmdAgregarAgrupador_click() {
        let agrupador = { tituloColumna: "", idColumna: "" }
        this.agrupadores.push(agrupador);
        this.refrescaAgrupadores();
    }

    onCmdCloseWindow_click() {
        this.cancel()
    }
    onCmdCancel_click() {
        this.cancel()
    }

    async onCmdOk_click() {
        this.close({
            agrupadores: this.agrupadores,
            totalsRow: this.edTotalsRow.checked
        });
    }
}
ZVC.export(WMultiColTable);
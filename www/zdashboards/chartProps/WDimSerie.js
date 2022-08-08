class WDimSerie extends ZDialog {
    onThis_init(options) {
        this.options = options;
        this.ruta = this.options.ruta;
        let v = options.variable;
        if (typeof v == "string") {
            v = window.zRepoClient.variables.find(x => x.code == v);
        }
        this.tmpQuery = new MinZQuery(window.zRepoClient, v);
        if (!this.ruta) {
            this.edRuta.value = "[Sin Selección]";
        } else {
            this.edRuta.value = this.ruta;
        }

        this.edTipoSerie.setRows([{
            code:"bars", name:"Barras"
        }, {
            code:"columns", name:"Columnas"
        }], options.serieType)
    }    

    onCmdSeleccionaRuta_click() {
        this.showDialog("common/WMinZRoute", {consulta:this.tmpQuery, ruta:this.ruta}, newRuta => {
            this.ruta = newRuta;
            this.edRuta.value = this.ruta;
        })
    }
    onCmdCloseWindow_click() {
        this.cancel()
    }
    onCmdCancel_click() {
        this.cancel()
    }

    async onCmdOk_click() {
        this.close({ruta: this.ruta, serieType:this.edTipoSerie.value});
    }
}
ZVC.export(WDimSerie);
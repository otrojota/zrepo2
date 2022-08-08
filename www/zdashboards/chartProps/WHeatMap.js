class WHeatMap extends ZDialog {
    onThis_init(options) {
        this.options = options;
        this.rutaH = this.options.rutaH;
        this.rutaV = this.options.rutaV;
        let v = options.variable;
        if (typeof v == "string") {
            v = window.zRepoClient.variables.find(x => x.code == v);
        }
        this.tmpQuery = new MinZQuery(window.zRepoClient, v);
        if (!this.rutaH) {
            this.edRutaH.value = "[Sin Selección]";
        } else {
            this.edRutaH.value = this.rutaH;
        }
        if (!this.rutaV) {
            this.edRutaV.value = "[Sin Selección]";
        } else {
            this.edRutaV.value = this.rutaV;
        }
        this.edIndiceColor.value = options.indiceColor;
    }    

    onCmdSeleccionaRutaH_click() {
        this.showDialog("common/WMinZRoute", {consulta:this.tmpQuery, ruta:this.rutaH}, newRuta => {
            this.rutaH = newRuta;
            this.edRutaH.value = this.rutaH;
        })
    }
    onCmdSeleccionaRutaV_click() {
        this.showDialog("common/WMinZRoute", {consulta:this.tmpQuery, ruta:this.rutaV}, newRuta => {
            this.rutaV = newRuta;
            this.edRutaV.value = this.rutaV;
        })
    }
    onCmdCloseWindow_click() {
        this.cancel()
    }
    onCmdCancel_click() {
        this.cancel()
    }

    async onCmdOk_click() {
        let indiceColor = parseInt(this.edIndiceColor.value);
        if (indiceColor < 0 || indiceColor > 512) return;
        this.close({rutaH: this.rutaH, rutaV: this.rutaV, indiceColor});
    }
}
ZVC.export(WHeatMap);
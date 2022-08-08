class WForceDirectedTree extends ZDialog {
    onThis_init(options) {
        this.options = options;
        this.topDim = this.options.topDim;
        this.bottomDim = this.options.bottomDim;
        let v = options.variable;
        if (typeof v == "string") {
            v = window.zRepoClient.variables.find(x => x.code == v);
        }
        this.tmpQuery = new MinZQuery(window.zRepoClient, v);
        if (!this.topDim) {
            this.edTopDim.value = "[Sin Selección]";
        } else {
            this.edTopDim.value = this.topDim;
        }
        if (!this.bottomDim) {
            this.edBottomDim.value = "[Sin Selección]";
        } else {
            this.edBottomDim.value = this.bottomDim;
        }

    }    

    onCmdSeleccionaTopDim_click() {
        this.showDialog("common/WMinZRoute", {consulta:this.tmpQuery, ruta:this.topDim}, newRuta => {
            this.topDim = newRuta;
            this.edTopDim.value = newRuta;
        })
    }
    onCmdSeleccionaBottomDim_click() {
        this.showDialog("common/WMinZRoute", {consulta:this.tmpQuery, ruta:this.bottomDim}, newRuta => {
            this.bottomDim = newRuta;
            this.edBottomDim.value = newRuta;
        })
    }
    onCmdCloseWindow_click() {
        this.cancel()
    }
    onCmdCancel_click() {
        this.cancel()
    }

    async onCmdOk_click() {
        this.close({topDim: this.topDim, bottomDim:this.bottomDim});
    }
}
ZVC.export(WForceDirectedTree);
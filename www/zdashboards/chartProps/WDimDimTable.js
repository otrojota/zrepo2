class WDimDimTable extends ZDialog {
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
        let totalizadores = [{
            code:"none", name:"No Usar"
        }, {
            code:"sum", name:"Suma de Valores"
        }, {
            code:"avg_cells", name:"Promedio de Celdas"
        }, {
            code:"avg_data", name:"Promedio de Muestras Originales"
        }]
        this.edTotHorizontal.setRows(totalizadores, options.totHorizontal || "none");
        this.edTotVertical.setRows(totalizadores, options.totVertical || "none");
        this.edTotGlobal.setRows(totalizadores, options.totGlobal || "none");

        this.edVacios.setRows(
            [{code:"none", name:"No Mostrar"}, {code:"cero", name:"Llenar con ceros"}],
            options.vacio || "none"
        )
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
        this.close({
            rutaH: this.rutaH, rutaV: this.rutaV, totHorizontal: this.edTotHorizontal.value, 
            totVertical: this.edTotVertical.value, totGlobal: this.edTotGlobal.value,
            vacio: this.edVacios.value
        });
    }
}
ZVC.export(WDimDimTable);
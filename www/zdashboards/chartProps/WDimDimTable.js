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

        this.dimDataH = this.options.dimDataH || "inQuery";
        this.dimFilterH = this.options.dimFilterH;
        this.edDimDataH.setRows([{
            code:"inQuery", name:"Resultado Consulta"
        }, {
            code:"source", name:"Buscar en Dimensión"
        }], this.dimDataH);
        this.cambioDimDataH();

        this.dimDataV = this.options.dimDataV || "inQuery";
        this.dimFilterV = this.options.dimFilterV;
        this.edDimDataV.setRows([{
            code:"inQuery", name:"Resultado Consulta"
        }, {
            code:"source", name:"Buscar en Dimensión"
        }], this.dimDataV);
        this.cambioDimDataV();
    }    

    onCmdSeleccionaRutaH_click() {
        this.showDialog("common/WMinZRoute", {consulta:this.tmpQuery, ruta:this.rutaH}, newRuta => {
            this.rutaH = newRuta;
            this.edRutaH.value = this.rutaH;
            this.dimDataH = "inQuery";
            this.edDimDataH.value = this.dimDataH;
            this.dimFilterH = null;
            this.cambioDimDataH();
        })
    }
    onCmdSeleccionaRutaV_click() {
        this.showDialog("common/WMinZRoute", {consulta:this.tmpQuery, ruta:this.rutaV}, newRuta => {
            this.rutaV = newRuta;
            this.edRutaV.value = this.rutaV;
            this.dimDataV = "inQuery";
            this.edDimDataV.value = this.dimDataV;
            this.dimFilterV = null;
            this.cambioDimDataV();
        })
    }

    onEdDimDataH_change() {
        this.dimDataH = this.edDimDataH.value;
        this.cambioDimDataH();
    }    

    cambioDimDataH() {
        if (this.dimDataH == "inQuery") {
            this.colFiltroDimensionH.hide();
            return;
        }
        this.colFiltroDimensionH.show();
        this.refrescaFiltroDimensionH();
    }


    async refrescaFiltroDimensionH() {
        if (!this.rutaH || !this.dimFilterH || !this.dimFilterH.length) {
            this.cmdFiltroDimensionH.text = "Filtar datos de la Dimensión Horizontal";
            return;
        }        
        let dimension = await this.tmpQuery.getDimensionDeRuta(this.rutaH);
        let filtrosQuery = new MinZQuery(window.zRepoClient, dimension, null, null, this.dimFilterH);
        await filtrosQuery.construyeDescripcionFiltros();
        if (filtrosQuery.filters.length) {
            this.cmdFiltroDimensionH.text = filtrosQuery.descripcionFiltros.map(d => d.etiqueta).join(" y ");
        }  else {
            this.cmdFiltroDimensionH.text = "Filtrar datos de la Dimensión Horizontal";
        }
    }

    async onCmdFiltroDimensionH_click() {
        if (!this.rutaH) {
            this.showDialog("common/WError", {message: "Debe seleccionar la ruta para 'Agrupador Horizontal' antes de filtrar las filas de la dimensión"});
            return;
        }
        let dimension = await this.tmpQuery.getDimensionDeRuta(this.rutaH);
        let filtrosQuery = new MinZQuery(window.zRepoClient, dimension, null, null, this.dimFilterH);
        let dsb = await this.options.dashboard;
        this.showDialog("common/WMinZFilters", {
            consulta: filtrosQuery,
            paramsProvider: dsb,
            esDimension: true
        }, q => {
            this.dimFilterH = q.filters;
            this.refrescaFiltroDimensionH();
        })
    }

    onEdDimDataV_change() {
        this.dimDataV = this.edDimDataV.value;
        this.cambioDimDataV();
    }    

    cambioDimDataV() {
        if (this.dimDataV == "inQuery") {
            this.colFiltroDimensionV.hide();
            return;
        }
        this.colFiltroDimensionV.show();
        this.refrescaFiltroDimensionV();
    }


    async refrescaFiltroDimensionV() {
        if (!this.rutaV || !this.dimFilterV || !this.dimFilterV.length) {
            this.cmdFiltroDimensionV.text = "Filtar datos de la Dimensión Vertical";
            return;
        }        
        let dimension = await this.tmpQuery.getDimensionDeRuta(this.rutaV);
        let filtrosQuery = new MinZQuery(window.zRepoClient, dimension, null, null, this.dimFilterV);
        await filtrosQuery.construyeDescripcionFiltros();
        if (filtrosQuery.filters.length) {
            this.cmdFiltroDimensionV.text = filtrosQuery.descripcionFiltros.map(d => d.etiqueta).join(" y ");
        }  else {
            this.cmdFiltroDimensionV.text = "Filtrar datos de la Dimensión Vertical";
        }
    }

    async onCmdFiltroDimensionV_click() {
        if (!this.rutaV) {
            this.showDialog("common/WError", {message: "Debe seleccionar la ruta para 'Agrupador Vertical' antes de filtrar las filas de la dimensión"});
            return;
        }
        let dimension = await this.tmpQuery.getDimensionDeRuta(this.rutaV);
        let filtrosQuery = new MinZQuery(window.zRepoClient, dimension, null, null, this.dimFilterV);
        let dsb = await this.options.dashboard;
        this.showDialog("common/WMinZFilters", {
            consulta: filtrosQuery,
            paramsProvider: dsb,
            esDimension: true
        }, q => {
            this.dimFilterV = q.filters;
            this.refrescaFiltroDimensionV();
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
            vacio: this.edVacios.value,
            dimDataH: this.dimDataH, dimFilterH: this.dimFilterH,
            dimDataV: this.dimDataV, dimFilterV: this.dimFilterV
        });
    }
}
ZVC.export(WDimDimTable);
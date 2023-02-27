class WDimTable extends ZDialog {
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
        this.edTituloColumnaDimension.value = options.tituloColumnaDimension || "";

        this.dimData = this.options.dimData || "inQuery";
        this.dimFilter = this.options.dimFilter;
        this.edDimData.setRows([{
            code:"inQuery", name:"Resultado Consulta"
        }, {
            code:"source", name:"Buscar en Dimensión"
        }], this.dimData);
        this.cambioDimData();
        this.edZeroFill.checked = this.options.zeroFill?true:false;
    }    

    onCmdSeleccionaRuta_click() {
        this.showDialog("common/WMinZRoute", {consulta:this.tmpQuery, ruta:this.ruta}, newRuta => {
            this.ruta = newRuta;
            this.edRuta.value = this.ruta;
            this.dimData = "inQuery";
            this.edDimData.value = this.dimData;
            this.dimFilter = null;
            this.cambioDimData();
        })
    }

    onEdDimData_change() {
        this.dimData = this.edDimData.value;
        this.cambioDimData();
    }    

    cambioDimData() {
        if (this.dimData == "inQuery") {
            this.colFiltroDimension.hide();
            this.colZeroFill.hide();
            return;
        }
        this.colFiltroDimension.show();
        this.colZeroFill.show();
        this.refrescaFiltroDimension();
    }


    async refrescaFiltroDimension() {
        if (!this.ruta || !this.dimFilter || !this.dimFilter.length) {
            this.cmdFiltroDimension.text = "Filtar datos de la Dimensión";
            return;
        }        
        let dimension = await this.tmpQuery.getDimensionDeRuta(this.ruta);
        let filtrosQuery = new MinZQuery(window.zRepoClient, dimension, null, null, this.dimFilter);
        await filtrosQuery.construyeDescripcionFiltros();
        if (filtrosQuery.filters.length) {
            this.cmdFiltroDimension.text = filtrosQuery.descripcionFiltros.map(d => d.etiqueta).join(" y ");
        }  else {
            this.cmdFiltroDimension.text = "Filtrar datos de la Dimensión";
        }
    }

    async onCmdFiltroDimension_click() {
        if (!this.ruta) {
            this.showDialog("common/WError", {message: "Debe seleccionar la ruta para 'Agrupar por' antes de filtrar las filas de la dimensión"});
            return;
        }
        let dimension = await this.tmpQuery.getDimensionDeRuta(this.ruta);
        let filtrosQuery = new MinZQuery(window.zRepoClient, dimension, null, null, this.dimFilter);
        let dsb = await this.options.dashboard;
        this.showDialog("common/WMinZFilters", {
            consulta: filtrosQuery,
            paramsProvider: dsb,
            esDimension: true
        }, q => {
            this.dimFilter = q.filters;
            this.refrescaFiltroDimension();
        })

    }

    onCmdCloseWindow_click() {
        this.cancel()
    }
    onCmdCancel_click() {
        this.cancel()
    }

    async onCmdOk_click() {
        this.close({ruta: this.ruta, tituloColumnaDimension:this.edTituloColumnaDimension.value, dimData: this.dimData, dimFilter: this.dimFilter, zeroFill: this.edZeroFill.checked});
    }
}
ZVC.export(WDimTable);
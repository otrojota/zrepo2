class FilaAgrupador extends ZCustomController {
    onThis_init(options) {
        this.options = options;
        this.agrupador = options.agrupador;
        let v = options.variable;
        if (typeof v == "string") {
            v = window.zRepoClient.variables.find(x => x.code == v);
        }
        this.tmpQuery = new MinZQuery(window.zRepoClient, v);
        if (!this.agrupador.ruta) {
            this.edRuta.value = "[Sin Selección]";
        } else {
            this.edRuta.value = this.agrupador.ruta;
        }
        this.edTituloColumnaDimension.value = this.agrupador.tituloColumnaDimension || "";

        /*
        this.edDimData.setRows([{
            code:"inQuery", name:"Resultado Consulta"
        }, {
            code:"source", name:"Buscar en Dimensión"
        }], this.agrupador.dimData);
        this.cambioDimData();
        */
    }

    onEdTituloColumnaDimension_change() {
        this.agrupador.tituloColumnaDimension = this.edTituloColumnaDimension.value;
    }
    /*
    onEdDimData_change() {
        this.agrupador.dimData = this.edDimData.value;
        this.cambioDimData();
    }
    cambioDimData() {
        if (this.agrupador.dimData == "inQuery") {
            this.colFiltroDimension.hide();
            return;
        }
        this.colFiltroDimension.show();
        this.refrescaFiltroDimension();
    }
    */

    onCmdSeleccionaRuta_click() {
        this.showDialog("common/WMinZRoute", {consulta:this.tmpQuery, ruta:this.agrupador.ruta}, newRuta => {
            this.agrupador.ruta = newRuta;
            this.edRuta.value = this.agrupador.ruta;
            //this.agrupador.dimData = "inQuery";
            //this.edDimData.value = this.agrupador.dimData;
            //this.agrupador.dimFilter = null;
            //this.cambioDimData();
        })
    }

    /*
    async refrescaFiltroDimension() {
        if (!this.agrupador.ruta || !this.agrupador.dimFilter || !this.agrupador.dimFilter.length) {
            this.cmdFiltroDimension.text = "Filtar datos de la Dimensión";
            return;
        }        
        let dimension = await this.tmpQuery.getDimensionDeRuta(this.agrupador.ruta);
        let filtrosQuery = new MinZQuery(window.zRepoClient, dimension, null, null, this.agrupador.dimFilter);
        await filtrosQuery.construyeDescripcionFiltros();
        if (filtrosQuery.filters.length) {
            this.cmdFiltroDimension.text = filtrosQuery.descripcionFiltros.map(d => d.etiqueta).join(" y ");
        }  else {
            this.cmdFiltroDimension.text = "Filtrar datos de la Dimensión";
        }
    }

    async onCmdFiltroDimension_click() {
        if (!this.agrupador.ruta) {
            this.showDialog("common/WError", {message: "Debe seleccionar la ruta para 'Agrupar por' antes de filtrar las filas de la dimensión"});
            return;
        }
        let dimension = await this.tmpQuery.getDimensionDeRuta(this.agrupador.ruta);
        let filtrosQuery = new MinZQuery(window.zRepoClient, dimension, null, null, this.agrupador.dimFilter);
        let dsb = await this.options.dashboard;
        this.showDialog("common/WMinZFilters", {
            consulta: filtrosQuery,
            paramsProvider: dsb,
            esDimension: true
        }, q => {
            this.agrupador.dimFilter = q.filters;
            this.refrescaFiltroDimension();
        })
    }
    */

    onCmdEliminarAgrupador_click() {
        this.showDialog("common/WConfirm", {message:"¿Confirma que desea eliminar este agrupador?"}, _ => {
            this.triggerEvent("eliminar", this.options.index);
        })        
    }
}
ZVC.export(FilaAgrupador)
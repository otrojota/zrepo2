class WTimeSerie extends ZDialog {
    async onThis_init(options) {
        this.options = options;
        let seriesTypes = [{
            code:"line", name:"Gráfico de Líneas"
        }, {
            code:"smoothed-line", name:"Gráfico de Líneas Suavizadas"
        }, {
            code:"columns", name:"Gráfico de Columnas"
        }, {
            code:"curved-columns", name:"Columnas Curvas"
        }, {
            code:"area", name:"Gráfico de Área"
        }, {
            code:"smoothed-area", name:"Gráfico de Área Suavizada"
        }, {
            code:"rounded-columns", name:"Columnas Redondeadas"
        }]
        this.edTipoSerie.setRows(seriesTypes, options.serieType)
        this.edZoomTiempo.checked = options.zoomTiempo;

        if (this.options.usaVariable2) {
            this.edUsaVariable2.checked = true;
            this.panelVariable2.show();
        } else {
            this.edUsaVariable2.checked = false;
            this.panelVariable2.hide();
        }
        this.usaVariable2 = options.usaVariable2?true:false;

        this.edVariable2.setGroups(window.zrepo.variablesTree, "name", "variables", this.options.variable2);
        this.edAcumulador2.setRows([{
            code:"value", name:"Suma en Período"
        }, {
            code:"n", name:"Nº Muestras Período"
        }, {
            code:"avg", name:"Promedio Período"
        }, {
            code:"min", name:"Mínimo en el Período"
        }, {
            code:"max", name:"Máximo en el Período"
        }], this.options.acumulador2)        
        this.edTipoSerie2.setRows(seriesTypes, options.serieType2)
        this.filters2 = this.options.filters2 || [];
        await this.refreshFilter();
        this.edLeyendas.setRows([{
            code:"none", name:"[No mostrar Leyendas]"
        }, {
            code:"bottom", name:"Abajo"
        }], options.leyendas);
        this.edNombreSerie.value = options.nombreSerie || "";
        this.edNombreSerie2.value = options.nombreSerie2 || "";
    }    

    get variable2() {return this.edVariable2.selectedRow}
    get codigoVariable2() {
        let v = this.variable2;
        if (!v) return null;
        return v.code;
    }

    getDashboard() {return this.options.dashboard}

    onEdUsaVariable2_change() {
        if (this.edUsaVariable2.checked) this.panelVariable2.show();
        else this.panelVariable2.hide();
    }

    async onEdVariable2_change() {
        this.filters2 = [];
        this.refreshFilter();
    }

    async getMinzQueryFiltros2() {
        if (!this.codigoVariable2) return null;
        let v = await window.zRepoClient.variables.find(v => v.code == this.codigoVariable2);
        if (!v) {
            this.showDialog("common/WError", {message:"No se encontró la Variable " + this.codigoVariable2});
            return null;
        }
        return new MinZQuery(window.zRepoClient, v, null, null, this.filters2);
    }
    async onCmdFiltro2_click() {
        let q = await this.getMinzQueryFiltros2();        
        if (!q) return;
        let dsb = await this.getDashboard();
        this.showDialog("common/WMinZFilters", {consulta:q, paramsProvider:dsb}, newQ => {
            this.filters2 = newQ.filters;            
            this.refreshFilter();
        })
    }

    async refreshFilter() {
        let q = await this.getMinzQueryFiltros2();
        if (!q) {
            this.cmdFiltro2.text = "Seleccione Variable";
        }
        await q.construyeDescripcionFiltros();
        if (q.filters.length) {
            this.cmdFiltro2.text = q.descripcionFiltros.map(d => d.etiqueta).join(" y ");
        }  else {
            this.cmdFiltro2.text = "Filtrar";
        }
    }

    onCmdCloseWindow_click() {
        this.cancel()
    }
    onCmdCancel_click() {
        this.cancel()
    }

    async onCmdOk_click() {
        let opts = {
            serieType: this.edTipoSerie.value,
            zoomTiempo: this.edZoomTiempo.checked,
            nombreSerie: this.edNombreSerie.value,
            usaVariable2: this.edUsaVariable2.checked,
            leyendas: this.edLeyendas.value
        }
        try {
            opts.usaVariable2 = this.edUsaVariable2.checked;
            if (opts.usaVariable2) {
                opts.variable2 = this.codigoVariable2;
                if (!opts.variable2) throw "Debe seleccionar la Segunda Variable";
                opts.filters2 = this.filters2;
                opts.acumulador2 = this.edAcumulador2.value;
                opts.serieType2 = this.edTipoSerie2.value;
                opts.nombreSerie2 = this.edNombreSerie2.value;
            }
        } catch(error) {
            this.showDialog("common/WError", {message: error.toString()});
            return;
        }
        this.close(opts);
    }
}
ZVC.export(WTimeSerie);
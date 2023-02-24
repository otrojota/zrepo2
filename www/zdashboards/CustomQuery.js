class CustomQuery extends ZCustomController {    
    get chart() {return this.chartLoader.content}
    get variable() {return this.edVariable.selectedRow}

    async onThis_init() {
        //am4core.options.autoDispose = true;
        this.edVariable.setGroups(window.zrepo.variablesTree, "name", "variables");
        let rows = ZDashboardElement.getCoomponentsList().map(c => ({code:c.type, name:c.name}));
        this.edQuery.setRows(rows, "timeSerie");
        this.edAcumulador.setRows([{
            code:"value", name:"Suma en Período"
        }, {
            code:"n", name:"Nº Muestras Período"
        }, {
            code:"avg", name:"Promedio Período"
        }, {
            code:"min", name:"Mínimo en el Período"
        }, {
            code:"max", name:"Máximo en el Período"
        }])        
        
        this.inicializaOpcionesQuery();
        this.cambioVariable();
        this.cambioTemporalidad();
        this.rebuildQuery();
    }

    get componentDefinition() {
        let type = this.edQuery.value;
        return ZDashboardElement.getComponent(type);
    }

    doResize(w, h) {        
        this.size = {width:w, height:h};
        this.mainRow.view.style.setProperty("max-height", h + "px");
        this.loaderContainer.view.style.setProperty("max-height", h + "px");
        this.chartLoader.view.style.setProperty("max-height", h + "px");
        let left = this.loaderContainer.view.getBoundingClientRect().left;
        this.loaderContainer.view.style.setProperty("max-width", (w - left + 20) + "px");
        this.chart.doResize(w, h);
    }

    onEdVariable_change() {this.cambioVariable()}
    onEdTemporalidad_change() {this.cambioTemporalidad()}
    onEdQuery_change() {this.cambioQuery()}
    onEdAcumulador_change() {this.cambioAcumulador()}

    async cambioVariable() {        
        if (!this.variable) {
            // Esconder
            this.minzQuery = null;
            this.inicializaOpcionesQuery();
            this.rebuildQuery();
            return;
        }
        let idx = nivelesTemporalidad.indexOf(this.variable.temporality);
        if (idx < 0) {
            console.error("Invalid temporality:", this.variable.temporality);
            return;
        }
        // Verificar si cambió la temporalidad de la nueva variable
        if (!this.temporalidadVariableAnterior || this.variable.temporality != this.temporalidadVariableAnterior) {
            this.temporalidadVariableAnterior = this.variable.temporality;
            let bloques = bloquesTemporalidad.map((b, idx) => ({code:idx, name:b})).filter((b, i) => (i >= idx));
            let idxFavorito = bloquesFavoritos[this.variable.temporality];
            this.edTemporalidad.setRows(bloques, bloquesTemporalidad[idxFavorito]); 
            this.cambioTemporalidad();
        }
        this.inicializaOpcionesQuery();
        this.rebuildQuery();        
    }

    cambioTemporalidad() {
        let limites = getLimitesDefaultBloquesTemporalidad(this.edTemporalidad.value);
        this.start = limites.start;
        this.end = limites.end;
        if (this.minzQuery) this.minzQuery.temporality = nivelesTemporalidad[this.edTemporalidad.value];
        this.cambioPeriodo();
    }
    onCmdPeriodo_click() {
        this.showDialog("./periods/WPeriod", {temporality:nivelesTemporalidad[this.edTemporalidad.value], start:this.start, end:this.end}, ({start, end}) => {
            this.start = start;
            this.end = end;
            this.cambioPeriodo();
        })
    }
    cambioPeriodo() {
        let desc = describePeriodoParaBloqueTemporalidad(this.edTemporalidad.value, this.start, this.end);
        this.cmdPeriodo.text = desc;
        this.callRefreshChart();
    }

    onFiltro_click() {
        this.showDialog("common/WMinZFilters", {consulta:this.minzQuery}, q => {
            this.minzQuery = q;
            this.minzQuery.temporality = nivelesTemporalidad[this.edTemporalidad.value];
            this.cambioFiltro();
        })
    }
    async cambioFiltro() {
        if (!this.minzQuery) {            
            this.filtro.html = "";
            this.callRefreshChart();
            return;
        }
        await this.minzQuery.construyeDescripcionFiltros();
        let desc = this.minzQuery.descripcionFiltros.map(f => (f.etiqueta)).join(" y ");
        this.filtro.text = desc || "Filtrar"
        this.chart.setQuery(this.minzQuery);
        this.callRefreshChart();
    }
    cambioQuery() {
        this.inicializaOpcionesQuery();
        this.rebuildQuery();
    }
    cambioAcumulador() {
        if (this.minzQuery) this.minzQuery.accum = this.edAcumulador.value;
        this.callRefreshChart();
    }

    rebuildQuery() {
        if (!this.variable) {
            this.minzQuery = null;
        } else {
            this.minzQuery = new MinZQuery(window.zRepoClient, this.variable);
            this.minzQuery.temporality = nivelesTemporalidad[this.edTemporalidad.value];
            this.minzQuery.accum = this.edQuery.value == "labels"?"":this.edAcumulador.value;    
        }
        this.cambioFiltro(); // Llama a callRefreshChart
    }

    onCmdConfigurar_click() {
        let w = this.componentDefinition.propsPath;
        if (!w) return;
        this.showDialog(w, this.opcionesQuery, opciones => {
            opciones.variable = this.variable;
            this.opcionesQuery = opciones;
            this.callRefreshChart();
        })
    }

    callRefreshChart() {
        if (this.chartRefreshTimer) {
            clearTimeout(this.chartRefreshTimer);
            this.chartRefreshTimer = null;
        }
        this.chartRefreshTimer = setTimeout(_ => {
            this.chartRefreshTimer = null;
            this.refreshChart()
        }, 300);
    }
    async refreshChart() {        
        if (this.chart.code != this.edQuery.value) {
            let panel = this.componentDefinition.elementPath;
            await this.chartLoader.load(panel);
            this.chartLoader.content.doResize();
        }
        this.chart.clearError();
        // Configurar query y chart
        let q = MinZQuery.cloneQuery(this.minzQuery);
        q.fixedFilters = q.filters;
        q.filters = [];
        this.chart.setOptions(this.opcionesQuery);
        this.chart.setQuery(q);
        // Refrescar
        await this.chart.refresh(this.start, this.end);
    }

    inicializaOpcionesQuery() {
        this.edAcumulador.show();
        let cmpDef = this.componentDefinition;
        if (cmpDef.propsPath) this.cmdConfigurarRow.show();
        else this.cmdConfigurarRow.hide();
        let c = {type:cmpDef.type};
        if (cmpDef.factories && cmpDef.factories.init) cmpDef.factories.init(c);
        this.opcionesQuery = c;
        c.variable = this.variable;
    }
}
ZVC.export(CustomQuery);
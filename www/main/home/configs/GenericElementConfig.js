class GenericElementConfig extends ZCustomController {
    async onThis_init(component) {
        this.msgError.hide();
        this.component = component;

        this.refresh();
    }
    
    get variable() {return this.edVariable.selectedRow}
    get temporalidad() {return this.edTemporalidad.value}

    async getDashboard() {
        return await this.triggerEvent("getDashboard")
    }

    async refresh() {
        this.edHeight.value = this.component.height || 60;
        this.edTitulo.value = this.component.titulo || "";
        if (!this.component.variable && window.zRepoClient.variables.length) {
            this.component.variable = window.zRepoClient.variables[0].code;
            setTimeout(_ => this.triggerEvent("designChange"), 100);
        }
        this.edVariable.setGroups(window.zrepo.variablesTree, "name", "variables", this.component.variable);
        if (this.component.useTemporality) {
            this.lblTemporalidad.show();
            this.edTemporalidad.show();
            let bloques = bloquesTemporalidad.map((b, idx) => ({code:nivelesTemporalidad[idx], name:b}));
            this.edTemporalidad.setRows(bloques, this.component.temporalidad); 
        } else {
            this.lblTemporalidad.hide();
            this.edTemporalidad.hide();
        }
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
        }], this.component.acumulador)
        let q = await this.getMinzQueryFiltros();
        await q.construyeDescripcionFiltros();
        if (q.filters.length) {
            this.cmdFiltro.text = q.descripcionFiltros.map(d => d.etiqueta).join(" y ");
        }  else {
            this.cmdFiltro.text = "Filtrar";
        }
    }

    validate() {
        this.msgError.hide();
        try {
            let v = parseInt(this.edHeight.value);
            if (isNaN(v) || v < 0 || v > 10000) throw "La altura es inválida";
            if (!this.variable) throw "Debe seleccionar una variable";
            if (this.component.useTemporality) {
                if (!this.temporalidad) throw "Debe seleccionar una temporalidad";
            }
            return true;
        } catch(error) {
            this.msgError.text = error;
            this.msgError.show();
            return false;
        }
    }

    async onEdHeight_change() {
        if (!this.validate()) return;
        this.component.height = parseInt(this.edHeight.value);
        await this.triggerEvent("designChange");
    }
    async onEdTitulo_change() {
        if (!this.validate()) return;
        this.component.titulo = this.edTitulo.value;
        await this.triggerEvent("designChange");
    }
    async onEdVariable_change() {
        if (!this.validate()) return;
        this.component.variable = this.variable.code;
        await this.triggerEvent("designChange");
    }
    async onEdTemporalidad_change() {
        if (!this.validate()) return;
        this.component.temporalidad = this.temporalidad;
        await this.triggerEvent("designChange");
    }
    async onEdAcumulador_change() {
        if (!this.validate()) return;
        this.component.acumulador = this.edAcumulador.value;
        await this.triggerEvent("designChange");
    }

    async onCmpOptions_eliminar() {await this.triggerEvent("eliminar")}
    async onCmpOptions_configurar() {
        let w = {
            "timeSerie":"zdashboards/chartProps/WTimeSerie",
            "pie":"zdashboards/chartProps/WPie",
            "dimSerie":"zdashboards/chartProps/WDimSerie",
            "dimTable":"zdashboards/chartProps/WDimTable",
            "heatMap":"zdashboards/chartProps/WHeatMap",
            "gauge":"zdashboards/chartProps/WGauge",
            "timeDim":"zdashboards/chartProps/WTimeDim",
            "forceDirectedTree":"zdashboards/chartProps/WForceDirectedTree"
        }[this.component.type];
        if (!w) {
            this.showDialog("common/WError", {message:"Componente " + this.component.type + " no manejado"});
            return;
        }
        this.showDialog(w, this.component, opts => {
            Object.keys(opts).forEach(k => this.component[k] = opts[k]);
            this.triggerEvent("designChange");
        })
    }

    async getMinzQueryFiltros() {
        let v = await window.zRepoClient.variables.find(v => v.code == this.component.variable);
        if (!v) {
            this.showDialog("common/WError", {message:"No se encontró la Variable " + this.component.variable});
            return null;
        }
        return new MinZQuery(window.zRepoClient, v, null, null, this.component.filters || []);
    }
    async onCmdFiltro_click() {
        let q = await this.getMinzQueryFiltros();        
        if (!q) return;
        let dsb = await this.getDashboard();
        this.showDialog("common/WMinZFilters", {consulta:q, paramsProvider:dsb}, newQ => {
            this.component.filters = newQ.filters;
            this.triggerEvent("designChange");
            this.refresh();
        })
    }
}
ZVC.export(GenericElementConfig);
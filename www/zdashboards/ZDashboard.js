class ZDashboard extends ZCustomController {
    onThis_init() {
        this.elements = {};
        this.designMode = false;
    }
    async dispose() {
        if (this.timerRefresh) {
            clearTimeout(this.timerRefresh);
            this.timerRefresh = null;
        }
        if (this.elements) {
            for (let id of Object.keys(this.elements)) {
                await this.elements[id].dispose();
            }
            delete this.elements;
        }
        this.elements = {};
    }
    async setDashboard(dashboard, designMode) {
        // {id, name, icon, config:{temporality, layout:{type}}}
        this.dashboard = dashboard;        
        this.designMode = designMode?true:false;
        this.indiceBloqueTemporalidad = nivelesTemporalidad.indexOf(this.dashboard.config.temporality);
        //let limites = getLimitesDefaultBloquesTemporalidad(this.indiceBloqueTemporalidad);
        let limites = getLimitesDefaultPeriodoInicio(this.dashboard.config.temporality, this.dashboard.config.periodoInicio);
        this.start = limites.start;
        this.end = limites.end;
        this.refreshTitle();
        await this.createLayout();        
    }

    onCmdPeriodo_click() {
        this.showDialog("./periods/WPeriod", {temporality: this.dashboard.config.temporality, start:this.start, end:this.end}, ({start, end}) => {
            this.start = start;
            this.end = end;
            //console.log(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"));
            this.timeChanged = true;
            this.refreshTitle();
            this.callRefreshData();
        })
    }
    onCmdRefresh_click() {
        this.timeChanged = true;
        this.refreshTitle();
        this.callRefreshData();
    }

    async createLayout() {
        this.params = {};
        this.dirtyParams = {};
        this.layoutContainer.html = "";
        this.elementControllers = {};
        await this.createLayoutFrom(this.dashboard.config.layout, this.layoutContainer.view);
        this.cmdDesignElement.hide();
        this.cmdExportData.hide();
        this.doResize();
    }
    async createLayoutFrom(layout, container) {
        for (let i=0; i<layout.size; i++) {
            let cmp = layout.components.find(c => (c.cellIndex == i));

            let id = layout.id + "_" + i;
            let div = document.createElement("div");
            div.setAttribute("id", id);
            let cellClasses = "zdashboard-cell";
            if (cmp) {
                if (cmp.type == "row" || cmp.type == "column") cellClasses += " zdashboard-cell-layout";
                else if (cmp.type == "dimFilter" || cmp.type == "dimSelector") cellClasses += " zdashboard-cell-selector";
                else cellClasses += " zdashboard-cell-element"

                if (this.designMode) {
                    if (cmp.type != "row" && cmp.type != "column") {
                        cellClasses += " zdashboard-design-element";
                        div.addEventListener("mouseenter", e => {
                            this.selectedElement = cmp;
                            this.cmdDesignElement.show();
                            let div = this.layoutContainer.find("#" + id);
                            let containerRect = this.layoutContainer.view.getBoundingClientRect();
                            let cellRect = div.getBoundingClientRect();
                            let btnSize = this.cmdDesignElement.size;
                            let left = cellRect.left - containerRect.left - btnSize.width + cellRect.width - 6;
                            let top = cellRect.top - containerRect.top + 3;
                            this.cmdDesignElement.pos = {left, top};
                        });
                    }
                } else {
                    div.addEventListener("mouseenter", e => {                        
                        let controller = this.elementControllers[cmp.id];
                        this.currentController = controller;
                        if (controller && controller.exportable) {
                            this.selectedElement = cmp;
                            this.cmdExportData.show();
                            let div = this.layoutContainer.find("#" + id);
                            let containerRect = this.layoutContainer.view.getBoundingClientRect();
                            let cellRect = div.getBoundingClientRect();
                            let btnSize = this.cmdExportData.size;
                            let left = cellRect.left - containerRect.left - btnSize.width + cellRect.width - 20;
                            let top = cellRect.top - containerRect.top + 3;
                            this.cmdExportData.pos = {left, top};
                        } else {
                            this.cmdExportData.hide();
                        }
                    });                    
                    /*
                    div.addEventListener("mouseleave", e => {                                                
                        this.currentController = null;
                        this.cmdExportData.hide();
                    });
                    */                    
                }
            }
            if (this.designMode) cellClasses += " zdashboard-cell-design-mode";
            div.setAttribute("class", cellClasses);
            container.append(div);
            if (cmp) {
                if (cmp.type == "row" || cmp.type == "column") {
                    await this.createLayoutFrom(cmp, div);                
                } else {
                    const zvcElementDefinition = ZDashboardElement.getComponent(cmp.type);
                    const zvcElement = zvcElementDefinition?zvcElementDefinition.elementPath:null;
                    if (!zvcElement) {
                        console.error("Componente ", cmp.type, " no manejado aun");
                        return;
                    }
                    let controller = await ZVC.loadComponent(div, this, zvcElement);
                    this.elementControllers[cmp.id] = controller;                    
                    await controller.init(cmp);                    
                    controller.setDashboard(this);
                    await controller.initElement();
                    if (cmp.useQuery) {                        
                        if (cmp.variable) {
                            let v = window.zRepoClient.variables.find(v => v.code == cmp.variable);
                            let grpDimension = cmp.groupingDimension;
                            let filters = cmp.filters || [];
                            let q = new MinZQuery(window.zRepoClient, v, grpDimension, null, filters);
                            if (cmp.useTemporality) q.temporality = cmp.temporalidad;
                            if (cmp.acumulador) q.accum = cmp.acumulador;
                            controller.setQuery(q);
                        } else {
                            console.error("Componente ", cmp, " no ha definido variable");
                            controller.showError("No se ha configurado variable")
                        }
                    }                    
                    for (p of controller.declareParams()) this.dirtyParams[p.name] = true;
                    await controller.activate();
                    this.elements[cmp.id] = controller;
                }
            }
        }
    }

    callResize() {
        if (this.timerResize) clearTimeout(this.timerResize);
        this.timerResize = setTimeout(_ => {
            this.timerResize = null;
            this.doResize();
        }, 50);
    }
    doResize() {
        if (this.timerResize) {
            clearTimeout(this.timerResize);
            this.timerResize = null;
        }
        let width = this.size.width - 17;
        this.layoutContainer.view.style.width = width + "px";
        if (!this.dashboard) return;        
        let h = this.resizeFrom(this.dashboard.config.layout, this.layoutContainer.view);
        this.view.style.setProperty("height", h + "px");
    }
    resizeFrom(layout, container, top=0) {
        const margin = 5;
        // container tiene el ancho definido
        let width = container.getBoundingClientRect().width;
        if (layout.type == "row") {
            let {sumPixels, sumPercent} = layout.widths.reduce((s, w) => {
                if (("" + w).endsWith("%")) s.sumPercent += parseInt(w);
                else s.sumPixels += parseInt(w);
                return s;
            }, {sumPixels:0, sumPercent:0});
            let left = 0, maxHeight = 0;
            for (let i=0; i<layout.size; i++) {
                let cmp = layout.components.find(c => (c.cellIndex == i));
                let elementCell = cmp && (cmp.type != "row" && cmp.type != "column");
                let id = layout.id + "_" + i;
                let div = container.querySelector("#" + id);
                if (!div) return;
                div.style.left = (left + (elementCell?margin:0)) + "px";
                div.style.top = (elementCell?margin:0) + "px";
                let w = layout.widths[i];
                let unit = ("" + w).endsWith("%")?"%":"p";
                w = parseInt(w);
                if (unit == "%") {
                    let ww = (width - sumPixels) * w / sumPercent;
                    div.style.width = (ww - (elementCell?2*margin:0)) + "px";
                    left += ww;
                } else {
                    div.style.width = (w - (elementCell?2*margin:0)) + "px";
                    left += w;
                }
                
                if (cmp) {
                    let height;
                    if (cmp.type == "row" || cmp.type == "column") {
                        height = this.resizeFrom(cmp, div, top);
                    } else {
                        let controller = this.elements[cmp.id];
                        if (!controller) {
                            console.error("No hay controlador para ", cmp);
                        } else {
                            height = controller.preferedHeight + 2*margin;
                        }
                    }
                    if (height > maxHeight) maxHeight = height;
                }
            }
            for (let i=0; i<layout.size; i++) {
                let id = layout.id + "_" + i;
                let div = container.querySelector("#" + id);
                let cmp = layout.components.find(c => (c.cellIndex == i));
                if (cmp && cmp.type != "row" && cmp.type != "column") {
                    div.style.height = (maxHeight - 2*margin) + "px";
                    let controller = this.elements[cmp.id];
                    if (!controller) {
                        console.error("No hay controlador para ", cmp);
                    } else {
                        controller.doResize();
                    }
                } else {
                    div.style.height = maxHeight + "px";
                }
            }

            return maxHeight;
        } else {
            let totalHeight = 0, top = 0;
            for (let i=0; i<layout.size; i++) {
                let cmp = layout.components.find(c => (c.cellIndex == i));
                let elementCell = cmp && (cmp.type != "row" && cmp.type != "column");
                let id = layout.id + "_" + i;
                let div = container.querySelector("#" + id);
                let height;
                if (elementCell) {
                    div.style.left = margin + "px";
                    div.style.top = (top + margin) + "px";
                    div.style.width = (width - 2*margin) + "px";
                    let controller = this.elements[cmp.id];
                    if (!controller) {
                        console.error("No hay controlador para ", cmp);
                    } else {
                        height = controller.preferedHeight + 2*margin;
                        div.style.height = (height - 2*margin) + "px";
                        controller.doResize();
                    }
                } else {
                    div.style.left = "0";
                    div.style.top = top + "px";
                    div.style.width = width + "px";
                    if (cmp) height = this.resizeFrom(cmp, div, top);
                    else height = 20;
                    div.style.height = height + "px";
                }
                totalHeight += height;
                top += height;
            }
            return totalHeight;
        }

    }

    refreshTitle() {
        let t = this.dashboard.config.title || this.dashboard.name;
        this.titulo.text = t;
        
        this.cmdPeriodo.text = describePeriodoParaBloqueTemporalidad(this.indiceBloqueTemporalidad, this.start, this.end);
    }

    get elementsList() {
        return Object.keys(this.elements).map(id => (this.elements[id]));
    }

    setParam(name, value) {
        this.params[name] = value;
        this.dirtyParams[name] = true;
        this.callRefreshData();
    }
    getParam(name) {
        return this.params[name];
    }
    getParams() {
        return this.elementsList.reduce((list, e) => {
            return list.concat(e.declareParams());
        }, []);
    }
    callRefreshData() {
        if (this.timerRefresh) clearTimeout(this.timerRefresh);
        this.timerRefresh = setTimeout(_ => {
            this.timerRefresh = null;
            this.refreshData();
        }, 50);
    }
    async refreshData() {
        let proms = [];        
        for (let cmp of this.elementsList) {
            let hasAllDependencies = true;
            let isDirty = false;
            for (p of cmp.dependsOn()) {
                if (this.params[p] === undefined) {
                    hasAllDependencies = false;
                    break;
                }
                if (this.dirtyParams[p]) isDirty = true;
            }
            if (!hasAllDependencies) continue;
            // Si no tiene dependencias y nunca se ha refrescado, refrescar
            if (!isDirty && !cmp.dependsOn().length && !cmp.wasRefreshed) {
                isDirty = true;
                cmp.wasRefreshed = true;
            }
            // Si no es un selector de dimension y cambiuo el tiempo, se refresca
            if (!isDirty && this.timeChanged && cmp.dependsOnTime) {
                isDirty = true;
            }
            if (isDirty) {
                proms.push(cmp.refresh(this.start, this.end, "refresh"));
            }
        }
        try {
            for (p of this.getParams()) this.dirtyParams[p.name] = false;
            await Promise.all(proms);
        } catch(error) {
            console.trace();
            console.error(error);
        }
        this.timeChanged = false;        
    }

    onCmdDesignElement_click() {
        if (this.selectedElement) {
            this.triggerEvent("selectDesignElement", this.selectedElement);
        }
    }
    async onCmdExportData_click() {
        if (this.currentController) {
            try {
                await this.currentController.export();
            } catch (error) {
                this.showDialog("common/WError", {message: error.toString()});
            }
        }
    }
}
ZVC.export(ZDashboard);
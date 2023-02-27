class Dashboard extends ZCustomController {
    async onThis_init(dashboard) {
        try {
            this.modoDiseno = false;
            this.designHeader.hide();
            this.mensaje.show();
            this.mensaje.html = '<i class="fas fa-spin fa-spinner fa-2x"></i>';
            this.dashboard = await zPost("getDashboard.fs", {id:dashboard.id});
            //setTimeout(_ => this.setModoDiseno(), 200);            
            this.mensaje.html = "";            
            this.mensaje.hide();
            this.triggerEvent("reloadMenu");
            await this.recreateDashboard();
            this.refreshFav();
            this.canPublish = await zPost("canPublish.fs");
        } catch(error) {
            this.mensaje.text = error.toString();
        }
    }
    doResize() {
        let h = window.innerHeight;
        let w = window.innerWidth;
        let rect = this.dsbPanelsContainer.view.getBoundingClientRect();
        let top = parseInt(rect.top)
        this.dsbPanelsContainer.view.style.height = (h - top - 10) + "px";
        let left = parseInt(rect.left);
        this.dsbPanelsContainer.view.style.width = (w - left - 10) + "px";
        this.dashboardElement.doResize();
    }

    getContextMenu() {
        if (!this.dashboard) return null;
        if (window.sesion.user.email == this.dashboard.owner) {
            let menu;
            if (this.modoDiseno) {
                menu = `
                    <h6 class="dropdown-header">Modo Diseño</h6>
                    <a id="cancelaDiseno" href="#" class="dropdown-item"><i class="fas fa-ban me-2"></i>Cancelar Cambios</a>
                    <a id="grabaDiseno" href="#" class="dropdown-item"><i class="fas fa-save me-2"></i>Grabar Cambios</a>
                `;
            } else {
                menu = `
                    <h6 class="dropdown-header">Opciones</h6>
                    <a id="diseno" href="#" class="dropdown-item"><i class="fas fa-gear me-2"></i>Entrar a Modo Diseño</a>
                    <li><hr class="dropdown-divider"></li>                    
                    <a id="exportar" href="#" class="dropdown-item"><i class="fas fa-download me-2"></i>Exportar este Dashboard</a>
                    <a id="copiarId" href="#" class="dropdown-item"><i class="fas fa-copy me-2"></i>Copiar Identificador</a>
                    <a id="eliminar" href="#" class="dropdown-item"><i class="fas fa-trash me-2"></i>Eliminar este Dashboard</a>
                `;
            }
            if (!this.dashboard.sharedIn) {
                menu += `
                    <li><hr class="dropdown-divider"></li>
                    <h6 class="dropdown-header">Dashboard No Compartido</h6>
                    <a id="compartir" href="#" class="dropdown-item"><i class="fas fa-share-nodes me-2"></i>Compartir en un Grupo</a>
                `;
            } else {
                menu += `
                    <li><hr class="dropdown-divider"></li>
                    <h6 class="dropdown-header">Compartido en ${this.dashboard.sharedInName}</h6>
                    <a id="compartirOtroGrupo" href="#" class="dropdown-item"><i class="fas fa-share-nodes me-2"></i>Compartir en otro Grupo</a>
                    <a id="dejarCompartir" href="#" class="dropdown-item"><i class="fas fa-ban me-2"></i>Dejar de Compartir</a>
                `;
            }
            return menu;
        } else {
            return null;
        }        
    }
    doContextMenu(id) {
        if (id == "diseno") this.setModoDiseno();
        else if (id == "cancelaDiseno") this.cancelaModoDiseno();
        else if (id == "grabaDiseno") this.grabaModoDiseno();
        else if (id == "eliminar") this.eliminarDashboard();
        else if (id == "exportar") this.exportarDashboard();
        else if (id == "exportarPDF") this.exportarPDF();
        else if (id == "compartir" || id == "compartirOtroGrupo") this.compartirDashboard();
        else if (id == "dejarCompartir") this.noCompartirDashboard();
        else if (id == "copiarId") this.copiarId();
    }

    async setModoDiseno() {
        this.edDashboard = {id:this.dashboard.id, name:this.dashboard.name, icon:this.dashboard.icon, config:JSON.parse(JSON.stringify(this.dashboard.config))};
        if (!this.edDashboard.config.layout) this.edDashboard.config.layout = {type:"row", size:2};
        this.designHeader.show();
        await this.layout.refresh();
        let rootNode = this.layout.findNodeById("_layout_");
        this.layout.selectedNode = rootNode;
        this.onLayout_change(rootNode);
        await this.layout.toggleNode(rootNode);
        await this.layout.toggleNode(rootNode.items[0]);
        this.modoDiseno = true;
        this.triggerEvent("reloadMenu");
        await this.recreateDashboard();
    }

    async cancelaModoDiseno() {
        this.designHeader.hide();
        this.modoDiseno = false;
        this.triggerEvent("reloadMenu");
        await this.recreateDashboard();
    }

    eliminarDashboard() {
        this.showDialog("common/WConfirm", {message:"Esta Operación No se puede Deshacer. ¿Confirmna que desea eliminar este Dashboard?", title:"Eliminar Dashboard"}, async _ => {
            await zPost("deleteDashboard.fs", {id:this.dashboard.id});
            this.triggerEvent("nodoEliminado")
        })
    }

    asFileName(st) {
        let ret = "";
        for (let i=0; i<st.length; i++) {
            let c = st.substr(i,1).toLowerCase();
            if ((c >= "a" && c <= "z") || (c >= "0" && c <= "9")) ret += c;
            else ret += "_";
        }
        return ret;
    }
    exportarDashboard() {
        let e = document.createElement("a");
        e.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.dashboard)));
        e.setAttribute('download', this.asFileName(this.dashboard.name) + ".zrepo");
        e.style.display = 'none';
        document.body.appendChild(e);
        e.click();
        document.body.removeChild(e);
    }

    async grabaModoDiseno() {
        try {
            this.mensaje.show();
            this.mensaje.html = '<i class="fas fa-spin fa-spinner fa-2x"></i>';
            this.dashboard.name = this.edDashboard.name;
            this.dashboard.icon = this.edDashboard.icon;
            this.dashboard.config = JSON.parse(JSON.stringify(this.edDashboard.config));
            await zPost("saveDashboard.fs", {dashboard:this.dashboard});
            this.mensaje.hide();
            this.designHeader.hide();
            this.modoDiseno = false;
            this.triggerEvent("reloadMenu");
            this.triggerEvent("nodoRenombrado", this.dashboard);
            await this.recreateDashboard();
        } catch(error) {
            this.mensaje.text = error.toString();
        }        
    }

    async copiarId() {
        try {
            await navigator.clipboard.writeText(this.dashboard.id);
            this.showDialog("common/WInfo", {message:"Se ha copiado el identificador de este dashboard al portapapeles"});
        } catch(error) {
            this.showDialog("common/WError", {message:error.toString()});
        }
    }

    builComponentNode(component) {
        let cmpDef = ZDashboardElement.getComponent(component.type);
        if (!cmpDef) throw "No se encontr{o la definici{on del componente " + component.type;
        let node = {
            id:component.id, 
            label:cmpDef.name, 
            icon: cmpDef.icon,
            items:false,
            _type:component.type,
            source:component
        }
        if (component.type == "dimFilter" || component.type == "dimRowSelector") {
            node.label = "${" + component.paramName + "}";
        }
        return node;
    }
    buildLayoutTree(layout) {
        if (!layout) {
            console.error("No layout!");
            return [];
        }
        let node = {id:layout.id, selectable:true, _type:"layout", source:layout};
        if (layout.type == "row") {
            node.label = "Fila";
            node.icon = "fas fa-ellipsis";
        } else {
            node.label = "Columna";
            node.icon = "fas fa-ellipsis-vertical";
        }

        let usedCells = layout.components.reduce((used, c) => {
            used[c.cellIndex] = true;
            return used;
        }, {});
        let items = [];
        for (let i=0; i<layout.size; i++) {
            let item = {id:layout.id + "_" + i, label:"Celda " + (i+1), icon:"far " + (usedCells[i]?"fa-circle-dot":"fa-circle"), used:usedCells[i], source:layout, cellIndex:i, _type:"cell", selectable:true};
            if (layout.type == "row") item.label += " [" + layout.widths[i] + "]";
            let component = layout.components.find(c => c.cellIndex == i);
            if (component) {
                if (component.type == "row" || component.type == "column") {
                    item.items = this.buildLayoutTree(component);
                } else {
                    item.items = [this.builComponentNode(component)];
                }
            } else {
                item.items = false;
            }
            items.push(item);
        }
        node.items = items;
        return [node];
    }
    onLayout_getNodes(parentNode) {
        let nodes = [{
            id:"_layout_", label:"Configurar Dashboard", icon:"fas fa-tools", selectable:true, _isOpen:true, items:this.buildLayoutTree(this.edDashboard.config.layout), source:this.edDashboard
        }];
        return nodes;
    }

    async onLayout_change(node) {
        if (!node) {
            await this.dsbLoader.load("common/Empty");
            return;
        }
        if (node.id == "_layout_") {
            await this.dsbLoader.load("./configs/RootConfig", node.source);
        } else if (node._type == "layout") {
            await this.dsbLoader.load("./configs/LayoutConfig", node.source);
        } else if (node._type == "cell") {
            await this.dsbLoader.load("./configs/LayoutCellConfig", node);
        } else if (node._type == "dimFilter") {
            await this.dsbLoader.load("./configs/DimensionFilterConfig", node.source);
        } else if (node._type == "dimRowSelector") {
            await this.dsbLoader.load("./configs/DimRowSelectorConfig", node.source);
        } else {
            let cmpDef = ZDashboardElement.getComponent(node._type);
            if (!cmpDef) {
                console.error("Nodo ", node, " no manejado para propiedades");
            } else {
                await this.dsbLoader.load("./configs/GenericElementConfig", node.source);
            }
        }
    }

    onDsbLoader_currentNodeRenamed(newLabel) {
        let n = this.layout.selectedNode;
        if (newLabel) {
            n.label = newLabel;
        } else {
            if (n.source.type == "row") {
                n.label = "Fila";
                n.icon = "fas fa-ellipsis";
            } else {
                n.label = "Columna";
                n.icon = "fas fa-ellipsis-vertical";
            }
        }
        this.layout.nodeRenamed(this.layout.selectedNode);
    }

    async onDsbLoader_reloadChildren() {
        // Ocurre en un layout.
        let n = this.layout.selectedNode;
        let subtree = this.buildLayoutTree(n.source)[0].items;
        await this.layout.reloadChildren(n, subtree);
    }

    async onDsbLoader_reloadParent(nodeIdToSelect) {
        // Ocurre en un layout cell (source repite el objeto layout del nodo padre)
        let subtree = this.buildLayoutTree(this.layout.selectedNode.source)[0].items;
        await this.layout.reloadParent(this.layout.selectedNode, true, subtree);
        if (nodeIdToSelect) this.layout.selectedNode = nodeIdToSelect;
    }

    async onDsbLoader_getDashboard() {
        return await this.dashboardElement;
    }
    async onDsbLoader_designChange() {
        await this.recreateDashboard();
    }
    async onDsbLoader_eliminar() {
        let cmp = this.layout.selectedNode.source;
        let msg = cmp.type == "row" || cmp.type == "column"?
            "¿Confirma que desea eliminar el nodo seleccionado y todos sus componentes Hijos?"
            :"¿Confirma que desea eliminar el componente seleccionao?";
        this.showDialog("common/WConfirm", {message:msg}, async _ => {
            // Obtener source del nodo padre y eliminar desde sus components
            let parent = this.layout.findParentNode(this.layout.selectedNode._calculatedId);
            let idx = parent.source.components.findIndex(c => c.id == cmp.id);
            parent.source.components.splice(idx, 1);
            this.layout.selectedNode = parent;
            await this.onDsbLoader_reloadParent(parent.id);
            await this.onLayout_change(this.layout.selectedNode);
            await this.recreateDashboard();
        });
    }
    onDsbLoader_mover() {
        this.showDialog("./WSeleccionaCelda", {
            nodes: [{
                id:"_layout_", label:"Dashboard", icon:"fas fa-tools", selectable:true, _isOpen:true, items:this.buildLayoutTree(this.edDashboard.config.layout), source:this.edDashboard
            }]
        }, celdaDestino => {
            this.doMover(celdaDestino);
        })
    }    
    async doMover(celdaDestino) {
        let node = this.layout.selectedNode;
        // Asegurar que la celdaDestino no sea descendiente del nodo que se mueve
        let n = celdaDestino;
        while(n && n.id != "_layout_") {
            n = this.layout.findParentNode(n._calculatedId);
            if (n.id == node.id) {
                this.showDialog("common/WError", {message:"Celda destino es inválida (produce ciclos)"});
                return;
            }
        }
        // Buscar el nodo padre para removerlo
        let oldParent = this.layout.findParentNode(node._calculatedId);
        let idx = oldParent.source.components.findIndex(n => n.id == node.id);
        oldParent.source.components.splice(idx, 1);
        node.source.cellIndex = celdaDestino.cellIndex;
        celdaDestino.source.components.push(node.source);
        await this.layout.refresh();
        let rootNode = this.layout.findNodeById("_layout_");
        this.layout.selectedNode = rootNode;
        this.onLayout_change(rootNode);
        await this.layout.toggleNode(rootNode);
        await this.layout.toggleNode(rootNode.items[0]);
        await this.recreateDashboard();
    }

    async recreateDashboard() {
        await this.dashboardElement.dispose();
        if (this.modoDiseno) {
            await this.dashboardElement.setDashboard(this.edDashboard, true);
        } else {
            await this.dashboardElement.setDashboard(this.dashboard, false);
        }
        await this.dashboardElement.callRefreshData();
    }

    compartirDashboard() {
        this.showDialog("./WCompartir", {dashboard:this.dashboard}, async _ => {
            this.dashboard = await zPost("getDashboard.fs", {id:this.dashboard.id});
            this.triggerEvent("reloadMenu");
            this.triggerEvent("reloadGrupos");
        });
    }

    noCompartirDashboard() {
        this.showDialog("common/WConfirm", {message:"¿Confirma que desea Dejar de Compartir este Dashboard?", title:"Dejar de Compartir"}, async _ => {
            await zPost("shareDashboard.fs", {dashboardId:this.dashboard.id, groupId:null});
            this.dashboard = await zPost("getDashboard.fs", {id:this.dashboard.id});
            this.triggerEvent("reloadMenu");
            this.triggerEvent("reloadGrupos");
        });
    }

    async refreshFav() {
        let {favs, mostFav} = await zPost("getUserFavs.zrepo");
        if (favs.indexOf(this.dashboard.id) >= 0) {
            if (mostFav == this.dashboard.id) {
                this.triggerEvent("fav", "most");
            } else {
                this.triggerEvent("fav", true);
            }
        } else {
            this.triggerEvent("fav", false);
        }
    }

    async toggleFav() {
        try {
            await zPost("toggleUserFav.zrepo", {dashboardId:this.dashboard.id});
            await this.refreshFav();
        } catch (error) {
            this.showDialog("common/WError", {message:error.toString()})
        }
    }

    async onDashboardElement_selectDesignElement(cmp) {
        //let nodo = this.buscaNodo(this.layout.rootNode.items, cmp.id);
        let nodo = this.layout.findNodeById(cmp.id);
        let n = nodo;
        let toOpen = [];
        while (n.id != "_layout_") {
            if (n._isOpen == false) {
                toOpen.splice(0,0,n);
            }
            n = this.layout.findParentNode(n);
        }
        for (let n of toOpen) {
            await this.layout.toggleNode(n);
        }
        this.layout.selectedNode = nodo;
        this.onLayout_change(nodo);
        if (this.layout.selectedItem) {
            if (this.layout.selectedItem.scrollIntoView) this.layout.selectedItem.scrollIntoView();
        }
        if (this.dsbLoader.view.scrollIntoView) this.dsbLoader.view.scrollIntoView();
    }
}
ZVC.export(Dashboard);
class Left extends ZCustomController {
    async onThis_init() {
        await this.tree.refresh();
        // Auto-abrir favoritos (id:"_fav_") y seleccionar "mostFav" o primer elemento si existe
        let fav = this.tree.findNodeById("_fav_");
        if (fav) {
            await this.tree.toggleNode(fav);
            if (fav.items.length) {
                let {mostFav} = await zPost("getUserFavs.zrepo");
                if (mostFav) {
                    let n = fav.items.find(n => n.id == mostFav);
                    this.tree.selectedNode = n;
                } else {
                    this.tree.selectedNode = fav.items[0];
                }
                // Esperar que terminen de cargar
                setTimeout(_ => this.onTree_change(this.tree.selectedNode), 100)
            }
        }
    }

    onTree_getNodes(parentNode) {
        try {
            if (parentNode._type == "root") {
                return zPost("getVisibleGroups.fs");
            } else if (parentNode.id == "_fav_") {
                return zPost("getFavDashboards.fs");
            } else if (parentNode.id == "_my_") {
                return new Promise(async (resolve, reject) => {
                    try {
                        let content = await zPost("getPrivateFolderContent.fs", {parentFolderId:parentNode.id, includeFolders:true, includeDashboards:false});
                        resolve(content.folders);
                    } catch(error) {
                        reject(error);
                    }                    
                });                
            } else if (parentNode._type == "_private_") {
                return new Promise(async (resolve, reject) => {
                    try {
                        let content = await zPost("getPrivateFolderContent.fs", {parentFolderId:parentNode.id, includeFolders:true, includeDashboards:true});
                        resolve(content.folders.concat(content.dashboards));
                    } catch(error) {
                        reject(error);
                    }                    
                });
            } else if (parentNode._type == "shared") {
                return zPost("getVisibleDashboardsInGroup.fs", {parentFolderId:parentNode.id});
            }
        } catch(error) {
            this.showDialog("common/WError", {message:error.toString()});
        }
    }

    async reloadGrupos() {
        let newGroups = await zPost("getVisibleGroups.fs");
        newGroups = newGroups.filter(g => g.id != "_fav_" && g.id != "_my_");        
        let rootItems = [this.tree.rootNode.items[0], ...newGroups, this.tree.rootNode.items[this.tree.rootNode.items.length - 1]];
        this.tree.initItems({_calculatedId:"", items:rootItems});
        for (let g of rootItems) {
            if (g.id != "_fav_" && g.id != "_my_") {
                let treeGroup = this.tree.rootNode.items.find(node => node.id == g.id);
                if (treeGroup) {
                    treeGroup.items = g.items;
                    treeGroup._isOpen = false;
                    await this.tree.toggleNode(treeGroup, true);
                }
            }
        }
    }

    onTree_change(node) {
        this.triggerEvent("change", node);
    }

    async releeNodosHijos(autoSelectId) {
        let selected = this.tree.selectedNode;        
        await this.tree.reloadChildren(selected);
        if (autoSelectId) {
            let newSelected = selected.items.find(n => n.id == autoSelectId);
            this.tree.selectedNode = newSelected;
        }
        this.onTree_change(this.tree.selectedNode);
    }
    async releeFavs() {
        let n = this.tree.rootNode.items.find(n => n.id == "_fav_");
        await this.tree.reloadChildren(n);
    }
    async nodoEliminado(id) {
        if (!id) {
            let selected = this.tree.selectedNode;
            if (!selected) return;
            id = selected.id;
        }
        await this.tree.reloadParent(id, true);
        this.onTree_change(this.tree.selectedNode);
    }
    async nodoRenombrado(nodo) {
        this.tree.nodeRenamed(nodo);
    }
}
ZVC.export(Left);
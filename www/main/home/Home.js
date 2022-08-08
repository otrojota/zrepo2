class Home extends ZCustomController {
    async onThis_init() {
        window.onresize = _ => {
            this.doResize();
        }        
        await this.onLeft_change(null);
        this.doResize();
    }
    onThis_deactivated() {
        window.onresize = null;
    }

    doResize() {
        let h = window.innerHeight;
        let top = parseInt(this.sidebarNav.view.getBoundingClientRect().top);
        this.sidebarNav.view.style.height = (h - top) + "px";
        top = parseInt(this.homeLoader.view.getBoundingClientRect().top);
        this.homeLoader.view.style.height = (h - top) + "px";
        if (this.homeLoader.content.doResize) this.homeLoader.content.doResize();
    }

    async onLeft_change(node) {
        this.cmdFav.hide();
        this.selectedNode = node;
        if (!node) {
            this.mainCaption.text = "Seleccione un Elemento a la izquierda";
            this.icon.hide();
            this.cmdMenu.hide();
            //this.cmdFav.hide();
            await this.homeLoader.load("common/Empty");
            return;
        }
        this.mainCaption.text = node.name;
        this.icon.view.setAttribute("class", node.icon + " fa-xl ms-2");
        this.icon.show();
        if (node.id == "_my_") {
            await this.homeLoader.load("./MyRootFolders", node);
        } else if (node._type == "_private_") {
            await this.homeLoader.load("./PrivateFolder", node);
        } else if (node._type == "dashboard") {
            await this.homeLoader.load("./Dashboard", node);
        } else {
            console.log("Nodo No Manejado", node);
            this.homeLoader.load("common/Empty");
        }
        this.initContextMenu();
        this.doResize();
    }

    initContextMenu() {
        if (this.homeLoader.content.getContextMenu) {
            let menuHTML = this.homeLoader.content.getContextMenu();
            if (!menuHTML) {
                this.cmdMenu.hide();
                return;
            }
            this.menuContent.html = menuHTML;
            this.menuContent.findAll(".dropdown-item").forEach(e => {
                e.onclick = _ => {
                    if (this.homeLoader.content.doContextMenu) {
                        this.homeLoader.content.doContextMenu(e.getAttribute("id"));
                    }
                }
            })
            this.cmdMenu.show();
        } else {
            this.cmdMenu.hide();
        }
    }

    async onHomeLoader_releeNodosHijos(autoSelectId) {
        await this.left.releeNodosHijos(autoSelectId);
    }
    async onHomeLoader_nodoEliminado(nodo) {await this.left.nodoEliminado(nodo?nodo.id:null);}
    async onHomeLoader_nodoRenombrado(nodo) {
        this.mainCaption.text = nodo.name;
        this.icon.view.setAttribute("class", nodo.icon + " fa-xl ms-2");
        await this.left.nodoRenombrado(nodo);
    }
    async onHomeLoader_reloadMenu() {
        this.initContextMenu();
    }
    async onHomeLoader_reloadGrupos() {
        await this.left.reloadGrupos();
    }
    onHomeLoader_fav(status) {
        this.cmdFav.show();
        let i = this.cmdFav.view;
        i.classList.remove("far");
        i.classList.remove("fas");
        i.classList.remove("text-danger");
        if (status == "most") {
            i.classList.add("fas");
            i.classList.add("text-danger");
        } else if (status) {
            i.classList.add("fas");
        } else {
            i.classList.add("far");
        }
    }
    async onCmdFav_click() {
        await this.homeLoader.content.toggleFav();
        await this.left.releeFavs();
    }
}
ZVC.export(Home);
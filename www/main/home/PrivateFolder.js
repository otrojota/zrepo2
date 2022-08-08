class PrivateFolder extends ZCustomController {
    onThis_init(node) {
        this.node = node;
        this.repeater.refresh();
        this.dsbRepeater.refresh();
    }
    doResize() {
        let h = window.innerHeight;
        let top = parseInt(this.main.view.getBoundingClientRect().top)
        this.main.view.style.height = (h - top - 10) + "px";
    }

    getContextMenu() {
        return `
            <h6 class="dropdown-header">Opciones</h6>
            <a id="nuevaCarpeta" href="#" class="dropdown-item"><i class="fas fa-folder-plus me-2"></i>Nueva Carpeta Hija</a>
            <a id="renombrarCarpeta" href="#" class="dropdown-item"><i class="fas fa-edit me-2"></i>Renombrar esta Carpeta</a>
            <a id="eliminarCarpeta" href="#" class="dropdown-item"><i class="fas fa-trash me-2"></i>Eliminar esta Carpeta</a>
            <li><hr class="dropdown-divider"></li>
            <a id="nuevoDashboard" href="#" class="dropdown-item"><i class="far fa-square-plus me-2"></i>Nuevo Dashboard</a>
            <a id="importarDashboard" href="#" class="dropdown-item"><i class="fas fa-upload me-2"></i>Importar Dashboard</a>
        `;
    }
    doContextMenu(id) {
        if (id == "eliminarCarpeta") {
            this.showDialog("common/WConfirm", {message:"Esta operación NO se puede deshacer. ¿Confirma que desea eliminar esta Carpeta?"}, async _ => {
                await zPost("deleteUserFolder.fs", {folderId: this.node.id});
                this.triggerEvent("nodoEliminado", this.node);
            })
        } else if (id == "renombrarCarpeta") {
            this.showDialog("common/WInput", {subtitle:"Renombrar Carpeta", message:"Nuevo Nombre", value:this.node.name}, async newName => {
                try {
                    await zPost("renameUserFolder.fs", {folderId:this.node.id, newName:newName});
                    this.node.name = newName;
                    this.triggerEvent("nodoRenombrado", this.node);
                } catch(error) {
                    this.showDialog("common/WError", {message:error.toString()})
                }
            })
        } else if (id == "nuevaCarpeta") {
            this.showDialog("common/WInput", {
                message:"Ingrese el nombre de la nueva carpeta", subtitle:"Nueva Carpeta", value:"Nueva Carpeta"
            }, async nombre => {
                if (!nombre) return;
                let newFolder = await zPost("addUserFolder.fs", {newName:nombre, parentFolderId:this.node.id});
                this.triggerEvent("releeNodosHijos", newFolder.id);
            })
        } else if (id == "nuevoDashboard") {
            this.showDialog("common/WInput", {
                message:"Ingrese el nombre del nuevo dashboard", subtitle:"Nuevo Dashboard", value:"Nuevo Dashboard"
            }, async nombre => {
                if (!nombre) return;
                let newDashboard = await zPost("addDashboard.fs", {newName:nombre, folderId:this.node.id});
                this.triggerEvent("releeNodosHijos", newDashboard.id);
            })
        } else if (id == "importarDashboard") {
            this.showDialog("./WImportDashboard", {
                folderId:this.node.id
            }, async newDashboard => {
                this.triggerEvent("releeNodosHijos", newDashboard.id);
            })
        }
    }

    async onRepeater_getRows() {
        try {
            let folderContent = await zPost("getPrivateFolderContent.fs", {parentFolderId:this.node.id, includeFolders:true, includeDashboards:false});
            return folderContent.folders;
        } catch(error) {
            this.showDialog("common/WError", {message:error.toString()});
            return [];
        }
    }

    async onRepeater_select(folder) {
        this.triggerEvent("releeNodosHijos", folder.id);
    }

    async onDsbRepeater_getRows() {
        try {
            let folderContent = await zPost("getPrivateFolderContent.fs", {parentFolderId:this.node.id, includeFolders:false, includeDashboards:true});
            return folderContent.dashboards;
        } catch(error) {
            this.showDialog("common/WError", {message:error.toString()});
            return [];
        }
    }

    async onDsbRepeater_select(dashboard) {
        this.triggerEvent("releeNodosHijos", dashboard.id);
    }
}
ZVC.export(PrivateFolder);
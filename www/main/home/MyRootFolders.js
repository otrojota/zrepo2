class MyRootFolders extends ZCustomController {
    onThis_init(node) {
        this.node = node;
        this.repeater.refresh();
    }
    doResize() {
        let h = window.innerHeight;
        let top = parseInt(this.main.view.getBoundingClientRect().top)
        this.main.view.style.height = (h - top - 10) + "px";
    }

    getContextMenu() {
        return `
            <h6 class="dropdown-header">Opciones</h6>
            <a id="nuevaCarpeta" href="#" class="dropdown-item"><i class="fas fa-folder-plus me-2"></i>Nueva Carpeta</a>
        `;
    }
    doContextMenu(id) {
        console.log("doContextMenu", id);
        if (id == "nuevaCarpeta") {
            this.showDialog("common/WInput", {
                message:"Ingrese el nombre de la nueva carpeta", subtitle:"Nueva Carpeta", value:"Nueva Carpeta"
            }, async nombre => {
                if (!nombre) return;
                let newFolder = await zPost("addUserFolder.fs", {newName:nombre});
                console.log("newFolfer", newFolder);
                this.triggerEvent("releeNodosHijos", newFolder.id);
            })
        }
    }

    async onRepeater_getRows() {
        try {
            let rootFolders = await zPost("getPrivateFolderContent.fs", {parentFolderId:null, includeFolders:true, includeDashboards:false});
            return rootFolders.folders;
        } catch(error) {
            this.showDialog("common/WError", {message:error.toString()});
            return [];
        }
    }
    async onRepeater_select(folder) {
        this.triggerEvent("releeNodosHijos", folder.id);
    }
}
ZVC.export(MyRootFolders);
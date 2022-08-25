class Procesos extends ZCustomController {
    async onThis_init() {
        await this.groupsRepeater.refresh();
    }

    onGroupsRepeater_getRows() {
        let rows = window.config["process-groups"];
        if (rows && rows.length) {
            setTimeout(_ => this.onGroupsRepeater_click(rows[0]), 100);
        }
        return rows;
    }

    async onGroupsRepeater_click(grupo) {
        this.grupo = grupo;
        this.seleccionaOpcion(grupo.id);
        await this.procLoader.load("./ProcFolder", grupo);
    }

    async seleccionaOpcion(idOpcion) {        
        $(this.sideBar.view).find(".opcion-side-bar").removeClass("opcion-side-bar-activa");
        $(this.sideBar.view).find("[data-group='" + idOpcion + "']").addClass("opcion-side-bar-activa");
    }
}
ZVC.export(Procesos);
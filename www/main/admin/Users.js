class Users extends ZCustomController {
    async onThis_init() {
        this.groups = await zPost("getDashboardGroups.zrepo");
        console.log("groups", this.groups);
        this.refresh();
    }

    refresh() {
        this.list.refresh();
        this.userSelected();
    }

    prepareRow(r) {
        if (r.admin) {
            r.imgAdmin = '<i class="fa-regular fa-square-check"></i>';
            r._rowClass = "table-danger";
        } else {
            r.imgAdmin = '<i class="fa-regular fa-square"></i>';            
            delete r._rowClass;
        }
        return r;
    }
    async onList_getRows() {
        let rows = await zPost("getUsers.zrepo", {});     
        return rows.map(r => (this.prepareRow(r)));
    }

    async onCmdAdd_click() {
        await this.list.openNewDetails(
            "./EdUser", "Nuevo Usuario", {
                newRecord:true
            }
        );
    }
    onList_getDetailsConfig(row, rowIndex) {
        return {
            path:"./EdUser",
            options:{                
                record:row
            }
        }
    }

    async onList_cancel(row, rowIndex) {
        await this.list.closeDetails(rowIndex);
    }
    async onList_saved(row, rowIndex, changedeRecord) {
        await this.list.closeDetails(rowIndex);
        this.refresh();
    }
    async onList_deleted(row, rowIndex) {
        await this.list.closeDetails(rowIndex);
        this.refresh();
    }
    onList_change() {this.userSelected()}

    userSelected() {
        let u = this.list.getSelectedRow();
        console.log("user", u);
        if (u) {
            this.groupsList.refresh();
            this.groupsContainer.show();
            this.message.text = "[" + u.email + "] " + u.name + ": Permisos sobre Grupos de Dashboards";
        } else {
            this.groupsContainer.hide();
            this.message.text = "Seleccione un usuario desde la lista";
        }
    }
    prepareGroupRow(r) {
        r.lblGrupo = `<i class="${r.icon}" style="margin-left: ${(20 * r.level)}px; "></i>&nbsp;${r.name}`;
        if (r.query) r.imgQuery = '<i class="fa-regular fa-square-check text-dark"></i>';
        else r.imgQuery = '<i class="fa-regular fa-square text-dark"></i>';
        if (r.publish) r.imgPublish = '<i class="fa-regular fa-square-check text-dark"></i>';
        else r.imgPublish = '<i class="fa-regular fa-square text-dark"></i>';

        return r;
    }
    async onGroupsList_getRows() {
        let permisos = await zPost("getUserGroupsVisibility.zrepo", {email:this.list.getSelectedRow().email});
        let rows = this.groups.map(g => ({
            id:g.id, name:g.name, icon:g.icon, level: g.level,
            query:permisos[g.id] && permisos[g.id].query,
            publish:permisos[g.id] && permisos[g.id].publish
        })) 
        return rows.map(r => (this.prepareGroupRow(r)));
    }
    async onGroupsList_cellClick(row, idx, field) {
        try {
            if (field == "imgQuery") {
                await zPost("togleGroupVisibility.zrepo", {email: this.list.getSelectedRow().email, groupId:row.id, permission:"query"});
            } else if (field == "imgPublish") {
                await zPost("togleGroupVisibility.zrepo", {email: this.list.getSelectedRow().email, groupId:row.id, permission:"publish"});
            }
            this.userSelected();
        } catch(error) {
            this.showDialog("common/WError", {message:error.toString()});
        }
    }
}
ZVC.export(Users);
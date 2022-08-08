class WCompartir extends ZDialog {
    async onThis_init(options) {
        this.dashboard = options.dashboard;
        this.cmdOk.disable();
        this.groupsTree.refresh();
        this.permisos = await zPost("getUserGroupsVisibility.zrepo");
    }    

    onCmdCloseWindow_click() {
        this.cancel()
    }
    onCmdCancel_click() {
        this.cancel()
    }

    async onCmdOk_click() {
        try {
            await zPost("shareDashboard.fs", {dashboardId:this.dashboard.id, groupId:this.groupsTree.selectedNode.id});            
            this.close();
        } catch (error) {
            this.showDialog("common/WError", {message:error.toString()})
        }
    }

    makeSelectabe(g) {
        g.selectable = true;
        for (let s of g.items) {
            if (s._type == "shared") this.makeSelectabe(s);
        }
    }
    onGroupsTree_getNodes(parentNode) {
        try {
            if (parentNode._type == "root") {
                return new Promise(async (resolve, reject) => {
                    let groups = await zPost("getVisibleGroups.fs", {onlyGroups:true});
                    groups = groups.filter(f => f.id != "_fav_" && f.id != "_my_");
                    for (let g of groups) this.makeSelectabe(g);
                    resolve(groups);
                })
            } else {
                return [];
            }
        } catch(error) {
            this.showDialog("common/WError", {message:error.toString()});
        }
    }

    onGroupsTree_change(node) {
        if (this.permisos[node.id] && this.permisos[node.id].publish) {
            this.cmdOk.enable();
        } else {
            this.cmdOk.disable();
        }
    }
}
ZVC.export(WCompartir);
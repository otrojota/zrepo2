class DashboardItem extends ZCustomController {
    onThis_init(dashboard) {
        this.dashboard = dashboard;
        this.lblName.text = this.dashboard.name;
        this.icon.view.setAttribute("class", this.dashboard.icon + " fa-xl me-2");
    }

    onRow_click() {
        this.triggerEvent("select", this.dashboard);
    }
}
ZVC.export(DashboardItem);
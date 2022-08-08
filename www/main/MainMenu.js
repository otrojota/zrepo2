class MainMenu extends ZCustomController {
    onThis_init() {
        this.imgLogo.view.setAttribute("src", window.config.logo?window.config.logo:"img/zonar.png");
        if (window.sesion.user._globalAdmin) {
            this.itemHome.hide();
            this.onCmdProcesos_click();
        } else if (!window.sesion.isAdmin) {
            this.itemAdmin.hide();
            this.itemProcesos.hide();
        }
    }
    onCmdHome_click() {
        this.loader.load("./home/Home");
        this.seleccionaItem("cmdHome");
    }
    onCmdAdmin_click() {
        this.loader.load("./admin/Admin");
        this.seleccionaItem("cmdAdmin");
    }
    onCmdConsultas_click() {
        this.loader.load("./consultas/Consultas");
        this.seleccionaItem("cmdConsultas");
    }
    onCmdProcesos_click() {
        this.loader.load("./procesos/Procesos");
        this.seleccionaItem("cmdProcesos");
    }
    async onCmdLogout_click() {
        await zPost("logout.zrepo");
        delete window.zSecurityToken;
        this.triggerEvent("logout");
    }

    onCmdCambiarPwd_click() {
        this.showDialog("login/WChangePwd");
    }

    seleccionaItem(id) {
        $(this.view).find(".nav-link").removeClass("active");
        $(this.view).find("#" + id).addClass("active");
    }
}
ZVC.export(MainMenu)
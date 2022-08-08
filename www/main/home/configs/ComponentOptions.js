class ComponentOptions extends ZCustomController {
    onThis_init() {
        let configurable = this.view.getAttribute("data-configurable");
        if (configurable != "true") this.cmdConfigurar.hide();
    }
    async onCmdEliminar_click() {
        await this.triggerEvent("eliminar");
    }
    async onCmdConfigurar_click() {
        await this.triggerEvent("configurar");
    }
}
ZVC.export(ComponentOptions);
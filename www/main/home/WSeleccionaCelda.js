class WSeleccionaCelda extends ZDialog {
    onThis_init(options) {
        this.options = options;
        this.cmdOk.disable();
        this.layoutCeldas.refresh();
    }    

    onCmdCloseWindow_click() {
        this.cancel()
    }
    onCmdCancel_click() {
        this.cancel()
    }

    onCmdOk_click() {
        this.close(this.node);
    }

    onLayoutCeldas_getNodes(parentNode) {
        return this.options.nodes;
    }
    onLayoutCeldas_change(node) {
        this.node = node;
        this.cmdOk.disable();
        if (!node) return;
        if (node._type != "cell") return;
        if (!node.source.components) return;
        if (node.used) return;
        this.cmdOk.enable();
    }
}
ZVC.export(WSeleccionaCelda);
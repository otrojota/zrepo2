class LayoutConfig extends ZCustomController {
    async onThis_init(layout) {
        this.msgError.hide();
        if (layout.id == "_root_layout") this.cmpOptions.hide();
        this.layout = layout;
        this.minIndex = 0;
        for (let i=0; i<this.layout.components.length; i++) {
            let c = this.layout.components[i];
            let idx = c.cellIndex + c.cellSpan - 1;
            if (idx > this.minIndex) this.minIndex = idx;
        }
        this.refresh();
    }

    refresh() {
        if (this.layout.type == "row") this.edRow.checked = true;
        else this.edColumn.checked = true;
        this.edSize.value = this.layout.size;
    }

    validate() {
        this.msgError.hide();
        try {
            let s = parseInt(this.edSize.value);
            if (isNaN(s)) throw "Valor de N° de Celdas inválido";
            if (s < 1) throw "EL mínimo es una celda";
            if (s <= this.minIndex) throw "Hay componentes usando hasta la celda " + (this.minIndex + 1) + ". Debe moverlos o eliminarlos para disminuir el n° de celdas.";
            return true;
        } catch(error) {
            this.msgError.text = error;
            this.msgError.show();
            return false;
        }
    }

    async onEdSize_change() {
        if (!this.validate()) return;
        let s = parseInt(this.edSize.value);
        this.layout.size = s;        
        this.layout.widths = [];
        for (let i=0; i<s; i++) this.layout.widths[i] = (parseInt(100 / s)) + "%";
        this.triggerEvent("reloadChildren");
        await this.triggerEvent("designChange");
    }
    async onEdRow_change() {
        this.layout.type = this.edRow.checked?"row":"column";
        this.triggerEvent("currentNodeRenamed");
        await  this.triggerEvent("designChange");
    }
    async onEdColumn_change() {
        this.layout.type = this.edColumn.checked?"column":"row";
        this.triggerEvent("currentNodeRenamed");
        await this.triggerEvent("designChange");
    }

    async onCmpOptions_eliminar() {await this.triggerEvent("eliminar")}
    onCmpOptions_mover() {this.triggerEvent("mover")}
}
ZVC.export(LayoutConfig);
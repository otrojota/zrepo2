class NewColumn extends ZCustomController {
    onThis_init(options) {
        this.options = options;
        this.agrupador = options.agrupador;
        this.edTituloColumna.value = this.agrupador.tituloColumna || "";
        this.edIdColumna.value = this.agrupador.idColumna || "";
    }

    onEdTituloColumna_change() {
        this.agrupador.tituloColumna = this.edTituloColumna.value;
        this.agrupador.idColumna = this.edIdColumna.value;
    }

    onEdIdColumna_change() {
        this.agrupador.tituloColumna = this.edTituloColumna.value;
        this.agrupador.idColumna = this.edIdColumna.value;
    }
 
    onCmdEliminarAgrupador_click() {
        this.showDialog("common/WConfirm", {message:"¿Confirma que desea eliminar esta columna?"}, _ => {
            this.triggerEvent("eliminar", this.options.index);
        })        
    }
}
ZVC.export(NewColumn)
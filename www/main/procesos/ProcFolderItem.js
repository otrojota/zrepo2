class ProcFolderItem extends ZCustomController {
    onThis_init(grupo) {
        this.grupo = grupo;
        this.icon.view.setAttribute("class", grupo.icon + " fa-lg");
        this.lblName.text = grupo.name;
        this.item.view.setAttribute("data-group", grupo.id);
    }

    onItem_click() {
        this.triggerEvent("click", this.grupo);
    }
}
ZVC.export(ProcFolderItem);
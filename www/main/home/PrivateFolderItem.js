class PrivateFolderItem extends ZCustomController {
    onThis_init(folder) {
        this.folder = folder;
        this.lblName.text = this.folder.name;
    }

    onRow_click() {
        this.triggerEvent("select", this.folder);
    }
}
ZVC.export(PrivateFolderItem);
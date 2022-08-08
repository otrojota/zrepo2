class WImportDashboard extends ZDialog {
    onThis_init(options) {
        this.options = options;
        this.errorMessage.hide();
        this.workingMessage.hide();
        this.cmdOk.hide();        
    }    

    onCmdCloseWindow_click() {
        this.cancel()
    }
    onCmdCancel_click() {
        this.cancel()
    }

    async onEdFile_change() {
        //this.fileRow.hide();
        let file = this.edFile.view.files[0];
        try {
            this.workingMessage.show();
            this.workingText.text = "Importando Archivo ...";
            await this.readJSON();
            if (!this.dashboard) throw "El archivo no corresponde a un dashboard válido"
            this.cmdOk.show();
            this.workingMessage.hide();
        } catch(error) {
            this.workingMessage.hide();
            this.errorMessage.show();
            this.errorText.text = error.toString();
        }
    }

    readJSON() {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {    
                try {            
                    let json = JSON.parse(e.target.result)
                    if (!json.id || !json.name || !json.owner || !json.icon) throw "El archivo no corresponde a un dashboard válido";
                    this.dashboard = json;
                } catch(error) {
                    reject(error);
                }
                resolve();
            }
            reader.onerror = error => reject(error);
            reader.readAsText(this.edFile.view.files[0]);
        })
    }

    async onCmdOk_click() {
        this.cmdOk.disable();
        this.workingMessage.show();
        this.workingText.text = "Importando Dashboard ...";
        try {
            let d = await zPost("importDashboard.fs", {folderId:this.options.folderId, dashboard:this.dashboard});
            this.close(d);
        } catch(error) {
            console.error(error);
            this.workingMessage.hide();
            this.errorText.text = error.toString();
            this.errorMessage.show();
            this.importing = false;
        }
    }
}
ZVC.export(WImportDashboard);
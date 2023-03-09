class WEjecutarManual extends ZDialog {
    onThis_init(options) {
        this.proceso = options.proceso;
        this.trigger = options.trigger;
        this.subtitle.text = this.trigger.name;
        this.errorMessage.hide();
        this.workingMessage.hide();
        this.paramValues = {};
        this.paramsRows = (this.proceso.params || []).reduce((lista, p) => {
            // Buscar si el trigger define un campo con el mismo "code" que el param
            let v = this.trigger[p.code];
            if (v !== undefined) this.paramValues[p.code] = v;
            else lista.push(p);
            return lista;
        }, [])
        this.paramsContainer.refresh().then(_ => this.onParamsContainer_change())
    }    

    onCmdCloseWindow_click() {
        this.cancel()
    }
    onCmdCancel_click() {
        this.cancel()
    }

    onParamsContainer_getRows() {
        return this.paramsRows;
    }

    onParamsContainer_change() {
        let errorP = this.paramsRows.find(p => !p.isValid);
        if (errorP) {
            this.errorMessage.text = "Corrija los parámetros antes de ejecutar el proceso";
            this.errorMessage.show();
            this.cmdOk.disable();
        } else {
            this.errorMessage.hide();
            this.cmdOk.enable();
        }
    }

    async onCmdOk_click() {
        this.cmdOk.disable();
        this.workingMessage.show();
        this.workingText.text = "Iniciando Proceso ...";
        try {
            for (let p of this.paramsRows) {
                this.paramValues[p.code] = p.value;
            }
            let instanceId = await zPost("startProcess.zrepo", {plugin:this.proceso.plugin, process:this.proceso.code, params:this.paramValues, name:this.trigger.name, trigger:this.trigger});
            this.close(instanceId);
        } catch(error) {
            console.error(error);
            this.workingMessage.hide();
            this.errorText.text = error.toString();
            this.errorMessage.show();
            this.cmdOk.enable();
        }
    }
}
ZVC.export(WEjecutarManual);
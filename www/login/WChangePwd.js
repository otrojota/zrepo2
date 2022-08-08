class WChangePwd extends ZDialog {
    async onThis_init(options) {
        this.options = options;
        this.cmdOk.disable();
        this.errorMsg.hide();
        this.successMsg.hide();
        this.validaPuedeFinalizar();
    }

    validaPuedeFinalizar() {
        try {            
            this.errorMsg.hide();
            this.cmdOk.disable();
            let pwdActual = this.edPwdActual.value.trim();
            if (!pwdActual) throw "Debe ingresa la Contraseña Actual";
            let pwd1 = this.edPwd.value.trim();
            let pwd2 = this.edRepetirPwd.value.trim();

            if (!pwd1 || !pwd2) throw "Debe ingresa la Nueva Contraseña y su Repetición";
            if (pwd1 != pwd2) throw "La Nueva Contraseña y su Repetición son diferentes";
            this.cmdOk.enable();
        } catch(error) {
            this.errorMsg.show();
            this.errorMsg.text = error.toString();
        }
    }
    onEdPwdActual_change() {this.validaPuedeFinalizar()}
    onEdPwd_change() {this.validaPuedeFinalizar()}
    onEdRepetirPwd_change() {this.validaPuedeFinalizar()}

    async onCmdOk_click() {
        try {
            this.errorMsg.hide();
            this.cmdOk.disable();
            this.cmdCancel.disable();
            let pwdActual = this.edPwdActual.value.trim();
            let pwdNueva = this.edPwd.value.trim();
            await zPost("cambiarMiPwd.zrepo", {pwdActual, pwdNueva})
            this.successMsg.text = "Contraseña Modicada";
            this.successMsg.show();
            setTimeout(_ => this.close(), 2000);
        } catch(error) {
            this.errorMsg.show();
            this.errorMsg.text = error.toString();
            this.cmdOk.enable();
            this.cmdCancel.enable();
        }        
    }

    onCmdCancel_click() { this.cancel() }
}
ZVC.export(WChangePwd);
class Param extends ZCustomController {
    onThis_init(param) {
        this.param = param;
        console.log("param", param);
        this.edNumber.hide();
        this.edText.hide();
        this.edTextArea.hide();
        this.selectContainer.hide();
        this.lbl.text = param.name;
        if (param.type == "int" || param.type == "number") {
            this.edNumber.show();
            this.onEdNumber_change();
        } else if (param.type == "string") {
            if (param.textArea) {
                this.edTextArea.show();
                this.onEdTextArea_change();
            } else {
                this.edText.show();
                this.onEdText_change();
            }
        } else if (param.type == "list") {
            this.selectContainer.show();
            this.edSelect.setRows(param.values);
            this.onEdSelect_change();
        }
    }

    onEdNumber_change() {
        this.edNumber.removeClass("error");
        if (this.param.type == "int") {
            let v = parseInt(this.edNumber.value);
            if (isNaN(v)) {
                this.param.isValid = false;
                this.edNumber.addClass("error");
            } else {
                this.param.value = v;
                this.param.isValid = true;
            }
        } else if (this.param.type == "number") {
            let v = parseFloat(this.edNumber.value);
            if (isNaN(v)) {
                this.param.isValid = false;
                this.edNumber.addClass("error");
            } else {
                this.param.value = v;
                this.param.isValid = true;
            }
        }
        this.triggerEvent("change", this.param);
    }
    
    onEdText_change() {
        this.param.isValid = true;
        this.param.value = this.edText.value;
        this.triggerEvent("change", this.param);
    }
    onEdTextArea_change() {
        this.param.isValid = true;
        this.param.value = this.edTextArea.value;
        this.triggerEvent("change", this.param);
    }
    onEdSelect_change() {
        this.param.isValid = true;
        this.param.value = this.edSelect.value;
        this.triggerEvent("change", this.param);
    }
}
ZVC.export(Param);
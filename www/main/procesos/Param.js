class Param extends ZCustomController {
    onThis_init(param) {
        this.param = param;
        this.edNumber.hide();
        this.edText.hide();
        this.edTextArea.hide();
        this.selectContainer.hide();
        this.edDia.hide();
        this.lbl.text = param.name;
        if (param.type == "int" || param.type == "number") {
            if (param.default !== undefined) this.edNumber.value = param.default;
            this.edNumber.show();
            this.onEdNumber_change();
        } else if (param.type == "string") {
            if (param.textArea) {
                if (param.default !== undefined) this.edTextArea.value = param.default;
                this.edTextArea.show();
                this.onEdTextArea_change();
            } else {
                if (param.default !== undefined) this.edText.value = param.default;
                this.edText.show();
                this.onEdText_change();
            }
        } else if (param.type == "list") {
            this.selectContainer.show();
            this.edSelect.setRows(param.values, param.default);
            this.onEdSelect_change();
        } else if (param.type == "date") {
            this.edDia.show();
            this.edDia.value = moment.tz(Date.now(), window.timeZone).startOf("day");
            this.onEdDia_change();
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
    onEdDia_change() {
        this.param.isValid = true;
        this.param.value = this.edDia.value.format("YYYY-MM-DD");        
        this.triggerEvent("change", this.param);
    }
}
ZVC.export(Param);
class WResumeTable extends ZDialog {
    onThis_init(options) {
        this.options = options;
        this.edN.value = options.showN || "";
        this.edSum.value = options.showSum || "";
        this.edAvg.value = options.showAvg || "";
        this.edMin.value = options.showMin || "";
        this.edMax.value = options.showMax || "";
    }    

    onCmdCloseWindow_click() {
        this.cancel()
    }
    onCmdCancel_click() {
        this.cancel()
    }

    async onCmdOk_click() {
        this.close({
            showN: this.edN.value.trim(),
            showSum: this.edSum.value.trim(),
            showAvg: this.edAvg.value.trim(),
            showMin: this.edMin.value.trim(),
            showMax: this.edMax.value.trim()
        });
    }
}
ZVC.export(WResumeTable);
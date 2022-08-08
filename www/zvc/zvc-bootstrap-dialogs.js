ZVC.openDialogInPlatform = dialog => {
    let d = $(dialog.view.firstChild);
    d.modal({
        show:false, keyboard:true, backdrop:"static", focus:false
    });
    d.on("hidden.bs.modal", () => {
        if (!dialog._closedFromController) {
            dialog.cancel();            
        }
    });
    
    if (dialog.focusin_modal) {
        d.on("focusin.modal", e => dialog.focusin_modal(e));
    }    
    d.modal("show");
}
ZVC.closeDialogInPlatform = dialog => {
    let d = $(dialog.view.firstChild);
    d.modal("hide");
}
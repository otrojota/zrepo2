class ProcFolder extends ZCustomController {
    async onThis_init(grupo) {
        window.onresize = _ => {
            this.doResize();
        }  
        this.grupo = grupo;
        this.start = moment.tz(Date.now(), window.timeZone);
        this.start = this.start.startOf("day");
        this.end = this.start.clone().endOf("day");
        this.edDia.value = this.start;
        await this.refrescaProcesos();
        this.edEstado.setRows([{
            code:"_all_", name:"Cualquier Estado"
        }, {
            code:"exe", name:"En Ejecución"
        }, {
            code:"warn", name:"Con Errores y Advertencias"
        }, {
            code:"err", name:"Con Errores"
        }]);
        this.refrescaEjecutar();
    }
    onThis_deactivated() {
        window.onresize = null;
    }

    doResize() {
        let h = window.innerHeight;
        let top = parseInt(this.logsContainer.view.getBoundingClientRect().top);
        this.logsContainer.view.style["max-height"] = (h - top - 20) + "px";
        top = parseInt(this.listContainer.view.getBoundingClientRect().top);
        this.listContainer.view.style["max-height"] = (h - top - 12) + "px";
    }

    async refrescaProcesos() {
        try {
            this.procs = await zPost("getProcessesInGroup.zrepo", {groupId:this.grupo.id});
            this.edProceso.setRows(
                [{id:"_all_", name:"[Todos los Procesos]"}].concat(this.procs)
            );
            this.buscaEjecuciones();
        } catch (error) {
            this.edProceso.setRows(
                [{id:"_all_", name:"[Todos los Procesos]"}]
            );
            this.procs = [];
            console.error(error);
            this.buscaEjecuciones();
        }
    }

    onEdProceso_change() {
        this.refrescaEjecutar();
        this.buscaEjecuciones();
    }
    onEdDia_change() {
        this.start = this.edDia.value;
        this.end = this.start.clone().endOf("day");
        this.buscaEjecuciones();
    }
    onEdEstado_change() {
        this.buscaEjecuciones();
    }

    refrescaEjecutar() {
        let p = this.edProceso.selectedRow;
        if (p.id == "_all_") {
            this.cmdRun.disable();
            return;
        }
        this.manualTriggers = (p.triggers || []).filter(t => t.type == "manual");
        if (!this.manualTriggers.length) {
            this.cmdRun.disable();
            return;
        }
        this.cmdRun.enable();
        let html = this.manualTriggers.reduce((html, t, idx) => {
            return html + `
                <a ihref="#" class="dropdown-item" data-idx="${idx}"><i class="fas fa-user-gear me-2"></i>${t.name}</a>
            `;
        }, "");
        this.manProcs.html = html;
        this.manProcs.findAll(".dropdown-item").forEach(a => {
            a.onclick = evt => {
                let idx = parseInt(a.getAttribute("data-idx"));
                this.invocaManual(this.manualTriggers[idx]);
            }
        })
    }

    invocaManual(trigger) {
        let proceso = this.edProceso.selectedRow;
        this.showDialog("./WEjecutaManual", {proceso, trigger}, pi => {
            this.buscaEjecuciones(pi);
        });
    }

    prepareRow(r) {
        let started = moment.tz(r.started, window.timeZone);
        r.fmtStarted = started.format("HH:mm:ss");
        if (r.finished) {
            let finished = moment.tz(r.finished, window.timeZone);
            r.fmtFinished = finished.format("HH:mm:ss");
        } else {
            r.fmtFinished = "";
        }
        r.name = r.name || "";
        if (r.warnings) {
            r.imgStatus = "<i class='fas fa-triangle-exclamation' style='color: orange;'></i>";
            if (r.errors) r.imgStatus += "<i class='fas fa-skull-crossbones ms-2' style='color: red;'></i>"
        } else if (r.errors) {
            r.imgStatus = "<i class='fas fa-skull-crossbones' style='color: red;'></i>";  
        } else {
            r.imgStatus = "<i class='fas fa-check'></i>";  
        }
        if (r.running) {
            r.imgStatus = '<i class="fa-solid fa-person-running me-2" style="color: green; "></i>' + r.imgStatus;
        }
        if (r.canceling) {
            r.imgStatus = '<i class="fa-solid fa-ban me-2" style="color: red; "></i>' + r.imgStatus;
        }
        return r;
    }

    async onCmdRefresh_click() {
        let selectedId = this.rowsList.getSelectedRow()?this.rowsList.getSelectedRow()._id:null;
        await this.buscaEjecuciones(selectedId);
    }
    async buscaEjecuciones(idToSelect) {
        if (idToSelect) {
            await this.rowsList.refresh(r => (r._id == idToSelect));
        } else {
            await this.rowsList.refresh();
        }
        await this.refrescaDetalles();        
    }
    async onRowsList_getRows() {
        try {
            let proc = this.edProceso.selectedRow;
            let st = this.edEstado.value;
            let onlyRunning = st == "exe";
            let withErrors = st == "err";
            let withErrorsOrWarnings = st == "warn";
            let rows = await zPost("findExecutions.zrepo", {
                processes:this.procs.map(p => (p.pluginCode + "." + p.code)),
                pluginCode:proc.id == "_all_"?null:proc.pluginCode,
                processCode:proc.id == "_all_"?null:proc.code,
                start:this.start.valueOf(),
                end:this.end.valueOf(),
                onlyRunning, withErrors, withErrorsOrWarnings
            });
            return rows.map(r => this.prepareRow(r));
        } catch(error) {
            console.error(error);
            return [];
        }
    }

    onRowsList_getDetailsConfig(row, rowIndex) {
        return {path:"./ExecutionDetails", options:row}
    }

    onRowsList_change() {
        this.refrescaDetalles();
    }

    setDetailsWorking(working) {
        if (working) {
            this.detailsWorking.show();
            this.cmdUpdate.disable();
        } else {
            this.detailsWorking.hide(); 
            this.cmdUpdate.enable();
        }
    }
    async refrescaDetalles() {
        try {
            this.cmdDetener.hide();
            this.cmdFinalizar.hide();
            let proc = this.rowsList.getSelectedRow();
            if (!proc) {                
                this.rowDetails.hide();
                this.doResize();
                return;
            }
            this.rowDetails.show();
            this.lblDetailsCaption.text = proc.name;            
            if (proc.running) {
                if (proc.canceling) this.cmdFinalizar.show();
                else this.cmdDetener.show();
            }
            await this.logList.refresh();
            this.doResize();
        } catch (error) {
            console.error(error);
        }
    }

    prepareLogRow(r) {
        let time = moment.tz(r.time, window.timeZone);
        r.fmtTime = time.format("HH:mm:ss");
        if (r.type == "I") r.imgType = "";
        else if (r.type == "W") r.imgType = "<i class='fas fa-triangle-exclamation' style='color: orange;'></i>";
        else r.imgType = "<i class='fas fa-skull-crossbones' style='color: red;'></i>";
        r.fmtText = r.text;
        return r;
    }

    async onLogList_getRows() {
        try {
            this.setDetailsWorking(true);
            let proc = this.rowsList.getSelectedRow();
            let rows = await zPost("getLogs.zrepo", {instanceId:proc._id});
            this.setDetailsWorking(false);
            return rows.map(r => this.prepareLogRow(r));
        } catch (error) {
            console.error(error);
        }
    }

    onLogList_getDetailsConfig(row, rowIndex) {
        return {path:"./LogDetails", options:{instanceId:this.rowsList.getSelectedRow()._id, index:row.idx}}
    }

    async onCmdUpdate_click() {
        try {
            this.setDetailsWorking(true);
            let maxIndex = -1;
            if (this.logList.rows && this.logList.rows.length) {
                maxIndex = this.logList.rows[this.logList.rows.length - 1].idx;
            }
            let proc = this.rowsList.getSelectedRow();
            let rows = await zPost("getLogs.zrepo", {instanceId:proc._id, fromIndex:maxIndex});

            this.logList.rows =  this.logList.rows.concat(rows.map(r => this.prepareLogRow(r)));
            this.logList.repaint();
            this.setDetailsWorking(false);
        } catch (error) {
            console.error(error);
        }
    }

    onCmdDetener_click() {
        let procInstance = this.rowsList.getSelectedRow();
        if (!procInstance) return;
        this.showDialog("common/WConfirm", {message:"¿Confirma que desea solicitar al Proceso que Detenga su Ejecución?"}, async _ => {
            try {
                await zPost("detenerProceso.zrepo", {instanceId:procInstance._id})
                await this.buscaEjecuciones(procInstance._id);        
            } catch (error) {
                this.showDialog("common/WError", {message:error.toString()})        
            }
        })
    }
    onCmdFinalizar_click() {
        let procInstance = this.rowsList.getSelectedRow();
        if (!procInstance) return;
        this.showDialog("common/WConfirm", {message:"¿Confirma que desea marcar el proceso en ejecución como 'Finalizado'?"}, async _ => {
            try {
                await zPost("finalizarProceso.zrepo", {instanceId:procInstance._id})
                await this.buscaEjecuciones(procInstance._id);                    
            } catch (error) {
                this.showDialog("common/WError", {message:error.toString()})
            }                
        });
    }
}
ZVC.export(ProcFolder);
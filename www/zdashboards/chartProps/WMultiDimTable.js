class WDimTable extends ZDialog {
    onThis_init(options) {
        this.options = options;
        this.agrupadores = options.agrupadores || [];
        //this.edZeroFill.checked = this.options.zeroFill?true:false;
        let accums = [{
            code:"no", name:"[Vacía]"
        }, {
            code:"sum", name:"Suma en Período"
        }, {
            code:"n", name:"Nª Muestras en Período"
        }, {
            code:"avg", name:"Promedio Período"
        }, {
            code:"min", name:"Mínimo en el Período"
        }, {
            code:"max", name:"Máximo en el Período"
        }];
        this.edCol2.setRows(accums, options.accum2 || "no");
        this.edCol3.setRows(accums, options.accum3 || "no");
        this.edCol4.setRows(accums, options.accum4 || "no");
        this.edCol5.setRows(accums, options.accum5 || "no");

        this.edTotalsRow.checked = options.totalsRow?true:false;
        this.refrescaAgrupadores();
    }    

    refrescaAgrupadores() {
        this.rptAgrupadores.refresh();
    }
    onRptAgrupadores_getRows() {
        let rows = this.agrupadores.map((r, idx) => ({
            dashboard: this.options.dashboard,
            agrupador: r,
            index: idx,
            variable: this.options.variable            
        }))
        return rows;
    }

    onRptAgrupadores_eliminar(index) {
        this.agrupadores.splice(index, 1);
        this.refrescaAgrupadores();
    }

    onCmdAgregarAgrupador_click() {
        let agrupador = {
            ruta:"", tituloColumnaDimension:"", dimData:"inQuery"
        }
        this.agrupadores.push(agrupador);
        this.refrescaAgrupadores();
    }

    onCmdCloseWindow_click() {
        this.cancel()
    }
    onCmdCancel_click() {
        this.cancel()
    }

    async onCmdOk_click() {
        this.close({        
            agrupadores: this.agrupadores,
            //zeroFill: this.edZeroFill.checked,
            accum2: this.edCol2.value, accum3: this.edCol3.value,
            accum4: this.edCol4.value, accum5: this.edCol5.value,
            totalsRow: this.edTotalsRow.checked
        });
    }
}
ZVC.export(WDimTable);
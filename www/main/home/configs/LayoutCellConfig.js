class LayoutCellConfig extends ZCustomController {
    async onThis_init(node) {
        this.cellNode = node;
        if (node.source.type != "row") {
            this.rowConfig.hide();
        }
        this.refresh("row");
        this.findAll(".form-check-input").forEach(e => {
            e.onchange = _ => this.refresh(e.getAttribute("id"));
        })
        let w = this.cellNode.source.widths[this.cellNode.cellIndex];
        this.edWidth.value = parseInt(w);
        let unit = ("" + w).endsWith("%")?"%":"p";
        this.edUnit.setRows([{code:"%", name:"Porcentaje"}, {code:"p", name:"Pixels"}], unit);
    }

    refresh(type) {
        this.selectedType = type;
    }

    newId() {return "ID_" + parseInt(Math.random() * 999999999999);}
    async onCmdAgregar_click() {
        let c;
        if (this.selectedType == "row" || this.selectedType == "column") {
            c = {id:this.newId(), cellIndex:this.cellNode.cellIndex, type:this.selectedType, components:[], size:2, widths:["50%", "50%"]};
        } else if (this.selectedType == "dimFilter") {
            c = {id:this.newId(), cellIndex:this.cellNode.cellIndex, type:this.selectedType, dimension:null, paramName:"nombreDimension", emptyText:"Filtrar por XX", nonEmptyPrefix:"Elementos tales que"};
        } else if (this.selectedType == "dimRowSelector") {
            c = {id:this.newId(), cellIndex:this.cellNode.cellIndex, type:this.selectedType, height:50, dimension:null, paramName:"nombreDimension", emptyText:"Filtrar por XX", nonEmptyPrefix:"XX igual a"};
        } else if (this.selectedType == "timeSerie") {
            c = {id:this.newId(), cellIndex:this.cellNode.cellIndex, type:this.selectedType, height:300, serieType:"line", zoomTiempo:true, acumulador:"value", useQuery:true, useTemporality:true};
        } else if (this.selectedType == "timeDim") {
            c = {id:this.newId(), cellIndex:this.cellNode.cellIndex, type:this.selectedType, height:300, serieType:"bars", zoomTiempo:true, acumulador:"value", useQuery:true, useTemporality:true};
        } else if (this.selectedType == "pie") {
            c = {id:this.newId(), cellIndex:this.cellNode.cellIndex, type:this.selectedType, height:300, acumulador:"value", useQuery:true, useTemporality:false};
        } else if (this.selectedType == "dimSerie") {
            c = {id:this.newId(), cellIndex:this.cellNode.cellIndex, type:this.selectedType, height:300, acumulador:"value", useQuery:true, useTemporality:false};
        } else if (this.selectedType == "dimTable") {
            c = {id:this.newId(), cellIndex:this.cellNode.cellIndex, type:this.selectedType, height:300, acumulador:"value", useQuery:true, useTemporality:false};
        } else if (this.selectedType == "heatMap") {
            c = {id:this.newId(), cellIndex:this.cellNode.cellIndex, type:this.selectedType, height:300, acumulador:"value", indiceColor:1, useQuery:true, useTemporality:false};
        } else if (this.selectedType == "dim-dim-table") {
            c = {id:this.newId(), cellIndex:this.cellNode.cellIndex, type:this.selectedType, height:300, acumulador:"value", useQuery:true, useTemporality:false};
        } else if (this.selectedType == "gauge") {
            c = {id:this.newId(), cellIndex:this.cellNode.cellIndex, type:this.selectedType, height:200, acumulador:"value", min:0, max:100000, firstColor:"#0f9747", firstLabel:"Bajo", 
                    ranges:[{
                        value:50000, color:"#ee1f25",
                        label:"Alto"
                    }], 
                    useQuery:true, useTemporality:false
                };
        } else if (this.selectedType == "forceDirectedTree") {
            c = {id:this.newId(), cellIndex:this.cellNode.cellIndex, type:this.selectedType, height:300, acumulador:"value", useQuery:true, useTemporality:false};
        } else if (this.selectedType == "dimSerie") {
            c = {id:this.newId(), cellIndex:this.cellNode.cellIndex, type:this.selectedType, height:300, acumulador:"value", useQuery:true, useTemporality:false};
        } else if (this.selectedType == "resume-table") {
            c = {id:this.newId(), cellIndex:this.cellNode.cellIndex, type:this.selectedType, height:300, useQuery:true, useTemporality:false, showN:"Nª Muestras", showSum:"Suma", showAvg:"Promedio", showMin:"", showMax:""};
        } else {
            console.error("Tipo de componente ", this.selectedType, " no manejado aun");
        }
        if (c) {
            this.cellNode.source.components.push(c);
            await this.triggerEvent("reloadParent", this.cellNode.id);
            await this.triggerEvent("designChange");
        } else {
            console.error("No Implementado");
        }
    }
    async onEdWidth_change() {await this.cambioAncho(); await this.triggerEvent("designChange");}
    async onEdUnit_change() {await this.cambioAncho(); await this.triggerEvent("designChange");}
    async cambioAncho() {
        let w = parseInt(this.edWidth.value);
        if (isNaN(w)) return;
        this.cellNode.source.widths[this.cellNode.cellIndex] = w + this.edUnit.value;
        await this.triggerEvent("reloadParent", this.cellNode.id);
        await this.triggerEvent("designChange");
    }
}
ZVC.export(LayoutCellConfig);
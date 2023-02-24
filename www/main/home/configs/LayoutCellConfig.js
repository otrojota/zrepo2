class LayoutCellConfig extends ZCustomController {
    async onThis_init(node) {
        this.cellNode = node;
        if (node.source.type != "row") {
            this.rowConfig.hide();
        }
        let w = this.cellNode.source.widths[this.cellNode.cellIndex];
        this.edWidth.value = parseInt(w);
        let unit = ("" + w).endsWith("%")?"%":"p";
        this.edUnit.setRows([{code:"%", name:"Porcentaje"}, {code:"p", name:"Pixels"}], unit);
        this.refresh();
    }

    getCellContent() {
        if (!this.cellNode.source.components) return null;
        return this.cellNode.source.components.find(c => c.cellIndex == this.cellNode.cellIndex);
    }
    
    refresh() {
        let rows = ZDashboardElement.getCoomponentsList();        
        rows.splice(0,0,{
            type:"row", name:"Fila", icon:"fas fa-ellipsis"
        }, {
            type:"column", name:"Columna", icon:"fas fa-ellipsis-vertical"
        });
        let contenidoActual = this.getCellContent();
        let html = rows.reduce((html, row) => {
            let activo = (contenidoActual && contenidoActual.type == row.type);
            html += `<a href="#" class="list-group-item list-group-item-action ${activo?' active':''}" data-type="${row.type}">
                         <i class="${row.icon} me-2"></i>
                         ${row.name}
                     </a>
            `;
            return html;
        }, "");
        html = `<div class="list-group mb-3 mt-2">${html}</div>`;
        this.contenidoCelda.html = html;
        this.contenidoCelda.findAll(".list-group-item-action").forEach(a => {
            a.onclick = async e => {
                let type = a.getAttribute("data-type");
                await this.setContent(type);
            }
        })
    }

    newId() {return "ID_" + parseInt(Math.random() * 999999999999);}

    async setContent(type) {
        let actual = this.getCellContent();
        if (actual && actual.type == type) return;
        if (actual) {
            this.showDialog("common/WConfirm", {message:"¿Confirma que desea reemplazar el contenido actual de la celda?"}, async _ => await this.finishSetContent(type));
        } else {
            await this.finishSetContent(type);
        }        
    }
    async finishSetContent(type) {
        let c = {id:this.newId(), cellIndex:this.cellNode.cellIndex, type:type}
        if (type == "row" || type == "column") {
            c.components = [];
            c.size = 2;
            c.widths = ["50%", "50%"];
        } else {
            let cmpDef = ZDashboardElement.getComponent(type);
            if (cmpDef && cmpDef.factories && cmpDef.factories.init) {
                cmpDef.factories.init(c);
            }
        }
        // Eliminar actual en la misma ubicación (si existe)
        if (this.cellNode.source.components) {
            let idx = this.cellNode.source.components.findIndex(c => c.cellIndex == this.cellNode.cellIndex);
            if (idx >= 0) this.cellNode.source.components.splice(idx, 1);
        }
        // Agregar nuevo componente
        this.cellNode.source.components.push(c);
        await this.triggerEvent("reloadParent", this.cellNode.id);
        await this.triggerEvent("designChange");
        this.refresh();
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
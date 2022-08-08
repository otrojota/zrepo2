class ZTree extends ZCustomController {
    onThis_init() {
        this.idField = this.view.getAttribute("data-z-id-field") || "id";
        this.labelField = this.view.getAttribute("data-z-label-field") || "label";
        this.itemsField = this.view.getAttribute("data-z-items-field") || "items";
        this.iconField = this.view.getAttribute("data-z-icon-field") || "icon";
        this.rootNode = {_type:"root", _isOpen:false, _level:0, _loaded:false, _calculatedId:"", _isLeaf:false, items:true};
        this.rootNode[this.idField] = "_root";
        this.rootNode[this.labelField] = "Root";
    } 

    findNode(id) {
        let indexes = id.split("_");
        let n = this.rootNode;
        for (let i=1; i<indexes.length; i++) {
            let idx = parseInt(indexes[i]);
            n = n.items[idx];
        }
        return n;
    }
    findNodeById(id) {
        if (!this.rootNode._loaded) return null;
        return this.findNodeFrom(this.rootNode, id);
    }
    findNodeFrom(parentNode, id) {
        for (let n of parentNode.items) {
            if (n[this.idField] == id) return n;
            if (!n._isLeaf && n._loaded) {
                let found = this.findNodeFrom(n, id);
                if (found) return found;
            }
        }
        return null;
    }
    findParentNode(nodeOrCalculatedId) {
        let id = nodeOrCalculatedId;
        if (typeof id == "object") id = id._calculatedId;
        let indexes = id.split("_");
        indexes.pop();
        return this.findNode(indexes.join("_"));
    }

    findItem(id) {
        return this.find("#li" + id);
    }

    async refresh() {
        this.rootNode = {_type:"root", _isOpen:false, _level:0, _loaded:false, _calculatedId:"", _isLeaf:false, items:true};
        this.rootNode[this.idField] = "_root";
        this.rootNode[this.labelField] = "Root";        
        await this.toggleNode(this.rootNode);
    }

    async loadNode(node) {
        let items = this.triggerEvent("getNodes", node);
        if (items instanceof Promise) {            
            if (node._type == "root") {
                this.html = "<i class='fas fa-spin fa-spinner mx-3 fa-2x'></i>";
           } else {
                let li = this.findItem(node._calculatedId);
                let i = li.children[0];
                i.classList.remove("fa-angle-right");
                i.classList.add("fa-spinner");
                i.classList.add("fa-spin");
            }
            items = await items;
            if (node._type == "root") {
                this.html = "";
            } else {
                let li = this.findItem(node._calculatedId);
                let i = li.children[0];
                i.classList.remove("fa-spin");
                i.classList.remove("fa-spinner");
                i.classList.add("fa-angle-right");
            }
        }
        if (!items || !Array.isArray(items)) throw "Se esperaba un arreglo de items en 'getNodes(nodoPadre)'";
        node.items = items;
        this.initItems(node);
        node._loaded = true;
    }

    initItems(node) {
        let n = 0;
        for (let i of node.items) {
            i._level = node._level + 1;
            if (i.items) {
                i._isLeaf = false;
                if (Array.isArray(i.items)) i._loaded = true;
                else i._loaded = false;
                i._isOpen = false;
            } else {
                i._isLeaf = true;
            }
            i._calculatedId = node._calculatedId + "_" + n;
            if (i._loaded) this.initItems(i);
            n++;
        }
    }

    async toggleNode(node, repaint) {
        node._isOpen = !node._isOpen;
        let container = node._type == "root"?this.view:(this.find("#li" + node._calculatedId));        
        let ul;
        if (node._isOpen) {
            if (!node._loaded) {
                await this.loadNode(node);
            }
            ul = container.querySelector("ul");
            if (ul && repaint) {ul.remove(); ul = null;}
            if (!ul) {
                let html = node.items.reduce((html, n) => (html + this.getNodeHTML(n)), "<ul class='list-group ztree-nodes mt-1'>") + "</ul>";
                container.innerHTML += html;                
                container.querySelectorAll(".node-expander").forEach(e => e.onclick = evt => {
                    evt.stopPropagation();
                    let n = this.findNode(e.parentNode.getAttribute("id"));
                    this.toggleNode(n);
                });                
                container.querySelectorAll(".list-group-item").forEach(e => e.onclick = evt => {
                    evt.stopPropagation();
                    let n = this.findNode(e.getAttribute("id"));                    
                    if (n._isLeaf || n.selectable) {
                        this.selectedItem = e;
                        this.triggerEvent("change", n);
                    } else {
                        this.toggleNode(n);
                    }
                });
            }
        }
        if (node._type != "root") {
            setTimeout(_ => {
                if (!ul) ul = container.querySelector("ul");
                let expander = container.children[0];
                if (node._isOpen) {
                    expander.classList.add("ztree-open-expander");
                    expander.classList.remove("ztree-closed-expander");
                    ul.style.display = "";
                    setTimeout(_ => {
                        ul.classList.add("ztree-open-children-container");
                        ul.classList.remove("ztree-closed-children-container");
                    }, 10);
                } else {
                    expander.classList.add("ztree-closed-expander");
                    expander.classList.remove("ztree-open-expander");
                    ul.classList.add("ztree-closed-children-container");
                    ul.classList.remove("ztree-open-children-container");
                    setTimeout(_ => ul.style.display = "none", 200);
                }
            }, 10);
        }
        
    }

    getNodeHTML(node) {
        let html = `
            <li id="${"li" + node._calculatedId}" class="list-group-item ztree-item ${node._level>1?" ztree-subitem":""}" style="cursor: pointer; ">`;
        if (node._isLeaf) {
            html += `<i style="margin-right:16px;"></i>`;
        } else {
            html += `<i class="fas fa-angle-right fa-xl node-expander"></i>`;
        }
        html += `
                <i class="${node[this.iconField]} fa-lg selectable-item" style="margin-left: 10px; margin-right: 10px;"></i>
                <span class="selectable-item">${node[this.labelField]}</span>
            </li>
        `;
        return html;
    }

    get selectedItem() {return this.view.querySelector(".list-group-item.active");}
    set selectedItem(item) {
        let oldSelected = this.selectedItem;
        if (oldSelected) oldSelected.classList.remove("active");
        if (item) item.classList.add("active");
    }
    
    get selectedNode() {
        let item = this.selectedItem;
        if (!item) return null;
        return this.findNode(item.getAttribute("id"));
    }
    set selectedNode(nodeOrId) {
        if (nodeOrId === null) {
            this.selectedItem = null;
            return;
        }
        let n;
        if (typeof nodeOrId == "string") n = this.findNodeById(nodeOrId);
        else n = nodeOrId;
        if (!n) {
            console.error("No se encontró el nodo para seleccionar desde", nodeOrId);
            return;
        }
        let i = this.findItem(n._calculatedId);
        this.selectedItem = i;
    }

    async reloadChildren(node, newItems) {        
        node._isOpen = false;
        if (newItems) {
            node.items = newItems;
            this.initItems(node);
            node._loaded = true;
        } else {
            node.items = true;
            node._loaded = false;
        }
        let container = node._type == "root"?this.view:(this.find("#li" + node._calculatedId));
        let ul = container.querySelector("ul");
        if (ul) ul.remove();
        await this.toggleNode(node);
    }
    
    async reloadParent(nodeOrId, select, newItems) {
        let node = (typeof nodeOrId == "string"?this.findNodeById(nodeOrId):nodeOrId);
        let indexes = node._calculatedId.split("_");
        let n = this.rootNode;
        for (let i=1; i < (indexes.length - 1); i++) {
            let idx = parseInt(indexes[i]);
            n = n.items[idx];
        }
        await this.reloadChildren(n, newItems);
        if (select) this.selectedNode = n;
    }

    nodeRenamed(node) {
        let n = this.findNodeById(node[this.idField]);
        let i = this.findItem(n._calculatedId);
        if (i) {
            let span = i.children[2];
            span.innerHTML = node[this.labelField];
            if (node.icon) {
                let img = i.children[1];
                img.setAttribute("class", node.icon + " fa-lg " + (node.selectable?"selectable-item":""));
            }
        }
    }
}

ZVC.export(ZTree);
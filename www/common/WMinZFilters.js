

class WFiltrosMinZ extends ZDialog {
    async onThis_init(options) {
        this.caret.hide();
        this.consulta = MinZQuery.cloneQuery(options.consulta);
        this.paramsProvider = options.paramsProvider;
        this.esDimension = options.esDimension;
        await this.consulta.construyeDescripcionFiltros()
        this.arbol = await this.consulta.getArbolFiltros();
        this.cellWidth = 155; this.cellHeight = 72;
        this.rectWidth = 115; this.rectHeight = 56;
        let w = (this.arbol.max.x + 1) * this.cellWidth,
            h = (this.arbol.max.y + 1) * this.cellHeight;
        if (isNaN(w)) w = this.cellWidth;
        if (isNaN(h)) h = this.cellHeight;
        this.stage.size = {width:w, height:h};
        this.konvaStage = new Konva.Stage({
            container:this.stage.view,
            width:w, height:h
        })
        this.konvaLayer = new Konva.Layer();
        this.konvaStage.add(this.konvaLayer);
        this.refresca()            
    }

    refresca() {
        this.konvaLayer.destroyChildren();
        let x = this.cellWidth / 2;
        let y = this.cellHeight / 2;
        let roundedRect = new Konva.Rect({
            x:x - this.rectWidth / 2, y:y - this.rectHeight / 2, width:this.rectWidth, height:this.rectHeight,
            fill: '#5569cf',
            stroke: '#000000',
            strokeWidth: 1,
            shadowColor: 'black',
            shadowBlur: 10,
            shadowOffset: { x: 4, y: 4 },
            shadowOpacity: 0.5,
            cornerRadius:3,
            opacity:1
        });
        this.nodoRoot = null;
        if (this.esDimension) {
            this.nodoRoot = {x:0, y:0, clasificador:null, editable:true, ruta:""};
            roundedRect.on("mouseenter", _ => this.enterNodo(this.nodoRoot));
            roundedRect.on("mouseleave", _ => this.exitNodo(this.nodoRoot));
            roundedRect.on("mouseup", _ => this.clickNodo(this.nodoRoot));
        }
        this.konvaLayer.add(roundedRect);
        if (this.esDimension) {
            let textColor = "white";  // Editable, sin filtro
            // Titulo
            let titulo = new Konva.Text({
                x: x - this.rectWidth / 2,
                width: this.rectWidth,
                y: y - this.rectHeight / 2,
                height: 30,
                fontSize: 12,
                fontFamily: 'Calibri',
                fill:textColor,
                padding: 10,
                align:"center",
                verticalAlign:"middle",
                text:this.consulta.variable.name,
                listenning:false
            })
            // Eventos
            titulo.on("mouseenter", _ => this.enterNodo(this.nodoRoot));
            titulo.on("mouseleave", _ => this.exitNodo(this.nodoRoot));
            titulo.on("mouseup", _ => this.clickNodo(this.nodoRoot))
            this.konvaLayer.add(titulo);
            // Separador
            let sep = new Konva.Line({
                points:[x - this.rectWidth / 2, y - this.rectHeight / 2 + 30, x + this.rectWidth / 2, y - this.rectHeight / 2 + 30],
                stroke:"black",
                strokeWidth:1.2,
                listenning:false
            })
            this.konvaLayer.add(sep);
            // Contenido
            this.nodoRoot.filtro = this.consulta.filters?this.consulta.filters.find(f => f.ruta.length == 0):null;
            this.nodoRoot.descripcionFiltro = this.consulta.descripcionFiltros?this.consulta.descripcionFiltros.find(f => f.ruta.length == 0):null;
            if (this.nodoRoot.filtro) {
                let contenido = new Konva.Text({
                    x: x - this.rectWidth / 2,
                    width: this.rectWidth,
                    y: y - this.rectHeight / 2 + 30,
                    height: this.rectHeight - 30,
                    fontSize: 11,
                    fontFamily: 'Calibri',
                    fill:textColor,
                    padding: 10,
                    align:"center",
                    verticalAlign:"middle",
                    text:this.nodoRoot.descripcionFiltro.etiquetaValor,
                    listenning:false
                })
                contenido.on("mouseenter", _ => this.enterNodo(this.nodoRoot));
                contenido.on("mouseleave", _ => this.exitNodo(this.nodoRoot));
                contenido.on("mouseup", _ => this.clickNodo(this.nodoRoot))
                this.konvaLayer.add(contenido);
            }
        } else {
            let text = new Konva.Text({
                x: x - this.rectWidth / 2,
                y: y - this.rectHeight / 2,
                width: this.rectWidth,
                height: this.rectHeight,
                fontSize: 14,
                fontFamily: 'Calibri',
                fill:"white",
                padding: 10,
                align:"center",
                verticalAlign:"middle",
                text:this.consulta.variable.name +(this.consulta.variable.options?"\n[" + this.consulta.variable.options.unit + "]":"")
            })
            this.konvaLayer.add(text);
        }
        this.dibujaNodos(0,0, this.arbol.nodos);
        this.konvaLayer.draw();
    }

    dibujaNodos(parentX, parentY, nodos) {
        for (let i=0; i<nodos.length; i++) {
            let nodo = nodos[i];
            let fillColor = "white";  // Editable, sin filtro
            let textColor = "black";  // Editable, sin filtro
            if (nodo.editable) {
                if (nodo.filtro) {
                    // Filtro Cambiable
                    fillColor = "#f0b375";
                    textColor = "black";
                }
            } else {
                if (nodo.filtro) {
                    // Filtro Fijo
                    fillColor = "#c75f52";
                    textColor = "black";
                } else {
                    // No editable, sin filtro
                    fillColor = "#b8afae";
                    textColor = "black";
                }
            }
            let x = this.cellWidth * nodo.x + this.cellWidth / 2;
            let y = this.cellHeight * nodo.y + this.cellHeight / 2;
            let roundedRect = new Konva.Rect({
                x:x - this.rectWidth / 2, y:y - this.rectHeight / 2, width:this.rectWidth, height:this.rectHeight,
                fill: fillColor,
                stroke: '#000000',
                strokeWidth: 1,
                shadowColor: 'black',
                shadowBlur: 10,
                shadowOffset: { x: 4, y: 4 },
                shadowOpacity: 0.5,
                cornerRadius:3,
                opacity:1
            });
            // Eventos
            if (nodo.editable) {
                roundedRect.on("mouseenter", _ => this.enterNodo(nodo));
                roundedRect.on("mouseleave", _ => this.exitNodo(nodo));
                roundedRect.on("mouseup", _ => this.clickNodo(nodo))
            }
            
            this.konvaLayer.add(roundedRect);
            
            // Titulo
            let titulo = new Konva.Text({
                x: x - this.rectWidth / 2,
                width: this.rectWidth,
                y: y - this.rectHeight / 2,
                height: 30,
                fontSize: 12,
                fontFamily: 'Calibri',
                fill:textColor,
                padding: 10,
                align:"center",
                verticalAlign:"middle",
                text:nodo.clasificador.name,
                listenning:false
            })
            // Eventos
            if (nodo.editable) {
                titulo.on("mouseenter", _ => this.enterNodo(nodo));
                titulo.on("mouseleave", _ => this.exitNodo(nodo));
                titulo.on("mouseup", _ => this.clickNodo(nodo))
            }
            this.konvaLayer.add(titulo);
            // Separador
            let sep = new Konva.Line({
                points:[x - this.rectWidth / 2, y - this.rectHeight / 2 + 30, x + this.rectWidth / 2, y - this.rectHeight / 2 + 30],
                stroke:"black",
                strokeWidth:1.2,
                listenning:false
            })
            this.konvaLayer.add(sep);
            // Contenido
            if (nodo.filtro) {
                let contenido = new Konva.Text({
                    x: x - this.rectWidth / 2,
                    width: this.rectWidth,
                    y: y - this.rectHeight / 2 + 30,
                    height: this.rectHeight - 30,
                    fontSize: 11,
                    fontFamily: 'Calibri',
                    fill:textColor,
                    padding: 10,
                    align:"center",
                    verticalAlign:"middle",
                    text:nodo.descripcionFiltro.etiquetaValor,
                    listenning:false
                })
                // Eventos
                if (nodo.editable) {
                    contenido.on("mouseenter", _ => this.enterNodo(nodo));
                    contenido.on("mouseleave", _ => this.exitNodo(nodo));
                    contenido.on("mouseup", _ => this.clickNodo(nodo))
                }
                this.konvaLayer.add(contenido);
            }
            // Flecha
            let x0 = parentX * this.cellWidth + this.cellWidth / 2 + this.rectWidth / 2,
                y0 = parentY * this.cellHeight + this.rectHeight / 2,
                x1 = (parentX + 1) * this.cellWidth,
                y1 = y0,
                x2 = x1,
                y2 = nodo.y * this.cellHeight + this.rectHeight / 2,
                x3 = nodo.x * this.cellWidth + this.cellWidth / 2 - this.rectWidth / 2 - 4,
                y3 = y2;
            let arrow = new Konva.Arrow({
                points:[x0,y0, x1,y1, x2,y2, x3,y3],
                pointerLength:10,
                pointerWidth:8,
                fill:"white",
                stroke:"black",
                strokeWidth:2
            });
            this.konvaLayer.add(arrow);

            if (nodo.nodos) this.dibujaNodos(nodo.x, nodo.y, nodo.nodos);
        }
    }

    async clickNodo(nodo) {
        this.enterNodo(nodo);
        try {
            let rows = [];
            // Calcular filtros de valores de filas a partir de los fijos fijos
            let filtros = [];
            for (let f of this.consulta.fixedFilters) {
                if (f.ruta.startsWith(nodo.ruta)) {
                    let subruta = nodo.ruta.length?f.ruta.substr(nodo.ruta.length + 1):f.ruta;
                    filtros.push({ruta:subruta, valor:f.valor});
                }
            }
            let filtro = filtros.reduce((filtro, f) => {
                this.consulta.zRepoClient.construyeFiltro(filtro, f.ruta, f.valor);
                return filtro;
            }, {});
            //
            let dimCode = nodo.clasificador?nodo.clasificador.dimensionCode:null;
            if (!dimCode && this.esDimension) dimCode = this.consulta.variable.code;
            let n = await this.consulta.zRepoClient.cuentaValores(dimCode, null, filtro);
            let dimVal = await this.consulta.zRepoClient.getValores(dimCode, null, filtro, 0, (n > 50?50:n));
            rows.push({
                code:"sel-filas",
                icon:"fas fa-list",
                label:"Seleccionar [" + n + "]",
                items:dimVal.map(r => ({
                    tipo:"valor",
                    icon:"fas fa-bullseye",
                    code:r.code,
                    label:"[" + r.code + "] " + r.name
                }))
            });
            // Parametros
            if (this.paramsProvider) {
                let params = this.paramsProvider.getParams().filter(p => p.type == dimCode);
                if (params.length) {
                    rows.push({code:"sep", label:"-"});
                    for (let p of params) {
                        rows.push({
                            code:"${" + p.name + "}",
                            label:"${" + p.name + "}",
                            icon:"fas fa-user-tag",
                            tipo:"valor"
                        })
                    }
                }
            }
            if (n > 50) {
                rows[0].items.push({
                    tipo:"warng",
                    icon:"fas fa-exclamation-triangle",
                    code:"warn-more",
                    label:"Muchos valores. Use opción 'Buscar'"
                })
            }
            if (nodo.filtro) {
                rows.push({code:"sep", label:"sep"});
                rows.push({
                    code:"limpiar",
                    tipo:"limpiar",
                    icon:"fas fa-ban",
                    label:"Limpiar Filtro"
                });
            }
            if (this.zpop) this.zpop.close();            
            //let rect = this.stage.view.getBoundingClientRect();
            let rect = this.stageContainer.view.getBoundingClientRect();
            this.zpop = new ZPop(this.caret.view, rows, {
                //container:this.stage.view,
                constainer:this.stageContainer.view,
                vPos:"justify-top", 
                hPos:"right", 
                vMargin:-1, // - rect.y, 
                hMargin:-3, // - rect.x, 
                onClick:(codigo, item) => {
                    if (item.tipo == "valor") {
                        if (nodo.filtro) this.consulta.eliminaFiltro(nodo.filtro);
                        this.consulta.agregaFiltro(nodo.ruta, item.code);
                        this.releeYRefresca();
                    } else if (item.tipo == "limpiar") {
                        this.consulta.eliminaFiltro(nodo.filtro);
                        this.releeYRefresca();
                    }
                },
                searchPlaceholder:"Buscar",
                onSearch:async textFilter => {
                    let n = await this.consulta.zRepoClient.cuentaValores(dimCode, textFilter);
                    if (!n) return [{
                        tipo:"warng",
                        icon:"fas fa-exclamation-triangle",
                        code:"warn-none",
                        label:"No se encontraron resultados"
                    }];
                    let dimVal = await this.consulta.zRepoClient.getValores(dimCode, textFilter, null, 0, (n > 50?50:n));
                    let items = dimVal.map(r => ({
                        tipo:"valor",
                        icon:"fas fa-bullseye",
                        code:r.code,
                        label:"[" + r.code + "] " + r.name
                    }))
                    if (n > 50) {
                        items.push({
                            tipo:"warng",
                            icon:"fas fa-exclamation-triangle",
                            code:"warn-more",
                            label:"Muchos valores. Refine la búsqueda"
                        })
                    }
                    return items;
                }
            });
            this.zpop.show(rows);
        } catch(error) {
            console.error(error);
        }
    }

    releeYRefresca() {        
        this.consulta.construyeDescripcionFiltros()
        .then(async _ => {
            this.arbol = await this.consulta.getArbolFiltros();
            this.refresca();
        })
    }

    enterNodo(nodo) {
        this.stage.view.style.setProperty("cursor", "pointer")
        let x = nodo.x * this.cellWidth + this.cellWidth / 2 + this.rectWidth / 2;
        let y = nodo.y * this.cellHeight + this.cellHeight / 2 - this.rectHeight / 2;
        this.caret.pos = {left:x, top:y}
        this.caret.show();
    }
    exitNodo() {
        this.caret.hide();
        this.stage.view.style.removeProperty("cursor");
    }

    onCmdOk_click() {
        this.close(this.consulta);
    }

    onCmdCancel_click() {this.cancel()}
    onCmdCloseWindow_click() {this.cancel()}
}
ZVC.export(WFiltrosMinZ);
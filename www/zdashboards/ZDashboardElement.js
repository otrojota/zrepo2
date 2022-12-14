class ZDashboardElement extends ZCustomController {
    get code() {throw "get code() no se sobreescribiÃ³"}

    get chartContainerId() {return "chartContainer-" + this.zId}
    get chartContainer() {return this.find("#" + this.chartContainerId)}
    get tableContainerId() {return "tableContainer-" + this.zId}
    get tableContainer() {return this.find("#" + this.tableContainerId)}
    get titleDivId() {return "chartTitle-" + this.zId}
    get titleDiv() {return this.find("#" + this.titleDivId)}
    get root() {
        if (this._root) return this._root;
        this._root = am5.Root.new(this.chartContainerId);
        this._root.locale = am5locales_es_ES;
        this.doResize();
        return this._root;
    }
    get dependsOnTime() {return true}

    onThis_init(options) {
        if (options) this.setOptions(options);
        this.overlay = null;
        if (options && options.titulo && this.titleDiv) {
            this.titleDiv.innerText = options.titulo;
        }
    }

    setDashboard(dsb) {this.dashboard = dsb}

    onThis_deactivated() {
        if (this.chart) {
            this.chart.dispose();
            this.chart = null;
        }
    }
    doResize() {
        let chartContainer = this.chartContainer;
        let titleDiv = this.titleDiv;
        let tableContainer = this.tableContainer;

        if (titleDiv) {
            if (!this.options || !this.options.titulo) {
                titleDiv.style.display = "none";
                titleDiv.style.height = "0";
            }
        }
        let r = this.view.getBoundingClientRect();
        let h = r.bottom - r.top;

        if (chartContainer) {
            let top = parseInt(chartContainer.getBoundingClientRect().top) - r.top;
            chartContainer.style.height = (h - top - 10) + "px";
            if (this._root) this._root.resize();
        }
        if (tableContainer) {
            let top = parseInt(tableContainer.getBoundingClientRect().top) - r.top;
            tableContainer.style.height = (h - top) + "px";
        }
    }
    setQuery(q) {
        this.q = MinZQuery.cloneQuery(q);
    }
    setOptions(opts) {
        this.options = opts;
    }

    async initElement() {}
    async refresh(start, end, operation = "refresh") {
        throw "No se sobreescribiÃ³ refresh()"
    }
    declareParams() {return []}    
    dependsOn() {
        return (this.options.filters || []).filter(f => f.valor.startsWith("${")).map(f => f.valor.substr(2, f.valor.length - 3));
    }
    setParam(name, value) {this.dashboard.setParam(name, value)}

    prepareFilters() {
        // reemplazar parÃ¡metros por su valor y retornar
        let ret = [];
        for (let f of (this.options.filters || [])) {
            if (f.valor.startsWith("${")) {
                let paramName = f.valor.substr(2, f.valor.length - 3);
                let v = this.dashboard.getParam(paramName);
                if (v === undefined) throw "ParÃ¡metro '" + paramName + "' sin valor";
                if (v instanceof MinZQuery) {
                    // DimensionFilter
                    for (let f2 of v.filters.concat(v.fixedFilters)) {
                        if (f2.ruta == "") {
                            ret.push({ruta:f.ruta, valor:f2.valor});
                        } else {
                            ret.push({ruta:f.ruta + "." + f2.ruta, valor:f2.valor});
                        }
                    }
                } else {
                    // Tipo bÃ¡sico
                    ret.push({ruta:f.ruta, valor:v});
                }
            } else {
                ret.push({ruta:f.ruta, valor:f.valor});
            }
        }
        return ret;
    }

    get preferedHeight() {return (this.options && this.options.height)?this.options.height:20;}
    dispose() {
        if (this._root) {
            this._root.dispose();
            this._root = null;
        }
    }

    showError(msg) {
        if (!this.overlay) {
            this.overlay = document.createElement("DIV");
            this.overlay.classList.add("zdashboard-cell-overlay");
            this.view.append(this.overlay);
        }
        this.overlay.innerText = msg;
    }
    clearError() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
    
}
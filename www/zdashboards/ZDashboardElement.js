class ZDashboardElement extends ZCustomController {
    get code() { throw "get code() no se sobreescribió" }

    get chartContainerId() { return "chartContainer-" + this.zId }
    get chartContainer() { return this.find("#" + this.chartContainerId) }
    get tableContainerId() { return "tableContainer-" + this.zId }
    get tableContainer() { return this.find("#" + this.tableContainerId) }
    get titleDivId() { return "chartTitle-" + this.zId }
    get titleDiv() { return this.find("#" + this.titleDivId) }
    get exportable() { return false }
    get root() {
        if (this._root) return this._root;
        this._root = am5.Root.new(this.chartContainerId);
        this._root.locale = am5locales_es_ES;
        this.doResize();
        return this._root;
    }
    get dependsOnTime() { return true }

    onThis_init(options) {
        this.options = {};
        if (options) this.setOptions(options);
        this.overlay = null;
        if (options && options.titulo && this.titleDiv) {
            this.titleDiv.innerText = options.titulo;
        }
    }

    setDashboard(dsb) { this.dashboard = dsb }

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
        if (this.options.usaVariable2) {
            this.q2 = MinZQuery.cloneQuery(q);
            this.q2.filters = this.options.filters2 || [];
            let v = window.zRepoClient.variables.find(v => v.code == this.options.variable2);
            this.q2.variable = v;
            this.q2.accum = this.options.acumulador2;
        } else {
            this.q2 = null;
        }
    }
    
    setOptions(opts) {
        this.options = opts;
    }

    async initElement() { }
    async refresh(start, end, operation = "refresh") {
        throw "No se sobreescribió refresh()"
    }
    declareParams() { return [] }
    dependsOn() {
        let f1 = (this.options.filters || []).filter(f => f.valor.startsWith("${")).map(f => f.valor.substr(2, f.valor.length - 3));
        let f2 = (this.options.filters2 || []).filter(f => f.valor.startsWith("${")).map(f => f.valor.substr(2, f.valor.length - 3));
        return f1.concat(f2);
    }
    setParam(name, value) { this.dashboard.setParam(name, value) }

    prepareFilters(filters) {
        filters = filters || this.options.filters;
        // reemplazar parámetros por su valor y retornar
        let ret = [];
        for (let f of (filters || [])) {
            if (f.valor.startsWith("${")) {
                let paramName = f.valor.substr(2, f.valor.length - 3);
                let v = this.dashboard.getParam(paramName);
                if (v === undefined) throw "Parámetro '" + paramName + "' sin valor";
                if (v instanceof MinZQuery) {
                    // DimensionFilter
                    for (let f2 of v.filters.concat(v.fixedFilters)) {
                        if (f2.ruta == "") {
                            ret.push({ ruta: f.ruta, valor: f2.valor });
                        } else {
                            ret.push({ ruta: f.ruta + "." + f2.ruta, valor: f2.valor });
                        }
                    }
                } else {
                    // Tipo básico
                    ret.push({ ruta: f.ruta, valor: v });
                }
            } else {
                ret.push({ ruta: f.ruta, valor: f.valor });
            }
        }
        return ret;
    }

    get preferedHeight() { return (this.options && this.options.height) ? this.options.height : 20; }
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

    static registerComponent(type, name, elementPath, propsPath, factories, icon) {
        if (!ZDashboardElement._components) ZDashboardElement._components = [];
        if (ZDashboardElement.currentPlugin) {            
            name = "[" + ZDashboardElement.currentPlugin + "] " + name;
            elementPath = "proxy/" + ZDashboardElement.currentPlugin + "/" + elementPath;
            propsPath = "proxy/" + ZDashboardElement.currentPlugin + "/" + propsPath;
        }
        let idx = ZDashboardElement._components.findIndex(c => c.code == type);
        if (idx >= 0) throw "Componente " + type + " repetido!";
        ZDashboardElement._components.push({ type, name, elementPath, propsPath, factories, icon });
    }
    static getComponent(type) {
        if (!ZDashboardElement._components) ZDashboardElement._components = [];
        return ZDashboardElement._components.find(c => c.type == type);
    }
    static getCoomponentsList() {
        let list = ZDashboardElement._components.map(c => (c)).sort((c1, c2) => (c1.name > c2.name ? 1 : -1));
        return list;
    }
    static async loadExternalComponents() {                
        if (ZDashboardElement.externalComponentsLoaded) return;
        let plugins = await zPost("getPlugins.zrepo");
        let codigos = Object.keys(plugins);
        for (let codigo of codigos) {
            if (plugins[codigo].registerDashboardElements) {
                console.log("Plugin " + codigo + " will register dashboard components");
                ZDashboardElement.currentPlugin = codigo;
                try {
                    let path = `proxy/${codigo}/init-components.js`
                    let response = await fetch(path);
                    let text = await response.text();
                    if (response.status != 200) {                    
                        throw "[" + response.status + ": " + response.statusText + "] " + text;
                    }
                    eval(text);
                } catch(error) {
                    console.error(error);
                }
                ZDashboardElement.currentPlugin = null;
            } else {
                console.log("Plugin " + codigo + " does not declare dashboard components");
            }
        }
        ZDashboardElement.externalComponentsLoaded = true;
        console.log("Externals dashboard components loaded");
    }

    static loadCSSFile(path) {
        let link = document.createElement("link");
        link.rel  = 'stylesheet';
        link.type = 'text/css';
        link.href = "proxy/" + ZDashboardElement.currentPlugin + "/" + path;
        link.media = 'all';
        document.head.appendChild(link);
    }
}

// Registrar componentes base de ZDashboards
ZDashboardElement.registerComponent("dimFilter", "Filtro Dimensión", "zdashboards/DimensionFilter", null, {
    init: c => {
        c.dimension = null;
        c.paramName = "nombreDimension";
        c.emptyText = "Filtrar por XX";
        c.nonEmptyPrefix = "Elementos tales que";
    }
}, "fas fa-filter");
ZDashboardElement.registerComponent("dimRowSelector", "Selector Fila Dimensión", "zdashboards/DimRowSelector", null, {
    init: c => {
        c.height = 50;
        c.dimension = null;
        c.paramName = "nombreDimension";
        c.emptyText = "Filtrar por XX";
        c.nonEmptyPrefix = "XX igual a";
    }
}, "fa-solid fa-filter-circle-xmark");
ZDashboardElement.registerComponent("timeSerie", "Serie de Tiempo", "zdashboards/TimeSerie", "zdashboards/chartProps/WTimeSerie", {
    init: c => {
        c.height = 300;
        c.serieType = "line";
        c.zoomTiempo = true;
        c.acumulador = "value";
        c.useQuery = true;
        c.useTemporality = true;
    }
}, "fas fa-chart-line");
ZDashboardElement.registerComponent("pie", "Gráfico de Torta", "zdashboards/Pie", "zdashboards/chartProps/WPie", {
    init: c => {
        c.height = 300;
        c.acumulador = "value";
        c.useQuery = true;
        c.useTemporality = false;
    }
}, "fas fa-chart-pie");
ZDashboardElement.registerComponent("dimSerie", "Barras po Dimensiones", "zdashboards/DimSerie", "zdashboards/chartProps/WDimSerie", {
    init: c => {
        c.height = 300;
        c.acumulador = "value";
        c.useQuery = true;
        c.useTemporality = false;
    }
}, "fas fa-chart-simple");
ZDashboardElement.registerComponent("dimTable", "Tabla de Dimensiones", "zdashboards/DimTable", "zdashboards/chartProps/WDimTable", {
    init: c => {
        c.height = 300;
        c.acumulador = "value";
        c.useQuery = true;
        c.useTemporality = false;
    }
}, "fas fa-table-list");
ZDashboardElement.registerComponent("heatMap", "Heatmap", "zdashboards/HeatMap", "zdashboards/chartProps/WHeatMap", {
    init: c => {
        c.height = 300;
        c.acumulador = "value";
        c.indiceColor = 1;
        c.useQuery = true;
        c.useTemporality = false;
    }
}, "fas fa-table-cells");
ZDashboardElement.registerComponent("dim-dim-table", "Tabla Dimensión-Dimensión", "zdashboards/DimDimTable", "zdashboards/chartProps/WDimDimTable", {
    init: c => {
        c.height = 300;
        c.acumulador = "value";
        c.useQuery = true;
        c.useTemporality = false;
    }
}, "fas fa-table-cells");
ZDashboardElement.registerComponent("time-dim-table", "Tabla Tiempo-Dimensión", "zdashboards/TimeDimTable", "zdashboards/chartProps/WTimeDimTable", {
    init: c => {
        c.height = 300;
        c.acumulador = "value";
        c.useQuery = true;
        c.useTemporality = true;
        c.timeFormat = "DD/MM HH:mm";
    }
}, "fas fa-table-cells");
ZDashboardElement.registerComponent("multi-dim-table", "Tabla Múltiple Dimensiones", "zdashboards/MultiDimTable", "zdashboards/chartProps/WMultiDimTable", {
    init: c => {
        c.height = 300;
        c.acumulador = "value";
        c.useQuery = true;
        c.useTemporality = false;
    }
}, "fas fa-table-cells");
ZDashboardElement.registerComponent("gauge", "Gauge", "zdashboards/Gauge", "zdashboards/chartProps/WGauge", {
    init: c => {
        c.height = 200;
        c.acumulador = "value";
        c.min = 0; c.max = 100000; c.firstColor = "#0f9747"; c.firstLabel = "Bajo";
        c.ranges = [{
            value: 50000, color: "#ee1f25",
            label: "Alto"
        }];
        c.useQuery = true;
        c.useTemporality = false;
    }
}, "fas fa-gauge-high");
ZDashboardElement.registerComponent("timeDim", "Serie Tiempo Dimensión", "zdashboards/TimeDim", "zdashboards/chartProps/WTimeDim", {
    init: c => {
        c.height = 300;
        c.serieType = "bars";
        c.zoomTiempo = true;
        c.acumulador = "value";
        c.useQuery = true;
        c.useTemporality = true;
    }
}, "fas fa-timeline");
ZDashboardElement.registerComponent("forceDirectedTree", "Árbol Direccional Dirigido", "zdashboards/ForceDirectedTree", "zdashboards/chartProps/WForceDirectedTree", {
    init: c => {
        c.height = 300;
        c.acumulador = "value";
        c.useQuery = true;
        useTemporality = false;
    }
}, "fas fa-diagram-project");
ZDashboardElement.registerComponent("resume-table", "Tabla Resumen Período", "zdashboards/ResumeTable", "zdashboards/chartProps/WResumeTable", {
    init: c => {
        c.height = 300;
        c.useQuery = true;
        c.useTemporality = false;
        c.showN = "Nª Muestras";
        c.showSum = "Suma";
        c.showAvg = "Promedio";
        c.showMin = "";
        c.showMax = "";
    }
}, "fas fa-table-cells");
ZDashboardElement.registerComponent("labels", "Labels", "zdashboards/Labels", "zdashboards/chartProps/WLabels", {
    init: c => {
        c.height = 200;
        c.acumulador = "value";
        c.layout = { c: { text: "Valor: ${value}" } };
        c.useQuery = true;
        c.useTemporality = false;
    }
}, "fas fa-tag");
ZDashboardElement.registerComponent("multi-col-table", "Tabla Múltiple Columnas", "zdashboards/MultiColTable", "zdashboards/chartProps/WMultiColTable", {
    init: c => {
        c.height = 300;
        c.useQuery = false;
        c.useTemporality = false;
        c.useDataSet = true;
    }
}, "fas fa-table-cells");
ZDashboardElement.registerComponent("filterText", "Filtro Selector", "zdashboards/FilterRowSelector", null, {
    init: c => {
        c.height = 50;
        c.useQuery = false;
        c.paramName = "nombre del filtro";
        c.emptyText = "Filtrar por XX";
        c.nonEmptyPrefix = "XX igual a";
    }
}, "fa-solid fa-regular fa-rectangle-list");

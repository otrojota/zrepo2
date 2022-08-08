class ForceDirectedTree extends ZDashboardElement {
    get code() {return "force-directed-tree"}
    async refresh(start, end, operation = "refresh") {
        try {
            if (operation == "refresh") this.drillStack = [];
            this.start = start;
            this.end = end;

            this.dispose();

            if (!this.q || !this.options.topDim || !this.options.bottomDim) throw "No ha configurado variable";            
            if (operation == "refresh") {                
                this.q.filters = this.prepareFilters();
            } // else viene en la query de los drills down/up
            let {promise, controller} = await this.q.query({
                format:"dim-tree", startTime:start.valueOf(), endTime:end.valueOf(),
                topDim:this.options.topDim, bottomDim: this.options.bottomDim
            });
            let data = await promise;
            // Agregar nivel raiz
            data = {resultado:0, children:data};

            this.root.setThemes([am5themes_Animated.new(this.root), am5themes_Dark.new(this.root)]);
            let chart = this.root.container.children.push(am5.Container.new(this.root, {
                width: am5.percent(100), height: am5.percent(100), layout: this.root.verticalLayout
            }));

            // Create series
            let series = chart.children.push(am5hierarchy.ForceDirected.new(this.root, {
                singleBranchOnly: false,
                downDepth: 2,
                topDepth: 1,
                initialDepth: 0,
                valueField: "resultado",
                categoryField: "name",
                childDataField: "children",
                idField: "name",
                linkWithField: "linkWith",
                manyBodyStrength: -10,
                centerStrength: 0.8
            }));
  
            series.get("colors").setAll({step: 2});
            series.links.template.set("strength", 0.5);
            series.data.setAll([data]);
            series.set("selectedDataItem", series.dataItems[0]);
  
            series.appear(1000, 100);

            this.chart = chart;

        } catch(error) {
            console.error(error);
            this.showError(error.toString());
        }
    }

    doResize() {
        super.doResize();
    }
}
ZVC.export(ForceDirectedTree);
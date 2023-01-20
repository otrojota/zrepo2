class Gauge extends ZDashboardElement {
    get code() {return "gauge"}
    async refresh(start, end) {
        try {
            this.dispose();
            if (!this.q) throw "No Configurado";
            this.q.filters = this.prepareFilters();
            let {promise, controller} = await this.q.query({
                format:"period-summary", startTime:start.valueOf(), endTime:end.valueOf()
            });
            let data = await promise;

            //let scale = this.options.scale;

            this.root.setThemes([am5themes_Animated.new(this.root), am5themes_Dark.new(this.root)]);
            let chart = this.root.container.children.push(am5radar.RadarChart.new(this.root, {
                panX: false, panY: false, startAngle: 160,endAngle: 380
            }));
            let axisRenderer = am5radar.AxisRendererCircular.new(this.root, {innerRadius: -40});
            axisRenderer.grid.template.setAll({
                stroke: this.root.interfaceColors.get("background"),
                visible: true,
                strokeOpacity: 0.8
            });

            let xAxis = chart.xAxes.push(am5xy.ValueAxis.new(this.root, {
                maxDeviation: 0,
                min: this.options.min,
                max: this.options.max,
                strictMinMax: true,
                renderer: axisRenderer
            }));

            let axisDataItem = xAxis.makeDataItem({});
            let clockHand = am5radar.ClockHand.new(this.root, {pinRadius: am5.percent(10), radius: am5.percent(90), bottomWidth: 20})
            let bullet = axisDataItem.set("bullet", am5xy.AxisBullet.new(this.root, {sprite: clockHand}));
            xAxis.createAxisRange(axisDataItem);

            let label = chart.radarContainer.children.push(am5.Label.new(this.root, {
                fill: am5.color(0xffffff),
                centerX: am5.percent(50),
                textAlign: "center",
                centerY: -20,
                fontSize: "1em"
            }));

            axisDataItem.set("value", this.options.min);
            bullet.get("sprite").on("rotation", _ => {
                let value = axisDataItem.get("value");
                let fill = am5.color(0x000000);
                xAxis.axisRanges.each(axisRange => {
                    if (value >= axisRange.get("value") && value <= axisRange.get("endValue")) {
                        fill = axisRange.get("axisFill").get("fill");
                    }
                })
                let nDec = this.q.variable.options?this.q.variable.options.decimals:2;
                if (isNaN(nDec)) nDec = 2;

                if (value !== undefined) {
                    label.set("text", value.toFixed(nDec).toLocaleString("es-cl"));
                } else {
                    label.set("text", "--");
                }

                clockHand.pin.animate({ key: "fill", to: fill, duration: 500, easing: am5.ease.out(am5.ease.cubic) })
                clockHand.hand.animate({ key: "fill", to: fill, duration: 500, easing: am5.ease.out(am5.ease.cubic) })
            });
            chart.bulletsContainer.set("mask", undefined);

            let ranges = [{fromValue:this.options.min, color:this.options.firstColor, label:this.options.firstLabel}];
            for (let r of this.options.ranges) {
                let r2 = ranges[ranges.length - 1];
                r2.toValue = r.value;
                ranges.push({fromValue:r.value, color:r.color, label:r.label});
            }
            ranges[ranges.length - 1].toValue = this.options.max;
            
            for (let r of ranges) {
                var axisRange = xAxis.createAxisRange(xAxis.makeDataItem({}));
                axisRange.setAll({value: r.fromValue, endValue: r.toValue});
                axisRange.get("axisFill").setAll({visible: true, fill: am5.color(r.color), fillOpacity: 0.8});                
                axisRange.get("label").setAll({text: r.label, inside: true, radius: 15, fontSize: "0.9em", fill: this.root.interfaceColors.get("background")}); // * scale                
            }            

            axisDataItem.animate({
                key: "value",
                to: data,
                duration: 500,
                easing: am5.ease.out(am5.ease.cubic)
            });

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
ZVC.export(Gauge);
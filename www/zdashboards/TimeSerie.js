class TimeSerie extends ZDashboardElement {
    get code() {return "time-serie"}    
    getBaseTemporality() {
        if (this.q.temporality == "5m") return {baseInterval:{"timeUnit": "minute","count": 5}, tooltipDateFormat:"dd/MMM/yyyy HH:mm"}
        else if (this.q.temporality == "15m") return {baseInterval:{"timeUnit": "minute","count": 15}, tooltipDateFormat: "dd/MMM/yyyy HH:mm"}
        else if (this.q.temporality == "30m") return {baseInterval:{"timeUnit": "minute","count": 30}, tooltipDateFormat: "dd/MMM/yyyy HH:mm"}
        else if (this.q.temporality == "1h") return {baseInterval: {"timeUnit": "hour","count": 1}, tooltipDateFormat:"dd/MMM/yyyy HH:mm"}
        else if (this.q.temporality == "1d") return {baseInterval: {"timeUnit": "day","count": 1}, tooltipDateFormat: "dd/MMM/yyyy"}
        else if (this.q.temporality == "1M") return {baseInterval: {"timeUnit": "month","count": 1}, tooltipDateFormat: "MMM/yyyy"} 
        else if (this.q.temporality == "3M") return {baseInterval: {"timeUnit": "month","count": 3}, tooltipDateFormat:"MMM/yyyy"}
        else if (this.q.temporality == "4M") return {baseInterval: {"timeUnit": "month","count": 4}, tooltipDateFormat:"MMM/yyyy"}        
        else if (this.q.temporality == "6M") return {baseInterval: {"timeUnit": "month","count": 12}, tooltipDateFormat:"MMM/yyyy"}
        else if (this.q.temporality == "1y") return {baseInterval: {"timeUnit": "year","count": 1}, tooltipDateFormat:"yyyy"}
    }

    async initElement() {
        if (!this.options.variable) {
            this.showError("No se ha configurado la variable");
        }
    }

    async refresh(start, end, operation = "refresh") {
        try {
            //console.log("Time Serie Refresh", this);
            this.clearError();
            if (!this.q) throw "Elemento No Configurado";
            this.q.filters = this.prepareFilters();

            if (operation == "refresh") this.drillStack = [];
            this.start = start;
            this.end = end;

            this.dispose();
            if (!this.q) return;

            // Niveles temporalidad para drillDown
            let nivelTemporalidadQuery = nivelesTemporalidad.indexOf(this.q.temporality);
            let nivelTemporalidadVariable = nivelesTemporalidad.indexOf(this.q.variable.temporality);

            let {promise, controller} = await this.q.query({
                format:"time-serie", startTime:start.valueOf(), endTime:end.valueOf()
            })
            let data = await promise;
            data = data.map(d => {
                let row = {time:d.time}
                row.value = d.resultado;
                return row;
            })
            if (this.q2) {                
                this.q2.filters = this.prepareFilters(this.options.filters2);
                let {promise, controller} = await this.q2.query({
                    format:"time-serie", startTime:start.valueOf(), endTime:end.valueOf()
                })
                let data2 = await promise;
                data2 = data2.map(d => {
                    let row = {time:d.time}
                    row.value = d.resultado;
                    return row;
                });
                let idx1 = 0, idx2 = 0, newData = [];
                while (idx1 < data.length || idx2 < data2.length) {
                    let row1 = idx1 < data.length?data[idx1]:null;
                    let row2 = idx2 < data2.length?data2[idx2]:null;
                    if (row1 && row2) {
                        if (row1.time == row2.time) {
                            newData.push({time: row1.time, value: row1.value, value2: row2.value});
                            idx1++; idx2++;
                        } else if (row1.time < row2.time) {
                            newData.push({time: row1.time, value: row1.value})
                            idx1++;
                        } else {
                            newData.push({time: row2.time, value2: row2.value})
                            idx2++;
                        }
                    } else if (row1) {
                        newData.push({time: row1.time, value: row1.value})
                        idx1++;
                    } else {
                        newData.push({time: row2.time, value2: row2.value})
                        idx2++;
                    }
                }
                data = newData;
            }
            this.root.setThemes([am5themes_Animated.new(this.root), am5themes_Dark.new(this.root)])
            let chart = this.root.container.children.push(am5xy.XYChart.new(this.root, {panX: true, panY: true, wheelX: "panX", wheelY: "zoomX", layout: this.root.verticalLayout}));
            chart.set("cursor", am5xy.XYCursor.new(this.root, {behavior: "none"}));        

            let legend;
            if (this.options.leyendas && this.options.leyendas == "bottom") {
                legend = chart.children.push(am5.Legend.new(this.root, {centerX: am5.p50,x: am5.p50}));
            }
            
            let baseTemporality = this.getBaseTemporality();
            this.root.dateFormatter.set("dateFormat", baseTemporality.tooltipDateFormat);
            let dateAxis = chart.xAxes.push(am5xy.DateAxis.new(this.root, {
                baseInterval: baseTemporality.baseInterval,
                renderer: am5xy.AxisRendererX.new(this.root, {}),
                tooltip: am5.Tooltip.new(this.root, {})
            }));
            let valueAxis = chart.yAxes.push(am5xy.ValueAxis.new(this.root, {
                renderer: am5xy.AxisRendererY.new(this.root, {})
            }));
            let unit;
            if (this.q.accum == "n") unit = "N°";
            else unit = this.q.variable.options?this.q.variable.options.unit:"S/U";            
            valueAxis.children.moveValue(am5.Label.new(this.root, { text: unit, rotation: -90, y: am5.p50, centerX: am5.p50 }), 0);

            if (this.options.nombreSerie) this.q.serieName = this.options.nombreSerie;
            let series = this.creaSerie(
                chart,
                this.q, this.options.serieType, dateAxis, valueAxis, "value", unit, nivelTemporalidadQuery, nivelTemporalidadVariable
            );
            series.data.setAll(data);
            if (legend) legend.data.push(series);

            let series2, valueAxis2, unit2;
            if (this.q2) {
                if (this.options.nombreSerie2) this.q2.serieName = this.options.nombreSerie2;
                if (this.q2.accum == "n") unit2 = "N°";
                else unit2 = this.q2.variable.options?this.q2.variable.options.unit:"S/U";
                if (unit == unit2) {
                    valueAxis2 = valueAxis;
                } else {
                    valueAxis2 = chart.yAxes.push(am5xy.ValueAxis.new(this.root, {
                        renderer: am5xy.AxisRendererY.new(this.root, {opposite:true})
                    }));
                    valueAxis2.children.moveValue(am5.Label.new(this.root, { text: unit2, rotation: -90, y: am5.p50, centerX: am5.p50 }), 0);
                }
                series2 = this.creaSerie(
                    chart,
                    this.q2, this.options.serieType2, dateAxis, valueAxis2, "value2", unit2, nivelTemporalidadQuery, nivelTemporalidadVariable
                );
                series2.data.setAll(data);
                if (legend) legend.data.push(series2);
            }

            if (this.options.zoomTiempo) {
                chart.set("scrollbarX", am5.Scrollbar.new(this.root, {orientation: "horizontal"}));
            }

            dateAxis.start = 0.0;
            dateAxis.keepSelection = true;

            if (this.drillStack.length) {
                let button = chart.plotContainer.children.push(am5.Button.new(this.root, {
                    dx:10, dy:10, 
                    label: am5.Label.new(this.root, {text: "< Volver"})
                }))
                button.events.on("click", _ => {
                    setTimeout(_ => this.drillUp(), 50);
                });
            }

            this.chart = chart;
        } catch(error) {
            console.error(error);
            this.showError(error.toString());
        }
    }

    creaSerie(chart, q, serieType, dateAxis, valueAxis, valueYField, unit, nivelTemporalidadQuery, nivelTemporalidadVariable) {
        let series, serieName = q.serieName?q.serieName:q.variable.name;
        switch (serieType) {
            case "line":
            case "area":
            case "smoothed-line":
            case "smoothed-area":
                if (serieType.startsWith("smoothed-")) {
                    series = chart.series.push(am5xy.SmoothedXLineSeries.new(this.root, {
                        name:serieName, xAxis: dateAxis, yAxis: valueAxis,
                        valueYField: valueYField, valueXField: "time",
                        tooltip: am5.Tooltip.new(this.root, {
                            labelText: "[bold]{name}[/]\n{valueX.formatDate()}: {valueY} [[" + unit + "]]"
                        })
                    }));
                } else {
                    series = chart.series.push(am5xy.LineSeries.new(this.root, {
                        name:serieName, xAxis: dateAxis, yAxis: valueAxis,
                        valueYField: valueYField, valueXField: "time",
                        tooltip: am5.Tooltip.new(this.root, {
                            labelText: "[bold]{name}[/]\n{valueX.formatDate()}: {valueY} [[" + unit + "]]"
                        })
                    }));
                }
                if (serieType == "area" || serieType == "smoothed-area") {
                    series.fills.template.setAll({fillOpacity: 0.2, visible: true});                  
                    series.strokes.template.setAll({strokeWidth: 2});
                }
                series.bullets.push(_ => {
                    let sprite = am5.Rectangle.new(this.root, {
                        width:12, height:12, 
                        centerX: am5.p50, centerY: am5.p50,
                        fill: series.get("fill")
                    });
                    if (nivelTemporalidadQuery > nivelTemporalidadVariable) {
                        sprite.set("cursorOverStyle", "crosshair");
                        sprite.events.on("click", e => {
                            setTimeout(_ => this.drilldownTime(e.target.dataItem.dataContext.time), 50);
                        })
                    }
                    let b = am5.Bullet.new(this.root, {
                        sprite
                    });
                    return b;
                }); 
                break;
            case "columns":
            case "curved-columns":
            case "rounded-columns":
                series = chart.series.push(am5xy.ColumnSeries.new(this.root, {
                    name:serieName, xAxis: dateAxis, yAxis: valueAxis,
                    valueYField: valueYField, valueXField: "time",
                    sequencedInterpolation: true,
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: "[bold]{name}[/]\n{valueX.formatDate()}: {valueY} [[" + unit + "]]"
                    })
                }));
                let template = series.columns.template;       
                if (serieType == "curved-columns") {
                    template.setAll({width: am5.percent(120), fillOpacity: 0.9, strokeOpacity: 0});
                    template.adapters.add("fill", (fill, target) => {return chart.get("colors").getIndex(series.columns.indexOf(target));});
                    template.adapters.add("stroke", (stroke, target) => {return chart.get("colors").getIndex(series.columns.indexOf(target));});
                    template.set("draw", (display, target) => {
                        var w = target.getPrivate("width", 0);
                        var h = target.getPrivate("height", 0);
                        display.moveTo(0, h);
                        display.bezierCurveTo(w / 4, h, w / 4, 0, w / 2, 0);
                        display.bezierCurveTo(w - w / 4, 0, w - w / 4, h, w, h);
                    });
                } else if (serieType == "rounded-columns") {
                    template.setAll({
                        cornerRadiusTL: 15,
                        cornerRadiusTR: 15,
                        width: am5.percent(70),
                        strokeOpacity: 1
                    });
                }         
                if (nivelTemporalidadQuery > nivelTemporalidadVariable) {
                    template.set("cursorOverStyle", "crosshair");
                    //template.cursorOverStyle = "crosshair";
                    template.events.on("click", e => {
                        setTimeout(_ => this.drilldownTime(e.target.dataItem.dataContext.time), 50);
                    })
                }
                break;
        }
        return series;
    }

    drilldownTime(date) {
        let d = moment.tz(date, window.timeZone);
        let q2 = MinZQuery.cloneQuery(this.q);
        this.drillStack.push({query:this.q, start:this.start, end:this.end});
        let newTemp, start, end;
        switch (this.q.temporality) {
            case "1y": 
                newTemp = "1M";
                start = d.clone();
                end = d.clone().add(1, "year");
                break;
            case "6M":
                newTemp = "1M";
                start = d.clone();
                end = d.clone().add(6, "months");
                break;
            case "4M":
                newTemp = "1M";
                start = d.clone();
                end = d.clone().add(4, "months");
                break;
            case "3M":
                newTemp = "1M";
                start = d.clone();
                end = d.clone().add(3, "months");
                break;
            case "1M":
                newTemp = "1d";
                start = d.clone();
                end = d.clone().add(1, "month");
                break;
            case "1d":
                newTemp = "1h";
                start = d.clone();
                end = d.clone().add(1, "day");
                break;
            case "12h":
                newTemp = "1h";
                start = d.clone();
                end = d.clone().add(12, "hours");
                break;
            case "6h":
                newTemp = "1h";
                start = d.clone();
                end = d.clone().add(6, "hours");
                break;
            case "1h":
                newTemp = this.q.variable.temporality;
                start = d.clone();
                end = d.clone().add(1, "hours");
                break;
            case "30m":
                newTemp = this.q.variable.temporality;
                start = d.clone();
                end = d.clone().add(30, "minutes");
                break;
            case "15m":
                newTemp = this.q.variable.temporality;
                start = d.clone();
                end = d.clone().add(15, "minutes");
                break;
        }
        q2.temporality = newTemp;
        this.setQuery(q2);
        this.refresh(start, end, "push");
    }

    drillUp() {
        let e = this.drillStack[this.drillStack.length - 1];
        this.drillStack.splice(this.drillStack.length - 1, 1);
        this.setQuery(e.query);
        this.refresh(e.start, e.end, "pop");
    }

    doResize() {
        super.doResize();
    }
}
ZVC.export(TimeSerie);
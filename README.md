Knockout Bar Chart
========

A simple bar chart engine for knockout.js

Usage
=======

### Add a Y axis:

``` html
<div class="yAxisView" data-bind="foreach: c().visibleYAxisValues()">
    <span data-bind="text: Math.round(value)" class="yAxisDotter">
    </span>
</div>
```

### Add the bar chart:

``` html
<div class="graph">

    <div class="chartified chartVert" data-bind="foreach: b()">
        <div data-bind="style: { width : xAxisValueAsPercent() + '%' }, attr: { 'data-value' : yAxisValue, class: isActive() ? 'bar activeBar' : 'bar' }">
            <div class="barColour niceColour" data-bind="style: { height: yAxisValueAsPercent().toString() + '%' }"></div>
        </div>
    </div>
</div>
```

### Add an X axis:

``` html
<div class="xAxisView" data-bind="foreach:c().visibleXAxisValues()">
    <span data-bind="text: bar.xAxisValue.split(':')[0], css: cssClass"></span>
</div>
```

### Wire it up

``` javascript
// This example uses a dayChartAxisProvider which is a function returning an array of hours 
// ["00:00", "00:30", 01:00",...]

var chart = new cf.Chart(cf.ChartAxisProviders.dayChartAxisProvider);

var viewModel = {
  c: ko.observable(chart),
  b: ko.observableArray(chart.trimBars()),
  max: chart.metadata.maxValue()
};

ko.applyBindings(viewModel);

```

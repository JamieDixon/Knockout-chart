/*jslint devel: true */
/*jslint browser: true, nomen: true */
/*global jQuery, ko */

(function ($, ko, koChart) {
    "use strict";
    koChart = koChart || {};
    // chartAxisProvider is a function that returns an array of x axis values to be used in the chart.
    koChart.Chart = function (chartAxisProvider, chartSettings) {

        if (chartAxisProvider === undefined) {
            throw "You must specify a chart axis provider like: new koChart.Chart(koChart.ChartAxisProviders.dayChartAxisProvider). A chart axis provider is essentially a function that returns an array of x axis values";
        }

        var self = this;

        self.xAxisValues = [];
        self.bars = [];

        self.metadata = {
            maxValue: ko.observable(),
            minValue: ko.observable(),
            activeBars: ko.observable()
        };

        self.visibleXAxisValues = ko.observableArray();
        self.visibleYAxisValues = ko.observableArray();

        function log10(val) {
            return Math.log(val) / Math.LN10; // Math.LN10 is the natural logarithm of 10, approx 2.302.
            // Could also do this as Math.log(val) / Math.log(10)
        }

        function tickRange(minVal, maxVal, tickCount) {
            var range = maxVal - minVal;
            var unRoundedTicksSize = range / (tickCount - 1);
            var x = Math.ceil(log10(unRoundedTicksSize) - 1);
            var pow10x = Math.pow(10, x);
            var roundedTickRange = Math.ceil(unRoundedTicksSize / pow10x) * pow10x;

            return roundedTickRange
        }

        function setAxisViewProperties() {

            var allActive, ref, i, pos, midPoint, item, lastItem;

            // grab all the bars that are curretly active.
            // and set them to not display an x axis value.
            allActive = $.grep(self.bars, function (bar) {
                bar.displayXAxisValue(false);
                return bar.isActive();
            });


            if (allActive.length > 0) {
                // Remove all of the values for the YAxis. We need to recalculate what they are.
                self.visibleYAxisValues.removeAll();

                var min, max;
                min = self.metadata.minValue();
                max = self.metadata.maxValue();
                


                // If that min and max are not the same.
                if (Math.floor(min) != Math.floor(max)) {
                    min = min - ((max - min) / chartSettings.yAxisValuesDisplayNumber);
                    
                    var incrimentTicks = tickRange(min, max, chartSettings.yAxisValuesDisplayNumber);
                    var count = max;

                    for (i = chartSettings.yAxisValuesDisplayNumber; i > 0; i -= 1) {
                        self.visibleYAxisValues.push({
                            value: count
                        });
                        count -= incrimentTicks;
                    }
                }
                else {
                    // Spoof a Y axis
                    console.log("Dems max min ars the sames");
                    incrimentTicks =(max * 2) / chartSettings.yAxisValuesDisplayNumber;
                    count = max * 2;
                    
                    for (i = chartSettings.yAxisValuesDisplayNumber; i > 0; i -= 1) {
                        console.log("Be addin some yAxis values, yall");
                        self.visibleYAxisValues.push({
                            value: count
                        });
                        count -= incrimentTicks;
                    }

                    console.log(self.visibleYAxisValues());

                }

                // Set up the X Axis display values
                ref = allActive.length / chartSettings.xAxisValuesDisplayNumber;

                self.visibleXAxisValues.removeAll();

                // Add the first value
                allActive[0].displayXAxisValue(true);
                self.visibleXAxisValues.push({
                    bar: allActive[0],
                    cssClass: 'xAxisFirst'
                });

                // Add intermediate values
                for (i = 1; i < chartSettings.xAxisValuesDisplayNumber - 1; i += 1) {
                    // get the start position of the segment containing our display value
                    pos = Math.floor(ref * i);

                    // get the mid point of the segment.
                    midPoint = Math.round(pos + (ref / 2));

                    item = allActive[midPoint];

                    if (item !== undefined && item !== null) {
                        item.displayXAxisValue(true);

                        self.visibleXAxisValues.push({
                            bar: item,
                            cssClass: ''
                        });
                    }
                }

                // Add last value
                lastItem = allActive[allActive.length - 1];
                if (lastItem !== undefined && lastItem !== null) {
                    lastItem.displayXAxisValue(true);

                    self.visibleXAxisValues.push({
                        bar: lastItem,
                        cssClass: 'xAxisLast'
                    });
                }
            }
        }

        function mergeSettings(defaults, custom) {
            var prop;
            // Replace default settings with custom settings where applicable.
            for (prop in custom) {
                if (custom.hasOwnProperty(prop)) {
                    defaults[prop] = custom[prop];
                }
            }

            return defaults;
        }

        function createBars() {
            // create a bar for each x horizontal axis value
            /*jslint unparam: true*/
            $.each(self.xAxisValues, function (index, value) {
                var bar = {
                    xAxisValue: value,
                    yAxisValue: ko.observable(null),
                    yAxisValueAsPercent: ko.observable(null),
                    yAxisValueBeforeChange: null,
                    isActive: ko.observable(true),
                    xAxisValueAsPercent: function () {
                        var activeBars = $.grep(self.bars, function (x) {
                            return x.isActive();
                        });

                        return 100 / activeBars.length;
                    },
                    displayXAxisValue: ko.observable(false),
                    hasValue: function () { return this.yAxisValue() !== null; }
                };

                self.bars.push(bar);
            });
        }

        function initialise() {
            // Set up the default chart settings.
            var defaultSettings = {
                trimBars: false,
                xAxisKeyMatchComparer: koChart.ChartKeyMatchComparers.exactMatch,
                xAxisValuesDisplayNumber: 4,
                yAxisValuesDisplayNumber: 5
            };

            // Merge user defined settings with the default settings.
            chartSettings = mergeSettings(defaultSettings, chartSettings);

            // create the x horizontal axis values
            self.xAxisValues = chartAxisProvider();
            self.metadata.activeBars(self.xAxisValues.length);

            createBars();
            registerSubscriptions();
        }

        self.resizeBarsAsPercentage = function (percentage) {
            $(".bar", self.chartContainer).css('width', percentage.toString() + "%");
        };

        // Hide zero values bars to the left and right of the first/last non zero bar.
        self.trimBars = function () {
            var seenValueLeft, seenValueRight, bars, barLast, currentBar;

            function testBarForRemove(isSeenValue, bar) {
                // If we're yet to see a populated bar and the current bar's value is null
                // remove the bar. Otherwise we've seen a populated bar and we return true.
                if (!isSeenValue && bar.yAxisValue() === null) {
                    bar.isActive(false);
                    self.removedBars += 1;
                    self.metadata.activeBars(self.metadata.activeBars() - 1);
                } else {
                    isSeenValue = true;
                }
                return isSeenValue;
            }

            seenValueLeft = false;
            seenValueRight = false;
            bars = self.bars;
            barLast = bars.length - 1;

            currentBar = 0;

            // Loop through the bars both left and right and hide all zero value bars until we reach a bar with a value.
            // Hiding means we set the isActive property of the bar to false. We never remove bars from the graph.
            while ((!seenValueLeft || !seenValueRight) && currentBar <= bars.length / 2) {
                // remove first and last bars is appropriate (if their value is 0)
                seenValueLeft = !seenValueLeft
                    ? testBarForRemove(seenValueLeft, bars[currentBar])
                    : seenValueLeft;
                seenValueRight = !seenValueRight
                    ? testBarForRemove(seenValueRight, bars[barLast])
                    : seenValueRight;

                currentBar += 1;
                barLast -= 1;
            }

            setAxisViewProperties();

            return self.getBars();
        };

        // Set bar values based on a collection of bar objects.
        /*jslint unparam: true*/
        self.setBarValues = function (barCollection) {
            $.each(barCollection, function (index, value) {
                self.setBarValue(value.xAxisValue, value.yAxisValue());
            });
        };

        // Set individual bar value based on an x axis reference.
        self.setBarValue = function (xAxisReference, newYAxisValue) {
            var bars, matchingBars;
            // If only one argument passed, assume it's a bar object.
            if (arguments.length === 1) {
                return self.setBarValue(xAxisReference.xAxisValue, xAxisReference.yAxisValue());
            }

            // Figure out where this bar fits in relation to our bars collection.
            bars = self.bars;

            // Find all the bars that match our xAxisReference.
            matchingBars = $.grep(bars, function (item, index) {
                var nextBarIndex = index < bars.length - 1 ? index + 1 : index;
                return chartSettings.xAxisKeyMatchComparer.equals(xAxisReference, item.xAxisValue, bars[nextBarIndex].xAxisValue);
            });

            // Set the new value for this bar. Since everything is byRef in JS this will ammend the self.bars collection.
            if (matchingBars.length > 0) {
                // If the bar we're adding is about to become active for the first time, incriment the activeBars count.
                if (!matchingBars[0].isActive()) {
                    self.metadata.activeBars(self.metadata.activeBars() + 1);
                }

                matchingBars[0].yAxisValue(newYAxisValue);
                matchingBars[0].isActive(true);
            }

            activateBarsBetweenActiveBars();
            return true;
        };



        self.getBars = function () {
            var ratio, valuesArray, min, max, axisValCount;
            // Set the min and max values in the chart.
            valuesArray = $.map(self.bars, function (item) { return item.yAxisValue(); });
            self.metadata.maxValue(Math.max.apply(Math, valuesArray));
            self.metadata.minValue(Math.min.apply(Math, valuesArray));

            min = self.metadata.minValue();
            max = self.metadata.maxValue();
            /*jslint unparam: true*/
            /*$.each(self.bars, function (index, value) {
                value.yAxisValueAsPercent((value.yAxisValue() / (self.metadata.maxValue() - self.metadata.minValue())) * 100);
            });*/
            
            axisValCount = self.visibleYAxisValues().length - 1;

            if (axisValCount > 0) {
                max = self.visibleYAxisValues()[0].value;
                min = self.visibleYAxisValues()[axisValCount].value;
            }
            
            // Calculate the % height of each bar based on it being within a range of minValue() to maxValue().
            $.each(self.bars, function (index, val) {
                ratio = calculateValueAsRangePercentage(min, max, val.yAxisValue());
                val.yAxisValueAsPercent(ratio);
            });

            return self.bars;
        };

        self.peekBarValue = function (xAxisReference) {
            var matchingBars;

            // Find all the bars that match our xAxisReference.
            matchingBars = $.grep(self.bars, function (item, index) {
                var nextBarIndex = index < self.bars.length - 1 ? index + 1 : index;
                return chartSettings.xAxisKeyMatchComparer.equals(xAxisReference, item.xAxisValue, self.bars[nextBarIndex].xAxisValue);
            });

            return matchingBars.length > 0 ? matchingBars[0].yAxisValue() : null;
        };

        initialise();

        /* Custom bindings */

        ko.bindingHandlers.isMinValue = {
            update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
                var cheapestClass = 'minValue';

                $(element).removeClass(cheapestClass);

                if (valueAccessor() == bindingContext.$parent.c().metadata.minValue()) {
                    $(element).addClass(cheapestClass);
                }
            }
        };

        ko.bindingHandlers.variableWidthPercent = {
            update: function (element, valueAccessor, allBindings, viewModel) {
                if (valueAccessor) {
                    var w = viewModel.xAxisValueAsPercent();
                    $(element).css({ width: w.toString() + "%" });
                }
            }
        };
        ko.bindingHandlers.variableHeightPercent = {
            update: function (element, valueAccessor, allBindings, viewModel) {
                if (valueAccessor) {
                    var h = viewModel.yAxisValueAsPercent();
                    $(element).css({ height: h.toString() + "%" });
                }
            }
        };

        /* Subscriptions */
        function registerSubscriptions() {
            /* Subscriptions for each bar property change */
            $.each(self.bars, function (index, bar) {
                bar.yAxisValue.subscribe(function (val) { bar.yAxisValueBeforeChange = val; }, null, "beforeChange");
                bar.yAxisValue.subscribe(function (val) { updateMinAndMaxValues(val, bar); });
                bar.yAxisValue.subscribe(function () {
                    setAxisViewProperties();
                    setBarHeightPercentages();
                });
                
                /*bar.yAxisValue.subscribe(setBarHeightPercentages);*/
                bar.yAxisValue.subscribe(activateBarsBetweenActiveBars);
            });
        }

        function setBarHeightPercentages() {
            var max, min, ratio, axisValCount;
            max = self.metadata.maxValue();
            min = self.metadata.minValue();
            axisValCount = self.visibleYAxisValues().length - 1;
            
            if (axisValCount > 0) {
                max = self.visibleYAxisValues()[0].value;
                min = self.visibleYAxisValues()[axisValCount].value;
            }

            // Calculate the % height of each bar based on it being within a range of minValue() to maxValue().
            $.each(self.bars, function (index, val) {
                ratio = calculateValueAsRangePercentage(min, max, val.yAxisValue());
                val.yAxisValueAsPercent(ratio);
            });
        }

        function activateBarsBetweenActiveBars() {
            // This function only really applies to trimmed charts.
            // TODO: Once we have a chartSetting for isTrimmed, we can ignore this function if isTrimmed == false.

            var bars, i, x, y, firstActiveIndex, lastActiveIndex, firstActiveFound, lastActiveFound;
            // Check if there are any non-active bars between the bars with values.
            // All bars between active bars should also be active.
            bars = self.bars;
            x = 0;
            y = bars.length - 1;
            firstActiveIndex = null;
            lastActiveIndex = null;

            firstActiveFound = false;
            lastActiveFound = false;

            // Find the index of the first and last active bars on the left and right respectively.
            while (!firstActiveFound || !lastActiveFound) {
                if (!firstActiveFound && bars[x].isActive()) {
                    firstActiveIndex = x;
                    firstActiveFound = true;
                }

                if (!lastActiveFound && bars[y].isActive()) {
                    lastActiveIndex = y;
                    lastActiveFound = true;
                }

                x += 1;
                y -= 1;
            }

            // For all bars between the first active bars on the left and right, set them to active.
            for (i = firstActiveIndex; i < lastActiveIndex; i += 1) {
                if (!bars[i].isActive()) {
                    self.metadata.activeBars(self.metadata.activeBars() + 1);
                }

                bars[i].isActive(true);
                bars[i].yAxisValue(bars[i].yAxisValue());
            }
        }

        function calculateValueAsRangePercentage(rangeMin, rangeMax, value) {
            //  n - m
            //  ------- X 100
            //  M - m

            if (value == null) {
                return 0;
            }
            
            if (rangeMin == rangeMax) {
                return 100;
            }

            // distance between current value and min value.
            var valMinDistance = Math.round(value) - Math.round(rangeMin);
            // distance between min and max values
            var minMaxDistance = Math.round(rangeMax) - Math.round(rangeMin);

            return (valMinDistance / minMaxDistance) * 100;
        }


        function updateMinAndMaxValues(val, bar) {
            var valuesArray, maxBarValue, minBarValue;

            // check if this new value is less than the minValue we have stored.
            if (self.metadata.minValue() === undefined || val < self.metadata.minValue()) {
                self.metadata.minValue(val);
            }
            else if (bar.yAxisValueBeforeChange === self.metadata.minValue()) // If the previous value was equal to the minValue we have, reset the minValue.
            {
                // Get the min yAxisValue we have available.
                valuesArray = $.map(self.bars, function (item) { return item.yAxisValue(); });
                minBarValue = Math.min.apply(Math, valuesArray);

                // If the min bar we have is greater than the min value of the chart
                // reset the min value of the chart to be the min bar value.
                if (minBarValue > self.metadata.minValue()) {
                    self.metadata.minValue(minBarValue);
                }
            }

            if (self.metadata.maxValue() === undefined || val > self.metadata.maxValue()) {
                self.metadata.maxValue(val);
            }
            else if (bar.yAxisValueBeforeChange === self.metadata.maxValue()) {
                // if we get here it means that this bar already had a value that was equal to the maxValue of all bars and we're now changing its value.
                // if this value is the same as the max value we need to figure out what the max value bar is
                // and set that value as the max value.

                // Get the max yAxisValue we have available.
                valuesArray = $.map(self.bars, function (item) { return item.yAxisValue(); });
                maxBarValue = Math.max.apply(Math, valuesArray);

                // If the max bar we have is less than the max value of the chart
                // reset the max value of the chart to be the max bar value.
                if (maxBarValue < self.metadata.maxValue()) {
                    self.metadata.maxValue(maxBarValue);
                }
            }
        };
    };

    // Defines how a chart compares keys when inserting new bars
    koChart.ChartKeyMatchComparers = {
        exactMatch: {
            equals: function (a, b) { return a === b; }
        },
        betweenValuesMatch: {
            equals: function (a, b, c) { return a > b && a < c; }
        },
        exactMatchOrBetweenValuesMatch: {
            equals: function (a, b, c) {
                return koChart.ChartKeyMatchComparers.exactMatch.equals(a, b) || koChart.ChartKeyMatchComparers.betweenValuesMatch.equals(a, b, c);
            }
        }
    };
}(jQuery, ko, koChart));
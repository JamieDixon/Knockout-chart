/*jslint devel: true */
/*jslint browser: true, nomen: true */
/*global jQuery, ko */

(function ($, ko, koChart) {
    "use strict";
    koChart = koChart || {};
    // chartAxisProvider is a function that returns an array of x axis values to be used in the chart.
    koChart.Chart = function (chartAxisProvider, chartSettings) {

        if (chartAxisProvider === undefined) {
            alert("You must specify a chart axis provider like: new koChart.Chart(koChart.ChartAxisProviders.dayChartAxisProvider). A chart axis provider is essentially a function that returns an array of x axis values");
        }

        var self, defaultSettings;
        self = this;
        defaultSettings = null;

        self.xAxisValues = [];
        self.bars = [];

        self.metadata = {
            maxValue: ko.observable(),
            minValue: ko.observable(),
            activeBars: ko.observable(),
            xAxisValuesDisplayNumber: 4,
            yAxisValuesDisplayNumber: 5
        };

        self.visibleXAxisValues = ko.observableArray();
        self.visibleYAxisValues = ko.observableArray();

        function setAxisViewProperties() {

            var allActive, ref, yRef, i, pos, midPoint, item, lastItem;

            // grab all the bars that are curretly active.
            allActive = $.grep(self.bars, function (bar) {
                bar.displayXAxisValue(false);
                return bar.isActive();
            });


            if (allActive.length > 0) {
                self.visibleYAxisValues.removeAll();

                yRef = self.metadata.maxValue() / self.metadata.yAxisValuesDisplayNumber;

                // Add max and intermediate values
                for (i = self.metadata.yAxisValuesDisplayNumber; i > 1; i -= 1) {
                    self.visibleYAxisValues.push({
                        value: yRef * i
                    });
                }

                /// Add the min value
                self.visibleYAxisValues.push(
                    {
                        value: self.metadata.minValue()
                    }
                );

                // Set up the X Axis display values
                ref = allActive.length / self.metadata.xAxisValuesDisplayNumber;

                self.visibleXAxisValues.removeAll();

                // Add the first value
                allActive[0].displayXAxisValue(true);
                self.visibleXAxisValues.push({
                    bar: allActive[0],
                    cssClass: 'xAxisFirst'
                });

                // Add intermediate values
                for (i = 1; i < self.metadata.xAxisValuesDisplayNumber - 1; i += 1) {
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

        function initialise() {
            var prop, mergedSettings;
            // Set up the default chart settings.
            defaultSettings = {
                xAxisKeyMatchComparer: koChart.ChartKeyMatchComparers.exactMatch
            };

            // merge the user defined settings with the default settings.
            mergedSettings = defaultSettings;

            for (prop in chartSettings) {
                if (chartSettings.hasOwnProperty(prop)) {
                    mergedSettings[prop] = chartSettings[prop];
                }
            }

            // change settings to be a merge of the default plus the user defined settings
            chartSettings = mergedSettings;

            // create the x horizontal axis values
            self.xAxisValues = chartAxisProvider();
            self.metadata.activeBars(self.xAxisValues.length);

            self.metadata.maxValue.subscribe(function () {
                // recalculate all of the bars yAxisValueAsPercentage
                /*jslint unparam: true*/
                $.each(self.bars, function (index, val) {
                    val.yAxisValueAsPercent((val.yAxisValue() / self.metadata.maxValue()) * 100);
                });
            });

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
                    displayXAxisValue: ko.observable(false)
                };

                // Each time a bars yAxisValue is changed.
                bar.yAxisValue.subscribe(function (val) {
                    var valuesArray, maxBarValue;
                    if (val < self.metadata.minValue()) {
                        self.metadata.minValue(val);
                    }

                    if (self.metadata.maxValue() === undefined || val > self.metadata.maxValue()) {
                        self.metadata.maxValue(val);
                    } else if (bar.yAxisValueBeforeChange === self.metadata.maxValue()) {
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

                    bar.yAxisValueAsPercent((val / self.metadata.maxValue()) * 100);
                });

                // Before a bars yAxisValue is changed, save it's current value for later reference
                bar.yAxisValue.subscribe(function (val) {
                    bar.yAxisValueBeforeChange = val;
                }, null, "beforeChange");

                self.bars.push(bar);
            });
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
            var bars, matchingBars, i, x, y, firstActiveIndex, lastActiveIndex, firstActiveFound, lastActiveFound;
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

                // Check if there are any non-active bars between the bars with values.
                // All bars between active bars should also be active.
                x = 0;
                y = bars.length - 1;
                firstActiveIndex = null;
                lastActiveIndex = null;

                firstActiveFound = false;
                lastActiveFound = false;

                // Find the first active bars on the left and right of the chart.
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

            // TODO: We only want to fiddle with the axis values if the chart is being trimmed.
            setAxisViewProperties();

            return true;
        };

        self.getBars = function () {
            // Set the min and max values in the chart.
            var valuesArray = $.map(self.bars, function (item) { return item.yAxisValue(); });
            self.metadata.maxValue(Math.max.apply(Math, valuesArray));
            self.metadata.minValue(Math.min.apply(Math, valuesArray));

            /*jslint unparam: true*/
            $.each(self.bars, function (index, value) {
                value.yAxisValueAsPercent((value.yAxisValue() / self.metadata.maxValue()) * 100);
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
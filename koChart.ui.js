/*jslint devel: true */
/*jslint browser: true, nomen: true */
/*global jQuery, ko, moment, koChart */

(function ($, ko, moment, koChart) {
    "use strict";
    koChart = koChart || {};

    koChart.Ui = function (uiSettings) {
        var self, undef, chartCache;

        self = this;
        undef = undefined;
        chartCache = {};

        self.settings = $.extend({
            updateChartAjaxUrl: "data/jsonSample.json"
        }, uiSettings);

        self.chartLoading = function (chartDom) {
            if (chartDom !== undef) {
                var loading = $("<div/>");
                loading.addClass("loading");
                chartDom.find(".barSlider").prepend(loading);
                chartDom.find("button").attr("disabled", "disabled");
            }
        };

        self.chartFinishedLoading = function (chartDom) {
            // The timeout should be the same time as it takes to perform the animation.
            if (chartDom !== undef) {
                setTimeout(function () {
                    chartDom.find("button").removeAttr("disabled");
                    chartDom.find(".loading").remove();
                }, 1000);
            }
        };

        self.cacheChart = function (cacheKey, chart) {
            chartCache[cacheKey] = chart;
        };

        self.getCachedChart = function (cacheKey) {
            return chartCache[cacheKey];
        };

        self.generateChartCacheKey = function (originIataCode, destIataCode, moDate) {
            return originIataCode + destIataCode + moDate.month().toString() + moDate.year().toString();
        };

        self.animateMonthChange = function (slideDirection, chartDom) {
            var current, clone, hideAnimation, showAnimation;

            chartDom.find(".barSlider").css({ overflow: "hidden" });

            current = chartDom.find(".calBars").first();
            clone = current.clone();

            // Move the propper chart out of the way
            current.css(slideDirection === "left" ? { left: "960px" } : { left: "-960px" });

            // stick a cloned fake in place of the propper chart.
            if (slideDirection === "left") {
                chartDom.find(".barSlider").prepend(clone);
            } else {
                chartDom.find(".barSlider").append(clone);
            }

            hideAnimation = slideDirection === "left" ? { left: -1000 } : { left: 1000 };
            showAnimation = slideDirection === "left" ? { left: 0 } : { left: 0 };

            // Make the fake clone bugger off
            clone.animate(hideAnimation, 1000, function () {
                clone.remove();
                chartDom.find(".barSlider").css({ overflow: "visible" });
            });

            // Bring back the propper chart into view.
            current.animate(showAnimation, 1000);
        };

        self.updateChart = function (value, originIataCode, destIataCode, vm, chartDom, callBack) {
            var newChart, valMoment, start, end, cacheKey, slideDir, today, departDay, cachedChart;

            self.chartLoading(chartDom);
            valMoment = moment(value);
            today = moment();

            // Are we searching for a flight departing this month? If so, set todays day as the first search day we're interested in.
            departDay = valMoment.month() === today.month() ? today.date() : 1;

            start = moment(new Date(valMoment.year(), valMoment.month(), departDay));
            end = moment(new Date(valMoment.year(), valMoment.month(), valMoment.daysInMonth()));

            slideDir = value > vm.prevMo ? "left" : "right";

            // Check here for cached chart.
            cacheKey = self.generateChartCacheKey(originIataCode, destIataCode, valMoment);
            cachedChart = self.getCachedChart(cacheKey);

            if (cachedChart === undef || cachedChart === null) {
                /*$.get("/search/bymonthvalues"*/
                $.get(self.settings.updateChartAjaxUrl, { originIataCode: originIataCode, destIataCode: destIataCode, startDateUnix: start.unix().toString(), endDateUnix: end.unix().toString() })
                    .done(function (data) {
                        if (chartDom !== undef) {
                            self.animateMonthChange(slideDir, chartDom);
                        }

                        newChart = new koChart.Chart(koChart.ChartAxisProviders.monthChartAxisProvider(start), { yAxisValuesDisplayNumber: 5 });
                        vm.c(newChart);
                        vm.b(newChart.getBars());

                        if (chartDom !== undef) {
                            self.animateMonthChange(slideDir, chartDom);
                            self.chartFinishedLoading(chartDom);
                        }

                        vm.c().setBarValues(data);
                        callBack(vm, valMoment);
                        self.cacheChart(cacheKey, newChart);
                        self.chartFinishedLoading(chartDom);
                    });
                return;
            }

            if (chartDom !== undef) {
                self.animateMonthChange(slideDir, chartDom);
                self.chartFinishedLoading(chartDom);
            }

            vm.c(cachedChart);
            vm.b(cachedChart.getBars());
        };

        self.viewNextDate = function (chart) {
            return self.changeDate(chart, 1);
        };

        self.viewPreviousDate = function (chart) {
            return self.changeDate(chart, -1);
        };

        self.changeDate = function (chart, monthsToAdd) {
            var now, then, clone;
            now = moment();
            then = moment().add("year", 1);

            // if we're looking at the current momtn or we're on a month 12 months from now.
            if ((monthsToAdd < 0 && now.month() === chart.mo().month()) || (monthsToAdd > 0 && (chart.mo().month() === (then.month() - 1) && chart.mo().year() === then.year()))) {
                return false;
            }

            clone = chart.mo().clone();
            clone.add("month", monthsToAdd);
            chart.mo(clone);

            return true;
        };

        ko.bindingHandlers.price = {
            update: function (element, valueAccessor) {
                var $element, value, convertedValue;
                $element = $(element);
                value = ko.unwrap(valueAccessor());
                convertedValue = Math.round(value);

                $element
                    .addClass("currency")
                    .attr("data-type", "price")
                    .attr("data-baseValue", value)
                    .html("<span class=\"symbol\">R </span><span class=\"value\">" + convertedValue + "</span>");
            }
        };

        /*jslint unparam: true*/
        ko.bindingHandlers.isMinValue = {
            update: function (element, valueAccessor, allBindings, barViewModel, bindingContext) {
                var cheapestClass, mainParent, barsWithMinValue;
                cheapestClass = "minValue";

                // Get the object one below the $root.
                mainParent = bindingContext.$parents[bindingContext.$parents.length - 2];

                $(element).removeClass(cheapestClass);

                if (valueAccessor() === mainParent.c().metadata.minValue()) {

                    // Other bars that are also have the min value.
                    barsWithMinValue = mainParent.b().filter(function (bar) {
                        return bar.hasMinValue;
                    });

                    $.each(barsWithMinValue, function (bar) {
                        bar.hasMinValue = false;
                    });

                    barViewModel.hasMinValue = true;
                    $(element).addClass(cheapestClass);

                    return true;
                }

                return false;
            }
        };

        /*jslint unparam: true*/
        ko.bindingHandlers.isSelectedDay = {
            update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
                var mainParent, elem;
                mainParent = bindingContext.$parents[bindingContext.$parents.length - 2];
                elem = $(element);

                if (viewModel !== null) {
                    if (viewModel.xAxisValue.value == mainParent.day() && mainParent.mo().month() == mainParent.month()) {
                        if (elem.is("input")) {
                            elem.attr("checked", "true");
                        }

                        $(element).addClass("selectedDay");
                    } else {
                        $(element).removeClass("selectedDay");
                    }
                }
            }
        };

        /*jslint unparam: true*/
        ko.bindingHandlers.handleChange = {
            init: function (element, valuseAccessor, allBindings, viewModel, bindingContext) {
                var vm, elem, newDate;
                vm = bindingContext.$parents[bindingContext.$parents.length - 2];

                $(element).change(function () {
                    elem = $(this);
                    newDate = vm.mo().clone().date(elem.val());
                    vm.day(elem.val());
                    vm.month(newDate.month());
                    vm.selectedPrice(elem.data("price"));
                    vm.selectedDate(newDate);
                });
            },

            update: function (element, valuseAccessor, allBindings, viewModel, bindingContext) {
                // Set the initial value of selectedPrice.
                var vm = bindingContext.$parents[bindingContext.$parents.length - 2];
                if (viewModel.xAxisValue.value === vm.day()) {
                    vm.selectedPrice(viewModel.yAxisValue());
                }
            }
        };

        /*jslint unparam: true*/
        ko.bindingHandlers.isDisabled = {
            update: function (element, valueAccessor, allBindings, viewModel) {
                var now, then, valueUnwrapped, fwdValue, bakValue, disabledClass;
                fwdValue = 1;
                bakValue = -1;
                disabledClass = "disabled";

                valueUnwrapped = ko.unwrap(valueAccessor);
                now = moment();
                then = viewModel.mo();

                $(element).removeClass(disabledClass);

                // If we're looking at the back button
                if (valueUnwrapped() === bakValue && now.month() === then.month()) {
                    $(element).addClass(disabledClass);
                } else {
                    if (valueUnwrapped() === fwdValue && then >= now.add("month", 11)) {
                        $(element).addClass(disabledClass);
                    } else {
                        $(element).removeClass(disabledClass);
                    }
                }
            }
        };
    };
}(jQuery, ko, moment, koChart));
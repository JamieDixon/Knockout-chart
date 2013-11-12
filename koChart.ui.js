koChart.ui = function () {
	var self = this;
	
	self.chartLoading = function (chartDom) {
            if (chartDom !== undef) {
                var loading = $("<div/>");
                loading.addClass("loading");
                chartDom.find(".barSlider").prepend(loading);
                chartDom.find("button").attr("disabled", "disabled");
            }
        }

        self.chartFinishedLoading = function (chartDom) {
            // The timeout should be the same time as it takes to perform the animation.
            if (chartDom !== undef) {
                setTimeout(function () {
                    chartDom.find("button").removeAttr("disabled");
                    chartDom.find(".loading").remove();
                }, 1000);
            }
        }

        self.cacheChart = function (cacheKey, chart) {
            chartCache[cacheKey] = chart;
        }

        self.getCachedChart = function (cacheKey) {
            return chartCache[cacheKey];
        }

        self.generateChartCacheKey = function (originIataCode, destIataCode, moDate) {
            return originIataCode + destIataCode + moDate.month().toString() + moDate.year().toString();
        }

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
        }

		self.updateChart = function (ajaxEndpoint, value, originIataCode, destIataCode, vm, chartDom, callBack)
		{
			var newChart, valMoment, start, end, cacheKey, slideDir, today, departDay, cachedChart;

            self.chartLoading(chartDom);
            valMoment = moment(value);
            today = moment();
            chartCache = {};

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
                $.get(ajaxEndpoint, { originIataCode: originIataCode, destIataCode: destIataCode, startDateUnix: start.unix().toString(), endDateUnix: end.unix().toString() })
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
            else {

                if (chartDom !== undef) {
                    animateMonthChange(slideDir, chartDom);
                    chartFinishedLoading(chartDom);
                }

                vm.c(cachedChart);
                vm.b(cachedChart.getBars());
            }
		}

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
            update: function(element, valueAccessor, allBindingsAccessor) {
                var $element = $(element);
                var value = ko.unwrap(valueAccessor());
                var convertedValue = Math.round(value);

                $element
                  .addClass("currency")
                  .attr("data-type", "price")
                  .attr("data-baseValue", value)
                  .html("<span class=\"symbol\">R </span><span class=\"value\">" + convertedValue + "</span>");
                }
        };
    };
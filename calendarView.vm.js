/*jslint devel: true */
/*jslint browser: true, nomen: true */
/*global jQuery, ko, moment */
(function ($, ko, moment, koChart) {
    "use strict";
    var CalendarView = function () {
        var self, firstDayOfWeek, now, chartAxisProvider, outboundChart, departDate, outboundWeekGroups, inboundChart, returnDate, inboundWeekGroups;

        self = this;
        self.charts = null;
        self.setSelectedDay = null;
        self.isReturnFlight = true;
        self.ui = null;

        // Private methods
        function padDays(firstDayName, date, collection) {
            var dayValues, padding, firstDayOfDate, daysToPad, i;

            dayValues = {
                Mon: 1,
                Tue: 2,
                Wed: 3,
                Thu: 4,
                Fri: 5,
                Sat: 6,
                Sun: 7
            };

            padding = [];

            // Set the day to the 1st of the month and get the day name
            firstDayOfDate = date.clone().date(1).format("ddd");
            daysToPad = dayValues[firstDayOfDate] - dayValues[firstDayName];

            for (i = 1; i <= daysToPad; i += 1) {
                padding.push(null);
            }

            return padding.concat(collection);
        }

        // Ensure that the last week group has a full collection of days
        function padWeekGroups(weekGroups) {
            var lastWeekGroup, missingItemsCount, i;

            lastWeekGroup = weekGroups[weekGroups.length - 1];
            missingItemsCount = 7 - lastWeekGroup.length;

            for (i = 0; i < missingItemsCount; i += 1) {
                lastWeekGroup.push(null);
            }

            return weekGroups;
        }

        function createWeekGroups(chart, date) {
            var daysPadded, weekGroups;

            daysPadded = padDays(firstDayOfWeek, date, chart.getBars());
            weekGroups = daysPadded.chunk(7);
            weekGroups = padWeekGroups(weekGroups);

            return weekGroups;
        }

        Array.prototype.chunk = function (chunkSize) {
            var r, i;
            r = [];
            for (i = 0; i < this.length; i += chunkSize) {
                r.push(this.slice(i, i + chunkSize));
            }
            return r;
        };

        // Public methods
        self.initialise = function () {
            var originIata, destIata, updateWeekGroupsCallback;

            originIata = "MAN";
            destIata = "LON";


            self.ui = new koChart.Ui();

            // Change the animation for this type of chart view.
            self.ui.animateMonthChange = function (slideDirection, chartDom) {
                var tbody, clone, slideDir, hidOrigDir;

                tbody = chartDom.find(".calBars").first();
                clone = tbody.clone();

                slideDir = slideDirection === "left" ? { left: -650 } : { left: 650 };
                hidOrigDir = slideDirection === "left" ? { left: 650 } : { left: -650 };

                clone.addClass("clone");
                tbody.before(clone);
                tbody.css(hidOrigDir);
                clone.animate(slideDir, 750, function () { clone.remove(); });
                tbody.animate({ left: 0 }, 750);
                return true;
            };

            firstDayOfWeek = "Mon";
            now = moment();
            chartAxisProvider = koChart.ChartAxisProviders.monthChartAxisProvider(now);
            outboundChart = new koChart.Chart(chartAxisProvider);
            inboundChart = new koChart.Chart(chartAxisProvider);

            departDate = now.clone();
            returnDate = now.clone().add("month", 2);

            outboundWeekGroups = createWeekGroups(outboundChart, departDate);
            inboundWeekGroups = createWeekGroups(inboundChart, returnDate);

            self.charts = {
                outbound: {
                    c: ko.observable(outboundChart),
                    b: ko.observable(outboundChart.getBars()),
                    mo: ko.observable(departDate),
                    prevMo: null,
                    day: ko.observable(departDate.date()),
                    month: ko.observable(departDate.month()),
                    selectedDate: ko.observable(departDate),
                    selectedPrice: ko.observable(0),
                    weekGroups: ko.observable(outboundWeekGroups),
                    cssPrefix: "outbound"
                },
                inbound: {
                    c: ko.observable(inboundChart),
                    b: ko.observable(inboundChart.getBars()),
                    mo: ko.observable(returnDate),
                    prevMo: null,
                    day: ko.observable(returnDate.date()),
                    month: ko.observable(returnDate.month()),
                    selectedDate: ko.observable(returnDate),
                    selectedPrice: ko.observable(0),
                    weekGroups: ko.observable(inboundWeekGroups),
                    cssPrefix: "inbound"
                }
            };

            self.charts.totalPrice = ko.computed(function () {
                var price = self.charts.outbound.selectedPrice();

                if (self.isReturnFlight) {
                    price += self.charts.inbound.selectedPrice();
                }
                return price;
            });

            updateWeekGroupsCallback = function (vm, valMoment) {
                vm.weekGroups(createWeekGroups(vm.c(), valMoment));
            };

            self.ui.updateChart(departDate, originIata, destIata, self.charts.outbound, $("#outboundChart"), updateWeekGroupsCallback);
            self.ui.updateChart(returnDate, destIata, originIata, self.charts.inbound, $("#inboundChart"), updateWeekGroupsCallback);

            // Subscriptions:

            // Record previous month value to compare against later. Used to determine animation slide direction.
            self.charts.outbound.mo.subscribe(function (value) { self.charts.outbound.prevMo = value; }, null, "beforeChange");
            self.charts.inbound.mo.subscribe(function (value) { self.charts.inbound.prevMo = value; }, null, "beforeChange");

            self.charts.outbound.mo.subscribe(
                function (value) {
                    self.ui.updateChart(value, "MAN", "LON", self.charts.outbound, $("#outboundChart"), updateWeekGroupsCallback);
                }
            );

            self.charts.inbound.mo.subscribe(
                function (value) {
                    self.ui.updateChart(value, "LON", "MAN", self.charts.inbound, $("#inboundChart"), updateWeekGroupsCallback);
                }
            );

            /*jslint unparam: true*/

            self.submitSearch = function () {
                throw "Not implemented";
            };

            ko.applyBindings(self);
        };
    };

    $((new CalendarView()).initialise);

}(jQuery, ko, moment, window.koChart));
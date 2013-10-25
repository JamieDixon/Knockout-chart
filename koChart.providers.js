/*jslint devel: true */
/*jslint browser: true, nomen: true */
/*global jQuery, ko */

(function ($, ko, moment, koChart) {
    "use strict";
    koChart = koChart || {};

    // Chart Axis Providers
    // These providers define the creation of an x axis for a chart.
    koChart.ChartAxisProviders = {
        dayChartAxisProvider: function () {
            var result, helpers, t, hourFormat, halfHourFormat;
            result = ko.observableArray();
            helpers = koChart.ChartAxisProviders.helpers;
            hourFormat = "{0}:00";
            halfHourFormat = "{0}:30";
            for (t = 0; t < 24; t += 1) {
                result.push(helpers.formatString(hourFormat, t));
                result.push(helpers.formatString(halfHourFormat, t));
            }
            return result();
        },

        monthChartAxisProvider: function(momentDate){
            var daysInMonth, result;
            result = ko.observableArray();
            daysInMonth = momentDate.daysInMonth();
            while(daysInMonth > 0)
            {
                result.push(daysInMonth);
                daysInMonth -= 1;
            }

            return function () { return result().reverse(); } ;
        },

        helpers: {
            formatString: function (format, value) {
                if (value < 10) {
                    format = "0" + format;
                }

                return format.replace("{0}", value);
            }
        }
    };
}(jQuery, ko, moment, koChart));
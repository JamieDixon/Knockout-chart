(function($, ko, cf, undefined){
    if ($ === undefined) alert('jQuery not loaded.');
    if (ko === undefined) alert('KnockoutJS not loaded.');
    /*if (moment === undefined) alert('Moment not loaded');*/
    if (cf === undefined) alert('CF not initialised');

    // chartAxisProvider is a function that returns an array of x axis values to be used in the chart.
    cf.Chart = function(chartAxisProvider){

    	if(chartAxisProvider === undefined)
    	{
    		alert("You must specify a chart axist provider like: new cf.Chart(cf.ChartAxisProviders.dayChartAxisProvider)");
    	}

    	var self = this;

    	self.xAxisValues = [];
    	self.bars = [];

    	self.metadata = {
    		maxValue: null,
    		minValue: null
    	};

    	function initialise()
    	{
    		console.log("Chart initialised");

    		// create the x horizontal axis values
	    	self.xAxisValues = chartAxisProvider();

	    	// create a bar for each x horizontal axis value
			$.each(self.xAxisValues, function(index, value){
				self.bars.push({
	    			xAxisValue: value,
	    			yAxisValue: null,
	    			yAxisValueAsPercent: null
	    		});
			});
    	};

    	    	// Set bar values based on a collection of bar objects.
    	self.setBarValues = function(barCollection)
    	{
    		$.each(barCollection, function(index, value){
    			self.setBarValue(value.xAxisValue, value.yAxisValue);
    		});
    	}

    	// Set individual bar value based on an x axis reference.
    	self.setBarValue = function(xAxisReference, newYAxisValue){

    		// If only one argument passed, assume it's a bar object.
    		if(arguments.length == 1)
    		{
    			return self.setBarValue(xAxisReference.xAxisValue, xAxisReference.yAxisValue);
    		}

    		// Figure out where this bar fits in relation to our bars collection.
    		var bars = self.bars;

    		// Find all the bars that match our xAxisReference.
    		var matchingBars = $.grep(bars, function(item, index) {

				// if we have an exact match on the x axis, we know we can update this bar.
				if(xAxisReference == item.xAxisValue)
				{
					return true;
				}

				// if the xAxisReference falls between two bars, we can update the bar at the lower boundary.
				// TODO: Check this assumption. Do we even want to handle this case?
				if(index < bars.length)
				{
					return xAxisReference > item.xAxisValue && xAxisReference < bars[index + 1].xAxisValue;
				}

				// We couldn't find any bars that match our criteria
				return false;
    		});

    		// Set the new value for this bar. Since everything is byRef in JS this will ammend the self.bars collection.
    		if(matchingBars.length > 0)
    		{
    			matchingBars[0].yAxisValue = newYAxisValue;
    		}
    	};

    	self.getBars = function(){
    		var valuesArray = $.map(self.bars, function(item){ return item.yAxisValue; });
			self.metadata.maxValue = Math.max.apply(Math, valuesArray);
			self.metadata.minValue = Math.min.apply(Math, valuesArray);

			$.each(self.bars, function(index, value){
				value.yAxisValueAsPercent = (value.yAxisValue / self.metadata.maxValue) * 100;
			});

    		return self.bars;
    	};

    	initialise();
	}

	// Chart Axis Providers
	// These providers define the creation of an x axis for a chart.

	cf.ChartAxisProviders = {
		dayChartAxisProvider: function(){
    		var result = [];

    		for(var t = 0; t < 24; t++)
	    	{
	    		var hourFormat = "{0}:00";
	    		var halfHourFormat = "{0}:30";

	    		result.push(cf.ChartAxisProviders.helpers.formatString(hourFormat, t));
	    		result.push(cf.ChartAxisProviders.helpers.formatString(halfHourFormat, t));
	    	}
	    	return result;
    	},

    	helpers: {
    		formatString: function(format, value)
    		{
    			if(value < 10)
    			{
    				format = "0" + format;
    			}

    			return format.replace("{0}", value);
    		}	
    	}
	};

})(jQuery, ko, window.__cf);

$.fn.chartify = function(chart){
	var chartContainer = this;

	$.each(chart.getBars(), function(index, value){
		chartContainer.append("<div class='bar'><div class='barColour' style='height:" + value.yAxisValueAsPercent + "%'><span>" + value.xAxisValue + " | </span></div></div>");
	});
};
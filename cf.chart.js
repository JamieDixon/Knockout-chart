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
    		maxValue: ko.observable(),
    		minValue: null,
    		activeBars: 0
    	};

    	function initialise()
    	{
    		console.log("Chart initialised");

    		// create the x horizontal axis values
	    	self.xAxisValues = chartAxisProvider();

	    	self.metadata.maxValue.subscribe(function(value){
	    		// recalculate all of the bars yAxisValueAsPercentage
	    			$.each(self.bars, function(index, value){
						value.yAxisValueAsPercent((value.yAxisValue() / self.metadata.maxValue()) * 100);
					});
	    	});

	    	// create a bar for each x horizontal axis value
			$.each(self.xAxisValues, function(index, value){
				var bar = {
	    			xAxisValue: value,
	    			yAxisValue: ko.observable(null),
	    			yAxisValueAsPercent: ko.observable(null),
	    			isActive: ko.observable(true)
	    		};

	    		bar.yAxisValue.subscribe(function(value){
	    			if(value > self.metadata.maxValue())
	    			{
	    				self.metadata.maxValue(value);
	    			}
	    			/*self.metadata.maxValue(value > self.metadata.maxValue() ? value : self.metadata.maxValue());*/
	    			bar.yAxisValueAsPercent((value / self.metadata.maxValue()) * 100);
	    		});

				self.bars.push(bar);
			});
    	};

    	self.resizeBarsAsPercentage = function(percentage)
					{
						$(".bar", self.chartContainer).css('width', percentage.toString() + "%");
					}
    	// Hide zero values bars to the left and right of the first/last non zero bar.
    	self.trimBars = function()
    	{
    		console.log("trimming bars");
    		function testBarForRemove(isSeenValue, bar)
					{
						// If we're yet to see a populated bar and the current bar's value is null
						// remove the bar. Otherwise we've seen a populated bar and we return true.
						(!isSeenValue && bar.yAxisValue() === null) 
							? function(){ bar.isActive(false);  self.removedBars += 1 }() 
							: isSeenValue = true;
						return isSeenValue;
					}

			var seenValueLeft, seenValueRight;
			var bars = self.bars;
			var barLast = bars.length -1;

			var x = 0;

			var currentBar = 0;
			while((!seenValueLeft || !seenValueRight) && x < 20) 
			{
				x +=1;
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

			// Resize bars
			self.resizeBarsAsPercentage(100 / (bars.length - self.removedBars));
			return self.getBars();
    	}

    	    	// Set bar values based on a collection of bar objects.
    	self.setBarValues = function(barCollection)
    	{
    		$.each(barCollection, function(index, value){
    			self.setBarValue(value.xAxisValue, value.yAxisValue());
    		});
    	}

    	// Set individual bar value based on an x axis reference.
    	self.setBarValue = function(xAxisReference, newYAxisValue){

    		// If only one argument passed, assume it's a bar object.
    		if(arguments.length == 1)
    		{
    			return self.setBarValue(xAxisReference.xAxisValue, xAxisReference.yAxisValue());
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
    			// If the bar we're adding is about to become active for the first time, incriment the activeBars count.
    			if(!matchingBars[0].isActive())
    			{
    				self.metadata.activeBars += 1;
    			}

    			matchingBars[0].yAxisValue(newYAxisValue);
    			matchingBars[0].isActive(true);
    			
    			var x = 0;
    			var y = bars.length -1;
    			var firstActiveIndex = null;
    			var lastActiveIndex = null;

    			var firstActiveFound = false;
    			var lastActiveFound = false;

    			while(!firstActiveFound || !lastActiveFound)
    			{
    				if(!firstActiveFound && bars[x].isActive())
    				{
    					firstActiveIndex = x;
    					firstActiveFound = true;
    				}

    				if(!lastActiveFound && bars[y].isActive())
    				{
    					lastActiveIndex = y;
    					lastActiveFound = true;
    				}

    				x+=1;
    				y-=1;
    			}

    			// Set all applicable bars to active.
    			for(var i = firstActiveIndex; i < lastActiveIndex; i++)
    			{
    				if(!bars[i].isActive())
    				{
    					self.metadata.activeBars += 1;
	    			}

    				bars[i].isActive(true);
    				bars[i].yAxisValue(bars[i].yAxisValue());
    			}

    			console.log(self.metadata.activeBars);
    		}
    	};

    	self.getBars = function(){
    		var valuesArray = $.map(self.bars, function(item){ return item.yAxisValue(); });
			self.metadata.maxValue(Math.max.apply(Math, valuesArray));
			self.metadata.minValue = Math.min.apply(Math, valuesArray);

			$.each(self.bars, function(index, value){
				value.yAxisValueAsPercent((value.yAxisValue() / self.metadata.maxValue()) * 100);
			});

    		return self.bars;
    	};

    	initialise();
	}

	// Chart Axis Providers
	// These providers define the creation of an x axis for a chart.

	cf.ChartAxisProviders = {
		dayChartAxisProvider: function(){
    		var result = ko.observableArray();

    		for(var t = 0; t < 24; t++)
	    	{
	    		var hourFormat = "{0}:00";
	    		var halfHourFormat = "{0}:30";

	    		result.push(cf.ChartAxisProviders.helpers.formatString(hourFormat, t));
	    		result.push(cf.ChartAxisProviders.helpers.formatString(halfHourFormat, t));
	    	}
	    	return result();
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

	cf.ChartRenderingProviders = {
		html: function(settings){
				var self = this;
				self.settings = settings;
				self.chartContainer = null;
				self.activeBars = 0;
				self.removedBars = 0;

				self.setup = function(){
					self.chartContainer = $("<div/>");
				};

				self.addBars = function(bars){
					
				};

				self.addBar = function(value){
					
					if (self.settings.hideZeroValueBars && value.yAxisValueAsPercent() <= 0)
                    {
                    	return;
                    }
					var bar = $("<div/>", { class: 'bar'});
					bar.data('value', value.yAxisValue());
					var barColour = $("<div/>", { class: 'barColour', css: { height: value.yAxisValueAsPercent().toString() + "%" }});
					var barValue = $("<span/>", { text: value.xAxisValue	});					
					self.chartContainer.append(bar.append(barColour.append(barValue)));
					self.activeBars += 1;
				};

				self.getChart = function(){
					function testBarForRemove(isSeenValue, bar)
					{
						// If we're yet to see a populated bar and the current bar's value is null
						// remove the bar. Otherwise we've seen a populated bar and we return true.
						(!isSeenValue && bar.data("value") === undefined) 
							? function(){ bar.removeClass('activeBar'); self.removedBars += 1 }() 
							: isSeenValue = true;	
						return isSeenValue;
					}

					function resizeBarsAsPercentage(percentage)
					{
						$(".bar", self.chartContainer).css('width', percentage.toString() + "%");
					}
						
					if(self.settings.hideZeroValueBars)
					{
						resizeBarsAsPercentage(100 / activeBars);
					}

					if(self.settings.trimBars)
					{
						var seenValueLeft, seenValueRight;
						var bars = $(".bar", self.chartContainer);
						var barLast = bars.length -1;
						$(".bar", self.chartContainer).addClass("activeBar");

						var x = 0;
						while((!seenValueLeft || !seenValueRight) && x < 20) 
						{
							console.log($(".bar.activeBar:first", self.chartContainer));

							// remove first and last bars is appropriate (if their value is 0)
							seenValueLeft = !seenValueLeft 
													? testBarForRemove(seenValueLeft, $(".bar.activeBar:first", self.chartContainer)) 
													: seenValueLeft;
							seenValueRight = !seenValueRight
													? testBarForRemove(seenValueRight, $(".bar.activeBar:last", self.chartContainer)) 
													: seenValueRight;

													x +=1;
						}

						// Resize bars
						resizeBarsAsPercentage(100 / (bars.length - self.removedBars));
					}

					return self.chartContainer;
				};

				return self;
		},
		canvas: function(settings) {
			var self = this;

			self.settings = settings;

			self.chartContainer = null;

			self.settings = {
				chartCanvas: null,
				canvCtx: null,
				leftPos: null,
				topPos: null,
				barWidth: 0
			};

			self.setup = function(ctx){
				console.log("setting up the canvas chart");
				chartContainer = $("<canvas/>");
				self.settings.canvCtx = chartContainer[0].getContext("2d");
				self.settings.canvCtx.canvas.height = ctx.height();
				self.settings.canvCtx.canvas.width = ctx.width();
				self.settings.barWidth = self.settings.canvCtx.canvas.width / 48;
				self.settings.canvCtx.fillStyle = "rgb(200, 0, 0)"; // general bar style.
			};

			self.addBar = function(value){
				console.log("adding a bar to the canvas");
				var barValue = value.yAxisValue();
				var barHeightAsPercent = (self.settings.canvCtx.canvas.height / 100) * value.yAxisValueAsPercent();
				var rectTop = self.settings.canvCtx.canvas.height - barHeightAsPercent;

				self.settings.canvCtx.fillRect(settings.leftPos, rectTop, settings.barWidth, barHeightAsPercent);
				self.settings.leftPos += settings.barWidth;
			};

			self.getChart = function()
			{
				return self.chartContainer;
			};

			return self;
		}
	}

})(jQuery, ko, window.__cf);

$.fn.chartify = function(chart, renderingProvider, settings){
	
	var self = this;
	self.empty();
	self.addClass("chartified");

	var defaultSettings = {
		hideZeroValueBars: false,
		trimBars: false
	};

	var mergedSettings = defaultSettings;

	for(var prop in settings)
	{
		mergedSettings[prop] = settings[prop];
	}

	// if no provider specified, assume HTML.
	renderingProvider = renderingProvider || cf.ChartRenderingProviders.html;
	var provider = renderingProvider(mergedSettings);
	provider.setup(self);

	$.each(chart.getBars(), function(index, value){
		provider.addBar(value);
	});

	self.append(provider.getChart());
};


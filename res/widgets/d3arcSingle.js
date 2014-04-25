/*
	Function below is a generic reusable chart for a simple arc.
	An empty <svg/> tag must exist in your html, and the selector must select that single element.
	Configurations options can be passed in an object through the second variable.

	Sample:
	var chart = new arcSingle("#d3 svg",{
		width:150,
		bgWidth:30,
		bgColor:"black",
		arcWidth:25,
		arcColor:"277dba",
		valueColor:"black",
		valueSize:32,
		text:"Label",
		textColor:"277dba",
		textSize:28
	});
	chart.render(0.5);
*/
function d3arcSingle(selector,custom) {
	// basic check
	if( typeof(d3) !== "object" ){
		alert("Library D3 not present!");
		return false;
	}
	// generic properties
	var _chart = {},
		_current = 0,
		_data = 0,
		_svg,
		_value,
		_bodyG,
		_arc,
		_d3arc;
	// default configuration values for this specific chart
	var config = {
		width:200, // default width
		height:200, // default height
		duration:750, // transition duration
		bgWidth:30, // width of background ring
		bgColor:"#ddd", // background ring color
		arcWidth:25, // width of arc that represents the value
		arcColor:"orange", // arc foreground color
		valueColor:"black", // color of value that will be printed in the center
		valueSize:30 // font-size [px] of the value that will be printed in the center
	}
	// check if selector is filled
	if(selector === null){
		alert("Selector is mandatory!");
		return false;
	}
	// check if selector points to existing svg
	_svg = d3.select(selector);
	if(_svg.empty()){
		return false;
	}
	// overwrite config properties with custom values (if present)
	if(custom){
		for(prop in custom){
			config[prop] = custom[prop];
		}
	}
	// add/change attributes of svg
	_svg.attr("width", config.width)
		.attr("height", config.height)
		.attr("viewBox", "0 0 "+config.width+" "+config.height);
	// add text element in middle of circle
	_value = _svg.append("text")
		.attr("x",config.width/2)
		.attr("y",config.width/2+config.valueSize/2)
		.attr("dy","-0.15em")
		.attr("font-size",config.valueSize)
		.attr("fill",config.valueColor)
		.attr("text-anchor","middle");
	// add g.body to svg
	_bodyG = _svg.append("g")
		.attr("class", "body")
		.attr("transform", "translate(" + config.width / 2 + "," + config.width / 2 + ")");
	// append static background arc to g.body (used as background)
	_bodyG.append("path")
		.attr("fill",config.bgColor)
		.attr("d",d3.svg.arc()
			.innerRadius((config.width/2)-config.bgWidth)
			.outerRadius((config.width/2))
			.startAngle(0)
			.endAngle(2*Math.PI)
		);
	// d3 arc (of which the endAngle will be recalculated each interval)
	_d3arc = d3.svg.arc()
		.innerRadius((config.width/2)-((config.bgWidth-config.arcWidth)/2)-config.arcWidth )
		.outerRadius((config.width/2)-((config.bgWidth-config.arcWidth)/2))
		.startAngle(0);
	// append foreground arc to g.body (using _d3arc)
	_arc = _bodyG.append("path")
		.attr("fill",config.arcColor)
		.datum({endAngle:_current})
		.attr("d",_d3arc);
	// function that renders/updates the chart with new data value
	_chart.render = function(data) {
		// data must be a number (between 0 and 1)
		if( arguments.length > 0 && data !== null && !isNaN(data) ){
			// store data from input
			_data = data*2*Math.PI;
			// start transition of _arc element
			_arc.transition()
				.duration(config.duration)
				.attrTween("d", function(d) {
					// to interpolate between the two numbers, we use the default d3.interpolate.
					var interpolate = d3.interpolate(_current, _data);
					// put data in 'cache' for next transition
					_current = _data;
					// the return value is also a function: the function that we want to run for each tick of the transition
					return function(t) {
						// calculate the current arc angle based on the transition time, t
						d = interpolate(t);
						// compute the arc path given the updated data
						return _d3arc({endAngle:d});
					};
				});
			// update percent text in circle
			_value.text(Math.round(data*100)+"%");
		}
	};
	// always return chart object
	return _chart;
}

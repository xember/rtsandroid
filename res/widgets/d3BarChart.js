/*
	Function below is a generic reusable chart for a barchart.
	An empty <svg/> tag must exist in your html, and the selector must select that single element.
	Configurations options can be passed in an object through the second variable.
	$Revision: 40 $

	Sample:
    var chart = new d3BarChart("#d3 svg", {
        data: [40, 50, 30, 55, 20, 50, 30],
        threshold: [20, 20, 20, 20, 20, 20, 20],
        thresholdcolor: "orange",
        width: 200, 
        height: 200, 
        duration: 750, 
        bgColor: "black", 
        bgbarWidth: 25, 
        barColor: "red", 
        barRounding: 5, 
        barWidth: 25, 
        spacer: 5 
    });
	chart.render([10,20,30,40,50,60,70]);

*/
function d3BarChart(selector, custom) {
    // basic checks
    // check if selector is filled
    if (selector === null) {
        alert("selector is mandatory!");
        return false;
    }
    // generic properties
    var _chart = {},
        _svg,
        _bgrect,
        _rect,
        _threshold;
    // default configuration values for this specific chart
    var config = {
        data: [40, 50, 30, 55, 20, 50, 30], //dataset
        threshold: [20, 20, 20, 20, 20, 20, 20], // thresholdvalue
        thresholdwidth: 1, //threshold line width
        thresholdcolor: "purple", //thresholdcolor
        width: 200, // default width
        height: 200, // default height
        duration: 750, // transition duration
        bgColor: "black", // bar backgroundcolor
        bgbarWidth: 25, // width of background bar
        barColor: "red", // arc foreground colors (depend on threshold values)
        barRounding: 5, // top and bottom roundings
        barWidth: 25, // foreground bar width
        spacer: 5 // space between bars
    }
    // overwrite config properties with custom values (if present)
    if (custom) {
        for (var prop in custom) {
            config[prop] = custom[prop];
        }
    }
    // check if selector points to existing svg
    _svg = d3.select(selector);
    if (_svg.empty()) {
        return false;
    }
    // add/change attributes of svg
    _svg.attr("width", config.width)
        .attr("height", config.height)
        .attr("viewBox", "0 0 " + config.width + " " + config.height);

    //add rect background
    _bgrect = _svg.selectAll("rect")
        .data(config.data)
        .enter()
        .append("rect")
        .attr("y", 0)
        .attr("x", function(d, i) {
            return (config.bgbarWidth + config.spacer) * i;
        })
        .attr("rx", config.barRounding)
        .attr("ry", config.barRounding)
        .attr("width", config.bgbarWidth)
        .attr("height", config.height)
        .style("fill", config.bgColor);

    //add rect foreground
    _rect = _svg.selectAll("svg")
        .data(config.data)
        .enter()
        .append("rect")
        .attr("x", function(d, i) {
            return (config.bgbarWidth + config.spacer) * i;
        })
        .attr("rx", config.barRounding)
        .attr("ry", config.barRounding)
        .attr("width", config.barWidth)
        .attr("height", config.height / 2)
        .style("fill", config.barColor)
        .attr("y", function(d) {
            return config.height - d;
        })
        .attr("height", function(d) {
            return d;
        });

    //add threshold lines
    _threshold = _svg.selectAll("svg")
        .data(config.threshold)
        .enter()
        .append("line")
        .attr("x1", function(d, i) {
            return (config.barWidth + config.spacer) * i;
        })
        .attr("y1", function(d) {
            return d;
        })
        .attr("x2", function(d, i) {
            return ((config.barWidth + config.spacer) * i) + config.barWidth;
        })
        .attr("y2", function(d) {
            return d;
        })
        .style("stroke", config.thresholdcolor)
        .style("stroke-width", config.thresholdwidth)


    _chart.render = function(data) {
        _rect
            .data(data)
            .transition()
            .duration(config.duration)
            .attr("y", function(d) {
                return config.height - d;
            })
            .attr("height", function(d) {
                return d;
            });

    };


    // always return chart object
    return _chart;
}
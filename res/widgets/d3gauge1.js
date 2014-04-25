/*
	Function below is a generic reusable chart for a gauge meter.
	An empty <svg> tag must exist in your html, and the selector must select that single element.
	Configuration options can be passed in an object through the second variable.

	This gauge uses a scale that can be set at initialisation (using maxValue).
	The arc can have various colors marked by thresholds.
	The value is printed in [m:ss] unless the maxValue is set to 1, then it's in percentage

	$Revision: 92 $

	Sample:
	var chart = new d3gauge1("#d3 svg",{
		width:150,
		height:150,
		bgWidth:30,
		bgColor:"#aaa",
		arcWidth:26,
		arcColors:["red","green"],
		thresholds:[0.8],
		valueSize:20,
		maxValue:60
	});
	chart.render(30);
*/
function d3gauge1(selector, custom) {
    // basic checks
    if (typeof(d3) !== "object") {
        alert("d3gauge1 requires the D3 library!");
        return false;
    }
    // check if selector is filled
    if (selector === null) {
        alert("selector is mandatory!");
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
        _d3arc,
        _needle,
        _convert,
        _mkCmd,
        _convertToTime;
    // default configuration values for this specific chart
    var config = {
        width: 200, // default width
        height: 200, // default height
        duration: 750, // transition duration
        bgWidth: 40,
        bgColor: "#ddd",
        arcWidth: 30,
        arcColors: ["orange", "red"], // arc foreground colors (depend on threshold values)
        thresholds: [1], // array of threshold values [0-1] that mark the arcColors
        valueColor: "black",
        valueSize: 30,
        maxValue: 120, // gauge max value [s]
        needleColor: null, // if null then use bgColor
        needleCenterColor: "white",
        needleLength: null, // by default this value will be calculated below
        needleWidth: null // by default this value will be calculated below
    }
    // overwrite config properties with custom values (if present)
    if (custom) {
        for (var prop in custom) {
            config[prop] = custom[prop];
        }
    }
    // if needle color is not set, set it to bgColor
    if (config.needleColor === null) {
        config.needleColor = config.bgColor;
    }
    // if needle length is not set, set it to default value
    if (config.needleLength === null) {
        config.needleLength = config.width / 1.42;
    }
    // if needle width is not set, set it to default value
    if (config.needleWidth === null) {
        config.needleWidth = config.width / 30;
    }
    // set initial arcColor
    config.arcColor = config.arcColors[0];
    // convert input value d to arc-position between -0.765 and 0.765 (and respecting the maxValue)
    _convert = function(d) {
        d = (d < 0) ? 0 : d;
        d = (d > config.maxValue) ? config.maxValue : d;
        return ((1.53 / config.maxValue) * d - 0.765);
    }
    // helper function that calculates the needle coord's (based on converted value)
    _mkCmd = function(d) {
        var leftX, leftY, rightX, rightY, thetaRad, topX, topY;
        thetaRad = d + 0.5 * Math.PI;
        topX = 0 - config.needleLength * Math.cos(thetaRad);
        topY = 0 - config.needleLength * Math.sin(thetaRad);
        leftX = 0 - config.needleWidth * Math.cos(thetaRad - Math.PI / 2);
        leftY = 0 - config.needleWidth * Math.sin(thetaRad - Math.PI / 2);
        rightX = 0 - config.needleWidth * Math.cos(thetaRad + Math.PI / 2);
        rightY = 0 - config.needleWidth * Math.sin(thetaRad + Math.PI / 2);
        return "M " + leftX + " " + leftY + " L " + topX + " " + topY + " L " + rightX + " " + rightY;
    }
    // convert seconds to hh:mm:ss or mm:ss format
    _convertToTime = function(s) {
        var d = Number(s);
        var h = Math.floor(d / 3600);
        var m = Math.floor(d % 3600 / 60);
        var s = Math.floor(d % 3600 % 60);
        if (d > 0) {
            return ((h > 0) ? h + ":" : "") + m + ":" + ((s < 10) ? "0" : "") + s;
        } else {
            return "0:00";
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
    // add text element below gauge
    _value = _svg.append("text")
        .attr("class", "value")
        .attr("x", config.width / 2)
        .attr("y", (config.width / 1.4) + (config.valueSize * 1.55))
        .attr("dy", "-0.15em")
        .attr("font-size", config.valueSize)
        .attr("fill", config.valueColor)
        .attr("text-anchor", "middle");
    // add g.body to svg
    _bodyG = _svg.append("g")
        .attr("class", "body")
        .attr("transform", "translate(" + ((config.width / 2)) + "," + (config.width / 1.4) + ")");
    // append static background arc to g.body (used as background)
    _bodyG.append("path")
        .attr("fill", config.bgColor)
        .attr("class", "bgColor")
        .attr("d", d3.svg.arc()
            .innerRadius((config.width / 1.5) - config.bgWidth)
            .outerRadius((config.width / 1.5))
            .startAngle(-0.80)
            .endAngle(0.80)
    );
    // d3 arc (of which the endAngle will be recalculated each interval)
    _d3arc = d3.svg.arc()
        .innerRadius((config.width / 1.5) - ((config.bgWidth - config.arcWidth) / 2) - config.arcWidth)
        .outerRadius((config.width / 1.5) - ((config.bgWidth - config.arcWidth) / 2))
        .startAngle(-0.765);
    // append foreground arc to g.body (using _d3arc)
    _arc = _bodyG.append("path")
        .attr("fill", config.arcColor)
        .attr("class", "arcColor")
        .datum({
            endAngle: _convert(_current)
        })
        .attr("d", _d3arc);
    // draw needle
    _needle = _bodyG.append("path")
        .attr("fill", config.needleColor)
        .attr("stroke", config.needleColor)
        .attr("stroke-width", config.needleWidth / 3)
        .attr("class", "needlePath")
        .attr("d", _mkCmd(-0.765));
    // circle (base of needle)
    _bodyG.append('circle')
        .attr("class", "needleCircle")
        .attr("fill", config.needleCenterColor)
        .attr("stroke", config.needleColor)
        .attr("stroke-width", config.needleWidth / 2)
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', config.needleWidth / 0.8);
    // function that renders/updates the chart with new data value
    _chart.render = function(data) {
        // data must be a number (between 0 and 1)
        if (arguments.length > 0 && data !== null && !isNaN(data)) {
            // store data from input
            _data = data;
            // to interpolate between the two numbers, we use the default d3.interpolate.
            var d3interpolate = d3.interpolate(_current, _data);
            // put data in 'cache' for next transition
            _current = _data;
            // change arcColor based on value
            for (var i in config.arcColors) {
                var startAngle = (i == 0) ? 0 : config.thresholds[i - 1];
                var d = data / config.maxValue;
                if (startAngle <= d) {
                    config.arcColor = config.arcColors[i];
                }
            }
            // start transition of _arc element
            _arc.transition()
                .duration(config.duration)
                .attr("fill", config.arcColor)
                .attrTween("d", function(d) {
                    // the return value is also a function: the function that we want to run for each tick of the transition
                    return function(t) {
                        var d;
                        // calculate the current arc angle based on the transition time, t
                        d = _convert(d3interpolate(t));
                        // compute the arc path given the updated data
                        return _d3arc({
                            endAngle: d
                        });
                    };
                });
            // start transition of _needle element
            _needle.transition()
                .duration(config.duration)
                .tween('progress', function() {
                    return function(t) {
                        var progress;
                        progress = _convert(d3interpolate(t));
                        return d3.select(this).attr('d', _mkCmd(progress));
                    }
                });
            // update text that holds the value
            if (config.maxValue === 1) {
                // if scale is from 0 to 1, then show percentage
                _value.text(Math.round(data * 100) + "%");
            } else {
                // if scale is any other, then show [m:ss] time (using the function _convertToTime)
                _value.text("0" + _convertToTime(data));
            }
        }
        return _chart;
    };
    // always return chart object
    return _chart;
}
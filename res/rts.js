// This javascript file is to be included in the Prime Contact's RTSClient html page.
// $HeadURL: svn://svn.prime-contact.com/rts/client/tags/2.04/res/rts.js $
// $Date: 2013-09-23 20:16:38 +0200 (Mon, 23 Sep 2013) $

if (typeof(jQuery) == 'undefined') {
    alert("ERROR: jQuery library not loaded!");
}
if (typeof(jws) == 'undefined') {
    alert("ERROR: jWebSocket library not loaded!");
}

// create a closure with jQuery scope
(function($) {
    // extend with animateHighlight functionality (bling)
    $.fn.animateHighlight = function(highlightColor, duration) {
        var highlightBg = highlightColor || "#FFFF9C";
        var animateMs = duration || 1000;
        var originalBg = this.css("background-color");
        if (!originalBg || originalBg == highlightBg) {
            originalBg = "#FFFFFF"; // default to white
        }
        if (typeof($.ui) == 'undefined' || ($.browser.msie && $.browser.version.substring(0, $.browser.version.indexOf('.')) < 8)) {
            $(this).css("backgroundColor", highlightBg).animate({
                opacity: '+=0'
            }, 1000, function(e) {
                $(this).css("backgroundColor", originalBg)
            });
        } else {
            $(this).css("backgroundColor", highlightBg).animate({
                    backgroundColor: originalBg
                },
                animateMs,
                null,
                function() {
                    $(this).css("backgroundColor", originalBg);
                }
            );
        }
    }
})(jQuery);

// extend Javascript Date prototype with function that returns week number
Date.prototype.getWeekNr = function() {
    var dt = new Date(this.getTime());
    var d = dt.getDay();
    if (d == 0) d = 7; // JavaScript Sun=0, ISO Sun=7
    dt.setTime(dt.getTime() + (4 - d) * 86400000); // shift day to Thurs of same week to calculate weekNo
    var n = Math.floor((dt.getTime() - new Date(dt.getFullYear(), 0, 1) + 3600000) / 86400000);
    return Math.floor(n / 7) + 1;
}

// extend Javascript Date prototype with function that returns date in specified format
Date.prototype.format = function(sFormat) {
    // local function for adding leading zeros
    var lz = function(s) {
        return String(100 + Number(s)).substring(1);
    }
    var t = sFormat;
    t = t.replace(/%Y/g, this.getFullYear()); //four digit year
    t = t.replace(/%m/g, lz(this.getMonth() + 1)); //month in the specified date (01 ... 12)
    t = t.replace(/%M/g, this.toString().replace(/^[A-z]+ ([A-z]+) .*/, "$1")); //A textual representation of a month, three letters (Jan ... Dec)
    t = t.replace(/%n/g, this.getMonth() + 1); //month in the specified date (1 ... 12)
    t = t.replace(/%d/g, lz(this.getDate())); //day of the month (01 ... 31)
    t = t.replace(/%D/g, this.toString().replace(/^([A-z]+) .*/, "$1")); //A textual representation of a day, three letters (Mon ... Sun)
    t = t.replace(/%l/g, this.toLocaleString().replace(/^([A-z]+) .*/, "$1")); //A full textual representation of the day of the week (According to locale!!)
    t = t.replace(/%j/g, this.getDate()); //day of the month (1 ... 31)
    t = t.replace(/%w/g, this.getDay()); //integer corresponding to the day of the week: 0 for Sunday, 1 for Monday, 2 for Tuesday, and so on.
    t = t.replace(/%W/g, this.getWeekNr());
    t = t.replace(/%H/g, lz(this.getHours())); //hour in the specified date (00 ... 23)
    t = t.replace(/%G/g, this.getHours()); //hour in the specified date (0 ... 23)
    t = t.replace(/%i/g, lz(this.getMinutes())); //minutes in the specified date (00 ... 59)
    t = t.replace(/%s/g, lz(this.getSeconds())); //seconds in the specified date (00 ... 59)
    return t;
};

// extend Javascript Data prototype with function that returns a (unix) timestamp
Date.prototype.time = function() {
    return Math.floor(this.getTime() / 1000);
}

// main object for controlling websocket stats
var rts = {
    jwsIdx: [0],
    jwsURLs: [
        ["ws://localhost:8787/jWebSocket/jWebSocket"]
    ],
    jwsUsername: "root", // username required to set up the websocket connection
    jwsPassword: "root", // password required to set up the websocket connection
    jwsClient: [null], // placeholder for the websocket object
    jwsConnTimestamp: [0], // object that will hold URL's as property and connection timestamp as property value
    jwsStatus: [], // array that will hold the status for each connection
    fallbackURLs: null, // function fallback() will fill this with an object (containing necessary URLs)
    bFallback: false, // fallback mode enabled?
    sFallbackID: null, // will contain wsid after successfull logon to fallback servlet (RTSWrapper)
    iInterval: 1000 * 3, // poll interval for fallback mode
    iActionTimeoutID: null, // will hold timeoutID for calling rts.action
    bAdmin: false, // for use with admin connections; will be set to true in admin.js
    sMode: null, // site|agent
    sObject: null, // agent-id or site-id
    bDebug: false,
    sUsername: null, // username that will be passed to genesys
    sPassword: null, // password that will be passed to genesys
    iReconnectTimeout: 9, // Timeout [seconds] between reconnect attempts (after a connection loss)
    idLogonHide: "#idLogon", // css/jQuery selector of element(s) that should be hidden after a successfull logon
    idLogonShow: "#idStats", // css/jQuery selector of element(s) that should be displayed after a successfull logon
    idMsgWrapper: "#rtsMsgWrapper", // css/jQuery selector of element(s) that shows all types off messages from the websocket server (must start with #)
    idStatus: "#rtsStatus", // css/jQuery selector of element(s) that shows connection status (must start with #)
    idDebugLog: "#rtsDebugLog", // css/jQuery selector of element(s) that shows debug log (must start with #)
    idActiveMsgTable: "#rtsActiveMessages", // css selector of element (div) that holds table that will be filled by admin.js with active messages 
    MSG_RTS_CONNECTION_LOST: "The connection to the WebSocket server is lost. Will try to reconnect every few seconds.<br>If the problem persists please contact your system administrator.",
    MSG_RTS_PARALLEL_UNSUPPORTED: "Using parallel connections in FlashBridge mode is not reliable. Please use a modern browser.",
    MSG_RTS_NO_FALLBACK: "Websockets disabled, but no fallback given...",
    MSG_RTS_WRAPPER_ERR_GETDATA: "RTS Wrapper getdata returned an error",
    MSG_RTS_WRAPPER_NOSTATS: "RTS Wrapper returned invalid JSON ('stats' is not present or not an object)..",
    MSG_RTS_WRAPPER_UNEXPECTED: "Unexpected response from RTS Wrapper (Not JSON)",
    MSG_RTS_WRAPPER_ERR_LOGIN: "RTS Wrapper logon returned an error",
    MSG_RTS_AJAX_OFFLINE: "You are offline!! Please Check Your Network.",
    MSG_RTS_AJAX_404: "RTS Wrapper request returned a 404 Error page not found.",
    MSG_RTS_AJAX_500: "RTS Wrapper returned an Internal Server Error 500.",
    MSG_RTS_AJAX_ERR_PARSE: "RTS Wrapper response could not be parsed as JSON.",
    MSG_RTS_AJAX_TIMEOUT: "RTS Wrapper request timed out.",
    MSG_RTS_AJAX_UNKNOWN_ERR: "An unknown error occurred",
    MSG_RTS_UNKNOWN_MODE: "rts.object - Unknown mode was given. Mode must be either 'site' or 'agent'",
    MSG_RTS_ADMIN_TERMINATE: "The system will be stopped",
    TXT_RTS_SELECT: "Please select...",
    TXT_RTS_NO_MSG_ON_CONNECTION: "There are no active messages on connection",
    VERSION: "$HeadURL: svn://svn.prime-contact.com/rts/client/tags/2.04/res/rts.js $".replace(/.*\/(trunk|[^\/]+)\/res\/.*/, "$1"),
    NAME: "RTS Web Client",
    init: function() {
        // Check if debug mode is set. If so, display the log message section and the connection status div.
        if (this.getUrlParam("debug") == "true") {
            this.bDebug = true;
            $(this.idStatus).show();
            $(this.idDebugLog).show();
        }
        // If a site as URL parameter the site mode is set and the site id set in the sTmpObject 
        // variable. If no site is specified the agent mode is set and the agent id specified
        // as URL parameter is set in the sTmpObject variable. Note that if neither a site nor an 
        // agent is specified as URL parameter, the agent mode will be set with an empty agent
        // id.
        if (this.sMode == null) {
            var sTmpObject = this.getUrlParam("site");
            if ((sTmpObject != null) && (sTmpObject != "")) {
                this.sMode = "site";
                this.sObject = sTmpObject;
            } else {
                this.sMode = "agent";
                this.sObject = this.getUrlParam("agent");
            }
        }
        this.log("[init] RTS Client version " + this.VERSION);
        // Create initial empty values for all stats (and store it in the body tag)
        var oStats = {}
        $.each($('span,div'), function(i) {
            if ($(this).data('stat')) {
                var aStats = $(this).data('stat').split(' ');
                for (var i = 0; i < aStats.length; i++) {
                    oStats[aStats[i]] = null;
                }
            }
        });
        $('body').data('stats', oStats);
        oStats = null;
        // Connect to the jWebSocket server(s).
        if (jws.browserSupportsWebSockets() && this.jwsIdx != null) {
            for (var i = 0; i < rts.jwsIdx.length; i++) {
                this.log("[init] Creating new " + (jws.browserSupportsNativeWebSockets ? "(Native)" : "(FlashBridge)") + " jWebSocket connection:" + i);
                this.jwsClient[i] = new jws.jWebSocketJSONClient();
                this.log("[init] Connecting to " + this.jwsURLs[i][this.jwsIdx[i]]);
                this.jwsClient[i].logon(this.jwsURLs[i][this.jwsIdx[i]], this.jwsUsername, this.jwsPassword, {
                    OnOpen: rts.jwsOpen,
                    OnWelcome: rts.jwsWelcome,
                    OnMessage: rts.jwsMessage,
                    OnGoodBye: rts.jwsGoodBye,
                    OnClose: rts.jwsClose
                });
                // put the timestamp of this connect attempt in the jwsConnTimestamp array
                this.jwsConnTimestamp[i] = (new Date()).time();
                // create child div in status div
                $(rts.idStatus).append('<div class="' + i + '">[' + i + '] Disconnected</div>');
            }
        } else {
            // websockets are disabled or not supported
            if (this.jwsIdx != null && this.fallbackURLs == null) {
                rts.msgError("CLI0001", jws.MSG_WS_NOT_SUPPORTED);
            } else {
                if (this.fallbackURLs) {
                    // falling back to ajax...
                    $(this.idStatus).empty().append('<div class="connected">Fallback mode</div>');
                    this.bFallback = true;
                    var ajaxToken = null;
                    if (this.sMode == "site" && this.sUsername) {
                        this.log("[init] Requesting fallback logon for user " + this.sUsername + " ...");
                        ajaxToken = {
                            username: this.sUsername,
                            password: this.sPassword,
                            mode: this.sMode,
                            object: this.sObject
                        };
                    }
                    if (this.sMode == "site" && !this.sUsername) {
                        this.log("[init] Requesting anonymous fallback logon ....");
                        ajaxToken = {
                            mode: this.sMode,
                            object: this.sObject
                        };
                    }
                    if (ajaxToken) {
                        $.post(this.fallbackURLs.logon, ajaxToken, function(data) {
                            var o = jQuery.parseJSON(data);
                            if (o.result == "OK") {
                                rts.log("[init/callback] Logon response is OK");
                                // store wsid
                                rts.sFallbackID = o.wsid;
                                $(rts.idLogonHide).hide();
                                $(rts.idLogonShow).show();
                                $(rts.idStatus + ' div').attr("class", "authenticated");
                                $(rts.idStatus + ' div').text("Client: " + rts.sFallbackID + " (fallback mode)");
                                // start polling (after 1 second)
                                window.setTimeout(rts.poll, 1000);
                                return true;
                            } else {
                                rts.msgError("CLI0006", rts.MSG_RTS_WRAPPER_ERR_LOGIN + '<br>' + o.reason);
                            }
                        });
                    }
                } else {
                    this.msgError("CLI0016", this.MSG_RTS_NO_FALLBACK);
                }
            }
        }
        // refresh system variables every second (e.g. clock)
        setInterval(rts.system(true), 1000);
    },
    // set websocket url to other than default (or null to disable); optionally username and password can be set
    jws: function(jwsURL) {
        if (jwsURL) {
            // loop through all arguments and put URL's in an array
            for (var i = 0; i < arguments.length; i++) {
                this.jwsClient[i] = null; // create placeholder for jws-object
                this.jwsConnTimestamp[i] = 0; // set initial timestamp
                if (typeof(arguments[i]) === "string") {
                    this.jwsIdx[i] = 0; // no redundancy; pick the first and only
                    this.jwsURLs[i] = [arguments[i]]; // put websocket URL in array
                } else {
                    this.jwsIdx[i] = Math.floor(Math.random() * arguments[i].length);
                    this.jwsURLs[i] = [];
                    // loop through all (redundant) websocket URLs..
                    for (var j = 0; j < arguments[i].length; j++) {
                        this.jwsURLs[i][j] = arguments[i][j];
                    }
                }
            }
        } else {
            // this will disable websocket support..
            this.jwsIdx = null;
        }
    },
    // set mode (site|agent) and object
    object: function(sMode, sObject) {
        if (sMode == "site" || sMode == "agent") {
            this.sMode = sMode;
        } else {
            alert(rts.MSG_RTS_UNKNOWN_MODE);
        }
        this.sObject = sObject;
    },
    // set fallback url's
    fallback: function(logonURL, getdataURL, logoffURL, interval) {
        // set fallback urls in rts object:
        this.fallbackURLs = {
            "logon": logonURL,
            "getdata": getdataURL,
            "logoff": logoffURL
        }
        // set poll interval (must be in seconds)
        if (typeof(interval) == "number" && parseInt(interval, 10) > 0) {
            this.iInterval = 1000 * parseInt(interval, 10);
        }
        $.ajaxSetup({
            // globally disable caching in Ajax calls..
            cache: false,
            // and set up error handlers..
            error: function(x, e) {
                if (x.status == 0) {
                    rts.msgError("CLI0010", rts.MSG_RTS_AJAX_OFFLINE);
                } else if (x.status == 404) {
                    rts.msgError("CLI0011", rts.MSG_RTS_AJAX_404);
                } else if (x.status == 500) {
                    rts.msgError("CLI0012", rts.MSG_RTS_AJAX_500);
                } else if (e == 'parsererror') {
                    rts.msgError("CLI0013", rts.MSG_RTS_AJAX_ERR_PARSE);
                } else if (e == 'timeout') {
                    rts.msgError("CLI0014", rts.MSG_RTS_AJAX_TIMEOUT);
                } else {
                    rts.msgError("CLI0015", rts.MSG_RTS_AJAX_UNKNOWN_ERR + '<br>' + x.responseText);
                }
                window.setTimeout(rts.poll, rts.iReconnectTimeout);
            }
        });
    },
    // sets username and password in properties when not connected; attempts to login if connection is present
    logon: function(sUsername, sPassword) {
        // set username and password in object properties (when passed as arguments)
        rts.sUsername = sUsername || rts.sUsername;
        rts.sPassword = sPassword || rts.sPassword;
        // remove previous warnings if present
        $(rts.idMsgWrapper + " div.system").remove();
        $(rts.idMsgWrapper + " div.warning").remove();
        if (rts.jwsIdx != null) {
            for (var i = 0; i < rts.jwsIdx.length; i++) {
                var sId = rts.jwsClient[i].getId();
                rts.jwsLogon(sId);
            }
        }
    },
    // Logs off from the jWebSocket (or fallback) server. This function should be called upon unloading the
    // page. The timeout value is optional, if it is used a good-bye message will be send to the browser.
    exit: function() {
        if (rts.jwsIdx != null) {
            for (var i = 0; i < rts.jwsIdx.length; i++) {
                rts.log("[exit] Closing websocket:" + i + " connection...");
                rts.jwsClient[i].close();
                rts.system(false);
            }
        }
        if (rts.bFallback) {
            $.post(rts.fallbackURLs.logoff, {
                wsid: rts.sFallbackID
            });
        }
    },
    // Do ajax call to fallback url (using fallback id), update all returned stats in body object (cache) and 
    // call rts.action to parse all cached stats. Function will call itself with configured timeout (rts.iInterval)
    poll: function() {
        $.get(rts.fallbackURLs.getdata, {
            wsid: rts.sFallbackID
        }, function(data) {
            // this function is executed on a succesful ajax response
            $(rts.idMsgWrapper + " div.warning").remove();
            $(rts.idMsgWrapper + " div.error").remove();
            // check if content is valid JSON..
            if (data && data.substr(0, 1) == "{") {
                var o = jQuery.parseJSON(data);
                if (o.result == "OK") {
                    if (typeof(o.stats) == "object") {
                        // Update the page cache with all stats from JSON response
                        var sLogLine = "getdata stats: ";
                        for (var s in o.stats) {
                            $('body').data('stats')[s] = o.stats[s];
                            sLogLine = sLogLine + s + "=" + o.stats[s] + "; ";
                        }
                        rts.log("[poll] " + sLogLine);
                        // message present in ajax response?
                        if (typeof(o.message) == "object" && typeof(o.message['category']) == "string") {
                            rts.log("[poll] getdata message: " + o.message['category'] + "; line1=" + o.message['line1'] + "; line2=" + o.message['line2']);
                            rts.message(o.message['category'], o.message['line1'], o.message['line2'])
                        } else {
                            rts.log("[poll] getdata message is empty; clearing message");
                            rts.message('clear');
                        }
                        // stats are updated; now call action function
                        window.setTimeout(rts.action, 100);
                    } else {
                        rts.msgError("CLI0004", rts.MSG_RTS_WRAPPER_NOSTATS);
                    }
                } else {
                    rts.msgError("CLI0003", rts.MSG_RTS_WRAPPER_ERR_GETDATA + '<br>' + o.reason);
                }
            } else {
                rts.msgError("CLI0007", rts.MSG_RTS_WRAPPER_UNEXPECTED);
            }
            // call poll-function again after defined interval
            window.setTimeout(rts.poll, rts.iInterval);
        });
    },
    // Function that should be called every second or so (to update system variables and check for lost connections)
    system: function(arg) {
        if (arg == true) {
            $.each($('span,div'), function(i) {
                // system variable datetime?
                if ($(this).data('system') == "datetime") {
                    var oDate = new Date();
                    if ($(this).data('format')) {
                        $(this).text(oDate.format($(this).data('format')));
                    } else {
                        $(this).text(oDate.toLocaleDateString());
                    }
                    return true;
                }
                // system variable 'mode' (agent or site)
                if ($(this).data('system') == "mode") {
                    $(this).text(rts.sMode);
                    return true;
                }
                // system variable 'object' (agent-id or site-id)
                if ($(this).data('system') == "object") {
                    $(this).text(rts.sObject);
                    return true;
                }
            });
            // check for lost connections..
            if (jws.browserSupportsWebSockets() && rts.jwsIdx != null) {
                // check if each jwsClient is connected
                for (var i = 0; i < rts.jwsIdx.length; i++) {
                    var sId = rts.jwsClient[i].getId();
                    if (rts.jwsClient[i].isConnected()) {
                        $(rts.idStatus + ' div.' + i).attr("class", i + " " + rts.jwsStatus[i]);
                        $(rts.idStatus + ' div.' + i).text('[' + i + '] ' + sId + (jws.browserSupportsNativeWebSockets ? " (Native) " : " (FlashBridge) "));
                        // if connection is not authenticated (a token with type=user; subtype=logon was never received)
                        if (
                            jws.browserSupportsNativeWebSockets && // TODO: check if this line is obsolete/incorrect..
                            typeof(rts.jwsStatus[i]) == "string" &&
                            (rts.jwsStatus[i] != "authenticated" && rts.sMode == "site") && // effectively excluding agent and admin pages
                            (rts.jwsConnTimestamp[i] + rts.iReconnectTimeout) < (new Date()).time()
                        ) {
                            // .. then call reconnect function:
                            rts.log("[system] User-type logon-token was not received within the re-connect timeout; reconnect forced", "red");
                            rts.reconnect(i);
                        }
                    } else {
                        rts.jwsStatus[i] = null;
                        $(rts.idStatus + ' div.' + i).attr("class", i + " disconnected");
                        $(rts.idStatus + ' div.' + i).text('[' + i + '] Disconnected');
                        //  when not connected and the last connect attempt was outside the timeout range..
                        if ((rts.jwsConnTimestamp[i] + rts.iReconnectTimeout) < (new Date()).time()) {
                            // .. then call reconnect function:
                            rts.reconnect(i);
                        }
                    }
                }
            }

        } //end of 1st if	
        else {
            rts.log("rts.system turned off by application");
        }
    },
    // Loop through all span/div elements and scan for html-data-element.
    action: function() {
        rts.log("[action] Collected statistics will be parsed by client");
        rts.iActionTimeoutID = null;
        var oStats = $('body').data('stats');
        // inspect all relevant tags for stat-related actions...
        $.each($('span,div'), function(i) {
            // should a function be executed?
            if ($(this).data('function')) {
                var sFunction = $(this).data('function');
                var aArgs = []; // array will be filled with statistic values
                if ($(this).data('stat')) {
                    var aStats = $(this).data('stat').split(' ');
                    var aLabels = $(this).data('labels') ? $(this).data('labels').split(' ') : [];
                    for (var i = 0; i < aStats.length; i++) {
                        if (oStats[aStats[i]] !== null && oStats[aStats[i]] !== "") {
                            if (typeof(aLabels[i]) !== 'undefined') {
                                aArgs.push([aLabels[i], oStats[aStats[i]]]);
                            } else {
                                aArgs.push([oStats[aStats[i]]]);
                            }
                        }
                    }
                }
                // Call the custom function (in global scope)
                if (typeof(window[sFunction]) === "undefined") {
                    rts.log("[action] Function '" + sFunction + "' is missing!", "red");
                } else {
                    var mResult = window[sFunction](aArgs);
                    if (typeof(mResult) !== "undefined") {
                        // if function returned something, put it inside this dom object
                        $(this).html(mResult);
                    }
                }
                return true;
            }
            // 'normal' variable defined in class?
            if ($(this).data('stat')) {
                var aStats = $(this).data('stat').split(' ');
                for (var i = 0; i < aStats.length; i++) {
                    if (typeof(oStats[aStats[i]]) !== "undefined" && oStats[aStats[i]] != null) {
                        var sValue = oStats[aStats[i]];
                        if ($(this).data('bling') && $(this).data('bling').indexOf('gt') != -1) {
                            if (sValue > $(this).text()) {
                                $(this).animateHighlight();
                            }
                        }
                        if ($(this).data('bling') && $(this).data('bling').indexOf('lt') != -1) {
                            if (sValue < $(this).text()) {
                                $(this).animateHighlight();
                            }
                        }
                        switch ($(this).data('format')) {
                            case 'time':
                                $(this).text(rts.convertToTime(sValue));
                                break;
                            case 'round':
                                $(this).text(Math.round(sValue));
                                break;
                            default:
                                // no formatting
                                $(this).text(sValue);
                        }
                    }
                }
                return true;
            }
        });
    },
    // helper functions
    convertToTime: function(s) {
        // convert seconds to hh:mm:ss or mm:ss format
        var d = Number(s);
        var h = Math.floor(d / 3600);
        var m = Math.floor(d % 3600 / 60);
        var s = Math.floor(d % 3600 % 60);
        if (d > 0) {
            return ((h > 0) ? h + ":" : "") + m + ":" + ((s < 10) ? "0" : "") + s;
        } else {
            return "0:00";
        }
    },
    getUrlParam: function(aString) {
        aString = aString.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = "[\\?&]" + aString + "=([^&#]*)";
        var regex = new RegExp(regexS);
        var results = regex.exec(window.location.href);
        if (results == null) return "";
        else return results[1];
    },
    htmlentities: function(s) {
        s = String(s).replace(/[^\x20-\x7A\x7C\x7E\xA1-\xFF]/g, ''); // removes 'strange' (unicode) characters
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },
    message: function(sCategory, sLine1, sLine2) {
        if (sCategory == "clear" || sCategory == "info" || sCategory == "alarm" || sCategory == "system") {
            // remove previous messages first
            $(rts.idMsgWrapper + " div.info").remove();
            $(rts.idMsgWrapper + " div.alarm").remove();
            $(rts.idMsgWrapper + " div.system").remove();
        }
        if (sCategory == "info" || sCategory == "alarm" || sCategory == "system") {
            if (sLine2 == null) {
                $(rts.idMsgWrapper).append('<div class="' + sCategory + '"><p>' + sLine1 + '</p></div>');
            } else {
                $(rts.idMsgWrapper).append('<div class="' + sCategory + '"><h1>' + sLine1 + '</h1><p>' + sLine2 + '</p></div>');
            }
        } else if (sCategory != "clear") {
            this.log("[message] MESSAGE with unknown category: " + sCategory, "red");
        }
    },
    msgWarning: function(sCode, sMessage) {
        $(rts.idMsgWrapper + " div.warning").remove();
        $(rts.idMsgWrapper).append('<div class="warning"><h1>' + sCode + '</h1><p>' + sMessage + '</p></div>');
        this.log("[msgWarning] WARNING " + sCode + ": " + sMessage, "orange");
    },
    msgError: function(sCode, sMessage) {
        $(rts.idMsgWrapper + " div.error").remove();
        $(rts.idMsgWrapper).append('<div class="error"><h1>' + sCode + '</h1><p>' + sMessage + '</p></div>');
        this.log("[msgError] ERROR " + sCode + ": " + sMessage, "red");
    },
    log: function(string, color) {
        if (this.bDebug) {
            var lz = function(n) {
                return n < 10 ? '0' + n : n
            }
            color = (typeof color === 'undefined') ? '#000' : color;
            if ($(rts.idDebugLog + " p").length > 100) {
                $(rts.idDebugLog).empty();
            }
            var d = new Date();
            var ts = lz(d.getHours()) + ":" + lz(d.getMinutes()) + ":" + lz(d.getSeconds()) + "." + lz(d.getMilliseconds());
            $(rts.idDebugLog).append('<p style="color:' + color + '">' + ts + ' ' + string + "</p>");
            $(rts.idDebugLog).scrollTop($(rts.idDebugLog)[0].scrollHeight);
        }
    },
    reconnect: function(idx) {
        $(rts.idMsgWrapper + " div.system").remove();
        for (var i = 0; i < rts.jwsIdx.length; i++) {
            if (typeof(i) !== "number" || i == idx) {
                // close this connection
                rts.log("[reconnect] Closing websocket:" + i + " connection...");
                rts.jwsClient[i].close();
                // pick the next websocket URL (round-robin)
                if (rts.jwsIdx[i] + 1 < rts.jwsURLs[i].length) {
                    rts.jwsIdx[i]++;
                } else {
                    rts.jwsIdx[i] = 0;
                }
                rts.log("[reconnect] Connecting to " + rts.jwsURLs[i][rts.jwsIdx[i]]);
                rts.jwsClient[i].logon(rts.jwsURLs[i][rts.jwsIdx[i]], rts.jwsUsername, rts.jwsPassword, {
                    OnOpen: rts.jwsOpen,
                    OnWelcome: rts.jwsWelcome,
                    OnMessage: rts.jwsMessage,
                    OnGoodBye: rts.jwsGoodBye,
                    OnClose: rts.jwsClose
                });
                // put the timestamp of this connect attempt in the jwsConnTimestamp array
                rts.jwsConnTimestamp[i] = (new Date()).time();
            }
        }
    },
    // deprecated function..
    timeouts: function(iConnectTimeout, iReconnectTimeout) {
        if (iConnectTimeout > 0) {
            this.iReconnectTimeout = iConnectTimeout;
        }
        if (iReconnectTimeout > 0) {
            this.iReconnectTimeout = iReconnectTimeout;
        }
        rts.log("[timeouts] This function is deprecated.. use 'timeout' instead..");
    },
    // Function to set the reconnect timeout:
    // - Timeout [seconds] between reconnect attempts (after a connection loss)
    timeout: function(iReconnectTimeout) {
        if (iReconnectTimeout > 0) {
            this.iReconnectTimeout = iReconnectTimeout;
        }
    },
    getConnectionById: function(sId) {
        for (var i = 0; i < rts.jwsIdx.length; i++) {
            if (sId == rts.jwsClient[i].getId()) {
                return i;
            }
        }
        return null;
    },
    // helper function to fetch ID based on ws://URL
    getIdByURL: function(sURL) {
        for (var i = 0; i < rts.jwsIdx.length; i++) {
            if (sURL == rts.jwsClient[i].getURL()) {
                return rts.jwsClient[i].getId()
            }
        }
        return null;
    },
    // Log into RTS Engine using (genesys) credentials
    jwsLogon: function(sId) {
        $(rts.idMsgWrapper + " div.system").remove();
        $(rts.idMsgWrapper + " div.warning").remove();
        $(rts.idMsgWrapper + " div.error").remove();
        var jwsToken = {
            type: "user",
            subtype: "logon",
            role: null,
            clientversion: rts.VERSION,
            clientname: rts.NAME
        };
        if (rts.bAdmin && rts.sUsername) {
            rts.log("[jwsLogon] Requesting admin websocket (" + sId + ") logon for user " + rts.sUsername + " ...");
            jwsToken.role = "admin";
            jwsToken.username = rts.sUsername;
            jwsToken.password = rts.sPassword;
        } else {
            if (rts.sMode == "agent" && rts.sUsername) {
                rts.sObject = rts.sObject || rts.sUsername;
                rts.log("[jwsLogon] Requesting websocket (" + sId + ") logon for user " + rts.sUsername + " ...");
                jwsToken.role = "normal";
                jwsToken.mode = "agent";
                jwsToken.object = rts.sObject;
                jwsToken.username = rts.sUsername;
                jwsToken.password = rts.sPassword;
            }
            if (rts.sMode == "site" && rts.sUsername) {
                rts.log("[jwsLogon] Requesting websocket (" + sId + ") logon for user " + rts.sUsername + " ...");
                jwsToken.role = "normal";
                jwsToken.mode = "site";
                jwsToken.object = rts.sObject;
                jwsToken.username = rts.sUsername;
                jwsToken.password = rts.sPassword;
            }
            if (rts.sMode == "site" && !rts.sUsername) {
                rts.log("[jwsLogon] Requesting anonymous websocket (" + sId + ") logon ...");
                jwsToken.role = "normal";
                jwsToken.mode = "site";
                jwsToken.object = rts.sObject;
            }
        }
        if (jwsToken.role) {
            for (var i = 0; i < rts.jwsIdx.length; i++) {
                if (sId == rts.jwsClient[i].getId()) {
                    rts.jwsClient[i].sendToken(jwsToken, {
                        OnResponse: ""
                    });
                }
            }
        }
    },
    // Called if the connection to the jWebSocket server is established. Nothing to be done here.
    jwsOpen: function(oEvent) {
        rts.log("[jwsOpen] Received 'open' token");
    },
    // Called if the user was successfully logged on to the jWebSocket server.
    jwsWelcome: function(oEvent) {
        var sId = oEvent.sourceId; // TODO: check if this breaks in Flashbridge mode
        rts.log("[jwsWelcome] Received 'welcome' token for client:" + sId);
        rts.jwsStatus[rts.getConnectionById(sId)] = "connected";
        rts.jwsLogon(sId);
    },
    // Called if a goodbye event is received. Nothing to be done here.
    jwsGoodBye: function(oEvent) {
        rts.log("[jwsGoodBye] Received 'goodbye' token");
    },
    // Called if the connection to the jWebSocket server is lost.
    jwsClose: function(oEvent) {
        // oEvent gives us no clue WHICH connection is lost...
        rts.msgError("CLI0002", rts.MSG_RTS_CONNECTION_LOST);
    },
    // Called if a message token is received from the jWebSocket server. If the token is a user
    // type token the userEvent() function is called to handle the message.
    jwsMessage: function(oEvent, oToken) {
        rts.log("[jwsMessage] Received 'message' token: " + oEvent.data);
        if (oToken.type == "user" && oToken.subtype) {
            switch (oToken.subtype) {
                case "logon":
                    // The token contains the response to the logon request. If successful, hide the
                    // section on the page containing the logon controls and display the statistics table. 
                    if (oToken.result == "true") {
                        var sId = null;
                        if (typeof(oToken.websocketid) !== 'undefined') {
                            sId = oToken.websocketid; // using variable set by RTS Engine
                            rts.jwsStatus[rts.getConnectionById(sId)] = "authenticated";
                        } else if (jws.browserSupportsNativeWebSockets && typeof(oEvent.target) == "object") {
                            sId = rts.getIdByURL(oEvent.target.url); // using the url to find the websocketid
                            rts.jwsStatus[rts.getConnectionById(sId)] = "authenticated";
                        } else {
                            rts.log('[jwsMessage/logon] Cannot determine from which connection this conformation was received!', 'red');
                            if (rts.jwsIdx.length == 1) {
                                // workaround if there is only one connection...
                                rts.jwsStatus[0] = "authenticated";
                            } else {
                                // should only be shown when using FlashBridge and RTS Engine is older than 1.06
                                rts.msgError("CLI0009", rts.MSG_RTS_PARALLEL_UNSUPPORTED);
                            }
                        }
                        $(rts.idLogonHide).hide();
                        $(rts.idLogonShow).show();
                        if (rts.bAdmin) {
                            // run request for info about open displays (admin only)
                            rts.requestInfo('displays', sId);
                        } else {
                            // first time action; init the page with initial (empty) values
                            rts.iActionTimeoutID = window.setTimeout(rts.action, 100);
                        }
                    }
                    break;
                case "statupdate":
                    // Update the page cache
                    $('body').data('stats')[oToken.statid] = oToken.value;
                    // Execute client side actions on statistics (but only if request is not set out already..)
                    if (!rts.iActionTimeoutID) {
                        rts.iActionTimeoutID = window.setTimeout(rts.action, 100);
                    }
                    break;
                case "message":
                    if (rts.bAdmin) {
                        // do not call rts.message on admin page; we don't want to show the message sent to us, we want to update the table...
                        //						rts.requestInfo('displays'); // TODO ... update table row(s) with update instead of requesting 'displays' of all connections
                    } else {
                        // The token contains a user message; let rts.message() function handle it
                        rts.message(oToken.category, oToken.line1, oToken.line2);
                    }
                    break;
                case "warning":
                    // The token contains a RTS Engine warning message; let rts.msgWarning() handle it
                    rts.msgWarning(oToken.code, oToken.text);
                    break;
                case "error":
                    // The token contains a RTS Engine error message; let rts.msgError() handle it
                    rts.msgError(oToken.code, oToken.text);
                    break;
                case "info":
                    // The token contains a RTS Engine info message: let rts.msgInfo() handle it
                    var sId = null;
                    if (typeof(oToken.websocketid) !== 'undefined') {
                        sId = oToken.websocketid; // using variable set by RTS Engine
                        rts.msgInfo(oToken.request, oToken.response, rts.getConnectionById(sId));
                    } else if (jws.browserSupportsNativeWebSockets && typeof(oEvent.target) == "object") {
                        sId = rts.getIdByURL(oEvent.target.url);
                        rts.msgInfo(oToken.request, oToken.response, rts.getConnectionById(sId));
                    } else {
                        // workaround... use all connections.. (TODO: check if code is now obsolete)
                        for (var i = 0; i < rts.jwsIdx.length; i++) {
                            rts.msgInfo(oToken.request, oToken.response, i);
                        }
                    }
                    break;
                default:
                    rts.log("[jwsMessage] Unknown subtype in user type token message: " + oToken.subtype, "red");
            }
        }
    }
}

$(document).ready(function() {
    // create wrapper div that will hold messages
    if (!$(rts.idMsgWrapper).length) {
        $("body").append('<div id="' + rts.idMsgWrapper.substr(1) + '"></div>');
    }
    // create div with connection status info
    if (!$(rts.idStatus).length) {
        $("body").append('<div id="' + rts.idStatus.substr(1) + '"></div>');
    }
    // create div which holds debug log messages
    if (!$(rts.idDebugLog).length) {
        $("body").append('<div id="' + rts.idDebugLog.substr(1) + '"></div>');
    }
    // initialize rts object (set up jws connection, etc.)
    rts.init();
});
$(window).unload(rts.exit);
// This javascript file is to be included in the Prime Contact's RTSClient admin page.
// $HeadURL: svn://svn.prime-contact.com/rts/client/tags/2.04/res/admin.js $
// $Date: 2013-07-29 14:20:19 +0200 (Mon, 29 Jul 2013) $

if (typeof(rts) == 'undefined') {
	alert("ERROR: rts.js must be included before admin.js...");
}
// Mark in rts object (that admin procedure should be used in logon)
rts.bAdmin = true;
// List with all active displays
rts.aActiveDisplays = [];
// parse info response; update table in div defined by rts.idActiveMsgTable
rts.msgInfo = function(sRequest,oResponse,idx) {
	var sId = rts.jwsClient[idx].getId();
	rts.log("[msgInfo] Handling response info/"+sRequest+" from connection:"+idx+' ('+sId+')');
	if( sRequest == "displays" ){
		var oActiveMessages = {};
		var bActiveMessages = false;
		// collect data for aActiveDisplays/oActiveMessages
		for(var s in oResponse){
			if( jQuery.inArray(s,rts.aActiveDisplays) == -1 ){
				rts.aActiveDisplays.push(s);
			}
			oActiveMessages[s] = oResponse[s];
		}
		rts.aActiveDisplays.sort();
		// fill all html-selects with site|agent info
		$('select.displays').each(function(){
			$(this).empty();
			$(this).append('<option value="">'+rts.TXT_RTS_SELECT+'</option>');
			for(var i=0; i<rts.aActiveDisplays.length; i++) {
				$(this).append('<option>'+rts.aActiveDisplays[i]+'</option>');
			}
		});
		// remove rows first
		$(rts.idActiveMsgTable+' table tbody tr.idx'+idx).remove();
		// fill table based on content from aActiveDisplays/oActiveMessages
		for(var i=0; i<rts.aActiveDisplays.length; i++) {
			var s = rts.aActiveDisplays[i];
			if( typeof(oActiveMessages[s]) == "object" ){
				bActiveMessages = true;
				$(rts.idActiveMsgTable+' table tbody').append('<tr class="'+s+' idx'+idx+'"><td>'+s+'</td><td>'+idx+'</td><td>'+oActiveMessages[s].msgcat+'</td><td>'+oActiveMessages[s].msgline1+'<br>'+oActiveMessages[s].msgline2+'</td></tr>');
			}
		}
		if( !bActiveMessages ){
			$(rts.idActiveMsgTable+' table tbody').append('<tr class="idx'+idx+'"><td></td><td></td><td></td><td><i>'+rts.TXT_RTS_NO_MSG_ON_CONNECTION+':'+idx+'</i></td></tr>');
		} else {
			if (typeof(jQuery.tablesorter) !== 'undefined') {
				$(rts.idActiveMsgTable+' table').trigger("update");
			}
		}
	} else {
		rts.log("[msgInfo] Received unknown info response: "+sRequest,"red");
	}
}
// request info..
rts.requestInfo = function(sRequest,sId) {
	for (var i=0; i < rts.jwsIdx.length; i++) {
		if( sId == rts.jwsClient[i].getId() || typeof(sId) === "undefined" ){
			if( rts.jwsClient[i].isConnected() ){
				var jwsToken = { 
					type: "user",
					subtype: "info",
					request: sRequest
				};
				rts.jwsClient[i].sendToken( jwsToken, { OnResponse: "" });
				rts.log( "[requestInfo] Sending request: "+sRequest+" to "+rts.jwsClient[i].getURL());
			} else {
				rts.log( "[requestInfo] Not connected to the jWebSocket server:"+i+" "+rts.jwsClient[i].getURL() );
			}
		}
	}
}
// terminate server..
rts.requestTerminate = function(sMessage) {
	for (var i=0; i < rts.jwsIdx.length; i++) {
		if( rts.jwsClient[i].isConnected() ){
			var jwsToken = {
				type: "user",
				subtype: "terminate",
				line1: rts.MSG_RTS_ADMIN_TERMINATE
			};
			if( typeof(sMessage) !== "undefined"  ){
				jwsToken.line2 = rts.htmlentities(sMessage);
			}
			rts.jwsClient[i].sendToken( jwsToken, { OnResponse: "" });
			rts.log( "[requestTerminate] Sending: "+rts.MSG_RTS_ADMIN_TERMINATE+" to "+rts.jwsClient[i].getURL() );
		} else {
			rts.log( "[requestTerminate] Not connected to the jWebSocket server:"+i+" "+rts.jwsClient[i].getURL() );
		}
	}
}
// broadcast message to all displays
rts.requestBroadcast = function(sCategory,sLine1,sLine2){
	for (var i=0; i < rts.jwsIdx.length; i++) {
		if( rts.jwsClient[i].isConnected() ){
			var jwsToken = {
				type: "user",
				subtype: "broadcast",
				category: sCategory
			};
			if( typeof(sLine1) !== "undefined"  ){
				jwsToken.line1 = rts.htmlentities(sLine1);
			}
			if( typeof(sLine2) !== "undefined"  ){
				jwsToken.line2 = rts.htmlentities(sLine2);
			}
			rts.jwsClient[i].sendToken( jwsToken, { OnResponse: "" });
			rts.log( "[requestBroadcast] Category: "+sCategory );
		} else {
			rts.log( "[requestBroadcast] Not connected to the jWebSocket server:"+i+" "+rts.jwsClient[i].getURL() );
		}
	}
	rts.requestInfo('displays');
}
// send message to a single site|agent
rts.requestMessage = function(sMode,sObject,sCategory,sLine1,sLine2){
	for (var i=0; i < rts.jwsIdx.length; i++) {
		if( rts.jwsClient[i].isConnected() ){
			var jwsToken = {
				type: "user",
				subtype: "message",
				mode: sMode,
				object: sObject,
				category: sCategory
			};
			if( typeof(sLine1) !== "undefined"  ){
				jwsToken.line1 = rts.htmlentities(sLine1);
			}
			if( typeof(sLine2) !== "undefined"  ){
				jwsToken.line2 = rts.htmlentities(sLine2);
			}
			rts.jwsClient[i].sendToken( jwsToken, { OnResponse: "" });
			rts.log( "[requestMessage] Sending to connection:"+i+" "+sMode+":"+sObject+", category:"+sCategory );
		} else {
			rts.log( "[requestMessage] Not connected to the jWebSocket server:"+i+" "+rts.jwsClient[i].getURL() );
		}
	}
	rts.requestInfo('displays');
}
// send reload request to a single site|agent
rts.requestReload = function(sMode,sObject){
	for (var i=0; i < rts.jwsIdx.length; i++) {
		if( rts.jwsClient[i].isConnected() ){
			var jwsToken = {
				type: "user",
				subtype: "reload",
				mode: sMode,
				object: sObject
			};
			rts.jwsClient[i].sendToken( jwsToken, { OnResponse: "" });
			rts.log( "[requestReload] Sending to "+sMode+":"+sObject );
		} else {
			rts.log( "[requestReload] Not connected to the jWebSocket server:"+i+" "+rts.jwsClient[i].getURL() );
		}
	}
}

$(document).ready(function(){
	// create table(s) that will hold active messages
	$(rts.idActiveMsgTable+' table').empty().append('<colgroup/><thead/><tbody/>');
	$(rts.idActiveMsgTable+' table colgroup').append('<col style="width:14%"><col style="width:1%"><col style="width:10%"><col style="width:75%">');
	$(rts.idActiveMsgTable+' table thead').append('<tr><th>display</th><th>id</th><th>category</th><th>message</th></tr>');
	if (typeof(jQuery.tablesorter) !== 'undefined') {
		$.tablesorter.defaults.widgets = ['zebra'];
		$(rts.idActiveMsgTable+' table').addClass('tablesorter').tablesorter();
		$(rts.idActiveMsgTable+' table thead').css('cursor','pointer');
	}
});

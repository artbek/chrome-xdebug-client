$(function() {

	var listeningSocketId = '';
	var socketId = '';
	var transactionId = 0;

	var listeningIP = '';


	// CONECT WITH XDEBUG SERVER

	$(window).load(function() {
		var status = 'dead';
		chrome.storage.local.get('listening_ip', function(data) {
			listeningIP = data.listening_ip;
			if (! isValidIP()) { status = 'ip_error'; }
			$('body').trigger('socket_status', {status: status});
		});
	});

	function isValidIP() {
		return listeningIP.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
	}


	function listen_and_connect() {
		chrome.socket.create('tcp', function(createInfo) {
			//console.log("Create Info:"); console.log(createInfo);
			listeningSocketId = createInfo.socketId;

			console.log("Listening on: " + listeningIP);
			chrome.socket.listen(createInfo.socketId, listeningIP, 9000, function(result) {
				//console.log("Listen result: "); console.log(result);
			});

			chrome.socket.accept(createInfo.socketId, function(acceptInfo) {
				//console.log("Accepted: "); console.log(acceptInfo);
				socketId = acceptInfo.socketId;

				chrome.socket.read(acceptInfo.socketId, function(readInfo) {
					console.log("Read Info 1:");
					console.log(ab2str(readInfo.data));
					send_command("feature_set", "-n max_depth -v 3", function() {
						send_command("feature_set", "-n max_data -v 10000", function() {
							send_command("step_into");
							$('body').trigger('socket_status', {status: 'live'});
						});
					});
				});

				// destroy the inisial stocket
				chrome.socket.destroy(listeningSocketId);
			});
		});
	}


	// HANDLE EVENTS

	$('body').on("xdebug-listen", function() {
		if (socketId) chrome.socket.destroy(socketId);
		if (listeningSocketId) chrome.socket.destroy(listeningSocketId);
		listen_and_connect();
		$('body').trigger('socket_status', {status: 'live'});
	});

	$('body').on("xdebug-step_over", function() {
		send_command("step_over");
	});

	$('body').on("xdebug-step_out", function() {
		send_command("step_out");
	});

	$('body').on("xdebug-step_into", function() {
		send_command("step_into");
	});

	$('body').on("xdebug-run", function() {
		send_command("run");
	});

	$('body').on("xdebug-stop", function() {
		$('body').trigger('parse-xml', {
			command: "stop",
			xml: ''
		});

		socketId && chrome.socket.destroy(socketId);
		listeningSocketId && chrome.socket.destroy(listeningSocketId);
		$('body').trigger('socket_status', {status: 'dead'});
	});

	$("body").on("xdebug-eval", function(event, data) {
		send_command("eval", "-- " + data.expression);
	});

	$("body").on("xdebug-source", function(event, data) {
		var filename = data.filename;
		var lineno = parseInt(data.lineno);
		var begin = Math.max((lineno - data.linesCount), 1);
		var end = lineno + data.linesCount;
		send_command("source", "-b " + begin + " -e " + end + " -f " + filename);
	});

	$("body").on("xdebug-stack_get", function() {
		send_command("stack_get");
	});

	$("body").on("xdebug-breakpoint_set", function(event, data) {
		send_command("breakpoint_set", "-t line -f " + data.filename + " -n " + data.lineno);
	});

	$("body").on("xdebug-breakpoint_set-return", function(event, data) {
		send_command("eval", "-- " + btoa("json_encode(reset(debug_backtrace()))"), function(str) {
			var property = $($.parseXML(str[1])).find("property");
			var object = JSON.parse(atob(property.text()));

			if (object.function != "unknown") {
				if (object.class) { function_name = object.class + "::" + object.function; }
				send_command("breakpoint_set", "-t return -m " + function_name, function() {
					alertMessage("Breakpoint will trigger on function return.");
				});
			} else {
				alertMessage("Couldn't determine function name - not setting return breakpoint.");
			}
		});
	});

	$("body").on("xdebug-breakpoint_remove", function(event, data) {
		send_command("breakpoint_remove", "-d " + data.breakpoint_id);
	});



	// MAIN ACTION

	function send_command(command, options, callback) {
		var request = "";

		request += addTransactionId(command);
		if (options) {
			request += " " + options;
		}
		request += "\0";

		console.log("Sending: " + request);

		chrome.socket.write(socketId, str2ab(request), function(writeInfo) {
			//console.log("Write Info:"); console.log(writeInfo);

			setTimeout(function() {
				chrome.socket.read(socketId, 32768, function(readInfo) {
					var str = ab2str(readInfo.data).split("\0");

					console.log("Length: " + str[0]);
					console.log(str[1]);

					if (! str[0]) {
						console.log("(FAILSAFE) stopping...");
						$("body").trigger("xdebug-stop");
						return;
					}

					if (callback) {

						callback(str);

					} else {

						// default callback
						$('body').trigger('parse-xml', {
							command: command,
							options: options,
							xml: str[1]
						});

					}

				});
			}, 500);

		});
	}


	// HELPERS

	function alertMessage(message) {
		$("body").trigger("alert-message", {
			message: message
		});
	}

	function addTransactionId(str) {
		transactionId++;
		str += " -i " + transactionId;
		return str;
	}

	// http://updates.html5rocks.com/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
	function ab2str(arraybuffer_data) {
		return String.fromCharCode.apply(null, new Uint8Array(arraybuffer_data));
	}

	// http://updates.html5rocks.com/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
	function str2ab(str) {
		var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
		var bufView = new Uint8Array(buf);
		for (var i=0, strLen=str.length; i<strLen; i++) {
			bufView[i] = str.charCodeAt(i);
		}
		return buf;
	}

});




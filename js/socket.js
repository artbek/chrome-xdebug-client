$(function() {

	var listeningSocketId = '';
	var socketId = '';
	var transactionId = 0;

	var ip = null;
	var port = null;


	// CONECT WITH XDEBUG SERVER

	function listen_and_connect() {
		ip = Config.get("listening_ip");
		port = parseInt(Config.get("listening_port"));

		chrome.socket.create('tcp', function(createInfo) {
			//console.log("Create Info:"); console.log(createInfo);
			listeningSocketId = createInfo.socketId;

			Alert.busy("Listening on: " + ip + ":" + port);
			//console.log("Listening on: " + ip + ":" + port);
			chrome.socket.listen(listeningSocketId, ip, port, function(result) {
				//console.log("Listen result: "); console.log(result);
			});

			chrome.socket.accept(listeningSocketId, function(acceptInfo) {
				//console.log("Accepted: "); console.log(acceptInfo);
				socketId = acceptInfo.socketId;

				chrome.socket.read(socketId, function(readInfo) {
					console.log("Read Info 1:");
					console.log(ab2str(readInfo.data));
					send_command("feature_set", "-n max_depth -v 3", function() {
						send_command("feature_set", "-n max_data -v 10000", function() {
							send_command("step_into");
							$('body').trigger('socket_status', {status: 'live'});
						});
					});
				});

				// destroy the initial stocket
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
		var lineno = parseInt(data.lineno);
		var linesCount = parseInt(Config.get("lines_count"));

		var begin = Math.max((lineno - linesCount), 1);
		var end = lineno + linesCount;
		send_command("source", "-b " + begin + " -e " + end + " -f " + data.filename);
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
					Alert.info("Breakpoint will trigger on function return.");
				});
			} else {
				Alert.warn("Couldn't determine function name - no breakpoint set!");
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




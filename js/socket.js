$(function() {

	var ip = null;
	var port = null;

	var serverSocketId = null;
	var socketId = null;

	var transactionId = 0;
	var currentCommandOptions = "";
	var currentCommandCallback = "";

	var initialCommandQueue = [];
	var isInitialCommandQueueInitialized = false;


	/* RESPONSE object - BEGIN */

	var Response = (function() {

		var expectedLen = null;
		var partialData = "";


		var publicMethods = {

			process: function(data) {
				var split_data = ab2str(data).split("\0");

				if (split_data[0] * 1 == split_data[0]) { // check if numeric
					// begining of new reponse
					this.expectedLen = parseInt(split_data[0]);
					this.partialData = split_data[1].replace("\n", " ");

					if (! this.expectedLen) {
						throw "Expected numeric length.";
					}
				} else {
					// remainder of previous reponse
					this.partialData += split_data[0].replace("\n", " ");
				}
			},

			isComplete: function() {
				if (this.expectedLen > this.partialData.length) {
					console.log("Expecting " + this.expectedLen + " bytes...");
					console.log("Received so far " + this.partialData.length + " bytes.");
					return false;
				} else if (this.expectedLen == this.partialData.length) {
					return true;
				} else if (this.expectedLen < this.partialData.length) {
					// Just in case, examine the response - length is not 100% reliable.
					if (this.partialData.match(/transaction_id=/)) {
						if (this.partialData.match(/<\/response>$/) || this.partialData.match(/<\/init>$/)) {
							return true;
						} else {
							throw "RECEIVED_MORE_THAN_EXPECTED";
						}
					} else {
						// some error we don't care about
					}
				} else {
					throw "Unexpected values!";
				}
			},

			getXML: function() {
				// Make sure there's no duplicate nodes:
				var validXML = this.partialData.match(/^.*?<\/response>/);
				if (! validXML) { var validXML = this.partialData.match(/^.*?<\/init>/); }

				return $.parseXML(validXML[0]);
			}

		}

		return publicMethods;

	})();

	/* RESPONSE object - END */


	// CONNECT WITH XDEBUG SERVER

	function initCommandQueue() {
		if (isInitialCommandQueueInitialized) return;

		initialCommandQueue = [
			{ command: "feature_set", params: "-n max_depth -v 3" },
			{ command: "feature_set", params: "-n max_data -v 50000" }
		];

		if (Config.get('remember_breakpoints')) {
			var bps = Breakpoints.getInternalStorage();
			for (var id in bps) {
				var params_str = "-t line -f " + bps[id].filename + " -n " + bps[id].lineno;
				if (bps[id].hitValue) { params_str += " -h " + bps[id].hitValue; }
				if (bps[id].operator) {
					params_str += " -o " + bps[id].operator;
					if (bps[id].condition) { params_str += " -- " + btoa(bps[id].condition); }
				}

				initialCommandQueue.push({
					command: "breakpoint_set",
					params: params_str
				});
			}
		}

		Breakpoints.clearInternalStorage();

		if (Config.get('break_at_first_line')) {
			initialCommandQueue.push({ command: "step_into", params: null });
		} else {
			initialCommandQueue.push({ command: "run", params: null });
		}

		//console.log("Initial commands:");
		//console.log(initialCommandQueue);
		isInitialCommandQueueInitialized = true;
	}


	function showListeningAlert() {
		if (serverSocketId) {
			chrome.sockets.tcpServer.getInfo(serverSocketId, function(socketInfo) {
				var msg = "Listening... (" + socketInfo.localAddress + ":" + socketInfo.localPort + ")";
				Alert.busy(msg);
				Global.setWindowTitle(msg);
			});
		}
	}


	function listen_and_connect() {
		ip = Config.get("listening_ip");
		port = parseInt(Config.get("listening_port"));

		closeAllSockets();
		initCommandQueue();

		chrome.sockets.tcpServer.create(function(createInfo) {
			//console.log("Create Info:"); console.log(createInfo);
			serverSocketId = createInfo.socketId;

			chrome.sockets.tcpServer.listen(serverSocketId, ip, port, function(result) {
				//console.log("Listen result: "); console.log(result);
				showListeningAlert();
			});

			chrome.sockets.tcpServer.onAccept.addListener(function(acceptInfo) {
				//console.log("$$$$$$$$$$ Accepted: "); console.log(acceptInfo);
				var oldSocketId = socketId;
				socketId = acceptInfo.clientSocketId;
				closeClientSocket(oldSocketId, function() {
					chrome.sockets.tcp.update(socketId, { bufferSize: (1024*1024) }, function() {
						chrome.sockets.tcp.setPaused(socketId, false);
					});
				}); // close current client socket
			});
		});


		chrome.sockets.tcp.onReceiveError.addListener(function(errorInfo) {
			$("body").trigger('error-on-receive', {
				message: errorInfo.resultCode
			});
		});


		chrome.sockets.tcp.onReceive.addListener(function(readInfo) {

			try {
				Response.process(readInfo.data);
				if (! Response.isComplete()) return;
				var xml = Response.getXML();
			} catch (e) {
				if (e == 'RECEIVED_MORE_THAN_EXPECTED') {
					console.warn(e);
					Alert.hide();
				} else {
					console.error(e);
					$("body").trigger('error-on-receive', { message: e });
				}
				return;
			}


			if ($(xml).find("init").length > 0) {

				console.log("received init response:");
				//console.log(xml);

				isInitialCommandQueueInitialized = false;
				var c = initialCommandQueue.shift(); // next command
				c && send_command(c.command, c.params);

			} else if ($(xml).find("response").length > 0) {

				var received_transaction_id = $(xml).find("response").attr("transaction_id");
				if (received_transaction_id == transactionId) {

					Alert.hide();

					console.log("received_transaction_id: " + received_transaction_id);
					//console.log(xml);

					if (currentCommandCallback) {

						currentCommandCallback(xml);

					} else {

						var received_command = $(xml).find("response").attr("command");
						if (received_command) {
							$('body').trigger('parse-xml', {
								command: received_command,
								options: currentCommandOptions,
								xml: xml,
								params: currentCommandParams
							});
						}

					}

					var c = initialCommandQueue.shift(); // next command
					c && send_command(c.command, c.params);
				}

			}

		});

	}


	function send_command(command, options, callback, params) {

		if (! socketId) {
			console.warn("Socket doesn't exist yet!");
			$('body').trigger('parse-xml', {
				command: 'SOCKER_ERROR'
			});
			return;
		}

		var request = "";

		Alert.busy("Working...");

		currentCommandOptions = options;
		currentCommandCallback = callback;
		currentCommandParams = params;

		request += addTransactionId(command);
		if (options) {
			request += " " + options;
		}
		request += "\0";

		console.log("##### Sending command: " + request);

		// not sure if the delay is absolutely necessary
		setTimeout(function() {
			chrome.sockets.tcp.send(socketId, str2ab(request), function(writeInfo) {
				if (chrome.runtime.lastError) {
					console.log("Socket SEND error: " + chrome.runtime.lastError.message);
				}
				if (writeInfo.resultCode == 0) { // no error
					//chrome.sockets.tcp.setPaused(socketId, false);
				}
			});
		}, 100);
	}


	function closeAllSockets() {

		serverSocketId = null;
		chrome.sockets.tcpServer.getSockets(function(socketInfos) {
			for (var s = 0; s < socketInfos.length; s++) {
				//console.log("$$$$$$$$$$ Closing server socket: " + socketInfos[s].socketId);
				chrome.sockets.tcpServer.close(socketInfos[s].socketId, function() {
					if (chrome.runtime.lastError) {
						console.log("Server socket: " + chrome.runtime.lastError.message);
					}
				});
			}
		});

		socketId = null;
		chrome.sockets.tcp.getSockets(function(socketInfos) {
			for (var s = 0; s < socketInfos.length; s++) {
				//console.log("$$$$$$$$$$ Closing client socket: " + socketInfos[s].socketId);
				chrome.sockets.tcp.close(socketInfos[s].socketId, function() {
					if (chrome.runtime.lastError) {
						console.log("Client socket: " + chrome.runtime.lastError.message);
					}
				});
			}
		});

	}


	function closeClientSocket(socketIdToClose, callback) {
		if (socketIdToClose && socketIdToClose != socketId) {
			//console.log("$$$$$$$$$$ Closing client socket: " + socketIdToClose);
			chrome.sockets.tcp.close(socketIdToClose, function() {
				//console.log("$$$$$$$$$$ Closed client socket: " + socketIdToClose);
				if (chrome.runtime.lastError) {
					console.log("Client socket: " + chrome.runtime.lastError.message);
				}
				callback();
			});
		} else {
			callback();
		}
	}


	// HANDLE EVENTS

	$('body').on("xdebug-init", function() {
		initCommandQueue();
		Alert.hide();
		showListeningAlert();
	});

	$('body').on("xdebug-listen", function() {
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

		closeAllSockets();
		$('body').trigger('socket_status', {status: 'dead'});
	});

	$("body").on("xdebug-eval", function(event, data) {
		send_command("eval", "-- " + data.expression);
	});

	$("body").on("xdebug-eval-watches", function(event) {
		var watches = Watches.getAllValid();
		var currentWatch;

		function getNextWatch(xml, previousWatch) {
			if (xml && previousWatch) {
				Watches.update(previousWatch.id, Global.dbgpFormat(xml));
			}
			currentWatch = watches.pop();
			if (currentWatch) {
				var previousWatch = currentWatch;
				send_command("eval", "-- " + btoa(currentWatch.expression), function(xml) {
					getNextWatch(xml, previousWatch);
				});
			} else {
				Watches.display();
			}
		}

		getNextWatch();
	});

	$("body").on("xdebug-source", function(event, data) {
		var begin = parseInt(data.begin);
		var end = parseInt(data.end);
		send_command("source", "-b " + begin + " -e " + end + " -f " + data.filename, null, data.params);
	});

	$("body").on("xdebug-stack_get", function() {
		send_command("stack_get");
	});

	$("body").on("xdebug-breakpoint_set", function(event, data) {
		var options = "-t line -f " + Global.fileNameCurrentlyLoaded + " -n " + data.lineno;
		if (data.hitValue) { options += " -h " + data.hitValue; }
		if (data.operator) {
			options += " -o " + data.operator;
			if (data.condition) { options += " -- " + btoa(data.condition); }
			send_command("breakpoint_remove", "-d " + data.breakpointToDelete, function() {
				Breakpoints.unset(data.breakpointToDelete);
				send_command("breakpoint_set", options);
			});
		} else {
			send_command("breakpoint_set", options);
		}
	});

	$("body").on("xdebug-breakpoint_set-return", function(event, data) {
		send_command("eval", "-- " + btoa("json_encode(reset(debug_backtrace()))"), function(xml) {
			var property = $(xml).find("property");

			var object = null;
			if (property.attr("encoding") == "base64") {
				object = JSON.parse(atob(property.text()));
			}

			if (object.function != "unknown") {
				var function_name = "";
				if (object.class) { function_name += object.class + "::"; }
				function_name += object.function;
				send_command("breakpoint_set", "-t return -r 1 -m " + function_name, function() {
					send_command("run");
				});
			} else {
				Alert.warn("Couldn't determine function name - no breakpoint set!");
			}
		});
	});

	$("body").on("xdebug-breakpoint_remove", function(event, data) {
		send_command("breakpoint_remove", "-d " + data.breakpoint_id);
	});

	$("body").on("xdebug-breakpoint_remove_all", function(event, data) {
		if (! socketId || isInitialCommandQueueInitialized) {
			for (var b in initialCommandQueue) {
				if (initialCommandQueue[b].command == "breakpoint_set") {
					initialCommandQueue[b] = undefined;
				}
			}
		} else {
			send_command("breakpoint_list", "", function(xml) {
				$(xml).find("breakpoint").each(function() {
					send_command("breakpoint_remove", "-d " + $(this).attr("id"), function() {
						// Only one should trigger (send_command() overwrites the previous callback).
						$('body').trigger('parse-xml', { command: "breakpoint_remove" });
					});
				});
			});
		}
	});


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


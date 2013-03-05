$(function() {

	var listeningSocketId = '';
	var socketId = '';
	var transactionId = 0;


	// CONECT WITH XDEBUG SERVER

	chrome.socket.create('tcp', function(createInfo) {
		//console.log("Create Info:"); console.log(createInfo);
		listeningSocketId = createInfo.socketId;

		chrome.socket.listen(createInfo.socketId, '127.0.0.1', 9000, function(result) {
			//console.log("Listen result: "); console.log(result);
		});

		chrome.socket.accept(createInfo.socketId, function(acceptInfo) {
			//console.log("Accepted: "); console.log(acceptInfo);
			socketId = acceptInfo.socketId;

			chrome.socket.read(acceptInfo.socketId, function(readInfo) {
				console.log("Read Info 1:");
				console.log(ab2str(readInfo.data));
				send_command("feature_set", "-n max_depth -v 3");
			});

			// destroy the inisial stocket
			chrome.socket.destroy(listeningSocketId);
		});
	});


	// HANDLE EVENTS

	$('body').on("xdebug-stepover", function() {
		send_command("step_over");
	});

	$('body').on("xdebug-stepinto", function() {
		send_command("step_into");
	});

	$('body').on("xdebug-run", function() {
		send_command("run");
	});

	$('body').on("xdebug-stop", function() {
		chrome.socket.destroy(socketId);
		chrome.socket.destroy(listeningSocketId);
	});

	$("body").on("xdebug-eval", function(event, data) {
		send_command("eval", "-- " + data.expression);
	});

	$("body").on("xdebug-source", function(event, data) {
		var lineno = parseInt(data.lineno);
		var b = Math.max((lineno - 10), 1);
		var e = lineno + 10;
		send_command("source", "-b " + b + " -e " + e);
	});



	// MAIN ACTION

	function send_command(command, options) {
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
					//console.log(str[1]);
					//console.log(str);

					$('body').trigger('parse-xml', {
						command: command,
						xml: str[1]
					});
				});
			}, 200);

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




(function() {

	chrome.app.runtime.onLaunched.addListener(function() {
		chrome.app.window.create("main.html", {
			width: 800,
			height: 800,
			type: "panel",
			id: "Xdebug_Chrome_App",
			singleton: true
		});
	});

	// set default config values
	chrome.storage.local.get(null, function(data) {
		data.listening_ip || chrome.storage.local.set({"listening_ip": "0.0.0.0"});
		data.listening_port || chrome.storage.local.set({"listening_port": "9000"});
		data.source_script || chrome.storage.local.set({"source_script": ""});
		data.lines_count || chrome.storage.local.set({"lines_count": "50"});
		data.keep_listening || data.keep_listening === 0 || chrome.storage.local.set({"keep_listening": 1});
	});

})();


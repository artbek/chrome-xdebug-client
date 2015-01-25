(function() {

	chrome.app.runtime.onLaunched.addListener(function() {
		chrome.app.window.create("main.html", {
			width: 800,
		height: 800,
		type: "panel"
		});
	});

	// set default config values
	chrome.storage.local.get(null, function(data) {
		data.listening_ip || chrome.storage.local.set({"listening_ip": ""});
		data.listening_port || chrome.storage.local.set({"listening_port": "9000"});
		data.source_script || chrome.storage.local.set({"source_script": ""});
	});

})();


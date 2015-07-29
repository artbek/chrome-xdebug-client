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
		data.break_at_first_line || data.break_at_first_line === 0 || chrome.storage.local.set({"break_at_first_line": 1});
		data.shortcuts == btoa("{}") && chrome.storage.local.set({"shortcuts": "eyJzdGVwX291dF9mdW5jIjpbNzAsMF0sInN0ZXBfaW50byI6WzczLDBdLCJzdGVwX292ZXIiOls3OSwwXSwicnVuIjpbODIsMF0sInN0b3AiOls4MywwXSwibGlzdGVuIjpbNzYsMF0sImNsb3NlX3BvcHVwIjpbMjcsMF0sInN0ZXBfb3V0IjpbNjUsMF19"});
		data.shortcuts_disable || chrome.storage.local.set({"shortcuts_disable": 0});
	});

})();


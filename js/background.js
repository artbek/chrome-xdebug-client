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

	var st = chrome.storage.local;

	// set default config values
	st.get(null, function(data) {
		data.listening_ip || st.set({"listening_ip": "0.0.0.0"});
		data.listening_port || st.set({"listening_port": "9000"});
		data.source_script || st.set({"source_script": ""});
		data.lines_count || st.set({"lines_count": "50"});
		data.keep_listening || data.keep_listening === 0 || st.set({"keep_listening": 1});
		data.break_at_first_line || data.break_at_first_line === 0 || st.set({"break_at_first_line": 1});
		(! data.shortcuts || data.shortcuts == btoa("{}")) && st.set({"shortcuts": "eyJzdGVwX291dF9mdW5jIjpbNzAsMF0sInN0ZXBfaW50byI6WzczLDBdLCJzdGVwX292ZXIiOls3OSwwXSwicnVuIjpbODIsMF0sInN0b3AiOls4MywwXSwibGlzdGVuIjpbNzYsMF0sImNsb3NlX3BvcHVwIjpbMjcsMF0sInN0ZXBfb3V0IjpbNjUsMF19"});
		data.shortcuts_disable || st.set({"shortcuts_disable": 0});
		data.highlight_syntax || data.highlight_syntax === 0 || st.set({"highlight_syntax": 1});
		data.remember_breakpoints || data.remember_breakpoints === 0 || st.set({"remember_breakpoints": 1});
	});

})();


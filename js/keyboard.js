var Keyboard = (function() {

	var config_mode = false;
	var shortcuts = {};
	var settings_wrapper_selector = "#settings-shortcuts";

	var key_names = [];
	key_names[0x41] = "A";


	function get_key_name(key_code) {
		return key_names[key_code] || "key_code:" + key_code;
	}

	function remove_mapping(action_name) {
		delete shortcuts[action_name];
		publicMethods.refreshShortcuts();
	}

	function process_key_event(e) {
		if (config_mode) {
			shortcuts[config_mode] = e;
			publicMethods.refreshShortcuts();
			config_mode = false;
		} else {
			for (var action_name in shortcuts) {
				if (JSON.stringify(e) == JSON.stringify(shortcuts[action_name])) {
					Action.exec(action_name);
				}
			}
		}
	}

	function get_shortcut_string(action) {
		var s = shortcuts[action];
		if (s) {
			var shortcut_string = "";
			if (s.modifiers.ctrlKey) shortcut_string += "CTRL + ";
			if (s.modifiers.altKey) shortcut_string += "ALT + ";
			if (s.modifiers.shiftKey) shortcut_string += "SHIFT + ";
			shortcut_string += get_key_name(s.keyCode);
		}

		return shortcut_string;
	}


	function stringify(shortcuts_obj) {
		var minified = {};

		for (var s in shortcuts) {
			minified[s] = {
				k: shortcuts[s].keyCode,
				c: shortcuts[s].modifiers.ctrlKey * 1,
				a: shortcuts[s].modifiers.altKey * 1,
				s: shortcuts[s].modifiers.shiftKey * 1
			};
		}

		return JSON.stringify(minified);
	}


	function unstringify(shortcuts_string) {
		var unminified = {};

		var minified = JSON.parse(shortcuts_string);
		for (var i in minified) {
			unminified[i] = {
				keyCode: minified[i].k,
				modifiers: {
					ctrlKey: !!minified[i].c,
					altKey: !!minified[i].a,
					shiftKey: !!minified[i].s
				}
			};
		}

		return unminified;
	}


	/* PUBLIC */

	var publicMethods = {

		init: function() {
			shortcuts = unstringify(Config.get("shortcuts"));
			this.refreshShortcuts();

			$(function() {
				$("input").on("keyup", function(e) {
					e.stopPropagation();
				});
				$("#codeview, #eval-content, #stack").on("keyup keydown", function(e) {
					e.preventDefault();
				});
				$("body").on("keyup", function(e) {
					var ke = {
						keyCode: e.keyCode,
						modifiers: {
							ctrlKey: e.ctrlKey,
							altKey: e.altKey,
							shiftKey: e.shiftKey
						}
					};
					process_key_event(ke);
				});

				$(settings_wrapper_selector).on("click", ".key", function() {
					config_mode = $(this).attr("ref");
					$(this).addClass("undefined").text("Press a key...");
				});

				$(settings_wrapper_selector).on("click", ".key_remove", function() {
					var action_name = $(this).attr("ref");
					remove_mapping(action_name);
				});
			});
		},

		refreshShortcuts: function() {
			$(function() {
				var table = $(settings_wrapper_selector);
				table.html("");

				$("input[name=shortcuts]").val(stringify(shortcuts));

				var all_action_names = Action.getAllActionNames();
				for (var a in all_action_names) {
					var tr = $("<tr/>");
					tr.append('<td class="action_label">' + a + "</td>");
					var key_name = get_shortcut_string(a);
					if (key_name) {
						tr.append('<td ref="' + a + '" class="key">' + key_name + "</td>");
						tr.append('<td ref="' + a + '" class="key_remove">x</td>');
					} else {
						tr.append('<td ref="' + a + '" class="key undefined">--- undefined ---</td>');
						tr.append('<td ref="' + a + '" class="key_remove"></td>');
					}
					table.append(tr);
				}
			});
		}

	}

	return publicMethods;

})();


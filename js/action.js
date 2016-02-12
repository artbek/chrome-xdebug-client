var Action = (function() {

	var actions = {

		step_out: {
			callback: function() {
				$("#stepout").trigger("click");
			}
		},

		step_out_func: {
			callback: function() {
				$("#break-on-return").trigger("click");
			}
		},

		step_into: {
			callback: function() {
				$("#stepinto").trigger("click");
			}
		},

		step_over: {
			callback: function() {
				$("#stepover").trigger("click");
			}
		},

		run: {
			callback: function() {
				$("#run").trigger("click");
			}
		},

		stop: {
			callback: function() {
				$("#stop").trigger("click");
			}
		},

		listen: {
			callback: function() {
				$("#listen").trigger("click");
			}
		},

		close_popup: {
			callback: function() {
				$(".user-closable").trigger("click");
			}
		},

		toggle_watches: {
			callback: function() {
				$("#watches").trigger("click");
			}
		},

		toggle_backtrace: {
			callback: function() {
				$("#stack").trigger("click");
			}
		},

		toggle_inspector: {
			callback: function() {
				$("#eval").trigger("click");
			}
		},

		scroll_to_active_line: {
			callback: function() {
				$("#scroll-to-active-line").trigger("click");
			}
		},

	};


	var publicMethods = {

		exec: function(action_name) {
			var a = actions[action_name];
			if (a) {
				a.callback();
			}
		},

		getAllActionNames: function() {
			return actions;
		}

	}

	return publicMethods;

})();



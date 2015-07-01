var Action = (function() {

	var actions = {

		step_into: {
			callback: function() {
				console.log('step into step into');
			}
		},

		step_over: {
			callback: function() {
				console.log('step over step over');
			}
		}

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



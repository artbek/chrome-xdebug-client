var Keyboard = (function() {

	var key_code_mapping = [];
	key_code_mapping[0x41] = "A";

	var shortcut_event_mapping = [

		{
			keyCode: 65,
			modifiers: {
				ctrlKey: false,
				altKey: false,
				shiftKey: false,
			},
			callback: function() {
			}
		}

	];


	function processKeyEvent(e) {
		console.log(e);
	}


	var publicMethods = {

		init: function() {
			$("body").on("keyup", function(event) {
				var ke = {
					keyCode: event.keyCode,
					modifiers: {
						ctrlKey: event.ctrlKey,
						altKey: event.altKey,
						shiftKey: event.shiftKey
					}
				};
				processKeyEvent(ke);
			});
		}

	}

	return publicMethods;

})();


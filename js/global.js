var Global = (function() {

	var isProcessing = false;


	var publicMethods = {

		run: function(callback) {
			if (this.isProcessing()) {
				return;
			} else {
				Alert.busy("Working...");
				callback();
			}
		},

		isProcessing: function() {
			return isProcessing;
		},

		setProcessing: function() {
			isProcessing = true;
			$("#processing-indicator").addClass("busy");
		},

		unsetProcessing: function() {
			isProcessing = false;
			$("#processing-indicator").removeClass("busy");
		},

		fileNameCurrentlyLoaded: '',

		getOptFromString: function(option, string) {
			var value = '';
			var matches = string.match(new RegExp(" -" + option + " ([^\\s]+)"));
			if (matches && matches[1]) {
				value = matches[1];
			}

			return value;
		}

	}

	return publicMethods;

})();


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
		},

		setWindowTitle: function(string, isFilePath) {
			var windowTitle = string || chrome.runtime.getManifest().name;

			if (isFilePath) {
				var appName = chrome.runtime.getManifest().name;
				var basenameRegEx = new RegExp("/([^/:]+):\\d+$");
				var baseName = string.match(basenameRegEx);
				if (baseName) {
					var dirName = string.substr(0, string.lastIndexOf("/"));
					windowTitle = baseName[1] + " (" + dirName + ")";
				}
			}

			document.title = windowTitle;
		}

	}

	return publicMethods;

})();


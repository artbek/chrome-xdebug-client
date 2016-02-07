var Global = (function() {

	var isProcessing = false;

	function _dbgp_format(property) {
		var output = '';

		var type = property.attr("type");

		switch (type) {
			case "string":
				output = atob(property.text());
				break;

			case "int":
			case "float":
				output = property.text();
				break;

			case "array":
			case "object":
			default:
				output = property.attr("type");
				break;
		}

		return output;
	}


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
		sourceCodeMap: null,

		clearSourceCodeMap: function() {
			this.sourceCodeMap = [];
		},

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
		},

		dbgpFormat: function(xml) {
			var formatted = '';
			var property = $(xml).find("property");

			if (property.length) {
				formatted = _dbgp_format(property);
			} else {
				var error_message = $(xml).find("error message").text()
				formatted = "OOPSY DAISY... " + error_message;
			}

			return formatted;
		},

		log: function(msg) {
			var t = new Date();
			console.debug(msg + ": " + t.getSeconds() + "." + t.getMilliseconds());
		}

	}

	return publicMethods;

})();


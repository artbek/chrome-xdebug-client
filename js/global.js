var Global = (function() {

	var isProcessing = false;

	var publicMethods = {

		isProcessing: function() {
			return isProcessing;
		},

		setProcessing: function() {
			isProcessing = true;
		},

		unsetProcessing: function() {
			isProcessing = false;
		}

	}

	return publicMethods;

})();


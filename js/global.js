var Global = (function() {

	var isProcessing = false;
	var breakpointToDelete = false;


	var publicMethods = {

		isProcessing: function() {
			return isProcessing;
		},

		setProcessing: function() {
			isProcessing = true;
		},

		unsetProcessing: function() {
			isProcessing = false;
		},

		addBreakpointToDelete: function(breakpointId) {
			breakpointToDelete = breakpointId;
		},

		getBreakpointToDelete: function() {
			return breakpointToDelete;
		},

		clearBreakpointToDelete: function() {
			breakpointToDelete = false;
		}

	}

	return publicMethods;

})();


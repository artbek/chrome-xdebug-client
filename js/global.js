var Global = (function() {

	var isProcessing = false;
	var breakpointToDelete = false;


	var publicMethods = {

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


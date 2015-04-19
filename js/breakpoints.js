var Breakpoints = (function() {

	var store = {};

	var publicMethods = {

		options: {
			breakpoint: null
		},

		getFromLineNo: function(lineno) {
			for (var id in store) {
				if (store[id].lineno == lineno) {
					return {
						id: id.substring(1),
						filename: store[id].filename,
						lineno: store[id].lineno,
						condition: store[id].condition,
						hitValue: store[id].hitValue,
						operator: store[id].operator
					}
				}
			}
		},

		getAll: function() {
			return store;
		},

		set: function(data) {
			store["b" + data.id] = {
				filename: data.filename,
				lineno: data.lineno,
				condition: data.condition,
				hitValue: data.hitValue,
				operator: data.operator
			};
		},

		unset: function(breakpoint_id) {
			delete store["b" + breakpoint_id];
		},

		clear: function() {
			store = {};
		},

		highlight: function() {
			$(".lineno.breakpoint").removeClass("breakpoint");
			for (var id in store) {
				if (store.hasOwnProperty(id)) {
					if (store[id].filename == Global.fileNameCurrentlyLoaded) {
						$(".lineno[data-lineno='" + store[id].lineno + "']")
							.addClass("breakpoint")
							.data("breakpoint_id", id);
					}
				}
			}
		},

		showOptions: function(lineNo) {
			this.hideOptions();
			this.options.breakpoint = this.getFromLineNo(lineNo);
			$("#breakpoint-condition").val(this.options.breakpoint.condition);
			$("#breakpoint-condition").trigger("focus");
			$("#breakpoint-options-form span.breakpoint-id")
				.text("[Line #" + this.options.breakpoint.lineno + "]");
			$("[name=bp-hit-operator][value='" + this.options.breakpoint.operator + "']")
				.prop("checked", true);
			$("#breakpoint-hit-count").val(this.options.breakpoint.hitValue);
			$("#breakpointOptions").show();
		},

		hideOptions: function() {
			$("#breakpointRemove").data("id", "");
			$("#breakpointOptions").hide();
		}

	}

	return publicMethods;

})();


var Breakpoints = (function() {

	var store = {};

	$(function() {

		$("#breakpoints-remove-all").on("click", function(e) {
			e.preventDefault();
			publicMethods.removeAll();
		});

		$("#tab-breakpoints-content").on("click", ".js-bp-remove", function(e) {
			e.preventDefault();
			var id = $(this).data("id");
			Global.run(function() {
				$("body").trigger("xdebug-breakpoint_remove", { breakpoint_id: id });
			});
		});

	});

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

		getInternalStorage: function() {
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

		removeAll: function() {
			$("body").trigger("xdebug-breakpoint_remove_all");
			this.clearInternalStorage();
			this.highlight();
		},

		clearInternalStorage: function() {
			store = {};
		},


		highlight: function() {
			var html = "";
			$(".lineno.breakpoint").removeClass("breakpoint");
			for (var id in store) {
				if (store.hasOwnProperty(id)) {
					var s = store[id];

					var filename = s.filename.substr(s.filename.lastIndexOf("/") + 1);
					var trunc_after = 20;
					var condition_truncated = s.condition.substr(0, trunc_after);
					if (s.condition.length > trunc_after) condition_truncated += "...";
					html += "<tr>";
					html += "<td>" + s.lineno + "</td>";
					html += "<td title='" + s.filename + "'>" + filename + "</td>";
					html += "<td>" + (s.hitValue ? s.operator + " " + s.hitValue : "-") + "</td>";
					html += "<td title='" + s.condition + "'>" + condition_truncated + "</td>";
					html += '<td><img src="img/bin.png" class="js-bp-remove" data-id="' + id.substr(1) + '" /></td>';
					html += "</tr>";

					if (store[id].filename == Global.fileNameCurrentlyLoaded) {
						$(".lineno[data-lineno='" + s.lineno + "']")
							.addClass("breakpoint")
							.data("breakpoint_id", id)
						;
					}
				}
			}

			if (! html) html = '<tr><td colspan="5">No breakpoints set.</td></tr>';
			$("#tab-breakpoints-content tbody").html(html);
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


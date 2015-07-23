var Watches = (function() {

	var watches = [];
	var watches_line_selector;


	var publicMethods = {

		init: function() {
			watches_line_selector = "form.watches-line";

			$(watches_line_selector + " input[name=input]").on("focus", function(e) {
				$(this).removeClass("blurred");
			});

			$(watches_line_selector + " input[name=input]").on("blur", function(e) {
				$(this).addClass("blurred");
				$(watches_line_selector).trigger("submit", true);
			});

			$(watches_line_selector).on("submit", function(e, dontBlur) {
				e.preventDefault();
				var $watch_line = $(this).find("[name=input]");
				var expression = $watch_line.val();
				var watch_id = $watch_line.closest(watches_line_selector).data("id");
				watches[watch_id] = {
					id: watch_id,
					expression: expression,
					value: ''
				};
				if (! dontBlur) $(this).find("[name=input]").trigger("blur");
				Watches.refresh();
			});
		},

		refresh: function() {
			$(watches_line_selector + " .output").text("...");
			$("body").trigger("xdebug-eval-watches");
		},

		update: function(id, value) {
			watches[id].value = value;
		},

		get: function(id) {
			return watches[id];
		},

		display: function() {
			for (var id in watches) {
				$(watches_line_selector + "[data-id=" + id + "] .output").text(this.get(id).value);
			}
		},

		getAllValid: function() {
			var valid = [];
			var temp = watches.slice();
			for (var w in temp) {
				if (temp[w].expression.trim()) {
					valid.push(temp[w]);
				} else {
					watches[temp[w].id].value = "...";
				}
			}

			return valid;
		}

	}

	return publicMethods;

})();


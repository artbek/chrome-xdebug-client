var Alert = (function() {

	$(function() {
		$("#alert").on("click", function() {
			if ($(this).hasClass("user-closable")) {
				publicMethods.hide();
			}
		});
	});

	var publicMethods = {

		hide: function() {
			Global.unsetProcessing();

			$(function() {
				$("#alert").hide();
			});
		},

		show: function(message, type) {
			Global.setProcessing();

			$(function() {
				$("#alert")
					.hide()
					.removeClass() // all classes
					.addClass("popup")
					.addClass(type)
					.addClass("user-closable")
				;

				$("#alert .alert-message").text(message);

				if (type == "busy") {
					$("#alert").removeClass("user-closable");
				}

				$("#alert").show();
			});
		},

		busy: function(message) {
			this.show(message, "busy");
		},

		info: function(message) {
			this.show(message, "info");
		},

		warn: function(message) {
			this.show(message, "warn");
		}

	}

	return publicMethods;

})();


var ChangeLog = (function() {

	var log = [

		{
			version: 1.9,
			changes: [
				[
					"Persistent listening.",
					"This is useful when your code spawns new PHP processes e.g. HTTP redirect.",
					"You can disable the feature in settings."
				],
				[
					"Change Log.",
					"When a new features are added the version number in the nav will change colour.",
					"You can click on the version number to see the lastest changes."
				]
			]
		}

	];


	$(function() {
		$("#changelog").on("click", function() {
			if ($(this).hasClass("user-closable")) {
				publicMethods.hide();
			}
		});
	});


	var publicMethods = {

		hide: function() {
			Global.unsetProcessing();

			$(function() {
				$("#changelog").hide();
			});
		},

		show: function() {
			Global.setProcessing();
			Config.set("last_seen_version", this.getCurrentVersion());
			this.refreshButton();

			$(function() {
				var log_content = $("#changelog-content").html("");
				for (i in log) {
					var temp_html = '<div class="version">';
					temp_html += '<div class="version-number">' + log[i].version + '</div>';
					for (c in log[i].changes) {
						temp_html += '<div class="change-title">' + log[i].changes[c][0] + "</div>";
						for (var d = 1; d < log[i].changes[c].length; d++) {
							temp_html += '<div class="change-description">' + log[i].changes[c][d] + "</div>";
						}
					}
					temp_html += '</div>';
					log_content.append($("<div/>").html(temp_html));
				}

				$("#changelog").show();
			});
		},

		getCurrentVersion: function() {
			return chrome.runtime.getManifest().version;
		},

		getLastSeenVersion: function() {
			return Config.get("last_seen_version");
		},

		refreshButton: function() {
			$("#changelog-button")
				.removeClass("draw-attention")
				.text("v" + this.getCurrentVersion());

			if (this.getLastSeenVersion() < this.getCurrentVersion()) {
				$("#changelog-button").addClass("draw-attention");
			}
		}

	}

	return publicMethods;

})();


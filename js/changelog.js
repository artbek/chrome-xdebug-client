var ChangeLog = (function() {

	var log = [

		{
			version: "2.3",
			date: "June 2015",
			changes: [
				[
					"Break at first line",
					"New option in settings. When disabled xdebug will break at first breakpoint, instead of first line of script as it is now."
				],
				[
					"Source code padding",
					"Just a way prevent code from getting hidden behind the popups."
				],
				[
					"Watches",
					"Crude (beta) implementation."
				]
			]
		},

		{
			version: "2.2",
			date: "May 2015",
			changes: [
				[
					"Mostly cosmetic changes",
					"Less annoying console history. More user friendly conditional breakpoints popup. Current file name and status in the window title bar (Linux only)."
				]
			]
		},

		{
			version: "2.1",
			date: "April 2015",
			changes: [
				[
					"Conditional breakpoints",
					"Pause code execution when expression evaluates true or/and when set hit count is reached."
				]
			]
		},

		{
			version: "2.0",
			date: "",
			changes: [
				[
					"Step Out (func)",
					"No more annoying popups - works just like 'Step Out' except for the scope of operation."
				],
				[
					"Bug fixes",
					"Visual line breakpoints not cleared when persistent listening is on.",
					"More useful messages when couldn't evaluate expression.",
					"Illegible change log popup.",
					"Last seen version reset when saving settings."
				]
			]
		},

		{
			version: "1.9",
			date: "",
			changes: [
				[
					"Persistent listening.",
					"This is useful when your code spawns new PHP processes e.g. HTTP redirect.",
					"You can disable persistent listening in settings."
				],
				[
					"Change Log.",
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
					var version_copy = log[i].version + ' (' + log[i].date + ')';
					temp_html += '<div class="version-number">' + version_copy + '</div>';
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
				.css("transform", "rotate(0deg)")
				.removeClass("draw-attention")
				.text("v" + this.getCurrentVersion());

			if (this.getLastSeenVersion() < this.getCurrentVersion()) {
				$("#changelog-button").addClass("draw-attention");
			}
		}

	}

	return publicMethods;

})();


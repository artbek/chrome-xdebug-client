$(function() {

	var linesCount = 50;
	var breakpoints = {};

	var filename = '';
	var filename_currently_loaded = '';
	var lineno = 0;


	/* SETTINGS */

	$(window).on("load", function() {
		$("input").removeClass("error");

		configErrors = Config.errors();
		if (configErrors.length) {
			enableNav(false);
			for (i in configErrors) {
				$("#settings input[name=" + configErrors[i] + "]").addClass("error");
				$("#settings-popup-button").addClass("error");
			}
		} else {
			$('body').trigger('socket_status', {status: 'dead'});
		}
	});

	$("body").on('socket_status', function(event, data) {
		switch (data.status) {
			case "live":
				enableNav(true);
				$("#listen").addClass("inactive");
				$("#listen").text("RUNNING...");
				break;

			case "dead":
				enableNav(false);
				$("#listen").removeClass("inactive");
				$("#listen").text("LISTEN");
				breakpoints = {};
				break;
		}
	});

	$("#settings-popup-button").on("click", function() {
		var configValues = Config.get();
		for (var prop in configValues) {
			$("#settings [name=" + prop + "]").val(configValues[prop]);
		}
		$("#settings").toggle();
	});

	$("#settings-save").on("click", function() {
		Config.saveFromForm($("#settings").serializeArray());
		chrome.runtime.reload(); // reload app
		$("#settings").hide();
	});


	/* NAV */

	$("#stepinto").on("click", function() {
		isInactive($(this)) || run(function() {
			$("body").trigger("xdebug-step_into");
		});
	});

	$("#stepover").on("click", function() {
		isInactive($(this)) || run(function() {
			$("body").trigger("xdebug-step_over");
		});
	});

	$("#stepout").on("click", function() {
		isInactive($(this)) || run(function() {
			$("body").trigger("xdebug-step_out");
		});
	});

	$("#run").on("click", function() {
		isInactive($(this)) || run(function() {
			$("body").trigger("xdebug-run");
		});
	});

	$("#stop").on("click", function() {
		// 'Stop' action should ignore 'isProcessing' flag.
		isInactive($(this)) || $("body").trigger("xdebug-stop");
	});

	$("#listen").on("click", function() {
		isInactive($(this)) || run(function() {
			clearCodeView();
			$("body").trigger("xdebug-listen");
		});
	});

	$("#break-on-return").on("click", function() {
		isInactive($(this)) || run(function() {
			$("body").trigger("xdebug-breakpoint_set-return");
		});
	});

	$("body").on("click", ".lineno", function() {
		var self = $(this);
		if (self.hasClass("breakpoint")) {
			run(function() {
				$("body").trigger("xdebug-breakpoint_remove", {
					breakpoint_id: self.data("breakpoint_id").substring(1) // remove first letter
				});
			});
		} else {
			run(function() {
				$("body").trigger("xdebug-breakpoint_set", {
					lineno: self.data("lineno"),
					type: "line",
					filename: filename_currently_loaded
				});
			});
		}
	});

	jQuery.expr[":"].containsi = jQuery.expr.createPseudo(function(arg) {
		return function(elem) {
			return jQuery(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
		};
	});

	$("#find-in-source").on("keyup", function(e) {
		var search_string = $(this).val();
		var elements = $(".codeline pre:containsi(" + search_string + ")");

		// clear all highlighted search results
		$(".codeline pre").each(function() {
			$(this).html($(this).text());
		});

		// highlight search results
		elements.each(function() {
			var r = new RegExp("(" + search_string + ")", "gi");
			$(this).html($(this).text().replace(r, "<em>$1</em>"));
		});

		// don't reset if <ENTER> pressed
		if (e.keyCode != 13) {
			$(this).data("search-result-index", 0);
		}

		var search_result_index = $(this).data("search-result-index");

		// scroll to view and emphasize
		scrollToView(elements.get(search_result_index));
		$(elements.get(search_result_index)).find("em").addClass("active");

		// rotate index
		search_result_index++;
		if (search_result_index >= elements.length) {
			search_result_index = 0;
		}
		$(this).data("search-result-index", search_result_index);
	});


	/* STACK & CONSOLE */

	$("#eval-form").on("submit", function(e) {
		e.preventDefault();
		var expression = $("input[name=eval-expression]").val();
		expression = "var_export(" + expression + ", true)";
		expression = btoa(expression);
		$("body").trigger("xdebug-eval", {
			expression: expression
		});
	});

	// don't hide eval console when trying to type or select
	$("#eval-form, #stack-filenames, #eval-content").on("click", function(e) {
		e.stopPropagation();
	});

	$("#stack, #eval").on("click", function() {
		if ($(this).hasClass("popup-is-open")) {
			$(this).removeClass("popup-is-open");
		} else {
			$(this).addClass("popup-is-open");
		}

		$("body").trigger("refresh-popups");
	});

	$("body").on("refresh-popups", function() {
		refreshPopup("#stack");
		refreshPopup("#eval");
	});

	$(window).on("load resize", function() {
		$("body").trigger("refresh-popups");
	});


	/* XDEBUG CALLBACKS */

	$("body").on('parse-xml', function(event, data) {

		var xml_document = $.parseXML(data.xml);
		Alert.hide();

		switch (data.command) { /* SWITCH - START */

			case "feature_set":
				break;

			case "eval":
				var property = $(xml_document).find("property");
				if (property) {
					property = format(property);
					$("#eval-content").text(property);
				}
				break;

			// used when getting source from xdebug
			case "source":
				var offset = parseInt(data.options.split(" ")[1]) - 1;

				var sourceCode = $(xml_document).find("response").text();
				sourceCode = atob(sourceCode);

				populateCodeView(sourceCode, offset);

				run(function() {
					$("body").trigger("xdebug-stack_get");
				});
				break;

			case "stack_get":
				var stack_trace = [];
				$(xml_document).find('response').children().each(function() {
					stack_trace.push($(this).attr("filename") + ":" + $(this).attr("lineno"));
				});

				var stack_trace_html = "";
				for (var i = 0; i < stack_trace.length; i++) {
					if (i == 0) {
						stack_trace_html += '<div class="filename"><b>' + stack_trace[i] + '</b></div>';
					} else {
						stack_trace_html += '<div class="filename">' + stack_trace[i] + '</div>';
					}
				}
				$("#stack-filenames").html(stack_trace_html);

				break;

			case "stop":
				break;

			case "breakpoint_set":
				var breakpoint_id = $(xml_document).find("response").attr("id");
				var breakpoint_lineno = data.options.split(" ").pop();

				if (parseInt(breakpoint_lineno)) {
					breakpoints["b" + breakpoint_id] = {
						filename: filename_currently_loaded,
						lineno: breakpoint_lineno
					};
					highlightBreakpoints();
				}

				break;

			case "breakpoint_remove":
				var breakpoint_id = data.options.split(" ").pop();
				delete breakpoints["b" + breakpoint_id];
				highlightBreakpoints();
				break;

			default:
				if ($(xml_document).find("response").attr("status") == 'stopping') {
					$("body").trigger("xdebug-stop");
				} else {
					filename = $(xml_document).find('response').children().attr("filename");
					lineno = $(xml_document).find('response').children().attr("lineno");
					console.log("File: " + filename + ":" + lineno);
					if (filename) refreshSourceView();
				}

		} /* SWITCH - END */


	});



	/* HELPERS */

	function refreshSourceView() {

		if (Config.get("source_script")) {

			if (filename_currently_loaded == filename) {

				$(".line-wrapper.active-line").removeClass("active-line");
				$(".lineno[data-lineno=" + lineno + "]").closest(".line-wrapper").addClass("active-line");
				scrollToView();

			} else {

				$.ajax({
					url: Config.get("source_script"),
					type: 'GET',
					data: {
						path: filename
					},

					beforeSend: function() {
						console.log("Getting source from: " + Config.get("source_script"));
					},

					success: function(data) {
						populateCodeView(data);
					},

					error: function(data) {
						clearCodeView();
						$("#codeview").append("<p>Couldn't get source:</p>");
						$("#codeview").append("<p><strong>" + filename + ":" + lineno + "</strong></p>");
						console.error("Couldn't get source!");
					},

					complete: function() {
						run(function() {
							$("body").trigger("xdebug-stack_get");
						});
					}

				});

			}

		} else {

			run(function() {
				$("body").trigger("xdebug-source", {
					filename: filename,
					lineno: lineno,
					linesCount: linesCount
				});
			});

		}

	}


	function populateCodeView(data, offset) {
		var lines = data.split('\n');
		clearCodeView();

		if (! offset) offset = 0;

		for (var l = 0; l < lines.length; l++) {
			var html = "";
			var currentLineNo = l + offset;
			if (currentLineNo == (lineno - 1)) {
				html += '<div class="line-wrapper active-line">';
			} else {
				html += '<div class="line-wrapper">';
			}
			var html_lineno = currentLineNo + 1;
			html +=	'<span class="lineno" data-lineno="' + html_lineno + '">' + html_lineno + '</span>';
			html += '<span class="codeline"><pre>' + htmlEntities(lines[l]) + '</pre></span>';
			html += '</div>';
			$("#codeview").append(html);
		}

		filename_currently_loaded = filename;
		highlightBreakpoints();
		scrollToView();
		$("body").trigger("refresh-popups");
	}


	function clearCodeView() {
		$("#codeview").html("");
	}


	function refreshPopup(popup) {
		var $popup = $(popup);
		var bodyWidth = $("body").width();
		var offset = 20;

		if ($popup.hasClass("popup-is-open")) {
			$popup.stop(true, false).animate({left: '0' + offset, width: bodyWidth - offset}, 300);
		} else {
			var padding = parseInt($popup.css("padding-left").replace("px", ""));
			$popup.stop(true, false).animate({left: (bodyWidth - padding), width: bodyWidth - offset}, 300);
		}
	}


	function htmlEntities(s) {
		return $("<div/>").text(s).html();
	}



	function format(property) {
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


	function run(callback) {
		if (Global.isProcessing()) {
			return;
		} else {
			Alert.busy("Working...");
			callback();
		}
	}


	function highlightBreakpoints() {
		$(".lineno.breakpoint").removeClass("breakpoint");
		for (var id in breakpoints) {
			if (breakpoints.hasOwnProperty(id)) {
				if (breakpoints[id].filename == filename_currently_loaded) {
					$(".lineno[data-lineno='" + breakpoints[id].lineno + "']")
						.addClass("breakpoint")
						.data("breakpoint_id", id);
				}
			}
		}
	}


	// active_line - native DOM element (not jQuery object)
	function scrollToView(active_line) {
		var margin = 100;
		var scrollTop = $(window).scrollTop();

		if (! active_line) {
			var elements = document.getElementsByClassName("active-line");
			if (elements[0]) {
				active_line = elements[0];
			}
		}

		// do nothing if element not found
		if (! active_line) return;

		if (
				// hidden 'above' the screen
				$(active_line).offset().top < (scrollTop + margin) ||
				// hidden 'below' the screen
				$(active_line).offset().top > (scrollTop + $(window).height() - margin)
		) {
			active_line.scrollIntoView(false);
			var currentScroll = $("body").scrollTop();

			var scroll_to_point = currentScroll + $(window).height() / 2;
			if ($(active_line).offset().top > scroll_to_point) {
				$("body").scrollTop(scroll_to_point);
			}
		}
	}


	function isInactive($obj) {
		return $obj.hasClass("inactive");
	}


	function enableNav(enabled) {
		if (enabled) {
			$(".nav-button").removeClass("inactive");
		} else {
			$(".nav-button").addClass("inactive");
		}
	}

});

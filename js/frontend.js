$(function() {

	/* SETUP */

	var source_script = '';
	chrome.storage.local.get('source_script', function(data) {
		source_script = data.source_script;
	});
	var isProcessing = false;
	var breakpoints = {};

	var filename = '';
	var filename_currently_loaded = '';
	var lineno = 0;


	/* NAV */

	$("#stepinto").on("click", function() {
		run(function() {
			$("body").trigger("xdebug-step_into");
		});
	});

	$("#stepover").on("click", function() {
		run(function() {
			$("body").trigger("xdebug-step_over");
		});
	});

	$("#stepout").on("click", function() {
		run(function() {
			$("body").trigger("xdebug-step_out");
		});
	});

	$("#run").on("click", function() {
		run(function() {
			$("body").trigger("xdebug-run");
		});
	});

	$("#stop").on("click", function() {
		// 'Stop' action should ignore 'isProcessing' flag.
		$("body").trigger("xdebug-stop");
	});

	$("#listen").on("click", function() {
		run(function() {
			$("body").trigger("xdebug-listen");
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
					filename: filename_currently_loaded
				});
			});
		}
	});


	/* STACK & CONSOLE */

	$("#settings-popup").on("click", function() {
		chrome.storage.local.get('listening_ip', function(data) {
			$("[name=settings__listening_ip]").val(data.listening_ip);
		});
		chrome.storage.local.get('source_script', function(data) {
			$("[name=settings__source_script]").val(data.source_script);
		});
		$("#settings").toggle();
	});

	$("#settings-save").on("click", function() {
		var listening_ip_val = $("[name=settings__listening_ip]").val();
		var source_script_val = $("[name=settings__source_script]").val();

		chrome.storage.local.set({'source_script': source_script_val});
		chrome.storage.local.set({'listening_ip': listening_ip_val});
		chrome.runtime.reload(); // reload app

		$("#settings").hide();
	});


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

	$("body").on('socket_status', function(event, data) {
		switch (data.status) {

		case "live":
			$("#listen").fadeTo(100, 0.2).text("Running...");
			$("#stop").fadeTo(100, 1.0);
			break;

		case "dead":
			$("#listen").fadeTo(100, 1.0).text("Listen");
			$("#stop").fadeTo(100, 0.2);
			breakpoints = {};
			break;

		}
	});


	$("body").on('parse-xml', function(event, data) {

		hideLoading();

		var xml_document = $.parseXML(data.xml);

		switch (data.command) { /* SWITCH - START */

		case "feature_set":
			isProcessing = false;
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
			var data = $(xml_document).find("response").text();
			data = atob(data);

			var b = Math.max((lineno - 30), 1);
			var offset = lineno - b;

			var lines = data.split('\n');
			$("#codeview").html("");
			for (var line = 0; line < lines.length; line++) {
				var html = "";
				if (line == offset) {
					html += '<div class="line-wrapper active-line">';
				} else {
					html += '<div class="line-wrapper">';
				}
				html +=	'<span class="lineno">' + (b + line) + '</span>';
				html += '<span class="codeline"><pre>' + htmlEntities(lines[line]) + '</pre></span>';
				html += '</div>';
				$("#codeview").append(html);
			}

			scrollToView();
			isProcessing = false;
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

			isProcessing = false;
			break;

		case "stop":
			isProcessing = false;
			break;

		case "breakpoint_set":
			isProcessing = false;
			var breakpoint_id = $(xml_document).find("response").attr("id");
			var breakpoint_lineno = data.options.split(" ").pop();
			breakpoints["b" + breakpoint_id] = {
				filename: filename_currently_loaded,
				lineno: breakpoint_lineno
			};
			highlightBreakpoints();
			break;

		case "breakpoint_remove":
			isProcessing = false;
			var breakpoint_id = data.options.split(" ").pop();
			delete breakpoints["b" + breakpoint_id];
			highlightBreakpoints();
			break;

		default:
			if ($(xml_document).find("response").attr("status") == 'stopping') {
				isProcessing = false;
				$("body").trigger("xdebug-stop");
			} else {
				filename = $(xml_document).find('response').children().attr("filename");
				lineno = $(xml_document).find('response').children().attr("lineno");
				console.log("File: " + filename + ":" + lineno);
				if (filename) refreshSourceView();
				isProcessing = false;
			}

		} /* SWITCH - END */

	});


	/* HELPERS */

	function refreshSourceView() {

		if (filename_currently_loaded == filename) {

			isProcessing = false;
			$(".line-wrapper.active-line").removeClass("active-line");
			$(".lineno[data-lineno=" + lineno + "]").closest(".line-wrapper").addClass("active-line");
			scrollToView();

		} else {

			$.ajax({
				url: source_script,
				type: 'GET',
				data: {
					path: filename
				},

				beforeSend: function() {
					console.log("Getting source from: " + source_script);
				},

				success: function(data) {
					var lines = data.split('\n');
					$("#codeview").html("");

					for (var l = 0; l < lines.length; l++) {
						var html = "";
						if (l == (lineno - 1)) {
							html += '<div class="line-wrapper active-line">';
						} else {
							html += '<div class="line-wrapper">';
						}
						html +=	'<span class="lineno" data-lineno="' + (l + 1) + '">' + (l + 1) + '</span>';
						html += '<span class="codeline"><pre>' + htmlEntities(lines[l]) + '</pre></span>';
						html += '</div>';
						$("#codeview").append(html);
					}

					highlightBreakpoints();
					scrollToView();
					$("body").trigger("refresh-popups");
					filename_currently_loaded = filename;
				},

				error: function(data) {
					$("#codeview").html("");
					$("#codeview").append("<p>Couldn't get source:</p>");
					$("#codeview").append("<p><strong>" + filename + ":" + lineno + "</strong></p>");
					console.error("Couldn't get source!");
				},

				complete: function() {
					isProcessing = false;
					run(function() {
						$("body").trigger("xdebug-stack_get");
					});
				}

			});

		}

		/*
		 $("body").trigger("xdebug-source", {
		 filename: filename,
		 lineno: lineno
		 });
	 */
	}


	function refreshPopup(popup) {
		var $popup = $(popup);
		var bodyWidth = $("body").width();
		var offset = 20;

		if ($popup.hasClass("popup-is-open")) {
			$popup.animate({left: '0' + offset, width: bodyWidth - offset}, 300);
		} else {
			var padding = parseInt($popup.css("padding-left").replace("px", ""));
			$popup.animate({left: (bodyWidth - padding), width: bodyWidth - offset}, 300);
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
		if (isProcessing) {
			return;
		} else {
			showLoading();
			isProcessing = true;
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


	function scrollToView() {
		var margin = 100;
		var scrollTop = $(window).scrollTop();
		var elements = document.getElementsByClassName("active-line");

		if (elements[0]) {
			var active_line = elements[0];
		} else {
			return;
		}

		if (
				// hidden 'above' the screen
				$(active_line).offset().top < (scrollTop + margin) ||
				// hidden 'below' the screen
				$(active_line).offset().top > (scrollTop + $(window).height() - margin)
		) {
			active_line.scrollIntoView(false);
			var currentScroll = $("body").scrollTop();
			$("body").scrollTop(currentScroll + $(window).height() / 2);
		}
	}


	function showLoading() {
		$("#loading").show();
	}


	function hideLoading() {
		$("#loading").hide();
	}

});

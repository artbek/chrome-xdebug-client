$(function() {

	var filename = '';
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

		ChangeLog.refreshButton();
		Watches.init();
		Keyboard.init();
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
				Breakpoints.clear();
				Global.setWindowTitle();
				break;
		}
	});

	$("#settings-popup-button").on("click", function() {
		var configValues = Config.get();
		var configTypes = Config.getType();
		for (var prop in configValues) {
			if (configTypes[prop] == "text") {
				$("#settings [name=" + prop + "]").val(configValues[prop]);
			} else if (configTypes[prop] == "checkbox") {
				$("#settings [name=" + prop + "]").prop("checked", configValues[prop]);
			}
		}
		$("#settings").slideToggle(200);
	});

	$("#settings-save").on("click", function() {
		Config.saveFromForm($("#settings").serializeArray());
		chrome.runtime.reload(); // reload app
		$("#settings").hide();
	});

	$(".accordion .tab-link :first").addClass("active");
	$(".accordion .tab-content").not(":first").each(function() {
		$(this).hide();
	});

	$(".accordion .tab-link").on("click", function() {
		$(this).closest(".accordion").find(".tab-content").slideUp(250);
		$(this).next(".tab-content").slideDown(250);

		$(this).closest(".accordion").find(".tab-link").removeClass("active");
		$(this).addClass("active");
	});

	$("#changelog-button").on("click", function() {
		ChangeLog.show();
	});


	/* NAV */

	$("#stepinto").on("click", function() {
		isInactive($(this)) || Global.run(function() {
			$("body").trigger("xdebug-step_into");
		});
	});

	$("#stepover").on("click", function() {
		isInactive($(this)) || Global.run(function() {
			$("body").trigger("xdebug-step_over");
		});
	});

	$("#stepout").on("click", function() {
		isInactive($(this)) || Global.run(function() {
			$("body").trigger("xdebug-step_out");
		});
	});

	$("#run").on("click", function() {
		isInactive($(this)) || Global.run(function() {
			$("body").trigger("xdebug-run");
		});
	});

	$("#stop").on("click", function() {
		// 'Stop' action should ignore 'isProcessing' flag.
		isInactive($(this)) || $("body").trigger("xdebug-stop");
	});

	$("#listen").on("click", function() {
		isInactive($(this)) || Global.run(function() {
			clearCodeView();
			$("body").trigger("xdebug-listen");
		});
	});

	$("#break-on-return").on("click", function() {
		isInactive($(this)) || Global.run(function() {
			$("body").trigger("xdebug-breakpoint_set-return");
		});
	});

	$("body").on("click", ".lineno", function() {
		var self = $(this);
		Breakpoints.hideOptions();

		var breakpoint = Breakpoints.getFromLineNo(self.data("lineno"));
		if (breakpoint) {
			Breakpoints.showOptions(self.data("lineno"));
		} else {
			Global.run(function() {
				$("body").trigger("xdebug-breakpoint_set", {
					lineno: self.data("lineno")
				});
			});
		}
	});

	$("#breakpoint-options-form").on("submit", function(e) {
		e.preventDefault();

		var operator_val = '>=';
		$('[name="bp-hit-operator"]').each(function() {
			if ($(this).prop("checked")) {
				operator_val = $(this).val();
			}
		});

		Global.run(function() {
			$("body").trigger("xdebug-breakpoint_set", {
				lineno: Breakpoints.options.breakpoint.lineno,
				condition: $('[name="breakpoint-condition"]').val(),
				operator: operator_val,
				hitValue: $('[name="breakpoint-hit-count"]').val(),
				breakpointToDelete: Breakpoints.options.breakpoint.id
			});
			Breakpoints.hideOptions();
		});
	});

	$("#breakpointRemove").on("click", function() {
		Global.run(function() {
			$("body").trigger("xdebug-breakpoint_remove", {
				breakpoint_id: Breakpoints.options.breakpoint.id
			});
			Breakpoints.hideOptions();
		});
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

	$("input[name=eval-expression]").on("keyup", function(e) {
		var KEY_UP = 38;
		var KEY_DN = 40;
		if (e.which == KEY_UP) {
			$(this).val(History.cycleUp($(this).val()));
		} else if (e.which == KEY_DN) {
			$(this).val(History.cycleDown());
		}
	});

	$("#eval-form").on("submit", function(e) {
		$("#eval-content").text("...");
		e.preventDefault();
		var expression = $("input[name=eval-expression]").val();
		History.push(expression);
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

	$("#stack, #eval, #watches").on("click", function() {
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
		refreshPopup("#watches");
	});

	$("body").on("padout-codeview", function() {
		if ($("#codeview").text()) {
			var padding = $(window).height() / 2;
			$("#codeview").css("padding", padding + "px 0");
		}
	});

	$(window).on("load resize", function() {
		$("body").trigger("padout-codeview");
		$("body").trigger("refresh-popups");
	});


	/* XDEBUG CALLBACKS */

	$("body").on('error-on-receive', function(event, data) {
		console.log("[error-on-receive]: " + data.message);
		if (Config.get("keep_listening")) {
			$("body").trigger("xdebug-init");
			Breakpoints.clear();
		} else {
			$("body").trigger("xdebug-stop");
		}
	});


	$("body").on('parse-xml', function(event, data) {

		Alert.hide();
		Breakpoints.hideOptions();

		switch (data.command) { /* SWITCH - START */

			case "watches_eval":
			case "feature_set":
				break;

			case "eval":
				$("#eval-content").text(Global.dbgpFormat(data.xml));
				break;

			// used when getting source from xdebug
			case "source":
				var offset = parseInt(data.options.split(" ")[1]) - 1;

				var sourceCode = $(data.xml).find("response").text();
				sourceCode = atob(sourceCode);

				populateCodeView(sourceCode, offset);

				Global.run(function() {
					$("body").trigger("xdebug-stack_get");
				});
				break;

			case "stack_get":
				var stack_trace = [];
				$(data.xml).find('response').children().each(function() {
					stack_trace.push($(this).attr("filename") + ":" + $(this).attr("lineno"));
				});

				var stack_trace_html = "";
				for (var i = 0; i < stack_trace.length; i++) {
					if (i == 0) {
						stack_trace_html += '<div class="filename"><b>' + stack_trace[i] + '</b></div>';
						Global.setWindowTitle(stack_trace[i], true);
					} else {
						stack_trace_html += '<div class="filename">' + stack_trace[i] + '</div>';
					}
				}
				$("#stack-filenames").html(stack_trace_html);

				Watches.refresh();

				break;

			case "stop":
				break;

			case "breakpoint_set":
				var breakpoint_id = $(data.xml).find("response").attr("id");

				var bpCondition = '';
				var matches = data.options.match(/-- (.*)$/);
				if (matches && matches[1]) {
					bpCondition = atob(matches[1]);
				}

				var bpLineNo = Global.getOptFromString("n", data.options);
				var bpHitValue = Global.getOptFromString("h", data.options);
				var bpOperator = Global.getOptFromString("o", data.options);

				if (parseInt(bpLineNo)) {
					Breakpoints.set({
						id: breakpoint_id,
						filename: Global.fileNameCurrentlyLoaded,
						lineno: bpLineNo,
						condition: bpCondition,
						hitValue: bpHitValue,
						operator: bpOperator
					});
					Breakpoints.highlight();
				}

				break;

			case "breakpoint_remove":
				var breakpoint_id = data.options.split(" ").pop();
				Breakpoints.unset(breakpoint_id);
				Breakpoints.highlight();
				break;

			default:
				if ($(data.xml).find("response").attr("status") == 'stopping') {
					if (Config.get("keep_listening")) {
						$("body").trigger("xdebug-init");
						Breakpoints.clear();
					} else {
						$("body").trigger("xdebug-stop");
					}
				} else {
					filename = $(data.xml).find('response').children().attr("filename");
					lineno = $(data.xml).find('response').children().attr("lineno");
					console.log("File: " + filename + ":" + lineno);
					if (filename) refreshSourceView();
				}

		} /* SWITCH - END */


	});



	/* HELPERS */

	function refreshSourceView() {

		if (Config.get("source_script")) {

			if (Global.fileNameCurrentlyLoaded == filename) {

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
						Global.run(function() {
							$("body").trigger("xdebug-stack_get");
						});
					}

				});

			}

		} else {

			Global.run(function() {
				$("body").trigger("xdebug-source", {
					filename: filename,
					lineno: lineno
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

		$("body").trigger("padout-codeview");

		Global.fileNameCurrentlyLoaded = filename;
		Breakpoints.highlight();
		scrollToView();

		$("body").trigger("refresh-popups");
	}


	function clearCodeView() {
		$("#codeview").css("position", "relative").html("");
	}


	function refreshPopup(popup) {
		var $popup = $(popup);
		var bodyWidth = $("body").width();
		var offset = $popup.data("offset") || 30;
		var widthOffset = offset + $(popup).prop('scrollWidth') - $(popup).width();

		if ($popup.hasClass("slidepopup-left")) {
			var position = "right";
		} else {
			var position = "left";
		}

		if ($popup.hasClass("popup-is-open")) {
			var animateTarget = {width: bodyWidth - widthOffset};
			animateTarget[position] = '0' + offset;
			$popup.stop(true, false).animate(animateTarget, 250);
		} else {
			var padding = parseInt($popup.css("padding-" + position).replace("px", ""));
			var animateTarget = {width: bodyWidth - offset};
			animateTarget[position] = bodyWidth - padding;
			$popup.stop(true, false).animate(animateTarget, 250);
		}
	}


	function htmlEntities(s) {
		return $("<div/>").text(s).html();
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


	$(".popup.user-closable").on("click", function() {
		$(this).hide();
	});

	$(".stop-propagation").on("click", function(e) {
		e.stopPropagation();
	});

	var drawAttentionRotated = false;
	var rotateValues = [180, 359, -180];
	setInterval(function() {
		if (drawAttentionRotated) {
			$(".draw-attention").css("transform", "rotate(0deg)");
			drawAttentionRotated = false;
		} else {
			var rotateValIndex = Math.floor(Math.random() * rotateValues.length);
			$(".draw-attention").css("transform", "rotate(" + rotateValues[rotateValIndex] + "deg)");
			drawAttentionRotated = true;
		}
	}, 5000);


});

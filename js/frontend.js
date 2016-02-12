$(function() {

	var filename = '';
	var lineno = 0;


	/* SETTINGS */

	var SettingsPopup = {
		selector: $("#settings"),
		show: function() {
			this.selector.slideDown(200);
		},
		hide: function() {
			this.selector.slideUp(200);
		},
		toggle: function() {
			this.selector.slideToggle(200);
		}
	}

	$(window).on("load", function() {
		$("input").removeClass("error");

		configErrors = Config.errors();
		if (configErrors.length) {
			enableNav(false);
			for (i in configErrors) {
				SettingsPopup.selector.find("input[name=" + configErrors[i] + "]").addClass("error");
				$("#settings-popup-button").addClass("error");
			}
		} else {
			$('body').trigger('socket_status', {status: 'dead'});
		}

		Keyboard.init();
		ChangeLog.refreshButton();
		Watches.init();
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
				//Breakpoints.clear();
				Global.setWindowTitle();
				break;
		}
	});

	$("#settings-popup-button").on("click", function(e) {
		e.stopPropagation();
		var configValues = Config.get();
		var configTypes = Config.getType();
		for (var prop in configValues) {
			if (configTypes[prop] == "text") {
				SettingsPopup.selector.find("[name=" + prop + "]").val(configValues[prop]);
			} else if (configTypes[prop] == "checkbox") {
				SettingsPopup.selector.find("[name=" + prop + "]").prop("checked", configValues[prop]);
			}
		}
		Keyboard.init();
		SettingsPopup.toggle();
	});

	$(document).on('click', function() {
		SettingsPopup.hide();
	});

	SettingsPopup.selector.on("click", function(e) {
		e.stopPropagation();
	});

	$("#settings-save").on("click", function(e) {
		e.preventDefault();
		var $that = $(this);

		$that.text("Saving...");
		var force_reload = Config.saveFromForm(SettingsPopup.selector.serializeArray());
		if (force_reload) {
			chrome.runtime.reload(); // reload app
		}
		setTimeout(function() {
			$that.text("Save Settings");
			SettingsPopup.hide();
		}, 500);
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

	$("input[name=eval-expression-wrap]").on("change", function() {
		$("#eval-form").trigger("submit");
	});

	$("#eval-form").on("submit", function(e) {
		$("#eval-content").text("...");
		e.preventDefault();
		var expression = $("input[name=eval-expression]").val();
		History.push(expression);
		var expression_wrapper = $("input[name=eval-expression-wrap]:checked").val();
		if (expression_wrapper) {
			expression = expression_wrapper + "(" + expression + ", true)";
		}
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
			refreshLoadMoreButtons();
		}
	});

	$(window).on("load resize", function() {
		$("body").trigger("padout-codeview");
		$("body").trigger("refresh-popups");
	});

	$("#watches .tab").on("click", function() {
		var tab_name = $(this).attr("id");

		$("#watches .tab").removeClass("active");
		$(this).addClass("active");

		$("#watches .tab-content").removeClass("active");
		$("#" + tab_name + "-content").addClass("active");
	});



	/* XDEBUG CALLBACKS */

	$("body").on('error-on-receive', function(event, data) {
		console.log("[error-on-receive]: " + data.message);
		if (Config.get("keep_listening")) {
			$("body").trigger("xdebug-init");
			//Breakpoints.clear();
		} else {
			$("body").trigger("xdebug-stop");
		}
	});


	$("body").on('parse-xml', function(event, data) {

		Alert.hide();
		Breakpoints.hideOptions();

		var $error = $(data.xml).find("error");
		if ($error.attr("code") == "100") {
			Alert.warn("No more lines to load!");
			return;
		}

		switch (data.command) { /* SWITCH - START */

			case "SOCKER_ERROR":
				Alert.warn("Not connected!");
				break;

			case "watches_eval":
			case "feature_set":
				break;

			case "eval":
				$("#eval-content").text(Global.dbgpFormat(data.xml));
				break;

			// used when getting source from xdebug
			case "source":
				if (Global.fileNameCurrentlyLoaded != filename) {
					Global.clearSourceCodeMap();
				}

				var sourceCodeData = atob($(data.xml).find("response").text());
				var offset = parseInt(data.options.split(" ")[1]);
				updateSourceCodeMap(sourceCodeData, offset);

				refreshCodeView();

				if (data.params) {
					$lineWrapper = $("[data-lineno=" + data.params.scrollToLine + "]").closest(".line-wrapper");

					if (data.params.loadMoreBefore) {
						$lineWrapper.css("border-bottom", "1px solid #cccccc");
						var $newLines = $lineWrapper.prevAll().addBack();
					} else {
						$lineWrapper.css("border-top", "1px solid #cccccc");
						var $newLines = $lineWrapper.nextAll().addBack();
					}

					$newLines.css({"opacity": 0.0});
					$newLines.animate({"opacity": 1.0}, 1000);

					scrollToView($lineWrapper.get(0));

				} else {
					scrollToView();
				}

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
				var bpFileName = Global.getOptFromString("f", data.options);

				if (parseInt(bpLineNo)) {
					Breakpoints.set({
						id: breakpoint_id,
						filename: bpFileName,
						lineno: bpLineNo,
						condition: bpCondition,
						hitValue: bpHitValue,
						operator: bpOperator
					});
					Breakpoints.highlight();
				}

				break;

			case "breakpoint_remove":
				if (data.options) {
					var breakpoint_id = data.options.split(" ").pop();
					Breakpoints.unset(breakpoint_id);
				}
				Breakpoints.highlight();
				break;

			default: // entered a new line
				if ($(data.xml).find("response").attr("status") == 'stopping') {
					if (Config.get("keep_listening")) {
						$("body").trigger("xdebug-run");
					} else {
						$("body").trigger("xdebug-stop");
					}
				} else {
					filename = $(data.xml).find('response').children().attr("filename");
					lineno = parseInt($(data.xml).find('response').children().attr("lineno"));
					console.log("File: " + filename + ":" + lineno);
					if (filename) refreshSourceView();
				}

		} /* SWITCH - END */


	});



	/* HELPERS */

	function refreshSourceView() {

		if (Config.get("source_script")) {

			if (Global.fileNameCurrentlyLoaded == filename) {

				highlightCurrentLine();
				scrollToView();
				Global.run(function() {
					$("body").trigger("xdebug-stack_get");
				});

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
						updateSourceCodeMap(sourceCodeData, offset);
						refreshCodeView();
					},

					error: function(data) {
						clearCodeView();
						Alert.warn("Couldn't get source: " + filename + ":" + lineno);
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
				var linesCount = parseInt(Config.get("lines_count"));
				var begin = Math.max(1, (lineno - linesCount));
				var end = lineno + linesCount;
				$("body").trigger("xdebug-source", {
					filename: filename,
					begin: begin,
					end: end
				});
			});

		}

	}


	function highlightCurrentLine() {
		$(".line-wrapper.active-line").removeClass("active-line");
		$(".lineno[data-lineno=" + lineno + "]").closest(".line-wrapper").addClass("active-line");
	}


	function updateSourceCodeMap(sourceCodeData, offset) {
		if (! offset) offset = 1; // first line
		var lines = sourceCodeData.split('\n');
		for (var i = 0; i < lines.length; i++) {
			Global.sourceCodeMap[i + offset] = lines[i];
		}
	}


	function refreshCodeView() {
		var html = "";

		for (var i = 0; i < Global.sourceCodeMap.length; i++) {
			if (Global.sourceCodeMap[i] === undefined) continue;

			html += '<div class="line-wrapper">';
			html +=	'<span class="lineno" data-lineno="' + i + '">' + i + '</span>';
			html += '<span class="codeline"><pre>' + syntax_hl(htmlEntities(Global.sourceCodeMap[i])) + '</pre></span>';
			html += '</div>';
		}

		Global.fileNameCurrentlyLoaded = filename;
		clearCodeView();
		$("#codeview").append(html);
		highlightCurrentLine();
		$("body").trigger("padout-codeview");
		Breakpoints.highlight();
		$("body").trigger("refresh-popups");
	}


	function refreshLoadMoreButtons() {
		if (Config.get("source_script")) return;

		// load-more-BEFORE
		var firstCurrentlyLoadedLine = $(".lineno").first().data("lineno");
		if (firstCurrentlyLoadedLine > 1) {
			var begin = Math.max(1, firstCurrentlyLoadedLine - parseInt(Config.get("lines_count")));
			var end = Math.max(1, (firstCurrentlyLoadedLine - 1));
			showLoadMoreButton("before", begin, end);
		}

		// load-more-AFTER
		var lastCurrentlyLoadedLine = $(".lineno").last().data("lineno");
		var begin = lastCurrentlyLoadedLine + 1;
		var end = lastCurrentlyLoadedLine + parseInt(Config.get("lines_count"));
		showLoadMoreButton("after", begin, end);
	}

	function showLoadMoreButton(which, begin, end) {
		$(".load-more-" + which + ":visible").remove();
		var button = $(".load-more-" + which +":hidden")
			.clone()
			.data("begin", begin)
			.data("end", end)
			.show();
		if (which == "after") {
			$("#codeview").append(button);
		} else if (which == "before") {
			$("#codeview").prepend(button);
		}
	}


	$("body").on("click", ".load-more-lines", function() {
		$("body").trigger("xdebug-source", {
			filename: filename,
			begin: $(this).data("begin"),
			end: $(this).data("end"),
			params: {
				scrollToLine: $(this).hasClass('load-more-before') ? $(this).data("end") : $(this).data("begin"),
				loadMoreBefore: $(this).hasClass('load-more-before') ? true : false
			}
		});
	});


	function clearCodeView() {
		$("#codeview").css("position", "relative").html("");
		$("#codeview").removeClass("syntax_highlighted");
		if (Config.get('highlight_syntax')) {
			$("#codeview").addClass("syntax_highlighted");
		}
	}


	function syntax_hl(plain_string) {
		var hl_string = plain_string;

		// do before keywords (e.g. '$class' is a valid variable name, but 'class' is also a keyword)
		var variables = "(\\$\\w*)";
		var hl_string = hl_string.replace(new RegExp(variables, "g"), '<hl_var>$&</hl_var>')

		var keywords = "\\b(__halt_compiler|abstract|and|array|as|break|callable|case|catch|class|clone|const|continue|declare|default|die|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|eval|exit|extends|final|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|namespace|new|or|print|private|protected|public|require|require_once|return|static|switch|throw|trait|try|unset|use|var|while|xor)\\b";
		var hl_string = hl_string.replace(new RegExp(keywords, "g"), '<hl_key>$&</hl_key>')

		var constants = "\\b('__CLASS__|__DIR__|__FILE__|__FUNCTION__|__LINE__|__METHOD__|__NAMESPACE__|__TRAIT__)\\b";
		var hl_string = hl_string.replace(new RegExp(constants, "g"), '<hl_const>$&</hl_const>')

		var operators = "=|!|&amp;|\\|";
		var hl_string = hl_string.replace(new RegExp(operators, "g"), '<hl_op>$&</hl_op>')

		var comments_1 = "(#|//).*$"; // '# ...' + '// ...'
		var comments_2 = "(/\\*.*)$"; // '/* ...'
		var comments_3 = "(^.*\\*/)"; // '... */'
		var comments_4 = "(^\\s*\\*.*)$"; // '* ...'
		var hl_string = hl_string.replace(new RegExp(comments_1), '<hl_comment>$&</hl_comment>')
		var hl_string = hl_string.replace(new RegExp(comments_2), '<hl_comment>$&</hl_comment>')
		var hl_string = hl_string.replace(new RegExp(comments_3), '<hl_comment>$&</hl_comment>')
		var hl_string = hl_string.replace(new RegExp(comments_4), '<hl_comment>$&</hl_comment>')

		var strings_1 = "'.*?'";
		var strings_2 = "\".*?\"";
		var hl_string = hl_string.replace(new RegExp(strings_1, "g"), '<hl_str>$&</hl_str>')
		var hl_string = hl_string.replace(new RegExp(strings_2, "g"), '<hl_str>$&</hl_str>')

		return hl_string;
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
			$popup.find("input.focus-on-visible").trigger("focus");
		} else {
			var padding = parseInt($popup.css("padding-" + position).replace("px", ""));
			var animateTarget = {width: bodyWidth - offset};
			animateTarget[position] = bodyWidth - padding;
			$popup.stop(true, false).animate(animateTarget, 250);
			$popup.find("input.focus-on-visible").trigger("blur");
		}
	}


	function htmlEntities(s) {
		return $("<div/>").text(s).html();
	}


	// active_line - native DOM element (not jQuery object)
	function scrollToView(active_line, duration, force) {
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
			force ||
			// hidden 'above' the screen
			$(active_line).offset().top < (scrollTop + margin) ||
			// hidden 'below' the screen
			$(active_line).offset().top > (scrollTop + $(window).height() - margin)
		) {
			var newScrollTop = $(active_line).offset().top - ($(window).height() / 2);
			if (! duration) {
				$("body").scrollTop(newScrollTop);
			} else {
				$("body").animate({"scrollTop" : newScrollTop}, duration);
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

	$("input").on("keydown keyup", function(e) {
		if (! (e.ctrlKey || e.altKey)) {
			e.stopPropagation();
		}
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


	$("#scroll-to-active-line").on("click", function() {
		scrollToView(false, 300, true);
	});

});

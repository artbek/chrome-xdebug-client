$(function() {

	// SETTINGS

	var source_script = '';
	chrome.storage.local.get('source_script', function(data) {
		console.log(data);
		source_script = data.source_script;
	});
	var isProcessing = false;


	// HANDLE EVENTS

	// nav

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

	$("#run").on("click", function() {
		run(function() {
			$("body").trigger("xdebug-run");
		});
	});

	$("#stop").on("click", function() {
		run(function() {
			$("body").trigger("xdebug-stop");
		});
	});

	$("#settings").on("click", function() {
	});


	// console

	$("#eval-form").on("submit", function(e) {
		e.preventDefault();
		var expression = $("input[name=eval-expression]").val();
		expression = btoa(expression);
		$("body").trigger("xdebug-eval", {
			expression: expression
		});
	});


	// stack

	$("#stack").on("click", function() {
		var currentRight = parseInt($("#stack").css('right').replace('px', ''));
		if (currentRight < 0) {
			$("#stack").animate({right: '-450px'}, 500);
		} else {
			$("#stack").animate({right: '0'}, 500);
		}
	});



	var filename = '';
	var lineno = 0;

	// xdebug result

	$("body").on('parse-xml', function(event, data) {
		var xml_document = $.parseXML(data.xml);

		switch (data.command) {

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
			var data = $(xml_document).find("response").text();
			data = atob(data);

			var b = Math.max((lineno - 10), 1);
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
				html += '<span class="codeline"><pre>' + htmlEntities(lines[l]) + '</pre></span>';
				html += '</div>';
				$("#codeview").append(html);
			}

			scrollToView();
			isProcessing = false;
			break;


		case "stack_get":
			var stack_trace = [];
			$(xml_document).find('response').children().each(function() {
				stack_trace.push($(this).attr("filename") + ":" + $(this).attr("lineno"));
			});

			var stack_trace_html = "";
			for (var i = 0; i < stack_trace.length; i++) {
				stack_trace_html += '<div class="filename">' + stack_trace[i] + '</div>';
			}
			$("#stack").html(stack_trace_html);

			isProcessing = false;
			break;


		default:
			filename = $(xml_document).find('response').children().attr("filename");
			lineno = $(xml_document).find('response').children().attr("lineno");
			console.log("File: " + filename + ":" + lineno);

			if (filename === undefined) {
				isProcessing = false;
				if (data.command != 'run') {
					run(function() {
						$("body").trigger("xdebug-" + data.command);
					});
				}
				break;
			}

/*
			$("body").trigger("xdebug-source", {
				filename: filename,
				lineno: lineno
			});
			*/
			$.ajax({
				url: source_script,
				type: 'GET',
				data: {
					path: filename
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
						html +=	'<span class="lineno">' + (l + 1) + '</span>';
						html += '<span class="codeline"><pre>' + htmlEntities(lines[l]) + '</pre></span>';
						html += '</div>';
						$("#codeview").append(html);
					}

					scrollToView();
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

	});


	// HELPERS

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
			isProcessing = true;
			callback();
		}
	}


	function scrollToView() {
		var margin = 100;
		var scrollTop = $(window).scrollTop();
		var offset = $(".active-line").offset().top;
		if (offset < (scrollTop + margin) || offset > (scrollTop + $(window).height() - (2 * margin))) {
			var elements = document.getElementsByClassName("active-line")
			if (elements[0]) {
				elements[0].scrollIntoView();
				var currentScroll = $("body").scrollTop();
				$("body").scrollTop(currentScroll - margin);
			}
		}
	}

});

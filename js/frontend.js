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
			$("body").trigger("xdebug-stepinto");
		});
	});

	$("#stepover").on("click", function() {
		run(function() {
			$("body").trigger("xdebug-stepover");
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

		default:
			var filename = $(xml_document).find('response').children().attr("filename");
			var lineno = $(xml_document).find('response').children().attr("lineno");

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
						html += '<span class="codeline"><pre>' + lines[l] + '</pre></span>';
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
				}
			});

		}

	});


	// HELPERS

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
		var elements = document.getElementsByClassName("active-line")
		if (elements[0]) {
			elements[0].scrollIntoView();
			var currentScroll = $("body").scrollTop();
			$("body").scrollTop(currentScroll - 100);
		}
	}

});

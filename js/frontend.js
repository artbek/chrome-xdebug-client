$(function() {

	$("#stepinto").on("click", function() {
		$("body").trigger("xdebug-stepinto");
	});

	$("#stepover").on("click", function() {
		$("body").trigger("xdebug-stepover");
	});

	$("#run").on("click", function() {
		$("body").trigger("xdebug-run");
	});

	$("#stop").on("click", function() {
		$("body").trigger("xdebug-stop");
	});

	$("#settings").on("click", function() {
	});

	var source_script = '';
	chrome.storage.local.get('source_script', function(data) {
		console.log(data);
		source_script = data.source_script;
	});

	$("body").on('parse-xml', function(event, data) {
		if (data.command == "feature_set") return;

		var xml_document = $.parseXML(data.xml);
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
			},
			error: function(data) {
				$("#codeview").html("");
				$("#codeview").append("<p>Couldn't get source:</p>");
				$("#codeview").append("<p><strong>" + filename + ":" + lineno + "</strong></p>");
				console.error("Couldn't get source!");
			},
			complete: function() { }
		});
	});

});

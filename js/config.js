var Config = (function() {

	var conf = {

		listening_ip: {
			value: "",
			type: "text",
			set: function(value) {
				this.valid = true;
				this.value = value;
				if (! helpers.isValidIP(value)) {
					this.valid = false;
				}
			},
			valid: true,
			force_reload: true
		},

		listening_port: {
			value: "",
			type: "text",
			set: function(value) {
				this.valid = true;
				this.value = value;
				if (! helpers.isValidPort(value)) {
					this.valid = false;
				}
			},
			valid: true,
			force_reload: true
		},

		source_script: {
			value: "",
			type: "text",
			set: function(value) {
				this.valid = true;
				this.value = value;
				if (value && ! helpers.isValidUrl(value)) { // empty string is OK
					this.valid = false;
				}
			},
			valid: true,
			force_reload: true
		},

		lines_count: {
			value: "",
			type: "text",
			set: function(value) {
				this.valid = true;
				this.value = value;
				if (! helpers.isValidNumber(value)) {
					this.valid = false;
				}
			},
			valid: true
		},

		last_seen_version: {
			value: 0,
			set: function(value) {
				this.value = value;
			},
			valid: true,
			hidden: true
		},

		keep_listening: {
			value: 1,
			type: "checkbox",
			set: function(value) {
				if (parseInt(value)) {
					this.value = 1;
				} else {
					this.value = 0;
				}
			},
			valid: true
		},

		break_at_first_line: {
			value: 1,
			type: "checkbox",
			set: function(value) {
				if (parseInt(value)) {
					this.value = 1;
				} else {
					this.value = 0;
				}
			},
			valid: true
		},

		highlight_syntax: {
			value: 1,
			type: "checkbox",
			set: function(value) {
				if (parseInt(value)) {
					this.value = 1;
				} else {
					this.value = 0;
				}
			},
			valid: true
		},

		remember_breakpoints: {
			value: 1,
			type: "checkbox",
			set: function(value) {
				if (parseInt(value)) {
					this.value = 1;
				} else {
					this.value = 0;
				}
			},
			valid: true
		},

		shortcuts: {
			value: "",
			set: function(value) {
				this.value = value;
			},
			valid: true,
		},

		shortcuts_disable: {
			value: 1,
			type: "checkbox",
			set: function(value) {
				if (parseInt(value)) {
					this.value = 1;
				} else {
					this.value = 0;
				}
			},
			valid: true
		}

	};


	var helpers = {
		isValidUrl: function(url) {
			return url.match(/^http[s]?:\/\/.+/);
		},

		isValidPort: function(port) {
			return port.match(/^\d{1,5}$/);
		},

		isValidIP: function(ip) {
			return ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
		},

		isValidNumber: function(number) {
			return number.match(/^\d+$/);
		}
	}


	/* INIT CONFIG */

	function init_config() {
		chrome.storage.local.get(null, function(values) {
			var formLikeValues = [];

			for (var prop in values) {
				formLikeValues.push({
					"name": prop,
					"value": values[prop]
				});
			}

			publicMethods.saveFromForm(formLikeValues, true);
		});
	}

	init_config();


	/* PUBLIC */

	var publicMethods = {

		getType: function(key) {
			if (! key) {
				var configValues = {};
				for (var prop in conf) {
					configValues[prop] = conf[prop].type;
				}
				return configValues;
			} else {
				return conf[key]["type"];
			}
		},

		get: function(key) {
			if (! key) {
				init_config();
				var configValues = {};
				for (var prop in conf) {
					configValues[prop] = conf[prop].value;
				}
				return configValues;
			} else {
				return conf[key]["value"];
			}
		},

		isValid: function(key) {
			return conf[key]["valid"];
		},

		set: function(key, value) {
			var updated = false;

			if (conf.hasOwnProperty(key) && conf[key].value != value) {
				conf[key].set(value);

				var storageValues = {};
				storageValues[key] = conf[key]["value"];
				chrome.storage.local.set(storageValues);

				updated = true;
			}

			return updated;
		},

		saveFromForm: function(values, isInit) {
			var force_reload = false;

			for (var prop in conf) {
				if (! isInit && conf[prop].hidden) continue;
				var value = null;
				for (var i in values) {
					if (values[i].name == prop) {
						value = values[i].value;
						break;
					}
				}
				if (publicMethods.set(prop, value) && conf[prop].force_reload) {
					force_reload = true;
				}
			}

			return force_reload;
		},

		errors: function() {
			var invalidProperties = [];
			for (var prop in conf) {
				if (! conf[prop].valid) {
					invalidProperties.push(prop);
				}
			}
			return invalidProperties;
		}

	}

	return publicMethods;

})();



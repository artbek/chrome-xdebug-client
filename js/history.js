var History = (function() {

	var storage = [];
	var index_max = 100;
	var write_index = 0;
	var cycle_index = 0;


	/* PUBLIC */

	var publicMethods = {

		push: function(expression) {
			storage[write_index] = expression;
			write_index++;
			if (write_index >= index_max) {
				write_index = 0;
			}
			cycle_index = write_index;
		},

		cycle_up: function() {
			cycle_index--;
			if (cycle_index < 0) {
				cycle_index = Math.min(index_max, storage.length - 1);
			}

			return storage[cycle_index];
		},

		cycle_dn: function() {
			cycle_index++;
			if (cycle_index >= Math.min(index_max, storage.length - 1)) {
				cycle_index = 0;
			}

			return storage[cycle_index];
		}

	}

	return publicMethods;

})();



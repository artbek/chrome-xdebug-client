var History = (function() {

	var storage = [];
	var index_max = 100;
	var write_index = 0;
	var cycle_index = 0;

	function previousWriteIndex() {
		var previousIndex = write_index - 1;
		if (previousIndex < 0) {
			previousIndex = Math.min(index_max, storage.length - 1);
		}

		return previousIndex;
	}


	/* PUBLIC */

	var publicMethods = {

		push: function(expression) {
			// no consecutive duplicates
			if (storage[previousWriteIndex()] == expression) return;

			storage[write_index] = expression;
			write_index++;
			if (write_index > index_max) {
				write_index = 0;
			}
			cycle_index = write_index;
		},


		cycleUp: function(currentValue) {
			cycle_index--;
			if (cycle_index < 0) {
				cycle_index = Math.min(index_max, storage.length - 1);
			}

			if (currentValue && storage[cycle_index] == currentValue) {
				// For smoother user experience, otherwise you need to initially hit
				// KEY_UP twice before observing any change.
				this.cycleUp();
			}

			return storage[cycle_index];
		},


		cycleDown: function() {
			cycle_index++;
			if (cycle_index > Math.min(index_max, storage.length - 1)) {
				cycle_index = 0;
			}

			return storage[cycle_index];
		}

	}

	return publicMethods;

})();



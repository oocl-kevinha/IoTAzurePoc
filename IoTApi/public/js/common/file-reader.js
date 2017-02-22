(function($) {
	function FileReaderUtil(file) {
		var self = this;
		this.file = file;
		this.complete = undefined;
		this.progress = undefined;

		function getReader() {
			var reader = new FileReader();
			reader.onload = onLoad;
			reader.onerror = onError;
			reader.onprogress = onProgress;
			return reader;
		}

		function onLoad(evt) {
			// Obtain the read file data
			var fileString = evt.target.result;
			self.complete(undefined, fileString);
		}

		function onProgress(evt) {
			if (evt.lengthComputable && self.progress) {
				// evt.loaded and evt.total are ProgressEvent properties
				var loaded = (evt.loaded / evt.total);
				if (loaded < 1) {
					self.progress(evt.loaded, evt.total);
				}
			}
		}

		function onError(evt) {
			if(evt.target.error.name == 'NotReadableError') {
				return self.complete(new Error('Cannot Read File'));
			}
			self.complete(new Error('Unknown Error when Reading File'));
		}

		// complete: function(error, fileContent), called when read completed/error
		// progress: function(read, total), called when there is progress event
		this.getTextData = function(complete, progress) {
			self.complete = complete;
			self.progress = progress;
			getReader().readAsText(self.file);
		};
	}

	$.getFileReader = function(file) {
		return new FileReaderUtil(file);
	};
})(jQuery);

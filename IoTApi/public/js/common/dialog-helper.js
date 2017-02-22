(function($) {
	function displayMessage(title, message, isHtml, size) {
		var dialog = $('#' + title.toLowerCase() + 'Dialog').length? $('#' + title.toLowerCase() + 'Dialog'): $('#messageDialog');
		dialog.find('.modal-dialog').removeClass('modal-sm modal-lg').addClass(size === 'normal'? '': ('modal-' + size));
		switch (title) {
			case 'Message': dialog.find('.modal-title').removeClass('bg-warning bg-danger').addClass('bg-info'); break;
			case 'Warning': dialog.find('.modal-title').removeClass('bg-info bg-danger').addClass('bg-warning'); break;
			case 'Error': dialog.find('.modal-title').removeClass('bg-warning bg-info').addClass('bg-danger'); break;
		}
		dialog.find('.modal-title').text(title);
		if (isHtml) {
			dialog.find('.modal-body').html(message);
		} else {
			dialog.find('.modal-body').html('<div class="text-justify">' + message + '</div>');
		}
		dialog.modal({
			backdrop: 'static'
			, keyboard: false
			, show: true
		});
	}
	function displayInput(title, message, callback, isHtml, size) {
		var dialog = $('#inputDialog');
		dialog.find('.modal-dialog').removeClass('modal-sm modal-lg').addClass(size === 'normal'? '': ('modal-' + size));
		dialog.find('.modal-title').addClass('bg-info');
		dialog.find('.modal-title').text(title);
		if (isHtml) {
			dialog.find('.modal-body').html(message + '<br /><input type="text" id="tfDialogInput" />');
		} else {
			dialog.find('.modal-body').html('<div class="text-justify">' + message + '<br /><input type="text" id="tfDialogInput" /></div>');
		}
		dialog.off('hide.bs.modal');
		dialog.on('hide.bs.modal', function(e) {
			if ($(document.activeElement).html() === 'OK' && callback) {
				callback($('#tfDialogInput').val());
			}
		});
		dialog.modal({
			backdrop: 'static'
			, keyboard: false
			, show: true
		});
	}
	$.dialog = $.dialog || {};
	/*
	 * @param message {String} Message to be disaplyed, html code if isHtml is true
	 * @param isHtml {Boolean} Whether message is html content
	 * @param size {String} (optional) Dialog size: normal/sm(small)/lg(large), default is small
	 */
	$.dialog.info = function(message, isHtml, size) {
		displayMessage('Message', message, isHtml, size || 'sm');
	};
	$.dialog.warning = function(message, isHtml, size) {
		displayMessage('Warning', message, isHtml, size || 'sm');
	};
	$.dialog.error = function(message, isHtml, size) {
		displayMessage('Error', message, isHtml, size || 'sm');
	};
	$.dialog.input = function(message, callback, isHtml, size) {
		displayInput('Input', message, callback, isHtml, size || 'sm');
	};
	$.dialog.confirm = function(title, message, isHtml, postive, negative) {
	};
})(jQuery);

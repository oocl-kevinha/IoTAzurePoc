(function($) {
	function sendRequest(method, path, param, success, failure) {
		return $.ajax(
			{
				async: true
				, url: path
				, data: (param? JSON.stringify(param): param)
				, method: method
				, contentType: 'application/json'
				, success: function(responseData, status) {
					if (success) {
						success(responseData, status);
					}
				}
				, error: function(xhr, textStatus, httpStatusString) {
					if (textStatus === 'abort' || httpStatusString === 'abort') {
						return;
					}
					// Handle Unknown Error
					if (!xhr.responseJSON || xhr.status === 500) {
						$.dialog.error('Unknown error occured when communicating with server, please contact support!');
						return console.log(xhr);
					}
					// Handle Unauthorized and Redirect
					if (xhr.status === 401) {
						if (!_.isUndefined(xhr.responseJSON.errors)) {
							$.dialog.error('<div>' + xhr.responseJSON.errors.join('</div><br /><div>') + '</div>', true);
						} else if (!_.isUndefined(xhr.responseJSON.redirectUrl)) {
							location.href = xhr.responseJSON.redirectUrl;
						}
						return;
					}
					// Customized error handler other than 500
					if (failure) {
						failure(xhr.responseJSON, textStatus);
						return;
					}
					// Handle Bad Request, e.g. Invalid Param format
					if (!_.isUndefined(xhr.responseJSON.errors)) {
						$.dialog.error('<div>' + xhr.responseJSON.errors.join('</div><br /><div>') + '</div>', true);
						return;
					}
				}
			}
		);
	}
	$.httpHelper = $.httpHelper || {};
	$.httpHelper.sendGet = function(path, success, failure) {
		return sendRequest('GET', path, undefined, success, failure);
	};
	$.httpHelper.sendPost = function(path, param, success, failure) {
		return sendRequest('POST', path, param, success, failure);
	};
	$.httpHelper.sendPut = function(path, param, success, failure) {
		return sendRequest('PUT', path, param, success, failure);
	};
	$.httpHelper.sendDelete = function(path, success, failure) {
		return sendRequest('DELETE', path, undefined, success, failure);
	};
})(jQuery);

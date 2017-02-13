var _ = require('lodash');
var url = require('url');
var http = require('https');

module.exports = {
	get: function(header, url, parseResponse, callback) {
		return sendJSONRequest(header, url, 'get', undefined, parseResponse, callback);
	}
	, post: function(header, url, data, parseResponse, callback) {
		return sendJSONRequest(header, url, 'post', data, parseResponse, callback);
	}
	, put: function(header, url, data, parseResponse, callback) {
		return sendJSONRequest(header, url, 'put', data, parseResponse, callback);
	}
	, delete: function(header, url, parseResponse, callback) {
		return sendJSONRequest(header, url, 'delete', undefined, parseResponse, callback);
	}
};

function sendJSONRequest(header, requestUrl, method, in_data, parseResponse, callback) {
		var dataStr = JSON.stringify(in_data || {});
		var urlObj = url.parse(requestUrl);
		var options = {
			hostname: urlObj.hostname
			, port: urlObj.port || 443
			, path: urlObj.pathname + (urlObj.query? `?${urlObj.query}`: '')
			, method: method
			, headers: {
				'Content-Type': 'application/json'
				, 'Cache-Control': 'no-cache'
				, 'Content-Length': Buffer.byteLength(dataStr)
			}
		};
		_.merge(options.headers, header);

		var httpRequest = http.request(options, function(response) {
			var data = '';
			response.on('data', function(chunk) { data += chunk; });
			response.on('end', function() {
				try {
					if (parseResponse) {
						var parsedData = JSON.parse(data);
						return callback(undefined, parsedData, response);
					}
					callback(undefined, data, response);
				} catch (ex) {
					callback(ex, data, response);
				}
			});
		});

		httpRequest.on('error', function(err) {
			callback(err);
		});

		if (dataStr) {
			httpRequest.write(dataStr);
		}
		httpRequest.end();
}

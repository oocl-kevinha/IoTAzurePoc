var _ = require('lodash');

exports.buildSuccessResponse = function(data, code) {
	return buildServerResponse(true, data, code || 200);
};

exports.buildFailureResponse = function(error, code, data) {
	return buildServerResponse(false, data, error, code || 500);
};

function buildServerResponse(success, data, error, code) {
	var response = {};
	response.success = success;
	response.statusCode = code;
	if (data) {
		response.data = data;
	}
	if (error) {
		if (!Array.isArray(error)) {
			response.errMessage = error.toString();
		} else {
			response.errMessage = _.join(error, ';');
		}
	}

	return response;
}

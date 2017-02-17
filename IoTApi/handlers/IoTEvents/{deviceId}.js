'use strict';
var common = require('../common.js');
var config = require('../azureKeys.js');
var responseFactory = require('../../util/response-factory');

module.exports = {
	get: queryEventByDeviceId
};

function queryEventByDeviceId(req, res, next) {
	var querySpec = {
		query: `SELECT * FROM ${config.collection.events} r WHERE r.IoTHub.ConnectionDeviceId = @deviceId ORDER BY r.timeStamp DESC`
		, parameters: [
			{ name: '@deviceId', value: req.params.deviceId }
		]
	};

	common.queryCollection(config.collection.events, querySpec, false)
		.then((results) => {
			res.json(responseFactory.buildSuccessResponse(results));
		})
		.catch((error) => {
			console.error(err);
			res.status(500).json(responseFactory.buildFailureResponse(error));
		});
}

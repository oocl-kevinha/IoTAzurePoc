'use strict';
var _ = require('lodash');
var config = require('../../config/azure-keys');
var common = require('../../util/common');
var deviceEndpoint = require('../../util/device');
var responseFactory = require('../../util/response-factory');

module.exports = {
	get: getIoTDevice
};

function getIoTDevice(req, res) {
	var deviceId = req.params.deviceId;

	deviceEndpoint.retrieveIoTDeviceOnHubById(deviceId, req.headers.authorization, function(err, data, response) {
		if (err) {
			console.error(err);
			return res.status(500).json(responseFactory.buildFailureResponse(err));
		}
		if(!response || !(response.statusCode >= 200 && response.statusCode < 300 || response.statusCode === 304 || response.statusCode === 1223)) {
			return res.json(
				responseFactory.buildFailureResponse(
					response? `Invalid Status Code [${response.statusCode}] from IoTHub`: 'No response'
					, response? response.statusCode: undefined
					, data)
				);
		}
		var querySpec = {
			query: `SELECT TOP 1 d.deviceId, d.activationCode, d.meta FROM ${config.collection.devices} d WHERE d.deviceId = @deviceId`
			, parameters: [
				{ name: '@deviceId', value: deviceId }
			]
		};
		common.queryCollection(config.collection.devices, querySpec, false)
			.then((results) => {
				res.json(responseFactory.buildSuccessResponse(results.length > 0? _.merge(data, results[0]): {}));
			})
			.catch((error) => {
				console.error(error);
				res.status(500).json(responseFactory.buildFailureResponse(error));
			});
	});
}

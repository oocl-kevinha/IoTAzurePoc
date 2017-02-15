'use strict';
var _ = require('lodash');
var async = require('async');
var config = require('../../azureKeys.js');
var common = require('../../common.js');
var responseFactory = require('../../../util/response-factory');
var deviceEndpoint = require('../../../common/device');

module.exports = {
	post: searchIoTDevice
};

function searchIoTDevice(req, res) {
	var querySpec = {
		query: `SELECT d.deviceId, d.activationCode, d.meta FROM ${config.collection.devices} d WHERE d.activationCode = @activationCode`
		, parameters: [{ name: '@activationCode', value: req.body.activationCode }]
	};

	common.queryCollection(config.collection.devices, querySpec, false)
		.then((results) => {
			res.setHeader('Access-Control-Allow-Origin', '*');
			if (results.length > 0) {
				deviceEndpoint.retrieveIoTDeviceOnHubById(results[0].deviceId, req.headers.authorization, function(err, data, response) {
					if (err) {
						console.error(err);
						return res.status(500).json(responseFactory.buildFailureResponse(err));
					}
					if(!response || !(response.statusCode >= 200 && response.statusCode < 300 || response.statusCode === 304 || response.statusCode === 1223)) {
						return res.json(responseFactory.buildFailureResponse(
							response? `Invalid Status Code [${response.statusCode}] from IoTHub`: 'No response'
							, response? response.statusCode: undefined
							, data)
						);
					}
					res.json(responseFactory.buildSuccessResponse(_.merge(results[0], data)));
				});
			} else {
				res.json(responseFactory.buildFailureResponse('Device not found', 404));
			}
		})
		.catch((error) => {
			console.error(error);
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.status(500).json(responseFactory.buildFailreResponse(error));
		});
}

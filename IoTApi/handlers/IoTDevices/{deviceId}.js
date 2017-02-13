'use strict';
var _ = require('lodash');
var config = require('../azureKeys.js');
var common = require('../common.js');
var deviceEndpoint = require('../../common/device');

module.exports = {
	get: getIoTDevice
};

function getIoTDevice(req, res, next) {
	var deviceId = req.params.deviceId;

	deviceEndpoint.retrieveIoTDeviceOnHubById(deviceId, req.headers.authorization, function(err, data, response) {
		if (err) {
			res.setHeader('Access-Control-Allow-Origin', '*');
			return res.status(500).json(err);
		}
		if(!response || !(response.statusCode >= 200 && response.statusCode < 300 || response.statusCode === 304 || response.statusCode === 1223)) {
			res.setHeader('Access-Control-Allow-Origin', '*');
			return res.status(response? response.statusCode: 500).json(err || data);
		}
		var querySpec = {
			query: `SELECT TOP 1 d.deviceId, d.meta FROM ${config.collection.devices} d WHERE d.deviceId = @deviceId`
			, parameters: [
				{ name: '@deviceId', value: deviceId }
			]
		};
		common.queryCollection(config.collection.devices, querySpec, false)
			.then((results) => {
				res.setHeader('Access-Control-Allow-Origin', '*');
				res.status(200).json(results.length > 0? _.merge(data, results[0]): {});
			})
			.catch((error) => {
				console.log(error);
				res.setHeader('Access-Control-Allow-Origin', '*');
				res.status(500).json(error);
			});
	});
}

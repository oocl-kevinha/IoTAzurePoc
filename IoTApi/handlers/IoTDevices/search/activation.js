'use strict';
var _ = require('lodash');
var async = require('async');
var config = require('../../azureKeys.js');
var common = require('../../common.js');
var deviceEndpoint = require('../../../common/device');

module.exports = {
	post: searchIoTDevice
};

function searchIoTDevice(req, res, next) {
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
						return res.status(500).json(err);
					}
					if(!response || !(response.statusCode >= 200 && response.statusCode < 300 || response.statusCode === 304 || response.statusCode === 1223)) {
						return res.status(500).json(response? `Invalid Status Code [${response.statusCode}] from IoTHub`: 'No response');
					}
					res.status(200).json(_.merge(results[0], data));
				});
			} else {
				res.status(404).json({message: 'Device not found'});
			}
		})
		.catch((error) => {
			console.log(error);
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.status(500).json(error);
		});
}

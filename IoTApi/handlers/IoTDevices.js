'use strict';
var _ = require('lodash');
var async = require('async');
var uuid = require('uuid');
var common = require('./common.js');
var config = require('./azureKeys.js');
var deviceEndpoint = require('../common/device');

module.exports = {
	post: registerIoTDevice
	, put: updateIoTDevice
};

function registerIoTDevice(req, res) {
	req.body.deviceId = req.body.deviceId || uuid.v4().toString();

	// 1. Create Device on IoTHub
	// 2. Insert Device into own DB (since some field are not support in IoTHub
	deviceEndpoint.createIoTDeviceOnHub(req.body, req.headers.authorization, function(err, data, response) {
		if (err) {
			return res.status(500).json(err);
		}
		if(!response || !(response.statusCode >= 200 && response.statusCode < 300 || response.statusCode === 304 || response.statusCode === 1223)) {
			return res.status(response? response.statusCode: 500).json(err || data);
		}

		var deviceObj = {
			deviceId: req.body.deviceId
			, meta: req.body.meta
		};

		common.insertDocument(config.collection.devices, deviceObj)
			.then((insertedDoc) => {
				res.status(200).json(_.merge(data, req.body));
			})
			.catch((error) => {
				console.log(error);
				res.status(500).json(error);
			});
	});
}

function updateIoTDevice(req, res) {
	var querySpec = {
		query: `SELECT TOP 1 * FROM ${config.collection.devices} d WHERE d.deviceId = @deviceId`
		, parameters: [
			{ name: '@deviceId', value: req.body.deviceId }
		]
	};

	async.waterfall(
		[
			function(callback) {
				common.queryCollection(config.collection.devices, querySpec, callback);
			}
			, function(results, callback) {
				if (results.length > 0) {
					var deviceDoc = results[0];
					deviceDoc.meta = req.body.meta;
					callback(undefined, deviceDoc);
				} else {
					callback('NOT_FOUND');
				}
			}
			, function(deviceDoc, callback) {
				common.updateDocument(deviceDoc, callback);
			}
			, function(updatedDeviceDoc, callback) {
				var deviceObj = {
					deviceId: updatedDeviceDoc.deviceId
					, meta: updatedDeviceDoc.meta
				};
				deviceEndpoint.retrieveIoTDeviceOnHubById(req.body.deviceId, req.headers.authorization, function(err, data, response) {
					if (err) {
						return callback(err);
					}
					if(!response || !(response.statusCode >= 200 && response.statusCode < 300 || response.statusCode === 304 || response.statusCode === 1223)) {
						return callback(response? `Invalid Status Code [${response.statusCode}] from IoTHub`: 'No response');
					}

					callback(undefined, _.merge(deviceObj, data));
				});
			}
		]
		, function(err, updatedDevice) {
			if (err) {
				if (err === 'NOT_FOUND') {
					res.status(404).json({message: `Device [${req.body.deviceId}] not found`});
				} else {
					console.log(err);
					res.status(500).json(err);
				}
				return;
			}
			res.status(200).json(updatedDevice);
		}
	);
}

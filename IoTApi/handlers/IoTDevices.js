'use strict';
var _ = require('lodash');
var async = require('async');
var uuid = require('uuid');
var common = require('./common.js');
var config = require('./azureKeys.js');
var deviceEndpoint = require('../common/device');
var responseFactory = require('../util/response-factory');

module.exports = {
	post: registerIoTDevice
	, put: updateIoTDevice
};

function registerIoTDevice(req, res) {
	req.body.deviceId = req.body.deviceId || uuid.v4().toString();

	// 1. Check if device activation code duplicated
	// 2. Create Device on IoTHub
	// 3. Insert Device into own DB (since some fields are not support in IoTHub
	async.waterfall([
		function(callback) {
			var querySpec = {
				query: `SELECT d.deviceId FROM ${config.collection.devices} d WHERE d.activationCode = @activationCode`
				, parameters: [{ name: '@activationCode', value: req.body.activationCode }]
			};
			common.queryCollection(config.collection.devices, querySpec, false, callback);
		}
		, function(results, callback) {
			if (results.length > 0) {
				return callback('Activation Code Exists');
			}
			callback(undefined);
		}
		, function(callback) {
			deviceEndpoint.createIoTDeviceOnHub(req.body, req.headers.authorization, callback);
		}
	]
	, function(err, data, response) {
		if (err) {
			if (err === 'Activation Code Exists') {
				res.json(responseFactory.buildFailureResponse(err));
			} else {
				console.error(err);
				res.status(500).json(responseFactory.buildFailureResponse(err));
			}
			return;
		}
		if(!response || !(response.statusCode >= 200 && response.statusCode < 300 || response.statusCode === 304 || response.statusCode === 1223)) {
			return res.json(responseFactory.buildFailureResponse(response? `Invalid Status Code [${response.statusCode}] from IoTHub`: 'No response', response? response.statusCode: undefined, data));
		}

		var deviceObj = {
			deviceId: req.body.deviceId
			, activationCode: req.body.activationCode
			, meta: req.body.meta
		};

		common.insertDocument(config.collection.devices, deviceObj)
			.then((insertedDoc) => {
				res.json(responseFactory.buildSuccessResponse(_.merge(data, req.body)));
			})
			.catch((error) => {
				console.error(error);
				res.status(500).json(responseFactory.buildFailureResponse(error));
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
				common.queryCollection(config.collection.devices, querySpec, false, callback);
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
					res.json(responseFactory.buildFailureResponse(`Device [${req.body.deviceId}] not found`, 404));
				} else {
					console.error(err);
					res.status(500).json(responseFactory.buildFailureResponse(err));
				}
				return;
			}
			res.json(responseFactory.buildSuccessResponse(updatedDevice));
		}
	);
}

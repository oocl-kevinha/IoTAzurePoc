'use strict';
var _ = require('lodash');
var async = require('async');
var uuid = require('uuid');
var common = require('./common.js');
var config = require('./azureKeys.js');
var deviceEndpoint = require('../common/device');
/**
 * Operations on /IoTDevices
 */
module.exports = {
    /**
     * summary:
     * description:
     * parameters: IoTDevice
     * produces: application/json, text/json
     * responses: 200
     */
    post: registerIoTDevice
	, put: updateIoTDevice
};

function registerIoTDevice(req, res) {
	console.log('Enter Iot Device: ' + JSON.stringify(req.body));
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
			, deviceOSType: req.body.deviceOSType
			, deviceOSVersion: req.body.deviceOSVersion
			, deviceModel: req.body.deviceModel
			, meta: req.body.meta
		};

		common.insertDocument(config.collection.devices, deviceObj)
			.then((insertedDoc) => {
				console.log('common.data = ' + insertedDoc);
				//res.status(200).json(insertedDoc);
				res.status(200).json(_.merge(data, req.body));
			})
			.catch((error) => {
				//status = 500;
				console.log(error);
				res.status(500).json(error);
			});
	});
}

function updateIoTDevice(req, res) {
	console.log('Enter Iot Device: ' + JSON.stringify(req.body));

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
					deviceDoc.deviceOSType = req.body.deviceOSType;
					deviceDoc.deviceOSVersion = req.body.deviceOSVersion;
					deviceDoc.deviceModel = req.body.deviceModel;
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
					, deviceOSType: updatedDeviceDoc.deviceOSType
					, deviceOSVersion: updatedDeviceDoc.deviceOSVersion
					, deviceModel: updatedDeviceDoc.deviceModel
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
//
// function createIoTDeviceOnHub(device, sasToken, callback) {
// 	common.http.put(
// 		{ Authorization: sasToken }
// 		, `https://IoTPOCGateway.azure-devices.net/devices/${device.deviceId}?api-version=2016-11-14`
// 		, {
// 			deviceId: device.deviceId
// 			, connectionState: device.connectionState
// 			, status: device.status
// 			, statusReason: device.statusReason
// 			, connectionStateUpdatedTime: device.connectionStateUpdatedTime
// 			, statusUpdatedTime: device.statusUpdatedTime
// 			, lastActivityTime: device.lastActivityTime
// 		}
// 		, true
// 		, callback
// 	);
// }

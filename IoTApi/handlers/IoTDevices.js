'use strict';
var _ = require('lodash');
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
};

function registerIoTDevice(req, res) {
	console.log('Enter Iot Device: ' + JSON.stringify(req.body));

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

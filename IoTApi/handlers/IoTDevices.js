'use strict';
var common = require('./common.js');
var config = require('./azureKeys.js');
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
	createIoTDeviceOnHub(req.body.deviceUUID, req.headers.authorization, function(err, data, response) {
		if (err) {
			return res.status(500).json(err);
		}

		common.insertDocument(config.collection.devices, req.body)
			.then((insertedDoc) => {
				console.log('common.data = ' + insertedDoc);
				//res.status(200).json(insertedDoc);
				res.status(200).json(data);
			})
			.catch((error) => {
				//status = 500;
				console.log(error);
				res.status(500).json(error);
			});
	});
}

function createIoTDeviceOnHub(deviceId, sasToken, callback) {
	common.http.put(
		{ Authorization: sasToken }
		, `https://IoTPOCGateway.azure-devices.net/devices/${deviceId}?api-version=2016-11-14`
		, {
			deviceId: deviceId
		}
		, true
		, callback
	);
}

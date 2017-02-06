'use strict';
var _ = require('lodash');
var config = require('../azureKeys.js');
var common = require('../common.js');
/**
 * Operations on /IoTDevices/{deviceId}
 */
module.exports = {
    /**
     * summary:
     * description:
     * parameters: deviceId
     * produces: application/json, text/json
     * responses: 200
     */
    get: getIoTDevice
};

function getIoTDevice(req, res, next) {
	var deviceId = req.params.deviceId;

	retrieveIoTDeviceOnHub(deviceId, req.headers.authorization, function(err, data, response) {
		if (err) {
			return res.status(500).json(err);
		}
		if(!response || !(response.statusCode >= 200 && response.statusCode < 300 || response.statusCode === 304 || response.statusCode === 1223)) {
			return res.status(response? response.statusCode: 500).json(err || data);
		}
		common.queryCollection(config.collection.devices, `SELECT TOP 1 d.deviceId, d.deviceOSType, d.deviceOSVersion, d.deviceModel, d.meta FROM ${config.collection.devices} d WHERE d.deviceId = "${deviceId}"`)
			.then((results) => {
				res.status(200).json(results.length > 0? _.merge(data, results[0]): {});
			})
			.catch((error) => {
				console.log(error);
				res.status(500).json(error);
			});
	});
}

function retrieveIoTDeviceOnHub(deviceId, sasToken, callback) {
	common.http.get(
		{ Authorization: sasToken }
		, `https://IoTPOCGateway.azure-devices.net/devices/${deviceId}?api-version=2016-11-14`
		, true
		, callback
	);
}

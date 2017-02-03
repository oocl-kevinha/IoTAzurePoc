'use strict';
var common = require('../common.js');
var config = require('../azureKeys.js');
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
	console.log('req param = ' + req.params.deviceId);
	var deviceId = req.params.deviceId;

	common.queryCollection(config.collection.devices, `SELECT TOP 1 d.deviceId, d.status, d.statusReason, d.lastStatusUpdate, d.lastActivity, d.meta FROM ${config.collection.devices} d WHERE d.deviceId = "${deviceId}"`)
		.then((results) => {
			// console.log("common.data = " + common.data);
			console.log("common.data = " + results);
			res.status(200).json(results.length > 0? results[0]: {});
		})
		.catch((error) => {
			//status = 500;
			console.log(error);
			res.status(500).json(error);
		});
}

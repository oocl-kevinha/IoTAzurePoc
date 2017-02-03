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
	//return res.status(200).end();

	common.insertDocument(config.collection.devices, req.body)
		.then((insertedDoc) => {
			// console.log("common.data = " + common.data);
			console.log("common.data = " + insertedDoc);
			res.status(200).json(insertedDoc);
		})
		.catch((error) => {
			//status = 500;
			console.log(error);
			res.status(500).json(error);
		});
}

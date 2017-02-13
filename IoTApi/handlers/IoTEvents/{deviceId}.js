'use strict';
var common = require('../common.js');
var config = require('../azureKeys.js');

/**
 * Operations on /IoTEvents/{deviceId}
 */
module.exports = {
	/**
	 * summary:
	 * description:
	 * parameters: deviceId
	 * produces: application/json, text/json
	 * responses: 200
	 */
	get: queryEventByDeviceId
};

function queryEventByDeviceId(req, res, next) {
	console.log('req param = ' + req.params.deviceId);
	var querySpec = {
		query: `SELECT * FROM ${config.collection.events} r WHERE r.deviceId = @deviceId`
		, paramters: [
			{ name: '@deviceId', value: req.param.deviceId }
		]
	};
	var deviceId = req.params.deviceId;

	common.queryCollection(config.collection.events, querySpec, false)
		.then((results) => {
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.status(200).json(results);
		})
		.catch((error) => {
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.status(500).json(error);
		});
}

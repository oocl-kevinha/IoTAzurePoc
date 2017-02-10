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
	get: queryEventById
};

function queryEventById(req, res, next) {
	console.log('req param = ' + req.params.deviceId);
	var querySpec = {
		query: `SELECT * FROM ${config.collection.events} r WHERE r.deviceId = @deviceId`
		, paramters: [
			{ name: '@deviceId', value: req.param.deviceId }
		]
	};
	var deviceId = req.params.deviceId;

	common.queryCollection(config.collection.events, querySpec)
		.then((results) => {
			// console.log("common.data = " + common.data);
			console.log("common.data = " + results);
			res.status(200).json(results);
		})
		.catch((error) => {
			//status = 500;
			console.log(error);
			res.status(500).json(error);
		});
}

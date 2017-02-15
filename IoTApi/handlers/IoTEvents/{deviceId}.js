'use strict';
var common = require('../common.js');
var config = require('../azureKeys.js');

module.exports = {
	get: queryEventByDeviceId
};

function queryEventByDeviceId(req, res, next) {
	var querySpec = {
		query: `SELECT * FROM ${config.collection.events} r WHERE r.IoTHub.ConnectionDeviceId = @deviceId`
		, parameters: [
			{ name: '@deviceId', value: req.params.deviceId }
		]
	};
	console.log(querySpec);

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

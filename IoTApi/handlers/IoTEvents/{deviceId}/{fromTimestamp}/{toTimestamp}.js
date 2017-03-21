'use strict';
var _ = require('lodash');
var common = require('../../../../util/common');
var config = require('../../../../config/azure-keys');
var responseFactory = require('../../../../util/response-factory');

module.exports = {
	get: getIoTEventsByTime
};

function getIoTEventsByTime(req, res) {
	console.log(JSON.stringify(req.params, false, null));
	var querySpec = {
		query: `SELECT * FROM ${config.collection.events} r WHERE r.IoTHub.ConnectionDeviceId = @deviceId AND r.hAccuracy <= ${config.tolerence.H_ACCURACY}`
				+ ' AND r.hAccuracy > -1 AND r.timeStamp >= @fromTimestamp AND r.timeStamp <= @toTimestamp ORDER BY r.timeStamp DESC'
		, parameters: [
			{ name: '@deviceId', value: req.params.deviceId }
			, { name: '@fromTimestamp', value: req.params.fromTimestamp }
			, { name: '@toTimestamp', value: req.params.toTimestamp }
		]
	};
	// //console.log(querySpec);
	common.queryCollection(config.collection.events, querySpec, false, function(err, result) {
		if (err) {
			console.error(err);
			return res.status(500).json(responseFactory.buildFailureResponse(err));
		}
		res.json(responseFactory.buildSuccessResponse(result));
	});
}

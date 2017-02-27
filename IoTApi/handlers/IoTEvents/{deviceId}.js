'use strict';
var async = require('async');
var common = require('../../util/common');
var config = require('../../config/azure-keys');
var responseFactory = require('../../util/response-factory');

module.exports = {
	get: queryEventByDeviceId
};

function queryEventByDeviceId(req, res, next) {
	var pageNum = parseInt(req.query.pageNum);
	var pageSize = parseInt(req.query.pageSize);
	var topLimit = (pageNum + 1) * pageSize;

	async.waterfall(
		[
			function(callback) {
				var querySpec = {
					query: `SELECT TOP ${topLimit} * FROM ${config.collection.events} r WHERE r.IoTHub.ConnectionDeviceId = @deviceId AND r.hAccuracy <= '500' AND r.hAccuracy > '-1' AND r.timeStamp <= @timeStamp ORDER BY r.timeStamp DESC`
					, parameters: [
						{ name: '@deviceId', value: req.params.deviceId }
						, { name: '@timeStamp', value: `${req.query.timeStamp}` }
					]
				};
				// console.log(querySpec);
				common.queryCollection(config.collection.events, querySpec, pageSize, callback);
			}
			, function(cursor, callback) {
				common.fetchRecord(cursor, pageNum, callback);
			}
			, function(fetchedRecords, callback) {
				var querySpec = {
					query: `SELECT COUNT(r) COUNT FROM ${config.collection.events} r WHERE r.IoTHub.ConnectionDeviceId = @deviceId AND r.hAccuracy <= '500' AND r.hAccuracy > '-1'`
					, parameters: [
						{ name: '@deviceId', value: req.params.deviceId }
					]
				};
				common.queryCollection(config.collection.events, querySpec, false, function(err, counts) {
					if (err) {
						return callback(err);
					}
					callback(undefined, counts[0]? counts[0].COUNT: 0, fetchedRecords);
				});
			}
		]
		, function(err, count, fetchedRecords) {
			if (err) {
				console.error(err);
				return res.status(500).json(responseFactory.buildFailureResponse(err));
			}
			res.json(responseFactory.buildSuccessResponse({ count: count, events: fetchedRecords }));
		}
	);
}

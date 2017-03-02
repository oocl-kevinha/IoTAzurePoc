'use strict';
var _ = require('lodash');
var async = require('async');
var moment = require('moment');
var common = require('../../util/common');
var config = require('../../config/azure-keys');
var responseFactory = require('../../util/response-factory');

const eventType = config.eventType;

module.exports = {
	get: queryEventByDeviceId
};

function queryEventByDeviceId(req, res, next) {
	var rowNum = parseInt(req.query.rowNum);
	var pageSize = parseInt(req.query.pageSize);
	var topLimit = rowNum + pageSize + 48000; // each device should have < 48000 gps = 200km/h daily if 100m per point

	async.waterfall(
		[
			function(callback) {
				// Intermediate handling both string type and numeric type, field type is not standardized yet
				var querySpec = {
					query: `SELECT TOP ${topLimit} * FROM ${config.collection.events} r WHERE r.IoTHub.ConnectionDeviceId = @deviceId AND (IS_STRING(r.hAccuracy) OR (r.hAccuracy <= 500 AND r.hAccuracy > -1)) AND (r.timeStamp <= @strTimeStamp OR r.timeStamp <= @timeStamp) ORDER BY r.timeStamp DESC`
					, parameters: [
						{ name: '@deviceId', value: req.params.deviceId }
						, { name: '@timeStamp', value: req.query.timeStamp }
						, { name: '@strTimeStamp', value: `${req.query.timeStamp}` }
					]
				};
				// //console.log(querySpec);
				common.queryCollection(config.collection.events, querySpec, pageSize, callback);
			}
			, function(cursor, callback) {
				fetchRecord(cursor, rowNum, pageSize, [], callback);
			}
			, function(fetchedRecords, callback) {
				var querySpec = {
					query: `SELECT COUNT(r) COUNT FROM ${config.collection.events} r WHERE r.IoTHub.ConnectionDeviceId = @deviceId AND (IS_STRING(r.hAccuracy) OR (r.hAccuracy <= 500 AND r.hAccuracy > -1))`
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
			, function(count, fetchedRecords, callback) {
				if (fetchedRecords.length > 0) {
					var minDate = parseInt(fetchedRecords[0].timeStamp);
					var maxDate = parseInt(fetchedRecords[0].timeStamp);
					_.forEach(fetchedRecords, function(gpsEvent) {
						gpsEvent.timeStamp = parseInt(gpsEvent.timeStamp);
						minDate = minDate < gpsEvent.timeStamp? minDate: gpsEvent.timeStamp;
						maxDate = maxDate > gpsEvent.timeStamp? maxDate: gpsEvent.timeStamp;
					});
					var querySpec = {
						query: `SELECT l.eventLogId routeId, l.eventTime, l.fromTimestamp, l.toTimestamp, l.fromLocation, l.toLocation FROM ${config.collection.eventLogs} l where l.eventType = '${config.eventType.ROUTE_COMPLETED}' AND l.deviceId = @deviceId AND l.fromTimestamp <= @maxDate AND l.toTimestamp >= @minDate ORDER BY l.eventTime`
						, parameters: [
							{ name: '@minDate', value: moment(minDate) }
							, { name: '@maxDate', value: moment(maxDate) }
							, { name: '@deviceId', value: req.params.deviceId }
						]
					};
					common.queryCollection(config.collection.eventLogs, querySpec, false, function(err, routes) {
						if (err) {
							return callback(err);
						}
						var n = fetchedRecords.length - 1;
						_.forEach(routes, function(route) {
							for (; n >= 0; n--) {
								var routeFrom = moment(route.fromTimestamp);
								var routeTo = moment(route.toTimestamp);
								//console.log(moment(fetchedRecords[n].timeStamp).toISOString() + ' / ' + routeFrom.toISOString() + ' / ' + routeTo.toISOString());
								if (moment(fetchedRecords[n].timeStamp).isAfter(routeTo)) {
									break;
								}
								if (moment(fetchedRecords[n].timeStamp).isBetween(routeFrom, routeTo, null, '[]')) {
									fetchedRecords[n].routeId = route.routeId;
								}
							}
						});
						return callback(undefined, count, fetchedRecords, routes);
					});
				} else {
					return callback(undefined, count, fetchedRecords, []);
				}
			}
		]
		, function(err, count, fetchedRecords, routes) {
			if (err) {
				console.error(err);
				return res.status(500).json(responseFactory.buildFailureResponse(err));
			}
			res.json(responseFactory.buildSuccessResponse({ count: count, events: fetchedRecords, routes: routes }));
		}
	);
}

function fetchRecord(cursor, rowToSkip, pageSize, resultHolder, callback) {
	//console.log('fetchRecord');
	cursor.executeNext(function(err, nextBatch) {
		if (err) {
			return callback(err);
		}

		if (rowToSkip > nextBatch.length && nextBatch.length == pageSize) {
			//console.log('A');
			if (nextBatch.length < pageSize) {
				//console.log('A1.1');
				return callback(undefined, []);
			} else {
				//console.log('A1.2');
				fetchRecord(cursor, rowToSkip - pageSize, pageSize, resultHolder, callback);
			}
		} else {
			//console.log('B');
			if (nextBatch.length == pageSize) {
				//console.log('B1');
				if (rowToSkip == 0) {
					//console.log('B1.1');
					if (resultHolder.length < pageSize) {
						//console.log('B1.1.1');
						resultHolder = _.concat(resultHolder, _.takeRight(nextBatch, pageSize - resultHolder.length));
						fetchRecord(cursor, 0, pageSize, resultHolder, callback);
					} else {
						//console.log('B1.1.2');
						var fetchCompleted = false;
						var groupDate = resultHolder[resultHolder.length - 1].groupDate;

						for (var n = 0; n < nextBatch.length; n++) {
							if (nextBatch[n].groupDate === groupDate) {
								resultHolder.push(nextBatch[n]);
							} else {
								fetchCompleted = true;
								break;
							}
						}
						if (fetchCompleted) {
							return callback(undefined, resultHolder);
						} else {
							fetchRecord(cursor, 0, pageSize, resultHolder, callback);
						}
					}
				} else {
					//console.log('B1.2');
					resultHolder = _.concat(resultHolder, _.takeRight(nextBatch, pageSize - rowToSkip));
					fetchRecord(cursor, 0, pageSize, resultHolder, callback);
				}
			} else {
				//console.log('B2');
				if (nextBatch.length > rowToSkip) {
					//console.log('B2.1');
					resultHolder = _.concat(resultHolder, _.takeRight(nextBatch, nextBatch.length - rowToSkip));
					return callback(undefined, resultHolder);
				} else {
					//console.log('B2.2');
					return callback(undefined, []);
				}
			}
		}
	});
}

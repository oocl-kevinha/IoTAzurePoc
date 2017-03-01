'use strict';
var _ = require('lodash');
var async = require('async');
var config = require('../../config/azure-keys');
var common = require('../../util/common');
var deviceEndpoint = require('../../util/device');
var responseFactory = require('../../util/response-factory');

module.exports = {
	post: searchIoTEvent
};

function searchIoTEvent(req, res, next) {
	var searchConditions = req.body;
	var whereCondition = [];
	var param = [];
	_.forEach(
		searchConditions
		, function(condition, idx) {
			whereCondition.push(`e[@key${idx}] ${condition.operator} @value${idx}`);
			param.push({ name: `@key${idx}`, value: condition.key });
			param.push({ name: `@value${idx}`, value: condition.value });
		}
	);
	var querySpec = {
		query: `SELECT * FROM ${config.collection.events} e WHERE (IS_STRING(e.hAccuracy) OR (e.hAccuracy <= 500 AND e.hAccuracy > -1))` + (whereCondition.length > 0? ' AND (' + _.join(whereCondition, ' OR ') + ')': '') + ' ORDER BY e.timeStamp DESC'
		, parameters: param
	};

	common.queryCollection(config.collection.events, querySpec, true)
		.then((results) => {
			var resultArr = [];
			fetchItems(results, resultArr, function(err) {
				if (err) {
					console.error(err);
					return res.status(500).json(responseFactory.buildFailureResponse(err));
				}
				res.json(responseFactory.buildSuccessResponse(resultArr));
			});
		})
		.catch((error) => {
			console.error(error);
			res.status(500).json(error);
		});
}

function fetchItems(cursor, resultArray, callback) {
	if (cursor.hasMoreResults()) {
		cursor.nextItem(function(err, element) {
			if (err) {
				return callback(err);
			}
			if (element) {
				resultArray[resultArray.length] = element;
			}
			fetchItems(cursor, resultArray, callback);
		});
	} else {
		callback(undefined);
	}
}

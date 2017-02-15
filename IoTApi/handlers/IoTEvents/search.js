'use strict';
var _ = require('lodash');
var async = require('async');
var config = require('../azureKeys.js');
var common = require('../common.js');
var deviceEndpoint = require('../../common/device');
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
		query: `SELECT * FROM ${config.collection.events} e` + (whereCondition.length > 0? ' WHERE ' + _.join(whereCondition, ' OR '): '')
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
			console.log(error);
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

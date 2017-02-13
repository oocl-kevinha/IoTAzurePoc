'use strict';
var _ = require('lodash');
var async = require('async');
var config = require('../azureKeys.js');
var common = require('../common.js');
var deviceEndpoint = require('../../common/device');

module.exports = {
	post: searchIoTDevice
};

function searchIoTDevice(req, res, next) {
	var searchConditions = req.body;
	var whereCondition = [];
	var param = [];
	_.forEach(
		searchConditions
		, function(condition, idx) {
			whereCondition.push(`(m.key = @key${idx} AND m['value'] = @value${idx})`);
			param.push({ name: `@key${idx}`, value: condition.key });
			param.push({ name: `@value${idx}`, value: condition.value });
		}
	);
	var querySpec = {
		query: `SELECT d.deviceId, d.activationCode, d.meta FROM ${config.collection.devices} d` + (whereCondition.length > 0? ' JOIN m IN d.meta WHERE ' + _.join(whereCondition, ' OR '): '')
		, parameters: param
	};

	common.queryCollection(config.collection.devices, querySpec, false)
		.then((results) => {
			var retVal = [];
			async.each(
				results
				, function(result, callback) {
					deviceEndpoint.retrieveIoTDeviceOnHubById(result.deviceId, req.headers.authorization, function(err, data, response) {
						if (err) {
							return callback(err);
						}
						if(!response || !(response.statusCode >= 200 && response.statusCode < 300 || response.statusCode === 304 || response.statusCode === 1223)) {
							return callback(response? `Invalid Status Code [${response.statusCode}] from IoTHub`: 'No response');
						}
						retVal.push(_.merge(result, req.query.showKeys? data: _.omit(data, 'authentication')));
						callback(undefined);
					});
				}
				, function(err) {
					if (err) {
						console.log(err);
						res.setHeader('Access-Control-Allow-Origin', '*');
						return res.status(500).json(err);
					}
					res.setHeader('Access-Control-Allow-Origin', '*');
					res.status(200).json(_.compact(retVal));
				}
			);

		})
		.catch((error) => {
			console.log(error);
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.status(500).json(error);
		});
}

// function searchIoTDeviceOnHub(queryConditions, sasToken, callback) {
// 	var query
// 	common.http.get(
// 		{ Authorization: sasToken }
// 		, `https://IoTPOCGateway.azure-devices.net/devices/${deviceId}?api-version=2016-11-14`
// 		, true
// 		, callback
// 	);
// }

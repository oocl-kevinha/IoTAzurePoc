'use strict';
var _ = require('lodash');
var async = require('async');
var config = require('../azureKeys.js');
var common = require('../common.js');
var deviceEndpoint = require('../../common/device');

/**
 * Operations on /IoTDevices/search
 */
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
		query: `SELECT d.deviceId, d.deviceOSType, d.deviceOSVersion, d.deviceModel, d.meta FROM ${config.collection.devices} d JOIN m IN d.meta WHERE ` + _.join(whereCondition, ' OR ')
		, parameters: param
	};
	//return res.status(200).json(querySpec);
console.log(querySpec);
	common.queryCollection(config.collection.devices, querySpec)
		.then((results) => {
			async.concat(
				results
				, function(result, callback) {
					console.log(result);
					deviceEndpoint.retrieveIoTDeviceOnHubById(result.deviceId, req.headers.authorization, function(err, data, response) {
						if (err) {
							return callback(err);
						}
						if(!response || !(response.statusCode >= 200 && response.statusCode < 300 || response.statusCode === 304 || response.statusCode === 1223)) {
							return callback(response? `Invalid Status Code [${response.statusCode}] from IoTHub`: 'No response');
						}
						callback(undefined, _.merge(result, data));
					});
				}
				, function(err, mergedDocs) {
					if (err) {
						console.log(err);
						return res.status(500).json(err);
					}
					console.log(mergedDocs);
					res.status(200).json(_.compact(mergedDocs));
				}
			);

		})
		.catch((error) => {
			console.log(error);
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

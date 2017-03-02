'use strict';
var _ = require('lodash');
var config = require('../../config/azure-keys');
var common = require('../../util/common');
var responseFactory = require('../../util/response-factory');

module.exports = {
	get: getGeoFenceByIds
};

function getGeoFenceByIds(req, res) {
	var geoIds = req.params.geoId.split(',');
	var parameters = _.map(geoIds, function(geoId, idx) {
		return { name: '@geo' + idx, value: _.trim(geoId) };
	});

	var whereCondition = _.join(_.map(parameters, function(geoId) {
		return 'g.geoId = ' + geoId.name;
	}), ' OR ');

	var querySpec = {
		query: `SELECT g.geoId, g.geoName, g.geoType, g.coords, g.radiusInMetre FROM ${config.collection.geoFences} g` + (whereCondition? ' WHERE ' + whereCondition: '')
		, parameters: parameters
	};

	common.queryCollection(config.collection.geoFences, querySpec, false)
		.then((results) => {
			_.forEach(results, function(polygon) {
				if (polygon.geoType === 'polygon') {
					polygon.coords.coordinates = polygon.coords.coordinates[0];
				}
			});
			res.json(responseFactory.buildSuccessResponse(results));
		})
		.catch((error) => {
			console.error(error);
			res.status(500).json(responseFactory.buildFailureResponse(error));
		});
}

'use strict';
var _ = require('lodash');
var async = require('async');
var config = require('../../../config/azure-keys');
var common = require('../../../util/common');
var shapeUtil = require('../../../util/shape-util');
var responseFactory = require('../../../util/response-factory');
var deviceEndpoint = require('../../../util/device');

module.exports = {
	post: getGeoFenceInBound
};

function getGeoFenceInBound(req, res) {
	shapeUtil.convertPolygonToClockwise({ coords: { coordinates: req.body } });

	var coordStr = JSON.stringify({ type: 'Polygon', coordinates: [req.body] }, false, null);
	var result = [];
	// Document DB Client not support binding Object parameter
	var queryCircle = `SELECT g.geoId, g.geoName, g.geoType, g.coords, g.radiusInMetre, g.createdAt FROM ${config.collection.geoFences} g WHERE ST_INTERSECTS(`
				+ coordStr
				+ ', g.coords) AND g.isDeleted != \'T\' ORDER BY g.geoName';
	var queryPolygon = `SELECT g.geoId, g.geoName, g.geoType, g.coords, g.radiusInMetre, g.createdAt FROM ${config.collection.geoFences} g JOIN cc in g.coords.coordinates[0] WHERE ST_WITHIN({type: 'Point', coordinates: cc}, `
				+ coordStr
				+ ') AND g.isDeleted != \'T\' ORDER BY g.geoName';
	common.queryCollection(config.collection.geoFences, queryCircle)
		.then((circleResult) => {
			result = circleResult;
			return common.queryCollection(config.collection.geoFences, queryPolygon);
		}).then((polygonResult) => {
			res.json(responseFactory.buildSuccessResponse(_.uniqBy(_.concat(result, polygonResult), 'geoId')));
		})
		.catch((err) => {
			console.error(err);
			res.status(500).json(responseFactory.buildFailureResponse(error));
		});
}

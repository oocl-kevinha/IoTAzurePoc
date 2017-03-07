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
	// Document DB Client not support binding Object parameter
	var query = `SELECT g.geoId, g.geoName, g.geoType, g.coords, g.radiusInMetre, g.createdAt FROM ${config.collection.geoFences} g WHERE ST_INTERSECTS(`
				+ coordStr
				+ ', g.coords) AND g.isDeleted != \'T\' ORDER BY g.geoName';
	common.queryCollection(config.collection.geoFences, query)
		.then((result) => {
			res.json(responseFactory.buildSuccessResponse(result));
		})
		.catch((err) => {
			console.error(err);
			res.status(500).json(responseFactory.buildFailureResponse(error));
		});
}

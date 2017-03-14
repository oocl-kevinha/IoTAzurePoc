var _ = require('lodash');
var async = require('async');
var uuid = require('uuid');
var config = require('../config/azure-keys.js');
var common = require('../util/common');
var geoEventController = require('./geo-event-controller');
var responseFactory = require('../util/response-factory');
var shapeUtil = require('../util/shape-util');

// exports.getGeoFenceInBound = function(req, res) {
// 	convertPolygonToClockwise({ coords: { coordinates: req.body } });
//
// 	var coordStr = JSON.stringify({ type: 'Polygon', coordinates: [req.body] }, false, null);
// 	var result = [];
// 	// Document DB Client not support binding Object parameter
// 	var queryCircle = `SELECT g.geoId, g.geoName, g.geoType, g.coords, g.radiusInMetre, g.createdAt FROM ${config.collection.geoFences} g WHERE ST_INTERSECTS(`
// 				+ coordStr
// 				+ ', g.coords) AND g.isDeleted != \'T\' ORDER BY g.geoName';
// 	var queryPolygon = `SELECT g.geoId, g.geoName, g.geoType, g.coords, g.radiusInMetre, g.createdAt FROM ${config.collection.geoFences} g JOIN cc in g.coords.coordinates[0] WHERE ST_WITHIN({type: 'Point', coordinates: cc}, `
// 				+ coordStr
// 				+ ') AND g.isDeleted != \'T\' ORDER BY g.geoName';
// 	common.queryCollection(config.collection.geoFences, queryCircle)
// 		.then((circleResult) => {
// 			result = circleResult;
// 			return common.queryCollection(config.collection.geoFences, queryPolygon);
// 		}).then((polygonResult) => {
// 			res.json(responseFactory.buildSuccessResponse(_.uniqBy(_.concat(result, polygonResult), 'geoId')));
// 		})
// 		.catch((err) => {
// 			console.error(err);
// 			res.status(500).json(responseFactory.buildFailureResponse(error));
// 		});
// };

exports.deleteGeoFence = function(req, res) {
	var querySpec = {
		query: `SELECT TOP 1 * FROM ${config.collection.geoFences} d WHERE d.geoId = @geoId`
		, parameters: [
			{ name: '@geoId', value: req.params.geoId }
		]
	};

	async.waterfall(
		[
			function(callback) {
				common.queryCollection(config.collection.geoFences, querySpec, false, callback);
			}
			, function(results, callback) {
				if (results.length > 0) {
					results[0].isDeleted = 'T';
					callback(undefined, results[0]);
				} else {
					callback('NOT_FOUND');
				}
			}
			, function(geoFenceDoc, callback) {
				common.updateDocument(geoFenceDoc, callback);
			}
		]
		, function(err, updatedDevice) {
			if (err) {
				if (err === 'NOT_FOUND') {
					res.json(responseFactory.buildFailureResponse(`Geo Fence [${req.params.geoId}] not found`, 404));
				} else {
					console.error(err);
					res.status(500).json(responseFactory.buildFailureResponse(err));
				}
				return;
			}
			geoEventController.removeGeoFence(req.params.geoId);
			res.status(204).end();
		}
	);
};

exports.createGeoFenceLocations = function(req, res) {
	var geoFences = _.map(_.isArray(req.body)? req.body: [req.body], function(shape) {
		return {
			geoId: uuid.v4().toString()
			, geoName: shape.geoName
			, geoType: shape.geoType
			, coords: shape.coords
			, radiusInMetre: shape.radiusInMetre
			, isDeleted: 'F'
			, createdAt: new Date()
		};
	});

	if (!_.every(geoFences, validateShape)) {
		return res.status(400).json(responseFactory.buildFailureResponse('Invalid Shape', 400));
	}

	_.forEach(geoFences, shapeUtil.convertPolygonToClockwise);

	async.concat(
		geoFences
		, function(shape, callback) {
			common.insertDocument(config.collection.geoFences, shape, function(err, doc) {
				callback(err, shape);
			});
		}
		, function(err, result) {
			if (err) {
				console.error(err);
				return res.status(500).json(responseFactory.buildFailureResponse(err));
			}
			_.forEach(geoFences, function(geoFence) {
				geoEventController.setGeoFenceList(geoFence, true);
			});
			res.json(responseFactory.buildSuccessResponse(result));
		}
	);
};

// TODO Validation
function validateShape() {
	return true;
}

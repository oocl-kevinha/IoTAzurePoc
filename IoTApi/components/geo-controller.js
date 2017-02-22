var _ = require('lodash');
var async = require('async');
var uuid = require('uuid');
var config = require('../config/azure-keys.js');
var common = require('../util/common');
var responseFactory = require('../util/response-factory');

exports.getGeoFenceInBound = function(req, res) {
	convertPolygonToClockwise({ coords: { coordinates: req.body } });
	// var querySpec = {
	// 	query:
	// 	, parameters: { name: '@search', value: { type: 'Polygon', coordinates: [req.body] } }
	// };
	//
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
};

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

	_.forEach(geoFences, convertPolygonToClockwise);

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
			res.json(responseFactory.buildSuccessResponse(result));
		}
	);
};

// Document DB only support clockwise Polygon coordinates
// http://stackoverflow.com/questions/1165647/how-to-determine-if-a-list-of-polygon-points-are-in-clockwise-order
// https://en.wikipedia.org/wiki/Shoelace_formula
function convertPolygonToClockwise(shape) {
	if (shape.geoType === 'circle') { return; }
	//console.log('Before: ' + shape.coords.coordinates);
	var isClockwise = false;
	// Should not attempt more than number of vertex in polygon
	for (var count = 0; count < shape.coords.coordinates.length && !isClockwise; count++) {
		var sum = 0;
		for (var n = shape.coords.coordinates.length - 1; n >= 1; n--) {
			var nthPoint = shape.coords.coordinates[n];
			var nthMinusOnePoint = shape.coords.coordinates[n - 1];
			sum += (nthPoint[0] - nthMinusOnePoint[0]) * (nthPoint[1] - nthMinusOnePoint[1]);
		}
		if (sum < 0) {
			isClockwise = true
		} else {
			// Shift the points by 1 position and recalculate
			shape.coords.coordinates.splice(0, 0, shape.coords.coordinates.pop());
		}
	}
	shape.coords.coordinates.push(_.cloneDeep(shape.coords.coordinates[0]));
	shape.coords.coordinates = [shape.coords.coordinates];
	//console.log('After: ' + shape.coords.coordinates);
}

// TODO Validation
function validateShape() {
	return true;
}

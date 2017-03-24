var _ = require('lodash');
var async = require('async');
var uuid = require('uuid');
var config = require('../config/azure-keys.js');
var common = require('../util/common');
var geoEventController = require('./geo-event-controller');
var responseFactory = require('../util/response-factory');
var shapeUtil = require('../util/shape-util');

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

exports.getGeoFenceByCode = function(req, res) {
	var geoCodes = req.params.geoCode.split(',');
	var parameters = _.map(geoCodes, function(geoCode, idx) {
		return { name: '@geo' + idx, value: _.trim(geoCode) };
	});

	var whereCondition = _.join(_.map(parameters, function(geoCode) {
		return 'g.geoCode = ' + geoCode.name;
	}), ' OR ');

	var querySpec = {
		query: `SELECT * FROM ${config.collection.geoFences} g` + (whereCondition? ' WHERE ' + whereCondition: '')
		, parameters: parameters
	};

	common.queryCollection(config.collection.geoFences, querySpec, false)
		.then((results) => {
			res.json(responseFactory.buildSuccessResponse(results));
		})
		.catch((error) => {
			console.error(error);
			res.status(500).json(responseFactory.buildFailureResponse(error));
		});
};

// TODO Validation
function validateShape(shape) {
	//return true;

	if (!_.has(shape, 'coords.coordinates') || !_.isArray(shape.coords.coordinates)) {
		return false;
	}

	if (shape.geoType === 'circle') {
		return _.isNumber(shape.radiusInMetre) && (shape.coords.coordinates.length == 2) && _.isNumber(shape.coords.coordinates[0]) && _.isNumber(shape.coords.coordinates[1]);
	}
	return (shape.coords.coordinates.length > 0) && _.every(shape.coords.coordinates, function(lngLat) {
		return (lngLat.length == 2) && _.isNumber(lngLat[0]) && _.isNumber(lngLat[1]);
	});
}

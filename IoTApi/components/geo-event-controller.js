var _ = require('lodash');
var async = require('async');
var uuid = require('uuid');
var moment = require('moment');
var config = require('../config/azure-keys.js');
var common = require('../util/common');

const timeTolerence = config.tolerence.timeTolerence;

const eventType = config.eventType;

exports.handleGeoEvent = function(message) {
	var deviceId = message.systemProperties['iothub-connection-device-id'];
	// if (deviceId !== 'tsuitoTestGPSRouteDevice') {
	// 	return;
	// }
	//console.log(`Message received: [${deviceId}]`);
	var geoEvents = _.isArray(message.body)? message.body: [message.body];
	// _.forEach(geoEvents, function(gpsSignal) {
	// 	//console.log(JSON.stringify(gpsSignal));
	// });
	// return;

	async.waterfall(
		[
			function(callback) {
				var querySpec = {
					query: `SELECT TOP 1 * FROM ${config.collection.devices} d WHERE d.deviceId = @deviceId`
					, parameters: [{ name: '@deviceId', value: deviceId }]
				};
				common.queryCollection(config.collection.devices, querySpec, false, callback)
			}
			, function (devices, callback) {
				if (devices.length > 0) {
					async.concatSeries(
					// var c = 0;
					// async.mapLimit(
						geoEvents
						// , 2
						, function(gpsSignal, eachCallback) {
							if (gpsSignal.hAccuracy > config.tolerence.H_ACCURACY || gpsSignal.hAccuracy < 0 || (devices[0].lastGPSTimestamp && moment(gpsSignal.timeStamp).diff(devices[0].lastGPSTimestamp) >= 0)) {
								return eachCallback(undefined);
							}
							var coords = JSON.stringify({ type: 'Point', coordinates: [gpsSignal.longitude, gpsSignal.latitude] });
							// console.log(`SELECT TOP 1 g.geoId, g.geoName FROM ${config.collection.geoFences} g WHERE g.isDeleted != 'T' AND (ST_WITHIN(${coords}, g.coords)` + ` OR ST_DISTANCE(${coords}, g.coords) < g.radiusInMetre)`);
							common.queryCollection(
								config.collection.geoFences
								// No overlap area handling yet, assume only single polygon at a time
								, `SELECT TOP 1 g.geoId, g.geoName FROM ${config.collection.geoFences} g WHERE g.isDeleted != 'T' AND (ST_WITHIN(${coords}, g.coords)`
								+ ` OR ST_DISTANCE(${coords}, g.coords) < g.radiusInMetre)`
								, false
								, function(err, docs) {
									if (err) {
										return eachCallback(err);
									}
									//console.log(c++);
									// console.log('Matched Location: ' + JSON.stringify(docs));
									eachCallback(undefined, { gps: gpsSignal, geoFence: docs[0] });
								}
							);
						}
						, function(err, matchedGeoFences) {
							callback(err, devices[0], matchedGeoFences);
						}
					);
				} else {
					callback(`UNKNOWN Device [${deviceId}]`);
				}
			}
		]
		, function(err, device, matchedGeoFences) {
			if (err) {
				return console.error(err);
			}

			device.lastRoute = device.lastRoute || {};
			device.currentRoute = device.currentRoute || {};
			// async.concat fires query in parallel (potential over quota rate in query), sort event by timeStamp order
			var sorted = _.sortBy(matchedGeoFences, 'gps.timeStamp');
			var events = [];
			_.forEach(sorted, function(matchedGeoFence) {
				if (!matchedGeoFence) {
					// Skip non-accurate gps, hAccuracy > tolerence (refer config)
					return;
				}
				var eventTime = moment(matchedGeoFence.gps.timeStamp);
				device.lastGPSEvent = { timeStamp: eventTime, latitude: matchedGeoFence.gps.latitude, longitude: matchedGeoFence.gps.longitude, timezone: matchedGeoFence.gps.timezone };
				// Special handling for first event
				device.lastGPSTimestamp = device.lastGPSTimestamp || eventTime;
				device.lastGeoFenceTimestamp = device.lastGeoFenceTimestamp || eventTime;
				// In middle of route
				try {
					//console.log(matchedGeoFence.geoFence);
					if (!matchedGeoFence.geoFence) {
						//console.log('Branch B');
						/**
						 *	B. Currently not in a geofence
						 *	1. If last route not exists
						 *	1.1. From location not exists, do nothing
						 *	1.2. To location not exists, do nothing
						 *	1.3. From location exists, not stay long enough, erase fromLocation (previous fromLocation just passing through)
						 *	1.4. To location exists, not stay long enough, erase toLocation (previous toLocation is just passing through)
						 *	2. Last route exists => from location (must) exists
						 *	2.1. Last geofence timestamp equals last gps timestamp, to location not exists, i.e. last gps within geofence, set fromTimestamp to last gps signal time, fire exit geo fence event
						 *	2.2. Last geofence timestamp equals last gps timestamp, to location exists, i.e. pass through, remove potential to location
						**/
						if (!device.lastRoute.toLocation) {
							// B1
							//console.log('Branch B1');
							if (device.currentRoute.toLocation) {
								// B1.4
								//console.log('Branch B1.4');
								// var stayTimeInToLoc = moment(device.lastGeoFenceTimestamp).diff(device.currentRoute.toTimestamp, 'minutes');
								if (!device.currentRoute.enteredTo) {
								//if (stayTimeInToLoc < timeTolerence.ENTER_GEOFENCE) {
									device.currentRoute.toLocation = undefined;
									device.currentRoute.toTimestamp = undefined;
								}
							} else if (device.currentRoute.fromLocation) {
								// B1.3
								//console.log('Branch B1.3');
								// var stayTimeInFromLoc = moment(device.lastGeoFenceTimestamp).diff(device.currentRoute.fromTimestamp, 'minutes');
								// if (stayTimeInFromLoc < timeTolerence.ENTER_GEOFENCE) {
								if (!device.currentRoute.enteredFrom) {
									device.currentRoute.fromLocation = undefined;
									device.currentRoute.fromTimestamp = undefined;
								} else if (device.lastGPSTimestamp === device.lastGeoFenceTimestamp) {
									// Just exited geo fence, mark route start time as last geo fence point
									device.currentRoute.fromTimestamp = device.lastGeoFenceTimestamp;
									events.push(createGeoFenceEvent(deviceId, eventType.EXIT_GEOFENCE, eventTime, device.currentRoute.fromLocation));
								}
							}
							// else: B1.1, B1.2
						} else {
							// B2
							//console.log('Branch B2');
							// var stayTimeInLastLoc = moment(device.lastGeoFenceTimestamp).diff(device.currentRoute.toTimestamp || device.currentRoute.fromTimestamp, 'minutes');
							// if (device.lastGPSTimestamp === device.lastGeoFenceTimestamp
							// 		&& stayTimeInLastLoc < timeTolerence.ENTER_GEOFENCE
							// 		&& eventTime.diff(device.currentRoute.toTimestamp || device.currentRoute.fromTimestamp, 'minutes') >= timeTolerence.ENTER_GEOFENCE) {

							// Should not have case where current route entered to location as rolled to last route once confirmed
							if (device.lastGPSTimestamp === device.lastGeoFenceTimestamp) {
								if (device.currentRoute.toLocation && !device.currentRoute.enteredTo) {
									// B2.2
									//console.log('Branch B2.2');
									device.currentRoute.toLocation = undefined;
									device.currentRoute.toTimestamp = undefined;
								} else if (!device.currentRoute.toLocation && device.currentRoute.enteredFrom) {
									// B2.1
									//console.log('Branch B2.1');
									device.currentRoute.fromTimestamp = device.lastGeoFenceTimestamp;
									events.push(createGeoFenceEvent(deviceId, eventType.EXIT_GEOFENCE, eventTime, device.currentRoute.fromLocation));
								}
							}
						}
					} else {
						//console.log('Branch A');
						// Device is in a geo fence location
						/**
						 *	A. Currently in a geofence
						 *	1. If last route not exists
						 *	1.1. Stay in same geofence as from/to, check fire enter/route complete event
						 *	1.2. From location not exists, mark as potential fromLocation
						 *	1.3. To location not exists, different geofence as fromLocation, not stay long enough, mark as potential fromLocation (previous fromLocation is just passing through)
						 *	1.4. To location not exists, different geofence as fromLocation, stay long enough, mark as potential toLocation
						 *	1.5. To location exists, different geofence as toLocation, not stay long enough, mark as potential toLocation (previous toLocation is just passing through)
						 *	1.6. Return to same location as from after exit, mark as potential to
						 *	2. Last route exists => from location (must) exists
						 *	2.1. Stay in same geofence as from/to, check fire enter/route complete event
						 *	2.2. To location not exists, just entered geo location, mark as potential toLocation
						 *	2.3. To location exists, different geofence as toLocation, not stay long enough, mark as reached potential toLocation (previous toLocation is just passing through)
						**/
						// A1
						if (!device.lastRoute.toLocation) {
							if (device.currentRoute.toLocation) {
								// var stayTimeInToLoc = moment(device.lastGeoFenceTimestamp).diff(device.currentRoute.toTimestamp, 'minutes');
								if (device.currentRoute.toLocation.geoId === matchedGeoFence.geoFence.geoId) {
									// A1.1
									//console.log('Branch A1.1');
									var stayTimeInMin = eventTime.diff(device.currentRoute.toTimestamp, 'minutes');
									// Avoid duplicate enter geofence event, create enter geofence event
									if (stayTimeInMin >= timeTolerence.ENTER_GEOFENCE) {
										// if (stayTimeInToLoc < timeTolerence.ENTER_GEOFENCE) {
										if (!device.currentRoute.enteredTo) {
											device.currentRoute.enteredTo = true;
											events.push(createGeoFenceEvent(deviceId, eventType.ENTER_GEOFENCE, eventTime, device.currentRoute.toLocation));
											events.push(createRouteCompletedEvent(deviceId, eventTime, device.currentRoute));
											device.lastRoute = _.cloneDeep(device.currentRoute);
											device.currentRoute = {
												fromLocation: device.lastRoute.toLocation
												, fromTimestamp: eventTime
											};
											device.currentRoute.enteredFrom = true;
										}
									}
									// else: Enter geofence already sent, device stay in same toLocation
								} else {
									// A1.5
									//console.log('Branch A1.5');
									// if (stayTimeInToLoc < timeTolerence.ENTER_GEOFENCE) {
									if (!device.currentRoute.enteredTo) {
										device.currentRoute.toLocation = {
											geoId: matchedGeoFence.geoFence.geoId
											, geoName: matchedGeoFence.geoFence.geoName
										};
										device.currentRoute.toTimestamp = eventTime;
									}
									// else: not expected
								}
							} else if (device.currentRoute.fromLocation) {
								// var stayTimeInFromLoc = moment(device.lastGeoFenceTimestamp).diff(device.currentRoute.fromTimestamp, 'minutes');
								if (device.currentRoute.fromLocation.geoId === matchedGeoFence.geoFence.geoId) {
									if (device.lastGeoFenceTimestamp === device.lastGPSTimestamp) {
										// A1.1
										//console.log('Branch A1.1');
										var stayTimeInMin = eventTime.diff(device.currentRoute.fromTimestamp, 'minutes');
										// Avoid duplicate enter geofence event, create enter geofence event
										if (stayTimeInMin >= timeTolerence.ENTER_GEOFENCE) {
											// if (stayTimeInFromLoc < timeTolerence.ENTER_GEOFENCE) {
											if (!device.currentRoute.enteredFrom) {
												events.push(createGeoFenceEvent(deviceId, eventType.ENTER_GEOFENCE, eventTime, device.currentRoute.fromLocation));
												device.currentRoute.enteredFrom = true;
											}
										}
										// }
										// else: Enter geofence already sent, device stay in same fromLocation
									} else {
										// A1.6
										//console.log('Branch A1.6');
										device.currentRoute.toLocation = {
											geoId: matchedGeoFence.geoFence.geoId
											, geoName: matchedGeoFence.geoFence.geoName
										};
										device.currentRoute.toTimestamp = eventTime;
									}
								} else {
									// if (stayTimeInFromLoc < timeTolerence.ENTER_GEOFENCE) {
									if (!device.currentRoute.enteredFrom) {
										// 1.3
										//console.log('Branch A1.3');
										device.currentRoute.fromLocation = {
											geoId: matchedGeoFence.geoFence.geoId
											, geoName: matchedGeoFence.geoFence.geoName
										};
										device.currentRoute.fromTimestamp = eventTime;
									} else {
										// 1.4
										//console.log('Branch A1.4');
										device.currentRoute.toLocation = {
											geoId: matchedGeoFence.geoFence.geoId
											, geoName: matchedGeoFence.geoFence.geoName
										};
										device.currentRoute.toTimestamp = eventTime;
									}
								}
							} else {
								// A1.2
								//console.log('Branch A1.2');
								device.currentRoute.fromLocation = {
									geoId: matchedGeoFence.geoFence.geoId
									, geoName: matchedGeoFence.geoFence.geoName
								};
								device.currentRoute.fromTimestamp = eventTime;
							}
						} else {
							// A2
							//console.log('Branch A2');
							if (device.currentRoute.toLocation) {
								// var stayTimeInToLoc = moment(device.lastGeoFenceTimestamp).diff(device.currentRoute.toTimestamp, 'minutes');
								if (device.currentRoute.toLocation.geoId === matchedGeoFence.geoFence.geoId) {
									// A2.1
									//console.log('Branch A2.1');
									var stayTimeInMin = eventTime.diff(device.currentRoute.toTimestamp, 'minutes');
									// Avoid duplicate enter geofence event, create enter geofence event
									if (stayTimeInMin >= timeTolerence.ENTER_GEOFENCE) {
										// if (stayTimeInToLoc < timeTolerence.ENTER_GEOFENCE) {
										if (!device.currentRoute.enteredTo) {
											device.currentRoute.enteredTo = true;
											events.push(createGeoFenceEvent(deviceId, eventType.ENTER_GEOFENCE, eventTime, device.currentRoute.toLocation));
											events.push(createRouteCompletedEvent(deviceId, eventTime, device.currentRoute));
											device.lastRoute = _.cloneDeep(device.currentRoute);
											device.currentRoute = {
												fromLocation: device.lastRoute.toLocation
												, fromTimestamp: eventTime
											};
											device.currentRoute.enteredFrom = true;
										}
									}
									// else: enter geofence already sent, device stay in same toLocation
								} else {
									// A2.3
									//console.log('Branch A2.3');
									if (!device.currentRoute.enteredTo) {
									// if (stayTimeInToLoc < timeTolerence.ENTER_GEOFENCE) {
										device.currentRoute.toLocation = {
											geoId: matchedGeoFence.geoFence.geoId
											, geoName: matchedGeoFence.geoFence.geoName
										};
										device.currentRoute.toTimestamp = eventTime;
									}
									// else: not expected
								}
							} else {
								// A2.2
								//console.log('Branch A2.2');
								// if (device.currentRoute.fromLocation.geoId !== matchedGeoFence.geoFence.geoId) {
								if (device.lastGPSTimestamp !== device.lastGeoFenceTimestamp) {
									device.currentRoute.toLocation = {
										geoId: matchedGeoFence.geoFence.geoId
										, geoName: matchedGeoFence.geoFence.geoName
									};
									device.currentRoute.toTimestamp = eventTime;
								}
								// // else: not expected
							}
						}
						device.lastGeoFenceTimestamp = eventTime;
					}
					device.lastGPSTimestamp = eventTime;
					//console.log('Last Route: ' + eventTime);
					//console.log(JSON.stringify(device.lastRoute, false, null));
					//console.log('Current Route: ' + eventTime);
					//console.log(JSON.stringify(device.currentRoute, false, null));
				} catch (ex) {
					console.error(ex);
				}
			});
			//console.log('Events:');
			// _.forEach(events, function(event) {console.log(JSON.stringify(event, false, null));});
			async.waterfall(
				[
					function(callback) {
						async.each(
							events
							, function(event, eachCallback) {
								common.insertDocument(config.collection.eventLogs, event, eachCallback);
							}
							, callback
						);
					}
					, function(callback) {
						common.updateDocument(device, callback);
					}
				]
				, function(err) {
					if (err) {
						console.error(err);
					}
				}
			);
		}
	);
};

function createGeoFenceEvent(deviceId, eventType, eventTime, location) {
	return {
		eventLogId: uuid.v4().toString()
		, eventType: eventType
		, deviceId: deviceId
		, eventTime: eventTime
		, location: location
		, createdAt: new Date()
	};
}

function createRouteCompletedEvent(deviceId, eventTime, route) {
	return {
		eventLogId: uuid.v4().toString()
		, eventType: eventType.ROUTE_COMPLETED
		, deviceId: deviceId
		, eventTime: eventTime
		, fromTimestamp: route.fromTimestamp
		, toTimestamp: route.toTimestamp
		, fromLocation: route.fromLocation
		, toLocation: route.toLocation
		, createdAt: new Date()
	};
}

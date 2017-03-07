var crypto = require('crypto');

var DocumentClient = require('documentdb').DocumentClient;
var EventHubClient = require('azure-event-hubs').Client;
var config = require('../config/azure-keys.js');
var url = require('url');

var client = new DocumentClient(config.endpoint, { masterKey: config.primaryKey });

var HttpStatusCodes = { NOTFOUND: 404 };
var databaseUrl = `dbs/${config.database.id}`;
var collectionUrlBase = `${databaseUrl}/colls/`;

module.exports = {
	initializeEventListener: initializeEventListener
	, initializeDB: initializeDB
	, generateSasToken: generateSasToken
	, getDatabase: getDatabase
	, getCollection: getCollection
	, queryCollection: queryCollection
	, insertDocument: insertDocument
	, updateDocument: updateDocument
	, fetchRecord: fetchRecord
	, buildCollectionUrl: buildCollectionUrl
	, http: require('../util/http-manager')
};

function initializeEventListener() {
	var hubConnectionString = config.iothub_connectionString;

	var evtClient = EventHubClient.fromConnectionString(hubConnectionString);
	evtClient.open()
		.then(evtClient.getPartitionIds.bind(evtClient))
		.then(function (partitionIds) {
			return partitionIds.map(function (partitionId) {
				return evtClient.createReceiver('$Default', partitionId, { 'startAfterTime' : Date.now() }).then(function(receiver) {
					console.info('Created Event Hub partition receiver: ' + partitionId);
					receiver.on('errorReceived', console.error);
					receiver.on('message', require('../components/geo-event-controller').handleGeoEvent);
				});
			});
		})
		.catch(console.error);

}

function initializeDB() {
	getDatabase()
		.then(() => getCollection(config.collection.devices))
		.then(() => getCollection(config.collection.events))
		.then(() => getCollection(config.collection.geoFences))
		.then(() => getCollection(config.collection.eventLogs))
		.then(() => console.log('All collections initialized'))
		.catch((error) => console.error('DB/Collection initialization failed [' + JSON.stringify(error, false, null) + ']'));
}

function buildCollectionUrl(collectionName) {
	return `${collectionUrlBase}${collectionName}`;
}

function generateSasToken(resourceUri, signingKey, policyName, expiresInMins) {
	resourceUri = encodeURIComponent(resourceUri);

	// Set expiration in seconds
	var expires = Math.ceil((Date.now() / 1000) + expiresInMins * 60);
	var toSign = resourceUri + '\n' + expires;

	// Use crypto
	var hmac = crypto.createHmac('sha256', new Buffer(signingKey, 'base64'));
	hmac.update(toSign);
	var base64UriEncoded = encodeURIComponent(hmac.digest('base64'));

	// Construct autorization string
	var token = 'SharedAccessSignature sr=' + resourceUri + '&sig=' + base64UriEncoded + '&se=' + expires;
	if (policyName) {
		token += '&skn=' + policyName;
	}
	return token;
}

function getDatabase(database) {
	return new Promise((resolve, reject) => {
		client.readDatabase(databaseUrl, (err, result) => {
			if (err) {
				if (err.code == HttpStatusCodes.NOTFOUND) {
					client.createDatabase(config.database, (createErr, created) => {
						if (createErr) {
							return reject(createErr);
						}
						return resolve(created);
					});
				} else {
					return reject(err);
				}
			} else {
				resolve(result);
			}
		});
	});
}

function getCollection(collectionName) {
	return new Promise((resolve, reject) => {
		client.readCollection(buildCollectionUrl(collectionName), (err, result) => {
			if (err) {
				if (err.code == HttpStatusCodes.NOTFOUND) {
					client.createCollection(databaseUrl, { id: collectionName }, { offerThroughput: 400 }, (createErr, created) => {
						if (createErr) {
							return reject(createErr);
						}
						return resolve(created);
					});
				} else {
					return reject(err);
				}
			} else {
				resolve(result);
			}
		});
	});
}

function queryCollection(collectionName, query, isIterator, callback) {
	return new Promise((resolve, reject) => {
		var iterator = client.queryDocuments(buildCollectionUrl(collectionName), query, {maxItemCount: isIterator || Math.max(100, isIterator)});
		if (isIterator) {
			if (callback) {
				callback(undefined, iterator);
			}
			resolve(iterator);
		} else {
			iterator.toArray((err, results) => {
				if (callback) {
					callback(err, results);
				}
				if (err) {
					return reject(err);
				}
				resolve(results);
			});
		}
	});
}

function insertDocument(collectionName, document, callback) {
	return new Promise((resolve, reject) => {
		client.createDocument(buildCollectionUrl(collectionName), document, function(err, doc) {
			if (callback) {
				callback(err, doc);
			}
			if (err) {
				return reject(err);
			}
			resolve(doc);
		});
	});
}

function updateDocument(document, callback) {
	return new Promise((resolve, reject) => {
		client.replaceDocument(document._self, document, function(err, doc) {
			if (callback) {
				callback(err, doc);
			}
			if (err) {
				return reject(err);
			}
			resolve(doc);
		});
	});
}

function fetchRecord(cursor, pageNum, callback) {
	cursor.executeNext(function(err, nextBatch) {
		if (err) {
			return callback(err);
		}
		if (pageNum - 1 >= 0) {
			if (nextBatch.length > 0) {
				fetchRecord(cursor, pageNum - 1, callback);
			} else {
				return callback(undefined, []);
			}
		} else {
			return callback(undefined, nextBatch);
		}
	});
}

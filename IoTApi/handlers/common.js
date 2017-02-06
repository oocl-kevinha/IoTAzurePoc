var crypto = require('crypto');

var DocumentClient = require('documentdb').DocumentClient;
var config = require('./azureKeys.js');
var url = require('url');

var client = new DocumentClient(config.endpoint, { 'masterKey': config.primaryKey });

var HttpStatusCodes = { NOTFOUND: 404 };
var databaseUrl = 'dbs/' + config.database.id;
var collectionUrlBase = databaseUrl + '/colls/';// + config.collection.id;

//var data = ['abc'];

module.exports = {
	initializeDB: initializeDB
	, generateSasToken: generateSasToken
	, getDatabase: getDatabase
	, getCollection: getCollection
	, queryCollection: queryCollection
	, insertDocument: insertDocument
	, buildCollectionUrl: buildCollectionUrl
	, http: require('../util/http-manager')
};

function initializeDB() {
	getDatabase()
		.then(() => getCollection(config.collection.devices))
		.then(() => getCollection(config.collection.events))
		.then(() => console.log('All collections initialized'))
		.catch((error) => console.error(`DB/Collection initialization failed [${error}]`));
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

/**
 * Get the document database by ID, or create if it doesn't exist.
 * @param {string} database - The database to get or create
 */
function getDatabase(database) {
	console.log('Getting database: [%s]', database || config.database.id);

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
				}
				return reject(err);
			}
			resolve(result);
		});
	});
}

/**
 * Get the collection by ID, or create if it doesn't exist.
 */
function getCollection(collectionName) {
	console.log('Getting collection: [%s]', collectionName);

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
				}
				return reject(err);
			}
			resolve(result);
		});
	});
}

/**
 * Query the collection using SQL
 */
function queryCollection(collectionName, query) {
	console.log('Querying collection through:\n%s', query);
	//var queryData = [];
	return new Promise((resolve, reject) => {
		client.queryDocuments(
			buildCollectionUrl(collectionName),
			query
		).toArray((err, results) => {
			if (err) {
				return reject(err);
			}
			resolve(results);
		});
	});
}

function insertDocument(collectionName, document) {
	console.log(`insert into ${collectionName}`);
	return new Promise((resolve, reject) => {
		client.createDocument(buildCollectionUrl(collectionName), document, function(err, doc) {
			if (err) {
				return reject(err);
			}
			resolve(doc);
		});
	});
}

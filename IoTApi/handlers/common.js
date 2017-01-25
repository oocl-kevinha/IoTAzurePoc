var crypto = require('crypto');

var documentClient = require("documentdb").DocumentClient;
var config = require("./azureKeys.js");
var url = require('url');

var client = new documentClient(config.endpoint, { "masterKey": config.primaryKey });

var HttpStatusCodes = { NOTFOUND: 404 };
var databaseUrl = "dbs/" + config.database.id;
var collectionUrl = databaseUrl + "/colls/" + config.collection.id;

var data = ['abc'];

module.exports = {
    
    data : [],
	
	generateSasToken : function(resourceUri, signingKey, policyName, expiresInMins) {
	    resourceUri = encodeURIComponent(resourceUri.toLowerCase()).toLowerCase();

	    // Set expiration in seconds
	    var expires = (Date.now() / 1000) + expiresInMins * 60;
	    expires = Math.ceil(expires);
	    var toSign = resourceUri + '\n' + expires;

	    // Use crypto
	    var hmac = crypto.createHmac('sha256', new Buffer(signingKey, 'base64'));
	    hmac.update(toSign);
	    var base64UriEncoded = encodeURIComponent(hmac.digest('base64'));

	    // Construct autorization string
	    var token = "SharedAccessSignature sr=" + resourceUri + "&sig="
	    + base64UriEncoded + "&se=" + expires;
	    if (policyName) token += "&skn="+policyName;
	    return token;
	},
    
    /**
     * Get the document database by ID, or create if it doesn't exist.
     * @param {string} database - The database to get or create
     */
    getDatabase : function(){
        console.log("Getting database:\n%s\n", config.database.id);
        
        return new Promise((resolve, reject) => {
            client.readDatabase(databaseUrl, (err, result) => {
                if (err) {
                    if (err.code == HttpStatusCodes.NOTFOUND) {
                        client.createDatabase(config.database, (err, created) => {
                            if (err) reject(err)
                            else resolve(created);
                        });
                    } else {
                        reject(err);
                    }
                } else {
                    resolve(result);
                }
            });
        });
    },
    
    /**
     * Get the collection by ID, or create if it doesn't exist.
     */
    getCollection : function() {
        console.log("Getting collection:\%s\n", config.collection.id);

        return new Promise((resolve, reject) => {
            client.readCollection(collectionUrl, (err, result) => {
                if (err) {
                    if (err.code == HttpStatusCodes.NOTFOUND) {
                        client.createCollection(databaseUrl, config.collection, { offerThroughput: 400 }, (err, created) => {
                            if (err) reject(err)
                            else resolve(created);
                        });
                    } else {
                        reject(err);
                    }
                } else {
                    resolve(result);
                }
            });
        });
    },
    
    /**
     * Query the collection using SQL
     */
    queryCollection : function(deviceId) {
        console.log("Querying collection through index:\n%s", config.collection.id);
        var self = this;
        self.data = [];
        //data = [];
        return new Promise((resolve, reject) => {
            client.queryDocuments(
                collectionUrl,
                'SELECT * FROM IoTPOCSimEvents r WHERE r.deviceId = "' + deviceId + '" or r.device="' + deviceId + '"'
            ).toArray((err, results) => {
                if (err) reject(err)
                else {
                    for (var queryResult of results) {
                        var resultString = JSON.stringify(queryResult);
                        console.log("\tQuery returned %s", resultString);
                        self.data.push(resultString);
                    }
                    console.log();
                    resolve(results);
                }
            });
        });
    }
}
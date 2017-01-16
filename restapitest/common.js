var crypto = require('crypto');
var rp = require('request-promise');
var omitEmpty = require('omit-empty');

//rp.debug=true;

var self = {
	
    generateSasToken : function(resourceUri, signingKey, policyName, expiresInMins) {
        var genSasUrl = "https://iotapiapp.azurewebsites.net/generateSasToken";
        //var genSasUrl = "http://ngsc-2-w7:8000/generateSasToken";
        
        console.log(omitEmpty({ resourceUri: resourceUri, signingKey: signingKey, policyName: policyName, expiresInMins: expiresInMins }));
        
        //var requestBody = JSON.stringify(omitEmpty({ resourceUri: resourceUri, signingKey: signingKey, policyName: policyName, expiresInMins: expiresInMins }));
        var requestBody = omitEmpty({ resourceUri: resourceUri, signingKey: signingKey, policyName: policyName, expiresInMins: expiresInMins });
        
        var token = null;
	    
        console.log("start");
        
        var options = {
            method: 'POST',
            uri: genSasUrl,
            body: requestBody,
            json: true,
            headers: {
                'Content-Type': 'application/json'
            }
            
        };
        
        console.log("return promise...");
        return rp(options).promise();
        
	},
    
    /* 
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
	    token = "SharedAccessSignature sr=" + resourceUri + "&sig="
	    + base64UriEncoded + "&se=" + expires;
	    if (policyName) token += "&skn="+policyName;
	    return token;
	} */
}

module.exports = self;
var crypto = require('crypto');
module.exports = {
	
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
	}
}
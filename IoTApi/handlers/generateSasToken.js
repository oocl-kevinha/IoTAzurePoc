'use strict';
var common = require('./common.js');
var crypto = require('crypto');
/**
 * Operations on /generateSasToken
 */
module.exports = {
	/**
	 * summary:
	 * description:
	 * parameters: SasRequest
	 * produces: application/json, text/json
	 * responses: 200
	 */
	post: generateSasToken
};

function generateSasToken(req, res, next) {
	var SasRequest = req.body;
	var resourceUri = SasRequest.resourceUri;
	var signingKey = SasRequest.signingKey;
	var policyName = SasRequest.policyName;
	var expiresInMins = SasRequest.expiresInMins;

	var token = common.generateSasToken(resourceUri, signingKey, policyName, expiresInMins);
	console.log("token generated: " + token);

	var SasToken = { "token": token };

	res.status(200).send(SasToken);
}

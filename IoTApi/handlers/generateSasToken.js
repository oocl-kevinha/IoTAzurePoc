'use strict';
var config = require('./azureKeys');
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
	var signingKey = SasRequest.signingKey || config.iothub_registryReadWrite_key;
	var policyName = SasRequest.policyName;
	var expiresInMins = SasRequest.expiresInMins;

	var token = common.generateSasToken(resourceUri, signingKey, policyName, expiresInMins);
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.status(200).json({token: token});
}

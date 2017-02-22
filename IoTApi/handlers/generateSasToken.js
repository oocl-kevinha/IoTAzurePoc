'use strict';
var config = require('../config/azure-keys');
var common = require('../util/common');
var crypto = require('crypto');
var responseFactory = require('../util/response-factory');

module.exports = {
	post: generateSasToken
};

function generateSasToken(req, res, next) {
	var SasRequest = req.body;
	var resourceUri = SasRequest.resourceUri;
	var signingKey = SasRequest.signingKey || config.iothub_registryReadWrite_key;
	var policyName = SasRequest.policyName;
	var expiresInMins = SasRequest.expiresInMins;

	var token = common.generateSasToken(resourceUri, signingKey, policyName, expiresInMins);
	res.json(responseFactory.buildSuccessResponse({token: token}));
}

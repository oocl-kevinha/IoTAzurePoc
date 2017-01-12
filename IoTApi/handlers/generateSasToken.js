'use strict';
var dataProvider = require('../data/generateSasToken.js');
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
    post: function generateSasToken(req, res, next) {
        /**
         * Post the data for response 200
         * For response `default` status 200 is used.
         */
        console.log("in generateSasToken, received request...");
        console.log(req.body);
        var status = 200;
        
        var SasRequest = req.body;
        var resourceUri = SasRequest.resourceUri;
        var signingKey = SasRequest.signingKey;
        var policyName = SasRequest.policyName;
        var expiresInMins = SasRequest.expiresInMins;
        
        var token = common.generateSasToken(resourceUri, signingKey, policyName, expiresInMins);
        console.log("token generated: " + token);
        
        var SasToken = { "token": token };
        
        res.status(status).send(SasToken);
        
        // var provider = dataProvider['post']['200'];
        // provider(req, res, function (err, data) {
            // if (err) {
                // next(err);
                // return;
            // }
            
            // res.status(status).send(data && data.responses);
        // });
    }
};

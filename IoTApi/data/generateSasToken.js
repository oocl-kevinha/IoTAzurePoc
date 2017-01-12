'use strict';
var Mockgen = require('./mockgen.js');
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
     * operationId: generateSasToken
     */
    post: {
        200: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/generateSasToken',
                operation: 'get',
                response: '200'
            }, callback);
        }
    }
};

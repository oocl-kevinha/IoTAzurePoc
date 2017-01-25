'use strict';
var Mockgen = require('../mockgen.js');
/**
 * Operations on /IoTEvents/{deviceId}
 */
module.exports = {
    /**
     * summary: 
     * description: 
     * parameters: deviceId
     * produces: application/json, text/json
     * responses: 200
     * operationId: iotEvents
     */
    get: {
        200: function (req, res, callback) {
            /**
             * Using mock data generator module.
             * Replace this by actual data for the api.
             */
            Mockgen().responses({
                path: '/IoTEvents/{deviceId}',
                operation: 'get',
                response: '200'
            }, callback);
        }
    }
};

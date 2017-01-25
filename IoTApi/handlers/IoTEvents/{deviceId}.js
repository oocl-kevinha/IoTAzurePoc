'use strict';
var dataProvider = require('../../data/IoTEvents/{deviceId}.js');
var common = require('../common.js');

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
     */
    get: function iotEvents(req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        var status = 200;
        var data = null;
        console.log("req param = " + req.params['deviceId']);
        var deviceId = req.params['deviceId'];
        
        common.getDatabase()
            .then(() => common.getCollection())
            .then(() => common.queryCollection(deviceId))
            .then(() => {
                console.log("common.data = " + common.data);
                data = common.data;
                res.status(status).send(data);
            })
            .catch((error) => { 
                status = 500;
                res.status(status).send(error);                
            });
        
    }
    
    // get: function iotEvents(req, res, next) {
        // /**
         // * Get the data for response 200
         // * For response `default` status 200 is used.
         // */
        // var status = 200;
        // console.log("req param = " + req.params['deviceId']);
        // var provider = dataProvider['get']['200'];
        // provider(req, res, function (err, data) {
            // if (err) {
                // next(err);
                // return;
            // }
            // res.status(status).send(data && data.responses);
        // });
    // }
};

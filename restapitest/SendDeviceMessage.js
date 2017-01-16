 'use strict';

var common = require('./common.js');
var azureKeys = require('../azureKeys.js');
var rp = require('request-promise');
//rp.debug=true;

var deviceId = "ngscSixthDevice"
var resourceUri = "IoTPOCGateway.azure-devices.net/devices/" + deviceId;

var eventsUri = 'https://IoTPOCGateway.azure-devices.net/devices/' + deviceId + '/messages/events?api-version=2016-02-03'

//Device Key
var signingKey = azureKeys.deviceKeys[deviceId];
// console.log(signingKey);

var policyName = null;
var expiresInMins = 15;

var response = common.generateSasToken(resourceUri, signingKey, policyName, expiresInMins);
var token = null;

//token = response;


response.bind(this).then(function(parsedBody){
    console.log(parsedBody.token);
    token = parsedBody.token;
    
    console.log("finished gen token...? " + token);

    setInterval(function(){
         var windSpeed = 10 + (Math.random() * 4);
         var data = JSON.stringify({ deviceId: deviceId, windSpeed: windSpeed });
         
         console.log("Sending message: " + data);

         // Use DateTime as messageId...
         var messageId = new Date().toISOString().replace(/T/, ' ').replace(/\../, '');
         
         // Simulate device message send using Rest API
         var options = {
            method: 'POST',
            uri: eventsUri,
            body: data,
            //json: true,
            resolveWithFullResponse: true,
            headers: {
                'Content-Type': 'application/json',
                'Content-Encoding': 'UTF8',
                'Authorization': token,
                
                //below headers are redundant 
                'IoTHub-MessageId': messageId,
                'IoTHub-CorrelationId': 'TruckerApp_corelatedid',
                'IoTHub-UserId': 'ngsc',
                'IoTHub-app-GroupId': 'IoTPOC_group',
                'IoTHub-app-CustomProp1': 'app_custom_property_value',
                "IoTHub-app-Prop": "test",
            }
         };
         
         rp(options).then(function(response){
            console.log("Finished sending event..." + messageId);
            console.log(response.statusCode);
            console.log(response.headers);
            console.log(response.body);
             
         });
         
     }, 20000);
})










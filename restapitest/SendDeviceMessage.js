 'use strict';

var common = require('../common.js');
var azureKeys = require('../azureKeys.js');

var deviceId = "ngscSixthDevice"
var resourceUri = "IoTPOCGateway.azure-devices.net/devices/" + deviceId;

var eventsUri = 'https://IoTPOCGateway.azure-devices.net/devices/' + deviceId + '/messages/events?api-version=2016-02-03'

//Device Key
var signingKey = azureKeys.deviceKeys[deviceId];
// console.log(signingKey);

var policyName = null;
var expiresInMins = 15;

var token = common.generateSasToken(resourceUri, signingKey, policyName, expiresInMins);
// console.log(token);

var unirest = require('unirest');

setInterval(function(){
     var windSpeed = 10 + (Math.random() * 4);
     var data = JSON.stringify({ deviceId: deviceId, windSpeed: windSpeed });
     
     console.log("Sending message: " + data);

     //Use DateTime as messageId...
     var messageId = new Date().toISOString().replace(/T/, ' ').replace(/\../, '');
     
     //Simulate device message send using Rest API
     unirest.post(eventsUri)
        .header('Content-Type', 'application/json')
        .header('Content-Encoding', 'UTF8')
        .header('Authorization', token)
        .header('IoTHub-MessageId', messageId)
        .header('IoTHub-CorrelationId', 'TruckerApp_corelatedid')
        .header('IoTHub-UserId', 'ngsc')
        .header('IoTHub-app-GroupId', 'IoTPOC_group')
        .header('IoTHub-app-CustomProp1', 'app_custom_property_value')
        .header("IoTHub-app-Prop", "test")
        .send(data)
        .end(function (response) {
         //show response code, headers and body
          console.log(response.code);
          console.log(response.headers);
          console.log(response.body);
          
          console.log(response.request.headers);
          console.log(response.request.body);
    });

 }, 20000);







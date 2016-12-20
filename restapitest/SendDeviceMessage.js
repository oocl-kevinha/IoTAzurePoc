 'use strict';

var common = require('../common.js');
var azureKeys = require('../azureKeys.js');

var resourceUri = "IoTPOCGateway.azure-devices.net/devices/ngscSecondDevice";

//Device Key
var signingKey = azureKeys.second_device_key;

var policyName = null;
var expiresInMins = 15;



var token = common.generateSasToken(resourceUri, signingKey, policyName, expiresInMins);
console.log(token);

var unirest = require('unirest');

setInterval(function(){
     var windSpeed = 10 + (Math.random() * 4);
     var data = JSON.stringify({ deviceId: 'ngscSecondDevice', windSpeed: windSpeed });
     
     console.log("Sending message: " + data);

     //Simulate Second device message send using Rest API
     unirest.post('https://IoTPOCGateway.azure-devices.net/devices/ngscSecondDevice/messages/events?api-version=2016-02-03')
        .header('Content-Type', 'application/json')
        .header('Authorization', token)
        .send(data)
        .end(function (response) {
          //show response code, headers and body
          console.log(response.code);
          console.log(response.headers);
          console.log(response.body);
    });

 }, 20000);







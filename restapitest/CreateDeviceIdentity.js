 'use strict';
//var crypto = require('crypto');

var azureKeys = require('../azureKeys.js');
var rp = require('request-promise');

var resourceUri = "IoTPOCGateway.azure-devices.net/devices";
//one of the keys of the registryRead policy, can't add new device !?
// var signingKey = azureKeys.iothub_registryRead_key;
// var policyName = "registryRead";

//one of the keys of the service policy, can't add new device
// var signingKey = azureKeys.iothub_service_key;
// var policyName = "service";

//one of the keys of the registryReadWrite policy
var signingKey = azureKeys.iothub_registryReadWrite_key;
var policyName = "registryReadWrite";

// one of the keys of the iothubowner policy
// var signingKey = azureKeys.iothub_iothubowner_key
// var policyName = "iothubowner";

var expiresInMins = 15;
var common = require('./common.js');

var token = null;
var response = common.generateSasToken(resourceUri, signingKey, policyName, expiresInMins);
//token = response;
//console.log(token);

var data = {deviceId: 'ngscNinthDevice'};
var deviceProvisionUrl = 'https://IoTPOCGateway.azure-devices.net/devices/' + data.deviceId + '?api-version=2016-02-03';
var requestBody = JSON.stringify(data);

response.bind(this).then(function(parsedBody){
    token = parsedBody.token;
    
    console.log("finished gen token...? " + token);
    
    var data = {deviceId: 'ngscTenthDevice'};
    var deviceProvisionUrl = 'https://IoTPOCGateway.azure-devices.net/devices/' + data.deviceId + '?api-version=2016-02-03';
    var requestBody = JSON.stringify(data);
    
    var options = {
        method: 'PUT',
        uri: deviceProvisionUrl,
        body: requestBody,
        //json: true,
        resolveWithFullResponse: true,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
        }
    };
     
    rp(options)
    .then(function(response){
        console.log(response.statusCode);
        console.log(response.headers);
        console.log(response.body);
         
    })
    .catch(function(err){
        console.log(err.statusCode);
        console.log(err.error);
    });
    
    var getOptions = {
        method: 'GET',
        uri: deviceProvisionUrl,
        //json: true,
        resolveWithFullResponse: true,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
        }
    };
    var getRp = require('request-promise');
    getRp(getOptions).then(function(response){
        console.log("Get Device Info:- " + data.deviceId);
        console.log(response.statusCode);
        console.log(response.headers);
        console.log(response.body);
         
    });
    
});




//Add Device
// unirest.put(deviceProvisionUrl)
// .header('Content-Type','application/json')
// .header('Authorization', token)
// .send(requestBody)
// .end(function (response) {
  // console.log(response.code);
  // console.log(response.headers);
  // console.log(response.body);
// });

// Get device information (Device Id, Keys, Status... etc)
// unirest.get(deviceProvisionUrl)
// .header('Content-Type','application/json')
// .header('Authorization', token)
// .end(function (response) {
  // console.log(response.body);
// });



 'use strict';

 var EventHubClient = require('azure-event-hubs').Client;

 var azureKeys = require('../azureKeys.js');
 var connectionString = azureKeys.iothub_connectionString;

 var printError = function (err) {
   console.log(err.message);
 };

 var printMessage = function (message) {
   console.log('Message received: ');
   // console.log(JSON.stringify(message.body));
   // console.log(JSON.stringify(message.body));
   console.log(message.body);
   console.log(message.properties);
   console.log('');
 };


 var client = EventHubClient.fromConnectionString(connectionString);
 client.open()
     .then(client.getPartitionIds.bind(client))
     .then(function (partitionIds) {
         return partitionIds.map(function (partitionId) {
             return client.createReceiver('$Default', partitionId, { 'startAfterTime' : Date.now()}).then(function(receiver) {
                 console.log('Created partition receiver: ' + partitionId)
                 receiver.on('errorReceived', printError);
                 receiver.on('message', printMessage);
             });
         });
     })
     .catch(printError);

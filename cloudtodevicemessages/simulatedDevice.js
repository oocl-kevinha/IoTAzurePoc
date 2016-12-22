 'use strict';

 var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
 var Message = require('azure-iot-device').Message;

 var azureKeys = require('../azureKeys.js');
 var connectionString = azureKeys.first_device_connectionString;
 

 var client = clientFromConnectionString(connectionString);

 function printResultFor(op) {
   return function printResult(err, res) {
     if (err) console.log(op + ' error: ' + err.toString());
     if (res) console.log(op + ' status: ' + res.constructor.name);
   };
 }

 var connectCallback = function (err) {
   if (err) {
     console.log('Could not connect: ' + err);
   } else {
     console.log('Client connected');
     client.on('message', function (msg) {
       console.log('Id: ' + msg.messageId + ' Body: ' + msg.data);
       client.complete(msg, printResultFor('completed'));
     });
     // Create a message and send it to the IoT Hub every second
     setInterval(function(){
         var windSpeed = 10 + (Math.random() * 4);
         var data = JSON.stringify({ deviceId: 'ngscFirstNodeDevice', windSpeed: windSpeed });
         var message = new Message(data);
         console.log("Sending message: " + message.getData());
         client.sendEvent(message, printResultFor('send'));
     }, 20000);
   }
 };


 client.open(connectCallback);



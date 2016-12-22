 'use strict';
 var iothub = require('azure-iothub');
 var azureKeys = require('../azureKeys.js');
 
 var connectionString = azureKeys.iothub_connectionString;
 var registry = iothub.Registry.fromConnectionString(connectionString);
 var deviceId = 'ngscFirstNodeDevice';

 registry.getTwin(deviceId, function(err, twin){
     if (err) {
         console.error(err.constructor.name + ': ' + err.message);
     } else {
         var patch = {
             tags: {
                 location: {
                     region: 'US',
                     plant: 'Redmond43'
               }
             }
         };

         twin.update(patch, function(err) {
           if (err) {
             console.error('Could not update twin: ' + err.constructor.name + ': ' + err.message);
           } else {
             console.log(twin.deviceId + ' twin updated successfully');
             queryTwins();
           }
         });
     }
 });
 
  var queryTwins = function() {
     var query = registry.createQuery("SELECT * FROM devices WHERE tags.location.plant = 'Redmond43'", 100);
     query.nextAsTwin(function(err, results) {
         if (err) {
             console.error('Failed to fetch the results: ' + err.message);
         } else {
             console.log("Devices in Redmond43: " + results.map(function(twin) {return twin.deviceId}).join(','));
         }
     });

     query = registry.createQuery("SELECT * FROM devices WHERE tags.location.plant = 'Redmond43' AND properties.reported.connectivity.type = 'cellular'", 100);
     query.nextAsTwin(function(err, results) {
         if (err) {
             console.error('Failed to fetch the results: ' + err.message);
         } else {
             console.log("Devices in Redmond43 using cellular network: " + results.map(function(twin) {return twin.deviceId}).join(','));
         }
     });
 };


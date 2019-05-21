'use strict';

var Transport = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').ModuleClient;
// Message handler IOTC Bridge
const handleMessage = require('./lib/engine');

// Constants to access IoT Central
const parameters = {
  idScope: process.env.ID_SCOPE,
  primaryKeyUrl: process.env.IOTC_KEY
};

// Create a context object that is normally present in an Azure function
// log is used with the iotc bridge
let context = {
  log(args) {
    console.log(args);
  }
}

// Get the module client
Client.fromEnvironment(Transport, function (err, client) {
  if (err) {
    throw err;
  } else {
    client.on('error', function (err) {
      throw err;
    });

    // connect to the Edge instance
    client.open(function (err) {
      if (err) {
        throw err;
      } else {
        console.log('[INFO] IoT Hub module client initialized');

        // Act on input messages to the module.
        client.on('inputMessage', function (inputName, msg) {
          pipeMessage(client, inputName, msg);
        });
      }
    });
  }
});

// This function just pipes the messages to the iotc bridge without any change.
async function pipeMessage(client, inputName, msg) {
  client.complete(msg, console.log('[INFO] Receiving message'));

  // Check if the message is sent to the iotc input, if not ignore
  if (inputName === 'iotc') {
    if (msg) {
      // Create the message as the iotc bridge expects it to be [req]
      var req = JSON.parse(msg.getBytes().toString('utf8'));
      // Pass the context and req object parts to the iotc bridge
      try {
        await handleMessage({ ...parameters, log: context.log, getSecret: getPrimaryKey }, req.device, req.measurements, req.timestamp);
      } catch (e) {
          context.log('[ERROR] ' + e.message);
      }
    }
  }
}

/**
 * Returns the primary key for IoT Central from the environment variables
 * Simplyfied because we don't use key vault on the edge
 */
async function getPrimaryKey(context, secretUrl) {
  context.log('[INFO] Returning IoT Central primary key: ' + secretUrl);
  return secretUrl;
}
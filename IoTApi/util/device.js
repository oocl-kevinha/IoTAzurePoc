var httpManager = require('../util/http-manager');

module.exports = {
	retrieveIoTDeviceOnHubById: retrieveIoTDeviceOnHubById
	, createIoTDeviceOnHub: createIoTDeviceOnHub
	//, searchIoTDeviceOnHub
};

function retrieveIoTDeviceOnHubById(deviceId, sasToken, callback) {
	httpManager.get(
		{ Authorization: sasToken }
		, `https://IoTPOCGateway.azure-devices.net/devices/${deviceId}?api-version=2016-11-14`
		, true
		, callback
	);
}

function createIoTDeviceOnHub(device, sasToken, callback) {
	httpManager.put(
		{ Authorization: sasToken }
		, `https://IoTPOCGateway.azure-devices.net/devices/${device.deviceId}?api-version=2016-11-14`
		, {
			deviceId: device.deviceId
			, connectionState: device.connectionState
			, status: device.status
			, statusReason: device.statusReason
			, connectionStateUpdatedTime: device.connectionStateUpdatedTime
			, statusUpdatedTime: device.statusUpdatedTime
			, lastActivityTime: device.lastActivityTime
		}
		, true
		, callback
	);
}
//
// function searchIoTDeviceOnHub(query, sasToken, callback) {
// 	var query
// 	common.http.get(
// 		{ Authorization: sasToken }
// 		, `https://IoTPOCGateway.azure-devices.net/devices/${deviceId}?api-version=2016-11-14`
// 		, true
// 		, callback
// 	);
// }

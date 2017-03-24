var router = require('express').Router();
var geoController = require('./geo-controller');

router.route('/geo').post(geoController.createGeoFenceLocations);
router.route('/geo/:geoId').delete(geoController.deleteGeoFence);
router.route('/geo/code/:geoCode').get(geoController.getGeoFenceByCode);
//router.route('/geo/search/bound').post(geoController.getGeoFenceInBound);

module.exports = router;

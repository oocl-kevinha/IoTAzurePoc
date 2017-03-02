var _ = require('lodash');

// Document DB only support anti-clockwise Polygon coordinates, clockwise implies exclusion
// http://stackoverflow.com/questions/1165647/how-to-determine-if-a-list-of-polygon-points-are-in-clockwise-order
// https://en.wikipedia.org/wiki/Shoelace_formula
exports.convertPolygonToClockwise = function(shape) {
	if (shape.geoType === 'circle') { return; }

	if (isPolygonClockwise(shape.coords.coordinates)) {
		_.reverse(shape.coords.coordinates);
	}
	shape.coords.coordinates.push(_.cloneDeep(shape.coords.coordinates[0]));
	shape.coords.coordinates = [shape.coords.coordinates];
}

function isPolygonClockwise(coordinates) {
	var signedArea = 0;
	var x1, y1, x2, y2;
	for (var n = 0; n < coordinates.length; n++) {
		x1 = coordinates[n][0];
		y1 = coordinates[n][1];
		if (n == coordinates.length - 1) {
			x2 = coordinates[0][0];
			y2 = coordinates[0][1];
		} else {
			x2 = coordinates[n+1][0];
			y2 = coordinates[n+1][1];
		}
		signedArea += (x1 * y2 - x2 * y1);
	}
	return signedArea < 0;
}

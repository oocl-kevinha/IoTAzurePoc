new Vue({
	el: '#body'
	, data: {
		shapes: []
	}
	, created: function(done) {
		var self = this;
		var map = L.map('map').setView([-34.397, 150.644], 8);
		L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(map);

		// L.marker([51.5, -0.09]).addTo(map)
		// 	.bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
		// 	.openPopup();

		if (!self.geoFenceTableInitialized) {
			$('#geoFenceTable').bootstrapTable({
				striped: true
				, toolbar: '#geoFenceTableToolbar'
				, search: true
				, showColumns: true
				, uniqueId: 'geoId'
				, sortable: true
				, pagination: true
				, pageSize: 25
				, sortName: 'name'
				, sortOrder: 'asc'
				, columns: [
					{field: 'geoName', title: 'Geo Fence Name', valign: 'middle', sortable: true, formatter: function(value) { return '<a href="#" class="pointer geoName">' + value + '</a>'; }, events: {
						'click .geoName': function(event, value, row, index) {
							self.clearSelection();
							_.filter(self.shapes, { geoId: row.geoId })[0].shapeRef.setOptions({ fillColor: '#ff0000', zIndex: 99 });
						}
					}}
					, {field: 'geoType', title: 'Type', valign: 'middle', sortable: true }
					, {field: 'coords', title: 'Geo Location', valign: 'middle', sortable: false, searchable: false, formatter: function(value, row) {
						return JSON.stringify(value.coordinates) + (row.geoType === google.maps.drawing.OverlayType.CIRCLE? ', radius: ' + row.radiusInMetre + ' M': '');
					}}
					, {field: 'createdAt', title: 'Created At', align: 'center', valign: 'middle', sortable: true, searchable: false, formatter: function(value) { return moment(value).format('YYYY-MM-DD HH:mm'); }}
					, {
						field: 'operation'
						, valign: 'middle'
						, align: 'center'
						, sortable: false
						, searchable: false
						, formatter: function(value, row, index) {
							return '<button type="button" class="btn btn-xs btn-danger delete" aria-label="Delete Geo Fence"><span class="glyphicon glyphicon-trash" aria-hidden="true"></span></button>';
						}
						, events: {
							'click .delete': self.deleteGeoFence
						}
					}
				]
			});
			self.$set('geoFenceTableInitialized', true);
		}
		$('#geoFenceTable').bootstrapTable('load', []);

		map.on('moveend', function() {
			self.loadGeoFenceInBound();
		});
		self.$set('map', map);
		self.loadGeoFenceInBound();
	}
	, methods: {
		deleteGeoFence: function(event, value, row, index) {
			var self = this;
			$.httpHelper.sendDelete('/geo/' + row.geoId, function(responseData, status) {
				$.dialog.info('Geo Fence is deleted');
				var shape = _.filter(self.shapes, { geoId: row.geoId })[0];
				shape.markerRef.setMap(null);
				self.removeShape(row.geoType, shape.shapeRef);
			});
		}
		, removeShape: function(shapeType, shapeObject) {
			var self = this;
			shapeObject.setMap(null);
			_.remove(self.shapes, { geoId: shapeObject.geoId });
			$('#geoFenceTable').bootstrapTable('removeByUniqueId', shapeObject.geoId);
		}
		, addShapeListenerAndTableRow: function(data, shapeObject) {
			var self = this;
			shapeObject.geoId = data.geoId;
			shapeObject.setMap(self.$get('map'));
			var marker = self.createShapeMarker(data, shapeObject);
			marker.setMap(self.$get('map'));
			// shapeObject.addListener('click', function(clickEvt) {
			// 	self.removeShape(data.geoType, shapeObject);
			// });
			self.shapes.push(
				{
					geoId: data.geoId
					, geoName: data.geoName
					, geoType: data.geoType
					, coords: data.coords.coordinates
					, shapeRef: shapeObject
					, markerRef: marker
					, radiusInMetre: data.radiusInMetre
					, createdAt: data.createdAt
				}
			);
		}
		, createShapeMarker: function(data, shapeObject) {
			var icon = {
				url: 'https://maps.gstatic.com/mapfiles/place_api/icons/geocode-71.png',
				// size: new google.maps.Size(71, 71),
				// anchor: new google.maps.Point(17, 34),
				scaledSize: new google.maps.Size(25, 25)
			};
			var coordinate = (data.geoType === google.maps.drawing.OverlayType.CIRCLE? data.coords.coordinates: data.coords.coordinates[0][0]);
			return new google.maps.Marker({
				icon: icon,
				title: data.geoName,
				position: new google.maps.LatLng(coordinate[1], coordinate[0])
			});
		}
		, addShape: function(shapeType, shapeObject) {
			var self = this;
			shapeObject.setMap(null);

			$.dialog.input('Input Geo-Fencing Name:', function(geoName) {
				if (_.trim(geoName)) {
					var shapeSpec = self.getShapeSpec(_.trim(geoName), shapeType, shapeObject);
					$.httpHelper.sendPost('/geo', shapeSpec, function(responseData, status) {
						self.addShapeListenerAndTableRow(responseData.data[0], shapeObject);
						$('#geoFenceTable').bootstrapTable('append', responseData.data[0]);
						$('#geoFenceTable').bootstrapTable('showRow', { uniqueId: responseData.data[0].geoId });
					});
				} else {
					self.addShape(shapeType, shapeObject);
				}
			});
		}
		, clearSelection: function() {
			var self = this;
			_.forEach(
				self.shapes
				, function(shape) {
					shape.shapeRef.setOptions({
						fillColor: '#0fff00'
						, zIndex: 0
					});
				}
			);
		}
		// Return coordinates in form of [[lng, lat]]
		/*
		 * {
		 * 		geoName: String
		 * 		geoType: 'Circle'/'Polygon'
		 * 		coords:
		 * 			type: 'Point'/'Polygon'
		 * 			, coordinates: 1d Array for Circle Center, 2d Array for Vertex of Polygon, [lng, lat]
		 * 		}
		 * 		, radiusInMetre: double
		 * }
		 */
		, getShapeSpec: function(geoName, shapeType, shapeObject) {
			var shapeSpec = {
				geoName: geoName
				, geoType: shapeType
				, coords: {
					type: (shapeType === google.maps.drawing.OverlayType.CIRCLE? 'Point': 'Polygon')
				}
			};
			if (shapeType === google.maps.drawing.OverlayType.CIRCLE) {
				shapeSpec.radiusInMetre = _.round(shapeObject.getRadius(), 2);
				shapeSpec.coords.coordinates = [shapeObject.getCenter().lng(), shapeObject.getCenter().lat()];
			} else {
				// Polygon
				shapeSpec.coords.coordinates = [];
				_.forEach(shapeObject.getPaths().getArray(), function(path) {
					_.forEach(path.getArray(), function(point) {
						shapeSpec.coords.coordinates.push([point.lng(), point.lat()]);
					});
				});
			}
			return shapeSpec;
		}
		, loadGeoFenceInBound: function() {
			var self = this;
			// Avoid multiple load at the same time
			if (self.$get('gfXhr')) {
				self.$get('gfXhr').abort();
			}
			var latLngBounds = self.$get('map').getBounds();
			var boundArea = [
				[latLngBounds.getWest(), latLngBounds.getNorth()]
				, [latLngBounds.getWest(), latLngBounds.getSouth()]
				, [latLngBounds.getEast(), latLngBounds.getSouth()]
				, [latLngBounds.getEast(), latLngBounds.getNorth()]
			];
			// _.forEach(self.shapes, function(shape) { shape.shapeRef.setMap(null); });
			// self.$set('shapes', []);
			var xhr = $.httpHelper.sendPost(
				'/geo/search/bound'
				, boundArea
				, function(responseData, status) {
					console.log(responseData);
					// _.forEach(self.shapes, function(shape) { shape.shapeRef.setMap(null); });
					// self.$set('shapes', []);
					// _.forEach(responseData.data, function(data) {
					// 	var shapeObject;
					// 	if (data.geoType === google.maps.drawing.OverlayType.CIRCLE) {
					// 		shapeObject = new google.maps.Circle({
					// 			center: new google.maps.LatLng(data.coords.coordinates[1], data.coords.coordinates[0])
					// 			, radius: data.radiusInMetre
					// 			, fillColor: '#0fff00'
					// 			, fillOpacity: 0.5
					// 			, strokeWeight: 2
					// 			, clickable: true
					// 			, editable: false
					// 			, zIndex: 1
					// 		});
					// 	} else {
					// 		shapeObject = new google.maps.Polygon({
					// 			paths: _.map(data.coords.coordinates[0], function(lngLat) { return { lng: lngLat[0], lat: lngLat[1] }; })
					// 			, fillColor: '#0fff00'
					// 			, fillOpacity: 0.5
					// 			, strokeWeight: 2
					// 			, clickable: true
					// 			, editable: false
					// 			, zIndex: 1
					// 		});
					// 	}
					// 	self.addShapeListenerAndTableRow(data, shapeObject);
					// });
					// $('#geoFenceTable').bootstrapTable('load', responseData.data);
				}
			);
			self.$set('gfXhr', xhr);
		}
	}
});

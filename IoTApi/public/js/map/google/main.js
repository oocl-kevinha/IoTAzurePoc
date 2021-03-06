function initMap() {
	new Vue({
		el: '#body'
		, data: {
			shapes: []
			, osm: location.href.indexOf('osm') > -1
			, colorConfig: {
				border: '#000000'
				, fill: '#00ff00'
				, fill_highlighted: '#ff0000'
			}
		}
		, created: function(done) {
			var self = this;
			var map = new google.maps.Map(document.getElementById('map'), {
				center: { lat: -34.397, lng: 150.644 }
				, zoom: 8
				, scaleControl: true
			});
			var drawingManager = new google.maps.drawing.DrawingManager({
				drawingMode: null
				, drawingControl: true
				, drawingControlOptions: {
					position: google.maps.ControlPosition.TOP_CENTER
					, drawingModes: ['polygon', 'circle']
				}
				, markerOptions: {icon: 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png'}
				, circleOptions: {
					fillColor: self.colorConfig.fill
					, fillOpacity: 0.5
					, strokeWeight: 2
					, clickable: false
					, editable: false
					, zIndex: 1
				}
				, polygonOptions: {
					fillColor: self.colorConfig.fill
					, fillOpacity: 0.5
					, strokeWeight: 2
					, clickable: false
					, editable: false
					, zIndex: 1
				}
			});

			self.$set('map', map);
			self.$set('drawingManager', drawingManager);

			drawingManager.addListener('overlaycomplete', function(evt) {
				self.addShape(evt.type, evt.overlay);
			});
			drawingManager.setMap(map);

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
								//self.clearSelection();
								self.$set('zoomGeoId', row.geoId);
								self.$get('map').panTo(row.geoType == google.maps.drawing.OverlayType.CIRCLE
														? { lat: row.coords.coordinates[1], lng: row.coords.coordinates[0] }
														: { lat: row.coords.coordinates[0][1], lng: row.coords.coordinates[0][0] });
								//_.filter(self.shapes, { geoId: row.geoId })[0].shapeRef.setOptions({ fillColor: self.colorConfig.fill_highlighted, zIndex: 99 });
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

			// Create the search box and link it to the UI element.
			var input = $('#tfAddress')[0];

			var infoWindow = new google.maps.InfoWindow({});
			var searchBox = new google.maps.places.SearchBox(input);

			map.addListener('idle', function() {
				searchBox.setBounds(map.getBounds());
				self.loadGeoFenceInBound();
			});

			var markers = [];
			// Listen for the event fired when the user selects a prediction and retrieve
			// more details for that place.
			searchBox.addListener('places_changed', function() {
				var places = searchBox.getPlaces();

				if (places.length == 0) {
					return;
				}

				// Clear out the old markers.
				markers.forEach(function(marker) {
					marker.setMap(null);
				});
				markers = [];

				// For each place, get the icon, name and location.
				var bounds = new google.maps.LatLngBounds();
				places.forEach(function(place) {
					if (!place.geometry) {
						return;
					}
					var icon = {
						url: place.icon,
						size: new google.maps.Size(71, 71),
						origin: new google.maps.Point(0, 0),
						anchor: new google.maps.Point(17, 34),
						scaledSize: new google.maps.Size(25, 25)
					};

					// Create a marker for each place.
					markers.push(new google.maps.Marker({
						map: map,
						icon: icon,
						title: place.name,
						position: place.geometry.location
					}));

					if (place.geometry.viewport) {
						// Only geocodes have viewport.
						bounds.union(place.geometry.viewport);
					} else {
						bounds.extend(place.geometry.location);
					}
				});
				map.fitBounds(bounds);
			});

			self.$set('infoWindow', infoWindow);
		}
		, methods: {
			deleteGeoFence: function(event, value, row, index) {
				var self = this;
				$.httpHelper.sendDelete('/geo/' + row.geoId, function(responseData, status) {
					$.dialog.info('Geo Fence is deleted');
					var shape = _.filter(self.shapes, { geoId: row.geoId })[0];
					self.removeShape(row.geoType, shape.shapeRef);
				});
			}
			, removeShape: function(shapeType, shapeObject) {
				var self = this;
				shapeObject.setMap(null);
				_.remove(self.shapes, { geoId: shapeObject.geoId });
				$('#geoFenceTable').bootstrapTable('removeByUniqueId', shapeObject.geoId);
			}
			, showGeoInfoWindow: function(data) {
				var self = this;
				var infoWindow = self.$get('infoWindow');
				infoWindow.setOptions({
					content: data.geoName
					, position: (data.geoType === google.maps.drawing.OverlayType.POLYGON
								? { lat: data.coords.coordinates[0][1], lng: data.coords.coordinates[0][0] }
								: { lat: data.coords.coordinates[1], lng: data.coords.coordinates[0] })
				});
				infoWindow.open(self.$get('map'));
			}
			, addShapeListener: function(data, shapeObject) {
				var self = this;
				shapeObject.geoId = data.geoId;
				shapeObject.setMap(self.$get('map'));
				shapeObject.addListener('click', function() { self.showGeoInfoWindow(data); });
				self.shapes.push({ geoId: data.geoId, shapeRef: shapeObject });
			}
			, addShape: function(shapeType, shapeObject) {
				var self = this;
				shapeObject.setMap(null);

				$.dialog.input('Input Geo-Fencing Name:', function(geoName) {
					if (_.trim(geoName)) {
						var shapeSpec = self.getShapeSpec(_.trim(geoName), shapeType, shapeObject);
						$.httpHelper.sendPost('/geo', shapeSpec, function(responseData, status) {
							self.addShapeListener(responseData.data[0], shapeObject);
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
							fillColor: self.colorConfig.fill
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
				var latLngBounds = self.$get('map').getBounds().toJSON();
				var boundArea = [
					[latLngBounds.west, latLngBounds.north]
					, [latLngBounds.west, latLngBounds.south]
					, [latLngBounds.east, latLngBounds.south]
					, [latLngBounds.east, latLngBounds.north]
				];
				var xhr = $.httpHelper.sendPost(
					'/geo/search/bound'
					, boundArea
					, function(responseData, status) {
						self.$get('infoWindow').close();
						_.forEach(self.shapes, function(shape) { shape.shapeRef.setMap(null); });
						self.$set('shapes', []);
						_.forEach(responseData.data, function(data) {
							var shapeObject;
							if (data.geoType === google.maps.drawing.OverlayType.CIRCLE) {
								shapeObject = new google.maps.Circle({
									center: new google.maps.LatLng(data.coords.coordinates[1], data.coords.coordinates[0])
									, radius: data.radiusInMetre
									, fillColor: self.colorConfig.fill
									, fillOpacity: 0.5
									, strokeWeight: 2
									, clickable: true
									, editable: false
									, zIndex: 1
								});
							} else {
								shapeObject = new google.maps.Polygon({
									paths: _.map(data.coords.coordinates, function(lngLat) { return { lng: lngLat[0], lat: lngLat[1] }; })
									, fillColor: self.colorConfig.fill
									, fillOpacity: 0.5
									, strokeWeight: 2
									, clickable: true
									, editable: false
									, zIndex: 1
								});
							}
							self.addShapeListener(data, shapeObject);
						});
						if (self.$get('zoomGeoId')) {
							var shapeRef = _.filter(self.shapes, { geoId: self.$get('zoomGeoId') })[0].shapeRef;
							shapeRef.setOptions({ fillColor: self.colorConfig.fill_highlighted });
							self.showGeoInfoWindow(_.filter(responseData.data, { geoId: self.$get('zoomGeoId') })[0]);
							self.$delete('zoomGeoId');
						}
						$('#geoFenceTable').bootstrapTable('load', responseData.data);
					}
				);
				self.$set('gfXhr', xhr);
			}
		}
	});
}

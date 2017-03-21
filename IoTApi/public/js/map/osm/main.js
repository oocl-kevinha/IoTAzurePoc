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
		var map = L.map('map').setView([-34.397, 150.644], 8);
		L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(map);

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
							self.$set('zoomGeoId', row.geoId);
							self.$get('map').panTo(row.geoType == 'circle'? [row.coords.coordinates[1], row.coords.coordinates[0]]: [row.coords.coordinates[0][1], row.coords.coordinates[0][0]]);
						}
					}}
					, {field: 'geoType', title: 'Type', valign: 'middle', sortable: true }
					, {field: 'coords', title: 'Geo Location', valign: 'middle', sortable: false, searchable: false, formatter: function(value, row) {
						return JSON.stringify(value.coordinates) + (row.geoType === 'circle'? ', radius: ' + row.radiusInMetre + ' M': '');
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

		var editableLayers = new L.FeatureGroup();
		map.addLayer(editableLayers);

		var drawControl = new L.Control.Draw({
			position: 'topright'
			, draw: {
				polygon: {
					allowIntersection: true
					, shapeOptions: {
						color: self.colorConfig.border
						, fillColor: self.colorConfig.fill
						, fillOpacity: 0.5
						, weight: 2
					}
				}
				, circle: {
					shapeOptions: {
						color: self.colorConfig.border
						, fillColor: self.colorConfig.fill
						, fillOpacity: 0.5
						, weight: 2
					}
					, showRadius: true
					, metric: true
					, feet: false
					, nautic: false
				}
				, polyline: false
				, marker: false
				, rectangle: false
			}
			, edit: {
				featureGroup: editableLayers
				, remove: false
				, edit: false
			}
		});
		map.addControl(drawControl);

		map.on(L.Draw.Event.CREATED, function (evt) {
			self.addShape(evt.layerType, evt.layer);
		});

		map.on('moveend', function() {
			self.loadGeoFenceInBound();
		});

		L.control.scale({ position: 'bottomright' }).addTo(map);
		map.addControl(GeoSearch.GeoSearchControl({ provider: new GeoSearch.OpenStreetMapProvider(), style: 'bar' }));
		self.$set('map', map);
		self.loadGeoFenceInBound();
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
			shapeObject.remove();
			_.remove(self.shapes, { geoId: shapeObject.geoId });
			$('#geoFenceTable').bootstrapTable('removeByUniqueId', shapeObject.geoId);
		}
		, addShape: function(shapeType, shapeObject) {
			var self = this;

			$.dialog.input('Input Geo-Fencing Name:', function(geoName) {
				if (_.trim(geoName)) {
					var shapeSpec = self.getShapeSpec(_.trim(geoName), shapeType, shapeObject);
					$.httpHelper.sendPost('/geo', shapeSpec, function(responseData, status) {
						shapeObject.addTo(self.$get('map')).bindPopup(responseData.data[0].geoName);
						self.$get('shapes').push({ shapeRef: shapeObject, geoId: responseData.data[0].geoId });
						$('#geoFenceTable').bootstrapTable('append', responseData.data[0]);
						$('#geoFenceTable').bootstrapTable('showRow', { uniqueId: responseData.data[0].geoId });
					});
				} else {
					self.addShape(shapeType, shapeObject);
				}
			});
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
					type: (shapeType === 'circle'? 'Point': 'Polygon')
				}
			};
			if (shapeType === 'circle') {
				shapeSpec.radiusInMetre = _.round(shapeObject.getRadius(), 2);
				shapeSpec.coords.coordinates = [shapeObject.getLatLng().lng, shapeObject.getLatLng().lat];
			} else {
				// Polygon
				shapeSpec.coords.coordinates = [];
				_.forEach(shapeObject.getLatLngs()[0], function(point) {
					shapeSpec.coords.coordinates.push([point.lng, point.lat]);
				});
			}
			return shapeSpec;
		}
		, clearSelection: function() {
			var self = this;
			_.forEach(
				self.shapes
				, function(shape) {
					shape.shapeRef.setStyle({ fillColor: self.colorConfig.fill });
				}
			);
		}
		, loadGeoFenceInBound: function() {
			var self = this;
			// Avoid multiple load at the same time
			if (self.$get('gfXhr')) {
				self.$get('gfXhr').abort();
			}
			var latLngBounds = self.$get('map').wrapLatLngBounds(self.$get('map').getBounds());
			var boundArea = [
				[latLngBounds.getWest(), latLngBounds.getNorth()]
				, [latLngBounds.getWest(), latLngBounds.getSouth()]
				, [latLngBounds.getEast(), latLngBounds.getSouth()]
				, [latLngBounds.getEast(), latLngBounds.getNorth()]
			];
			var xhr = $.httpHelper.sendPost(
				'/geo/search/bound'
				, boundArea
				, function(responseData, status) {
					_.forEach(self.shapes, function(shape) { shape.shapeRef.remove(); });
					self.$set('shapes', []);
					_.forEach(responseData.data, function(data) {
						var shapeObject;
						if (data.geoType === 'circle') {
							shapeObject = L.circle([data.coords.coordinates[1], data.coords.coordinates[0]], data.radiusInMetre, {
								color: self.colorConfig.border
								, fillColor: self.colorConfig.fill
								, fillOpacity: 0.5
								, weight: 2
							});
						} else {
							shapeObject = L.polygon(
								_.map(data.coords.coordinates, function(lngLat) { return [lngLat[1], lngLat[0]]; })
								, {
									color: self.colorConfig.border
									, fillColor: self.colorConfig.fill
									, fillOpacity: 0.5
									, weight: 2
								}
							);
						}
						shapeObject.addTo(self.$get('map')).bindPopup(data.geoName);
						self.$get('shapes').push({ shapeRef: shapeObject, geoId: data.geoId });
					});
					$('#geoFenceTable').bootstrapTable('load', responseData.data);
					if (self.$get('zoomGeoId')) {
						var shapeRef = _.filter(self.shapes, { geoId: self.$get('zoomGeoId') })[0].shapeRef;
						shapeRef.openPopup();
						shapeRef.setStyle({ fillColor: self.colorConfig.fill_highlighted });
						self.$delete('zoomGeoId');
					}
					$('.leaflet-control-geosearch .results').html('');
					$('.leaflet-control-geosearch .results').toggleClass('active', false);
				}
			);
			self.$set('gfXhr', xhr);
		}
	}
});

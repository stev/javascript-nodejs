require('./styles');
var citymap = require('./citymap');

/*
 * L.TileLayer is used for standard xyz-numbered tile layers.
 * @see https://gist.github.com/crofty/2197042
 */
L.Google = L.Class.extend({
  includes: L.Mixin.Events,

  options: {
    minZoom: 0,
    maxZoom: 18,
    tileSize: 256,
    subdomains: 'abc',
    errorTileUrl: '',
    attribution: '',
    opacity: 1,
    continuousWorld: false,
    noWrap: false,
  },

  // Possible types: SATELLITE, ROADMAP, HYBRID
  initialize: function(type, options) {
    L.Util.setOptions(this, options);

    this._type = google.maps.MapTypeId[type || 'SATELLITE'];
  },

  onAdd: function(map, insertAtTheBottom) {
    this._map = map;
    this._insertAtTheBottom = insertAtTheBottom;

    // create a container div for tiles
    this._initContainer();
    this._initMapObject();

    // set up events
    map.on('viewreset', this._resetCallback, this);

    this._limitedUpdate = L.Util.limitExecByInterval(this._update, 150, this);
    map.on('move', this._update, this);
    //map.on('moveend', this._update, this);

    this._reset();
    this._update();
  },

  onRemove: function(map) {
    this._map._container.removeChild(this._container);
    //this._container = null;

    this._map.off('viewreset', this._resetCallback, this);

    this._map.off('move', this._update, this);
    //this._map.off('moveend', this._update, this);
  },

  getAttribution: function() {
    return this.options.attribution;
  },

  setOpacity: function(opacity) {
    this.options.opacity = opacity;
    if (opacity < 1) {
      L.DomUtil.setOpacity(this._container, opacity);
    }
  },

  _initContainer: function() {
    var tilePane = this._map._container
    first = tilePane.firstChild;

    if (!this._container) {
      this._container = L.DomUtil.create('div', 'leaflet-google-layer leaflet-top leaflet-left');
      this._container.id = "_GMapContainer";
    }

    if (true) {
      tilePane.insertBefore(this._container, first);

      this.setOpacity(this.options.opacity);
      var size = this._map.getSize();
      this._container.style.width = size.x + 'px';
      this._container.style.height = size.y + 'px';
    }
  },

  _initMapObject: function() {
    this._google_center = new google.maps.LatLng(0, 0);
    var map = new google.maps.Map(this._container, {
      center: this._google_center,
      zoom: 0,
      mapTypeId: this._type,
      disableDefaultUI: true,
      keyboardShortcuts: false,
      draggable: false,
      disableDoubleClickZoom: true,
      scrollwheel: false,
      streetViewControl: false,
      styles:             [{
        "featureType": "all",
        "elementType": "all",
        "stylers":     [{"weight": 0.1}, {"hue": "#a39b00"}, {"saturation": -85}, {"lightness": 0}, {"gamma": 1.1}]
      }, {
        "featureType": "water",
        "elementType": "geometry.fill",
        "stylers":     [{"hue": "#226c94"}, {"saturation": 8}, {"lightness": -10}]
      }]
    });

    var _this = this;
    this._reposition = google.maps.event.addListenerOnce(map, "center_changed",
      function() { _this.onReposition(); });

    map.backgroundColor = '#ff0000';
    this._google = map;
  },

  _resetCallback: function(e) {
    this._reset(e.hard);
  },

  _reset: function(clearOldContainer) {
    this._initContainer();
  },

  _update: function() {
    this._resize();

    var bounds = this._map.getBounds();
    var ne = bounds.getNorthEast();
    var sw = bounds.getSouthWest();
    var google_bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(sw.lat, sw.lng),
      new google.maps.LatLng(ne.lat, ne.lng)
    );
    var center = this._map.getCenter();
    var _center = new google.maps.LatLng(center.lat, center.lng);

    this._google.setCenter(_center);
    this._google.setZoom(this._map.getZoom());
    //this._google.fitBounds(google_bounds);
  },

  _resize: function() {
    var size = this._map.getSize();
    if (this._container.style.width == size.x &&
      this._container.style.height == size.y)
      return;
    this._container.style.width = size.x + 'px';
    this._container.style.height = size.y + 'px';
    google.maps.event.trigger(this._google, "resize");
  },

  onReposition: function() {
    //google.maps.event.trigger(this._google, "resize");
  }
});



// ====================================================

exports.init = function() {

  var map = new L.Map('map', {
    center: new L.LatLng(54.231473, 37.734144),
    zoom: 5,
    attributionControl: false,
    scrollWheelZoom: false,
    markerZoomAnimation: false
  });
  var googleLayer = new L.Google('TERRAIN');
  map.addLayer(googleLayer);

  // Construct the circle for each value in citymap.
  // Note: We scale the area of the circle based on the population.
  for (var city in citymap) (function(city) {
    var marker = L.circleMarker([citymap[city].location.lat-0.01, citymap[city].location.lng], {
      radius: citymap[city].radius / 3000,
      stroke: false,
      opacity: 1,
      fill: true,
      clickable: false,
      fillColor:     '#C13335',
      fillOpacity: 1
    });
    map.addLayer(marker);

  }(city));

}

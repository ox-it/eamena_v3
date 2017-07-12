//modified version of the core clustering layer, which only processes points within the view extents.
// This approach resolves a serious performance issue with large numbers of points at higher zoom levels

define(['openlayers'], function (ol) {
        

    goog.provide('ol.source.CulledCluster');

    goog.require('goog.array');
    goog.require('goog.asserts');
    goog.require('goog.events.EventType');
    goog.require('goog.object');
    goog.require('ol.Feature');
    goog.require('ol.coordinate');
    goog.require('ol.extent');
    goog.require('ol.geom.Point');
    goog.require('ol.source.Vector');



    /**
     * @constructor
     * @param {olx.source.ClusterOptions} options
     * @extends {ol.source.Vector}
     * @api
     */
    ol.source.CulledCluster = function(options) {
      goog.base(this, {
        attributions: options.attributions,
        extent: options.extent,
        logo: options.logo,
        projection: options.projection
      });

      /**
       * @type {number|undefined}
       * @private
       */
      this.resolution_ = undefined;

      /**
       * @type {number}
       * @private
       */
      this.distance_ = goog.isDef(options.distance) ? options.distance : 20;

      /**
       * @type {Array.<ol.Feature>}
       * @private
       */
      this.features_ = [];

      /**
       * @type {ol.source.Vector}
       * @private
       */
      this.source_ = options.source;

      this.source_.on(goog.events.EventType.CHANGE,
          ol.source.CulledCluster.prototype.onSourceChange_, this);
    };
    goog.inherits(ol.source.CulledCluster, ol.source.Vector);


    /**
     * @inheritDoc
     */
    ol.source.CulledCluster.prototype.loadFeatures = function(extent, resolution, projection) {
            
        if( this.lastExtent &&
            this.lastExtent[0] == extent[0] &&
            this.lastExtent[1] == extent[1] &&
            this.lastExtent[2] == extent[2] &&
            this.lastExtent[3] == extent[3] &&
            this.lastResolution == resolution ) {
            return;
        }
        this.lastExtent = extent;
        this.lastResolution = resolution;
        this.lastProjection = projection;
        this.clear();
        this.resolution_ = resolution;
        this.source_.loadFeatures(extent, resolution, projection);
        this.cluster_(null, extent);
        this.addFeatures(this.features_);
    };


    /**
     * handle the source changing
     * @private
     */
    ol.source.CulledCluster.prototype.onSourceChange_ = function() {
      this.clear();
      this.cluster_(null, null);
      this.addFeatures(this.features_);
      this.changed();
    };


    /**
     * @private
     */
    ol.source.CulledCluster.prototype.cluster_ = function(ev, viewextent) {
      if (!goog.isDef(this.resolution_)) {
        return;
      }
      goog.array.clear(this.features_);
      var extent = ol.extent.createEmpty();
      var mapDistance = this.distance_ * this.resolution_;
      var features;
      if(viewextent) {
          //only process features within the current view extent
          var features = this.source_.getFeaturesInExtent(viewextent)
      } else {
          features = this.source_.getFeatures();  
      }

      /**
       * @type {Object.<string, boolean>}
       */
      var clustered = {};

      for (var i = 0, ii = features.length; i < ii; i++) {
        var feature = features[i];
        if (!goog.object.containsKey(clustered, goog.getUid(feature).toString())) {
          var geometry = feature.getGeometry();
          goog.asserts.assert(geometry instanceof ol.geom.Point);
          var coordinates = geometry.getCoordinates();
          ol.extent.createOrUpdateFromCoordinate(coordinates, extent);
          ol.extent.buffer(extent, mapDistance, extent);

          var neighbors = this.source_.getFeaturesInExtent(extent);
          goog.asserts.assert(neighbors.length >= 1);
          neighbors = goog.array.filter(neighbors, function(neighbor) {
            var uid = goog.getUid(neighbor).toString();
            if (!goog.object.containsKey(clustered, uid)) {
              goog.object.set(clustered, uid, true);
              return true;
            } else {
              return false;
            }
          });
          this.features_.push(this.createCluster_(neighbors));
        }
      }
    };


    /**
     * @param {Array.<ol.Feature>} features Features
     * @return {ol.Feature}
     * @private
     */
    ol.source.CulledCluster.prototype.createCluster_ = function(features) {
      var length = features.length;
      var centroid = [0, 0];
      for (var i = 0; i < length; i++) {
        var geometry = features[i].getGeometry();
        goog.asserts.assert(geometry instanceof ol.geom.Point);
        var coordinates = geometry.getCoordinates();
        ol.coordinate.add(centroid, coordinates);
      }
      ol.coordinate.scale(centroid, 1 / length);

      var cluster = new ol.Feature(new ol.geom.Point(centroid));
      cluster.set('features', features);
      return cluster;
    };

})

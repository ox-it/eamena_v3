define(['jquery', 
    'jquery-ui',
    'underscore',
    'backbone',
    'bootstrap',
    'arches', 
    'views/map',
    'openlayers', 
    'knockout',
    'map/resource-layer-model',
    'utils',
    'resource-types',
    'plugins/supercluster/supercluster', 
    'plugins/geojson_extent/geojson_extent'], 
    function($, jqui, _, Backbone, bootstrap, arches, MapView, ol, ko, ResourceLayerModel, utils, resourceTypes, supercluster, geojsonExtent) {
        var geoJSON = new ol.format.GeoJSON();
        return Backbone.View.extend({
            previousEntityIdArray: [],

            events: {
                'click .layer-zoom': 'layerZoom',
                'click .cluster-item-link': 'clusterItemClick'
            },

            initialize: function(options) { 
                var self = this;

                //  Handle show/hide toggle ourselves
                $('#map-tools-btn').on('click', function(evt) {
                    self.toggleMapTools();
                    return false;
                });
                $('#map-tools-dropdown').on('click', 'a', function(evt) {
                    if($(evt.target).attr('name') === 'map-tools'){
                        self.togglefilter(evt);
                    }
                    return false;
                });

                //  suppress default bahavior of the bootstrap menu to auto close
                $('#map-tools-btn').on('hide.bs.dropdown', false);            
                $('#map-tools-btn').on('show.bs.dropdown', false);


                this.expanded = ko.observable(false);
                this.expanded.subscribe(function(status){
                    this.toggleFilterSection($('#map-filter'), status);
                }, this);

                this.query = {
                    filter: {
                        geometry:{
                            type: ko.observable(''),
                            coordinates: ko.observable([])
                        },
                        buffer: {
                            width: ko.observable('0'),
                            unit: ko.observable('m')
                        },
                        inverted: ko.observable(false)
                    },
                    changed: ko.pureComputed(function(){
                        return (ko.toJSON(this.query.filter.geometry.coordinates()) + 
                            ko.toJSON(this.query.filter.buffer.width()) + 
                            ko.toJSON(this.query.filter.inverted()));
                    }, this).extend({ rateLimit: 200 })
                }

                ko.applyBindings(this.query.filter, $('#map-tools-dropdown')[0]); 

                this.query.filter.buffer.width.subscribe(function(){
                    self.applyBuffer();
                });

                this.query.filter.geometry.type.subscribe(function(type){
                    var enabled = type !== '';
                    this.trigger('enabled', enabled, this.query.filter.inverted());
                    return enabled;
                }, this);

                this.vectorLayer = new ResourceLayerModel({}, function(features){
                    self.resourceFeatures = features;
                    //create a backbone model to quickly index features by id
                    var FeatureModel = Backbone.Model.extend({ idAttribute: 'id_'});
                    self.resourceFeaturesCollection = new Backbone.Collection(features, {model:FeatureModel});
                    if (self.highlightOnLoad) {
                        _.defer(function () { self.highlightFeatures(self.highlightOnLoad.resultsarray, self.highlightOnLoad.entityIdArray) });
                    }
                    self.trigger('vectorlayerloaded', features);
                    if (!self.cancelFitBaseLayer){
                        setTimeout(function() {
                              self.zoomToExtent(self.vectorLayer.getSource().getExtent());
                        }, 500);
                    }
                }).layer();
                
                //Hide the non-result features for now - continually resetting this layer with all markers NOT in the results set
                // seriously harms performance.
                this.vectorLayer.setVisible(false);
                
                this.map = new MapView({
                    el: $('#map'),
                    overlays: [
                        this.vectorLayer
                    ]
                });

                // this.map.map.on('viewChanged', this.onViewChanged, this);
                this.map.on('viewChanged', this.onViewChanged, this);

                this.bufferFeatureOverlay = new ol.FeatureOverlay({
                    style: new ol.style.Style({
                        fill: new ol.style.Fill({
                            color: 'rgba(123, 123, 255, 0.5)'
                        }),
                        stroke: new ol.style.Stroke({
                            color: '#ff6633',
                            width: 2,
                            lineDash: [4,4]
                        })
                    })
                }); 
                this.bufferFeatureOverlay.setMap(this.map.map);                   
                
                this.drawingFeatureOverlay = new ol.FeatureOverlay({
                    style: new ol.style.Style({
                        fill: new ol.style.Fill({
                            color: 'rgba(255, 255, 255, 0.2)'
                        }),
                        stroke: new ol.style.Stroke({
                            color: '#ffcc33',
                            width: 2
                        })
                    })
                });
                this.drawingFeatureOverlay.setMap(this.map.map);
                
                ko.applyBindings(this.map, $('#basemaps-panel')[0]);

                var hideAllPanels = function(){
                    $("#basemaps-panel").addClass("hidden");

                    //Update state of remaining buttons
                    $("#inventory-basemaps")
                        .removeClass("arches-map-tools-pressed")
                        .addClass("arches-map-tools")
                        .css("border-bottom-left-radius", "1px");
                };

                //Inventory-basemaps button opens basemap panel
                $("#inventory-basemaps").click(function (){
                    if ($(this).hasClass('arches-map-tools-pressed')) {
                        hideAllPanels();
                    } else {
                        $("#basemaps-panel").removeClass("hidden");

                        //Update state of current button and adjust position
                        $("#inventory-basemaps")
                            .addClass("arches-map-tools-pressed")
                            .removeClass("arches-map-tools")
                            .css("border-bottom-left-radius", "5px");
                    }
                });

                $(".basemap").click(function (){ 
                    var basemap = $(this).attr('id');
                    _.each(self.map.baseLayers, function(baseLayer){ 
                        baseLayer.layer.setVisible(baseLayer.id == basemap);
                    });
                    hideAllPanels();
                });

                //Close Button
                $(".close").click(function (){ 
                    hideAllPanels();
                });

                
                var mouseoverFeatureTooltip = $('#feature_tooltip');
                var currentMousePx = null;
                var archesFeaturesCache = {};

                var showMouseoverFeatureTooltip = function(feature) {
                    var mapheight = self.map.$el.height();
                    var mapwidth = self.map.$el.width();
                    if (currentMousePx) {
                        mouseoverFeatureTooltip.find('#tooltip-text').html(feature.get('primaryname'));
                        if(currentMousePx[0] < mapwidth*0.33){
                            mouseoverFeatureTooltip.removeClass('left')
                                .addClass('right');
                        }
                        if(currentMousePx[0] > mapwidth*0.66){
                            mouseoverFeatureTooltip.removeClass('right')
                                .addClass('left');
                        }
                        if(mouseoverFeatureTooltip.hasClass('left')){
                            mouseoverFeatureTooltip.css({
                                left: (currentMousePx[0] - mouseoverFeatureTooltip.width()+20) + 'px',
                                top: (currentMousePx[1] - mouseoverFeatureTooltip.height()/2) + 'px'
                            });
                        }
                        if(mouseoverFeatureTooltip.hasClass('right')){
                            mouseoverFeatureTooltip.css({
                                left: (currentMousePx[0] + 45) + 'px',
                                top: (currentMousePx[1] - mouseoverFeatureTooltip.height()/2) + 'px'
                            });
                        }
                        mouseoverFeatureTooltip.show();
                    }
                };

                self.map.on('mousePositionChanged', function (mousePosition, pixels, feature) {
                    var cursorStyle = "";
                    currentMousePx = pixels;

                    if (feature && (feature.get('arches_marker') || feature.get('arches_cluster'))) {
                        cursorStyle = "pointer";
                        if (feature.get('arches_marker') || feature.get('point_count') === 1) {
                            if (feature.get('features')) {
                                feature = feature.get('features')[0];
                            }
                            var fullFeature = archesFeaturesCache[feature.getId()];
                            if (fullFeature && fullFeature != 'loading') {
                                showMouseoverFeatureTooltip(fullFeature);
                            } else if (fullFeature != 'loading') {
                                archesFeaturesCache[feature.getId()] = 'loading';
                                $.ajax({
                                    url: arches.urls.map_markers + 'all?entityid=' + feature.getId(),
                                    success: function(response) {
                                        fullFeature = geoJSON.readFeature(response.features[0]);
                                        var geom = fullFeature.getGeometry();
                                        geom.transform(ol.proj.get('EPSG:4326'), ol.proj.get('EPSG:3857'));

                                        fullFeature.set('select_feature', true);
                                        fullFeature.set('entityid', fullFeature.getId());

                                        archesFeaturesCache[feature.getId()] = fullFeature;
                                        showMouseoverFeatureTooltip(fullFeature);
                                    }
                                });
                            }
                        }
                    } else {
                        mouseoverFeatureTooltip.hide();
                    }
                    self.map.$el.css("cursor", cursorStyle);
                });

                var clusterFeaturesCache = {};

                var selectFeatureOverlay = new ol.FeatureOverlay({
                    style: function(feature, resolution) {
                        var isSelectFeature = _.contains(feature.getKeys(), 'select_feature');
                        var fillOpacity = isSelectFeature ? 0.3 : 0;
                        var strokeOpacity = isSelectFeature ? 0.9 : 0;
                        return [new ol.style.Style({
                            fill: new ol.style.Fill({
                                color: 'rgba(0, 255, 255, ' + fillOpacity + ')'
                            }),
                            stroke: new ol.style.Stroke({
                                color: 'rgba(0, 255, 255, ' + strokeOpacity + ')',
                                width: 3
                            }),
                            image: new ol.style.Circle({
                                radius: 10,
                                fill: new ol.style.Fill({
                                    color: 'rgba(0, 255, 255, ' + fillOpacity + ')'
                                }),
                                stroke: new ol.style.Stroke({
                                    color: 'rgba(0, 255, 255, ' + strokeOpacity + ')',
                                    width: 3
                                })
                            })
                        })];
                    }
                });
                selectFeatureOverlay.setMap(self.map.map);
                
                $('.resource-info-closer').click(function() {
                    $('#resource-info').hide();
                    selectFeatureOverlay.getFeatures().clear();
                    $('.resource-info-closer')[0].blur();
                });

                $('.cluster-info-closer').click(function() {
                    $('#cluster-info').hide();
                    $('.cluster-info-closer')[0].blur();
                });

                this.viewModel = {
                    selectedResource: ko.observable({}),
                    clusterFeatures: ko.observableArray()
                };
                ko.applyBindings(this.viewModel, $('#resource-info')[0]);
                ko.applyBindings(this.viewModel, $('#cluster-info')[0]);

                var showFeaturePopup = function(feature) {
                    var resourceData = {
                        id: feature.getId(),
                        reportLink: arches.urls.reports + feature.getId()
                    };
                    var typeInfo = resourceTypes[feature.get('entitytypeid')];
                    $('#cluster-info').hide();
                    if (typeInfo) {
                        resourceData.typeName = resourceTypes[feature.get('entitytypeid')].name;
                        resourceData.typeIcon = resourceTypes[feature.get('entitytypeid')].icon;
                    }
                    _.each(feature.getKeys(), function (key) {
                        resourceData[key] = feature.get(key);
                    });
                    
                    selectFeatureOverlay.getFeatures().clear();
                    selectFeatureOverlay.getFeatures().push(feature);
                    self.viewModel.selectedResource(resourceData);
                    $('#resource-info').show();
                };

                this.showFeaturePopup = showFeaturePopup;

                var showClusterPopup = function(feature) {
                    var ids = [];
                    _.each(feature.get('features'), function(childFeature) {
                        ids.push(childFeature.getId());
                    });
                    var featureIds = ids.join(',');
                    var completeFeatures = clusterFeaturesCache[featureIds];

                    self.viewModel.clusterFeatures.removeAll();
                    $('#resource-info').hide();
                    $('#cluster-info').show();

                    if (completeFeatures) {
                        self.viewModel.clusterFeatures.push.apply(self.viewModel.clusterFeatures, completeFeatures);
                    } else {
                        $.ajax({
                            url: arches.urls.map_markers + 'all?entityid=' + featureIds,
                            success: function(response) {
                                clusterFeaturesCache[featureIds] = response.features;
                                self.viewModel.clusterFeatures.push.apply(self.viewModel.clusterFeatures, response.features);
                            }
                        });
                    }
                };

                var currentZoom;
                this.map.on('viewChanged', function (zoom, extent) {
                    currentZoom = zoom;
                });

                this.map.on('mapClicked', function(e, clickFeature) {
                    selectFeatureOverlay.getFeatures().clear();
                    $('#resource-info').hide();
                    if (clickFeature) {
                        var keys = clickFeature.getKeys();
                        var isCluster = _.contains(keys, "features") || _.contains(keys, "point_count");
                        var isArchesFeature = (_.contains(keys, 'arches_cluster') || _.contains(keys, 'arches_marker'));
                        var numFeatures = 0;
                        if(isCluster) {
                            if(clickFeature.get('features')) {
                                numFeatures = clickFeature.get('features').length;
                            } else if (clickFeature.get('point_count')) {
                                numFeatures = clickFeature.get('point_count');
                            }
                        }
                        if (isCluster && numFeatures > 1) {
                            if (currentZoom !== arches.mapDefaults.maxZoom) {
                                var extent = clickFeature.getGeometry().getExtent();
                                if(clickFeature.get("features")) {
                                    //an ol cluster - we have information about the sub-features, so zoom to their extents
                                    _.each(clickFeature.get("features"), function (feature) {
                                        if (_.contains(keys, 'extent')) {
                                            featureExtent = ol.extent.applyTransform(feature.get('extent'), ol.proj.getTransform('EPSG:4326', 'EPSG:3857'));
                                        } else {
                                            featureExtent = feature.getGeometry().getExtent();
                                        }
                                        extent = ol.extent.extend(extent, featureExtent);
                                    });
                                    self.map.map.getView().fitExtent(extent, (self.map.map.getSize()));
                                } else {
                                    //a supercluster cluster. We only know the number of points and their shared centre;
                                    // Zoom in by two levels, and centre the map on this point
                                    var view = self.map.map.getView();
                                    
                                    //animate not available in ol 3.1
                                    // view.animate({
                                    //     zoom: view.getZoom() + 2,
                                    //     center: clickFeature.getGeometry().getCoordinates(),
                                    //     duration: 0.5
                                    // })
                                    
                                    //get desired new zoom
                                    var clusterId = clickFeature.get("cluster_id");
                                    if(clusterId) {
                                        var newZoom = this.resultsIndex.getClusterExpansionZoom(clusterId, view.getZoom());
                                        console.log('new zoom', newZoom);
                                    } else {
                                        var newZoom = view.getZoom() + 2;
                                    }
                                    
                                    view.setZoom(view.getZoom() + 2);
                                    view.setCenter(clickFeature.getGeometry().getCoordinates());
                                }
                            } else {
                                showClusterPopup(clickFeature);
                            }
                        } else {
                            if (isCluster) {
                                //cluster of 1
                                clickFeature = clickFeature.get('features')[0];
                                keys = clickFeature.getKeys();
                            }
                            if (!_.contains(keys, 'select_feature')) {
                                //individual feature - TODO assess how well this works for features originating from supercluster
                                if (isArchesFeature) {
                                    if (archesFeaturesCache[clickFeature.getId()] && archesFeaturesCache[clickFeature.getId()] !== 'loading'){
                                        showFeaturePopup(archesFeaturesCache[clickFeature.getId()]);
                                    } else {
                                        $('.map-loading').show();
                                        archesFeaturesCache[clickFeature.getId()] = 'loading';
                                        $.ajax({
                                            url: arches.urls.map_markers + 'all?entityid=' + clickFeature.getId(),
                                            success: function(response) {
                                                var feature = geoJSON.readFeature(response.features[0]);
                                                var geom = feature.getGeometry();
                                                geom.transform(ol.proj.get('EPSG:4326'), ol.proj.get('EPSG:3857'));

                                                feature.set('select_feature', true);
                                                feature.set('entityid', feature.getId());

                                                archesFeaturesCache[clickFeature.getId()] = feature;
                                                $('.map-loading').hide();
                                                showFeaturePopup(feature);
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    }
                }.bind(this));

                this.resultLayer = new ResourceLayerModel({entitytypeid: null, vectorColor: arches.resourceMarker.defaultColor}).layer();
                this.map.map.addLayer(this.resultLayer);
                var styleFactory = function (color, zIndex) {
                    var rgb = utils.hexToRgb(color);
                    return [new ol.style.Style({
                        text: new ol.style.Text({
                            text: arches.resourceMarker.icon,
                            font: 'normal 42px ' + arches.resourceMarker.font,
                            offsetX: 5,
                            offsetY: ((42/2)*-1)-5,
                            fill: new ol.style.Fill({
                                color: 'rgba(126,126,126,0.3)',
                            })
                        }),
                        zIndex: zIndex
                    }), new ol.style.Style({
                        text: new ol.style.Text({
                            text: arches.resourceMarker.icon,
                            font: 'normal 42px ' + arches.resourceMarker.font,
                            offsetY: (42/2)*-1,
                            stroke: new ol.style.Stroke({
                                color: 'white',
                                width: 3
                            }),
                            fill: new ol.style.Fill({
                                color: 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.9)',
                            })
                        }),
                        zIndex: zIndex
                    })];
                };
                var normalStyle = styleFactory(arches.resourceMarker.defaultColor, 1000000);
                var highlightStyle = styleFactory('#4CAE4C', 9999999);

                this.currentPageLayer = new ol.layer.Vector({
                    source: new ol.source.GeoJSON(),
                    style: function(feature) {
                        if(feature.get('highlight')) {
                            return highlightStyle;
                        } else {
                            return normalStyle;
                        }
                    }
                });
                this.map.map.addLayer(this.currentPageLayer);
            },

            zoomToResource: function(resourceid){
                this.cancelFitBaseLayer = true;
                var feature = this.resultLayer.getSource().getFeatureById(resourceid);
                if(feature.getGeometry().getGeometries().length > 1){
                    var extent = feature.getGeometry().getExtent();
                    var minX = extent[0];
                    var minY = extent[1];
                    var maxX = extent[2];
                    var maxY = extent[3];
                    var polygon = new ol.geom.Polygon([[[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY], [minX, minY]]]);
                    //polygon.transform('EPSG:3857', 'EPSG:4326');
                    this.map.map.getView().fitGeometry(polygon, this.map.map.getSize(), {maxZoom:16}); 
                    //this.zoomToExtent(feature.getGeometry().getExtent());
                }else{
                    this.map.map.getView().fitGeometry(feature.getGeometry().getGeometries()[0], this.map.map.getSize(), {maxZoom:16});                    
                }
            },
            
            zoomToExtent: function(extent){
                var size = this.map.map.getSize();
                var view = this.map.map.getView()
                view.fitExtent(
                    extent,
                    size
                );
            },

            highlightFeatures: function (resultsarray, entityIdArray) {
                var sameResultSet = (entityIdArray[0] === '_none');
                
                //takes an openlayers feature object with mercator projection coordinates, and creates a geojson object with lat/lng coordinates.
                // Note: this is a little daft, since they arrive from the backend as GeoJSON, and are then converted to ol.feature by openlayers.
                // It would be faster to fetch the GeoJSON then pass it to here before importing to openlayers, but that would take more refactoring.
                var mercatorToLatLng = function (olFeature) {
                    var coordsOl = olFeature.getGeometry().getCoordinates();
                    //unproject these coords to get lat/lng
                    // var lonlat = ol.proj.toLonLat(coordsOl, 'EPSG:3857');
                    var latlon = ol.proj.transform(coordsOl, 'EPSG:3857', 'EPSG:4326');
                    return {
                        geometry: {
                            type: "Point",
                            coordinates: latlon
                        },
                        id: olFeature.id_,
                        type: 'Feature'
                    };
                }
                
                if (this.resourceFeatures) {
                    if (entityIdArray[0] === '_all') {
                        //all results, just use full array
                        this.allResultsPoints = _.pluck(this.resourceFeaturesCollection.models, 'attributes');
                        this.allResultsPointsGeoJSON = _.map(this.allResultsPoints, mercatorToLatLng)
                    } else {
                        if(sameResultSet) {
                            //new page of existing results 
                        } else {
                            //brand new result set
                            this.allResultsPoints = _.map(entityIdArray, function (id) {
                                var featureModel = this.resourceFeaturesCollection.get(id);
                                // console.log(feature);
                                if(featureModel) {
                                    return featureModel.attributes;
                                } else {
                                    console.error("Couldn't find feature model for id: " + id);
                                    return null;
                                }
                            }.bind(this));
                            
                            //filter out null entries
                            this.allResultsPoints = _.filter(this.allResultsPoints, function (res) {
                                return !!res;
                            });
                            this.allResultsPointsGeoJSON = _.map(this.allResultsPoints, mercatorToLatLng)
                        }
                    }

                    var currentPageIDs = _.map(resultsarray.results.hits.hits, function (hit) {
                        return hit['_id'];
                    });
                    var partitionedPoints = _.partition(this.allResultsPoints, function (point) {
                        return currentPageIDs.indexOf(point.id_) > -1;
                    });
                    
                    this.currentPageResults = partitionedPoints[0];
                    this.notCurrentPageResults = partitionedPoints[1];
                    _.each(this.currentPageResults, function (feature) {
                        if (!feature.get('arches_marker')) {
                            feature.set('arches_marker', true);
                        }
                    });
                    // this.currentPageResultsPointsGeoJSON = _.map(this.currentPageResults, mercatorToLatLng);
                    this.notCurrentPageResultsPointsGeoJSON = _.map(this.notCurrentPageResults, mercatorToLatLng);

                    //fill cluster index with all results not on the current page
                    this.resultsIndex = supercluster({
                        radius: 100 ,
                        maxZoom: 16
                    });
                    this.resultsIndex.load(this.notCurrentPageResultsPointsGeoJSON);
                    
                    //plot current page results
                    this.currentPageLayer.getSource().clear();
                    this.currentPageLayer.getSource().addFeatures(this.currentPageResults);
                    
                    
                    console.log('rebuilt supercluster index');
                    this.onViewChanged();
                }
            },
            
            onViewChanged: function () {
                if(!this.resultsIndex) {
                    return;
                }
                // var extent = this.getMapExtent();
                var extentOl = this.map.map.getView().calculateExtent(this.map.map.getSize());
                var extentLatLng = ol.proj.transformExtent(extentOl, 'EPSG:3857', 'EPSG:4326');

                var zoom = this.getMapZoom();
                
                // console.log('View changed. Extent = ', extent);
                //clear the clusters layer
                //TODO
                var clustersSource = this.resultLayer.getSource()
                clustersSource.clear();
                
                var clusters = this.resultsIndex.getClusters(extentLatLng, zoom);
                
                //convert supercluster GeoJSON features to ol features
                var clusterFeatures = _.map(clusters, function (cluster) {
                    //project to map coordinates
                    var coords = ol.proj.transform(cluster.geometry.coordinates, 'EPSG:4326', 'EPSG:3857');
                    var f = new ol.Feature(new ol.geom.Point(
                        coords
                    ));
                    f.setProperties(cluster.properties);
                    if(cluster.id) {
                        f.setId(cluster.id);
                    }
                    return f;
                }.bind(this));
                
                clustersSource.addFeatures(clusterFeatures);
                
            },


            highlightFeatures_: function(resultsarray, entityIdArray){
                var resultFeatures = [];
                var currentPageFeatures = [];
                var nonResultFeatures = [];
                var self = this;
                var sameResultSet = (entityIdArray[0] === '_none');

                if (this.resourceFeatures) {
                    if (sameResultSet) {
                        currentPageFeatures = this.currentPageLayer.getSource().getFeatures();
                        self.currentPageLayer.getSource().clear();
                        self.resultLayer.vectorSource.addFeatures(currentPageFeatures);
                        currentPageFeatures = [];
                        _.each(resultsarray.results.hits.hits, function(pageResult) {
                            var feature = self.resultLayer.vectorSource.getFeatureById(pageResult['_id']);
                            if (feature) {
                                self.resultLayer.vectorSource.removeFeature(feature);
                                if (!feature.get('arches_marker')) {
                                    feature.set('arches_marker', true);
                                }
                                currentPageFeatures.push(feature);
                            }
                        });
                        self.currentPageLayer.getSource().addFeatures(currentPageFeatures);
                    } else {
                        self.vectorLayer.vectorSource.clear();
                        this.resultLayer.vectorSource.clear();
                        this.currentPageLayer.getSource().clear();

                        if (entityIdArray[0] === '_all') {
                             _.each(this.resourceFeatures, function (feature) {
                                if (_.find(resultsarray.results.hits.hits, function(hit){ return hit['_id'] === feature.getId() })) {
                                    if (!feature.get('arches_marker')) {
                                        feature.set('arches_marker', true);
                                    }
                                    currentPageFeatures.push(feature);
                                } else {
                                    resultFeatures.push(feature);
                                }
                            });
                        } else {
                            _.each(this.resourceFeatures, function (feature) {
                                if (_.find(resultsarray.results.hits.hits, function(hit){ return hit['_id'] === feature.getId() })) {
                                    if (!feature.get('arches_marker')) {
                                        feature.set('arches_marker', true);
                                    }
                                    currentPageFeatures.push(feature);
                                } else if (entityIdArray.indexOf(feature.getId()) > 0) {
                                    resultFeatures.push(feature);
                                } else {
                                    nonResultFeatures.push(feature);
                                }
                            });
                        }
                        self.currentPageLayer.getSource().addFeatures(currentPageFeatures);
                        self.resultLayer.vectorSource.addFeatures(resultFeatures);
                        self.vectorLayer.vectorSource.addFeatures(nonResultFeatures);
                        if (self.drawingFeatureOverlay.getFeatures().getLength() === 0 && this.query.filter.geometry.type() !== 'bbox') {
                            self.zoomToResults();
                        }
                    }
                    self.previousEntityIdArray = entityIdArray;
                } else {
                    this.highlightOnLoad = {
                        resultsarray: resultsarray,
                        entityIdArray: entityIdArray
                    };
                }
            },

            zoomToResults: function () {
                var extent = ol.extent.extend(this.currentPageLayer.getSource().getExtent(), this.resultLayer.vectorSource.getExtent());
                var allResultsGeoJSON = {
                    type: "FeatureCollection",
                    features: this.allResultsPointsGeoJSON
                }
                var extent = geojsonExtent(allResultsGeoJSON);
                var extentProjected = ol.proj.transformExtent(extent, 'EPSG:4326', 'EPSG:3857');
                
                this.map.map.getView().fitExtent(extentProjected, this.map.map.getSize());
            },

            selectFeatureById: function(resourceid){
                this.unselectAllFeatures();
                var feature = this.currentPageLayer.getSource().getFeatureById(resourceid);
                if(feature){
                    feature.set('highlight', true);
                    return feature;
                } 
            },

            unselectAllFeatures: function(){
                this.currentPageLayer.getSource().forEachFeature(function(feature) {
                    feature.set('highlight', false);
                });
            },

            getMapExtent: function(){
                var extent = ol.proj.transformExtent(this.map.map.getView().calculateExtent(this.map.map.getSize()), 'EPSG:3857', 'EPSG:4326');
                return extent;
            },
            
            getMapZoom: function () {
                return this.map.map.getView().getZoom();
            },

            onMoveEnd: function(evt) {
                this.query.filter.geometry.coordinates(this.getMapExtent());
                this.onViewChanged(this.getMapExtent());
            },

            togglefilter: function(evt){
                var link = $(evt.target).closest('a');
                var data = link.data();
                var item = link.find('i');
 
                if (!(item.hasClass("fa-check"))){
                    this.enableFilter(data.tooltype);
                }else{
                    this.clear();
                }
            },

            enableFilter: function(tooltype){
                if(tooltype){
                    if(tooltype === 'map-extent'){
                        this.removeDrawingTools();
                        this.clearDrawingFeatures();
                        this.query.filter.geometry.type('bbox');
                        this.query.filter.geometry.coordinates(this.getMapExtent());
                        this.map.map.on('moveend', this.onMoveEnd, this);
                    }else{
                        this.clearDrawingFeatures();
                        this.query.filter.geometry.type(tooltype);
                        this.changeDrawingTool(this.map.map, tooltype);
                        this.map.map.un('moveend', this.onMoveEnd, this);     
                    }                  
                }
            },

            changeDrawingTool: function(map, tooltype){
                this.disableDrawingTools();

                this.modifyTool = new ol.interaction.Modify({
                    features: this.drawingFeatureOverlay.getFeatures(),
                    // the SHIFT key must be pressed to delete vertices, so
                    // that new vertices can be drawn at the same position
                    // of existing vertices
                    deleteCondition: function(event) {
                        return ol.events.condition.shiftKeyOnly(event) &&
                                ol.events.condition.singleClick(event);
                    }
                });
                map.addInteraction(this.modifyTool);                

                this.drawingtool = new ol.interaction.Draw({
                    features: this.drawingFeatureOverlay.getFeatures(),
                    type: tooltype
                });
                this.drawingtool.set('type', tooltype);

                this.drawingtool.on('drawstart', function(){
                    if(this.drawingtool.get('type') !== 'Point'){
                        this.clearDrawingFeatures();                       
                    }
                }, this);

                this.drawingtool.on('drawend', function(evt){
                    var self = this;
                    var geometry = evt.feature.getGeometry().clone();
                    geometry.transform('EPSG:3857', 'EPSG:4326');
                    this.query.filter.geometry.coordinates(geometry.getCoordinates());

                    //this.applyBuffer();
                    
                    evt.feature.on('change', function(evt) {
                        var geometry = evt.target.getGeometry().clone();
                        geometry.transform('EPSG:3857', 'EPSG:4326');
                        self.query.filter.geometry.coordinates(geometry.getCoordinates());
                        //self.applyBuffer();
                    });
                }, this);

                this.enableDrawingTools();
            },

            enableDrawingTools: function(){
                if(this.drawingtool){
                    this.map.map.addInteraction(this.drawingtool);
                }
            },

            disableDrawingTools: function(){
                if(this.drawingtool){
                    this.map.map.removeInteraction(this.drawingtool);
                }
            },

            removeDrawingTools: function(){
                this.disableDrawingTools();
                delete this.drawingtool;
            },

            clearDrawingFeatures: function(){
                if (this.bufferFeatureOverlay){
                    this.bufferFeatureOverlay.getFeatures().clear();                 
                }
                if (this.drawingFeatureOverlay){
                    this.drawingFeatureOverlay.getFeatures().clear();
                }
            },

            applyBuffer: function(){
                var self = this;
                var params = {
                    filter: ko.toJSON(this.query.filter)
                }; 
                if(this.query.filter.buffer.width() > 0 && this.drawingFeatureOverlay.getFeatures().getLength() > 0){
                    $.ajax({
                        type: "GET",
                        url: arches.urls.buffer,
                        data: {
                            filter: ko.toJSON(this.query.filter)
                        },
                        success: function(results){
                            var source = new ol.source.GeoJSON(({object:{type: 'FeatureCollection', features: [{type:'Feature', geometry: JSON.parse(results)}]}}));
                            var feature = source.getFeatures()[0];
                            
                            feature.getGeometry().transform('EPSG:4326', 'EPSG:3857');
                            self.bufferFeatureOverlay.getFeatures().clear();  
                            self.bufferFeatureOverlay.addFeature(feature);
                        },
                        error: function(){}
                    });                    
                }else{
                    this.bufferFeatureOverlay.getFeatures().clear();  
                }
            },

            toggleMapTools: function() {
                if($('#map-tools-btn').hasClass('open')){
                    this.disableDrawingTools();
                }
                else {
                    this.enableDrawingTools();
                }
                $('#map-tools-btn').toggleClass('open');
            },

            toggleFilterSection: function(ele, expand){
                if(expand){
                    this.slideToggle(ele, 'show');
                }else{
                    this.slideToggle(ele, 'hide');               
                }
            },

            slideToggle: function(ele, showOrHide){
                var self = this;
                if ($(ele).is(":visible") && showOrHide === 'hide'){
                    ele.slideToggle('slow');
                    return;
                }

                if (!($(ele).is(":visible")) && showOrHide === 'show'){
                    ele.slideToggle('slow', function(){
                        self.map.map.updateSize();
                        self.zoomToResults();
                    });
                    return;
                }

                if (!showOrHide){
                    ele.slideToggle('slow');                    
                }
            },

            restoreState: function(filter, expanded){
                this.map.map.once('change:size', function(){
                    if(typeof filter !== 'undefined' && 'geometry' in filter && filter.geometry.coordinates.length > 0){
                        this.query.filter.inverted(ko.utils.unwrapObservable(filter.inverted));                        
                        this.query.filter.geometry.type(ko.utils.unwrapObservable(filter.geometry.type));
                        this.query.filter.geometry.coordinates(ko.utils.unwrapObservable(filter.geometry.coordinates));
                        this.query.filter.buffer.width(ko.utils.unwrapObservable(filter.buffer.width));
                        this.query.filter.buffer.unit(ko.utils.unwrapObservable(filter.buffer.unit));

                        var coordinates = this.query.filter.geometry.coordinates();
                        var type = this.query.filter.geometry.type();
                        if(type === 'bbox'){
                            this.map.map.on('moveend', this.onMoveEnd, this); 

                            var extent = ol.proj.transformExtent(coordinates, 'EPSG:4326', 'EPSG:3857');
                            this.zoomToExtent(extent);

                        }else{
                            var feature = new ol.Feature({
                                geometry: new ol.geom[type](coordinates)
                            });

                            feature.getGeometry().transform('EPSG:4326', 'EPSG:3857');
                            this.zoomToExtent(feature.getGeometry().getExtent());
                            this.drawingFeatureOverlay.addFeature(feature);
                            this.changeDrawingTool(this.map.map, type);
                            this.disableDrawingTools();

                            feature.on('change', function(evt) {
                                var geometry = evt.target.getGeometry().clone();
                                geometry.transform('EPSG:3857', 'EPSG:4326');
                                this.query.filter.geometry.coordinates(geometry.getCoordinates());
                                //self.applyBuffer();
                            }, this);
                        }
                    }

                }, this);

                if(typeof expanded === 'undefined'){
                    expanded = false;
                }
                this.expanded(expanded);

            },

            clear: function(){
                this.removeDrawingTools();
                this.clearDrawingFeatures();
                this.query.filter.inverted(false);
                this.query.filter.geometry.type('');
                this.query.filter.geometry.coordinates([]);
                this.map.map.un('moveend', this.onMoveEnd, this);
            },

            clusterItemClick: function (e) {
                var entityid = $(e.target).closest('.cluster-item-link').data().entityid;
                var geoJSONFeature = ko.utils.arrayFirst(this.viewModel.clusterFeatures(), function(item) {
                    return entityid === item.id;
                });

                var feature = geoJSON.readFeature(geoJSONFeature);
                var geom = feature.getGeometry();
                geom.transform(ol.proj.get('EPSG:4326'), ol.proj.get('EPSG:3857'));

                feature.set('select_feature', true);
                feature.set('entityid', feature.getId());

                this.showFeaturePopup(feature);
            }

        });
});
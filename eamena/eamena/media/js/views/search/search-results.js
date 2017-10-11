define(['jquery', 
    'underscore',
    'backbone',
    'bootstrap',
    'arches', 
    'select2',
    'knockout',
    'views/related-resources-graph',
    'resource-types',
    'bootstrap-datetimepicker',
    'plugins/knockout-select2'], 
    function($, _, Backbone, bootstrap, arches, select2, ko, RelatedResourcesGraph, resourceTypes) {

        return Backbone.View.extend({

            events: {
                'click .page-button': 'newPage',
                'click .related-resources-graph': 'showRelatedResouresGraph',
                'click .navigate-map': 'zoomToFeature',
                'mouseover .arches-search-item': 'itemMouseover',
                'mouseout .arches-search-item': 'itemMouseout'
            },

            initialize: function(options) { 
                var self = this;
                    var
                            htmlDataAttributePrefix = 'popover-',
                            defaults = {
                                animation: undefined,
                                html: undefined,
                                placement: 'top',
                                selector: undefined,
                                trigger: 'hover',
                                title: 'Default Title',
                                content: 'Default content',
                                delay: undefined,
                                container: 'body'
                            };
                _.extend(this, options);

                this.total = ko.observable();
                this.results = ko.observableArray();
                this.relatedresults = ko.observableArray();
                this.page = ko.observable(1);
                this.paginator = ko.observable();

                ko.applyBindings(this, $('#search-results-list')[0]);
                if ($('#related-search-results-list')[0]) {
                    ko.applyBindings(this, $('#related-search-results-list')[0]);
                }
                ko.applyBindings(this, $('#search-results-count')[0]);
                ko.applyBindings(this, $('#paginator')[0]);
                ko.bindingHandlers.popover = {
                    init: function (element, valueAccessor, allBindingsAccessor) {               
                        var $elem = $(element),
                        isPopover = valueAccessor(),
                        popoverOptions = allBindingsAccessor().popoverOptions;

                        if (isPopover) {
                            initPopover($elem, popoverOptions);
                            return;
                        }

                        if (popoverOptions.elem) {
                            var elems = $elem.find(popoverOptions.elem);
            
                            if (!elems) {
                                throw new Error('Element \'$ELEM$\' was not found'.replace('$ELEM$', popoverOptions.elem));
                            }
            
                            initPopover(elems, popoverOptions);
                        }
                    },
                    initPopover: function (elems,overrides) {
                        elems.each(function () {
                            var dataValues = {};
                
                            for (var p in defaults) {
                                dataValues[p] = $(this).data(htmlDataAttributePrefix + p);
                            }
                
                            $(this).popover($.extend({}, defaults, dataValues, overrides));
                        });                
                    }
                };

            },
            showRelatedResouresGraph: function (e) {
                var resourceId = $(e.target).data('resourceid');
                var primaryName = $(e.target).data('primaryname');
                var typeId = $(e.target).data('entitytypeid');
                var searchItem = $(e.target).closest('.arches-search-item');
                var graphPanel = searchItem.find('.arches-related-resource-panel');
                var nodeInfoPanel = graphPanel.find('.node_info');
                if (!graphPanel.hasClass('view-created')) {
                    new RelatedResourcesGraph({
                        el: graphPanel[0],
                        resourceId: resourceId,
                        resourceName: primaryName,
                        resourceTypeId: typeId
                    });
                }
                nodeInfoPanel.hide();
                $(e.target).closest('li').toggleClass('graph-active');
                graphPanel.slideToggle(500);
            },

            newPage: function(evt){
                var data = $(evt.target).data();             
                this.page(data.page);
            },

            updateResults: function(results){
                var self = this;
                this.paginator(results);
                var data = $('div[name="search-result-data"]').data();
                
                this.total(data.results.hits.total);
                self.results.removeAll();
                
                $.each(data.results.hits.hits, function(){
                    var description = resourceTypes[this._source.entitytypeid].defaultDescription;
                    var description_array = [];
                    var descriptionNodeStr = resourceTypes[this._source.entitytypeid].descriptionNode;
                    var descriptionNode = descriptionNodeStr.split(",");
                    $.each(this._source.child_entities, function(i, entity){
                        _.each(descriptionNode, function(node){
                            if (entity.entitytypeid === node){
                                description_array.push(entity.value);
                            }
                        });
                    
                    })
                    if (description_array.length > 0) {
                        description = description_array.join();
                    }
                    self.results.push({
                        primaryname: this._source.primaryname,
                        resourceid: this._source.entityid,
                        entitytypeid: this._source.entitytypeid,
                        description: description,
                        geometries: ko.observableArray(this._source.geometries),
                        typeIcon: resourceTypes[this._source.entitytypeid].icon,
                        typeName: resourceTypes[this._source.entitytypeid].name
                    });
                    $.each(this.related_resources.related_resources, function(){
                        $.each(this.child_entities, function(i, entity){
                            _.each(descriptionNode, function(node){
                                if (entity.entitytypeid === node){
                                    description_array.push(entity.value);
                                }
                            });
                        
                        })
                        if (description_array.length > 0) {
                            description = description_array.join();
                        }
                        
                        self.relatedresults.push({
                            primaryname: this.primaryname,
                            resourceid: this.entityid,
                            entitytypeid: this.entitytypeid,
                            description: description,
                            geometries: ko.observableArray(this.geometries),
                            typeIcon: resourceTypes[this.entitytypeid].icon,
                            typeName: resourceTypes[this.entitytypeid].name
                        });
                    });
                });
                self.relatedresults = _.uniq(self.relatedresults);
                return data;
            },

            restoreState: function(page){
                if(typeof page !== 'undefined'){
                    this.page(ko.utils.unwrapObservable(page));
                }
            },

            itemMouseover: function(evt){
                if(this.currentTarget !== evt.currentTarget){
                    var data = $(evt.currentTarget).data();
                    this.trigger('mouseover', data.resourceid);    
                    this.currentTarget = evt.currentTarget;              
                }
                return false;    
            },

            itemMouseout: function(evt){
                this.trigger('mouseout');
                delete this.currentTarget;
                return false;
            },

            zoomToFeature: function(evt){
                var data = $(evt.currentTarget).data();
                this.trigger('find_on_map', data.resourceid, data);   
            }

        });
    });
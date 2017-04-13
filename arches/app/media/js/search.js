require(['jquery', 
    'underscore',
    'backbone',
    'bootstrap',
    'arches', 
    'select2',
    'views/search/term-filter', 
    'views/search/map-filter',
    'views/search/time-filter',
    'views/search/search-results',
    'knockout',
    'plugins/bootstrap-slider/bootstrap-slider.min',
    'views/forms/sections/branch-list',
    'resource-types',
    'openlayers',
    'bootstrap-datetimepicker',
    'plugins/knockout-select2'], 
    function($, _, Backbone, bootstrap, arches, select2, TermFilter, MapFilter, TimeFilter, SearchResults, ko, Slider, BranchList, resourceTypes, ol) {
    $(document).ready(function() {
        var wkt = new ol.format.WKT();

        var SearchView = Backbone.View.extend({
            el: $('body'),
            updateRequest: '',

            events: {
                'click #view-saved-searches': 'showSavedSearches',
                'click #clear-search': 'clear',
                'click #map-filter-button': 'toggleMapFilter',
                'click #time-filter-button': 'toggleTimeFilter',
                'click a.dataexport': 'exportSearch',
                'click a.search-and-or': 'onChangeAndOr',
                'click a.search-grouped': 'onChangeGroup',
                'click .add-search-box': 'onAddSearchBox',
                'click .remove-search-box': 'onRemoveSearchBox',
            },

            initialize: function(options) { 
                var self = this;
                var query = this.getQueryFromUrl();
                if('termFilter' in query){
                    query.termFilter = JSON.parse(query.termFilter);
                    query.termFilter = _.filter(query.termFilter , function(filter){ return filter.length > 0 });
                    this.searchBoxes = query.termFilter.length;
                    // number of term search boxes should be at least one (except the date-location box)
                    if (this.searchBoxes < 1) {
                        this.searchBoxes = 1;
                    }
                } else {
                    this.searchBoxes = 1;
                }
                this.initializeSearchBoxes();

                this.mapFilter = new MapFilter({
                    el: $('#map-filter-container')[0]
                });
                this.mapFilter.on('enabled', function(enabled, inverted){
                    if(enabled){
                        this.termFilter[0].addTag(this.mapFilterText, inverted);
                    }else{
                        this.termFilter[0].removeTag(this.mapFilterText);
                    }
                }, this);


                this.timeFilter = new TimeFilter({
                    el: $('#time-filter-container')[0]
                });
                this.timeFilter.on('enabled', function(enabled, inverted){
                    if(enabled){
                        this.termFilter[0].addTag(this.timeFilterText, inverted);
                    }else{
                        this.termFilter[0].removeTag(this.timeFilterText);
                    }
                }, this);
                this.booleanSearch = "and";
                // this.groupSearch = "normal";

                this.searchResults = new SearchResults({
                    el: $('#search-results-container')[0]
                });
                this.searchResults.on('mouseover', function(resourceid){
                    this.mapFilter.selectFeatureById(resourceid);
                }, this);
                this.searchResults.on('mouseout', function(){
                    this.mapFilter.unselectAllFeatures();
                }, this);
                this.searchResults.on('find_on_map', function(resourceid, data){
                    var extent,
                        expand = !this.mapFilter.expanded();
                    if (expand) {
                        this.mapFilter.expanded(true);
                    }
                    
                    _.each(data.geometries, function (geometryData) {
                        var geomExtent = wkt.readGeometry(geometryData.label).getExtent();
                        geomExtent = ol.extent.applyTransform(geomExtent, ol.proj.getTransform('EPSG:4326', 'EPSG:3857'));
                        extent = extent ? ol.extent.extend(extent, geomExtent) : geomExtent;
                    });
                    if (extent) {
                        _.delay(function() {
                            self.mapFilter.zoomToExtent(extent);
                        }, expand ? 700 : 0);
                    }
                }, this);


                this.mapFilterText = this.mapFilter.$el.data().filtertext;
                this.timeFilterText = this.timeFilter.$el.data().filtertext;

                self.isNewQuery = true;
                this.searchQuery = {
                    queryString: function(){
                        var termFilters = [];
                        var termFilterGrouping = [];
                        var termFiltersLen = 0;
                        _.each(self.termFilter,function (term, i) {
                            termFiltersLen += term.query.filter.terms().length;
                            termFilters.push(term.query.filter.terms());
                        })
                        var params = {
                            page: self.searchResults.page(),
                            termFilter: ko.toJSON(termFilters),
                            temporalFilter: ko.toJSON({
                                year_min_max: self.timeFilter.query.filter.year_min_max(),
                                filters: self.timeFilter.query.filter.filters(),
                                inverted: self.timeFilter.query.filter.inverted()
                            }),
                            spatialFilter: ko.toJSON(self.mapFilter.query.filter),
                            mapExpanded: self.mapFilter.expanded(),
                            timeExpanded: self.timeFilter.expanded(),
                            booleanSearch: self.booleanSearch,
                            termFilterGrouping: ko.toJSON(self.termFilterGrouping),
                        };
                        
                        if (termFiltersLen === 0 &&
                            self.timeFilter.query.filter.year_min_max().length === 0 &&
                            self.timeFilter.query.filter.filters().length === 0 &&
                            self.mapFilter.query.filter.geometry.coordinates().length === 0) {
                            params.no_filters = true;
                        }

                        params.include_ids = self.isNewQuery;
                        return $.param(params).split('+').join('%20');
                    },
                    changed: ko.pureComputed(function(){
                        var ret = ko.toJSON(this.timeFilter.query.changed()) +
                            ko.toJSON(this.mapFilter.query.changed());
                        return ret;
                    }, this).extend({ rateLimit: 200 })
                };
                this.getSearchQuery();
                this.searchResults.page.subscribe(function(){
                    self.doQuery();
                });

                this.searchQuery.changed.subscribe(function(){
                    self.isNewQuery = true;
                    self.searchResults.page(1);
                    self.doQuery();
                });
            },
            

            doQuery: function () {
                var self = this;
                var queryString = this.searchQuery.queryString();
                if (this.updateRequest) {
                    this.updateRequest.abort();
                }

                $('.loading-mask').show();
                window.history.pushState({}, '', '?'+queryString);

                this.updateRequest = $.ajax({
                    type: "GET",
                    url: arches.urls.search_results,
                    data: queryString,
                    success: function(results){
                        var data = self.searchResults.updateResults(results);
                        self.mapFilter.highlightFeatures(data, $('.search-result-all-ids').data('results'));
                        self.mapFilter.applyBuffer();
                        self.isNewQuery = false;
                        $('.loading-mask').hide();
                    },
                    error: function(){}
                });
            },

            showSavedSearches: function(){
                this.clear();
                $('#saved-searches').slideDown('slow');
                $('#search-results').slideUp('slow');
                this.mapFilter.expanded(false);
                this.timeFilter.expanded(false);
            },

            hideSavedSearches: function(){
                $('#saved-searches').slideUp('slow');
                $('#search-results').slideDown('slow');
            },

            toggleMapFilter: function(){
                if($('#saved-searches').is(":visible")){
                    this.doQuery();
                    this.hideSavedSearches();
                }
                this.mapFilter.expanded(!this.mapFilter.expanded());
                window.history.pushState({}, '', '?'+this.searchQuery.queryString());
            },

            toggleTimeFilter: function(){
                if($('#saved-searches').is(":visible")){
                    this.doQuery();
                    this.hideSavedSearches();
                }
                this.timeFilter.expanded(!this.timeFilter.expanded());
                window.history.pushState({}, '', '?'+this.searchQuery.queryString());
            },

            getQueryFromUrl: function () {
                return _.chain(decodeURIComponent(location.search).slice(1).split('&') )
                    // Split each array item into [key, value]
                    // ignore empty string if search is empty
                    .map(function(item) { if (item) return item.split('='); })
                    // Remove undefined in the case the search is empty
                    .compact()
                    // Turn [key, value] arrays into object parameters
                    .object()
                    // Return the value of the chain operation
                    .value();
            },

            getSearchQuery: function(){
                var doQuery = false;
                var query = this.getQueryFromUrl();

                if('page' in query){
                    query.page = JSON.parse(query.page);
                    doQuery = true;
                }
                this.searchResults.restoreState(query.page);


                if('termFilter' in query){
                    query.termFilter = JSON.parse(query.termFilter);
                    // remove termfilters if they are empty
                    // except the 1st (date-location) and 2nd (at least one searchbox is needed)
                    query.termFilter = _.filter(query.termFilter , function(filter, i){
                        if (i<2) return true;
                        return filter.length > 0
                     });
                    doQuery = true;
                    for (var i = 0; i < this.searchBoxes+1; i++) {
                        this.termFilter[i].restoreState(query.termFilter[i]);
                    }
                }
                
                if('termFilterGrouping' in query){
                    _.each(JSON.parse(query.termFilterGrouping), function (groupingValue ,i) {
                        
                        $(".select2-container.resource_search_widget"+i)
                            .closest(".search-box-container").find(".group-value").
                            html(groupingValue.charAt(0).toUpperCase() + groupingValue.slice(1));
                        this.termFilterGrouping[i] = groupingValue;
                    }.bind(this));
                    doQuery = true;
                }
                
                if('booleanSearch' in query){
                    this.onChangeAndOr(query.booleanSearch);
                    doQuery = true;
                }

                if('temporalFilter' in query){
                    query.temporalFilter = JSON.parse(query.temporalFilter);
                    doQuery = true;
                }
                if('timeExpanded' in query){
                    query.timeExpanded = JSON.parse(query.timeExpanded);
                    doQuery = true;
                }
                this.timeFilter.restoreState(query.temporalFilter, query.timeExpanded);


                if('spatialFilter' in query){
                    query.spatialFilter = JSON.parse(query.spatialFilter);
                    doQuery = true;
                }
                if('mapExpanded' in query){
                    query.mapExpanded = JSON.parse(query.mapExpanded);
                    doQuery = true;
                }
                this.mapFilter.restoreState(query.spatialFilter, query.mapExpanded);
                

                if(doQuery){
                    this.doQuery();
                    this.hideSavedSearches();
                }
                
            },

            clear: function(){
                this.mapFilter.clear();
                this.timeFilter.clear();
                for (var i = 0; i < this.searchBoxes; i++) {
                    this.termFilter[i].clear();
                }
            },

            exportSearch: function(e) {
                var export_format = e.currentTarget.id,
                    _href = $("a.dataexport").attr("href"),
                    format = 'export=' + export_format,
                    params_with_page = this.searchQuery.queryString(),
                    page_number_regex = /page=[0-9]+/;
                    params = params_with_page.replace(page_number_regex, format);
                $("a.dataexport").attr("href", arches.urls.search_results_export + '?' + params);
            },
            
            onChangeAndOr: function (e) {
                var targetClass;
                if (e.target) {
                    if ($(e.target).hasClass("search-and")) {
                        targetClass = "and";
                    }
                    if ($(e.target).hasClass("search-or")) {
                        targetClass = "or";
                    }
                } else {
                    targetClass = e;
                }
                if (targetClass == 'and') {
                    if (this.booleanSearch != "and") {
                        $(".and-or-value").html("And");
                        this.booleanSearch = "and";
                        $(".select2-choices").removeClass("or-search");
                        this.doQuery();
                    }
                } else if (targetClass == 'or') {
                    if (this.booleanSearch != "or") {
                        $(".and-or-value").html("Or");
                        this.booleanSearch = "or";
                        $(".select2-choices").addClass("or-search");
                        this.doQuery();
                    }
                }
            },
            
            onChangeGroup: function (e) {
                var i = $(e.target.closest("div")).data("index");
                if ($(e.target).hasClass("search-and")) {
                    if (this.termFilterGrouping[i] != "and") {
                        $(e.target).closest(".dropdown").find(".group-value").html("And");
                        this.termFilterGrouping[i] = "and";
                        this.doQuery();
                    }
                } else if ($(e.target).hasClass("search-or")) {
                    if (this.termFilterGrouping[i] != "or") {
                        $(e.target).closest(".dropdown").find(".group-value").html("Or");
                        this.termFilterGrouping[i] = "or";
                        this.doQuery();
                    }
                } else if ($(e.target).hasClass("search-group")) {
                    if (this.termFilterGrouping[i] != "group") {
                        $(e.target).closest(".dropdown").find(".group-value").html("Group");
                        this.termFilterGrouping[i] = "group";
                        this.doQuery();
                    }
                }
            },

            initializeSearchBoxes: function () {
                this.termFilter = [];
                this.termFilterGrouping = [];
                for (var i = 0; i <= this.searchBoxes; i++) {
                    if (i > 0) {
                        this.cloneSearchBox(i);
                    }
                    this.termFilterGrouping[i] = "and";
                    this.addSearchBox(i);
                }
                $('.resource_search_widget0 input').attr({'disabled': true});
            },
            
            addSearchBox: function (i) {
                this.termFilter[i] = new TermFilter({
                    el: $.find('input.resource_search_widget' + i)[0],
                    index: i
                });
                this.termFilter[i].on('change', function(){
                    this.isNewQuery = true;
                    this.searchResults.page(1);
                    _.defer(function () {
                        this.doQuery();
                    }.bind(this)) 
                    if($('#saved-searches').is(":visible")){
                        this.hideSavedSearches();
                    }
                }, this);
                this.termFilter[i].on('filter-removed', function(item){
                    if(item.text === this.mapFilterText){
                        this.mapFilter.clear();
                    }
                    if(item.text === this.timeFilterText){
                        this.timeFilter.clear();
                    }
                }, this);
                this.termFilter[i].on('filter-inverted', function(item){
                    if(item.text === this.mapFilterText){
                        this.mapFilter.query.filter.inverted(item.inverted);
                    }
                    if(item.text === this.timeFilterText){
                        this.timeFilter.query.filter.inverted(item.inverted);
                    }
                }, this);
            },
            
            cloneSearchBox: function (i) {
                var cloneInput = $("#term-select-template").clone()
                    .removeAttr('id','term-select-template')
                    .removeClass('hidden')
                    .attr('data-index', i);
                cloneInput.find(".arches-select2").addClass('resource_search_widget' + i);
                $(".term-search-boxes").append(cloneInput);
            },


            removeSearchBox: function (i) {
                $('.resource_search_widget' + i).remove();
                this.termFilter[i].stopListening();
                this.termFilter[i].remove();
                this.termFilter.splice(i, 1);
                this.doQuery();
            },
            
            onAddSearchBox: function (e) {
                this.searchBoxes++;
                this.cloneSearchBox(this.searchBoxes);
                this.addSearchBox(this.searchBoxes);
            },

            onRemoveSearchBox: function (e) {
                this.removeSearchBox(this.searchBoxes);
                this.searchBoxes--;
            },

        });
        new SearchView();
    });
});
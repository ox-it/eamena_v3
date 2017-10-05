define(['jquery', 'leaflet', 'leaflet-bing-tiles', 'arches'], function ($, L, leafletBingLayer, arches) {
    var map = L.map('lmap-container', {
        attributionControl:false,
        zoomControl:false,
        zoom: 18,
        center: new L.LatLng(51.752, -1.2577)
    });

    // add map tiles
    try{
        var binglayer = L.tileLayer.bing({ bingMapsKey:arches.bingKey});
        binglayer.addTo(map);
        
        var geom = JSON.parse($('#resource_geometry').val());
        var geomGeoJSON = L.geoJSON(geom, {style: function () { return {color:'darkred', fill:false}}});
        
        geomGeoJSON.addTo(map);
        
        var center = geomGeoJSON.getBounds().getCenter();
        map.panTo(center);
        
    } catch (e) {
        $("#log-container").append("<div>Error making bing layer" + "</div>")
        $("#log-container").append("<div>" + e + "</div>")
    }
    
    //unhide hidden elements (e.g. related resources)
    $('#tobehidden').show();
})
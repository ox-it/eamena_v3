define(['jquery', 'leaflet', 'leaflet-bing-tiles', 'arches'], function ($, L, leafletBingLayer, arches) {
    var map = L.map('lmap-container', {
        attributionControl:false,
        zoomControl:false,
        zoom: 15,
        center: new L.LatLng(51.752, -1.2577)
    });
    // add map tiles
    $("#log-container").append("<div>adding map tiles" +  "</div>")
    try{
        $("#log-container").append("<div>" + typeof(L.tileLayer.bing) + "</div>")
        var binglayer = L.tileLayer.bing({ bingMapsKey:arches.bingKey});
        binglayer.addTo(map);
        $("#log-container").append("<div>made bing layer" +  "</div>")
    } catch (e) {
        $("#log-container").append("<div>Error making bing layer" + "</div>")
        $("#log-container").append("<div>" + e + "</div>")
        $("#log-container").append("<div>" + e.stack + "</div>")
    }
    // L.tileLayer('https://maps-tiles.oucs.ox.ac.uk/{z}/{x}/{y}.png').addTo(map);

    
})


const log = function(data) {
    $('#log-container').append("<div>" + data + "</div>");
}
define(['jquery', 'leaflet', 'map/leaflet-bing-tiles', 'arches'], function ($, L, leafletBingLayer, arches) {
    var map = L.map('lmap-container', {
        attributionControl:false,
        zoomControl:false,
        zoom: 15,
    }).setView([51.505, -0.09], 13);
    // add map tiles
    L.tileLayer.bing({ bingMapsKey:arches.bingKey}).addTo(map);
})

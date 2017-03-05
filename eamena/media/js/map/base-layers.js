define([
    'jquery',
    'openlayers',
    'underscore',
    'arches'
//     'gmjs',
//     'map/ol3gm'
], function($, ol, _, arches) {
    var baseLayers = arches.bingLayers;

    _.each(baseLayers, function(layer) {
        layer.layer = new ol.layer.Tile({
            visible: false,
            preload: Infinity,
            source: new ol.source.BingMaps({
                key: arches.bingKey,
                imagerySet: layer.id
            })
        });
    });

    //set default map style to Aerial
    baseLayers[1].layer.setVisible(true);
    baseLayers.push({
        id: 'DG',
        name: 'Digital Globe',
        icon: arches.urls.media + 'img/map/DigitalGlobe.jpg',
        layer: new ol.layer.Tile({
            visible: false,
            source: new ol.source.XYZ({
                url: 'http://api.tiles.mapbox.com/v4/digitalglobe.nal0mpda/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZGlnaXRhbGdsb2JlIiwiYSI6ImNpdmFzc3ZsNTAwd20yenBiaWxuZzdjaHQifQ.Zirx4s_vruVlBq-UgIyKEw'
            })
        })
    });
    baseLayers.push({
        id: 'GM',
        name: 'Google Hybrid',
        icon: arches.urls.media + 'img/map/Google.png',
        layer: new ol.layer.Tile({
            visible: false,
            source: new ol.source.XYZ({
                url: 'http://mt0.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}&s=Ga'
            })
        })
    });
    baseLayers.push({
        id: 'DARE',
        name: 'DARE/Pelagios',
        icon: arches.urls.media + 'img/map/Pelagios.png',
        layer: new ol.layer.Tile({
            visible: false,
            source: new ol.source.XYZ({
                url: 'http://pelagios.org/tilesets/imperium/{z}/{x}/{y}.png'
            })
        })
    });
//     baseLayers.push({
//         id: 'UTM38',
//         name: 'Aden maps',
//         icon: arches.urls.media + 'img/map/google_satellite.jpg',
//         layer: new ol.layer.Tile({
//             visible: false,
//             source: new ol.source.TileWMS({
//                 url: 'http://localhost:8080/geoserver/cite/wms',
//                 params: {
//                     'LAYERS': 'cite:utm38-tiled2'
//                 }
//             })
//         })
//     });
//     baseLayers.push({
//         id: 'YemenMaps',
//         name: 'Cartography of Yemen',
//         icon: arches.urls.media + 'img/map/google_satellite.jpg',
//         layer: new ol.layer.Tile({
//             visible: false,
//             source: new ol.source.TileWMS({
//                 url: 'http://localhost/cgi-bin/mapserv?map=/Users/eamena/Maps/Map.map&',
//                 params: {
//                     'LAYERS': 'YARMaps,UTM38,UTM39', 'VERSION':'1.1.1','FORMAT': 'image/png'
//                 },
//                 serverType: 'mapserver',
//                 gutter: 30
//             })
//         })
//     }); 
        
    return baseLayers;
});
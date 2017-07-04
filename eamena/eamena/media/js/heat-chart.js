require([
    'jquery',
    'underscore',
    'CalHeatMap',
], function($, _, CalHeatMap) {
            var cal = new CalHeatMap();
            cal.init({ itemSelector: "#heat-chart"});

    // var HeatView = Backbone.View.extend({
    // 
    //     initialize: function(options) {
    //     var cal = new CalHeatMap();
    //     cal.init({ itemSelector: "#heat-chart"});
    //         console.log("init");
    //     },
    // });
    // new HeatView();
});

require([
    'jquery',
    'underscore',
    'Highcharts',
], function($, _, Highcharts) {

    var chartOptions = {
        chart: {
            zoomType: 'x'
        },
        title: { text: ''},
        subtitle: {
            text: document.ontouchstart === undefined ?
                    'Click and drag in the plot area to zoom in' : 'Pinch the chart to zoom in'
        },
        xAxis: {
            type: 'datetime'
        },
        yAxis: {
            title: {
                text: 'Actions'
            },
            min: 0,
        },
        legend: {
            enabled: false
        },
        plotOptions: {
            area: {
                marker: {
                    radius: 2
                },
                lineWidth: 1,
                states: {
                    hover: {
                        lineWidth: 1
                    }
                },
                threshold: null
            }
        },
        series: [{
            type: 'area',
            name: 'UserActions',
            fillOpacity: 0
        }]
    };

    var seconds = new Date().getTime() / 1000;
    var data = {};

    var data = {};
    var startDate = "";
    Object.keys(activitySummary).forEach(function (dateData) {
        var sumEntries = 0;
        Object.keys(activitySummary[dateData]).forEach(function (resourceData) {
            Object.keys(activitySummary[dateData][resourceData]).forEach(function (actionData) {
                sumEntries += activitySummary[dateData][resourceData][actionData];
            });
        });
        var d = new Date(dateData);
        data[d.getTime()] = sumEntries;
        if (!startDate || startDate > d.getTime()) {
            startDate = d.getTime();
        }
    });
    var today = new Date();
    today = today.getTime();
    var chartData = [];
    var i = 0;
    for (var iDate = startDate; iDate <= today; iDate += 3600000 * 24) {
         var chartValue = data[iDate] ? [iDate, data[iDate]] : [iDate, 0];
         chartData.push(chartValue);
    }
    chartOptions.series[0].data = chartData;
    Highcharts.chart('user-chart', chartOptions);
});

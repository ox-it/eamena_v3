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
            },
            series:{
                allowPointSelect: true,
                point: {
                    events:{
                        select: function(e) {
                            if ($("#date-" + new Date(e.target.x).toISOString().slice(0, 10)).length) {
                                window.location.hash="date-" + new Date(e.target.x).toISOString().slice(0, 10);
                            }
                        }
                    }
                }
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
    // search in every date then in every resource then in every action type
    // and add the actions for this date
    Object.keys(activitySummary).forEach(function (dateData) {
        var sumEntries = 0;
        Object.keys(activitySummary[dateData]).forEach(function (resourceData) {
            Object.keys(activitySummary[dateData][resourceData]).forEach(function (actionData) {
                sumEntries += activitySummary[dateData][resourceData][actionData];
            });
        });
        var d = new Date(dateData);
        data[d.getTime()] = sumEntries;
        // find the starting date for the chart
        if (!startDate || startDate > d.getTime()) {
            startDate = d.getTime();
        }
    });
    var today = new Date();
    today = today.getTime();
    var chartData = [];
    var i = 0;
    // create the data array in the format needed by Highcharts
    for (var iDate = startDate; iDate <= today; iDate += 3600000 * 24) {
         var chartValue = data[iDate] ? [iDate, data[iDate]] : [iDate, 0];
         chartData.push(chartValue);
    }
    chartOptions.series[0].data = chartData;
    Highcharts.chart('user-chart', chartOptions);
});

require([
    'jquery',
    'underscore',
    'Highcharts'
], function($, _, Highcharts) {
    // var seconds = new Date().getTime() / 1000;
    var allUsersData = {};
    var startDate;
    var chartOptions = {
        chart: {
            zoomType: 'x'
        },
        title: {
            text: 'User activity'
        },
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

    Object.keys(activitySummary).forEach(function (userData) {
        Object.keys(activitySummary[userData].data).forEach(function (dateData) {
            var userStartDate = new Date(activitySummary[userData].startDate);
            userStartDate = userStartDate.getTime();
            if (!startDate || startDate > userStartDate) {
                startDate = userStartDate;
            }
        });
    });
    
    Object.keys(activitySummary).forEach(function (userData) {
        var data = {};
        Object.keys(activitySummary[userData].data).forEach(function (dateData) {
            var sumEntries = 0;
            Object.keys(activitySummary[userData].data[dateData]).forEach(function (resourceData) {
                sumEntries += activitySummary[userData].data[dateData][resourceData].update;
            });
            var d = new Date(dateData);
            data[d.getTime()] = sumEntries;
            if (!allUsersData[d.getTime()]) {
                allUsersData[d.getTime()] = 0;
            }
            allUsersData[d.getTime()] += sumEntries;
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
        Highcharts.chart('user-chart-' + userData, chartOptions);
    });

    var today = new Date();
    today = today.getTime();
    var chartData = [];
    var i = 0;
    for (var iDate = startDate; iDate <= today; iDate += 3600000 * 24) {
         var chartValue = allUsersData[iDate] ? [iDate, allUsersData[iDate]] : [iDate, 0];
         chartData.push(chartValue);
    }
    chartOptions.series[0].data = chartData;
    Highcharts.chart('group-chart', chartOptions);
});

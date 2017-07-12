require([
    'jquery',
    'underscore',
    'Highcharts'
], function($, _, Highcharts) {
    // var seconds = new Date().getTime() / 1000;
    var data = {};
    console.log("activitySummary", activitySummary);

    Object.keys(activitySummary).forEach(function (date) {
        var dateInSeconds = new Date(date).getTime() / 1000;
        data[dateInSeconds] = activitySummary[date].insert
        data[dateInSeconds] += activitySummary[date].update;
        data[dateInSeconds] += activitySummary[date].create;
        data[dateInSeconds] += activitySummary[date].delete;
    });
    

    // Highcharts.chart('group-chart', {
    // 
    //     title: {
    //         text: 'Solar Employment Growth by Sector, 2010-2016'
    //     },
    // 
    //     subtitle: {
    //         text: 'Source: thesolarfoundation.com'
    //     },
    // 
    //     yAxis: {
    //         title: {
    //             text: 'Number of Employees'
    //         }
    //     },
    //     legend: {
    //         layout: 'vertical',
    //         align: 'right',
    //         verticalAlign: 'middle'
    //     },
    // 
    //     plotOptions: {
    //         series: {
    //             pointStart: 2010
    //         }
    //     },
    // 
    //     series: [{
    //         name: 'Installation',
    //         data: [43934, 52503, 57177, 69658, 97031, 119931, 137133, 154175]
    //     }, {
    //         name: 'Manufacturing',
    //         data: [24916, 24064, 29742, 29851, 32490, 30282, 38121, 40434]
    //     }, {
    //         name: 'Sales & Distribution',
    //         data: [11744, 17722, 16005, 19771, 20185, 24377, 32147, 39387]
    //     }, {
    //         name: 'Project Development',
    //         data: [null, null, 7988, 12169, 15112, 22452, 34400, 34227]
    //     }, {
    //         name: 'Other',
    //         data: [12908, 5948, 8105, 11248, 8989, 11816, 18274, 18111]
    //     }]
    // 
    // });

    
    
    Highcharts.chart('group-chart', {
        chart: {
            zoomType: 'x'
        },
        title: {
            text: 'USD to EUR exchange rate over time'
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
                text: 'Exchange rate'
            }
        },
        legend: {
            enabled: false
        },
        plotOptions: {
            area: {
                fillColor: {
                    linearGradient: {
                        x1: 0,
                        y1: 0,
                        x2: 0,
                        y2: 1
                    },
                    stops: [
                        [0, Highcharts.getOptions().colors[0]],
                        [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
                    ]
                },
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
            name: 'USD to EUR',
            data: data
        }]
    });
    
    // if (Object.keys(activitySummary).length) {
    //     var cal = new CalHeatMap();
    //     cal.init({
    //         itemSelector: "#heat-chart",
    //         data: data,
    //         domain: "month",
    //         domainGutter: 10,
    //         domainDynamicDimension: false,
    //         subDomain: "x_day",
    //         subDomainTextFormat: "%d",
    //         range: 12, // last 12 months
    //         start: new Date().setMonth(new Date().getMonth() - 11),
    //         legend: [10, 20, 50, 100]
    //     });
    // }
});

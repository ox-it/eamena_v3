require([
    'jquery',
    'underscore',
], function($, _) {
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

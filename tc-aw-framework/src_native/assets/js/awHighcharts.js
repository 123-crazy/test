// Copyright (c) 2020 Siemens
/**
 * Define the common styles shared for button and chip
 * @module "js/awHighcharts"
 */
import highcharts from 'highcharts';
import boost from 'lib/highcharts/modules/boost';
import noDataToDisplay from 'no-data-to-display';
import accessibility from 'lib/highcharts/modules/accessibility';

export const getHighchartsInstance = () => {
    boost( highcharts );
    noDataToDisplay( highcharts );
    drawEmptyPieChartWorkAround( highcharts );
    accessibility( highcharts );
    return highcharts;
};

// Workaround for https://github.com/highcharts/highcharts/issues/13710
// remove it when we upgrade the highchart version from 8.1.1
const drawEmptyPieChartWorkAround = function( H ) {
    H.seriesTypes.pie.prototype.drawEmpty = function() {
        // blank as in earlier version, we don't show empty circle with empty data
    };
};

export default { getHighchartsInstance };

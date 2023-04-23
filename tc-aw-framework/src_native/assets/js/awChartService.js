// Copyright (c) 2020 Siemens

/**
 * This module provides chart building support
 *
 * @module js/awChartService
 */

import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import cssUtils from 'js/cssUtils.service';
import 'no-data-to-display';
import 'js/viewModelService';
import 'js/declDataProviderService';
import 'js/sanitizer';
import chartUtils from 'js/chartUtils';

let exports = {};
const LINE_CHART = 'line';
const COLUMN_CHART = 'column';
const PIE_CHART = 'pie';
const SCATTER_CHART = 'scatter';
const SPLINE_CHART = 'spline';

/**
 * Returns colors defined by overridden class else default colors.
 *
 * @method getChartColors
 * @memberOf NgControllers.awChartService
 *
 * @param chartColorOverrideClass {String} - css class of color
 *
 * @returns {Array[]} array of string having color information
 */
let getChartColors = function( chartColorOverrideClass ) {
    let chartColorClass = 'aw-charts-chartColor';
    //get a list of default colors from the default color class
    let defaultColors = cssUtils.getColumnChartColors( chartColorClass );
    //get these defaultColors in colors variable as if no chartColorOverrideClass is defined in vm, default colors will be passed in line 428
    let colors = defaultColors;
    //chartColorOverrideClass defined in view model
    if( chartColorOverrideClass ) {
        colors = cssUtils.getColumnChartColors( chartColorOverrideClass );
        let i;
        //run a loop on colors array which has size of 9
        for( i = 0; i < colors.length; i++ ) {
            // if css color not defined, IE browser returns color as transparent.
            if( colors[ i ] === 'rgba(0, 0, 0, 0)' || colors[ i ] === 'transparent' ) {
                colors[ i ] = defaultColors[ i ];
            }
        }
    }
    return colors;
};

/**
 * Returns configuration entry name for series if found
 *
 * @method getConfigurationOfSeries
 * @memberOf NgControllers.awChartService
 *
 * @param chartProvider {Object} - Chart provider
 * @param series {Array[]} - data points for each series
 */
let getConfigurationOfSeries = function( chartProvider, series ) {
    if( series.chartPointsConfig && chartProvider.chartPointsConfig ) {
        for( let configKey in chartProvider.chartPointsConfig[ 0 ] ) {
            if( configKey === series.chartPointsConfig ) {
                return chartProvider.chartPointsConfig[ 0 ][ configKey ];
            }
        }
    }
};

/**
 * Update the colors of the chart ; applicable only for column chart with single series
 * for multiple series charts for both column and line charts, highcharts color library has been leveraged
 *
 * @method getSeriesData
 * @memberOf NgControllers.awChartService
 *
 * @param chartPoint {Array[]} - series data
 * @param chartType {String} - Highchart instance
 */
let getSeriesData = function( chartPoint, chartType ) {
    // for PIE chart we need name : value for the legends to display
    if( chartType === PIE_CHART ) {
        return chartPoint.keyValueDataForChart.map( function( yAxis ) {
            return { y: yAxis.value, name: yAxis.name };
        } );
    } else if( chartType === SCATTER_CHART || chartType === SPLINE_CHART ) {
        return chartPoint.keyValueDataForChart;
    }
    return chartPoint.keyValueDataForChart.map( function( yAxisValues ) {
        return yAxisValues.value;
    } );
};

/**
 * Returns clicked chart entity details
 *
 * @method getClickedChartEventData
 * @memberOf NgControllers.awChartService
 *
 * @param event {String} - The click event on the chart
 *
 * @returns {Object} Object having x, y values and series name
 */
let getClickedChartEventData = function( event ) {
    return {
        label: event.target.category || event.target.name,
        xValue: event.target.x,
        value: event.target.y,
        seriesName: event.target.series.name
    };
};

/**
 * It sets user defined chart configuration to highchart config object
 *
 * @method setUserDefinedChartConfiguration
 * @memberOf NgControllers.awChartService
 *
 * @param viewModelChartConfig {Object} - user defined chart configuration
 * @param chartConfig {Object} - highchart config object
 *
 */
let setUserDefinedChartConfiguration = function( viewModelChartConfig, chartConfig ) {
    if( viewModelChartConfig !== undefined ) {
        if( viewModelChartConfig.showAxes ) {
            chartConfig.chart.showAxes = viewModelChartConfig.showAxes;
        }
        if( viewModelChartConfig.tooltip ) {
            chartConfig.tooltip = viewModelChartConfig.tooltip;
        }
        if( viewModelChartConfig.xAxis ) {
            chartConfig.xAxis = Object.assign( chartConfig.xAxis, viewModelChartConfig.xAxis );
        }
        if( viewModelChartConfig.yAxis ) {
            if( Array.isArray( viewModelChartConfig.yAxis ) ) {
                chartConfig.yAxis = viewModelChartConfig.yAxis;
            } else {
                chartConfig.yAxis = Object.assign( chartConfig.yAxis, viewModelChartConfig.yAxis );
            }
        }
        if( viewModelChartConfig.plotOptions ) {
            chartConfig.plotOptions = Object.assign( chartConfig.plotOptions, viewModelChartConfig.plotOptions );
        }
        if( viewModelChartConfig.legend ) {
            chartConfig.legend = Object.assign( chartConfig.legend, viewModelChartConfig.legend );
        }
        if( viewModelChartConfig.dataLabels ) {
            chartConfig.plotOptions.series.dataLabels = Object.assign( chartConfig.plotOptions.series.dataLabels, viewModelChartConfig.dataLabels );
        }
    }
};

/**
 * It sets Axis of chart based on chart type
 *
 * @method setAxisBasedOnChartType
 * @memberOf NgControllers.awChartService
 *
 * @param xAxisLabel {String} - label for x axis
 * @param yAxisLabel {String} - label for y axis
 * @param chartConfig {Object} - highchart config object
 * @param chartType  {String} - type of chart
 * @param isYAxisLinearOrLogarithmic {String} - plotting type
 * @param colors {String[]} - Column colors
 * @param chartTitleColor {String} - Chart title color
 * @param escapeMarkup {Function} - Highchart Function
 * @param categories {String[]} - Categories
 * @param isDataLabelOnChartEnabled {Boolean} - show or hide data label
 *
 */
let setAxisBasedOnChartType = function( xAxisLabel, yAxisLabel, chartConfig, chartType, isYAxisLinearOrLogarithmic, colors, chartTitleColor, escapeMarkup, categories, isDataLabelOnChartEnabled ) {
    if( chartType === COLUMN_CHART ) {
        chartConfig.chart.colors = colors;
        chartConfig.xAxis = {
            gridLineWidth: 0,
            tickWidth: 0,
            lineColor: 'transparent',
            title: {
                text: xAxisLabel
            },
            labels: {
                enabled: true
            },
            categories: categories.map( escapeMarkup )
        };
        chartConfig.yAxis = {
            gridLineWidth: 0,
            gridLineColor: 'transparent',
            startOnTick: false,
            type: isYAxisLinearOrLogarithmic,
            title: {
                text: yAxisLabel
            },
            labels: {
                enabled: false
            },
            stackLabels: {
                enabled: isDataLabelOnChartEnabled,
                style: {
                    textShadow: false
                }
            }
        };
    } else if( chartType === LINE_CHART ) {
        chartConfig.xAxis = {
            gridLineWidth: '',
            tickWidth: '',
            lineColor: '',
            title: {
                text: xAxisLabel,
                style: {
                    color: chartTitleColor
                }
            },
            labels: {
                enabled: true
            },
            categories: categories.map( escapeMarkup )
        };
        chartConfig.yAxis = {
            startOnTick: false,
            type: isYAxisLinearOrLogarithmic,
            title: {
                text: yAxisLabel,
                style: {
                    color: chartTitleColor
                }
            },
            labels: {
                enabled: true
            }
        };
    } else if( chartType === PIE_CHART ) {
        chartConfig.xAxis = {};
        chartConfig.yAxis = {};
    } else if( chartType === SCATTER_CHART || chartType === SPLINE_CHART ) {
        chartConfig.xAxis = {
            title: {
                text: xAxisLabel,
                style: {
                    color: chartTitleColor
                }
            }
        };
        chartConfig.yAxis = {
            type: isYAxisLinearOrLogarithmic,
            title: {
                text: yAxisLabel,
                style: {
                    color: chartTitleColor
                }
            }
        };
    } else {
        logger.error( 'Chart type not supported. Chart will not be rendered' );
    }
};

/**
 * It sets series data for each series and also set user defined configuartion on series
 *
 * @method setSeriesDataAndConfiguration
 * @memberOf NgControllers.awChartService
 *
 * @param chartProvider {Object} - Chart provider
 *
 * @return {Array[]} series data with configuartion points
 *
 */
let setSeriesDataAndConfiguration = function( chartProvider ) {
    let temp = [];
    let values = [];
    for( let x in chartProvider.chartPoints ) {
        if( !chartProvider.chartPoints[ x ].keyValueDataForChart ) {
            continue;
        }
        let series = {
            name: chartProvider.chartPoints[ x ].seriesName
        };
        let chartPointConfig = getConfigurationOfSeries( chartProvider, chartProvider.chartPoints[ x ] );
        if( chartPointConfig ) {
            series.type = chartPointConfig.seriesType !== undefined ? chartPointConfig.seriesType : chartProvider.chartType;
            series.showInLegend = chartPointConfig.showInLegend !== undefined ? chartPointConfig.showInLegend : true;
            series.dataLabels = { enabled: chartPointConfig.isDataLabelOnChartEnabled !== undefined ? chartPointConfig.isDataLabelOnChartEnabled : true };
            if( chartPointConfig.seriesColorClass ) {
                let colorsForSeriesDataPoints = getChartColors( chartPointConfig.seriesColorClass );
                series.color = colorsForSeriesDataPoints[ 0 ];
                if( series.type === PIE_CHART || series.type === COLUMN_CHART ) {
                    let colorCounter = 0;
                    temp[ x ] = chartProvider.chartPoints[ x ].keyValueDataForChart.map( function( yAxis ) {
                        if( colorCounter === 9 ) {
                            colorCounter = 0;
                        }
                        let colorForData = colorsForSeriesDataPoints[ colorCounter ];
                        colorCounter++;
                        return { y: yAxis.value, name: yAxis.name, color: colorForData };
                    } );
                } else if( series.type === SCATTER_CHART || series.type === SPLINE_CHART ) {
                    temp[ x ] = chartProvider.chartPoints[ x ].keyValueDataForChart;
                } else {
                    temp[ x ] = chartProvider.chartPoints[ x ].keyValueDataForChart.map( function( yAxisValues ) {
                        return yAxisValues.value;
                    } );
                }
            } else {
                temp[ x ] = getSeriesData( chartProvider.chartPoints[ x ], series.type );
            }
            if( chartPointConfig.seriesMarker ) {
                series.marker = chartPointConfig.seriesMarker;
                if( chartPointConfig.seriesMarker.seriesLineColor ) {
                    series.marker.lineColor = cssUtils.getPropertyFromCssClass( chartPointConfig.seriesMarker.seriesLineColor,
                        'background-color' );
                }
            }
            if( chartPointConfig.seriesTooltip ) {
                series.tooltip = chartPointConfig.seriesTooltip;
            }
            if( chartPointConfig.yAxis ) {
                series.yAxis = chartPointConfig.yAxis;
            }
            if( chartPointConfig.dataLabels ) {
                series.dataLabels = Object.assign( series.dataLabels, chartPointConfig.dataLabels );
            }
        } else {
            temp[ x ] = getSeriesData( chartProvider.chartPoints[ x ], chartProvider.chartType );
        }
        series.data = temp[ x ];
        values.push( series );
    }
    return values;
};

/**
 * Get the Highcharts chart configuration object. See http://api.highcharts.com/highcharts for more
 * information.
 *
 * @method getChartConfig
 * @memberOf NgControllers.awChartService
 *
 * @param chartProvider {Object} - Chart provider
 * @param chartTitleColor {String} - Chart title color
 * @param categories {String[]} - Categories
 * @param colors {String[]} - Column colors
 * @param colorByPoint {Boolean} - Boolean colorByPoint
 * @param values {Number[]} - Column values
 * @param escapeMarkup {Function} - Highchart Function
 *
 * @return {Object} Highcharts configuration object
 */
export let getChartConfig = function( chartProvider, chartTitleColor, categories, colors, colorByPoint, values, escapeMarkup ) {
    let chartConfig;
    let chartType = chartProvider.chartType;
    let viewModelChartConfig = chartProvider.chartConfig;
    let spacingLeft = 20;
    // If the chart config in viewmodel has been specified
    let isDataLabelOnChartEnabled;
    let zoomType;
    let isYAxisLinearOrLogarithmic;
    let xAxisLabel;
    let yAxisLabel;
    if( viewModelChartConfig !== undefined ) {
        zoomType = viewModelChartConfig.isChartZoomable === true ? 'xy' : undefined;
        isYAxisLinearOrLogarithmic = viewModelChartConfig.isYAxisLinearOrLogarithmic === 'logarithmic' ? 'logarithmic' : 'linear';
        isDataLabelOnChartEnabled = viewModelChartConfig.isDataLabelOnChartEnabled === undefined ? true : viewModelChartConfig.isDataLabelOnChartEnabled;
        xAxisLabel = viewModelChartConfig.xAxisLabel !== undefined ? viewModelChartConfig.xAxisLabel : '';
        yAxisLabel = viewModelChartConfig.yAxisLabel !== undefined ? viewModelChartConfig.yAxisLabel : '';
        spacingLeft = viewModelChartConfig.spacingLeft !== undefined ? viewModelChartConfig.spacingLeft : spacingLeft;
    } else {
        // If the chart config in viewmodel has NOT been specified, set 'isDataLabelOnChartEnabled' to true
        // zoomType = default, isYAxisLinearOrLogarithmic = default, xAxisLabel="", yAxisLabel = "" as default chart configuration
        // more default options can be set in this else block as chart rendering options/schema expands
        isDataLabelOnChartEnabled = true;
    }

    chartConfig = {
        chart: {
            type: chartType,
            spacingLeft: spacingLeft,
            zoomType: zoomType,
            backgroundColor: null
        },
        credits: {
            enabled: false
        },
        title: {
            text: chartProvider.title,
            style: {
                color: chartTitleColor
            }
        },
        legend: {},
        accessibility: {
            description: chartProvider.title,
            keyboardNavigation: {
                enabled: true,
                focusBorder: {
                    enabled: true,
                    hideBrowserFocusOutline: true,
                    margin: 2,
                    style: {
                        borderRadius: 0,
                        color: cssUtils.getPropertyFromCssClass( 'aw-border-focus-chartColor',
                            'color' ),
                        lineWidth: 2
                    }
                }
            },
            screenReaderSection: {
                beforeChartFormat: '<div>{chartTitle}</div>'
            }
        },
        plotOptions: {
            series: {
                dataLabels: {},
                point: {
                    events: {
                        select: function( event ) {
                            let selectedChartEntity = getClickedChartEventData( event );
                            eventBus.publish( chartProvider.name + '.selected', selectedChartEntity );
                        },
                        unselect: function( event ) {
                            let selectedChartEntity = getClickedChartEventData( event );
                            eventBus.publish( chartProvider.name + '.unselected', selectedChartEntity );
                        }
                    }
                }
            }
        },
        series: values,
        lang: {
            noData: chartProvider.noDataMessage
        }
    };

    chartConfig.plotOptions.column = {
        colors: colors,
        colorByPoint: colorByPoint,
        allowPointSelect: true,
        cursor: 'pointer',
        pointPadding: 0.2,
        borderWidth: 0,
        stacking: 'normal'
    };
    chartConfig.plotOptions.line = {
        allowPointSelect: true,
        connectNulls: true,
        dataLabels: {
            enabled: isDataLabelOnChartEnabled,
            color: chartTitleColor
        },
        cursor: 'pointer'
    };
    chartConfig.plotOptions.pie = {
        colors: colors,
        colorByPoint: colorByPoint,
        dataLabels: {
            enabled: isDataLabelOnChartEnabled,
            format: '{point.y}'
        },
        showInLegend: true,
        allowPointSelect: true,
        cursor: 'pointer'
    };
    chartConfig.plotOptions.scatter = {
        dataLabels: {
            enabled: isDataLabelOnChartEnabled,
            color: chartTitleColor
        },
        colors: colors,
        allowPointSelect: true,
        cursor: 'pointer'
    };
    chartConfig.plotOptions.spline = {
        dataLabels: {
            enabled: isDataLabelOnChartEnabled,
            color: chartTitleColor
        },
        colors: colors,
        allowPointSelect: true,
        connectNulls: true,
        cursor: 'pointer'
    };
    setAxisBasedOnChartType( xAxisLabel, yAxisLabel, chartConfig, chartType, isYAxisLinearOrLogarithmic, colors, chartTitleColor, escapeMarkup, categories, isDataLabelOnChartEnabled );
    setUserDefinedChartConfiguration( viewModelChartConfig, chartConfig );

    return chartConfig;
};

/**
 * It refreshes chart with new data.
 *
 * @method refreshChart
 * @memberOf NgControllers.awChartService
 *
 * @param {Object} highcharts - Highcharts instance
 * @param {Object} chartProvider - Chart provider
 * @param {String} chartID - Id of chart
 * @param {Function} escapeMarkup - Highchart Function
 *
 * @return {Object} Highcharts object
 */
export let refreshChart = function( highcharts, chartProvider, chartID, escapeMarkup ) {
    let config = null;
    if( chartProvider && chartProvider.chartPoints && chartProvider.chartType ) {
        // ==========Determine all of the dynamic options================

        // Fetch categories(i.e x-axis values) from all series that have all the possible x axis values
        let categories = [];
        let tempValues = [];
        let present = false;
        let seriesType = chartProvider.chartType;
        let chartPointConfig = null;

        chartProvider.chartPoints.forEach( function( cat ) {
            if( cat.keyValueDataForChart ) {
                chartPointConfig = getConfigurationOfSeries( chartProvider, cat );
                if( chartPointConfig && chartPointConfig.seriesType ) {
                    seriesType = chartPointConfig.seriesType;
                }
                if( seriesType === COLUMN_CHART || seriesType === LINE_CHART ) {
                    categories = _.union( categories, cat.keyValueDataForChart.map( function( xAxisValues ) {
                        return xAxisValues.label;
                    } ) );
                }
            }
        } );

        // setting data to respective categories
        chartProvider.chartPoints.forEach( function( cat ) {
            if( cat.keyValueDataForChart ) {
                tempValues = [];
                seriesType = chartProvider.chartType;
                chartPointConfig = getConfigurationOfSeries( chartProvider, cat );
                if( chartPointConfig && chartPointConfig.seriesType ) {
                    seriesType = chartPointConfig.seriesType;
                }
                if( seriesType === COLUMN_CHART || seriesType === LINE_CHART ) {
                    categories.forEach( function( category ) {
                        present = false;
                        for( let i = 0; i < cat.keyValueDataForChart.length; i++ ) {
                            if( category === cat.keyValueDataForChart[ i ].label ) {
                                tempValues.push( cat.keyValueDataForChart[ i ] );
                                present = true;
                                break;
                            }
                        }
                        if( !present ) {
                            tempValues.push( {
                                label: category,
                                value: null
                            } );
                        }
                    } );
                    cat.keyValueDataForChart = tempValues;
                }
            }
        } );

        // prepare values for 'series' parameter for chartConfig
        let values = setSeriesDataAndConfiguration( chartProvider );
        let colors = getChartColors( chartProvider.chartColorOverrideClass );
        let colorByPoint = false;
        let chartTitleColor = cssUtils.getPropertyFromCssClass( 'aw-charts-chartTitleColor',
            'background-color' );
        // to ensure when there is only 1 series , column charts with multiple colors are rendered as currently supported by aw-column-chart
        // same behaviour is needed for PIE chart with single series.
        if( chartProvider.chartPoints.length === 1 && ( chartProvider.chartType === COLUMN_CHART || chartProvider.chartType === PIE_CHART ) ) {
            colorByPoint = true;
            config = getChartConfig( chartProvider, chartTitleColor, categories, colors, colorByPoint, values, escapeMarkup );
        } else {
            // when chart (column or line) has >= 1 series , chart is rendered with the new config and colors as decided by highcharts theme
            config = getChartConfig( chartProvider, chartTitleColor, categories, null, colorByPoint, values, escapeMarkup );
        }
        if( config !== undefined ) {
            config.chart.renderTo = chartID;
            let Chart = highcharts.Chart;
            if( chartProvider.chartColorOverrideClass ) {
                highcharts.setOptions( {
                    colors: colors
                } );
            }

            return new Chart( chartUtils.filterChartOptions( config ) );
        }
    }
};

/**
 * Update the colors of the chart ; applicable only for column chart with single series
 * for multiple series charts for both column and line charts, highcharts color library has been leveraged
 *
 * @method refreshColors
 * @memberOf NgControllers.awChartService
 *
 * @param {Object} chartProvider - Chart provider
 * @param {String} chart - Highchart instance
 */
export let refreshColors = function( chartProvider, chart ) {
    if( chart ) {
        let chartTitleColor = cssUtils.getPropertyFromCssClass( 'aw-charts-chartTitleColor',
            'background-color' );
        // Update the colors and redraw the chart
        chart.setTitle( {
            text: chartProvider.title,
            style: {
                color: chartTitleColor
            }
        }, null, false );
        chart.series[ 0 ].update( {
            colors: cssUtils.getColumnChartColors()
        } );
        chart.yAxis[ 0 ].update( {
            title: {
                text: chartProvider.title,
                style: {
                    color: chartTitleColor
                }
            }
        } );
        chart.xAxis[ 0 ].update( {
            title: {
                text: chartProvider.title,
                style: {
                    color: chartTitleColor
                }
            }
        } );
    }
};

exports = {
    getChartConfig,
    refreshChart,
    refreshColors
};
export default exports;

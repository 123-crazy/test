// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Cm1ChangeDashboardService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import soaSvc from 'soa/kernel/soaService';
import awColumnSvc from 'js/awColumnService';
import searchFilterSvc from 'js/aw.searchFilter.service';
import localeSvc from 'js/localeService';
import _ from 'lodash';

import eventBus from 'js/eventBus';

var exports = {};

var _localeTextBundle = null;

export let createPieChart = function( data, pieChartCategory ) {
    var deferred = AwPromiseService.instance.defer();
    var soaInput = {
        searchInput: {
            maxToLoad: 50,
            maxToReturn: 50,
            providerName: 'Cm1MyChangesProvider',
            searchCriteria: {
                changesProviderContentType: 'Dashboard'
            },
            searchFilterFieldSortType: 'Priority',
            searchFilterMap: {},
            startIndex: 0
        }
    };

    var keyValueDataForChart = [];
    var chartPoints = [];

    soaSvc.postUnchecked( 'Query-2014-11-Finder', 'performSearch', soaInput ).then(
        function( response ) {
            if( response.searchFilterCategories && response.searchFilterCategories.length > 0 ) {
                appCtxSvc.ctx.searchFilterCategories = response.searchFilterCategories;
                var chartProperty = data[ pieChartCategory ].defaultChartCategory;
                var chartFilterProperty;
                for( var category = 0; category < response.searchFilterCategories.length; category++ ) {
                    if( response.searchFilterCategories[ category ].internalName === chartProperty ) {
                        chartFilterProperty = response.searchFilterCategories[ category ];
                        break;
                    }
                }
                if( chartFilterProperty.internalName === 'ChangeItemRevision.creation_date' ) {
                    chartFilterProperty.internalName += '_0Z0_year';
                    chartFilterProperty.displayName = 'Year';
                }
                var valuesForSeries = response.searchFilterMap[ chartFilterProperty.internalName ];
                //If there is only one year, then the filters for month will be populated at first place itself.
                if( valuesForSeries === undefined ) {
                    if( chartFilterProperty.internalName === 'ChangeItemRevision.creation_date_0Z0_year' ) {
                        chartFilterProperty.internalName += "_month";
                        valuesForSeries = response.searchFilterMap[ chartFilterProperty.internalName ];
                        chartFilterProperty.displayName = _localeTextBundle.month;
                    }
                    //If there is only one year and month,then filters for day will be populated.
                    if( valuesForSeries === undefined ) {
                        if( chartFilterProperty.internalName === 'ChangeItemRevision.creation_date_0Z0_year_month' ) {
                            chartFilterProperty.internalName = "ChangeItemRevision.creation_date_0Z0_week";
                            valuesForSeries = response.searchFilterMap[ chartFilterProperty.internalName ];
                            chartFilterProperty.displayName = "Week";
                        }
                    }

                    if( valuesForSeries === undefined ) {
                        if( chartFilterProperty.internalName === 'ChangeItemRevision.creation_date_0Z0_week' ) {
                            chartFilterProperty.internalName = "ChangeItemRevision.creation_date_0Z0_year_month_day";
                            valuesForSeries = response.searchFilterMap[ chartFilterProperty.internalName ];
                            chartFilterProperty.displayName = _localeTextBundle.day;
                        }
                    }
                }
                var length = response.searchFilterMap[ chartFilterProperty.internalName ].length;
                for( var i = 0; i < length; i++ ) {
                    var value = valuesForSeries[ i ].stringDisplayValue;
                    var index = value.indexOf( 'Revision' );
                    if( index >= 0 ) {
                        valuesForSeries[ i ].stringDisplayValue = valuesForSeries[ i ].stringDisplayValue.substr( 0, index - 1 );
                    }
                    keyValueDataForChart.push( {
                        label: valuesForSeries[ i ].stringDisplayValue,
                        internalLabel : valuesForSeries[ i ].stringValue,
                        value: valuesForSeries[ i ].count,
                        name: valuesForSeries[ i ].stringDisplayValue,
                        y: valuesForSeries[ i ].stringDisplayValue
                    } );
                }
                chartPoints.push( {
                    name: chartFilterProperty.displayName,
                    keyValueDataForChart: keyValueDataForChart,
                    seriesName: chartFilterProperty.displayName
                } );

                var filterDisplayName = "<b>" + chartFilterProperty.displayName + "</b>";
                data.chartProviders[ pieChartCategory ].title = filterDisplayName;
                data[ pieChartCategory ].chartBy = chartFilterProperty.internalName;
                deferred.resolve( chartPoints );
            }
        } );
    return deferred.promise;
};

/**
 * Load the column configuration
 *
 * @param {Object} dataprovider - the data provider
 */
export let loadColumns = function( uwDataProvider ) {
    var deferred = AwPromiseService.instance.defer();

    var awColumnInfos = [];

    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'object_string',
        displayName: '...',
        typeName: 'Awb0Element',
        width: 220,
        isTableCommand: true,
        enableColumnMoving: false
    } ) );
    uwDataProvider.columnConfig = {
        columns: awColumnInfos
    };

    deferred.resolve( {
        columnInfos: awColumnInfos
    } );

    return deferred.promise;
};

/**
 * Update filters for pie chart to reconstruct
 *
 * @param {Object} data - an event data
 */
export let updateFilters = function( data, currentChart ) {
    var filterValue = '';
    var initializeChart = '';

    if( ( data.activeChart !== undefined ) && ( data.activeChart !== currentChart ) ) {
        _clearFilters();

        initializeChart = data.activeChart + '.create';
    }

    data.activeChart = currentChart;

    if( data.eventData && data.eventData.label ) {
        let dataArray =    data.chartProviders[data.activeChart].chartPoints[0].keyValueDataForChart;
        for(let i=0;i<dataArray.length;i++){
            if(data.eventData.label === dataArray[i].label ){
              data.eventData.internalLabel = dataArray[i].internalLabel;
              break;
            }
        }
        let index = data.eventData.internalLabel.indexOf( 'Revision' );
        if( index >= 0 ) {
               data.eventData.internalLabel  = data.eventData.internalLabel.substr( 0, index );
        }
        if( ( currentChart === 'pieChartProviderType' || currentChart === 'pieChartProviderMaturity' ) && data[ currentChart ].chartBy === 'ChangeItemRevision.object_type' ) {
            //In case od Deviation Request, the internal name is Cm0DevRqst and from UI we are getting DeviationRequest,
            //so we need to process it to store correct filter value.
            filterValue = data.eventData.internalLabel.replace( /\s/g, '' );
            if( filterValue === 'DeviationRequest' ) {
                filterValue = 'Cm0DevRqst';
            }
            filterValue += 'Revision';
        } else {
            filterValue = data.eventData.internalLabel;
            if(filterValue === 'True')
            {
                filterValue = 'true';
            }
            else if(filterValue === 'False')
            {
                filterValue = 'false';
            }

        }
    }

    var filterCategory = '';
    appCtxSvc.ctx.searchResponseInfo.objectsGroupedByProperty.internalPropertyName = data[ currentChart ].chartBy;
    var addRemoveOnly;
    filterCategory = data[ currentChart ].chartBy;

    if( filterValue !== '' && filterCategory !== '' ) {
        searchFilterSvc.addOrRemoveFilter( String( filterCategory ), filterValue, addRemoveOnly, 'StringFilter' );
    }
    data.chartListboxPropData.provider = currentChart;
    if( initializeChart !== '' ) {
        eventBus.publish( initializeChart );
    }
};

/**
 * Update piechart by picking up next category filter
 *
 * @param {Object} data - an event data
 */
export let updatePieChart = function( data ) {
    if( appCtxSvc.ctx.search.activeFilters.length > 0 ) {
        var currentFilter = data.eventData.value.activeFilters[ data.eventData.value.activeFilters.length - 1 ].name;
        var nextFilter;
        if( data.chartListboxPropData.provider === 'pieChartProviderCreationDate' ) {
            if( currentFilter === 'ChangeItemRevision.creation_date_0Z0_year' ) {
                nextFilter = {
                    internalName: currentFilter + '_month',
                    displayName: _localeTextBundle.month
                };
            } else if( currentFilter === 'ChangeItemRevision.creation_date_0Z0_year_month' ) {
                nextFilter = {
                    internalName: 'ChangeItemRevision.creation_date_0Z0_week',
                    displayName: 'Week'
                };
            } else if( currentFilter === 'ChangeItemRevision.creation_date_0Z0_week' ) {
                nextFilter = {
                    internalName: 'ChangeItemRevision.creation_date_0Z0_year_month_day',
                    displayName: _localeTextBundle.day
                };
            } else if( currentFilter === 'ChangeItemRevision.creation_date_0Z0_year_month_day' ) {
                _clearFilters();
                eventBus.publish( 'pieChartProviderCreationDate.create' );
                return;
            }
        } else {
            var index = -1;
            //Find the index of the current filter so the next filter can be picked up as index+1
            for( var n = 0; n < appCtxSvc.ctx.search.filterCategories.length; n++ ) {
                if( appCtxSvc.ctx.search.filterCategories[ n ].internalName === currentFilter ) {
                    index = n;
                    break;
                }
            }

            //If its the last filter category, then directly create a pie chart which willl consider the first category filter
            if( index === appCtxSvc.ctx.search.filterCategories.length - 1 ) {
                if( data.activeChart === 'pieChartProviderType' ) {
                    _clearFilters();
                    eventBus.publish( 'pieChartProviderType.create' );
                    return;
                } else if( data.activeChart === 'pieChartProviderMaturity' ) {
                    _clearFilters();
                    eventBus.publish( 'pieChartProviderMaturity.create' );
                    return;
                }
            } else {
                nextFilter = appCtxSvc.ctx.search.filterCategories[ index + 1 ];
            }
        }

        //Update the current filter category
        appCtxSvc.ctx.searchResponseInfo.objectsGroupedByProperty.internalPropertyName = nextFilter.internalName;
        var valuesForSeries = appCtxSvc.ctx.search.filterMap[ nextFilter.internalName ];

        if( nextFilter.internalName === 'ChangeItemRevision.creation_date_0Z0_year_month_day' ) {
            valuesForSeries = _getDaysInTheRange();
        }

        var length = valuesForSeries.length;
        var keyValueDataForChart = [];
        var chartPoints = [];
        for( var i = 0; i < length; i++ ) {
            //If the filter type is object_type, then 'Revision' needs to be removed from value
            //(for example:If object type Change Notice Revision,value will be Change Notice)
            var value = valuesForSeries[ i ].stringDisplayValue;
            var index = value.indexOf( 'Revision' );
            if( index >= 0 ) {
                valuesForSeries[ i ].stringDisplayValue = valuesForSeries[ i ].stringDisplayValue.substr( 0, index - 1 );
            }
            keyValueDataForChart.push( {
                label: valuesForSeries[ i ].stringDisplayValue,
                internalLabel : valuesForSeries[ i ].stringValue,
                value: valuesForSeries[ i ].count,
                name: valuesForSeries[ i ].stringDisplayValue,
                y: valuesForSeries[ i ].stringDisplayValue
            } );
        }
        chartPoints.push( {
            name: nextFilter.displayName,
            keyValueDataForChart: keyValueDataForChart,
            seriesName: nextFilter.displayName
        } );

        var filterDisplayName = "<b>" + nextFilter.displayName + "</b>";
        data.chartProviders[ data.activeChart ].title = filterDisplayName.fontsize( 7 );
        data.chartProviders[ data.activeChart ].chartPoints = chartPoints;
        data[ data.activeChart ].chartBy = nextFilter.internalName;
    }
};

/**
 * Viewer content changed
 *
 * @param {EventData} eventData - the event data
 */
export let clearAndInitializePieCharts = function( eventData ) {
    if( eventData.value.activeFilters.length === 0 ) {
        eventBus.publish( 'pieChartProviderType.create' );
        eventBus.publish( 'pieChartProviderCreationDate.create' );
        eventBus.publish( 'pieChartProviderMaturity.create' );
    }
};

export let clearAllFilters = function() {
    _clearFilters();
};

var _clearFilters = function() {
    var addRemoveOnly;
    var filterIndex;
    if( appCtxSvc.ctx.search && appCtxSvc.ctx.search.activeFilters ) {
        var filters = appCtxSvc.ctx.search.activeFilters;
        filterIndex = filters.length - 1;
        while ( filterIndex >= 0 ) {
            var filter = filters[ filterIndex ];
            searchFilterSvc.addOrRemoveFilter( filter.name, filter.values[ 0 ], addRemoveOnly, filter.type );
            filterIndex--;
        }
    }
};

/**
 * Get the days in range
 */
var _getDaysInTheRange = function() {
    var startWeekValue;
    var endWeekValue;
    if( appCtxSvc.ctx.search && appCtxSvc.ctx.search.activeFilters ) {
        var filters = appCtxSvc.ctx.search.activeFilters;
        for( var filterIndex = 0; filterIndex < filters.length; filterIndex++ ) {
            var filter = filters[ filterIndex ];
            if( filter.name === 'ChangeItemRevision.creation_date_0Z0_week' ) {
                startWeekValue = appCtxSvc.ctx.search.filterMap[ "ChangeItemRevision.creation_date_0Z0_week" ][ 0 ].startDateValue;
                endWeekValue = appCtxSvc.ctx.search.filterMap[ "ChangeItemRevision.creation_date_0Z0_week" ][ 0 ].endDateValue;
            }
        }
    }

    var days = appCtxSvc.ctx.search.filterMap[ 'ChangeItemRevision.creation_date_0Z0_year_month_day' ];
    var daysInRange = [];
    for( var day = 0; day < days.length; day++ ) {
        if( days[ day ].startDateValue >= startWeekValue && days[ day ].endDateValue <= endWeekValue ) {
            daysInRange.push( days[ day ] );
        }
    }
    return daysInRange;
};

_localeTextBundle = localeSvc.getLoadedText( app.getBaseUrlPath() + '/i18n/ChangeMessages' );
export default exports = {
    createPieChart,
    loadColumns,
    updateFilters,
    updatePieChart,
    clearAndInitializePieCharts,
    clearAllFilters
};
/**
 * Return an Object of Cm1ChangeDashboardService
 * @memberof NgServices
 * @member Cm1ChangeDashboardService
 */
app.factory( 'Cm1ChangeDashboardService', () => exports );

// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global*/

/**
 *
 * @module js/awChartDataProviderService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import localeService from 'js/localeService';
import searchFilterSvc from 'js/aw.searchFilter.service';
import filterPanelEvents from 'js/filterPanelEvents';
import filterPanelService from 'js/filterPanelService';
import eventBus from 'js/eventBus';
import _ from 'lodash';

var localTextBundle = null;
// Begin Charting code pulled out of AFX as part of
// AW-7471 - 1. Charting -  SWA (Pick property for charting)

var MAX_COLUMN_COUNT = 9;
var columnChartCount = 5;

export let _dateFilterMarker = '_0Z0_';

export let _dateFilterLevels = [ 'year', 'year_month', 'week', 'year_month_day' ];

/**
 * triggerSearchFilterTargetCategoryEvent
 *
 * Called from Filter category listBox selection to determine correct category for selectCategory event
 *
 * @param {*} targetFilterCategory targetFilterCategory
 */
export let triggerSearchFilterTargetCategoryEvent = function( targetFilterCategory ) {
    var searchContext = appCtxService.getCtx( 'search' );
    var searchFilterMap = searchContext.filterMap;
    var searchFilterCategories = searchContext.filterCategories;
    var searchFilterTargetCategory = exports.getTargetSearchFilterCategory( searchFilterCategories,
        searchFilterMap, targetFilterCategory );

    //update the ctx with the charted category
    searchContext.currentChartBy = searchFilterTargetCategory;
    appCtxService.registerCtx( 'search', searchContext );

    if( !searchFilterTargetCategory.filterValues ) {
        var filterArray = searchFilterMap[ targetFilterCategory ];
        searchFilterTargetCategory.filterValues = filterArray;
        searchFilterTargetCategory.type = filterArray[ 0 ].searchFilterType;

        var groupedFilters = exports.groupByCategory( searchFilterMap );
        searchFilterTargetCategory.drilldown = groupedFilters[ targetFilterCategory ][ 0 ].drilldown;
    }

    var searchResponseInfo = appCtxService.getCtx( 'searchResponseInfo' );
    if( targetFilterCategory !== searchResponseInfo.objectsGroupedByProperty.internalPropertyName ) {
        var searchChart = appCtxService.getCtx( 'searchChart' );
        if( searchChart ) {
            searchChart.userOverrideOfCurrentHighlightedCategory = targetFilterCategory;
            appCtxService.updateCtx( 'searchChart', searchChart );
        }
        filterPanelEvents.selectCategory( searchFilterTargetCategory );
    }
};

/**
 * Calculates the hideChart parameter.
 * @function getHideChart
 * @returns {BOOLEAN} true if to hide chart
 */
export let getHideChart = function() {
    let hideChartCondition1 = appCtxService.ctx.locationContext['ActiveWorkspace:Location'] === 'com.siemens.splm.client.search.SearchLocation';
    let hideChartCondition2 = appCtxService.getCtx( 'preferences.AWC_select_firstobject_inSearchLocation.0' ) === 'TRUE';
    let hideChart = hideChartCondition1 && hideChartCondition2;
    var forceChart = appCtxService.getCtx( 'searchChart.forceChart' );
    var objectFilterSelected = appCtxService.getCtx( 'searchChart.objectFilterSelected' );
    if( forceChart || objectFilterSelected ) {
        hideChart = false;
        if ( objectFilterSelected ) {
            appCtxService.unRegisterCtx( 'searchChart.objectFilterSelected' );
        }
    }
    return hideChart;
};

/**
 * selectCat
 * Gathers required data to build chartDataProvider and publishes updateFilterPanel event.
 * @param {*} chartListboxPropData the value of the Chart Category pulldown
 */
export let selectCat = function( chartListboxPropData ) {
    var searchContext = appCtxService.getCtx( 'search' );
    var searchResponseInfoContext = appCtxService.getCtx( 'searchResponseInfo' );
    var hideChart = exports.getHideChart();

    var label = searchContext.chartTitle;
    if( !label || hideChart ) {
        //If we don't have a title we do not want to build the chart provider as this is not configured for it.
        appCtxService.updatePartialCtx( 'chartProvider', null );
        if ( !label ) {
            return;
        }
    }

    var currentHighlightedCategory;
    if( appCtxService.ctx.searchChart && appCtxService.ctx.searchChart.userOverrideOfCurrentHighlightedCategory ) {
        currentHighlightedCategory = appCtxService.ctx.searchChart.userOverrideOfCurrentHighlightedCategory;
    } else if( searchResponseInfoContext.objectsGroupedByProperty ) {
        currentHighlightedCategory = searchResponseInfoContext.objectsGroupedByProperty.internalPropertyName;
    }
    var searchFilterMap = searchResponseInfoContext.searchFilterMap;
    var searchFilterCategories = searchResponseInfoContext.searchFilterCategories;

    //Get the category to display
    var searchFilterTargetCategory = exports.getTargetSearchFilterCategory( searchFilterCategories,
        searchFilterMap, currentHighlightedCategory );

    //update the ctx with the charted category
    searchContext.currentChartBy = searchFilterTargetCategory;
    appCtxService.registerCtx( 'search', searchContext );

    //If no valid category return null
    if( !searchFilterTargetCategory ) {
        appCtxService.updatePartialCtx( 'chartProvider', null );
    }

    if( !searchFilterTargetCategory.type ) {
        var colorPrefValue = appCtxService.getCtx( 'preferences' ).AWC_ColorFiltering[ 0 ];
        filterPanelService.getCategories2( searchFilterCategories, searchFilterMap,
            currentHighlightedCategory, colorPrefValue, true );
    }

    var tmpColumnChartCount = searchFilterCategories && searchFilterCategories.length > 0 ? searchFilterCategories[ 0 ].defaultFilterValueDisplayCount : columnChartCount;

    //Determine if columnChartCount needs update for date drilldown
    if( searchFilterTargetCategory.drilldown && searchFilterTargetCategory.drilldown > 0 ) {
        tmpColumnChartCount = columnChartCount + searchFilterTargetCategory.drilldown;
    }

    var chartProvider = appCtxService.getCtx( 'chartProvider' );
    if( chartProvider ) {
        chartProvider.chartListboxPropData = chartListboxPropData;
        exports.buildChartProvider( searchFilterTargetCategory, searchFilterMap, searchFilterCategories,
            tmpColumnChartCount, chartProvider );
    } else if( !hideChart && searchFilterCategories && searchFilterCategories.length > 0 ) {
        chartProvider = {};
        chartProvider.chartListboxPropData = chartListboxPropData;
        exports.buildChartProvider( searchFilterTargetCategory, searchFilterMap, searchFilterCategories,
            tmpColumnChartCount, chartProvider );

        appCtxService.updatePartialCtx( 'chartProvider', chartProvider );
    }

    if( chartProvider ) {
        if( typeof label === 'string' ) {
            chartProvider.chartTitleString = label + chartProvider.chartListboxPropData.dispValue;
        } else {
            //Otherwise get the label from the localized file
            localeService.getLocalizedText( app.getBaseUrlPath() + label.source, label.key ).then(
                function( result ) {
                    chartProvider.chartTitleString = result + chartProvider.chartListboxPropData.dispValue;
                } );
        }
    }

    // trigger the event whether or not there is a chart provider
    eventBus.publish( 'updateFilterPanel', {} );
};

/**
 * processSelectedColumnsForChart
 *
 * @function processSelectedColumnsForChart
 * @param {ObjectArray} selectedColumns selectedColumns
 * @param {ObjectArray} searchFilterColumns4 searchFilterColumns4
 */
export let processSelectedColumnsForChart = function( selectedColumns, searchFilterColumns4 ) {
    if( selectedColumns.length >= MAX_COLUMN_COUNT ) {
        searchFilterColumns4 = selectedColumns;
    } else {
        _.forEach( selectedColumns, function( option ) {
            var index = _.findIndex( searchFilterColumns4, function( o ) {
                return option.stringValue === o.stringValue;
            } );
            if( index < 0 ) {
                //not an existing column. Add it in, or replace
                if( searchFilterColumns4.length < MAX_COLUMN_COUNT ) {
                    //still has room. Add it in.
                    searchFilterColumns4.push( option );
                } else {
                    //no room, switch with the last one that's not selected.
                    var lastIndex = _.findLastIndex( searchFilterColumns4, function( o ) {
                        return o.selected === false;
                    } );
                    if( lastIndex > -1 ) {
                        _.pull( searchFilterColumns4, searchFilterColumns4[ lastIndex ] );
                        searchFilterColumns4.push( option );
                    }
                }
            }
        } );
    }
};

/**
 * processUnassignedColumnsForChart
 *
 * @function processUnassignedColumnsForChart
 * @param {ObjectArray} searchFilterColumns5 searchFilterColumns5
 */
export let processUnassignedColumnsForChart = function( searchFilterColumns5 ) {
    var unassignedValue = localTextBundle.noFilterValue;
    _.forEach( searchFilterColumns5, function( option ) {
        if( option.stringValue === '$NONE' && option.stringDisplayValue === '' ) {
            option.stringDisplayValue = unassignedValue;
        }
    } );
};

/**
 * processFinalColumnsForChart
 *
 * @function processFinalColumnsForChart
 * @param {ObjectArray} searchFilterColumns5 searchFilterColumns5
 * @returns {ObjectArray} processed final columns
 */
export let processFinalColumnsForChart = function( searchFilterColumns5 ) {
    return searchFilterColumns5.map( function( option ) {
        //Add an extension to date filters
        option.internalExtension = exports.getFilterExtension( option );
        //Give a label and value
        option.value = option.count;
        option.label = option.stringDisplayValue;
        //Append a check mark if the filter is active
        if( option.selected ) {
            option.label = '\u2713 ' + option.label;
        }
        return option;
    } );
};

/**
 * buildChartProvider
 *
 * @function buildChartProvider
 * @param {Object} searchFilterTargetCategory searchFilterTargetCategory
 * @param {Object} filterMap filterMap
 * @param {ObjectArray} filterCategories filterCategories
 * @param {Integer} columnCount columnCount
 * @param {Object} chartProvider chartProvider
 * @returns {Object} updated chartProvider
 */
export let buildChartProvider = function( searchFilterTargetCategory, filterMap, filterCategories, columnCount,
    chartProvider ) {
    //Merge filters that have multiple keys (typically date filters)
    var groupedFilters = exports.groupByCategory( filterMap );

    //Create a column for each filter option in that category
    var searchFilterColumns1 = groupedFilters[ searchFilterTargetCategory.internalName ];
    //Remove non string filter values
    //The "merged" date filters will be string filters
    var searchFilterColumns3 = searchFilterColumns1;
    if( searchFilterTargetCategory.type === 'DateFilter' ) {
        var searchFilterColumns2 = searchFilterColumns1.filter( function( option ) {
            return option.searchFilterType === 'StringFilter';
        } );
        searchFilterColumns3 = [];
        _.forEach( searchFilterTargetCategory.filterValues, function( filterValue ) {
            _.forEach( searchFilterColumns2, function( option ) {
                if( option.stringValue === filterValue.internalName ) {
                    searchFilterColumns3.push( option );
                }
            } );
        } );
    } else if( searchFilterTargetCategory.type === 'NumericFilter' ) {
        searchFilterColumns3 = searchFilterColumns1.filter( function( option ) {
            return option.startEndRange !== 'NumericRange';
        } );
    }

    var searchFilterColumns4 = searchFilterColumns3.filter( function( categoryValue, index ) {
        return index < columnCount || categoryValue.selected;
    } );
    var searchFilterColumns5;
    //Colors can only be shown on first 9. Remove items as necessary
    if( searchFilterColumns4.length < 9 ) {
        searchFilterColumns5 = searchFilterColumns4;
    } else {
        searchFilterColumns5 = searchFilterColumns4.filter( function( categoryValue, index ) {
            return index < 9;
        } );
    }
    // Process any column with a value of $NONE and remove any column with a value of 0
    exports.processUnassignedColumnsForChart( searchFilterColumns5 );
    searchFilterColumns5 = searchFilterColumns5.filter( function( option ) {
        return option && option.count > 0;
    } );
    //Build a column for each of the remaining filters
    var searchFilterColumns6 = exports.processFinalColumnsForChart( searchFilterColumns5 );

    chartProvider.category = searchFilterTargetCategory;
    chartProvider.columns = searchFilterColumns6;
    chartProvider.onSelect = function( column ) {
        //When a column is selected add/remove the new filter
        var addRemoveOnly;
        searchFilterSvc.addOrRemoveFilter( searchFilterTargetCategory.internalName + column.internalExtension,
            column.stringValue, addRemoveOnly, column.searchFilterType );
    };

    exports.addChartPropertySelectorData( filterCategories, chartProvider );
    return chartProvider;
};

export let addChartPropertySelectorData = function( filterCategories, provider ) {
    if( !filterCategories ) {
        return false;
    }

    if( !provider.chartListboxPropData ) {
        var chartListboxPropData = {};
        chartListboxPropData.displayName = 'Chart on';
        chartListboxPropData.type = 'STRING';
        chartListboxPropData.isRequired = 'true';
        chartListboxPropData.hasLov = 'true';

        provider.chartListboxPropData = chartListboxPropData;
    }

    provider.chartListboxPropData.dbValue = provider.category.internalName;
    provider.chartListboxPropData.dispValue = provider.category.displayName;

    var dbValues = [];
    for( var index = 0; index < filterCategories.length; index++ ) {
        var internalName = filterCategories[ index ].internalName;
        var hasFilterValues = exports.checkCategoryInFilterMapHasFilterValues( internalName );
        if( hasFilterValues ) {
            var dbValue = {};
            dbValue.propDisplayValue = filterCategories[ index ].displayName;
            dbValue.propDisplayDescription = '';
            dbValue.displayValue = filterCategories[ index ].displayName;
            dbValue.propInternalValue = filterCategories[ index ].internalName;

            dbValues.push( dbValue );
        }
    }

    provider.chartListboxListData = {
        type: 'STRING',
        dbValue: dbValues
    };
    return null;
};

/**
 *  checkCategoryInFilterMapHasFilterValues - check whether the category with the internal name provided has filterValues with length > 0
 *  @param { String } internalNameOfCategory - the internal name of the category
 *  @returns { Boolean } true/false
 */
export let checkCategoryInFilterMapHasFilterValues = function( internalNameOfCategory ) {
    var searchContext = appCtxService.getCtx( 'search' );
    if( searchContext ) {
        var searchFilterMap = searchContext.filterMap;
        for( var index = 0; index < Object.keys( searchFilterMap ).length; index++ ) {
            var category = searchFilterMap[ Object.keys( searchFilterMap )[ index ] ];
            if( Object.keys( searchFilterMap )[ index ] === internalNameOfCategory ) {
                if( category.length > 0 ) {
                    return true;
                }
                return false;
            }
        }
    }
    return false;
};

let getTargetSearchFilterCategoryWithSelectedFilters = function( categories, map ) {
    return categories.filter( function( category ) {
        var filterArray = map[ category.internalName ];
        if( filterArray && filterArray.length > 0 ) {
            for( var index = 0; index < filterArray.length; index++ ) {
                var filter = filterArray[ index ];
                if( filter.selected ) {
                    return true;
                }
            }
        }
        return false;
    } );
};

let getTargetSearchFilterCategoryWithoutSelectedFilters = function( categories, map ) {
    return categories.filter( function( category ) {
        var filterArray = map[ category.internalName ];
        if( filterArray && filterArray.length === 1 ) {
            return false;
        }
        if( filterArray && filterArray.length > 0 ) {
            for( var index = 0; index < filterArray.length; index++ ) {
                var filter = filterArray[ index ];
                if( filter.selected ) {
                    return false;
                }
            }
        }
        return true;
    } );
};

let getTargetSearchFilterCategoryIfDateFilter = function( categories, map ) {
    //Handle date filters
    return categories.filter( function( category ) {
        var options = map[ category.internalName ];
        if( _.isArray( options ) ) {
            var isValid = false;
            if( options[ 0 ] && options[ 0 ].searchFilterType === 'StringFilter' ) {
                isValid = true;
            } else if( options[ 0 ] && options[ 0 ].searchFilterType === 'DateFilter' ) {
                var dateCatName = category.internalName;

                var dateFilterArray = map[ dateCatName + '_0Z0_year' ];
                if( !dateFilterArray ) {
                    dateFilterArray = map[ dateCatName + '_0Z0_year_month' ];
                    if( !dateFilterArray ) {
                        dateFilterArray = map[ dateCatName + '_0Z0_week' ];
                        if( !dateFilterArray ) {
                            dateFilterArray = map[ dateCatName + '_0Z0_year_month_day' ];
                        }
                    }
                }

                var isSelectedFilterList = dateFilterArray.filter( function( filter ) {
                    return filter.selected;
                } );
                if( isSelectedFilterList.length === 0 ) {
                    isValid = true;
                }
            }

            return isValid;
        }
        return false;
    } );
};
/**
 * Get the search filter category that should be displayed in the chart
 * @function getTargetSearchFilterCategory
 * @param {Object[]} categories - The list of filter categories
 * @param {Object} map - The map containing the options for each category
 * @param {String} categoryToSelect - (Optional) Internal name of the category to select - selected over other
 *            options if given.
 * @return {Object} The filter category to use
 */
export let getTargetSearchFilterCategory = function( categories, map, categoryToSelect ) {
    if( !categories || categories.length < 1 ) {
        return false;
    }
    if( !categoryToSelect ) {
        categoryToSelect = appCtxService
            .getCtx( 'searchResponseInfo.objectsGroupedByProperty.internalPropertyName' );
    }
    //Attempt to find the category matching the categoryToSelect
    var findByName = categories.filter( function( category ) {
        let searchFilterCategoryValuesExist = category.filterValues && category.filterValues.length > 0;
        let clsFilterCategoryValuesExist = category.filterValues && category.filterValues.parentnodes && category.filterValues.childnodes
            && ( category.filterValues.parentnodes.length > 0 || category.filterValues.childnodes.length > 0 );
        if( category.internalName === categoryToSelect ) {
            if( category.filterValues ) {
                if( searchFilterCategoryValuesExist || clsFilterCategoryValuesExist ) {
                    return true;
                }
                return false;
            }
            return true;
        }
    } );
    if( findByName[ 0 ] ) {
        return findByName[ 0 ];
    }

    //Handle date filters
    var filteredCategories = getTargetSearchFilterCategoryIfDateFilter( categories, map );

    //If there is a category with more than 1 option return it
    var moreThanOneCategories = filteredCategories.filter( function( category ) {
        return map[ category.internalName ].length > 1;
    } );
    if( moreThanOneCategories.length > 0 ) {
        var catWithSelections = getTargetSearchFilterCategoryWithSelectedFilters( categories, map );
        var catWithNoSelections = getTargetSearchFilterCategoryWithoutSelectedFilters( categories, map );

        if( catWithNoSelections.length > 0 ) {
            return catWithNoSelections[ 0 ];
        }
        if( catWithSelections.length > 0 ) {
            return catWithSelections[ catWithSelections.length - 1 ];
        }

        return moreThanOneCategories[ 0 ];
    }

    //If not just return the first category
    return filteredCategories[ 0 ];
};

/**
 * Group the filters by the actual category. Date filter properties will be merged (ex MyCategory_0Z0_year and
 * MyCategory_0Z0_week will be merged into MyCategory)
 * @function groupByCategory
 * @param {Object} params - Object where internal filter name is the key and value is the array of filters selected.
 * @return {Object} Same object with date filters merged
 */
export let groupByCategory = function( params ) {
    return _.reduce( params, function( acc, nxt, key ) {
        var trueKey = key.split( exports._dateFilterMarker )[ 0 ];
        if( trueKey !== key ) {
            _.forEach( nxt, function( aFilter ) {
                aFilter.startEndRange = key.substring( trueKey.length, key.length );
            } );
        }
        if( acc[ trueKey ] ) {
            acc[ trueKey ] = acc[ trueKey ].concat( nxt );
        } else {
            acc[ trueKey ] = nxt;
        }
        return acc;
    }, {} );
};

/**
 * Get the extension that should be added to the internal name of the filter.
 * @function getFilterExtension
 * @param {Object} filter - Filter object
 * @return {String} The extension
 */
export let getFilterExtension = function( filter ) {
    if( filter.startEndRange === '+1YEAR' ) {
        return exports._dateFilterMarker + exports._dateFilterLevels[ 0 ];
    }
    if( filter.startEndRange === '+1MONTH' ) {
        return exports._dateFilterMarker + exports._dateFilterLevels[ 1 ];
    }
    if( filter.startEndRange === '+7DAYS' ) {
        return exports._dateFilterMarker + exports._dateFilterLevels[ 2 ];
    }
    if( filter.startEndRange === '+1DAY' ) {
        return exports._dateFilterMarker + exports._dateFilterLevels[ 3 ];
    }
    return filter.startEndRange;
};

/**
 * Provide functionality to clear chartProvider or build/refresh chartProvider
 *
 * Called when targetFilterCategoryUpdated event is triggered by AFX code
 *
 * @param {*} chartListboxPropData chartListboxPropData
 */
export let targetFilterCategoryUpdated = function( chartListboxPropData ) {
    var searchFilterMap = appCtxService.getCtx( 'searchResponseInfo.searchFilterMap' );
    var searchFilterCategories = appCtxService.getCtx( 'searchResponseInfo.searchFilterCategories' );

    if( searchFilterMap && searchFilterCategories ) {
        exports.selectCat( chartListboxPropData );
    } else {
        //Clear the chart
        var chartProvider = appCtxService.getCtx( 'chartProvider' );
        if( chartProvider ) {
            appCtxService.updatePartialCtx( 'chartProvider', null );
        }
    }
};

/**
 * updates chartProvider.chartListboxListData with the information of the category for which performFacetSearch is being called for
 * @param {Object} category - Category which is used for performing facet search
 */
export let updateChartListBoxListData = function( category ) {
    var chartProviderCtx = appCtxService.getCtx( 'chartProvider' );
    if( chartProviderCtx && chartProviderCtx.chartListboxListData ) {
        var dbValues = chartProviderCtx.chartListboxListData.dbValue;
        if( !dbValues ) {
            dbValues = [];
        }

        if( category && category.displayName && category.internalName && !exports.doesCatNameAlreadyExistInChartListBox( dbValues, category ) ) {
            var dbValue = {};
            dbValue.propDisplayValue = category.displayName;
            dbValue.propDisplayDescription = '';
            dbValue.displayValue = category.displayName;
            dbValue.propInternalValue = category.internalName;
            dbValues.push( dbValue );
            appCtxService.updatePartialCtx( 'chartProvider.chartListboxListData.dbValue', dbValues );
        }
    }
};

/**
 * @param {Array} dbValues - array containing objects containing category information used for the chart by list
 * @param {Object} category - category to check. If it already exists in the Array - return true/ else false
 */
export let doesCatNameAlreadyExistInChartListBox = function( dbValues, category ) {
    var exists = false;
    _.forEach( dbValues, function( eachCategory ) {
        if( eachCategory && eachCategory.propInternalValue === category.internalName && !exists ) {
            exists = true;
        }
    } );
    return exists;
};

export let getLocalTextBundle = function() {
    return localTextBundle;
};

export let loadConfiguration = function() {
    localeService.getTextPromise( 'SearchMessages', true ).then(
        function( localTextBundle_ ) {
            localTextBundle = localTextBundle_;
        } );
};

loadConfiguration();
/*eslint-disable-next-line valid-jsdoc*/

const exports = {
    _dateFilterMarker,
    _dateFilterLevels,
    triggerSearchFilterTargetCategoryEvent,
    getHideChart,
    selectCat,
    processSelectedColumnsForChart,
    processUnassignedColumnsForChart,
    processFinalColumnsForChart,
    buildChartProvider,
    addChartPropertySelectorData,
    checkCategoryInFilterMapHasFilterValues,
    getTargetSearchFilterCategory,
    groupByCategory,
    getFilterExtension,
    targetFilterCategoryUpdated,
    updateChartListBoxListData,
    doesCatNameAlreadyExistInChartListBox,
    getLocalTextBundle,
    loadConfiguration
};

export default exports;

/**
 * Marker for date filters
 *
 * @member _dateFilterMarker
 * @memberOf NgServices.awChartDataProviderService
 */
/**
 * The hierarchy of date filters. If a filter on a higher level is removed all filters on the levels below are
 * also cleared.
 *
 * @member _dateFilterLevels
 * @memberOf NgServices.awChartDataProviderService
 */

/**
 *
 * @memberof NgServices
 * @member awChartDataProviderService
 */
app.factory( 'awChartDataProviderService', () => exports );

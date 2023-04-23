/* eslint-disable max-lines */
// Copyright (c) 2020 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/aw.searchFilter.service
 * @requires js/filterPanelUtils
 */
import app from 'app';
import $state_ from 'js/awStateService';
import $q_ from 'js/awPromiseService';
import localeService from 'js/localeService';
import appCtxService from 'js/appCtxService';
import filterPanelUtils from 'js/filterPanelUtils';
import cdm from 'soa/kernel/clientDataModel';
import ngModule from 'angular';
import _ from 'lodash';
import analyticsSvc from 'js/analyticsService';
import cmm from 'soa/kernel/clientMetaModel';
import eventBus from 'js/eventBus';

var exports = {};

var localTextBundle = {};
var _local = 'local';
var OWNING_SITE = 'OwningSite.owning_site';

export let _dateFilterMarker = '_0Z0_';

export let _dateFilterLevels = [ 'year', 'year_month', 'week', 'year_month_day' ];

export let _filterSeparator = '~';

const _filterSeparatorOption1 = '~';

const _filterSeparatorOption2 = '##';

export let _filterValueSeparator = appCtxService.ctx.preferences && appCtxService.ctx.preferences.AW_FacetValue_Separator && appCtxService.ctx.preferences.AW_FacetValue_Separator[ 0 ] ?
    appCtxService.ctx.preferences.AW_FacetValue_Separator[ 0 ] : '^';

export let chooseFilterSeparator = function( filters ) {
    let conflictFound = false;
    _.forEach( filters, ( value, key ) => {
        if( _.indexOf( value[ 0 ], _filterSeparatorOption1 ) > -1 ) {
            conflictFound = true;
            return false;
        }
    } );
    if( conflictFound ) {
        exports._filterSeparator = _filterSeparatorOption2;
    } else {
        exports._filterSeparator = _filterSeparatorOption1;
    }
};
export let buildFilterString = function( filters ) {
    exports.chooseFilterSeparator( filters );
    return _.map( filters, function( value, key ) {
        return key + '=' + value.join( exports._filterValueSeparator );
    } ).join( exports._filterSeparator );
};

export let isHierarchicalChildFilter = function( filterString ) {
    var isChildFilter = false;
    if( filterString ) {
        var nodes = filterString.split( filterPanelUtils.HIERARCHICAL_FACET_SEPARATOR );
        if( nodes && nodes.length > 2 && !isNaN( nodes[ 0 ] ) ) {
            var level = parseInt( nodes[ 0 ], 10 );
            if( level > 0 ) {
                isChildFilter = true;
            }
        }
    }
    return isChildFilter;
};

export let parseHierarchicalChildFilters = function( filterString, keepIdentifier ) {
    var filterValues = [];
    var nodes = filterString.split( filterPanelUtils.HIERARCHICAL_FACET_SEPARATOR );

    if( !isNaN( nodes[ 0 ] ) ) {
        var level = parseInt( nodes[ 0 ], 10 );
        for( var i = 0; i <= level; i++ ) {
            var filterValue = i.toString();
            for( var j = 1; j <= i + 1; j++ ) {
                filterValue += filterPanelUtils.HIERARCHICAL_FACET_SEPARATOR + nodes[ j ];
            }
            if( keepIdentifier ) {
                filterValues.push( filterPanelUtils.INTERNAL_OBJECT_FILTER + filterValue );
            } else {
                filterValues.push( filterValue );
            }
        }
    }
    return filterValues;
};

export let getFilters = function( groupByCategory, sort, checkHierarchy, keepHierarchyIdentifier, isShapeOrSavedSearch ) {
    var filterMap = {};
    if( $state_.instance.params.filter ) {
        // Build the filter map
        $state_.instance.params.filter.split( exports._filterSeparator ).map( function( filterVal ) {
            var separatorIndex = filterVal.search( '=' );
            var key = filterVal.slice( 0, separatorIndex );
            var valuePart = filterVal.slice( separatorIndex + 1 );
            var filterPair = [];
            filterPair[ 0 ] = key;
            filterPair[ 1 ] = valuePart;
            if( filterPair.length === 2 && filterPair[ 1 ] !== '' ) {
                var realFilter = filterPanelUtils.getRealFilterWithNoFilterType( filterPair[ 1 ] );
                if( checkHierarchy && exports.isHierarchicalChildFilter( realFilter ) && exports.checkIfObjectFilterType( filterPair[ 0 ] ) ) {
                    filterMap[ filterPair[ 0 ] ] = exports.parseHierarchicalChildFilters( realFilter, keepHierarchyIdentifier );
                } else if( isShapeOrSavedSearch ) {
                    if( filterPair[ 0 ] !== 'ShapeSearchProvider' && filterPair[ 0 ] !== 'Geolus Criteria' && filterPair[ 0 ] !== 'SS1shapeBeginFilter' &&
                        filterPair[ 0 ] !== 'SS1shapeEndFilter' && filterPair[ 0 ] !== 'SS1partShapeFilter' && filterPair[ 0 ] !== 'UpdatedResults.updated_results' ) {
                        filterMap[ filterPair[ 0 ] ] = filterPair[ 1 ].split( exports._filterValueSeparator );
                    }
                } else {
                    filterMap[ filterPair[ 0 ] ] = filterPair[ 1 ].split( exports._filterValueSeparator );
                }
            }
        } );
    }
    if( groupByCategory ) {
        return exports.groupByCategory( filterMap );
    }
    return sort ? exports.getSortedFilterMap( filterMap ) : filterMap;
};

export let checkIfObjectFilterType = function( filterCategoryName ) {
    var isObjectFilterType = false;
    var responseFilterMap = appCtxService.getCtx( 'searchResponseInfo.searchFilterMap' );
    if( responseFilterMap && filterCategoryName && responseFilterMap[ filterCategoryName ] ) {
        var filters = [];
        filters = responseFilterMap[ filterCategoryName ];
        if( filters && filters.length > 0 ) {
            if( filters[ 0 ].searchFilterType === 'ObjectFilter' ) {
                isObjectFilterType = true;
            }
        }
    }
    return isObjectFilterType;
};

export let getSortedFilterMap = function( params ) {
    return _.reduce( params, function( acc, nxt, key ) {
        var trueKey = key.split( exports._dateFilterMarker )[ 0 ];
        if( trueKey !== key ) {
            _.forEach( nxt, function( nxtValue ) {
                var decoratedNxt = {};
                decoratedNxt.property = key;
                decoratedNxt.filter = nxtValue;
                if( acc[ trueKey ] ) {
                    acc[ trueKey ].push( decoratedNxt );
                } else {
                    acc[ trueKey ] = [];
                    acc[ trueKey ].push( decoratedNxt );
                }
            } );
        } else {
            if( acc[ key ] ) {
                acc[ key ] = acc[ key ].concat( nxt );
            } else {
                acc[ key ] = nxt;
            }
        }
        return acc;
    }, {} );
};

export let rememberCategoryFilterState = function( context ) {
    var searchCurrentFilterCategories = appCtxService
        .getCtx( 'searchResponseInfo.searchCurrentFilterCategories' );
    if( searchCurrentFilterCategories === undefined ) {
        searchCurrentFilterCategories = [];
        var ctx = appCtxService.getCtx( 'searchResponseInfo' );
        if( ctx ) {
            searchCurrentFilterCategories.push( context.category );
            ctx.searchCurrentFilterCategories = searchCurrentFilterCategories;
            appCtxService.updateCtx( 'searchResponseInfo', ctx );
        }
    } else {
        var index = _.findIndex( searchCurrentFilterCategories, function( category ) {
            return category.internalName === context.category.internalName;
        } );
        if( index < 0 ) {
            searchCurrentFilterCategories.push( context.category );
        } else {
            searchCurrentFilterCategories[ index ] = context.category;
        }
        appCtxService.updatePartialCtx( 'searchResponseInfo.searchCurrentFilterCategories',
            searchCurrentFilterCategories );
    }
};

export let buildSearchFiltersInt = function( searchContext, filterMap ) {
    _.forEach( filterMap, function( value, key ) {
        // If it's a valid filter
        // get filter type
        var filterType = 'StringFilter';

        if( key === OWNING_SITE ) {
            filterType = 'RadioFilter';
            searchContext.activeFilterMap[ key ] = value.map( function( v1 ) {
                var filter = {};
                filter.searchFilterType = 'RadioFilter';
                filter.stringValue = v1;
                return filter;
            } );
        } else {
            // Map is used directly by data provider
            searchContext.activeFilterMap[ key ] = value.map( function( v1 ) {
                var filter = {};

                if( _.startsWith( v1, filterPanelUtils.INTERNAL_DATE_FILTER ) ) {
                    filter = filterPanelUtils.getDateRangeFilter( v1.substring( 12, v1.length ) );
                } else if( _.startsWith( v1, filterPanelUtils.INTERNAL_NUMERIC_RANGE ) ) {
                    filter = filterPanelUtils.getNumericRangeFilter( v1.substring( 14,
                        v1.length ) );
                } else if( _.startsWith( v1, filterPanelUtils.INTERNAL_NUMERIC_FILTER ) ) {
                    filter.searchFilterType = 'NumericFilter';
                    var numericValue = parseFloat( v1.substring( 15, v1.length ) );
                    if( !isNaN( numericValue ) ) {
                        filter.startNumericValue = numericValue;
                        filter.endNumericValue = numericValue;
                    }
                    filter.stringValue = v1.substring( 15, v1.length );
                } else if( _.startsWith( v1, filterPanelUtils.INTERNAL_OBJECT_FILTER ) ) {
                    // SOA handles object filters differently in aw4.0.
                    // So we need to pass "StringFilter" until server side is changed to be the same as aw3.4
                    // filter.searchFilterType = "ObjectFilter";
                    filter.searchFilterType = 'StringFilter';
                    filter.stringValue = v1.substring( 14, v1.length );
                } else if( v1 === '$TODAY' || v1 === '$THIS_WEEK' || v1 === '$THIS_MONTH' ) {
                    // For special Solr filters like TODAY, THIS_WEEK or THIS_MONTH, mark the filter as DateFilter but keep string values
                    filter.searchFilterType = 'DateFilter';
                    filter.stringValue = v1;
                } else {
                    filter.searchFilterType = 'StringFilter';
                    v1 = v1.toString();
                    let displayAndInternalValueArray = v1.split( filterPanelUtils.INTERNAL_KEYWORD );
                    filter.stringValue = displayAndInternalValueArray && displayAndInternalValueArray.length === 2 ? displayAndInternalValueArray[ 1 ] : v1;
                    filter.stringDisplayValue = displayAndInternalValueArray && displayAndInternalValueArray.length === 2 ? displayAndInternalValueArray[ 0 ] : v1;
                }
                filterType = filter.searchFilterType;
                return filter;
            } );
        }

        // Array to maintain the order
        searchContext.activeFilters.push( {
            name: key,
            values: value,
            type: filterType
        } );
    } );
};

export let buildSearchFilters = function( context ) {
    // Initialize the search context if necessary
    var searchContext = ngModule.copy( appCtxService.getCtx( 'search' ) );

    searchContext = searchContext ? searchContext : {};

    // Filter map and filter array are both required
    // Input to performSearch needs filter map
    searchContext.activeFilterMap = context && context.search && context.search.activeFilterMap ? ngModule
        .copy( context.search.activeFilterMap ) : {};

    // But order matters in some cases and so array is needed
    searchContext.activeFilters = [];

    // Build up filter map and array
    exports.buildSearchFiltersInt( searchContext, exports.getFilters() );

    return searchContext;
};

export let getFilterStringFromActiveFilterMap = function( searchFilterMap ) {
    var searchRespContext = appCtxService.getCtx( 'searchResponseInfo' );
    searchRespContext = searchRespContext ? searchRespContext : {};
    if( !searchRespContext.searchFilterMap ) {
        searchRespContext.searchFilterMap = [];
    }
    var searchFilterCategories = searchRespContext.searchFilterCategories;
    // For each of the current search params
    var searchParams = exports.getFilters( false );

    var displayString = '';
    _.map( searchParams, function( value, property ) {
        var trueProperty = property.split( exports._dateFilterMarker )[ 0 ];
        // If it's a valid filter
        var index = _.findIndex( searchFilterCategories, function( o ) {
            return o.internalName === trueProperty;
        } );
        // Get the filter name first
        var filterName = '';
        if( index > -1 ) {
            filterName = searchFilterCategories[ index ].displayName;
        } else if( !searchFilterCategories || searchFilterCategories && searchFilterCategories.length < 1 ) {
            filterName = exports.getCategoryDisplayName( property );
        } else {
            return '';
        }

        // Get display name for all the filter values
        var filterValues = '';
        _.forEach( searchParams[ property ], function( filter ) {
            let displayAndInternalValueArray = filter.split( filterPanelUtils.INTERNAL_KEYWORD );
            filter = displayAndInternalValueArray && displayAndInternalValueArray.length === 2 ? displayAndInternalValueArray[ 1 ] : filter;
            var filterValue = exports.getBreadCrumbDisplayValue( searchFilterMap[ property ], filterPanelUtils.getRealFilterWithNoFilterType( filter ), searchRespContext.searchFilterMap[
                property ] );
            filterValues += filterValues === '' ? filterValue : ', ' + filterValue;
        } );
        if( filterValues !== '' ) {
            var individualFilterString = filterName + '=' + filterValues;
            displayString += displayString === '' ? individualFilterString : ', ' +
                individualFilterString;
        }
    } );
    return displayString;
};

export let convertFilterMapToSavedSearchFilterMap = function() {
    var searchContext = appCtxService.getCtx( 'search' );
    var activeFilterMap = searchContext.activeFilterMap;
    var activeFilters = searchContext.activeFilters;
    var searchStringFilterMap = {};
    if( activeFilterMap ) {
        _
            .forEach( activeFilterMap,
                function( value, key ) {
                    var filters = [];
                    for( var indx = 0; indx < value.length; indx++ ) {
                        var filter = {};
                        // Saved search object only store SearchStringFilter types
                        filter.searchFilterType = 'SearchStringFilter';
                        filter.startNumericValue = 0;
                        filter.endNumericValue = 0;
                        filter.startDateValue = 0;
                        filter.endDateValue = 0;
                        // Handle date range filters and numeric range filters
                        if( value[ indx ].searchFilterType === 'DateFilter' &&
                            !value[ indx ].stringValue ) {
                            var dateParts1 = value[ indx ].startDateValue.match( /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/ );
                            var dateParts2 = value[ indx ].endDateValue.match( /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/ );
                            if( dateParts1 && dateParts2 ) {
                                var fromDate = new Date( dateParts1 );
                                var toDate = new Date( dateParts2 );
                                filter.stringValue = filterPanelUtils.getDateRangeString( fromDate, new Date(
                                    toDate ) );
                            } else {
                                continue;
                            }
                        } else if( value[ indx ].searchFilterType === 'NumericFilter' ) {
                            if( !value[ indx ].stringValue ) {
                                filter.stringValue = filterPanelUtils.getNumericRangeString(
                                    value[ indx ].startNumericValue, value[ indx ].endNumericValue );
                            } else {
                                filter.stringValue = filterPanelUtils.INTERNAL_NUMERIC_FILTER.concat( value[ indx ].stringValue );
                            }
                        } else {
                            filter = exports.processConvertFilterMapToSavedSearchFilterMap( value, indx, key, filter, activeFilters );
                        }
                        filters.push( filter );
                    }
                    searchStringFilterMap[ key ] = filters;
                } );
    }
    return searchStringFilterMap;
};

/**
 * processConvertFilterMapToSavedSearchFilterMap
 * @param {Object} value Value
 * @param {Integer} indx  The index
 * @param {Integer} key  Key
 * @param {Object} filter  The filter object
 * @param {ObjectArray} activeFilters The array of active filters
 * @returns {Object} filter
 */
export let processConvertFilterMapToSavedSearchFilterMap = function( value, indx, key, filter, activeFilters ) {
    // Currently NumericFilters are also being treated as String Filters
    // verify this filter is numeric filter by checking against activeFilters data structure
    var numericFilterIndex = _.findIndex( activeFilters, function( object ) {
        if( object.name === key && object.values ) {
            return _.startsWith( object.values[ 0 ], filterPanelUtils.INTERNAL_NUMERIC_FILTER ) ||
                _.startsWith( object.values[ 0 ], filterPanelUtils.INTERNAL_NUMERIC_RANGE );
        }
    } );
    if( numericFilterIndex > -1 ) {
        filter.stringValue = filterPanelUtils.INTERNAL_NUMERIC_FILTER.concat( value[ indx ].stringValue );
    } else {
        filter.stringValue = value[ indx ].stringValue;
    }

    return filter;
};

export let getFilterDisplayValue = function( values, value ) {
    var dispValue = '';
    var filterValue = '';
    var dArray = [];
    if( _.startsWith( value, filterPanelUtils.INTERNAL_DATE_FILTER ) ) {
        filterValue = value.replace( filterPanelUtils.INTERNAL_DATE_FILTER, '' );
        dArray = filterValue.split( '_TO_' );
        if( dArray.length > 1 ) {
            var startDate = new Date( dArray[ 0 ] );
            var endDate = new Date( dArray[ 1 ] );
            var dateRange = filterPanelUtils.getDateRangeDisplayString( startDate, endDate );
            dispValue = dateRange.displayName;
        }
    } else if( _.startsWith( value, filterPanelUtils.INTERNAL_NUMERIC_RANGE ) ) {
        filterValue = value.replace( filterPanelUtils.INTERNAL_NUMERIC_RANGE, '' );
        dArray = filterValue.split( '_TO_' );
        if( dArray.length > 1 ) {
            var numericRange = filterPanelUtils.getNumericRangeDisplayString( dArray[ 0 ],
                dArray[ 1 ] );
            dispValue = numericRange.displayName;
        }
    } else {
        var ind = _.findIndex( values, function( o ) {
            return o.stringValue === value;
        } );
        if( ind > -1 ) {
            if( _.endsWith( values[ ind ].stringValue, '$NONE' ) ) {
                dispValue = localTextBundle.noFilterValue;
            } else {
                dispValue = values[ ind ].stringDisplayValue;
            }
        }
    }
    return dispValue;
};

export let getSpecialDisplayName = function( value ) {
    if( value === '$ME' ) {
        return cdm.getUserSession().props.user.uiValues[ 0 ];
    }
    if( value === '$TODAY' ) {
        return exports.getLocalTextBundle().searchFilterVariableToday;
    }
    if( value === '$THIS_WEEK' ) {
        return exports.getLocalTextBundle().searchFilterVariableThisWeek;
    }
    if( value === '$THIS_MONTH' ) {
        return exports.getLocalTextBundle().searchFilterVariableThisMonth;
    }
    if( value === '$MY_GROUP' ) {
        return exports.getLocalTextBundle().searchFilterVariableMyGroup;
    }
    return '';
};

export let getLocalTextBundle = function() {
    return localTextBundle;
};

export let getBreadCrumbDisplayValue = function( values, value, searchFilters ) {
    var dispValue = exports.getSpecialDisplayName( value );
    if( dispValue === '' ) {
        if( _.startsWith( value, filterPanelUtils.INTERNAL_DATE_FILTER ) ) {
            var startDate = filterPanelUtils.getDate( exports.processDateStringOffset( values[ 0 ].startDateValue ) );
            var endDate = filterPanelUtils.getDate( exports.processDateStringOffset( values[ 0 ].endDateValue ) );
            var dateRange = filterPanelUtils.getDateRangeDisplayString( startDate, endDate );
            dispValue = dateRange.displayName;
        } else if( _.startsWith( value, filterPanelUtils.INTERNAL_NUMERIC_RANGE ) ) {
            var startRange = values[ 0 ].startNumericValue;
            var endRange = values[ 0 ].endNumericValue;
            var startEndRange = values[ 0 ].startEndRange;
            var numericRange = filterPanelUtils.getNumericRangeDisplayString( startRange, endRange,
                startEndRange );
            dispValue = numericRange.displayName;
        } else {
            var ind = _.findIndex( values, function( o ) {
                return o.stringValue === value;
            } );
            if( ind > -1 ) {
                // some "$NONE" stringValue actually has non-empty stringDisplayValue, so we don't want to display the default "Unassigned" in that case.
                if( values[ ind ].stringDisplayValue ) {
                    dispValue = values[ ind ].stringDisplayValue;
                } else if( _.endsWith( value, '$NONE' ) ) {
                    dispValue = localTextBundle.noFilterValue;
                } else if( searchFilters ) {
                    var theFilter = _.find( searchFilters, function( o ) {
                        return o.stringValue === value;
                    } );
                    if( theFilter && theFilter.stringDisplayValue ) {
                        dispValue = theFilter.stringDisplayValue;
                    } else {
                        dispValue = value;
                    }
                } else {
                    dispValue = value;
                }
            }
        }
    }

    return dispValue;
};

export let processDateStringOffset = function( dateString ) {
    if( dateString.length > 19 ) {
        var offsetString = dateString.substring( 19 );
        if( offsetString.length > 4 && offsetString.indexOf( ':' ) === -1 ) {
            var hour = offsetString.substring( 0, offsetString.length - 2 );
            var min = offsetString.substring( offsetString.length - 2 );
            var newOffset = hour.concat( ':', min );
            dateString = dateString.replace( offsetString, newOffset );
        }
    }
    return dateString;
};

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

export let setFilters = function( params ) {
    $state_.instance.go( '.', {
        filter: exports.buildFilterString( params )
    } );
};
/**
 * Add or remove a string filter from the newParams object. Not pure, modifies newParams.
 *
 * @param {Object} newParams - Parameter object to modify
 * @param {String} category - Internal name of the category
 * @param {String} filter - Filter value. Pass null to clear all options for category.
 * @param {Boolean} addRemoveOnly - True/false to only add/remove. Undefined will have no
 *            effect.
 */
export let addOrRemoveDateFilterInt = function( newParams, category, filter, addRemoveOnly ) {
    // Try to find the filter in the current filters for that category
    var idx = newParams[ category ].indexOf( filter );

    // If it is in the list
    if( idx !== -1 ) {
        // And we are not only adding parameters
        if( addRemoveOnly !== true ) {
            if( category.split( exports._dateFilterMarker )[ 1 ] === 'year_month_day' ) {
                newParams[ category ].splice( idx, 1 );
            } else {
                exports.removeDateFilter( newParams, category );
            }
        }
    } else { // If it is not in the list
        // And we are not only removing parameters
        if( addRemoveOnly !== false ) {
            // Add it
            newParams[ category ].push( filter );
        }
    }
};

/**
 * Add or remove a string filter from the newParams object. Not pure, modifies newParams.
 *
 * @param {Object} newParams - Parameter object to modify
 * @param {String} category - Internal name of the category
 * @param {String} filter - Filter value. Pass null to clear all options for category.
 * @param {Boolean} addRemoveOnly - True/false to only add/remove. Undefined will have no
 *            effect.
 */
export let addOrRemoveDateFilter = function( newParams, category, filter, addRemoveOnly ) {
    // If we are removing a specific filter
    if( filter ) {
        // If the category already exists in the parameters
        if( newParams[ category ] ) {
            exports.addOrRemoveDateFilterInt( newParams, category, filter, addRemoveOnly );
        } else if( addRemoveOnly !== false ) {
            // If the category does not exist in the parameters create it and add the filter
            // Unless told to only remove parameters
            newParams[ category ] = [ filter ];
        }
    } else { // If we are removing a whole category (cannot add without filter value)
        // If the category exists and we are not only adding parameters
        if( newParams[ category ] && addRemoveOnly !== true ) {
            exports.removeDateFilter( newParams, category );
        }
    }
};

/**
 * Add or remove a string filter from the newParams object. Not pure, modifies newParams.
 *
 * @param {Object} newParams - Parameter object to modify
 * @param {String} category - Internal name of the category
 */
export let removeDateFilter = function( newParams, category ) {
    var base = category.split( exports._dateFilterMarker )[ 0 ];
    var level = exports._dateFilterLevels
        .indexOf( category.split( exports._dateFilterMarker )[ 1 ] );
    exports._dateFilterLevels.slice( level ).map( function( levelCategory ) {
        delete newParams[ base + exports._dateFilterMarker + levelCategory ];
    } );
};

export let addOrRemoveObjectFilter = function( newParams, category, filter, addRemoveOnly ) {
    if( addRemoveOnly ) {
        appCtxService.registerCtx( 'searchChart.objectFilterSelected', true );
        delete newParams[ category ];
        exports.addOrRemoveStringFilter( newParams, category, filter, addRemoveOnly, 'ObjectFilter' );
    } else {
        delete newParams[ category ];
        var realFilter = filterPanelUtils.getRealFilterWithNoFilterType( filter );
        var nodes = realFilter.split( '/' );

        // If we are removing the root node, the length will be 2. Otherwise we are removing an intermediate node.
        if( nodes.length > 2 ) {
            appCtxService.registerCtx( 'searchChart.objectFilterSelected', true );
            var level = ( nodes[ 0 ] - 1 ).toString();
            for( var i = 1; i < nodes.length - 1; i++ ) {
                level += '/';
                level += nodes[ i ];
            }
            newParams[ category ] = [ level ];
        }
    }
};

/**
 * Add or remove a radio filter from the newParams object.
 *
 * @param {Object} newParams - Parameter object to modify
 * @param {String} category - Internal name of the category
 * @param {String} filter - Filter value. Pass null to clear all options for category.
 */
export let addRadioSiteFilter = function( newParams, category, filter ) {
    // If we are removing a specific filter
    if( filter ) {
        // If the category already exists in the parameters
        if( newParams[ category ] ) {
            // it does not exist in the list )
            var idx = newParams[ category ].indexOf( filter );
            if( idx === -1 ) {
                /* Remove every other */
                for( var j in newParams ) {
                    delete newParams[ j ];
                }
                newParams[ category ] = [ filter ];
            }
        } else { // If the category does not exist in the parameters create it and add the filter
            // first search newParams is empty
            newParams[ category ] = [ filter ];
        }
    }
};

/**
 * Remove a radio filter from the newParams object.
 *
 * @param {String} category - Internal name of the category
 * @param {String} filter - Filter value. Pass null to clear all options for category.
 */
export let removeRadioSiteFilter = function( category, filter ) {
    if( filter ) {
        // If the category already exists in the parameters
        var newParams = exports.getFilters();
        if( newParams[ category ] ) {
            // if it is already in the list (example: we are removing a filter from the breadcrumb )
            var idx = newParams[ category ].indexOf( filter );
            if( idx !== -1 ) {
                newParams = exports.processRemoveRadioSiteFilter( newParams, category, filter );
            }
            // Update the parameters
            exports.setFilters( newParams );
        }
    }
};

/**
 * Process the removal of radio filter from the newParams with existing category
 *
 * @param {Object} newParams - New Parameters
 * @param {String} category - Internal name of the category
 * @param {String} filter - Filter value. Pass null to clear all options for category.
 * @returns {Object} newParams
 */
export let processRemoveRadioSiteFilter = function( newParams, category, filter ) {
    // it already exist in the list, so select the other option from radio button.
    var reponseFilterMap = appCtxService.getCtx( 'searchResponseInfo.searchFilterMap' );
    if( reponseFilterMap ) {
        // Remove everything first
        for( var i in newParams ) {
            delete newParams[ i ];
        }
        var toggledRadioFilter;
        // Now add the other value from radio filter
        _.map( reponseFilterMap, function( value, key ) {
            if( key === category ) {
                _.forEach( value, function( currentfilter ) {
                    if( currentfilter.stringValue !== filter ) {
                        newParams[ category ] = [ currentfilter.stringValue ];
                        toggledRadioFilter = true;
                    }
                } );
            }
        } );
        if( !toggledRadioFilter ) {
            newParams[ category ] = [ _local ];
        }
    }

    return newParams;
};

const addOrRemoveStringFilterInt = function( prefixedFilter, paramValue, idx ) {
    if( prefixedFilter.indexOf( filterPanelUtils.INTERNAL_KEYWORD ) !== -1 ) {
        let displayInternalValInFilter = prefixedFilter.split( filterPanelUtils.INTERNAL_KEYWORD );
        if( displayInternalValInFilter &&
            displayInternalValInFilter.length === 2 ) {
            let paramsForCurrentCategory = paramValue;
            let indexOfFoundFilter = -1;
            for( let index = 0; index < paramsForCurrentCategory.length; index++ ) {
                let displayInternalValInParam = paramsForCurrentCategory[ index ].split( filterPanelUtils.INTERNAL_KEYWORD );
                if( displayInternalValInParam && displayInternalValInParam.length === 2 ) {
                    indexOfFoundFilter = displayInternalValInParam[ 1 ].indexOf( displayInternalValInFilter[ 1 ] );
                } else {
                    indexOfFoundFilter = paramsForCurrentCategory[ index ].indexOf( displayInternalValInFilter[ 1 ] );
                }
                if( indexOfFoundFilter > -1 ) {
                    idx = index;
                    break;
                }
            }
        }
    } else {
        idx = paramValue.indexOf( prefixedFilter );
    }
    return idx;
};

/**
 * Add or remove a string filter from the newParams object. Not pure, modifies newParams.
 *
 * @param {Object} newParams - Parameter object to modify
 * @param {String} category - Internal name of the category
 * @param {String} filter - Filter value. Pass null to clear all options for category.
 * @param {Boolean} addRemoveOnly - True/false to only add/remove. Undefined will have no
 *            effect.
 * @param {String} filterType - filterType
 */
export let addOrRemoveStringFilter = function( newParams, category, filter, addRemoveOnly, filterType ) {
    // If we are removing a specific filter
    if( filter ) {
        var prefixedFilter = filter;
        // Try to find the filter in the current filters for that category
        if( filterType === 'NumericFilter' && !_.startsWith( filter, filterPanelUtils.INTERNAL_NUMERIC_FILTER ) ) {
            prefixedFilter = filterPanelUtils.INTERNAL_NUMERIC_FILTER.concat( filter );
        }
        // If the category already exists in the parameters
        if( newParams[ category ] ) {
            var idx = -1;
            idx = addOrRemoveStringFilterInt( prefixedFilter, newParams[ category ], idx );
            // If it is in the list
            if( idx !== -1 ) {
                newParams = exports.processAddOrRemoveWithFilterPresent( idx, category, addRemoveOnly, newParams );
            } else { // If it is not in the list
                // there can only be one date range/numeric filter
                if( _.startsWith( prefixedFilter, filterPanelUtils.INTERNAL_DATE_FILTER ) ) {
                    delete newParams[ category ];
                    newParams[ category ] = [];
                } else if( _.startsWith( prefixedFilter, filterPanelUtils.INTERNAL_NUMERIC_RANGE ) ) {
                    var index = _.findIndex( newParams[ category ], function( o ) {
                        return _.startsWith( o, filterPanelUtils.INTERNAL_NUMERIC_RANGE );
                    } );

                    if( index > -1 ) {
                        // Remove range from list of values
                        newParams[ category ].splice( index, 1 );
                    }
                }
                // And we are not only removing parameters
                if( addRemoveOnly !== false ) {
                    // Add it
                    newParams[ category ].push( prefixedFilter );
                }
            }
        } else { // If the category does not exist in the parameters create it and add the filter
            // Unless told to only remove parameters
            if( addRemoveOnly !== false ) {
                newParams[ category ] = [ prefixedFilter ];
            }
        }
    } else {
        // If we are removing a whole category (cannot add without filter value)
        // If the category exists and we are not only adding parameters
        exports.processAddOrRemoveWithNoFilterValue( category, addRemoveOnly, newParams );
    }
};

/**
 * Process string filter from the newParams object. Not pure, modifies newParams.
 *
 * @param {String} category - Internal name of the category
 * @param {Boolean} addRemoveOnly - True/false to only add/remove. Undefined will have no
 *            effect.
 * @param {Object} newParams - Parameter object to modify
 */
export let processAddOrRemoveWithNoFilterValue = function( category, addRemoveOnly, newParams ) {
    if( newParams[ category ] && addRemoveOnly !== true ) {
        // Delete the category
        delete newParams[ category ];
    }

    // The category may be a date filter (with additional child filters)
    for( var i in newParams ) {
        // So check if any remaining categories are that category with the date filter delimiter
        // If they are and we are not only adding parameters
        if( i.indexOf( exports._dateFilterMarker ) !== -1 &&
            i.split( exports._dateFilterMarker )[ 0 ] === category && addRemoveOnly !== true ) {
            // Remove them
            delete newParams[ i ];
        }
    }
};

/**
 * Process string filter from the newParams object. Not pure, modifies newParams.
 *
 * @param {Integer} idx - The index of prefixed filter
 * @param {String} prefixedFilter - Filter value. Pass null to clear all options for category
 * @param {String} category - Internal name of the category.
 * @param {Object} newParams - Parameter object to modify
 * @return {Integer} idx - The index of the filter
 */
export let processAddOrRemoveWithFilterNotPresent = function( idx, prefixedFilter, category, newParams ) {
    // to handle the special case of prefilter "$ME".
    var me = cdm.getUserSession().props.user.uiValues[ 0 ];
    let displayAndInternalValueArray = prefixedFilter.split( filterPanelUtils.INTERNAL_KEYWORD );
    prefixedFilter = displayAndInternalValueArray && displayAndInternalValueArray.length === 2 ? displayAndInternalValueArray[ 1 ] : prefixedFilter;
    if( me.replace( /\s/g, '' ) === prefixedFilter.replace( /\s/g, '' ) ) {
        idx = newParams[ category ].indexOf( '$ME' );
    }

    return idx;
};

/**
 * Process string filter from the newParams object. Not pure, modifies newParams.
 *
 * @param {Integer} idx - The index of prefixed filter
 * @param {String} category - Internal name of the category
 * @param {Boolean} addRemoveOnly - True/false to only add/remove. Undefined will have no
 *            effect.
 * @param {Object} newParams - Parameter object to modify
 * @return {Object} newParams - Modified Parameters
 */
export let processAddOrRemoveWithFilterPresent = function( idx, category, addRemoveOnly, newParams ) {
    // And we are not only adding parameters
    if( addRemoveOnly !== true ) {
        // Remove the filter
        newParams[ category ].splice( idx, 1 );
        // If the category is not empty delete it
        if( newParams[ category ].length === 0 ) {
            delete newParams[ category ];
        }
    }

    return newParams;
};

let removePrefilter = function( value ) {
    if( value && Array.isArray( value ) ) {
        // remove prefix from prefilter
        _.forEach( value, function( removePrefix, index, arr ) {
            if( removePrefix && !removePrefix.hasOwnProperty( 'property' ) && removePrefix.trim().length !== 0 ) {
                arr[ index ] = arr[ index ].replace( 'AW_PreFilter_', '' );
            }
        } );
    }
};

export let addOrRemoveFilter = function( category, filter, addRemoveOnly, filterType ) {
    // Get the active filters
    var newParams = exports.getFilters();

    _.forEach( newParams, function( value ) {
        removePrefilter( value );
    } );

    // Modify the filter object
    if( filterType === 'RadioFilter' ) {
        exports.addRadioSiteFilter( newParams, category, filter );
    } else if( filterType === 'ObjectFilter' ) {
        exports.addOrRemoveObjectFilter( newParams, category, filter, addRemoveOnly );
    } else if( category.indexOf( exports._dateFilterMarker ) !== -1 ) {
        exports.addOrRemoveDateFilter( newParams, category, filter, addRemoveOnly );
    } else {
        exports.addOrRemoveStringFilter( newParams, category, filter, addRemoveOnly, filterType );
    }

    // Update the parameters
    exports.setFilters( newParams );
};

export let addFilter = function( category, filter ) {
    exports.addOrRemoveFilter( category, filter, true );
};

export let removeFilter = function( category, filter ) {
    exports.addOrRemoveFilter( category, filter, false );
};

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

export let doSearch = function( targetState, searchCriteria, filters ) {
    $state_.instance.go( targetState ? targetState : '.', {
        filter: exports.buildFilterString( filters ),
        searchCriteria: searchCriteria
    } );
};

export let doSearchKeepFilter = function( targetState, searchCriteria, shapeSearchProviderActive, savedSearchUid ) {
    // If we are in Shape Search or Saved Search context we do not want to keep the filters related to
    // either when we perform this search.
    if( shapeSearchProviderActive === 'true' || savedSearchUid ) {
        $state_.instance.go( targetState ? targetState : '.', {
            filter: exports.buildFilterString( exports.getFilters( false, undefined, undefined, undefined, true ) ),
            searchCriteria: searchCriteria
        } );
    } else {
        $state_.instance.go( targetState ? targetState : '.', {
            filter: exports.buildFilterString( exports.getFilters( false ) ),
            searchCriteria: searchCriteria
        } );
    }
};

export let loadBreadcrumbClearTitle = function() {
    return localeService.getLocalizedText( 'UIMessages', 'clearBreadCrumb' );
};

export let doShapeSearch = function( targetState, searchCriteria, filter ) {
    var ctx = appCtxService.getCtx( 'searchSearch' );
    if( ctx ) {
        delete ctx.savedSearchUid;
        delete ctx.searchStringPrimary;
        if( ctx.searchStringSecondary ) {
            delete ctx.searchStringSecondary;
            eventBus.publish( 'search.clearSearchBox' );
        }
        appCtxService.updateCtx( 'searchSearch', ctx );
    }
    var shapeSearchCtx = appCtxService.getCtx( 'shapeSearch' );
    if( !shapeSearchCtx ) {
        shapeSearchCtx = {};
        appCtxService.registerCtx( 'shapeSearch', shapeSearchCtx );
    }
    var selectedCtx = appCtxService.getCtx( 'selected' );
    if( selectedCtx && selectedCtx.props && selectedCtx.props.awb0ArchetypeId && selectedCtx.props.awb0ArchetypeName ) {
        shapeSearchCtx.seedObjectItemId = selectedCtx.props.awb0ArchetypeId.uiValues[ 0 ];
        shapeSearchCtx.seedObjectItemName = selectedCtx.props.awb0ArchetypeName.uiValues[ 0 ];
    } else if( selectedCtx && selectedCtx.props && selectedCtx.props.item_id && selectedCtx.props.object_name  ) {
        shapeSearchCtx.seedObjectItemId = selectedCtx.props.item_id.uiValues[ 0 ];
        shapeSearchCtx.seedObjectItemName = selectedCtx.props.object_name.uiValues[ 0 ];
    }

    $state_.instance.go( targetState ? targetState : '.', {
        filter: filter,
        searchCriteria: searchCriteria
    } );
    return shapeSearchCtx;
};

export let loadBreadcrumbTitle = function( label, totalResultCount, selectionModel ) {
    // If no label is provided return the loading message
    var totalFound = appCtxService.getCtx( 'search.totalFound' );
    var searchString = appCtxService.getCtx( 'search.criteria.searchString' );
    if( !label || totalFound === undefined ) {
        return localeService.getLocalizedText( 'BaseMessages', 'LOADING_TEXT' );
    }
    return $q_.instance.all( {
        label: typeof label === 'string' ? $q_.instance.when( label ) : localeService.getLocalizedText( label.source, label.key ),
        selectionCountLabel: localeService.getLocalizedTextFromKey( 'XRTMessages.selectionCountLabel' ),
        noSearchResultsWithSearchBox: localeService.getLocalizedTextFromKey( 'UIMessages.noSearchResultsWithSearchBox' ),
        noSearchResults: localeService.getLocalizedTextFromKey( 'UIMessages.noSearchResults' ),
        resultsCountLabelWithSearchBox: localeService.getLocalizedTextFromKey( 'UIMessages.resultsCountLabelWithSearchBox' ),
        resultsCountLabel: localeService.getLocalizedTextFromKey( 'UIMessages.resultsCountLabel' )
    } ).then(
        function( localizedText ) {
            // If no results return the no results message
            if( totalResultCount === 0 ) {
                if( searchString ) {
                    return localizedText.noSearchResultsWithSearchBox;
                }
                return localizedText.noSearchResults.format( '', localizedText.label );
            }
            var resultsCountLabel;
            if( searchString ) {
                resultsCountLabel = localizedText.resultsCountLabelWithSearchBox.format(
                    totalResultCount );
            } else {
                resultsCountLabel = localizedText.resultsCountLabel.format(
                    totalResultCount, '', localizedText.label );
            }
            // If not in multiselect mode return the result count message
            if( !selectionModel || !selectionModel.multiSelectEnabled ) {
                return resultsCountLabel;
            }

            // Otherwise return the selection count message
            return localizedText.selectionCountLabel.format( selectionModel
                .getCurrentSelectedCount(), resultsCountLabel );
        } );
};

export let isShapeSearchContext = function() {
    let isShapeSearch = appCtxService.ctx.search && appCtxService.ctx.search.reqFilters;
    isShapeSearch = isShapeSearch && appCtxService.ctx.search.reqFilters.ShapeSearchProvider && appCtxService.ctx.search.reqFilters.ShapeSearchProvider[ 0 ] === 'true';
    return isShapeSearch;
};

export let loadInContentBreadcrumbTitle = function( label, totalResultCount, selectionModel ) {
    // If no label is provided return the loading message
    var totalFound = appCtxService.getCtx( 'search.totalFound' );
    var searchString = appCtxService.getCtx( 'search.criteria.searchString' );
    var searchInfoCtx = appCtxService.getCtx( 'searchInfo' );
    var ctxSearchSearch = appCtxService.ctx.searchSearch;
    if( !label || totalFound === undefined ) {
        return localeService.getLocalizedText( 'BaseMessages', 'LOADING_TEXT' );
    }
    return $q_.instance.all( {
        label: typeof label === 'string' ? $q_.instance.when( label ) : localeService.getLocalizedText( label.source, label.key ),
        selectionCountLabel: localeService.getLocalizedTextFromKey( 'XRTMessages.selectionCountLabel' ),
        noSearchResultsWithInContentSearch: localeService.getLocalizedTextFromKey( 'UIMessages.noSearchResultsWithInContentSearch' ),
        thresholdExceeded: localeService.getLocalizedTextFromKey( 'UIMessages.thresholdExceeded' ),
        noSearchResultsWithoutInContentSearch: localeService.getLocalizedTextFromKey( 'UIMessages.noSearchResultsWithoutInContentSearch' ),
        noSearchResults: localeService.getLocalizedTextFromKey( 'UIMessages.noSearchResults' ),
        resultsCountLabel: localeService.getLocalizedTextFromKey( 'UIMessages.resultsCountLabel' ),
        shapesCountLabelPart1: localeService.getLocalizedTextFromKey( 'UIMessages.shapesCountLabelPart1' ),
        shapesCountLabelPart2: localeService.getLocalizedTextFromKey( 'UIMessages.shapesCountLabelPart2' ),
        oneShapeCountLabelPart1: localeService.getLocalizedTextFromKey( 'UIMessages.oneShapeCountLabelPart1' ),
        resultsCountLabelWithInContentSearch: localeService.getLocalizedTextFromKey( 'UIMessages.resultsCountLabelWithInContentSearch' ),
        resultsCountLabelWithoutInContentSearch: localeService.getLocalizedTextFromKey( 'UIMessages.resultsCountLabelWithoutInContentSearch' )

    } ).then(
        function( localizedText ) {
            // If no results return the no results message
            if( totalResultCount === 0 ) {
                if( searchString ) {
                    if( ctxSearchSearch && ctxSearchSearch.searchStringSecondary && searchString === ctxSearchSearch.searchStringPrimary + ' AND ' + ctxSearchSearch.searchStringSecondary ) {
                        return localizedText.noSearchResultsWithInContentSearch.format( ctxSearchSearch.searchStringPrimary, ctxSearchSearch.searchStringSecondary );
                    }
                    if( searchInfoCtx && searchInfoCtx.thresholdExceeded === 'true' ) {
                        searchInfoCtx.noResultsFound = localizedText.thresholdExceeded.format( searchString );
                        return '';
                    }
                    return localizedText.noSearchResultsWithoutInContentSearch.format( searchString );
                }
                return localizedText.noSearchResults.format( '', localizedText.label );
            }
            var resultsCountLabel;
            if( searchString ) {
                resultsCountLabel = exports.processLoadInContentBreadcrumbTitle( ctxSearchSearch, searchString, localizedText, totalResultCount, resultsCountLabel );
            } else {
                resultsCountLabel = localizedText.resultsCountLabel.format(
                    totalResultCount, '', localizedText.label );
            }
            // If not in multiselect mode return the result count message
            if( !selectionModel || !selectionModel.multiSelectEnabled ) {
                return resultsCountLabel;
            }

            // Otherwise return the selection count message
            return localizedText.selectionCountLabel.format( selectionModel
                .getCurrentSelectedCount(), resultsCountLabel );
        } );
};

/**
 * set shape search seed object item id and name.
 * @function setShapeSearchSeedObjectItemIdName
 * @param {Object} shapeSearchCtx shape search context object
 */
export let setShapeSearchSeedObjectItemIdName = function( shapeSearchCtx ) {
    if ( !shapeSearchCtx.seedObjectItemId || !shapeSearchCtx.seedObjectItemName ) {
        var selectedCtx = appCtxService.getCtx( 'selected' );
         if( selectedCtx && selectedCtx.props && selectedCtx.props.awb0ArchetypeId && selectedCtx.props.awb0ArchetypeName ) {
             shapeSearchCtx.seedObjectItemId = selectedCtx.props.awb0ArchetypeId.uiValues[ 0 ];
             shapeSearchCtx.seedObjectItemName = selectedCtx.props.awb0ArchetypeName.uiValues[ 0 ];
         } else if( selectedCtx && selectedCtx.props ) {
             shapeSearchCtx.seedObjectItemId = selectedCtx.props.item_id.uiValues[ 0 ];
             shapeSearchCtx.seedObjectItemName = selectedCtx.props.object_name.uiValues[ 0 ];
         }
     }
};
/**
 * Process Localized text search results.
 * @function processLoadInContentBreadcrumbTitleShape
 * @param {Object} ctxSearchSearch searchString context object
 * @param {Object} searchString searchString context object
 * @param {Object} localizedText The localized text
 * @param {Object} totalResultCount Total Result count
 * @param {Object} resultsCountLabel Results Count Label
 * @return {Object} resultsCountLabel
 */
export let processLoadInContentBreadcrumbTitleShape = function( ctxSearchSearch, searchString, localizedText, totalResultCount, resultsCountLabel ) {
    var shapeSearchCtx = appCtxService.getCtx( 'shapeSearch' );
    resultsCountLabel = {};
    exports.setShapeSearchSeedObjectItemIdName( shapeSearchCtx );
    resultsCountLabel.seedObjectLink = shapeSearchCtx.seedObjectItemId + '/' + shapeSearchCtx.seedObjectItemName;
    if( ctxSearchSearch.searchStringSecondary ) {
        if( totalResultCount > 1 ) {
            resultsCountLabel.part1 = localizedText.shapesCountLabelPart1.format( totalResultCount );
            resultsCountLabel.part2 = localizedText.shapesCountLabelPart2.format( ctxSearchSearch.searchStringSecondary );
        } else {
            resultsCountLabel.part1 = localizedText.oneShapeCountLabelPart1.format( totalResultCount );
            resultsCountLabel.part2 = localizedText.shapesCountLabelPart2.format( ctxSearchSearch.searchStringSecondary );
        }
    } else {
        if( totalResultCount > 1 ) {
            resultsCountLabel.part1 = localizedText.shapesCountLabelPart1.format( totalResultCount );
        } else {
            resultsCountLabel.part1 = localizedText.oneShapeCountLabelPart1.format( totalResultCount );
        }
    }
    return resultsCountLabel;
};

/**
 * Process Localized text search results.
 * @function processLoadInContentBreadcrumbTitle
 * @param {Object} ctxSearchSearch searchString context object
 * @param {Object} searchString searchString context object
 * @param {Object} localizedText The localized text
 * @param {Object} totalResultCount Total Result count
 * @param {Object} resultsCountLabel Results Count Label
 * @return {Object} resultsCountLabel
 */
export let processLoadInContentBreadcrumbTitle = function( ctxSearchSearch, searchString, localizedText, totalResultCount, resultsCountLabel ) {
    if( exports.isShapeSearchContext() ) {
        resultsCountLabel = exports.processLoadInContentBreadcrumbTitleShape( ctxSearchSearch, searchString, localizedText, totalResultCount, resultsCountLabel );
    } else if( ctxSearchSearch && ctxSearchSearch.searchStringSecondary && searchString === ctxSearchSearch.searchStringPrimary + ' AND ' + ctxSearchSearch.searchStringSecondary ) {
        // define a variable so that the line length does not exceed 207 max-len...
        let labelText = localizedText.resultsCountLabelWithInContentSearch;
        resultsCountLabel = labelText.format( totalResultCount, ctxSearchSearch.searchStringPrimary, ctxSearchSearch.searchStringSecondary );
    } else {
        resultsCountLabel = localizedText.resultsCountLabelWithoutInContentSearch.format( totalResultCount, searchString );
    }

    return resultsCountLabel;
};

export let setFiltersFromCrumbs = function( crumbs, indexBreadCrumb ) {
    var newCrumbs = _.dropRightWhile( crumbs, function( c ) {
        return c.indexBreadCrumb > indexBreadCrumb;
    } );
    var filterMap = {};
    _.forEach( newCrumbs, function( c ) {
        if( filterMap[ c.internalName ] ) {
            filterMap[ c.internalName ].push( c.internalValue );
        } else {
            filterMap[ c.internalName ] = [ c.internalValue ];
        }
    } );
    var searchContext = appCtxService.getCtx( 'search' );
    var reqFilters = searchContext.reqFilters;
    if( reqFilters ) {
        _.forEach( reqFilters, function( value, key ) {
            if( filterMap[ key ] ) {
                filterMap[ key ].push( value );
            } else {
                filterMap[ key ] = [ value ];
            }
        } );
    }

    exports.setFilters( filterMap );
};

export let displayNoBreadCrumbProvider = function( breadcrumbConfig, label, totalResultCount, searchCriteria ) {
    var provider = {};
    $q_.instance.all( {
        noCriteriaSpecifiedMessage: localeService.getLocalizedText(
            breadcrumbConfig.noCriteriaSpecifiedMessage.source,
            breadcrumbConfig.noCriteriaSpecifiedMessage.key ),
        noResultsFoundMessage: localeService.getLocalizedText(
            breadcrumbConfig.noResultsFoundMessage.source,
            breadcrumbConfig.noResultsFoundMessage.key ),
        resultsFoundMessage: localeService.getLocalizedText(
            breadcrumbConfig.resultsFoundMessage.source,
            breadcrumbConfig.resultsFoundMessage.key )
    } ).then( function( localizedText ) {
        if( !searchCriteria ) {
            provider.title = localizedText.noCriteriaSpecifiedMessage.format();
        } else if( totalResultCount === undefined || totalResultCount === 0 ) {
            provider.title = localizedText.noResultsFoundMessage.format( label );
        } else {
            provider.title = localizedText.resultsFoundMessage.format( label );
        }
    } );

    return provider;
};

export let getBreadcrumbProvider = function() {
    return {
        crumbs: [],
        clear: function() {
            // Publish to AW analytics
            var sanEvent = {
                sanAnalyticsType: 'Commands',
                sanCommandId: 'clearSearchFilter',
                sanCommandTitle: 'Clear All Search Filters'
            };

            analyticsSvc.logNonDeclarativeCommands( sanEvent );

            var searchContext = appCtxService.getCtx( 'search' );
            var reqFilters = searchContext.reqFilters;
            if( reqFilters ) {
                exports.setFilters( reqFilters );
            } else {
                exports.setFilters( [] );
            }
        },
        onRemove: function( crumb ) {
            // Publish to analytics
            var sanEvent = {
                sanAnalyticsType: 'Commands',
                sanCommandId: 'removeSearchFilterCrumb',
                sanCommandTitle: 'Remove Crumb Filter',
                sanCmdLocation: 'primarySearchPanel'
            };

            analyticsSvc.logNonDeclarativeCommands( sanEvent );
            let isRadioFilter = false;
            if( crumb.filterType === 'RadioFilter' ) {
                exports.removeRadioSiteFilter( crumb.internalName, crumb.internalValue );
                isRadioFilter = true;
            } else if( crumb.filterType === 'StringFilter' ) {
                crumb.internalValue = crumb.value + filterPanelUtils.INTERNAL_KEYWORD + crumb.internalValue;
            }
            if( !isRadioFilter ) {
                exports.addOrRemoveFilter( crumb.internalName, crumb.internalValue, false, crumb.filterType );
            }
        },
        onSelect: function( crumb ) {
            // Publish to analytics
            var sanEvent = {
                sanAnalyticsType: 'Commands',
                sanCommandId: 'clickSearchFilterCrumb',
                sanCommandTitle: 'Click Search Filter Crumb',
                sanCmdLocation: 'primarySearchPanel'
            };

            analyticsSvc.logNonDeclarativeCommands( sanEvent );

            exports.setFiltersFromCrumbs( this.crumbs, crumb.indexBreadCrumb );
        }
    };
};

export let setBreadcrumbValue = function( newBreadcrumb ) {
    if( newBreadcrumb.internalValue && newBreadcrumb.internalValue !== '' && newBreadcrumb.internalValue === newBreadcrumb.value ) {
        var searchContext = appCtxService.getCtx( 'searchSearch' );
        if( searchContext && searchContext.originalInputCategories ) {
            var categoryId = _.findIndex( searchContext.originalInputCategories, function( aCat ) {
                return newBreadcrumb.internalName === aCat.internalName;
            } );
            if( searchContext.originalInputCategories[ categoryId ] && searchContext.originalInputCategories[ categoryId ].filterValues ) {
                if( searchContext.originalInputCategories[ categoryId ].filterValues.parentnodes ) {
                    var foundFilter = _.findIndex( searchContext.originalInputCategories[ categoryId ].filterValues.parentnodes, function( aFilter ) {
                        return newBreadcrumb.internalValue === aFilter.stringValue;
                    } );
                    newBreadcrumb.value = searchContext.originalInputCategories[ categoryId ].filterValues.parentnodes[ foundFilter ].stringDisplayValue;
                }
            }
        }
    }
};

export let setBreadcrumbDisplayName = function( newBreadcrumb, categoriesDisplayed ) {
    var foundCategory = _.findIndex( categoriesDisplayed, function( aCategory ) {
        return aCategory === newBreadcrumb.displayName;
    } );
    if( foundCategory < 0 ) {
        categoriesDisplayed.push( newBreadcrumb.displayName );
    } else {
        newBreadcrumb.displayName = '';
    }
};

export let setBreadcrumbProviderTitle = function( provider, label, totalResultCount,
    selectionModel, secondarySearchEnabled ) {
    exports.loadBreadcrumbClearTitle().then( function( result ) {
        provider.clearBreadCrumb = result;
    } );
    // Load and set the title async
    if( secondarySearchEnabled ) {
        exports.loadInContentBreadcrumbTitle( label, totalResultCount, selectionModel ).then(
            function( result ) {
                provider.title = result;
            } );
    } else {
        exports.loadBreadcrumbTitle( label, totalResultCount, selectionModel ).then(
            function( result ) {
                provider.title = result;
            } );
    }
};

export let buildBreadcrumbProvider = function( breadcrumbConfig, label, totalResultCount,
    selectionModel, searchFilterCategories, searchFilterMap, secondarySearchEnabled, searchCriteria ) {
    if( breadcrumbConfig && breadcrumbConfig.noBreadCrumb === 'true' ) {
        return exports.displayNoBreadCrumbProvider( breadcrumbConfig, label, totalResultCount, searchCriteria );
    }
    var provider = exports.getBreadcrumbProvider();

    // For each of the current search params
    var searchParams = exports.getFilters( false, true, true, true );
    var categoriesDisplayed = [];
    var indexBreadCrumb = -1;
    _.forEach( searchParams, function( value ) {
        removePrefilter( value );
    } );
    _.map( searchParams, function( value, property ) {
        // If it's a valid filter
        var index = _.findIndex( searchFilterCategories, function( o ) {
            return o.internalName === property;
        } );
        var newBreadcrumb = {};

        _.forEach( searchParams[ property ], function( filter ) {
            var origProperty = property;
            var origFilter = filterPanelUtils.getRealFilterWithNoFilterType( filter );
            var filterType = filterPanelUtils.getFilterTypeFromFilterValue( filter );
            if( !filter.hasOwnProperty( 'property' ) ) {
                let displayAndInternalValueArray = filter.split( filterPanelUtils.INTERNAL_KEYWORD );
                if( displayAndInternalValueArray && displayAndInternalValueArray.length === 2 ) {
                    filter = displayAndInternalValueArray[ 1 ];
                    origFilter = filter;
                    filterType = 'StringFilter';
                }
            }
            if( filter.hasOwnProperty( 'property' ) ) {
                origProperty = filter.property;
                origFilter = filter.filter;
            }
            if( index > -1 ) {
                // Make a breadcrumb for it
                newBreadcrumb = {
                    displayName: searchFilterCategories[ index ].displayName + ':',
                    displayNameHidden: searchFilterCategories[ index ].displayName + ':',
                    internalName: origProperty,
                    internalValue: origFilter,
                    filterType: filterType
                };
            } else if( !searchFilterCategories || searchFilterCategories &&
                searchFilterCategories.length < 1 ) {
                // Need still display the crumbs
                var categoryDisplayName = exports.getCategoryDisplayName( property );
                if( !categoryDisplayName ) {
                    return provider;
                }
                newBreadcrumb = {
                    displayName: categoryDisplayName + ':',
                    displayNameHidden: categoryDisplayName + ':',
                    internalName: property,
                    internalValue: origFilter,
                    filterType: filterType
                };
            } else {
                return provider;
            }
            provider = exports.processBreadCrumbsSearchFilters( provider, indexBreadCrumb, categoriesDisplayed, newBreadcrumb, searchFilterMap, origProperty, origFilter );
        } );
    } );
    exports.setBreadcrumbProviderTitle( provider, label, totalResultCount,
        selectionModel, secondarySearchEnabled );

    return provider;
};

/**
 * Process Breadcrumbs with Search Filters.
 * @function processBreadCrumbsSearchFilters
 * @param {Object} provider The object newBreadCrumb
 * @param {Object} indexBreadCrumb The object newBreadCrumb
 * @param {Object} categoriesDisplayed The object newBreadCrumb
 * @param {Object} newBreadcrumb The object newBreadCrumb
 * @param {Object} searchFilterMap The search filter map
 * @param {Object} origProperty Original Property
 * @param {Object} origFilter Original filter
 * @return {Object} BreadCrumd Provider
 */
export let processBreadCrumbsSearchFilters = function( provider, indexBreadCrumb, categoriesDisplayed, newBreadcrumb, searchFilterMap, origProperty, origFilter ) {
    if( searchFilterMap ) {
        newBreadcrumb.value = exports.getBreadCrumbDisplayValue( searchFilterMap[ origProperty ], origFilter );
    }

    if( newBreadcrumb.value && newBreadcrumb.value !== '' ) {
        exports.setBreadcrumbValue( newBreadcrumb );
        exports.setBreadcrumbDisplayName( newBreadcrumb, categoriesDisplayed );
        ++indexBreadCrumb;
        newBreadcrumb.indexBreadCrumb = indexBreadCrumb;
        provider.crumbs.push( newBreadcrumb );
    }

    if( newBreadcrumb.internalName === OWNING_SITE ) {
        newBreadcrumb.filterType = 'RadioFilter';
    }

    /* the OwningSite.owning_site is a property which server side filters on to return local or remote objects.
    This property does not exists in DB. It's a hardcoded value that server side expects and returns.*/
    if( newBreadcrumb.internalName === OWNING_SITE && newBreadcrumb.internalValue === _local ) {
        newBreadcrumb.showRemoveButton = false;
    } else {
        newBreadcrumb.showRemoveButton = true;
    }

    return provider;
};

// Return display name for a category
export let getCategoryDisplayName = function( property ) {
    var categoryDisplayName = '';
    // first check if it can be found in the prior search.
    var context = appCtxService.getCtx( 'searchSearch' );
    if( context && context.originalInputCategories && context.originalInputCategories.length > 0 ) {
        var index = _.findIndex( context.originalInputCategories, function( o ) {
            return o.internalName === property;
        } );
        if( index > -1 ) {
            categoryDisplayName = context.originalInputCategories[ index ].displayName;
            return categoryDisplayName;
        }
    }
    var aTypeProperty = property.split( '.' );
    if( aTypeProperty && aTypeProperty.length === 2 ) {
        var type = cmm.getType( aTypeProperty[ 0 ] );
        if( !type ) {
            // Category.category
            var catName = aTypeProperty[ 1 ];
            categoryDisplayName = catName[ 0 ].toUpperCase() + catName.slice( 1 ).toLowerCase();
        } else {
            var propName = filterPanelUtils.getPropertyFromFilter( aTypeProperty[ 1 ] );
            var pd = type.propertyDescriptorsMap[ propName ];
            if( !pd ) {
                categoryDisplayName = aTypeProperty[ 1 ];
            } else {
                categoryDisplayName = pd.displayName;
            }
        }
    }
    return categoryDisplayName;
};

export let loadConfiguration = function() {
    localeService.getLocalizedTextFromKey( 'UIMessages.noFilterValue', true ).then( result => localTextBundle.noFilterValue = result );
    localeService.getLocalizedTextFromKey( 'SearchCoreMessages.searchFilterVariableMyGroup', true ).then( result => localTextBundle.searchFilterVariableMyGroup = result );
    localeService.getLocalizedTextFromKey( 'SearchCoreMessages.searchFilterVariableThisMonth', true ).then( result => localTextBundle.searchFilterVariableThisMonth = result );
    localeService.getLocalizedTextFromKey( 'SearchCoreMessages.searchFilterVariableThisWeek', true ).then( result => localTextBundle.searchFilterVariableThisWeek = result );
    localeService.getLocalizedTextFromKey( 'dateTimeServiceMessages.currentText', true ).then( result => localTextBundle.searchFilterVariableToday = result );
};

loadConfiguration();

exports = {
    _dateFilterMarker,
    _dateFilterLevels,
    _filterSeparator,
    _filterValueSeparator,
    chooseFilterSeparator,
    buildFilterString,
    isHierarchicalChildFilter,
    parseHierarchicalChildFilters,
    getFilters,
    checkIfObjectFilterType,
    getSortedFilterMap,
    rememberCategoryFilterState,
    buildSearchFiltersInt,
    buildSearchFilters,
    getFilterStringFromActiveFilterMap,
    convertFilterMapToSavedSearchFilterMap,
    getFilterDisplayValue,
    getSpecialDisplayName,
    getLocalTextBundle,
    getBreadCrumbDisplayValue,
    processDateStringOffset,
    groupByCategory,
    setFilters,
    addOrRemoveDateFilterInt,
    addOrRemoveDateFilter,
    removeDateFilter,
    addOrRemoveObjectFilter,
    addRadioSiteFilter,
    removeRadioSiteFilter,
    addOrRemoveStringFilter,
    addOrRemoveFilter,
    addFilter,
    removeFilter,
    getFilterExtension,
    doSearch,
    doSearchKeepFilter,
    isShapeSearchContext,
    loadBreadcrumbClearTitle,
    doShapeSearch,
    loadBreadcrumbTitle,
    loadInContentBreadcrumbTitle,
    setFiltersFromCrumbs,
    displayNoBreadCrumbProvider,
    getBreadcrumbProvider,
    setBreadcrumbValue,
    setBreadcrumbDisplayName,
    setBreadcrumbProviderTitle,
    buildBreadcrumbProvider,
    getCategoryDisplayName,
    loadConfiguration,
    processAddOrRemoveWithNoFilterValue,
    processAddOrRemoveWithFilterNotPresent,
    processAddOrRemoveWithFilterPresent,
    setShapeSearchSeedObjectItemIdName,
    processLoadInContentBreadcrumbTitleShape,
    processLoadInContentBreadcrumbTitle,
    processConvertFilterMapToSavedSearchFilterMap,
    processRemoveRadioSiteFilter,
    processBreadCrumbsSearchFilters
};
export default exports;
/**
 * Marker for date filters
 *
 * @member _dateFilterMarker
 * @memberOf NgServices.searchFilterService
 */
/**
 * The hierarchy of date filters. If a filter on a higher level is removed all filters on the
 * levels below are also cleared.
 *
 * @member _dateFilterLevels
 * @memberOf NgServices.searchFilterService
 */
/**
 * The separator between filters
 *
 * @member _filterSeparator
 * @memberOf NgServices.searchFilterService
 */
/**
 * The separator between filter values
 *
 * @member _filterValueSeparator
 * @memberOf NgServices.searchFilterService
 */
/**
 * Convert a filter object to a string
 *
 * @function buildFilterString
 * @memberOf NgServices.searchFilterService
 *
 * @param {Object} filters - Filter object to convert. Keys are filter names, values are array
 *            of filter values
 *
 * @return {String} String representation of the filters
 */
/**
 * Determine if the filter is a hierachical child filter.
 * 0 level: 0/64RdN$eNqd$DyB
 * 1 level: 1/64RdN$eNqd$DyB/qyadN$eNqd$DyB
 * 2 level: 2/64RdN$eNqd$DyB/qyadN$eNqd$DyB/sUVdN$eNqd$DyB
 * we only care about 1 level and up, as the 0 level is same as string filter.
 *
 * @function isHierarchicalChildFilter
 * @memberOf NgServices.searchFilterService
 *
 * @param {String} filterString - Filter to be evaluated.
 *
 * @return {Boolean} true if it is a child filter.
 */
/**
 * parse hierachical filters which results in multiple filters from one seed filter.
 * 0 level: 0/64RdN$eNqd$DyB
 * 1 level: 1/64RdN$eNqd$DyB/qyadN$eNqd$DyB
 * 2 level: 2/64RdN$eNqd$DyB/qyadN$eNqd$DyB/sUVdN$eNqd$DyB
 * we only care about 1 level and up, as the 0 level is same as string filter.
 *
 * @function parseHierarchicalChildFilters
 * @memberOf NgServices.searchFilterService
 *
 * @param {String} filterString - Filter to be evaluated.
 *
 * @param {Boolean} keepIdentifier - Set to true to keep the filter type identifiers
 *
 * @return {Object} hierachical filter array .
 */
/**
 * Parse the 'filter' property on the state into an object.
 *
 * @function getFilters
 * @memberOf NgServices.searchFilterService
 *
 * @param {Boolean} groupByCategory - Set to true to automatically group by category
 *
 * @param {Boolean} sort - Set to true to sort the parameters
 *
 * @param {Boolean} checkHierarchy - Set to true to check for hierarchy filters
 *
 * @param {Boolean} keepHierarchyIdentifier - Set to true to keep the hierarchy identifiers
 *
 * @param {Boolean} isShapeOrSavedSearch - Set to true to skip Shape Search and Saved Search filters
 *
 *
 * @return {Object} Object where internal filter name is the key and value is the array of
 *         filters selected.
 */
/**
 * Check if a given filter category is ObjectFilter type.
 *
 * @function checkIfObjectFilterType
 * @memberOf NgServices.searchFilterService
 *
 * @param {String} filterCategoryName - Name of the filter category
 *
 * @return {Boolean} True if the filter category is of ObjectFilter type, false otherwise.
 */
/**
 * Group the filters by the actual category. Date filter properties will be merged (ex
 * MyCategory_0Z0_year and MyCategory_0Z0_week will be merged into MyCategory)
 *
 * @function getSortedFilterMap
 * @memberOf NgServices.searchFilterService
 *
 * @param {Object} params - Object where internal filter name is the key and value is the array
 *            of filters selected.
 *
 * @return {Object} Same object with date filters merged
 */
/**
 * put the current category's expand/show more/etc into context
 *
 * @function rememberCategoryFilterState
 * @memberOf NgServices.searchFilterService
 *
 * @param {Object} context - context
 */
/**
 * build search filter
 *
 * @function buildSearchFilters
 * @memberOf NgServices.searchFilterService
 *
 * @param {String} context - search context to update with active filters
 * @returns {Object} updated search context
 */
/**
 * Returns a displayable string representing the active search filter map
 *
 * @function getFilterStringFromActiveFilterMap
 * @memberOf NgServices.searchFilterService
 *
 * @param {Object} searchFilterMap - the active search filter map
 * @return {Object} Search filter string to be displayed to the user
 */
/**
 * Returns filter map to be used by save search action
 *
 * @function convertFilterMapToSearchStringFilterMap
 * @memberOf NgServices.searchFilterService
 *
 * @return {Object} Modified filter map to be used by the save search operation
 */
/**
 * Return displayble filter value
 *
 * @function getFilterDisplayValue
 * @memberOf NgServices.searchFilterService
 *
 * @param {Object} values - filter values
 * @param {String} value internal value
 * @returns {String} display value for the filter
 */
/**
 * Return display name for reserverd Search keywords
 *
 * @function getSpecialDisplayName
 * @memberOf NgServices.searchFilterService
 *
 * @param {String} value property value
 * @returns {String} display value for the property value
 */
/**
 * Return displayable breadcrumb
 *
 * @function getBreadCrumbDisplayValue
 * @memberOf NgServices.searchFilterService
 *
 * @param {Object} values - filter values
 * @param {String} value internal value
 * @param {ObjectArray} searchFilters entire set of search filters
 * @returns {String} display value for the breadcrumb
 */
/**
 * IE needs the colon character (:) to separate hour and minutes in the timezeone offset part of a date string,
 * otherwise conversion to date fails
 * This function converts 'incompatible' date strings to IE compatible date strings
 *
 * @function parseDateStringOffset
 * @memberOf NgServices.searchFilterService
 *
 * @param {String} dateString - Date string in the format - yyyy-mm-ddThh:mm:ss[offset value in minutes]
 * @returns {String} updated date string
 */
/**
 * Group the filters by the actual category. Date filter properties will be merged (ex
 * MyCategory_0Z0_year and MyCategory_0Z0_week will be merged into MyCategory)
 *
 * @function groupByCategory
 * @memberOf NgServices.searchFilterService
 *
 * @param {Object} params - Object where internal filter name is the key and value is the array
 *            of filters selected.
 *
 * @return {Object} Same object with date filters merged
 */
/**
 * Create the filter string from the filters and update the 'filter' state parameter
 *
 * @function setSearchFilters
 * @memberOf NgServices.searchFilterService
 *
 * @param {Object} params - Object where internal filter name is the key and value is the value
 */
/**
 * Add or remove a search filter. Adds the filter if it is not active, removes it if it is
 * active. If a filter is not given the same applies to the full category.
 *
 * @function addOrRemoveFilter
 * @memberOf NgServices.searchFilterService
 *
 * @param {String} category - Internal name of the category
 * @param {String} filter - Filter value. Pass null to clear all options for category.
 * @param {Boolean} addRemoveOnly - True/false to only add/remove. Undefined will have no effect.
 * @param {String} filterType - Filter type.
 */
/**
 * Add a search filter
 *
 * @function addFilter
 * @memberOf NgServices.searchFilterService
 *
 * @param {String} category - Internal name of the category
 * @param {String} filter - Filter value. Pass null to clear all options for category.
 */
/**
 * Remove a search filter
 *
 * @function removeFilter
 * @memberOf NgServices.searchFilterService
 *
 * @param {String} category - Internal name of the category
 * @param {String} filter - Filter value. Pass null to clear all options for category.
 */
/**
 * Get the extension that should be added to the internal name of the filter.
 *
 * @function getFilterExtension
 * @memberOf NgServices.searchFilterService
 *
 * @param {Object} filter - Filter object
 *
 * @return {String} The extension
 */
/**
 * Do a search with filters
 *
 * @function doSearch
 * @memberOf NgServices.searchFilterService
 *
 * @param {String} targetState - Name of the state to go to. Defaults to '.' (current state)
 * @param {String} searchCriteria - New search criteria
 * @param {Object} filters - Object where internal filter name is the key and value is the value
 */
/**
 * Do a search and keep the existing filters
 *
 * @function doSearchKeepFilter
 * @memberOf NgServices.searchFilterService
 *
 * @param {String} targetState - Name of the state to go to. Defaults to '.' (current state)
 * @param {String} searchCriteria - New search criteria
 * @param {String} shapeSearchProviderActive - Whether we are executing search within shapeSearchProvider
 * @param {String} savedSearchUid - Uid of saved search used to determine if we are executing search while in context of the saved search
 */
/**
 * Load the clear breadcrumb button title
 *
 * @function loadBreadcrumbClearTitle
 * @memberOf NgServices.searchFilterService
 *
 *
 * @return {String} The localized clearBreadCrumb link title
 */
/**
 * Do a shape search
 *
 * @function doShapeSearch
 * @memberOf NgServices.searchFilterService
 *
 * @param {String} targetState - Name of the state to go to. Defaults to '.' (current state)
 * @param {String} searchCriteria - Item Id of selected object
 * @param {String} filter - ShapeSearchProvider set to true and the Geolus Criteria (uid of
 *            selected object)
 */
/**
 * Get the title for a breadcrumb provider
 *
 * @function loadBreadcrumbTitle
 * @memberOf NgServices.searchFilterService
 *
 * @param {String|Object} label - String label of the breadcrumb or an object with the source
 *            and key of the file to load it from.
 * @param {Number} totalResultCount - The number of results found
 * @param {Object} selectionModel - Selection model to check
 * @returns {String} bread crumb title
 */
/**
 * Get the title for a breadcrumb provider
 *
 * @function loadInContentBreadcrumbTitle
 * @memberOf NgServices.searchFilterService
 *
 * @param {String|Object} label - String label of the breadcrumb or an object with the source
 *            and key of the file to load it from.
 * @param {Number} totalResultCount - The number of results found
 * @param {Object} selectionModel - Selection model to check
 * @returns {String} bread crumb title
 */
/**
 * Set new filters based on the selection in the search breadcrumbs
 *
 * @function setFiltersFromCrumbs
 * @memberOf NgServices.searchFilterService
 *
 * @param {Object} crumbs - array of crumbs
 * @param {Number} indexBreadCrumb - The index of the selected breadcrumb
 */
/**
 * Set the breadcrumb provider for the sublocations that only shows the root breadcrumb, e.g.,
 * Advanced Search where it may have its own message for "results found" and "no results found".
 *
 * @function displayNoBreadCrumbProvider
 * @memberOf NgServices.searchFilterService
 *
 * @param {Object} breadcrumbConfig - breadcrumb config
 * @param {String} label - The root message of breadcrumb
 * @param {Number} totalResultCount - The number of results found
 * @param {Object} searchCriteria - searchCriteria
 * @return {Object} The breadcrumb provider with the updated title *
 */
/**
 * Get a breadcrumb provider
 *
 * @function getBreadcrumbProvider
 * @memberOf NgServices.searchFilterService
 * @returns {Object} bread crumb provider
 */
/**
 * Set breadcrumb Value
 *
 * @function setBreadcrumbValue
 * @memberOf NgServices.searchFilterService
 *
 * @param {Object} newBreadcrumb - newBreadcrumb
 */
/**
 * Set breadcrumb display name
 *
 * @function setBreadcrumbDisplayName
 * @memberOf NgServices.searchFilterService
 *
 * @param {Object} newBreadcrumb - newBreadcrumb
 * @param {ObjectArray} categoriesDisplayed - categoriesDisplayed
 */
/**
 * Set breadcrumb provider title
 *
 * @function setBreadcrumbProviderTitle
 * @memberOf NgServices.searchFilterService
 *
 * @param {Object} provider - provider
 * @param {String|Object} label - String label of the breadcrumb or an object with the source
 *            and key of the file to load it from.
 * @param {Number} totalResultCount - The number of results found
 * @param {Object} selectionModel - Selection model to check
 * @param {Object} secondarySearchEnabled - true if secondary search is enabled
 */
/**
 * Build a breadcrumb provider
 *
 * @function buildBreadcrumbProvider
 * @memberOf NgServices.searchFilterService
 *
 * @param {Object} breadcrumbConfig - bread crumb configuration object
 * @param {String|Object} label - String label of the breadcrumb or an object with the source
 *            and key of the file to load it from.
 * @param {Number} totalResultCount - The number of results found
 * @param {Object} selectionModel - Selection model to check
 * @param {Object} searchFilterCategories - The potential categories for the filter
 * @param {Object} searchFilterMap - The search filter map
 * @param {Object} secondarySearchEnabled - true if secondary search is enabled
 * @param {Object} searchCriteria - searchCriteria
 * @returns {Object} bread crumb provider
 */
/**
 * @memberof NgServices
 * @member searchFilterService
 */
app.factory( 'searchFilterService', () => exports );

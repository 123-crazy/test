// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awp0SaveSearchUtils
 */

import app from 'app';
import appCtxService from 'js/appCtxService';
import clientDataModel from 'soa/kernel/clientDataModel';
import filterPanelUtils from 'js/filterPanelUtils';
import searchCommonUtils from 'js/searchCommonUtils';
import advancedSearchUtils from 'js/advancedSearchUtils';
import _ from 'lodash';
import ngModule from 'angular';


/**
 * Get the pinned search value from the check box in UI
 *
 * @param {boolean} pinSearchBoolVal true if pinned
 * @returns {Integer} 1 for pinned, 0 for not pinned.
 */
export let getPinSearchValue = function( pinSearchBoolVal ) {
    // If the Pin to search is not selected by user, this will be undefined value. So we want to return false
    if( pinSearchBoolVal === true || pinSearchBoolVal === 'true' ) {
        return 1;
    }
    return 0;
};

/**
 * Get the shared search value from the check box in UI
 *
 * @param {boolean} sharedSearchBoolVal true if shared
 * @returns {Integer} 1 for shared, 0 for not shared.
 */
export let getSharedSearchValue = function( sharedSearchBoolVal ) {
    // If the Allow others to view is not selected by user, this will be undefined value. So we want to return false
    if( sharedSearchBoolVal === true || sharedSearchBoolVal === 'true' ) {
        return 1;
    }
    return 0;
};

/**
 * Get the saved advanced search criteria
 *
 * @param {STRING} searchFilters searchFilters
 * @returns {Object} searchFilters.
 */
export let getSavedSearchCriteriaFromAdvancedSearch = function() {
    var criteria = [];
    var searchCriteriaMap = appCtxService.ctx.advancedSearch.searchCriteriaMap;
    if( searchCriteriaMap ) {
        for( var attribute in searchCriteriaMap ) {
            criteria.push( {
                criteriaName: searchCriteriaMap[ attribute ][ 1 ],
                criteriaValue: searchCriteriaMap[ attribute ][ 2 ],
                criteriaDisplayValue: searchCriteriaMap[ attribute ][ 3 ]
            } );
        }
    } else {
        var quickQueryAttributes = appCtxService.ctx.advancedSearch.awp0QuickQueryAttributes;
        if( quickQueryAttributes ) {
            var propertyDisplayName;
            _.forEach( quickQueryAttributes, function( eachQuickQueryAttribute ) {
                propertyDisplayName = eachQuickQueryAttribute.propertyDisplayName;
                if( propertyDisplayName ) {
                    criteria.push( {
                        criteriaName: propertyDisplayName,
                        criteriaValue: appCtxService.ctx.advancedSearch.searchFilters,
                        criteriaDisplayValue: appCtxService.ctx.advancedSearch.searchFilters
                    } );
                }
            } );
        }
    }
    return criteria;
};

/**
 * Get the saved advanced search criteria
 *
 * @param {STRING} searchFilters searchFilters
 * @returns {Object} searchFilters.
 */
export let getSavedSearchCriteriaFromSavedAdvSearch = function() {
    var criteria = [];
    var props = appCtxService.ctx.selected.props;
    for( var i = 0; i < props.savedsearch_attr_names.dbValues.length; i++ ) {
        criteria.push( {
            criteriaName: props.savedsearch_attr_names.uiValues[ i ],
            criteriaValue: props.savedsearch_attr_values.dbValues[ i ],
            criteriaDisplayValue: props.savedsearch_attr_values.uiValues[ i ]
        } );
    }

    return criteria;
};

/**
 * getInputs
 *
 * @param {ViewModel} selectedModelObject selectedModelObject
 * @param {String} uid uid
 * @param {String} selectedCtx selectedCtx
 * @returns {Object} Inputs for the function defined in JSON
 */
export let getInputs = function( selectedModelObject, uid, selectedCtx ) {
    var searchFilterMap = {};
    var savedSearchContext = appCtxService.getCtx( 'savedSearch' );
    if( savedSearchContext ) {
        searchFilterMap = savedSearchContext.savedSearchFilterMap;
    }
    if( selectedCtx ) {
        var chartOnValue = selectedCtx.props.awp0ChartOn.dbValues[ 0 ];
    }

    return [ {
        pinSearch: selectedModelObject.pinToHome.dbValue === true || selectedModelObject.pinToHome.dbValue === 'true' ? 1 : 0,
        propInfo: [ {
            properties: [ {
                name: 'object_name',
                values: [ selectedModelObject.searchName.dbValue ]
            } ],
            object: {
                uid: uid
            }
        } ],
        receiveNotification: 0,
        shareSavedSearch: selectedModelObject.shareSavedSearch.dbValue === true || selectedModelObject.shareSavedSearch.dbValue === 'true' ? 1 : 0,
        searchFilterMap: searchFilterMap,
        chartInputParameters: {
            chartOn: chartOnValue
        }
    } ];
};
/**
 * getSavedAdvSearchInputs
 *
 * @param {ViewModel} data data
 * @returns {Object} Inputs for the function defined in JSON
 */
export let getSavedAdvSearchInputs = function( data ) {
    return [ {
        stringValueInputKeyValuePairs: {
            savedSearchName: data.searchName.dbValue,
            referencingSavedQuery: data.referencingSavedQuery.dbValue
        },
        boolValueInputKeyValuePairs: {
            pinToHome: Boolean( data.pinToHome.dbValue === true || data.pinToHome.dbValue === 'true' ),
            override: false,
            shareSavedSearch: Boolean( data.shareSavedSearch.dbValue === true || data.shareSavedSearch.dbValue === 'true' ),
            favorite: Boolean( data.favorite.dbValue === true || data.favorite.dbValue === 'true' )
        },
        savedSearchCriteria: exports.getSavedSearchCriteriaFromAdvancedSearch()
    } ];
};

/**
 * getEditSavedAdvSearchInputs
 *
 * @param {ViewModel} data data
 * @param {String} mode mode
 * @returns {Object} Inputs for the function defined in JSON
 */
export let getEditSavedAdvSearchInputs = function( data, mode ) {
    var baseInputs = [ {
        stringValueInputKeyValuePairs: {
            savedSearchName: data.searchName.dbValue
        },
        boolValueInputKeyValuePairs: {
            pinToHome: Boolean( data.pinToHome.dbValue === true || data.pinToHome.dbValue === 'true' ),
            override: false,
            shareSavedSearch: Boolean( data.shareSavedSearch.dbValue === true || data.shareSavedSearch.dbValue === 'true' ),
            favorite: Boolean( data.favorite.dbValue === true || data.favorite.dbValue === 'true' )
        }
    } ];
    if( mode === 'SaveAndModify' ) {
        baseInputs[ 0 ].stringValueInputKeyValuePairs.savedSearchUid = appCtxService.ctx.selected.uid;
    } else {
        baseInputs[ 0 ].stringValueInputKeyValuePairs.referencingSavedQuery = appCtxService.ctx.selected.props.savedsearch_query.dbValues[ 0 ];
        baseInputs[ 0 ].savedSearchCriteria = exports.getSavedSearchCriteriaFromSavedAdvSearch();
        if( mode === 'SaveAndCreate' ) {
            // no op
        } else if( mode === 'Overwrite' ) {
            baseInputs[ 0 ].boolValueInputKeyValuePairs.override = true;
        } else {
            // no op
        }
    }
    return baseInputs;
};
/**
 * Return filter string to be used by search
 *
 * @param {Object} filterMap filterMap
 * @return {String} filterString
 */
export let buildFilterString = function( filterMap ) {
    var filterString = '';
    _.forEach( filterMap, function( value, key ) {
        // do something here
        filterString += key;
        filterString += '=';
        var firstValue = true;
        for( var i = 0; i < value.length; i++ ) {
            if( !firstValue ) {
                filterString += '^';
            }
            filterString += value[ i ].stringValue;
            firstValue = false;
        }
        filterString += '~';
    } );

    return filterString;
};

/**
 * Return filter map to be used by search
 *
 * @param {Object} savedSearchObject savedSearchObject
 * @return {Object} searchFilterMap
 */
export let getFilterMap = function( savedSearchObject ) {
    var searchFilterMap = {};
    var filterUIDs = savedSearchObject.props.awp0string_filters.dbValues;
    if( filterUIDs && filterUIDs.length > 0 ) {
        for( var i = 0; i < filterUIDs.length; i++ ) {
            var filterObject = clientDataModel.getObject( filterUIDs[ i ] );
            var key = filterObject.props.awp0filter_name.dbValues[ 0 ];
            var value = filterObject.props.awp0value.dbValues[ 0 ];

            var filters = [];
            if( searchFilterMap[ key ] === undefined ) {
                filters.push( value );
                searchFilterMap[ key ] = filters;
            } else {
                filters = searchFilterMap[ key ];
                filters.push( value );
                searchFilterMap[ key ] = filters;
            }
        }
    }
    return searchFilterMap;
};

/**
 * getQueryParametersMap
 * @function getQueryParametersMap
 * @param {Object} savedSearchObject savedSearchObject - the selected saved search object
 * @param {Object} savedQueryProps savedQueryProps - the saved query props info
 * @return {Object} queryParametersMap - a map containing saved query parameters
 */
export let getQueryParametersMap = function( savedSearchObject, savedQueryProps ) {
    var queryParametersMap = {};
    var savedSearchAttributeNames = savedSearchObject.props.savedsearch_attr_names.dbValues;
    var savedSearchAttributeValues = savedSearchObject.props.savedsearch_attr_values.dbValues;
    var savedQueryCriteriaUID = savedSearchObject.props.saved_search_criteria.dbValues[ 0 ];
    var bo = clientDataModel.getObject( savedQueryCriteriaUID );
    var savedSearchAttributeDisplayValues = _.cloneDeep( bo.props.fnd0AttributeDisplayValues.dbValues );
    for( let index = 0; index < savedSearchAttributeDisplayValues.length; index++ ) {
        let propertyName = savedQueryProps[ savedSearchAttributeNames[ index ] ];
        if( propertyName && propertyName.propertyDescriptor.lovCategory === 1 ) {
            let displayValues = savedSearchAttributeDisplayValues[ index ].split( advancedSearchUtils._delimiterForArray );
            let internalValues = savedSearchAttributeValues[ index ].split( advancedSearchUtils._delimiterForArray );
            for( let index2 = 0; index2 < displayValues.length; index2++ ) {
                displayValues[ index2 ] = displayValues[ index2 ] + advancedSearchUtils.INTERNAL_KEYWORD + internalValues[ index2 ];
            }
            savedSearchAttributeDisplayValues[ index ] = displayValues.join( advancedSearchUtils._delimiterForArray );
        }
    }

    queryParametersMap[ savedSearchObject.props.savedsearch_query.dbValue ] = savedSearchObject.props.savedsearch_query.uiValues[ 0 ];
    for( var j = 0; j < savedSearchAttributeNames.length; j++ ) {
        var key = savedSearchAttributeNames[ j ];
        var value = savedSearchAttributeDisplayValues[ j ];
        queryParametersMap[ key ] = value;
    }
    return queryParametersMap;
};

export let getSavedSearchFilterFromFilterUid = function( filterUID, searchFilterMap, savedSearchFilterMap ) {
    var filterObject = clientDataModel.getObject( filterUID );
    var key = filterObject.props.awp0filter_name.dbValues[ 0 ];
    var value = filterObject.props.awp0value.dbValues[ 0 ];

    var filter = {};
    var savedSearchFilter = {};
    filter.searchFilterType = 'SearchStringFilter';
    savedSearchFilter.searchFilterType = 'SearchStringFilter';
    filter.stringValue = value;
    savedSearchFilter.stringValue = value;
    var dateFilter = filterPanelUtils.INTERNAL_DATE_FILTER;
    if( _.startsWith( value, dateFilter ) ) {
        filter = filterPanelUtils.getDateRangeFilter( value.substring( 12, value.length ) );
    } else if( _.startsWith( value, filterPanelUtils.INTERNAL_NUMERIC_FILTER ) ) {
        filter = filterPanelUtils.getNumericRangeFilter( value.substring( 15, value.length ) );
    } else if( _.startsWith( value, filterPanelUtils.NUMERIC_FILTER ) ) {
        filter.startNumericValue = parseFloat( value );
        filter.endNumericValue = parseFloat( value );
    }

    var filters = [];
    var savedSearchFilters = [];
    if( searchFilterMap[ key ] === undefined ) {
        filters.push( filter );
        savedSearchFilters.push( savedSearchFilter );
        searchFilterMap[ key ] = filters;
        savedSearchFilterMap[ key ] = savedSearchFilters;
    } else {
        filters = searchFilterMap[ key ];
        filters.push( filter );
        savedSearchFilters = savedSearchFilterMap[ key ];
        savedSearchFilters.push( savedSearchFilter );
        searchFilterMap[ key ] = filters;
        savedSearchFilterMap[ key ] = savedSearchFilters;
    }
};

export let initializeSavedSearchContext = function( searchFilterMap, savedSearchFilterMap, filterDisplayString, isPinned, isFavorite, isShared, savedSearchObject, chartOnPropertyDisplayName ) {
    // Initialize the search context if necessary
    var savedSearchContext = ngModule.copy( appCtxService.getCtx( 'savedSearch' ) );
    savedSearchContext = savedSearchContext ? savedSearchContext : {};
    savedSearchContext.searchFilterMap = searchFilterMap;
    savedSearchContext.savedSearchFilterMap = savedSearchFilterMap;
    savedSearchContext.filterDisplayString = filterDisplayString;
    savedSearchContext.filterString = exports.buildFilterString( savedSearchFilterMap );
    savedSearchContext.pinned = isPinned;
    savedSearchContext.favorite = isFavorite;
    savedSearchContext.shared = isShared;
    savedSearchContext.searchName = savedSearchObject.props.object_name.dbValues[ 0 ];
    savedSearchContext.searchCriteria = savedSearchObject.props.awp0search_string.dbValues[ 0 ];
    savedSearchContext.chartOnDisplayValue = chartOnPropertyDisplayName;
    return savedSearchContext;
};

/**
 * Returns the actual searchFilterCategories.
 *
 * @function getActualSearchFilterCategories
 * @param {ViewModel} data data
 * @return {ObjectArray} actual searchFilterCategories
 */
export let getActualSearchFilterCategories = function( data ) {
    return data.searchFilterCategories;
};

/**
 * Update filter map
 *
 * @function updateFilterMap
 * @param {Object}filterMap - filterMap
 * @return {Object} Updated Filter Map
 */
export let updateFilterMap = function( filterMap ) {
    var cloneOfFilterMap = JSON.parse( JSON.stringify( filterMap ) );
    var prop = {};
    prop = cloneOfFilterMap ? cloneOfFilterMap : prop;

    var toggleColorContext = appCtxService.getCtx( 'filterColorToggleCtx' );
    if( toggleColorContext ) {
        appCtxService.updateCtx( 'filterColorToggleCtx', false );
    } else {
        appCtxService.registerCtx( 'filterColorToggleCtx', false );
    }

    return prop;
};

/**
 * isPinToHome
 *
 * @function isPinToHome
 * @param {Object}pinToHome - pinToHome
 * @returns {BOOLEAN} true if pinToHome.
 */
export let isPinToHome = function( pinToHome ) {
    if( pinToHome === '' || pinToHome === null || pinToHome === undefined ) {
        return false;
    }
    return JSON.parse( pinToHome );
};

/**
 * isShareSavedSearch
 * @function isShareSavedSearch
 * @param {Object}shareSavedSearch - shareSavedSearch
 * @returns {BOOLEAN} true if shareSavedSearch.
 */
export let isShareSavedSearch = function( shareSavedSearch ) {
    if( shareSavedSearch === '' || shareSavedSearch === null || shareSavedSearch === undefined ) {
        return false;
    }
    return JSON.parse( shareSavedSearch );
};

/**
 * isFavorite
 * @function isFavorite
 * @param {Object}favorite - favorite
 * @returns {BOOLEAN} true if favorite.
 */
export let isFavorite = function( favorite ) {
    if( favorite === '' || favorite === null || favorite === undefined ) {
        return false;
    }
    return JSON.parse( favorite );
};

/**
 * Get the default page size used for max to load/return.
 *
 * @param {Array|Object} defaultPageSizePreference - default page size from server preferences
 * @returns {Number} The amount of objects to return from a server SOA response.
 */
export let getDefaultPageSize = function( defaultPageSizePreference ) {
    return searchCommonUtils.getDefaultPageSize( defaultPageSizePreference );
};

/**
 * reset chart settings for saved search sublocation.
 *
 */
export let resetForSavedSearchSublocation = function() {
    var chartProvider = appCtxService.getCtx( 'chartProvider' );
    if( chartProvider ) {
        appCtxService.updatePartialCtx( 'chartProvider', null );
    }
};

/* eslint-disable-next-line valid-jsdoc*/

const exports = {
    getPinSearchValue,
    getSharedSearchValue,
    getSavedSearchCriteriaFromAdvancedSearch,
    getSavedSearchCriteriaFromSavedAdvSearch,
    getInputs,
    getSavedAdvSearchInputs,
    getEditSavedAdvSearchInputs,
    buildFilterString,
    getFilterMap,
    getQueryParametersMap,
    getSavedSearchFilterFromFilterUid,
    initializeSavedSearchContext,
    getActualSearchFilterCategories,
    updateFilterMap,
    isPinToHome,
    isShareSavedSearch,
    isFavorite,
    getDefaultPageSize,
    resetForSavedSearchSublocation
};

export default exports;

/**
 * @memberof NgServices
 * @member Awp0SaveSearchUtils
 */
app.factory( 'Awp0SaveSearchUtils', () => exports );

// @<COPYRIGHT>@
// ==================================================
// Copyright 2015.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awp0SaveSearchService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import clientDataModel from 'soa/kernel/clientDataModel';
import saveSearchUtils from 'js/Awp0SaveSearchUtils';
import searchFilterSvc from 'js/aw.searchFilter.service';
import advancedSearchSvc from 'js/advancedSearchService';
import advancedSearchUtils from 'js/advancedSearchUtils';
import soaService from 'soa/kernel/soaService';
import _ from 'lodash';
import ngModule from 'angular';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import AwStateService from 'js/awStateService';


var SEARCH_NAME_TOKEN = 'teamcenter_search_search';
var ADVANCED_SEARCH_NAME_TOKEN = 'teamcenter_search_advancedSearch';

export let updateSavedSearchContext = function( savedSearchObject, data ) {
    var serverCommandVisibility = appCtxService.getCtx( 'serverCommandVisibility' );

    if( savedSearchObject === undefined || savedSearchObject === null || !serverCommandVisibility ||
        !serverCommandVisibility.soaCallFinished ) {
        return;
    }
    if( savedSearchObject.type === 'Awp0FullTextSavedSearch' ) {
        // if the saved search object type is Full Text Saved Search
        exports.updateSavedFullTextSearchContext( savedSearchObject );
    } else if( savedSearchObject.type === 'SavedSearch' ) {
        // if the saved search object type is Advanced Saved Search
        exports.updateSavedAdvSearchContext( savedSearchObject, data );
    }
};

/**
 * updateFullTextSavedSearchContext
 *
 * @param {ViewModel} savedSearchObject Full Text Saved search object
 */
export let updateSavedFullTextSearchContext = function( savedSearchObject ) {
    var searchFilterMap = {};
    var savedSearchFilterMap = {};

    var filterUIDs = savedSearchObject.props.awp0string_filters.dbValues;
    for( var i = 0; i < filterUIDs.length; i++ ) {
        saveSearchUtils.getSavedSearchFilterFromFilterUid( filterUIDs[ i ], searchFilterMap, savedSearchFilterMap );
    }

    var filterArray = savedSearchObject.props.awp0SearchFilterArray.dbValues;
    var filterDisplayString = '';
    for( i = 0; i < filterArray.length; i++ ) {
        filterDisplayString += filterArray[ i ];
        if( i + 1 < filterArray.length ) {
            filterDisplayString += ', ';
        }
    }

    var chartOnProperty = savedSearchObject.props.awp0ChartOn.uiValues[ 0 ];
    var chartOnPropertyDisplayName = searchFilterSvc.getCategoryDisplayName( chartOnProperty );

    var isPinned = false;
    var serverCommandVisibility = appCtxService.getCtx( 'visibleServerCommands' );
    if( serverCommandVisibility !== null && serverCommandVisibility.Awp0UnpinSearch ) {
        isPinned = true;
    }
    var selectedCtx = appCtxService.getCtx( 'selected' );
    var isFavorite = false;
    if( appCtxService.ctx.visibleServerCommands && appCtxService.ctx.visibleServerCommands.Awp0UnfavoriteSearch ) {
        isFavorite = true;
    }

    var isShared = false;
    if( selectedCtx !== null && selectedCtx.props.awp0is_global_shared.uiValues[ 0 ] === 'True' ) {
        isShared = true;
    }

    // Initialize the search context if necessary
    var savedSearchContext = saveSearchUtils.initializeSavedSearchContext( searchFilterMap, savedSearchFilterMap, filterDisplayString,
        isPinned, isFavorite, isShared, savedSearchObject, chartOnPropertyDisplayName );

    // If context has changed, update it
    var contextChanged = !ngModule.equals( appCtxService.getCtx( 'savedSearch' ), savedSearchContext );
    if( contextChanged ) {
        appCtxService.registerCtx( 'savedSearch', savedSearchContext );
    }
};

/**
 * updateAdvancedSavedSearchContext
 *
 * @param {ViewModel} savedSearchObject - Advanced Saved search object
 * @param {Object} data - view model data
 */
export let updateSavedAdvSearchContext = function( savedSearchObject, data ) {
    var awp0AdvancedQueryName = savedSearchObject.props.savedsearch_query;
    awp0AdvancedQueryName.propertyName = 'awp0AdvancedQueryName';
    awp0AdvancedQueryName.isEnabled = true;
    awp0AdvancedQueryName.dbValue = awp0AdvancedQueryName.dbValues[ 0 ];

    var savedQuery = savedSearchObject.props.savedsearch_query.uiValues[ 0 ];
    appCtxService.registerCtx( 'savedQuery', savedQuery );

    var savedQueryCriteriaUID = savedSearchObject.props.saved_search_criteria.dbValues[ 0 ];
    var savedQueryCriteriaObject = clientDataModel.getObject( savedQueryCriteriaUID );
    var savedSearchAttributeDisplayValues = savedQueryCriteriaObject.props.fnd0AttributeDisplayValues.dbValues;
    savedSearchObject.props.savedsearch_attr_values.uiValues = savedSearchAttributeDisplayValues;

    var panelData = {};
    panelData.searchName = savedSearchObject.props.object_name.dbValues[ 0 ];
    panelData.referencingSavedQuery = savedSearchObject.props.savedsearch_query.uiValues[ 0 ];
    var request2 = {
        selectedQuery: {
            uid: savedSearchObject.props.savedsearch_query.dbValues[ 0 ],
            type: 'ImanQuery'
        }
    };
    soaService.post( 'Internal-AWS2-2016-12-AdvancedSearch', 'getSelectedQueryCriteria', request2 ).then(
        function( response2 ) {
            var modelObject = clientDataModel.getObject( response2.advancedQueryCriteria.uid );
            var props = advancedSearchSvc.getRealProperties( modelObject, null, null, 'Advanced' );

            var savedSearchCriteria = '';
            for( var i = 0; i < savedSearchObject.props.savedsearch_attr_names.dbValues.length; i++ ) {
                try {
                    savedSearchObject.props.savedsearch_attr_names.uiValues[ i ] = props[ savedSearchObject.props.savedsearch_attr_names.dbValues[ i ] ].propertyDescriptor.displayName;
                    savedSearchCriteria = savedSearchCriteria + savedSearchObject.props.savedsearch_attr_names.uiValues[ i ] + '=' +
                        savedSearchObject.props.savedsearch_attr_values.uiValues[ i ] + ';';
                } catch ( e ) {
                    logger.info( savedSearchObject.props.savedsearch_attr_names.dbValues[ i ] +
                        ' attribute does not exist in the list of attributes defined for the ' +
                        savedSearchObject.props.savedsearch_query.uiValues[ 0 ] + ' saved query' );
                }
            }
            panelData.savedSearchCriteria = savedSearchCriteria;
            panelData.shared = savedSearchObject.props.shared.dbValues[ 0 ] === '1';
            var serverCommandVisibility = appCtxService.getCtx( 'visibleServerCommands' );
            if( serverCommandVisibility !== null && serverCommandVisibility.Awp0UnpinSearch ) {
                panelData.pinned = true;
            }
            if( appCtxService.ctx.visibleServerCommands && appCtxService.ctx.visibleServerCommands.Awp0UnfavoriteSearch ) {
                panelData.favorite = true;
            }
            appCtxService.registerCtx( 'savedAdvSearch', panelData );
            var awp0AdvancedQueryAttributesPopulated = saveSearchUtils.getQueryParametersMap( savedSearchObject, props );
            var advancedSearchContext = {
                awp0AdvancedQueryName: awp0AdvancedQueryName,
                awp0AdvancedQueryAttributesPopulated: awp0AdvancedQueryAttributesPopulated
            };

            data.awp0AdvancedQueryName = advancedSearchContext.awp0AdvancedQueryName;
            data.awp0AdvancedQueryAttributesPopulated = advancedSearchContext.awp0AdvancedQueryAttributesPopulated;

            appCtxService.registerCtx( 'advancedSavedSearch', advancedSearchContext );
            advancedSearchSvc.getReviewAndExecuteViewModel( data, response2 );
        } );
};

/**
 * executeSavedSearch
 * @function execSavedSearch
 * @param {ViewModel} vmo view model object
 */
export let executeSavedSearch = function( vmo ) {
    if( vmo.type === 'Awp0FullTextSavedSearch' ) {
        // if the saved search object type is Full Text Saved Search
        exports.executeFullTextSavedSearch( vmo );
    } else if( vmo.type === 'SavedSearch' ) {
        // if the saved search object type is Advanced Saved Search
        exports.executeAdvancedSavedSearch( vmo );
    }
};

/**
 * executeFullTextSavedSearch
 * @function execFullTextSavedSearch
 * @param {Object}vmo - the view model object
 */
export let executeFullTextSavedSearch = function( vmo ) {
    var criteria = vmo.props.awp0search_string.dbValue;
    var savedSearchLocale = vmo.props.awp0SavedSearchLocale.dbValue ? vmo.props.awp0SavedSearchLocale.dbValue : '';
    var savedSearchCtx = appCtxService.getCtx( 'savedSearch' );
    savedSearchCtx = savedSearchCtx ? savedSearchCtx : {};
    savedSearchCtx.savedSearchUid = vmo.uid;
    appCtxService.updateCtx( 'savedSearch', savedSearchCtx );

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
    var filterMap = saveSearchUtils.getFilterMap( vmo );
    var context = {
        source: 'globalSearch',
        criteria: criteria,
        filterMap: filterMap
    };

    if( appCtxService.ctx.searchChart !== undefined ) {
        var searchChart = {
            categoryToChartOn: vmo.props.awp0ChartOn.dbValues[ 0 ]
        };
        appCtxService.updateCtx( 'searchChart', searchChart );
    }
    //Capture that the search was executed from saved search for threshold behavior
    var searchInfoCtx = appCtxService.getCtx( 'searchInfo' );
    if( !searchInfoCtx ) {
        searchInfoCtx = {};
    }
    searchInfoCtx.savedSearch = true;
    appCtxService.registerCtx( 'searchInfo', searchInfoCtx );

    eventBus.publish( 'search.doSearch', context );
    AwStateService.instance.go( SEARCH_NAME_TOKEN, {
        filter: searchFilterSvc.buildFilterString( filterMap ),
        searchCriteria: criteria,
        savedSearchLocale: savedSearchLocale
    } );
};

/**
 * execAdvancedSavedSearch
 * @function execAdvancedSavedSearch
 * @param {Object}vmo - the view model object
 */
export let executeAdvancedSavedSearch = function( vmo ) {
    var awp0AdvancedQueryName = vmo.props.savedsearch_query;
    awp0AdvancedQueryName.propertyName = 'awp0AdvancedQueryName';
    var props;
    var request2 = {
        selectedQuery: {
            uid: vmo.props.savedsearch_query.dbValues[ 0 ],
            type: 'ImanQuery'
        }
    };
    soaService.post( 'Internal-AWS2-2016-12-AdvancedSearch', 'getSelectedQueryCriteria', request2 ).then(
        function( response2 ) {
            var modelObject = clientDataModel.getObject( response2.advancedQueryCriteria.uid );
            props = advancedSearchSvc.getRealProperties( modelObject, null, null, 'Advanced' );

            for( var i = 0; i < vmo.props.savedsearch_attr_names.dbValues.length; i++ ) {
                try {
                    vmo.props.savedsearch_attr_names.uiValues[ i ] = props[ vmo.props.savedsearch_attr_names.dbValues[ i ] ].propertyDescriptor.displayName;
                } catch ( e ) {
                    logger.info( vmo.props.savedsearch_attr_names.dbValues[ i ] +
                        ' attribute does not exist in the list of attributes defined for the ' +
                        vmo.props.savedsearch_query.uiValues[ 0 ] + ' saved query' );
                }
            }
        } ).then( function() {
            var awp0AdvancedQueryAttributes = saveSearchUtils.getQueryParametersMap( vmo, props );
            var advancedSearchContext = {
                awp0AdvancedQueryName: awp0AdvancedQueryName,
                awp0AdvancedQueryAttributes: awp0AdvancedQueryAttributes
            };
            var searchType = 'Advanced';
            appCtxService.updateCtx( 'advancedSearch', advancedSearchContext );
            advancedSearchSvc.doAdvancedSavedSearch( ADVANCED_SEARCH_NAME_TOKEN, searchType, awp0AdvancedQueryName, awp0AdvancedQueryAttributes );
    } );
};

/**
 * reviewAndExecuteAdvancedSavedSearch
 * @function reviewAndExecuteAdvancedSavedSearch
 * @param {Object}ctx - the view model data from the context
 */
export let reviewAndExecuteAdvancedSavedSearch = function( ctx ) {
    var savedQueryAttributes = ctx.advancedSavedSearch.awp0AdvancedQueryAttributes;
    var savedQueryParametersMap = {};
    savedQueryParametersMap[ ctx.advancedSavedSearch.awp0AdvancedQueryName.dbValue ] = ctx.advancedSavedSearch.awp0AdvancedQueryName.uiValues[ 0 ];
    savedQueryParametersMap = advancedSearchUtils.populateSavedQueryParametersMap( savedQueryAttributes, savedQueryParametersMap );
    var searchType = 'Advanced';
    var advancedSearchCtx = appCtxService.getCtx( 'advancedSearch' );
    if( advancedSearchCtx && advancedSearchCtx.awp0QuickSearchName !== undefined ) {
        delete advancedSearchCtx.awp0QuickSearchName;
        appCtxService.updatePartialCtx( 'advancedSearch.awp0QuickSearchName', undefined );
    }
    advancedSearchSvc.doAdvancedSavedSearch( ADVANCED_SEARCH_NAME_TOKEN, searchType, ctx.advancedSavedSearch.awp0AdvancedQueryName, savedQueryParametersMap );
};

/* eslint-disable-next-line valid-jsdoc*/

const exports = {
    updateSavedSearchContext,
    updateSavedFullTextSearchContext,
    updateSavedAdvSearchContext,
    executeSavedSearch,
    executeFullTextSavedSearch,
    executeAdvancedSavedSearch,
    reviewAndExecuteAdvancedSavedSearch
};

export default exports;

/**
 * @memberof NgServices
 * @member Awp0SaveSearchService
 */
app.factory( 'Awp0SaveSearchService', () => exports );

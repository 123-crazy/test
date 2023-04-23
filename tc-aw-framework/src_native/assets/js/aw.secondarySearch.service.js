// Copyright (c) 2020 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/aw.secondarySearch.service
 * @requires js/filterPanelUtils
 */
import app from 'app';
import AwStateService from 'js/awStateService';
import appCtxService from 'js/appCtxService';
import searchFilterSvc from 'js/aw.searchFilter.service';
import 'angular';
import analyticsSvc from 'js/analyticsService';

var exports = {};
var incontentSearchForSS1;
var finalSearchCriteria;

export let processInContentString = function( searchCriteria, shapeSearchProviderActive, savedSearchUid, ctxSearchSearch, shapeSearchCtx ) {
    if( shapeSearchProviderActive === 'true' || savedSearchUid && shapeSearchCtx ) {
        finalSearchCriteria = shapeSearchCtx.seedObjectName;
        incontentSearchForSS1 = searchCriteria;
    } else {
        finalSearchCriteria = ctxSearchSearch.searchStringPrimary + ' AND ' + ctxSearchSearch.searchStringSecondary;
    }
    return finalSearchCriteria;
};
export let doInContentSearchKeepFilterIntPostWithSecondary = function( searchCriteria, shapeSearchProviderActive, savedSearchUid, ctxSearchSearch, shapeSearchCtx, ctxCriteria ) {
    // already has secondary searchString, this is to revise the secondary searchString
    if( searchCriteria === '' || searchCriteria.trim() === '' ) {
        finalSearchCriteria = ctxSearchSearch.searchStringPrimary;
        delete ctxSearchSearch.searchStringPrimary;
        delete ctxSearchSearch.searchStringSecondary;
        appCtxService.updateCtx( 'searchSearch', ctxSearchSearch );
    } else {
        ctxSearchSearch.searchStringSecondary = searchCriteria;
        exports.processInContentString( searchCriteria, shapeSearchProviderActive, savedSearchUid, ctxSearchSearch, shapeSearchCtx );
    }
};

export let doInContentSearchKeepFilterIntPost = function( searchCriteria, shapeSearchProviderActive, savedSearchUid, ctxSearchSearch, shapeSearchCtx, ctxCriteria ) {
    // the searchCriteria that's passed in is secondary searchString and should be stored as such.
    if( ctxSearchSearch.searchStringSecondary ) {
        exports.doInContentSearchKeepFilterIntPostWithSecondary( searchCriteria, shapeSearchProviderActive, savedSearchUid, ctxSearchSearch, shapeSearchCtx, ctxCriteria );
    } else if( incontentSearchForSS1 !== '*' ) {
        // first time secondary searchString
        ctxSearchSearch.searchStringPrimary = ctxCriteria.searchString;
        ctxSearchSearch.searchStringSecondary = searchCriteria;
        exports.processInContentString( searchCriteria, shapeSearchProviderActive, savedSearchUid, ctxSearchSearch, shapeSearchCtx );
    }
};

export let doInContentSearchKeepFilterInt = function( searchCriteria, shapeSearchProviderActive, savedSearchUid, ctxSearchSearch, shapeSearchCtx, ctxCriteria ) {
    if( !ctxSearchSearch.searchStringSecondary && ( searchCriteria === '' || searchCriteria.trim() === '' ) ) {
        if( shapeSearchProviderActive === 'true' || savedSearchUid && shapeSearchCtx ) {
            finalSearchCriteria = shapeSearchCtx.seedObjectName;
            incontentSearchForSS1 = '';
        } else {
            return;
        }
    }
    exports.doInContentSearchKeepFilterIntPost( searchCriteria, shapeSearchProviderActive, savedSearchUid, ctxSearchSearch, shapeSearchCtx, ctxCriteria );
};

export let processShapeSearch = function( targetState, shapeSearchCtx ) {
    let filterMap = searchFilterSvc.getFilters( false, undefined, undefined, undefined, true );
    if( incontentSearchForSS1 && incontentSearchForSS1.length > 0 ) {
        filterMap.searchStringInContent = [ incontentSearchForSS1 ];
    } else {
        delete filterMap.searchStringInContent;
    }
    filterMap.ShapeSearchProvider = [ 'true' ];
    filterMap[ 'Geolus Criteria' ] = [ shapeSearchCtx.geolusCriteria ];
    incontentSearchForSS1 = '';
    AwStateService.instance.go( targetState ? targetState : '.', {
        filter: searchFilterSvc.buildFilterString( filterMap ),
        searchCriteria: finalSearchCriteria
    } );
};

export let doInContentSearchKeepFilter = function( targetState, searchCriteria, shapeSearchProviderActive, savedSearchUid ) {
    // If we are in Shape Search or Saved Search context we do not want to keep the filters related to
    // either when we perform this search.
    finalSearchCriteria = searchCriteria;
    exports.populateInContentSearchAnalytics( searchCriteria );
    var ctxSearchSearch = appCtxService.getCtx( 'searchSearch' );
    var shapeSearchCtx = appCtxService.getCtx( 'shapeSearch' );
    var ctxCriteria = appCtxService.getCtx( 'search' ).criteria;

    if( ctxCriteria && ctxCriteria.searchString ) {
        exports.doInContentSearchKeepFilterInt( searchCriteria, shapeSearchProviderActive, savedSearchUid, ctxSearchSearch, shapeSearchCtx, ctxCriteria );
    } else {
        // it's from non-Search location where the passed in searchCriteria is the final searchString
        finalSearchCriteria = searchCriteria;
    }
    if( shapeSearchProviderActive === 'true' || savedSearchUid && shapeSearchCtx ) {
        exports.processShapeSearch( targetState, shapeSearchCtx );
    } else {
        incontentSearchForSS1 = '';
        AwStateService.instance.go( targetState ? targetState : '.', {
            filter: searchFilterSvc.buildFilterString( searchFilterSvc.getFilters( false ) ),
            searchCriteria: finalSearchCriteria
        } );
    }
};

export let populateInContentSearchAnalytics = function( searchCriteria ) {
    var sanEvent = {
        sanAnalyticsType: 'Commands',
        sanCommandId: 'cmdInContentSearch',
        sanCommandTitle: 'In Content Search'
    };
    if ( searchCriteria ) {
        sanEvent.sanSearchType = 'phrase';
        var searchStrArray = searchCriteria.toString().split( ' ' );
        if ( searchStrArray.length === 1  &&  searchCriteria === '*' ) {
            sanEvent.sanSearchType = 'wildcard';
        } else if ( searchStrArray.length === 1  || searchStrArray.length === 2 ) {
            sanEvent.sanSearchType = searchStrArray.length.toString() + ' word';
        }
    }
    analyticsSvc.logNonDeclarativeCommands( sanEvent );
};

/* eslint-disable-next-line valid-jsdoc*/

exports = {
    processInContentString,
    doInContentSearchKeepFilterIntPostWithSecondary,
    doInContentSearchKeepFilterIntPost,
    doInContentSearchKeepFilterInt,
    processShapeSearch,
    doInContentSearchKeepFilter,
    populateInContentSearchAnalytics
};
export default exports;
/**
 * Do an in-content search and keep the existing filters
 *
 * @function doInContentSearchKeepFilter
 * @memberOf NgServices.searchFilterService
 *
 * @param {String} targetState - Name of the state to go to. Defaults to '.' (current state)
 * @param {String} searchCriteria - secondary search criteria
 * @param {String} shapeSearchProviderActive - Whether we are executing search within shapeSearchProvider
 * @param {String} savedSearchUid - Uid of saved search used to determine if we are executing search while in context of the saved search
 */
/**
 * @memberof NgServices
 * @member secondarySearchService
 */
app.factory( 'secondarySearchService', () => exports );

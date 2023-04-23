// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/showMyReportsService
 */
import app from 'app';
import soaService from 'soa/kernel/soaService';
import appCtxService from 'js/appCtxService';

var exports = {};
var userSessionCtx = 'userSession';

export let getDateOffset = function() {
    return new Date( new Date().getTime() ).getTimezoneOffset() * -1;
};

export let getCurrentUser = function() {
    var userSession = appCtxService.getCtx( userSessionCtx );
    if( userSession && userSession.props.user ) {
        return userSession.props.user.uiValues[ 0 ];
    }
};

/**
 * @param  {any} startIndex - The start Index.
 *
 * @returns {any} searchCriteria - The search criteria.
 */
export let getSearchCriteria = function( startIndex ) {
    var searchResponseInfo = appCtxService.getCtx( 'searchResponseInfo' );
    var searchCriteria = {};
    searchCriteria.DatasetType = 'CrfOutputHtml;CrfOutputText;CrfOutputExcel';

    searchCriteria.queryName = 'Dataset...';
    searchCriteria.searchID = 'REPORTSDATASETSEARCH';
    searchCriteria.typeOfSearch = 'ADVANCED_SEARCH';
    searchCriteria.utcOffset = getDateOffset().toString();
    searchCriteria.OwningUser = getCurrentUser();

    if( searchResponseInfo && startIndex > 0 ) {
        //it's a scrolling case
        searchCriteria.totalObjectsFoundReportedToClient = searchResponseInfo.totalFound.toString();
        searchCriteria.lastEndIndex = searchResponseInfo.lastEndIndex.toString();
    } else {
        searchCriteria.totalObjectsFoundReportedToClient = '0';
        searchCriteria.lastEndIndex = '0';
    }

    return searchCriteria;
};
/**
 * @param  {any} sortCriteria - The sort criteria
 * @param  {any} columnCriteria - The column criteria
 * @returns {any} sortCriteria - The sort criteria
 */
export let getSortCriteria = function( sortCriteria, columnCriteria ) {
    if( !sortCriteria ) {
        sortCriteria = [];
    }

    if( columnCriteria.length !== 0 ) {
        sortCriteria.push( {
            fieldName: columnCriteria[ 0 ].fieldName,
            sortDirection: columnCriteria[ 0 ].sortDirection
        } );
    } else {
        sortCriteria.push( {
            fieldName: 'creation_date',
            sortDirection: 'DESC'
        } );
    }

    return sortCriteria;
};

export default exports = {
    getDateOffset,
    getSearchCriteria,
    getCurrentUser,
    getSortCriteria
};
app.factory( 'showMyReportsService', () => exports );

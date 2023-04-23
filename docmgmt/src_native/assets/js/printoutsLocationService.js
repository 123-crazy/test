// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
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
 * @module js/printoutsLocationService
 */
import app from 'app';
import soaService from 'soa/kernel/soaService';
import appCtxService from 'js/appCtxService';

let exports = {};

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

export let loadData = function( searchInput, columnConfigInput, saveColumnConfigData ) {
    if( !searchInput.searchCriteria ) {
        searchInput.searchCriteria = {};
    }
    searchInput.searchCriteria.OwningUser = exports.getCurrentUser();
    searchInput.searchCriteria.utcOffset = exports.getDateOffset().toString();
    if( !searchInput.searchSortCriteria ) {
        searchInput.searchSortCriteria = [];
    }

    if( searchInput.searchSortCriteria.length === 0 ) {
        searchInput.searchSortCriteria.push( {
            fieldName: 'creation_date',
            sortDirection: 'DESC'
        } );
    }

    return soaService.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', {
        columnConfigInput: columnConfigInput,
        inflateProperties: true,
        saveColumnConfigData: saveColumnConfigData,
        searchInput: searchInput
    } );
};

export default exports = {
    getDateOffset,
    getCurrentUser,
    loadData
};
app.factory( 'printoutsLocationService', () => exports );

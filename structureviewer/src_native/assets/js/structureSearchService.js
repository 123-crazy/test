//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*global
 define
 */
/**
 * @module js/structureSearchService
 */
import app from 'app';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import appCtxSvc from 'js/appCtxService';

var exports = {};
var _currentSearchCriteria = null;
var _searchPerformedEventSubscription = null;

/**
 * Register for search events
 *
 */
var _registerForEvents = function() {

    if( _searchPerformedEventSubscription === null ) {
        _searchPerformedEventSubscription = eventBus.subscribe( "occmgmt.searchPerformedInAceEvent", function(
            eventData ) {
            if( eventData ) {
                _currentSearchCriteria = eventData;
            }
        }, 'structureSearchService' );
    }
};

/**
 * unregister for search events
 *
 */
var _unRegisterForEvents = function() {

    if( _searchPerformedEventSubscription !== null ) {
        eventBus.unsubscribe( _searchPerformedEventSubscription );
        _searchPerformedEventSubscription = null;
    }
};

var performSearch = function() {
    var searchCriteriaForViewer = {};

    if( _currentSearchCriteria !== null && ( !_.isUndefined( _currentSearchCriteria.columnConfigInput ) ) &&
        ( !_.isUndefined( _currentSearchCriteria.searchInput ) ) ) {

        searchCriteriaForViewer.columnConfigInput = _currentSearchCriteria.columnConfigInput;
        searchCriteriaForViewer.searchInput = _currentSearchCriteria.searchInput;
        var occmgmtActiveCtx = appCtxSvc.getCtx( 'aceActiveContext' );
        var occmgmtActiveCtxKey = occmgmtActiveCtx && occmgmtActiveCtx.key ? occmgmtActiveCtx.key : 'occmgmtContext';
        eventBus.publish( 'sv.ApplySearchCriteriaEvent', {
            "searchCriteria": searchCriteriaForViewer,
            "activeContext": occmgmtActiveCtxKey
        } );
    }
};
/**
 * try to apply search criteria in Viewer
 *
 * @param viewerPageTitle viewer tab title
 *
 */
export let applySearchCiteriaInViewer = function() {

    if( _currentSearchCriteria === null ) {
        var getInContextSearchCriteria = eventBus.subscribe( "occmgmt.searchPerformedInAceEvent", function(
            eventData ) {
            if( eventData ) {
                _currentSearchCriteria = eventData;
                performSearch();
            }
            eventBus.unsubscribe( getInContextSearchCriteria );
        }, 'structureSearchService' );
        eventBus.publish( "viewer.giveInContextSearchCriteria" );
    } else {
        performSearch();
    }

};

/**
 * start listening search event
 */
export let startListeningSearchEvent = function() {
    _registerForEvents();
};

/**
 * stop listening search event
 */
export let stopListeningSearchEvent = function() {
    _unRegisterForEvents();
    _currentSearchCriteria = null;
};

/**
 * Closure Rule Configuration service utility
 */

export default exports = {
    applySearchCiteriaInViewer,
    startListeningSearchEvent,
    stopListeningSearchEvent
};
app.factory( 'structureSearchService', () => exports );

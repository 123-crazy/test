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
 * @module js/um0AddInAnOrganizationService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import AwStateService from 'js/awStateService';

import 'js/uwPropertyService';

import 'jquery';
import 'lodash';
import 'js/commandsMapService';

var exports = {};

/**
 * Publish doSearch event.
 *
 * @param {String} searchString - searchString
 * @param {bool} isGroupRadioButtonSelected - isGroupRadioButtonSelected
 */
export let doSearch = function( searchString, isGroupRadioButtonSelected ) {
    if( searchString ) {
        if( appCtxSvc.ctx.lastSelectedObject !== null && appCtxSvc.ctx.lastSelectedObject.type === 'Role' ) {
            appCtxSvc.registerCtx( 'icsContentTypeString', 'User' );
        } else if( isGroupRadioButtonSelected ) {
            appCtxSvc.registerCtx( 'icsContentTypeString', 'Group' );
        } else {
            appCtxSvc.registerCtx( 'icsContentTypeString', 'Role' );
        }
        eventBus.publish( 'ics.doSearch' );
    }
};

export let getState = function() {
    return AwStateService.instance;
};

/**
 * Set command context for getting last selected Group object from URL when nothing selected on primaryworkArea
 */
export let getObjectFromBreadCrumb = function() {
    // Initialize variable to show search on add panel.
    appCtxSvc.registerCtx( 'showSearchOnPanel', false );

    appCtxSvc.registerCtx( 'lastSelectedObject', null );
    appCtxSvc.registerCtx( 'lastSelectedGroupObject', null );

    //Route the request and let appropriate listeners react to it
    var stateSvc = exports.getState();
    if( stateSvc && stateSvc.params ) {
        var newD_uid = '';
        var d_uid = stateSvc.params.d_uids;
        var s_uid = stateSvc.params.s_uid;

        if( s_uid ) {
            appCtxSvc.registerCtx( 'showSearchOnPanel', true );
            var mObject = cdm.getObject( s_uid );
            appCtxSvc.registerCtx( 'lastSelectedObject', mObject );
        }
        if( d_uid ) {
            appCtxSvc.registerCtx( 'showSearchOnPanel', true );
            var d_uidsArray = d_uid.split( '^' );
            if( s_uid ) {
                newD_uid = d_uidsArray[ d_uidsArray.length - 1 ];
                mObject = cdm.getObject( newD_uid );
                appCtxSvc.registerCtx( 'lastSelectedGroupObject', mObject );
            } else {
                newD_uid = d_uidsArray[ d_uidsArray.length - 2 ];
                s_uid = d_uidsArray[ d_uidsArray.length - 1 ];

                var mObject = cdm.getObject( s_uid );
                appCtxSvc.registerCtx( 'lastSelectedObject', mObject );

                mObject = cdm.getObject( newD_uid );
                appCtxSvc.registerCtx( 'lastSelectedGroupObject', mObject );
            }
        }
    }
};

/**
 * @memberof TcSearchService
 * @param {Array} searchResults - searchResults
 */
export let getUsersToAdd = function( searchResults ) {
    var selected = [];
    if( searchResults ) {
        for( var i = 0; i < searchResults.length; i++ ) {
            var userObj = {};
            userObj.user = searchResults[ i ];
            selected.push( userObj );
        }
    }
    appCtxSvc.registerCtx( 'selectedUsers', selected );
};

/**
 * Publish addAdminObjects event.
 *
 * @param {String} selectedPanelId - selectedPanelId
 * @param {bool} isGroupRadioButtonSelected - isGroupRadioButtonSelected
 * @param {Array[]} searchResults - searchResults
 */
export let addAdminObjects = function( selectedPanelId, isGroupRadioButtonSelected, searchResults ) {
    exports.getObjectFromBreadCrumb();
    if( selectedPanelId === 'OrganizationNewTab' || selectedPanelId === 'SecondaryWorkAreaNewTab' ) {
        if( isGroupRadioButtonSelected === true ) {
            eventBus.publish( 'ics.createGroup' );
        } else if( isGroupRadioButtonSelected === false && appCtxSvc.ctx.lastSelectedObject !== null &&
            appCtxSvc.ctx.lastSelectedObject.type !== 'Role' ) {
            eventBus.publish( 'ics.createRoleInGroup' );
        } else if( appCtxSvc.ctx.lastSelectedObject !== null &&
            appCtxSvc.ctx.lastSelectedObject.type === 'Role' ) {
            eventBus.publish( 'ics.createPersonObject' );
        } else if( appCtxSvc.ctx.mselected !== null && appCtxSvc.ctx.mselected[ 0 ].type === 'Group' ) {
            eventBus.publish( 'ics.createRoleInGroup' );
        }
    } else if( selectedPanelId === 'OrganizationSearchTab' || selectedPanelId === 'SecondaryWorkAreaSearchTab' ) {
        if( appCtxSvc.ctx.mselected === null ) {
            if( appCtxSvc.ctx.lastSelectedObject !== null && appCtxSvc.ctx.lastSelectedObject.type === 'Role' ) {
                exports.getUsersToAdd( searchResults );
                eventBus.publish( 'ics.addUsers' );
            } else if( appCtxSvc.ctx.lastSelectedObject !== null &&
                appCtxSvc.ctx.lastSelectedObject.type === 'Group' ) {
                if( isGroupRadioButtonSelected ) {
                    // Group radio button selected
                    eventBus.publish( 'ics.addChildGroups' );
                } else {
                    // Role radio button selected
                    eventBus.publish( 'ics.addRoles' );
                }
            }
        } else if( appCtxSvc.ctx.mselected[ 0 ].type === 'Role' && appCtxSvc.ctx.lastSelectedObject !== null &&
            appCtxSvc.ctx.lastSelectedObject.type === 'Role' ) {
            exports.getUsersToAdd( searchResults );
            eventBus.publish( 'ics.addUsers' );
        } else if( appCtxSvc.ctx.mselected[ 0 ].type === 'User' && appCtxSvc.ctx.lastSelectedObject !== null &&
            appCtxSvc.ctx.lastSelectedObject.type === 'Role' ) {
            exports.getUsersToAdd( searchResults );
            eventBus.publish( 'ics.addUsers' );
        } else if( appCtxSvc.ctx.mselected[ 0 ].type === 'Group' ||
            appCtxSvc.ctx.lastSelectedObject !== null && appCtxSvc.ctx.lastSelectedObject.type === 'Group' ) {
            if( appCtxSvc.ctx.lastSelectedObject !== null &&
                appCtxSvc.ctx.lastSelectedObject.type === 'Group' ) {
                appCtxSvc.registerCtx( 'lastSelectedObject', appCtxSvc.ctx.lastSelectedObject );
            } else if( appCtxSvc.ctx.lastSelectedObject !== null &&
                appCtxSvc.ctx.mselected[ 0 ].type === 'Group' ) {
                appCtxSvc.registerCtx( 'lastSelectedObject', appCtxSvc.ctx.mselected[ 0 ] );
            }
            if( isGroupRadioButtonSelected ) {
                // Group radio button selected
                eventBus.publish( 'ics.addChildGroups' );
            } else {
                // Role radio button selected
                eventBus.publish( 'ics.addRoles' );
            }
        }
    }
};

/**
 * um0AddInAnOrganizationService service utility
 */

export default exports = {
    doSearch,
    getState,
    getObjectFromBreadCrumb,
    getUsersToAdd,
    addAdminObjects
};
app.factory( 'um0AddInAnOrganizationService', () => exports );

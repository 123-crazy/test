// Copyright (c) 2020 Siemens

/**
 * @module js/breadcrumbUtils
 */
import app from 'app';
import navigateBreadCrumbService from 'js/aw.navigateBreadCrumbService';
import appCtxService from 'js/appCtxService';
import eventBus from 'js/eventBus';

// Service
import AwStateService from 'js/awStateService';

var exports = {};

/**
 * close popup on object selection inside chevron popup
 *
 * @return {Object} the data object
 */
export let updateBreadCrumbParamInUrl = function( data, id, dataProviderName, navigate ) {
    // update the url and rebuild breadcrumbs
    var scopedObject = data.dataProviders[ dataProviderName ].selectedObjects[ 0 ];
    navigateBreadCrumbService.buildBreadcrumbUrl( id, scopedObject.uid, navigate );

    // close the popup
    data.showPopup = false;
    appCtxService.unRegisterCtx( id + 'Chevron' );
};

/**
 * Toggle flag
 *
 * @param {Object} data object
 */
export let toggle = function( id, data, key, value, unRegister ) {
    data[ key ] = value;
    if( unRegister ) {
        appCtxService.unRegisterCtx( id + 'Chevron' );
    }
    if( key === 'loading' && !value ) {
        eventBus.publish( id + 'settingChevronPopupPosition' );
    }
};

export let getBreadCrumbUidList = function( uid, d_uids ) {
    if( !d_uids ) {
        return [ uid ];
    }
    return [ uid ].concat( d_uids.split( '^' ) );
};

export let navigateToFolder = function( data, id, selectedObj, currentCrumb, uid, d_uids ) {
    if( currentCrumb ) {
        // Close the popup
        data.showPopup = false;
        currentCrumb.clicked = false;
        appCtxService.unRegisterCtx( id + 'Chevron' );

        var breadcrumbList = exports.getBreadCrumbUidList( uid, d_uids );
        var currentFolder = breadcrumbList.slice( -1 )[ 0 ];

        let state = AwStateService.instance;

        // If the opened crumb is for the current folder
        if( currentFolder === currentCrumb.scopedUid ) {
            // Just select the item that was clicked
            state.go( '.', {
                s_uid: selectedObj.uid
            } );
        } else {
            // Ensure that the scoped uid becomes the opened folder
            // And select the item
            var idx = breadcrumbList.indexOf( currentCrumb.scopedUid );

            // If scopeUid is not in list (it should always be in list) revert to just uid / s_uid
            // s_uid logic will remove it if not valid
            if( idx === -1 ) {
                state.go( '.', {
                    s_uid: selectedObj.uid,
                    d_uids: null
                } );
            } else {
                var newBreadcrumbList = breadcrumbList.slice( 0, idx + 1 );
                // Drop uid
                newBreadcrumbList.shift();
                state.go( '.', {
                    s_uid: selectedObj.uid,
                    d_uids: newBreadcrumbList.join( '^' )
                } );
            }
        }
    }
};

exports = {
    updateBreadCrumbParamInUrl,
    toggle,
    getBreadCrumbUidList,
    navigateToFolder
};
export default exports;

app.factory( 'breadcrumbUtils', () => exports );

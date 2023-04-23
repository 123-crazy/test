//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/occmgmtSplitViewUpdateService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};
const PRODUCTS_OPENED_IN_SPLITVIEW_UIDS = 'productsOpenedInSplitView';

export let getInactiveViewKey = function() {
    if( appCtxSvc.ctx.splitView ) {
        var inactiveViewKey = appCtxSvc.ctx.splitView.viewKeys.filter( function( key ) {
            return key !== appCtxSvc.ctx.aceActiveContext.key;
        } )[ 0 ];
        return inactiveViewKey;
    }
};

export let getAffectedElementsPresentInGivenView = function( view, affectedElement ) {
    var underlyingObjectOfAffectedElement = _.get( affectedElement, 'props.awb0UnderlyingObject.dbValues[0]' );
    var cloneStableIDOfAffectedElement = _.get( affectedElement, 'props.awb0CopyStableId.dbValues[0]' );
    return appCtxSvc.ctx[ view ].vmc.loadedVMObjects.filter( function( vmo ) {
        var cloneStableIDOfVMO = _.get( vmo, 'props.awb0CopyStableId.dbValues[0]' );
        var underlyingObjectOfVO = _.get( vmo, 'props.awb0UnderlyingObject.dbValues[0]' );
        if( !_.isEmpty( cloneStableIDOfVMO ) && !_.isEmpty( cloneStableIDOfAffectedElement ) && _.isEqual( cloneStableIDOfVMO, cloneStableIDOfAffectedElement ) ||
            !_.isEmpty( underlyingObjectOfVO ) && !_.isEmpty( underlyingObjectOfAffectedElement ) && _.isEqual( underlyingObjectOfVO, underlyingObjectOfAffectedElement ) ) {
            return true;
        }
        return false;
    } );
};

export let isConfigSameInBothViews = function() {
    if( appCtxSvc.ctx.splitView ) {
        var viewKey = appCtxSvc.ctx.splitView.viewKeys;
        return _.isEqual( _.get( appCtxSvc.ctx[ viewKey[ 0 ] ], 'productContextInfo.uid' ), _.get( appCtxSvc.ctx[ viewKey[ 1 ] ], 'productContextInfo.uid' ) );
    }
    return false;
};

export let refreshInactiveViewWithSameConfig = function() {
    if( exports.isConfigSameInBothViews() ) {
        eventBus.publish( 'awDataNavigator.reset', {
            viewToReset: exports.getInactiveViewKey(),
            retainTreeExpansionStates: true,
            silentReload: true
        } );
    }
};

export let addProductOpenedInSplitViewToSessionStorage = function( uid, filterCount ) {
    if( filterCount > 0 ) {
        var productOpenedInSplitViewUids = [];
        if( sessionStorage.getItem( PRODUCTS_OPENED_IN_SPLITVIEW_UIDS ) ) {
            productOpenedInSplitViewUids = JSON.parse( sessionStorage.getItem( PRODUCTS_OPENED_IN_SPLITVIEW_UIDS ) );
        }
        if( uid !== 'null' && !productOpenedInSplitViewUids.includes( uid ) ) {
            productOpenedInSplitViewUids.push( uid );
            sessionStorage.setItem( PRODUCTS_OPENED_IN_SPLITVIEW_UIDS, JSON.stringify( productOpenedInSplitViewUids ) );
        }
    }
};

export let clearLocalStorageForInavtiveView = function () {
    var gridId = getInactiveViewKey() === "occmgmtContext" ? "occTreeTable" : "occTreeTable2";
    appCtxSvc.updatePartialCtx('clearLocalStorageForInactiveView', gridId );
};

export default exports = {
    getInactiveViewKey,
    getAffectedElementsPresentInGivenView,
    isConfigSameInBothViews,
    refreshInactiveViewWithSameConfig,
    addProductOpenedInSplitViewToSessionStorage,
    clearLocalStorageForInavtiveView    
};
app.factory( 'occmgmtSplitViewUpdateService', () => exports );

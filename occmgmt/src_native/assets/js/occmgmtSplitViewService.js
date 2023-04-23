//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 */

/**
 * @module js/occmgmtSplitViewService
 */
import app from 'app';
import AwStateService from 'js/awStateService';
import appCtxService from 'js/appCtxService';
import occMgmtServiceManager from 'js/occurrenceManagementServiceManager';

var exports = {};

export let initializeOccmgmtSplitView = function( viewKeys, hiddenCommands ) {
    appCtxService.registerCtx( 'aceActiveContext', { key: '', context: '' } );
    appCtxService.registerCtx( 'splitView', { mode: true, viewKeys: viewKeys } );
    appCtxService.registerCtx( 'skipAutoBookmark', true );
    appCtxService.registerCtx( 'decoratorToggle', false );
    appCtxService.updatePartialCtx( 'hiddenCommands', hiddenCommands );
    var requestPref = appCtxService.ctx.requestPref || {};
    requestPref.savedSessionMode = 'ignore';
    requestPref.showMarkup = [ 'false' ];
    appCtxService.registerCtx( 'requestPref', requestPref );
    occMgmtServiceManager.initializeOccMgmtServices();
    resetTreeExpansionState();
};

export let resetTreeExpansionState = function() {
    if( appCtxService.ctx.resetTreeExpansionState ) {
        var expansionState = {};
        appCtxService.ctx.splitView.viewKeys.map( function( view ) {
            expansionState[ view ] = true;
        } );
        appCtxService.ctx.splitView.resetTreeExpansionState = expansionState;
        delete appCtxService.ctx.resetTreeExpansionState;
    }
};

export let synchronizeSplitViewStateWithURL = function( objectsToOpen = [], activeState = [] ) {
    //Get which parameters have changed
    var changedParams = {};
    for( var i in AwStateService.instance.params ) {
        if( AwStateService.instance.params[ i ] !== activeState[ i ] ) {
            changedParams[ i ] = AwStateService.instance.params[ i ];
        }
    }

    //If the uid is changed refresh the whole page
    if( changedParams.hasOwnProperty( 'uid' ) ) {
        objectsToOpen[ 0 ] = objectsToOpen[ 0 ] || {};
        if( changedParams.uid ) {
            objectsToOpen[ 0 ].uid = AwStateService.instance.params.uid;
        } else {
            delete objectsToOpen[ 0 ].uid;
        }
    }

    if( changedParams.hasOwnProperty( 'uid2' ) ) {
        objectsToOpen[ 1 ] = objectsToOpen[ 1 ] || {};
        if( changedParams.uid2 ) {
            objectsToOpen[ 1 ].uid = AwStateService.instance.params.uid2;
        } else {
            delete objectsToOpen[ 1 ].uid;
        }
    }

    return {
        activeState: JSON.parse( JSON.stringify( AwStateService.instance.params ) ),
        objectsToOpen: objectsToOpen
    };
};

export let destroyOccmgmtSplitView = function() {
    occMgmtServiceManager.destroyOccMgmtServices();
    appCtxService.unRegisterCtx( 'aceActiveContext' );
    appCtxService.unRegisterCtx( 'hiddenCommands' );
    appCtxService.unRegisterCtx( 'skipAutoBookmark' );
    appCtxService.unRegisterCtx( 'splitView' );
    appCtxService.unRegisterCtx( 'requestPref' );
};

export default exports = {
    initializeOccmgmtSplitView,
    synchronizeSplitViewStateWithURL,
    resetTreeExpansionState,
    destroyOccmgmtSplitView
};
app.factory( 'occmgmtSplitViewService', () => exports );

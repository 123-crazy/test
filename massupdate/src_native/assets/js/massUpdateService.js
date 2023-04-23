// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/massUpdateService
 */

import app from 'app';
import appCtxSvc from 'js/appCtxService';
import cmdPanelSvc from 'js/commandPanel.service';
import eventBus from 'js/eventBus';
import _ from 'lodash';

var exports = {};

/**
 * Returns the selected problem Item
 *
 * @param {data} data viewDataModel
 * @param {appCtxSvc} ctx context
 * @return {IModelObject} The selected Problem Item
 */
export let getClipboardFavouriteRecentSelectedItem = function( data, ctx ) {
    let selectedItem = {};

    if( data.selectedTab.panelId === 'paletteTabPageSub' ) {
        if( ctx.getClipboardProvider.selectedObjects.length > 0 ) {
            selectedItem = ctx.getClipboardProvider.selectedObjects[ 0 ];
        } else if( ctx.getRecentObjsProvider.selectedObjects.length > 0 ) {
            selectedItem = ctx.getRecentObjsProvider.selectedObjects[ 0 ];
        } else if( ctx.getFavoriteProvider.selectedObjects.length > 0 ) {
            selectedItem = ctx.getFavoriteProvider.selectedObjects[ 0 ];
        }
    } else {
        if( data.dataProviders.performSearch.selectedObjects.length > 0 ) {
            selectedItem = data.dataProviders.performSearch.selectedObjects[ 0 ];
        }
    }

    data.selectedProblemItem = selectedItem;
    return {
        uid: selectedItem.uid,
        type: selectedItem.type
    };
};

/**
 * Update Display of Problem Item Link
 *
 * @param {data} data viewModel of view
 * @param {String} path path for link property
 * @param {String} value to be updated
 */
export let updateProblemItemLinkInViewModel = function( data, path, value ) {
    if( value !== undefined ) {
        var splitPath = path.split( '.' );
        splitPath.shift();
        var currentCtx = _.get( exports.ctx, path );
        if( value !== currentCtx ) {
            _.set( data, path, value );
        }
    }
};

/**
 * Processes the responce of expandGRMRelationsForPrimary and returns list of secondary Objects
 *
 * @param {responce}response responce of expandGRMRelationsForPrimary
 * @returns {List} availableSecondaryObject return list of secondary objects
 */
export let processSecondaryObject = function( response ) {
    var availableSecondaryObject = [];
    if( response.output[ 0 ].relationshipData[ 0 ].relationshipObjects ) {
        for( var i in response.output[ 0 ].relationshipData[ 0 ].relationshipObjects ) {
            availableSecondaryObject[ i ] = response.output[ 0 ].relationshipData[ 0 ].relationshipObjects[ i ].otherSideObject;
        }
    }
    return availableSecondaryObject;
};

/**
 * Opens the Command Panel
 *
 * @param {String} commandId: MassUpdate
 * @param {String} location of Panel
 */
export let openSelectProblemPanel = function( commandId, location ) {
    cmdPanelSvc.activateCommandPanel( commandId, location );
};

/**
 * Set selected/attached Problem Item in app context
 *
 * @param { IModelObject } problemItem Item
 */
export let setProblemItem = function( problemItem ) {
    if( problemItem ) {
        problemItem.props.object_string.propertyLabelDisplay = 'NO_PROPERTY_LABEL';
    }
    appCtxSvc.ctx.problemItem = problemItem;

    eventBus.publish( 'ImpactedAssembliesPanel.setSelectedProblemProp' );
};

/**
 * Reset the value of link display value
 *
 * @param {data} data viewModel of view
 * @param { property } resetProp reseting to orignal values of prop
 */
export let clear = function( data, resetProp ) {
    data.problemItemList = [];
    appCtxSvc.ctx.problemItem = undefined;

    //Reset link to no Problem Item selected
    exports.updateProblemItemLinkInViewModel( data, 'problemItemProp', resetProp );
};

export let isProblemItemReusable = function( response ) {
    var reusable = true;

    if( response.output[ 0 ].relationshipData[ 0 ].relationshipObjects ) {
        for( var i in response.output[ 0 ].relationshipData[ 0 ].relationshipObjects ) {
            if( response.output[ 0 ].relationshipData[ 0 ].relationshipObjects[ i ].otherSideObject.props.CMClosure.dbValues[ 0 ] !== 'Closed' &&
                response.output[ 0 ].relationshipData[ 0 ].relationshipObjects[ i ].otherSideObject.props.CMClosure.dbValues[ 0 ] !== 'Canceled' ) {
                reusable = false;
                break;
            }
        }
    }

    return reusable;
};

export default exports = {
    getClipboardFavouriteRecentSelectedItem,
    updateProblemItemLinkInViewModel,
    processSecondaryObject,
    openSelectProblemPanel,
    setProblemItem,
    clear,
    isProblemItemReusable
};
app.factory( 'massUpdateService', () => exports );

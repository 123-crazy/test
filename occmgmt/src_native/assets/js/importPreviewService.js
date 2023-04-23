// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * @module js/importPreviewService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import dataManagementSvc from 'soa/dataManagementService';
import navigationSvc from 'js/navigationService';
import cdm from 'soa/kernel/clientDataModel';
import commandPanelService from 'js/commandPanel.service';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import importPreviewSetActionOnLine from 'js/importPreviewSetActionOnLine';

var exports = {};

/**
 * Load Import Preview data before page launch
 */
export let importPreviewData = function( data ) {
    var defer = AwPromiseService.instance.defer();
    var moduleTitle;
    var modelObject;

    var toParams = exports.getStateParams();
    var uidForLoadObject = [ toParams.uid, toParams.d_uid ];
    appCtxSvc.ctx.hideRightWall = true;
    dataManagementSvc.loadObjects( uidForLoadObject ).then( function() {
        var result = {};
        result.data = [];
        let requestPref = appCtxSvc.ctx.requestPref ? appCtxSvc.ctx.requestPref : {
            savedSessionMode: 'ignore'
        };
        for( var i = 0; i < uidForLoadObject.length; i++ ) {
            var obj = cdm.getObject( uidForLoadObject[ i ] );
            result.data.push( obj );
        }
        appCtxSvc.registerCtx( 'IFEContext', {
            currentState: {
                uid: uidForLoadObject[ 0 ]
            },
            requestPref: requestPref,
            readOnlyFeatures: {},
            expansionCriteria: {},
            skipAutoBookmark: true,
            modelObject: modelObject,
            moduleTitle: moduleTitle
        } );
        appCtxSvc.registerCtx( 'aceActiveContext', {
            key: 'IFEContext',
            context: appCtxSvc.ctx.IFEContext
        } );

        defer.resolve( result );
    } );
    return defer.promise;
};

/**
 * Get state params
 */
export let getStateParams = function() {
    var toParams = {};
    var _selected = appCtxSvc.getCtx( 'selected' );
    var sourceObject;

    if( _selected ) {
        if( _selected.props.awb0UnderlyingObject !== undefined ) { // We got an Awb0Element as input
            sourceObject = cdm.getObject( _selected.props.awb0UnderlyingObject.dbValues[ 0 ] );
            toParams.uid = sourceObject.uid;
        } else {
            sourceObject = cdm.getObject( _selected.uid );
            if( sourceObject ) {
                toParams.uid = sourceObject.uid;
            }
        }
    }
    return toParams;
};

/**
 * Takes user to import preview sublocation.
 */
export let launchImportBOMPreviewPage = function( data ) {
    if( _.isEqual( appCtxSvc.ctx.sublocation.clientScopeURI, 'Awb0ImportPreview' ) ) {
        eventBus.publish( 'reloadPreview' );
    } else {
        data.previewButtonClicked = true;
        var result = exports.getStateParams();
        importPreviewSetActionOnLine.clearUpdateVMOList();
        var action = { actionType: 'Navigate' };
        action.navigationParams = result;
        action.navigateTo = 'com_siemens_splm_clientfx_tcui_xrt_importPreview';
        navigationSvc.navigate( action, result );
    }
};

/**
 * Clean up CBA specific variable from context
 */
export let cleanupPreviewVariablesFromCtx = function() {
    appCtxSvc.unRegisterCtx( 'IFEContext' );
    if( appCtxSvc.ctx.ImportBOMContext ) {
        appCtxSvc.unRegisterCtx( 'ImportBOMContext' );
    }
    appCtxSvc.ctx.hideRightWall = false;
};

/**
 * Launches preview panel in preview screen after all the nodes in tree are loaded.
 */
export let launchImportPanelInPreview = function( commandId, location ) {
    if( appCtxSvc.ctx.ImportBOMContext &&
        _.isUndefined( appCtxSvc.ctx.ImportBOMContext.isImportPreviewScreenOpened ) ) {
        appCtxSvc.ctx.ImportBOMContext.isImportPreviewScreenOpened = true;
        commandPanelService.activateCommandPanel(
            commandId, location, undefined, true, false, undefined );
    }
};

/**
 * Import Panel Preview Service utility
 * @returns {object} - object
 */

export default exports = {
    getStateParams,
    importPreviewData,
    launchImportBOMPreviewPage,
    cleanupPreviewVariablesFromCtx,
    launchImportPanelInPreview
};
app.factory( 'importPreviewService', () => exports );

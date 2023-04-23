// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awv0CaptureViewService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import viewerSecondaryModelSvc from 'js/viewerSecondaryModel.service';
import appCtxSvc from 'js/appCtxService';
import messagingService from 'js/messagingService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import imageCaptureService from 'js/Awv0ImageCaptureService';
import _cdmSvc from 'soa/kernel/clientDataModel';

import $ from 'jquery';

var exports = {};

var _captureCount = 0;

/**
 * Creates image capture of the current view state.
 *
 * @param {Object} data data view model
 * @param {String} viewerCtxNameSpace viewer context namespace
 * @returns {Promise} promise that will be resolved when image capture action is completed
 */
export let captureImage = function( data, viewerCtxNameSpace ) {
    initCaptureCtx();
    var contextObjectUid = null;
    if( appCtxSvc.ctx.aceActiveContext && appCtxSvc.ctx.aceActiveContext.context &&
        Array.isArray( appCtxSvc.ctx.aceActiveContext.context.selectedModelObjects ) && appCtxSvc.ctx.aceActiveContext.context.selectedModelObjects.length > 0 ) {
        let contextObject = null;
        let lastIndex = appCtxSvc.ctx.aceActiveContext.context.selectedModelObjects.length - 1;
        contextObject = appCtxSvc.ctx.aceActiveContext.context.selectedModelObjects[ lastIndex ];
        contextObjectUid = contextObject.uid;
        if( contextObject.props ) {
            let underlyingObject = contextObject.props.awb0UnderlyingObject;
            if( underlyingObject ) {
                contextObjectUid = underlyingObject.dbValues[ 0 ];
            }
        }
    } else {
        var selection = getCurrentSelection()[ 0 ];
        contextObjectUid = selection.uid;
    }
    var imageCaptures = _getCaptureCtx();
    if( imageCaptures && imageCaptures.length > 0 ) {
        _captureCount = imageCaptures.length;
    }
    _captureCount++;
    var captureName = 'Capture Image ' + _captureCount;
    var captureDesc = 'Capture Image ' + _captureCount;
    return viewerSecondaryModelSvc.createImageCapture( contextObjectUid, viewerCtxNameSpace, captureName, captureDesc ).then( function() {
        var msg = data.i18n.captureImageSuccess.replace( '{0}', captureName );
        messagingService.showInfo( msg );
        if( appCtxSvc.ctx.viewer.activeViewerCommandCtx === viewerCtxNameSpace ) {
            if( _getActiveToolAndInfoCommand() === 'Awv0CaptureGallery' ) {
                eventBus.publish( 'imageCapture.imageCaptureSubViewUpdated', {
                    viewerCtxNameSpace: viewerCtxNameSpace
                } );
                imageCaptureService.loadCreatedCapture();
            } else {
                eventBus.publish( 'imageCapture.populateImageCaptureList', {
                    viewerCtxNameSpace: viewerCtxNameSpace
                } );
            }
        }
    }, function() {
        messagingService.showInfo( data.i18n.captureImageFailed );
    } );
};

/**
 * Creates snapshots of the current view.
 *
 * @param  {Object} data view model
 * @param {String} viewerCtxNameSpace viewer context namespace
 */
export let captureSnapshot = function( data, viewerCtxNameSpace ) {
    initSnapshotCtx(viewerCtxNameSpace);
    viewerSecondaryModelSvc.createSnapshot( viewerCtxNameSpace )
        .then( function( rawSnapshot ) {
                var snapshotCtx = _getSnapshotCtx(viewerCtxNameSpace);
                if( snapshotCtx ) {
                    _createSnapshotModelFromRawSnapshot( rawSnapshot )
                        .then( function( snapshotModel ) {
                            snapshotCtx.unshift( snapshotModel );
                            _updateActiveViewerCmdCtx( 'snapshotCtx.snapshots', snapshotCtx, viewerCtxNameSpace );
                            var msg = data.i18n.captureSnapshotSuccess.replace( '{0}', snapshotModel.cellHeader1 );
                            messagingService.showInfo( msg );
                            eventBus.publish( 'viewerSnapshotListDataUpdated', {
                                viewerCtxNameSpace: viewerCtxNameSpace
                            } );
                        } );
                }
            },
            function() {
                messagingService.showInfo( data.i18n.snapshotCreationFailed );
            } );
};

export let captureGalleryPanelRevealed = function() {};

/**
 * Creates snapshot model that can be displayed in list
 *
 * @param  {Object} rawSnapshot raw snashot
 * @returns {Object} promise
 */
function _createSnapshotModelFromRawSnapshot( rawSnapshot ) {
    if( rawSnapshot ) {
        var deferred = AwPromiseService.instance.defer();
        var snapshotModel = Object.create( rawSnapshot );

        var namePromise = rawSnapshot.getName();
        var thumbnailPromise = rawSnapshot.getThumbnail();
        $.when( thumbnailPromise, namePromise ).then( function( thumbnailURL, name ) {
            snapshotModel.thumbnailURL = thumbnailURL;
            snapshotModel.hideoverlay = true;
            snapshotModel.hasThumbnail = true;
            snapshotModel.cellHeader1 = name;
            var userName = _cdmSvc.getUser().props.user_name.uiValues[ 0 ];
            snapshotModel.cellHeader2 = userName + '(' + userName + ')';
            deferred.resolve( snapshotModel );
        }, function( reason ) {
            deferred.reject( reason );
        } );
        return deferred.promise;
    }
}

/**
 * Returns current selection object.
 *
 * @return {Object} - Current selection.
 */
var getCurrentSelection = function() {
    var currentViewerCtxNamespace = _getCurrentViewerCtxNamespace();
    var currentViewerCtx = appCtxSvc.getCtx( currentViewerCtxNamespace );
    var selectionLength = 0;
    if( currentViewerCtx.viewerSelectionModels ) {
        selectionLength = currentViewerCtx.viewerSelectionModels.length;
    }
    var currentSelection = null;
    if( selectionLength > 0 ) {
        currentSelection = currentViewerCtx.viewerSelectionModels[ selectionLength - 1 ];
    } else if( currentViewerCtx.rootModelObject ) {
        currentSelection = currentViewerCtx.rootModelObject;
    } else {
        currentSelection = currentViewerCtx.viewerCurrentProductContext;
    }
    var selection = [];
    selection.push( currentSelection );
    return selection;
};

var _getCaptureCtx = function() {
    var viewerCtx = appCtxSvc.getCtx( _getCurrentViewerCtxNamespace() );
    return viewerCtx.imageCapture === undefined ? viewerCtx.imageCapture : viewerCtx.imageCapture.listOfImageCaptureObjects;
};

var _getSnapshotCtx = function(viewerCtxNameSpace) {
    var viewerCtx = appCtxSvc.getCtx( viewerCtxNameSpace );
    return viewerCtx.snapshotCtx === undefined ? viewerCtx.snapshotCtx : viewerCtx.snapshotCtx.snapshots;
};

var _getCurrentViewerCtxNamespace = function() {
    var viewerCtx = appCtxSvc.getCtx( 'viewer' );

    if( viewerCtx.activeViewerCommandCtx ) {
        return viewerCtx.activeViewerCommandCtx;
    }
    return 'awDefaultViewer'; // passing default as snapshot can be created from one step command
};

var initCaptureCtx = function() {
    var captureCtx = _getCaptureCtx();

    if( captureCtx === undefined ) {
        _updateActiveViewerCmdCtx( 'imageCapture', {
            listOfImageCaptureObjects: []
        } );
    }
};

var initSnapshotCtx = function(viewerCtxNameSpace) {
    var snapShotCtx = _getSnapshotCtx(viewerCtxNameSpace);

    if( snapShotCtx === undefined ) {
        _updateActiveViewerCmdCtx( 'snapshotCtx', {
            snapshots: []
        }, viewerCtxNameSpace );
    }
};

var _updateActiveViewerCmdCtx = function( partialPath, value , viewerCtxNameSpace) {
    if(!viewerCtxNameSpace){
        viewerCtxNameSpace = _getCurrentViewerCtxNamespace();
    }
    var updatedPartialPath = viewerCtxNameSpace + '.' + partialPath;
    appCtxSvc.updatePartialCtx( updatedPartialPath, value );
};

/**
 * @returns {String} Returns the active tool and info command id
 */
var _getActiveToolAndInfoCommand = function() {
    var activeToolAndInfoCommand = appCtxSvc.getCtx( 'activeToolsAndInfoCommand' );
    if( activeToolAndInfoCommand ) {
        return activeToolAndInfoCommand.commandId;
    }
};

export default exports = {
    captureImage,
    captureSnapshot,
    captureGalleryPanelRevealed
};
/**
 * @member Awv0CaptureViewService
 * @memberof NgServices
 */
app.factory( 'Awv0CaptureViewService', () => exports );

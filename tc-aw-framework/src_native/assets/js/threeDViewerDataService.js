// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * This module holds threeD viewer data
 *
 * @module js/threeDViewerDataService
 */
import app from 'app';
import eventBus from 'js/eventBus';
import appCtxSvc from 'js/appCtxService';
import aw3dViewerService from 'js/aw3dViewerService';
import awPromiseService from 'js/awPromiseService';
import logger from 'js/logger';
import ThreeDViewerData from 'js/threeDViewerData';
import awIconService from 'js/awIconService';
import viewerContextService from 'js/viewerContext.service';

var exports = {};

/**
 * Set threed viewer namespace
 * @returns {Object} object with viewer context namespace
 */
export let setThreeDViewerNamespace = function() {
    return {
        viewerCtxNamespace: aw3dViewerService.getDefaultViewerCtxNamespace()
    };
};

/**
 * Set thumbnail url
 * @param {Object}  subPanelContext  Sub panel context
 * @returns {String} thumbnail url
 */
export let setThumbnailUrl = function( subPanelContext ) {
    let selectedMO = appCtxSvc.getCtx( 'mselected' );
    if( Array.isArray( selectedMO ) && selectedMO.length > 0 ) {
        return awIconService.getThumbnailFileUrl( selectedMO[ 0 ] );
    } else if( subPanelContext && subPanelContext.datasetData ) {
        return awIconService.getThumbnailFileUrl( subPanelContext.datasetData );
    }
    return awIconService.getThumbnailFileUrl( subPanelContext );
};

/**
 * Initialize 3D viewer.
 * @param {Object} data Data from viewmodel
 * @param {Object} subPanelContext Sub panel context
 * @param {Boolean} force3DViewerReload boolean indicating if 3D should be reloaded forcefully
 *
 * @returns {Promise} A promise that is resolved with threeDInstance
 */
export let initialize3DViewer = function( data, subPanelContext, force3DViewerReload ) {
    let viewerContainerDivEle = null;
    if( data && data.viewContainerProp && data.viewContainerProp.viewerContainerDiv ) {
        viewerContainerDivEle = data.viewContainerProp.viewerContainerDiv;
    } else {
        throw 'The viewer container div can not be null';
    }
    let threeDViewerInstance = null;
    if( data.threeDInstance && data.threeDInstance instanceof ThreeDViewerData ) {
        threeDViewerInstance = data.threeDInstance;
        let deferred = awPromiseService.instance.defer();
        threeDViewerInstance.reload3DViewer().then( () => {
            deferred.resolve( threeDViewerInstance );
        } ).catch( ( error ) => {
            logger.error( error );
            deferred.resolve( threeDViewerInstance );
        } );
        return deferred.promise;
    }
    threeDViewerInstance = new ThreeDViewerData( viewerContainerDivEle );
    return threeDViewerInstance.initialize3DViewer( subPanelContext, force3DViewerReload );
};

/**
 * Reload 3D viewer.
 * @param {Object} threeDInstance Data from viewmodel
 * @param {Object} subPanelContext Sub panel context
 */
export let reload3DViewer = function( threeDInstance, subPanelContext ) {
    if( threeDInstance && typeof threeDInstance.reload3DViewer === 'function' ) {
        threeDInstance.reload3DViewer( subPanelContext );
    }
};

/**
 * Resize 3D viewer
 * @param {Object} threeDInstance Data from viewmodel
 */
export let set3DViewerSize = function( threeDInstance ) {
    if( threeDInstance && typeof threeDInstance.set3DViewerSize === 'function' ) {
        threeDInstance.set3DViewerSize();
    }
};

/**
 * Display image capture
 * @param {Object} threeDInstance Data from viewmodel
 * @param {String} fileUrl Image file url
 */
export let displayImageCapture = function( threeDInstance, fileUrl ) {
    if( threeDInstance && typeof threeDInstance.displayImageCapture === 'function' ) {
        threeDInstance.displayImageCapture( fileUrl );
    }
};

/**
 * Deactivate image capture
 * @param {Object} threeDInstance Data from viewmodel
 */
export let deactivateImageCaptureDisplayInView = function( threeDInstance ) {
    if( threeDInstance && typeof threeDInstance.deactivateImageCaptureDisplayInView === 'function' ) {
        threeDInstance.deactivateImageCaptureDisplayInView();
    }
};

/**
 * Reset parameters for 3D reload
 * @param {Boolean} isLoading - boolen indicating if 3D viewer loading is in progress
 * @returns {Array} - Array with reset parameters
 */
export let resetParametersFor3DReload = function() {
    return [ {
        displayImageCapture: false,
        loadingViewer: true,
        showViewerEmmProgress: true,
        showViewerProgress: false
    } ];
};

/**
 * Set sub command toolbar visibility
 * @param {Object} inputData - input data
 */
export let setSubCommandsToolbarVisibility = function( inputData ) {
    let subCommandList = viewerContextService.getViewerApplicationContext( inputData.viewerCtxNamespace, viewerContextService.VIEWER_SUB_COMMANDS_LIST );
    if( inputData && inputData.commandId && !( subCommandList && subCommandList[ inputData.commandId ] ) ) {
        viewerContextService.updateViewerApplicationContext( inputData.viewerCtxNamespace, viewerContextService.VIEWER_SUB_COMMANDS_LIST, {} );
        viewerContextService.updateViewerApplicationContext( inputData.viewerCtxNamespace, viewerContextService.VIEWER_IS_SUB_COMMANDS_TOOLBAR_ENABLED, true );
        viewerContextService.updateViewerApplicationContext( inputData.viewerCtxNamespace, viewerContextService.VIEWER_SUB_COMMANDS_LIST + '.' + inputData.commandId, true );
    } else {
        viewerContextService.updateViewerApplicationContext( inputData.viewerCtxNamespace, viewerContextService.VIEWER_SUB_COMMANDS_LIST, {} );
        viewerContextService.updateViewerApplicationContext( inputData.viewerCtxNamespace, viewerContextService.VIEWER_IS_SUB_COMMANDS_TOOLBAR_ENABLED, false );
    }
};

/**
 * Set viewer loading status
 * @param {Boolean} isLoading boolen indicating if viewer is loading
 * @returns {Boolean} boolean indicating if viewer is loading
 */
export let setViewerLoadingStatus = function( isLoading ) {
    return isLoading;
};

/**
 * Display image capture
 * @param {Boolean} isShow boolen indicating if image capture should be shown
 * @returns {Boolean} boolean indicating boolen indicating if image capture should be shown
 */
export let setDisplayImageCapture = function( isShow ) {
    return isShow;
};

/**
 * Show viewer emm progress
 * @param {Boolean} isShow boolen indicating is emm progress indicator should be shown
 * @returns {Boolean} boolean indicating if emm progress indicator should be shown
 */
export let showViewerEmmProgress = function( isShow ) {
    return isShow;
};

/**
 * Show viewer progress
 * @param {Boolean} isShow boolen indicating is viewer progress indicator should be shown
 * @returns {Boolean} boolean indicating if viewer progress indicator should be shown
 */
export let showViewerProgress = function( isShow ) {
    return isShow;
};

/**
 * cleanup 3D view
 * @param {String} viewerCtxNamespace viewer namespace
 */
export let cleanup3DViewer = function( viewerCtxNamespace ) {
    eventBus.publish( 'sv.cleanup3DView', { viewerCtxNamespace: viewerCtxNamespace } );
    //Close any 3D panel when moving away from 3D view
    let activeToolAndInfoCmd = appCtxSvc.getCtx( 'activeToolsAndInfoCommand' );
    if( activeToolAndInfoCmd && activeToolAndInfoCmd.commandId ) {
        eventBus.publish( 'awsidenav.openClose', {
            id: 'aw_toolsAndInfo',
            commandId: activeToolAndInfoCmd.commandId
        } );
    }
};

export default exports = {
    setThreeDViewerNamespace,
    setThumbnailUrl,
    initialize3DViewer,
    reload3DViewer,
    set3DViewerSize,
    displayImageCapture,
    deactivateImageCaptureDisplayInView,
    resetParametersFor3DReload,
    setViewerLoadingStatus,
    setDisplayImageCapture,
    showViewerEmmProgress,
    showViewerProgress,
    cleanup3DViewer,
    setSubCommandsToolbarVisibility
};

app.factory( 'threeDViewerDataService', () => exports );

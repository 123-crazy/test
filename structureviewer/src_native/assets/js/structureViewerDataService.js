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
 * This module holds structure viewer 3D data
 *
 * @module js/structureViewerDataService
 */
import app from 'app';
import eventBus from 'js/eventBus';
import appCtxSvc from 'js/appCtxService';
import StructureViewerService from 'js/structureViewerService';
import awPromiseService from 'js/awPromiseService';
import logger from 'js/logger';
import StructureViewerData from 'js/structureViewerData';
import awIconService from 'js/awIconService';
import viewerContextService from 'js/viewerContext.service';
import viewerPreferenceService from 'js/viewerPreference.service';
import viewerPerformanceService from 'js/viewerPerformance.service';
import tcSessionData from 'js/TcSessionData';
import _ from 'lodash';

var exports = {};

/**
 * Set structure viewer namespace
 * @param {Object} occmgmtContextKey occmgmt context name key
 */
export let setStructureViewerNamespace = function( occmgmtContextKey ) {
    let occmgmtContextOnLeft = false;
    let occmgmtContextOnRight = false;

    let isSplitMode = appCtxSvc.getCtx( 'splitView.mode' );
    let splitViewKeys = appCtxSvc.getCtx( 'splitView.viewKeys' );
    if( isSplitMode && splitViewKeys && splitViewKeys.length === 2 ) {
        occmgmtContextOnLeft = occmgmtContextKey === splitViewKeys[ 0 ];
        occmgmtContextOnRight = occmgmtContextKey === splitViewKeys[ 1 ];
    } else {
        occmgmtContextOnLeft = occmgmtContextKey === 'occmgmtContext';
    }

    return {
        viewerCtxNamespace: StructureViewerService.instance.getViewerCtxNamespaceUsingOccmgmtKey( occmgmtContextKey ),
        occmgmtContextOnLeft: occmgmtContextOnLeft,
        occmgmtContextOnRight: occmgmtContextOnRight,
        occmgmtContextKey: occmgmtContextKey
    };
};

/**
 * Set thumbnail url
 * @param {Object} occmgmtContextNameKey occmgmt context name key
 */
export let setThumbnailUrl = function( occmgmtContextNameKey ) {
    return awIconService.getThumbnailFileUrl( appCtxSvc.getCtx( occmgmtContextNameKey ).topElement );
};

/**
 * Initialize 3D viewer.
 * @param {Object} data Data from viewmodel
 * @param {Object} subPanelContext Sub panel context
 * @param {Boolean} force3DViewerReload boolean indicating if 3D should be reloaded forcefully
 */
export let initialize3DViewer = function( data, subPanelContext, force3DViewerReload ) {
    let viewerContainerDivEle = null;
    if( viewerPerformanceService.isPerformanceMonitoringEnabled() ) {
        viewerPerformanceService.setViewerPerformanceMode( true );
    }
    if( data && data.viewContainerProp && data.viewContainerProp.viewerContainerDiv ) {
        viewerContainerDivEle = data.viewContainerProp.viewerContainerDiv;
    } else {
        throw 'The viewer container div can not be null';
    }
    let structureViewerInstance = null;
    if( data.svInstance && data.svInstance instanceof StructureViewerData ) {
        structureViewerInstance = data.svInstance;
        let deferred = awPromiseService.instance.defer();
        structureViewerInstance.reload3DViewer().then( () => {
            deferred.resolve( structureViewerInstance );
        } ).catch( ( error ) => {
            logger.error( error );
            deferred.resolve( structureViewerInstance );
        } );
        return deferred.promise;
    }
    structureViewerInstance = new StructureViewerData( viewerContainerDivEle, subPanelContext.contextKey );
    return structureViewerInstance.initialize3DViewer( subPanelContext, force3DViewerReload );
};

/**
 * Reload 3D viewer.
 * @param {Object} svInstance Data from viewmodel
 * @param {Object} subPanelContext Sub panel context
 */
export let reload3DViewer = function( svInstance, subPanelContext ) {
    if( svInstance && typeof svInstance.reload3DViewer === 'function' ) {
        svInstance.reload3DViewer( subPanelContext );
    }
};

/**
 * Reload 3D viewer for PCI change.
 * @param {Object} svInstance Data from viewmodel
 * @param {Object} subPanelContext Sub panel context
 */
export let reload3DViewerForPCIChange = function( svInstance, subPanelContext, reloadSession ) {
    if( svInstance && typeof svInstance.reload3DViewerForPCIChange === 'function' ) {
        svInstance.reload3DViewerForPCIChange( subPanelContext, reloadSession );
    }
};

/**
 * Handle render source changed event
 * @param {Object} svInstance Data from viewmodel
 * @param {Object} subPanelContext Sub panel context
 */
export let renderSourceChanged = function( svInstance, subPanelContext ) {
    if( svInstance && typeof svInstance.handleRenderSourceChanged === 'function' ) {
        svInstance.handleRenderSourceChanged( subPanelContext );
    }
};

/**
 * Resize 3D viewer
 * @param {Object} svInstance Data from viewmodel
 */
export let set3DViewerSize = function( svInstance ) {
    if( svInstance && typeof svInstance.set3DViewerSize === 'function' ) {
        svInstance.set3DViewerSize();
    }
};

/**
 * Display image capture
 * @param {Object} svInstance Data from viewmodel
 * @param {String} fileUrl Image file url
 */
export let displayImageCapture = function( svInstance, fileUrl ) {
    if( svInstance && typeof svInstance.displayImageCapture === 'function' ) {
        svInstance.displayImageCapture( fileUrl );
    }
};

/**
 * Deactivate image capture
 * @param {Object} svInstance Data from viewmodel
 */
export let deactivateImageCaptureDisplayInView = function( svInstance ) {
    if( svInstance && typeof svInstance.deactivateImageCaptureDisplayInView === 'function' ) {
        svInstance.deactivateImageCaptureDisplayInView();
    }
};

/**
 * Send message to Vis to reconfigure viewer.
 * @param {Object} tempAppSessionResponse createOrUpdateSavedSession SOA response
 * @param {Object} svInstance Data from viewmodel
 * @param {string} occmgmtContextKey viewer occmgmtContextKe
 */
export let reconfigure3DViewer = function( tempAppSessionResponse, svInstance, occmgmtContextNameKey ) {
    if( svInstance && typeof svInstance.reconfigureViewer === 'function' ) {
        svInstance.reconfigureViewer( tempAppSessionResponse, occmgmtContextNameKey );
    }
};

/**
 * Send message to Vis to update the Show Suppressed option.
 * @param {Object} svInstance Data from viewmodel
 */
export let setShowSuppressed3DViewer = function( svInstance ) {
    if( svInstance && typeof svInstance.setShowSuppressed === 'function' ) {
        svInstance.setShowSuppressed();
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
    if( !isShow && viewerPerformanceService.isPerformanceMonitoringEnabled() && viewerPerformanceService.getViewerPerformanceInfo() === 'InitialLoading' ) {
        viewerPerformanceService.setViewerPerformanceMode( false );
        viewerPerformanceService.stopViewerPerformanceDataCapture( 'Last image loaded: ' );
    }
    return isShow;
};

/**
 * cleanup 3D view
 * @param {String} viewerCtxNamespace viewer namespace
 * @param {String} occmgmtContextKey viewer occmgmtContextKey
 */
export let cleanup3DViewer = function( viewerCtxNamespace, occmgmtContextKey ) {
    eventBus.publish( 'sv.cleanup3DView', { viewerCtxNamespace: viewerCtxNamespace, occmgmtContextKey: occmgmtContextKey } );
};

/**
 * Check if viewer needs to force reload or not
 * @param {string} occmgmtContextKey viewer occmgmtContextKey
 * @returns {boolean} true if viewer needs to force reload else return false.
 */
export let isForceReloadViewer = function( occmgmtContextKey ) {
    return StructureViewerService.instance.isForceReloadViewer( occmgmtContextKey );
};

/**
 * Check if viewer needs to force reload or not
 * @param {Object} svInstance Data from viewmodel
 */
export let saveVisAutoBookmark = function( svInstance ) {
    if( svInstance && typeof svInstance.saveVisAutoBookmark === 'function' ) {
        svInstance.saveVisAutoBookmark();
    }
};

/**
 * Check if current TC version above the specified
 *
 * @param {number} neededTcMajor Major TC version
 * @param {number} neededTcMinor Minor TC version
 * @returns {booelan} true if Tc version above else false
 */
 let isTCVersionAboveOrEqualToSpecified = function( neededTcMajor, neededTcMinor ) {
    const tcMajor = tcSessionData.getTCMajorVersion();
    const tcMinor = tcSessionData.getTCMinorVersion();
    return tcMajor > neededTcMajor ||  tcMajor === neededTcMajor && tcMinor >= neededTcMinor;
};

/**
 * This function will check whether the to disable creation of tempAppSession or not
 * @param {string} occmgmtContextKey viewer occmgmtContextKey
 * @returns {boolean} true if viewer opened object is of Fnd0WorksetRevision or its subtype or betapref contains value disableUsageOfTempAppSessionForLaunch
 */
 export let disableUsageOfTempAppSession = function( occmgmtContextKey ) {
    let viewerExposedBeta = viewerPreferenceService.getViewerBetaPref();
    if ( viewerExposedBeta && Array.isArray( viewerExposedBeta ) && _.includes( viewerExposedBeta, 'disableUsageOfTempAppSessionForLaunch' ) ||
        StructureViewerService.instance.isViewerOpenedForFnd0Workset( occmgmtContextKey ) && !isTCVersionAboveOrEqualToSpecified( 14, 1 ) ) {
        return true;
    }
    return false;
};

/**
 * Returns uid for bomline for createOrUpdateSavedSession SOA input
 */
export let prepareInputForCreateTempAppSession = function( topLinesArray ) {
    return topLinesArray[0].uid;
};

/**
 * Determines the needed data type the Vis server needs to perform a reconfigure.
 * Can also specify to reload instead of reconfiguring.
 * @param {String} occmgmtContextKey viewer occmgmtContextKey
 * @returns {String} the name of the data type needed
 */
export let getReconfigureDataType = function( occmgmtContextKey ) {
    // First, check if we are running in PLMVisWeb-based CSR. If so, we will reload instead of reconfigure the viewer.
    var renderOptions = viewerPreferenceService.getRenderSource();
    if( renderOptions && renderOptions.length && renderOptions[0] === 'CSR' ) {
        var csrMode = viewerPreferenceService.getViewerCSRPref();
        if( csrMode && csrMode === 'PVW' ) {
            // Reload the viewer instead of reconfigure.
            return 'Reload';
        }
    }

    // Now check if the TempAppSession has been disabled.
    var tempAppSessionDisabled = disableUsageOfTempAppSession( occmgmtContextKey );
    if( tempAppSessionDisabled ) {
        // Use PCI UID
        return 'PCI_UID';
    }

    // Last, check the Teamcenter version to make sure it is 13.3 or greater.
    var tcSessionData = appCtxSvc.getCtx( 'tcSessionData' );
    if( !tcSessionData ) {
        // If we can't get the server data, reload the viewer
        return 'Reload';
    }

    if( tcSessionData.tcMajorVersion === 13 && tcSessionData.tcMinorVersion >= 3 || tcSessionData.tcMajorVersion > 13 ) {
        return 'TempAppSession';
    }
        return 'PCI_UID';
};

export default exports = {
    setStructureViewerNamespace,
    setThumbnailUrl,
    initialize3DViewer,
    reload3DViewer,
    reload3DViewerForPCIChange,
    renderSourceChanged,
    set3DViewerSize,
    displayImageCapture,
    deactivateImageCaptureDisplayInView,
    reconfigure3DViewer,
    setShowSuppressed3DViewer,
    resetParametersFor3DReload,
    setViewerLoadingStatus,
    setDisplayImageCapture,
    showViewerEmmProgress,
    showViewerProgress,
    cleanup3DViewer,
    setSubCommandsToolbarVisibility,
    isForceReloadViewer,
    saveVisAutoBookmark,
    disableUsageOfTempAppSession,
    prepareInputForCreateTempAppSession,
    getReconfigureDataType
};

app.factory( 'structureViewerDataService', () => exports );

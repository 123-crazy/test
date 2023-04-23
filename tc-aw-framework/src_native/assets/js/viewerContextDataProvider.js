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
 * This service is create viewer context data
 *
 * @module js/viewerContextDataProvider
 */
import * as app from 'app';
import viewerSelectionManagerProvider from 'js/viewerSelectionManagerProvider';
import AwPromiseService from 'js/awPromiseService';
import viewerVisibilityManagerProvider from 'js/viewerVisibilityManagerProvider';
import viewerMeasurementManagerProvider from 'js/viewerMeasurementManagerProvider';
import viewer3DMarkupManagerProvider from 'js/viewer3dMarkupManagerProvider';
import viewerPmiManagerProvider from 'js/viewerPmiManagerProvider';
import viewerProximityManagerProvider from 'js/viewerProximityManagerProvider';
import viewerVolumeManagerProvider from 'js/viewerVolumeManagerProvider';
import viewerImageCaptureManagerProvider from 'js/viewerImageCaptureManagerProvider';
import viewerSectionManagerProvider from 'js/viewerSectionManagerProvider';
import viewerCriteriaColoringManagerProvider from 'js/viewerCriteriaColoringManagerProvider';
import viewerDrawTrislingManagerProvider from 'js/viewerDrawTrislingManagerProvider';
import viewerVqSceneManagerProvider from 'js/viewerVqSceneManagerProvider';
import viewerSnapshotManagerProvider from 'js/viewerSnapshotManagerProvider';
import viewerPerformanceManagerProvider from 'js/viewerPerformanceManagerProvider';
import viewerThreeDViewManagerProvider from 'js/viewerThreeDViewManagerProvider';
import viewerSessionManagerProvider from 'js/viewerSessionManagerProvider';
import viewerPartitionManagerProvider from 'js/viewerPartitionManagerProvider';
import viewerPreferenceService from 'js/viewerPreference.service';
import messagingService from 'js/messagingService';
import localeService from 'js/localeService';
import appCtxService from 'js/appCtxService';
import AwTimeoutService from 'js/awTimeoutService';
import _ from 'lodash';
import _logger from 'js/logger';
import eventBus from 'js/eventBus';
import 'jscom';
import 'manipulator';

var exports = {};

var crashCounterMap = {};

/**
 * Provides an instance of viewer interaction service
 *
 * @param {String} viewerCtxNamespace Viewer context namespace to be registered
 * @param {String} viewerType Type of viewer
 * @param {Object} contextData Context data. This is an optional field for viewerType 'GwtViewer'
 * @return {ViewerContextData} Returns viewer context data object
 */
export let getViewerContextData = function( viewerCtxNamespace, viewerType, contextData, is2D ) {
    return new ViewerContextData( viewerCtxNamespace, viewerType, contextData, is2D );
};

/**
 * Class to hold the viewer context data
 *
 * @constructor ViewerContextData
 *
 * @param {String} viewerCtxNamespace Viewer context namespace to be registered
 * @param {String} viewerType One of the type specified in {@link viewerContextService.ViewerType}
 * @param {Object} contextData Context data. This is an optional field for viewerType 'GwtViewer'
 */
var ViewerContextData = function( viewerCtxNamespace, viewerType, contextData, is2D ) {
    var self = this;

    var m_is2D = _.isNull( is2D ) || _.isUndefined( is2D ) ? false : is2D;

    var m_viewerCtxNamespace = viewerCtxNamespace;
    var m_viewerType = viewerType;
    var m_contextData = contextData;
    var m_viewerConnectionCloseListeners = [];
    var m_viewerConnectionProblemListeners = [];
    var m_viewerLongPressListeners = [];
    var m_viewerSelectionManager = null;
    var m_viewerVisibilityManager = null;
    var m_viewerMeasurementManager = null;
    var m_viewer3DMarkupManager = null;
    var m_viewerCtxService = null;
    var m_pmiMgr = null;
    var m_modelViewMgr = null;
    var m_proximityMgr = null;
    var m_volumeMgr = null;
    var m_snapshotMgr = null;
    var m_imgCapturemgr = null;
    var m_sectionMgr = null;
    var m_criteriaColoringMgr = null;
    var m_drawMgr = null;
    var m_vqSceneMgr = null;
    var m_performanceMgr = null;
    var m_threeDViewMgr = null;
    var m_sessionMgr = null;
    var m_partitionMgr = null;
    var m_isClosed = false;
    var m_navigationModeStr = null;
    var m_featureEdgesBadTopoErrorDisplayed = false;

    self.ViewerSearchActions = {
        SET_VISIBLE: window.JSCom.Consts.SearchAction.SET_VISIBLE,
        SET_VIEW_ONLY: window.JSCom.Consts.SearchAction.SET_VIEW_ONLY,
        SET_INVISIBLE: window.JSCom.Consts.SearchAction.SET_INVISIBLE
    };

    /** Error Handler */
    var errorHandler = {
        error: function( err ) {
            if( err.name === 'TcVisLicenseLevelInsuffcientError' ) {
                _logger.error( 'Error: ' + err.message );
            } else if( err.name === 'TcVisClientSelectionLimitError' ) {
                let errorMessage = self.getThreeDViewerMsg( 'AreaSelectLimitExceededText' );
                let numberOfParts = _.toString( err.message );
                let splitOnFirstParentheses = numberOfParts.split( '[' );
                let splitOnSecondParentheses = splitOnFirstParentheses[ 1 ].split( ']' );
                errorMessage = _.replace( errorMessage, '{0}', splitOnSecondParentheses[ 0 ] );
                viewerPreferenceService.getSelectionLimit().then( ( selectionLimit ) => {
                    errorMessage = _.replace( errorMessage, '{1}', _.toString( selectionLimit ) );
                    messagingService.showInfo( errorMessage );
                } );
            } else if( err.name === 'BadTopomeshMeasurementError' ) {
                let errorMessage = self.getThreeDViewerMsg( 'MeasurementBadTopomeshErrorMessage' );
                messagingService.showError( errorMessage );
            } else if( err.name === 'BadTopomeshDisplayError' && !m_featureEdgesBadTopoErrorDisplayed ) {
                let errorMessage = self.getThreeDViewerMsg( 'FeatureEdgesBadTopomeshErrorMessage' );
                messagingService.showError( errorMessage );
                m_featureEdgesBadTopoErrorDisplayed = true;
            }
        }
    };

    /**
     * Return if this is a 2D view or not
     * @returns {Boolean} true if 2D view
     */
    self.getIs2D = function() {
        return m_is2D;
    };
    /**
     * Add viewer connection close listener
     *
     * @param {Object} observerFunction function to be registered
     * @param {Object} functionContext context in which function should run
     */
    self.addViewerConnectionCloseListener = function( observerFunction, functionContext ) {
        if( typeof observerFunction === 'function' ) {
            m_viewerConnectionCloseListeners.push( { observerFunction: observerFunction, functionContext: functionContext } );
        }
    };

    /**
     * remove viewer connection close listener
     *
     * @param {Object} observerFunction function to be removed
     */
    self.removeViewerConnectionCloseListener = function( observerFunction ) {
        if( typeof observerFunction === 'function' ) {
            var indexToBeRemoved = m_viewerConnectionCloseListeners.map( function( item ) { return item.observerFunction; } ).indexOf( observerFunction );
            if( indexToBeRemoved > -1 ) {
                m_viewerConnectionCloseListeners.splice( indexToBeRemoved, 1 );
            }
        }
    };

    /**
     * remove viewer connection close listener
     *
     * @param {Object} observerFunction function to be removed
     */
    var notifyViewerConnectionClose = function() {
        if( m_viewerConnectionCloseListeners.length > 0 ) {
            _.forEach( m_viewerConnectionCloseListeners, function( observerEntry ) {
                observerEntry.observerFunction.call( observerEntry.functionContext, self );
            } );
        }
    };

    /**
     * Add viewer connection problem listener
     *
     * @param {Object} observerFunction function to be registered
     * @param {Object} functionContext context in which function should run
     */
    self.addViewerConnectionProblemListener = function( observerFunction, functionContext ) {
        if( typeof observerFunction === 'function' ) {
            m_viewerConnectionProblemListeners.push( { observerFunction: observerFunction, functionContext: functionContext } );
        }
    };

    /**
     * Remove viewer connection problem listener
     *
     * @param {Object} observerFunction function to be removed
     */
    self.removeViewerConnectionProblemListener = function( observerFunction ) {
        if( typeof observerFunction === 'function' ) {
            var indexToBeRemoved = m_viewerConnectionProblemListeners.map( function( item ) { return item.observerFunction; } ).indexOf( observerFunction );
            if( indexToBeRemoved > -1 ) {
                m_viewerConnectionProblemListeners.splice( indexToBeRemoved, 1 );
            }
        }
    };

    /**
     * Notify viewer connection problem listener
     *
     * @param {Object} observerFunction function to be removed
     */
    var notifyViewerConnectionProblem = function() {
        var activeToolAndInfoCmd = appCtxService.getCtx( 'activeToolsAndInfoCommand' );
        if( activeToolAndInfoCmd && activeToolAndInfoCmd.commandId ) {
            eventBus.publish( 'awsidenav.openClose', {
                id: 'aw_toolsAndInfo',
                commandId: activeToolAndInfoCmd.commandId
            } );
        }
        AwTimeoutService.instance( function() {
            if( m_viewerConnectionProblemListeners.length > 0 ) {
                _.forEach( m_viewerConnectionProblemListeners, function( observerEntry ) {
                    observerEntry.observerFunction.call( observerEntry.functionContext, self );
                } );
            }
        } );
    };

    /**
     * Add viewer long press listener
     *
     * @param {Object} observerFunction function to be registered
     * @param {Object} functionContext context in which function should run
     */
    self.addViewerLongPressListener = function( observerFunction, functionContext ) {
        if( typeof observerFunction === 'function' ) {
            m_viewerLongPressListeners.push( { observerFunction: observerFunction, functionContext: functionContext } );
        }
    };

    /**
     * Remove viewer long press listener
     * @param {Object} observerFunction function to be removed
     */
    self.removeViewerLongPressListener = function( observerFunction ) {
        if( typeof observerFunction === 'function' ) {
            var indexToBeRemoved = m_viewerLongPressListeners.map( function( item ) { return item.observerFunction; } ).indexOf( observerFunction );
            if( indexToBeRemoved > -1 ) {
                m_viewerLongPressListeners.splice( indexToBeRemoved, 1 );
            }
        }
    };

    /**
     * Notify viewer long press
     *
     * @param {Object} observerFunction function to be removed
     */
    var notifyViewerLongPress = function() {
        if( m_viewerLongPressListeners.length > 0 ) {
            _.forEach( m_viewerLongPressListeners, function( observerEntry ) {
                observerEntry.observerFunction.call( observerEntry.functionContext, self );
            } );
        }
    };

    /**
     * Get viewer context namespace
     */
    self.getViewerCtxNamespace = function() {
        return m_viewerCtxNamespace;
    };

    /**
     * specifies the type of viewer.
     * @returns {String} viewer type string
     */
    self.getViewerType = function() {
        return m_viewerType;
    };

    /**
     * Context data for viewer. It will be a view object for js viewer.
     */
    var getContextData = function() {
        return m_contextData;
    };

    /**
     * @deprecated This api should not be used, use managers instead of calling viewer view apis' directly
     */
    self.getViewerView = function() {
        return m_contextData;
    };

    /**
     * Set the zoom direction reversed
     *
     * @param {boolean} isReversed boolean specifying if zoom direction should be reversed.
     */
    self.setZoomReversed = function( isReversed ) {
        getContextData().navigationMgr.setZoomReversed( isReversed );
    };

    /**
     * Set the viewer view size
     *
     * @param {Number} width width to be set
     * @param {Number} height height to be set
     */
    self.setSize = function( width, height ) {
        getContextData().setSize( width, height );
    };

    /**
     * Get the viewer view size
     */
    self.getSize = function() {
        return getContextData().getSize();
    };

    /**
     * Get previously set navigation mode
     */
    self.getPreviousNavigationMode = function() {
        return m_navigationModeStr;
    };

    /**
     *@param {String} navigationModeStr navigation mode to be set
     */
    self.setPreviousNavigationMode = function( navigationModeStr ) {
        m_navigationModeStr = navigationModeStr;
    };

    /**
     * Set the page
     */
    self.setCurrentPage = function( page ) {
        return getContextData().setCurrentPage( page );
    };

    /**
     * Fit the 2D view
     */
    self.fit2DView = function( page ) {
        return getContextData().fit2DView();
    };

    /**
     * Clockwise Rotate the 2D view 90 degree
     */
    self.rotate2DCW90 = function( page ) {
        return getContextData().rotate2DCW90();
    };

    /**
     * Counter Clockwise Rotate the 2D view 90 degree
     */
    self.rotate2DCCW90 = function( page ) {
        return getContextData().rotate2DCCW90();
    };

    /**
     * Set the mouse move functionality.  If try, mouse move pans.
     * If false, mouse move zooms.
     */
    self.setMouseMovePan = function( bPan ) {
        return getContextData().setMouseMovePan( bPan );
    };

    /**
     * Set the viewport based on the center of the markup and the zoom factor
     * in effect when the markup was created.
     */
    self.set2DViewport = function( originalScale, cntrX, cntrY ) {
        return getContextData().set2DViewport( originalScale, cntrX, cntrY );
    };

    /**
     * Get the navigation manager
     */
    self.getNavigationManager = function() {
        return getContextData().navigationMgr;
    };

    /**
     * Get the navigation manager
     */
    self.getThreeDViewManager = function() {
        return m_threeDViewMgr;
    };

    /**
     * Get the selection manager
     */
    self.getSelectionManager = function() {
        return m_viewerSelectionManager;
    };

    /**
     * Get the measurement manager
     */
    self.getMeasurementManager = function() {
        return m_viewerMeasurementManager;
    };

    /**
     * Get the 3D Markup manager
     */
    self.get3DMarkupManager = function() {
        return m_viewer3DMarkupManager;
    };

    /**
     * Get the selection manager
     */
    self.getVisibilityManager = function() {
        return m_viewerVisibilityManager;
    };

    /**
     * Get the PMI manager
     */
    self.getPmiManager = function() {
        return m_pmiMgr;
    };

    /**
     * Get the Model View PMI manager
     */
    self.getModelViewManager = function() {
        return m_modelViewMgr;
    };

    /**
     * Get the Proximity manager
     */
    self.getProximityManager = function() {
        return m_proximityMgr;
    };

    /**
     * Get the Volume manager
     */
    self.getVolumeManager = function() {
        return m_volumeMgr;
    };

    /**
     * Get the snapshot manager
     */
    self.getSnapshotManager = function() {
        return m_snapshotMgr;
    };

    /**
     * Get the Session manager
     */
    self.getSessionMgr = function() {
        return m_sessionMgr;
    };

    /**
     * Get the Partition manager
     */
    self.getPartitionMgr = function() {
        return m_partitionMgr;
    };

    /**
     * Get the section manager
     */
    self.getSectionManager = function() {
        return m_sectionMgr;
    };

    /**
     * Get the draw manager
     */
    self.getDrawManager = function() {
        return m_drawMgr;
    };

    self.getSearchMgr = function() {
        return contextData.searchMgr;
    };

    self.getDynamicUpdateMgr = function() {
        return contextData.dynamicUpdateMgr;
    };

    /**
     * Set viewer context service
     *
     * @param {Object} viewerCtxSvc ctx service
     */
    self.setViewerCtxSvc = function( viewerCtxSvc ) {
        m_viewerCtxService = viewerCtxSvc;
    };

    /**
     * Update the selection display mode
     *
     * @function setUseTransparency
     *
     * @param {Boolean} isUseTransparency - true if UseTransparency option should be turned on
     */
    self.setUseTransparency = function( isUseTransparency ) {
        m_viewerCtxService.setUseTransparency( self.getViewerCtxNamespace(), isUseTransparency );
    };

    /**
     * Set alternate pci availability
     *
     * @function setAlternatePCI
     *
     * @param {Boolean} hasAlternatePCI - true if PCI being loaded has alternate indexed PCI
     */
    self.setHasAlternatePCI = function( hasAlternatePCI ) {
        m_viewerCtxService.updateViewerApplicationContext( m_viewerCtxNamespace,
            m_viewerCtxService.VIEWER_HAS_ALTERNATE_PCI_TOKEN, hasAlternatePCI );
    };

    /**
     * Get alternate pci availability
     *
     * @function getAlternatePCI
     *
     * @returns {Boolean} true if PCI being loaded has alternate indexed PCI
     */
    self.getHasAlternatePCI = function() {
        return m_viewerCtxService.getViewerApplicationContext( m_viewerCtxNamespace,
            m_viewerCtxService.VIEWER_HAS_ALTERNATE_PCI_TOKEN );
    };

    /**
     * Update current viewer product context
     *
     * @param {Object} modelObject Model object
     */
    self.updateCurrentViewerProductContext = function( modelObject ) {
        m_viewerCtxService.updateViewerApplicationContext( m_viewerCtxNamespace,
            m_viewerCtxService.VIEWER_CURRENT_PRODUCT_CONTEXT_TOKEN, modelObject );
    };

    /**
     * Update selected on command visibility
     *
     * @param {Boolean} isVisible true if command should be visible
     */
    self.updateSelectedOnCommandVisibility = function( isVisible ) {
        m_viewerCtxService.updateViewerApplicationContext( m_viewerCtxNamespace,
            m_viewerCtxService.VIEWER_SELECTED_ON_VISIBILITY_TOKEN, isVisible );
    };

    /**
     * Update selected off command visibility
     *
     * @param {Boolean} isVisible true if command should be visible
     */
    self.updateSelectedOffCommandVisibility = function( isVisible ) {
        m_viewerCtxService.updateViewerApplicationContext( m_viewerCtxNamespace,
            m_viewerCtxService.VIEWER_SELECTED_OFF_VISIBILITY_TOKEN, isVisible );
    };

    /**
     * Update context on command visibility
     *
     * @param {Boolean} isVisible true if command should be visible
     */
    self.updateContextOnCommandVisibility = function( isVisible ) {
        m_viewerCtxService.updateViewerApplicationContext( m_viewerCtxNamespace,
            m_viewerCtxService.VIEWER_CONTEXT_ON_VISIBILITY_TOKEN, isVisible );
    };

    /**
     * Get viewer current product context
     */
    self.getCurrentViewerProductContext = function() {
        return m_viewerCtxService.getViewerApplicationContext( m_viewerCtxNamespace,
            m_viewerCtxService.VIEWER_CURRENT_PRODUCT_CONTEXT_TOKEN );
    };

    /**
     * Set viewer context service
     *
     * @param {Object} Viewer ctx service
     */
    self.getViewerCtxSvc = function() {
        return m_viewerCtxService;
    };

    /**
     * Get viewer message for key
     *
     * @function getThreeDViewerMsg
     */
    self.getThreeDViewerMsg = function( key ) {
        var localTextBundle = localeService.getLoadedText( 'Awv0threeDViewerMessages' );
        return localTextBundle[ key ];
    };

    /**
     * Viewer connection problem listener
     *
     * @param {JSCom.EMM.BadConnectionStateError} badConnectionStateError error message
     */
    self.viewerConnectionProblemListener = function( badConnectionStateError ) {
        var currentNameSpace = self.getViewerCtxNamespace();
        if( badConnectionStateError.name === 'SessionTerminatedError' ) {
            if( !crashCounterMap.hasOwnProperty( currentNameSpace ) ) {
                crashCounterMap[ currentNameSpace ] = 0;
            }
            crashCounterMap[ currentNameSpace ] = crashCounterMap[ currentNameSpace ] + 1;
            if( crashCounterMap[ currentNameSpace ] < 4 ) {
                messagingService.showInfo( self.getThreeDViewerMsg( 'internalError' ) );
                notifyViewerConnectionProblem();
            } else {
                crashCounterMap[ currentNameSpace ] = 0;
                messagingService.showError( self.getThreeDViewerMsg( 'repeatedFailure' ) );
            }
        } else {
            messagingService.showInfo( self.getThreeDViewerMsg( 'attemptVisServerReconnect' ) );
            notifyViewerConnectionProblem();
        }
    };

    /**
     * Viewer Long Press listener
     */
    self.viewerLongPressListener = function() {
        notifyViewerLongPress();
    };

    /**
     * Get the Image Capture manager
     */
    self.getImageCaptureManager = function() {
        return m_imgCapturemgr;
    };

    /**
     * Get if final draw is done in view
     * @return {Promise} Promise that is resolved when final draw is done in viewer
     */
    self.getFinalDrawCompleted = function() {
        return getContextData().waitForFinalDraw();
    };

    /**
     * Get the criteria coloring manager
     */
    self.getCriteriaColoringManager = function() {
        return m_criteriaColoringMgr;
    };

    /**
     * Get the Trisling draw manager
     */
    self.getDrawTrislingManager = function() {
        return m_drawMgr;
    };

    /**
     * Get the VQScene manager
     */
    self.getVqSceneManager = function() {
        return m_vqSceneMgr;
    };

    /**
     * Get the Performance Manager
     */
    self.getPerformanceManager = function() {
        return m_performanceMgr;
    };

    /**
     * Set the update view callback function
     */
    self.setViewUpdateCallback = function( callback ) {
        return getContextData().setViewUpdateCallback( callback );
    };

    /**
     * boolean indicating is view is MMV enabled
     * @returns {Boolean} boolean indicating is view is MMV enabled
     */
    self.isMMVRendering = function() {
        return getContextData().isMMVRendering();
    };

    /**
     * boolean indicating if Server side render possible in view
     * @returns {Boolean} boolean indicating if Server side render possible in view
     */
    self.isServerSideRenderPossible = function() {
        return getContextData().isServerSideRenderPossible();
    };

    /**
     * Initialize the Viewer Context Data
     */
    self.initialize = function( viewerCtxSvc ) {
        if( viewerCtxSvc ) {
            self.setViewerCtxSvc( viewerCtxSvc );
        }
        if( m_viewerType === 'JsViewer' ) {
            m_viewerSelectionManager = viewerSelectionManagerProvider.getViewerSelectionManager( viewerCtxNamespace,
                contextData, self );

            m_viewerVisibilityManager = new viewerVisibilityManagerProvider( viewerCtxNamespace, contextData, self );

            m_viewerMeasurementManager = viewerMeasurementManagerProvider.getViewerMeasurementManager(
                viewerCtxNamespace, contextData, self );

            m_viewer3DMarkupManager = viewer3DMarkupManagerProvider.getViewer3DMarkupManager(
                viewerCtxNamespace, contextData, self );

            m_pmiMgr = viewerPmiManagerProvider.getPmiManager( viewerCtxNamespace, contextData, self );

            m_modelViewMgr = viewerPmiManagerProvider.getModelViewManager( viewerCtxNamespace, contextData,
                self );

            m_proximityMgr = viewerProximityManagerProvider.getProximityManager( viewerCtxNamespace,
                contextData, self );

            m_volumeMgr = viewerVolumeManagerProvider.getVolumeManager( viewerCtxNamespace, contextData, self );

            m_imgCapturemgr = viewerImageCaptureManagerProvider.getImgCaptureManager( viewerCtxNamespace,
                contextData, self );

            m_sectionMgr = viewerSectionManagerProvider.getViewerSectionManager( viewerCtxNamespace,
                contextData, self );

            m_criteriaColoringMgr = viewerCriteriaColoringManagerProvider.getCriteriaColoringManager( viewerCtxNamespace,
                contextData, self );

            m_drawMgr = viewerDrawTrislingManagerProvider.getViewerDrawManager( viewerCtxNamespace, contextData, self );

            m_vqSceneMgr = viewerVqSceneManagerProvider.getVqSceneMgr( viewerCtxNamespace, contextData, self );

            m_snapshotMgr = viewerSnapshotManagerProvider.getSnapshotManager( viewerCtxNamespace, contextData, self );

            m_performanceMgr = viewerPerformanceManagerProvider.getPerformanceManager( viewerCtxNamespace, contextData, self );

            m_threeDViewMgr = viewerThreeDViewManagerProvider.getThreeDViewManager( viewerCtxNamespace, contextData, self );

            m_sessionMgr = viewerSessionManagerProvider.getSessionManager( viewerCtxNamespace, contextData, self );

            m_partitionMgr = viewerPartitionManagerProvider.getPartitionManager( viewerCtxNamespace, contextData, self );

            contextData.listenerMgr.addConnectionProblemListener( self.viewerConnectionProblemListener );

            contextData.listenerMgr.addLongPressListener( self.viewerLongPressListener );

            setUpErrorHandler( true, errorHandler );
        }
    };

    /**
     * Setup/Remove error handler (Internal)
     * @param  {Boolean} enable true if to attach error handler
     * @param  {Object} customErrorHandler error handler object
     */
    function setUpErrorHandler( enable, customErrorHandler ) {
        window.JSCom.EMM.ViewerErrorHandler.useHandlerCustom( enable, customErrorHandler );
    }

    /**
     * @returns {Boolean} returns if connection is closed
     */
    self.isConnectionClosed = function() {
        return m_isClosed;
    };

    /**
     * Close the viewer view
     */
    self.close = function( isPageClose ) {
        if( m_isClosed ) {
            return AwPromiseService.instance.resolve();
        }
        contextData.listenerMgr.removeConnectionProblemListener( self.viewerConnectionProblemListener );
        contextData.listenerMgr.removeLongPressListener( self.viewerLongPressListener );
        setUpErrorHandler( false, errorHandler );
        notifyViewerConnectionClose();
        m_isClosed = true;

        return getContextData().shutdown( isPageClose );
    };
};

export default exports = {
    getViewerContextData
};
/**
 * This service is used to create ViewerContextData
 *
 * @memberof NgServices
 */
app.factory( 'viewerContextDataProvider', () => exports );

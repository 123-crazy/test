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
 * @module js/structureViewerData
 */
import _ from 'lodash';
import eventBus from 'js/eventBus';
import imgViewer from 'js/ImgViewer';
import logger from 'js/logger';
import awPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import strViewerSelectionHandlerPvd from 'js/structureViewerSelectionHandlerProvider';
import strViewerVisibilityHandlerPvd from 'js/structureViewerVisibilityHandlerProvider';
import StructureViewerService from 'js/structureViewerService';
import objectToCSIDGeneratorService from 'js/objectToCSIDGeneratorService';
import AwWindowService from 'js/awWindowService';
import AwTimeoutService from 'js/awTimeoutService';
import structureSearchService from 'js/structureSearchService';
import visLaunchInfoProvider from 'js/openInVisualizationProductContextInfoProvider';
import productLaunchInfoProviderService from 'js/productLaunchInfoProviderService';
import viewerPreferenceService from 'js/viewerPreference.service';
import TracelinkSelectionHandler from 'js/tracelinkSelectionHandler';
import viewerCtxSvc from 'js/viewerContext.service';
import VisOccmgmtCommunicationService from 'js/visOccmgmtCommunicationService';
import viewerPerformanceService from 'js/viewerPerformance.service';
import cdm from 'soa/kernel/clientDataModel';
import localeService from 'js/localeService';
import msgSvc from 'js/messagingService';

export default class StructureViewerData {
    /**
     * StructureViewerData constructor
     * @param {Object} viewerContainerElement - The DOM element to contain the viewer canvas
     * @param {Object} occmgmtContextNameKey occmgmt context name key
     */
    constructor( viewerContainerElement, occmgmtContextNameKey ) {
        if( _.isNull( viewerContainerElement ) || _.isUndefined( viewerContainerElement ) ) {
            logger.error( 'Viewer container element can not be null' );
            throw 'Viewer container element can not be null';
        }
        if( _.isNull( occmgmtContextNameKey ) || _.isUndefined( occmgmtContextNameKey ) || _.isEmpty( occmgmtContextNameKey ) ) {
            logger.error( 'Occmgmt context key name can not be null' );
            throw 'Occmgmt context key name can not be null';
        }
        this.viewerContainerElement = viewerContainerElement;
        this.occmgmtContextNameKey = occmgmtContextNameKey;
        this.viewerImageCaptureContainer = null;
        this.viewerCtxData = null;
        this.viewerContext = null;
        this.structureViewerSelectionHandler = null;
        this.structureViewerVisibilityHandler = null;
        this.colorGroupingProperty = null;
        this.colorCriteria = [];
        this.ROOT_ID = '';
        this.structureConfiguration = null;
        this.viewerType = '';
        this.pvwCsrUnsupportedMsgShown = false;

        //Events subscriptions
        this.resizeTimeoutPromise = null;
        this.productContextInfoChangedEvent = null;
        this.awGroupObjCategoryChangeEventListener = null;
        this.colorTogglingEventListener = null;
        this.viewerSearchEventSub = null;
        this.cleanup3DViewEvent = null;
        this.mvProxySelectionChangedEventListener = null;
        this.restoreActionListener = null;
    }

    /**
     * Initialize 3D viewer.
     * @param {Object} subPanelContext Sub panel context
     * @param {Boolean} force3DViewerReload boolean indicating if 3D should be reloaded forcefully
     */
    initialize3DViewer( subPanelContext, force3DViewerReload, reloadSession ) {
        let self = this;
        self.setViewerLoadingStatus( true );
        if( !force3DViewerReload ) {
            self.setIndexedPreference();
        }
        self.viewerContext = StructureViewerService.instance.getPCIModelObject( self.occmgmtContextNameKey );
        return TracelinkSelectionHandler.instance.arePrefsFilled().then( () => {
            let isShowAll = true;
            let isRootLogical = TracelinkSelectionHandler.instance.isRootSelectionTracelinkType();
            if( isRootLogical ) {
                isShowAll = false;
            } else if( appCtxSvc.ctx.hasOwnProperty( 'showGraphics' ) ) {
                isShowAll = appCtxSvc.ctx.showGraphics;
            }
            if( force3DViewerReload ||
                !StructureViewerService.instance.isAppSessionBeingOpened( self.viewerContext ) &&
                !StructureViewerService.instance.isSameProductOpenedAsPrevious( self.viewerContext, self.occmgmtContextNameKey ) ) {
                return StructureViewerService.instance.cleanUpPreviousView( self.occmgmtContextNameKey ).then( () => {
                    return viewerPreferenceService.getSelectionLimit().then( ( selectionLimit ) => {
                        StructureViewerService.instance.removePciFromAceResetState( self.occmgmtContextNameKey );
                        return StructureViewerService.instance.getViewerLoadInputParameter( self.viewerContext,
                            self.compute3DViewerWidth(), self.compute3DViewerHeight(), isShowAll, null, self.occmgmtContextNameKey, reloadSession, selectionLimit );
                    } );
                } ).then( ( viewerLoadInputParams ) => {
                    if( subPanelContext.viewerSecurityMarkerHandlerFnKey ) {
                        viewerLoadInputParams.setSecurityMarkingHandlerKey( subPanelContext.viewerSecurityMarkerHandlerFnKey );
                    }
                    viewerLoadInputParams.initializeViewerContext();
                    self.viewerCtxData = viewerLoadInputParams.getViewerContext();
                    self.registerForConnectionProblems();
                    return StructureViewerService.instance.getViewerView( viewerLoadInputParams, self.occmgmtContextNameKey );
                } ).then( ( viewerData ) => {
                    if( StructureViewerService.instance.hasAlternatePCI( StructureViewerService.instance.getViewerPCIToBeLoaded( self.occmgmtContextNameKey ) ) ) {
                        viewerData[ 0 ].setHasAlternatePCI( true );
                    } else {
                        viewerData[ 0 ].setHasAlternatePCI( false );
                    }
                    return viewerData;
                } );
            }

            return StructureViewerService.instance.restorePreviousView( self.occmgmtContextNameKey ).then( ( viewerData ) => {
                self.viewerCtxData = viewerData[ 0 ];
                self.registerForConnectionProblems();
                let splitViewCtx = appCtxSvc.getCtx( 'splitView' );
                if( splitViewCtx && splitViewCtx.mode ) {
                    //disable bookmark for split view via EMM
                    viewerData[ 0 ].getSessionMgr().disableBookmark( true );
                }

                AwTimeoutService.instance( function() {
                    eventBus.publish( 'emmProgressIndicator', {
                        viewerContext: viewerData[ 0 ].getViewerCtxNamespace(),
                        emmProgressIndicatorStatus: false
                    } );
                }, 500 );
                return viewerData;
            } );
        } ).then( ( viewerData ) => {
            self.viewerContainerElement.append( viewerData[ 1 ] );
            self.viewerCtxData = viewerData[ 0 ];
            self.viewerType = self.viewerCtxData.getViewerCtxNamespace();
            self.viewerCtxData.getSelectionManager().setSelectionEnabled( true );
            StructureViewerService.instance.setOccmgmtContextNameKeyOnViewerContext( self.viewerCtxData.getViewerCtxNamespace(), self.occmgmtContextNameKey );
            self.viewerCtxData.updateCurrentViewerProductContext( appCtxSvc.getCtx( self.occmgmtContextNameKey ).topElement );
            self.structureConfiguration = self.getStructureConfiguration();
            self.setPartitionScheme();
            VisOccmgmtCommunicationService.instance.subscribe( self );
            self.setup3DViewerVisibilityHandler();
            self.setup3DViewerSelectionHandler( subPanelContext.selectedModelObjects );
            self.setupViewerImageCaptureContainer();
            self.registerForResizeEvents();
            self.registerForOther3ViewerEvents();
            self.registerForAceSearchEvent();
            self.registerAsViewerLaunchInfoProvider();
            self.setHostElement();
            if( !self.viewerCtxData.isMMVRendering() ) {
                viewerCtxSvc.setShadedMode( self.viewerCtxData.getViewerCtxNamespace(), viewerPreferenceService.getShadedWithEdgesPreference() ? 1 : 0 );
            }
            viewerCtxSvc.updateViewerApplicationContext( self.viewerCtxData.getViewerCtxNamespace(),
                viewerCtxSvc.VIEWER_IS_MMV_ENABLED_TOKEN, self.viewerCtxData.isMMVRendering() );
            StructureViewerService.instance.deregisterFilterReloadEvent();
            self.setViewerLoadingStatus( false );
            StructureViewerService.instance.setHasDisclosureData( self.viewerCtxData.getViewerCtxNamespace(),
                appCtxSvc.getCtx( self.occmgmtContextNameKey ).currentState.uid );
            AwTimeoutService.instance( function() {
                self.set3DViewerSize();
            } );
            if( self.launchSnapshotGalleyPanel ) {
                viewerCtxSvc.activateViewerCommandPanel( 'Awv0CaptureGallery', 'aw_toolsAndInfo', this.viewerCtxData.getViewerCtxNamespace(), false );
                self.launchSnapshotGalleyPanel = false;
            }
            return this;
        } ).catch( ( error ) => {
            logger.error( 'Failed to load viewer : ' + error );
            self.setViewerLoadingStatus( false );
            return error;
        } );
    }

    /**
     * Initializes Indexed/Non-Indexed Mode
     */
    setIndexedPreference() {
        let uIds = StructureViewerService.instance.getPCIModelObject( this.occmgmtContextNameKey );
        if( !StructureViewerService.instance.isSameProductOpenedAsPrevious( uIds, this.occmgmtContextNameKey ) ) {
            let pciModelObj = StructureViewerService.instance.getViewerPCIToBeLoaded( this.occmgmtContextNameKey );
            if( StructureViewerService.instance.hasAlternatePCI( pciModelObj ) ) {
                viewerPreferenceService.setUseAlternatePCIPreference( 'INDEXED' );
            } else {
                viewerPreferenceService.setUseAlternatePCIPreference( 'NO_INDEXED' );
            }
        }
    }

    /**
     * Set 3d viewer loading status
     * @param {Boolean} isLoading is viewer loading
     */
    setViewerLoadingStatus( isLoading ) {
        this.isLoading = isLoading;
        eventBus.publish( 'sv.viewerLoadingStatus', {
            viewerContext: StructureViewerService.instance.getViewerCtxNamespaceUsingOccmgmtKey( this.occmgmtContextNameKey ),
            loadingStatus: isLoading
        } );
    }

    /**
     * Register for viewer visibility events
     */
    registerForConnectionProblems() {
        this.viewerCtxData.addViewerConnectionProblemListener( this.handle3DViewerConnectionProblem, this );
    }

    /**
     * Handler for 3D viewer connection issues
     * @param {Object} viewerCtxDataRef - reference to viewer context data
     */
    handle3DViewerConnectionProblem() {
        this.notify3DViewerReload();
    }

    /**
     * Notify reset parameters  for 3D viewer reload
     */
    notifyResetParametersFor3DReload() {
        eventBus.publish( 'sv.resetParametersFor3DReload', { viewerContext: this.viewerCtxData.getViewerCtxNamespace() } );
    }

    /**
     * Notify 3D viewer reload event
     */
    notify3DViewerReload() {
        eventBus.publish( 'sv.reload3DViewer', { viewerContext: this.viewerCtxData.getViewerCtxNamespace() } );
    }

    /**
     * Notify 3D viewer that the Show Suppressed option has been toggled
     */
    notify3DViewerShowSuppressed() {
        eventBus.publish( 'sv.toggleShowSuppressed3DViewer', { viewerContext: this.viewerCtxData.getViewerCtxNamespace() } );
    }

    /**
     * Notify 3D viewer reload for PCI change event
     */
    notify3DViewerReloadForPCIChange() {
        let occmgmtCtx = appCtxSvc.getCtx( this.occmgmtContextNameKey );
        let reloadSession = occmgmtCtx.openedElement.modelType.typeHierarchyArray.indexOf( 'Fnd0AppSession' ) !== -1;
        eventBus.publish( 'sv.reload3DViewerForPCI', { viewerContext: this.viewerCtxData.getViewerCtxNamespace(), reloadSession: reloadSession } );
    }

    /**
     * Notify display image capture
     * @param {Boolean} isShow - boolean indicating if image capture should be shown
     */
    notifyDisplayImageCapture( isShow ) {
        eventBus.publish( 'sv.displayImageCapture', {
            viewerContext: this.viewerCtxData.getViewerCtxNamespace(),
            isShow: isShow
        } );
    }

    /**
     * Reload 3D viewer.
     * @param {Object} subPanelContext Sub panel context
     */
    reload3DViewer( subPanelContext ) {
        if( this.isLoading ) {
            return awPromiseService.instance.reject( 'Already loading!' );
        }
        let self = this;
        this.notifyResetParametersFor3DReload();
        let currentlyInvisibleCsids = this.viewerCtxData.getVisibilityManager().getInvisibleCsids()
            .slice();
        let currentlyInvisibleExpCsids = this.viewerCtxData.getVisibilityManager()
            .getInvisibleExceptionCsids().slice();
        this.ctrlCleanup( true );
        viewerPreferenceService.setEnableDrawingPref( false );
        return this.initialize3DViewer( subPanelContext, true ).then( () => {
            self.viewerCtxData.getVisibilityManager().restoreViewerVisibility( currentlyInvisibleCsids, currentlyInvisibleExpCsids ).then( function() {
                viewerPreferenceService.setEnableDrawingPref( true );
                self.viewerCtxData.getDrawManager().enableDrawing( true );
                self.structureViewerVisibilityHandler.viewerVisibilityChangedListener();
            } );
        } ).catch( ( error ) => {
            logger.error( 'Failed to load viewer : ' + error );
            return awPromiseService.instance.reject( error );
        } );
    }

    /**
     * Reload 3D viewer for PCI change.
     * @param {Object} subPanelContext Sub panel context
     */
    reload3DViewerForPCIChange( subPanelContext, reloadSession ) {
        if( this.isLoading ) {
            return;
        }
        this.notifyResetParametersFor3DReload();
        this.ctrlCleanup( true );
        this.initialize3DViewer( subPanelContext, true, reloadSession );
    }

    /**
     * Set 3d Viewer size
     */
    set3DViewerSize() {
        let self = this;
        if( this.resizeTimeoutPromise ) {
            AwTimeoutService.instance.cancel( this.resizeTimeoutPromise );
        }
        this.resizeTimeoutPromise = AwTimeoutService.instance( function() {
            self.resizeTimeoutPromise = null;
            self.viewerCtxData.setSize( self.compute3DViewerWidth(), self.compute3DViewerHeight() );
        }, 250 );
    }

    /**
     * Compute 3D viewer height
     */
    compute3DViewerHeight() {
        let currElement = this.viewerContainerElement.prevObject[ 0 ];
        while( currElement && !_.includes( currElement.className, 'aw-threeDViewer-viewer3DParentContainer' ) ) {
            currElement = currElement.parentElement;
        }
        return currElement.clientHeight;
    }

    /**
     * Compute 3D viewer width
     */
    compute3DViewerWidth() {
        let currElement = this.viewerContainerElement.prevObject[ 0 ];
        while( currElement && !_.includes( currElement.className, 'aw-threeDViewer-viewer3DParentContainer' ) ) {
            currElement = currElement.parentElement;
        }
        return currElement.clientWidth;
    }

    /**
     * Setup 3D viewer visibility handler
     */
    setup3DViewerVisibilityHandler() {
        if( this.structureViewerVisibilityHandler === null ) {
            this.structureViewerVisibilityHandler = strViewerVisibilityHandlerPvd.getStructureViewerVisibilityHandler( this.viewerCtxData );
            this.structureViewerVisibilityHandler.registerForVisibilityEvents( this.occmgmtContextNameKey );
        }
        if( !appCtxSvc.getCtx( 'splitView.mode' ) ) {
            let visibilityStateToBeApplied = VisOccmgmtCommunicationService.instance.getVisibilityStateFromExistingObserver();
            if( visibilityStateToBeApplied ) {
                let visibilityMgr = this.viewerCtxData.getVisibilityManager();
                visibilityMgr.restoreViewerVisibility( visibilityStateToBeApplied.invisibleCsids, visibilityStateToBeApplied.invisibleExceptionCsids );
            }
        }
    }

    /**
     * Handle selection changed event
     * @param {Object} eventData selection change event data
     */
    handleSelectionChangedEvent( eventData ) {
        this.structureViewerSelectionHandler.selectionChangeEventHandler( eventData );
    }

    /**
     * Handle pack unpack event
     * @param {Object} eventData event data from pack unpack event
     */
    handlePackUnpackEvent( eventData ) {
        this.structureViewerSelectionHandler.onPackUnpackOperation( eventData );
    }

    /**
     * Handle Primary work area contents reloaded event
     * @param {Object} eventData event data from contents reloaded event
     */
    // eslint-disable-next-line class-methods-use-this
    handlePrimaryWorkAreaContentsReloadedEvent( eventData ) {
        eventBus.publish( 'structureViewer.contentsReloaded', { viewToReact: eventData.viewToReact } );
    }

    /**
     * handle get occurence visibilty event
     * @param {Object} vmo view model object
     * @returns {Boolean} returns occurence visibility
     */
    handleGetOccVisibilty( vmo ) {
        return this.structureViewerVisibilityHandler.internalGetOccVisibility( vmo );
    }

    /**
     * Toggle occurence visibility from ACE tree
     * @param {Object} eventData event data passed from tree
     */
    handleToggleOccVisibility( eventData ) {
        this.structureViewerVisibilityHandler.internalToggleOccVisibility( eventData );
    }

    /**
     * Handle visibility changes from other viewer
     * @param {Object} visibilityData visibility data
     */
    handleVisibilityChanges( visibilityData ) {
        this.structureViewerVisibilityHandler.internalHandleVisibilityChanges( visibilityData );
    }

    /**
     * handle occurence update by effectivity event
     * @param {Object} eventData event data
     */
    handleOccurrenceUpdatedByEffectivityEvent( eventData ) {
        if( eventData && eventData.viewToReact && eventData.viewToReact === appCtxSvc.getCtx( 'ctx.aceActiveContext.key' ) ) {
            this.notify3DViewerReload();
        }
    }

    /**
     * handle CDM update event
     * @param {Object} eventData event data
     */
    handleCdmUpdatedEvent( eventData ) {
        if( eventData && !_.isEmpty( eventData.modifiedObjects ) ) {
            for( let i = 0; i < eventData.modifiedObjects.length; i++ ) {
                let modifiedObj = eventData.modifiedObjects[ i ];
                if( modifiedObj.type === 'DirectModel' ) {
                    this.notify3DViewerReload();
                    break;
                }
            }
        }
    }

    /**
     * handle CDM related modified event
     * @param {Object} eventData event data
     */
    handleCdmRelatedModifiedEvent( eventData ) {
        if( eventData && !_.isEmpty( eventData.childObjects ) ) {
            for( let i = 0; i < eventData.childObjects.length; i++ ) {
                let childObj = eventData.childObjects[ i ];
                if( childObj.type === 'DirectModel' ) {
                    this.notify3DViewerReload();
                    break;
                }
            }
        }
    }

    /**
     * Event handler for following events:
     * ace.elementsRemoved
     * replaceElement.elementReplacedSuccessfully
     * cba.alignmentUpdated
     * addElement.elementsAdded
     * @param {object} eventData event data
     */
    handleReloadEvents( eventData ) {
        if( eventData && eventData.viewToReact && eventData.viewToReact === this.occmgmtContextNameKey ) {
            this.notify3DViewerReload();
        }
    }

    /**
     * handle change of use indexed model settings event
     */
    handleUseIndexedModelSettingsChangedEvent() {
        this.notify3DViewerReloadForPCIChange();
    }

    /**
     * Handle Product Context Changed Event
     * @param {Object} eventData event data
     */
    handleProductContextChangedEvent( eventData ) {
        if( this.viewerCtxData.isConnectionClosed() ) {
            return;
        }
        let self = this;
        if( eventData.dataProviderActionType === 'activateWindow' || self.occmgmtContextNameKey !== eventData.updatedView ) {
            return;
        }
        let isReload3DView = false;
        let resetPerformedOnPCI = StructureViewerService.instance.checkIfResetWasPerformedOnPci( self.occmgmtContextNameKey );
        let aceContext = appCtxSvc.getCtx( eventData.updatedView );

        let newProductCtx = StructureViewerService.instance.getPCIModelObject( self.occmgmtContextNameKey );
        let snapshotUid = null;
        if( newProductCtx.props.awb0Snapshot && newProductCtx.props.awb0Snapshot.dbValues[ 0 ] !== '' ) {
            snapshotUid = newProductCtx.props.awb0Snapshot.dbValues[ 0 ];
        }

        if( !( !_.isUndefined( eventData.transientRequestPref ) && !_.isUndefined( eventData.transientRequestPref.reloadDependentTabs ) &&
                eventData.transientRequestPref.reloadDependentTabs === 'false' ) ) {
            if( newProductCtx && self.viewerContext.uid !== newProductCtx.uid && !resetPerformedOnPCI ) {
                isReload3DView = true;
            }
        }
        if( !resetPerformedOnPCI && aceContext && aceContext.requestPref && aceContext.requestPref.recipeReset === 'true' ) {
            isReload3DView = true;
        }
        if( resetPerformedOnPCI && aceContext && aceContext.sublocationAttributes && aceContext.sublocationAttributes.awb0ActiveSublocation &&
            ( aceContext.sublocationAttributes.awb0ActiveSublocation[ 0 ] === '3D' || aceContext.sublocationAttributes.awb0ActiveSublocation[ 0 ] === 'Awb0ViewerFeature' ) ) {
            isReload3DView = true;
        }
        let splitViewMode = false;
        if( appCtxSvc.getCtx( 'splitView' ) ) {
            splitViewMode = appCtxSvc.getCtx( 'splitView' ).mode;
        }

        //LCS-633938 reload view to apply snapshot in ACE indexed assembly if its loaded in indexed mode
        let reloadDueToSnapshotApplication = false;
        let mainPCI = StructureViewerService.instance.getViewerPCIToBeLoaded( self.occmgmtContextNameKey );
        let pref = viewerPreferenceService.getUseAlternatePCIPreference();
        if( snapshotUid && StructureViewerService.instance.hasAlternatePCI( mainPCI ) && ( !pref || pref === 'INDEXED' ) ) {
            reloadDueToSnapshotApplication = true;
        }

        // Reload for TC Snapshot in PVW-CSR under certain conditions
        if( snapshotUid && newProductCtx && !reloadDueToSnapshotApplication ) {
            let renderOptions = viewerPreferenceService.getRenderSource();
            if( renderOptions && renderOptions.length && renderOptions[ 0 ] === 'CSR' ) {
                let csrMode = viewerPreferenceService.getViewerCSRPref();
                if( csrMode && csrMode === 'PVW' ) {
                    let viewerFilterCount = self.viewerContext.props.awb0FilterCount.dbValues[ 0 ];
                    let snapshotFilterCount = newProductCtx.props.awb0FilterCount.dbValues[ 0 ];

                    // If either the current view or the applied snapshot have filters on
                    // the product structure, PLMVisWeb CSR needs to reload.
                    if( viewerFilterCount !== '0' || snapshotFilterCount !== '0' ) {
                        reloadDueToSnapshotApplication = true;
                    }
                }
            }
        }

        if( StructureViewerService.instance.isViewerOpenedForFnd0Workset( self.occmgmtContextNameKey ) && eventData.dataProviderActionType === 'productChangedOnSelectionChange' ) {
            isReload3DView = false;
        }
        if( self.shouldUpdateShowSuppressed() ) {
            // In the future, we want to notify3DViewerShowSuppressed, but due to
            // an issue with BOM that breaks reconfigure,
            // we will just ensured the viewer is reloaded when suppressed is toggled.
            isReload3DView = true;
        }
        this.setPartitionScheme();
        if( isReload3DView || splitViewMode && resetPerformedOnPCI || reloadDueToSnapshotApplication ) {
            //always close if any panel open during reload
            var activeToolAndInfoCmd = appCtxSvc.getCtx( 'activeToolsAndInfoCommand' );
            if( activeToolAndInfoCmd && activeToolAndInfoCmd.commandId ) {
                eventBus.publish( 'awsidenav.openClose', {
                    id: 'aw_toolsAndInfo',
                    commandId: activeToolAndInfoCmd.commandId
                } );
            }
            if( snapshotUid ) {
                let snapshotObj = cdm.getObject( snapshotUid );
                if( snapshotObj && isReload3DView ) {
                    eventBus.publish( 'SnapshotGalley.showReloadInfo', {
                        snapshotName: snapshotObj.props.object_name.dbValues[ 0 ]
                    } );
                }
                self.launchSnapshotGalleyPanel = true;
            }
            self.notify3DViewerReloadForPCIChange();
        } else if( snapshotUid && newProductCtx ) {
            if( viewerPerformanceService.isPerformanceMonitoringEnabled() ) {
                viewerPerformanceService.setViewerPerformanceMode( true );
                viewerPerformanceService.startViewerPerformanceDataCapture( viewerPerformanceService.viewerPerformanceParameters.ApplyProductSnapshot );
            }
            self.viewerCtxData.getDynamicUpdateMgr().applyTCSnapshot( snapshotUid, newProductCtx.uid ).then( () => {
                StructureViewerService.instance.updateSectionCommandState( self.occmgmtContextNameKey );
                if( viewerPerformanceService.isPerformanceMonitoringEnabled() ) {
                    viewerPerformanceService.stopViewerPerformanceDataCapture( 'Snapshot applied : ' );
                    viewerPerformanceService.setViewerPerformanceMode( false );
                }
            } );
        }
    }

    /**
     * Setup 3D viewer selection handler
     * @param {Array} selections - Array of selected model objects
     */
    setup3DViewerSelectionHandler( selections ) {
        let self = this;
        if( self.structureViewerSelectionHandler === null ) {
            self.structureViewerSelectionHandler = strViewerSelectionHandlerPvd.getStructureViewerSelectionHandler( self.viewerCtxData );
            self.structureViewerSelectionHandler.registerForSelectionEvents();
        }
        if( !_.isNull( selections ) && !_.isUndefined( selections ) && !_.isEmpty( selections ) ) {
            let selectionType = self.structureViewerSelectionHandler.getSelectionType( selections );
            let partitionCsids = self.structureViewerSelectionHandler.getPartitionCSIDs( selections );
            if( selectionType === 'OCC_SELECTED' ) {
                StructureViewerService.instance.ensureMandatoryPropertiesForCsidLoaded( selections ).then(
                    function() {
                        let newlySelectedCsids = [];
                        for( let i = 0; i < selections.length; i++ ) {
                            if( !_.includes( selections[ i ].modelType.typeHierarchyArray, 'Fgf0PartitionElement' ) ) {
                                newlySelectedCsids.push( objectToCSIDGeneratorService.getCloneStableIdChain( selections[ i ] ) );
                            }
                        }
                        self.structureViewerSelectionHandler.determineAndSelectPackedOccs( selections, newlySelectedCsids, partitionCsids );
                        StructureViewerService.instance.updateViewerSelectionCommandsVisibility( self.viewerCtxData );
                    }
                ).catch( function( error ) {
                    logger.error( 'SsructureViewerData : Failed to load mandatory properties to compute CSID : ' + error );
                } );
            }
        } else {
            let openedElement = appCtxSvc.getCtx( self.occmgmtContextNameKey ).openedElement;
            let topElement = appCtxSvc.getCtx( self.occmgmtContextNameKey ).topElement;
            if( openedElement.uid !== topElement.uid ) {
                let openedElementCsid = objectToCSIDGeneratorService.getCloneStableIdChain( openedElement );
                self.viewerCtxData.getSelectionManager().selectPartsInViewerUsingModelObject( [ openedElement ] );
                self.viewerCtxData.getSelectionManager().setContext( [ openedElementCsid ] );
            } else {
                self.viewerCtxData.getSelectionManager().setContext( [ self.ROOT_ID ] );
                self.viewerCtxData.getSelectionManager().selectPartsInViewerUsingModelObject( [] );
                self.viewerCtxData.getSelectionManager().selectPartsInViewerUsingCsid( [] );
            }
            StructureViewerService.instance.updateViewerSelectionCommandsVisibility( self.viewerCtxData );
        }
    }

    /**
     * Setup viewer image capture container
     */
    setupViewerImageCaptureContainer() {
        let self = this;
        let currElement = this.viewerContainerElement.prevObject[ 0 ];
        while( currElement && !_.includes( currElement.className, 'aw-threeDViewer-viewer3DParentContainer' ) ) {
            currElement = currElement.parentElement;
        }
        _.forEach( currElement.children, ( child ) => {
            if( child.id === 'imageCaptureContainer' ) {
                self.viewerImageCaptureContainer = child;
                return false;
            }
        } );
    }

    /**
     * Register for 3D viewer long press
     */
    registerForLongPressIn3D() {
        this.viewerCtxData.addViewerLongPressListener( this.handle3DViewerLongPress, this );
    }

    /**
     * Handler for 3D viewer connection issues
     */
    handle3DViewerLongPress() {
        this.enableMultiSelectionInACEAnd3D();
    }

    /**
     * Enable multi-selection mode in 3D and ACE
     */
    enableMultiSelectionInACEAnd3D() {
        eventBus.publish( 'primaryWorkarea.multiSelectAction', { multiSelect: true } );
        this.viewerCtxData.getSelectionManager().setMultiSelectModeInViewer( true );
        this.viewerCtxData.setUseTransparency( false );
        let currentlySelectedModelObjs = this.viewerCtxData.getSelectionManager().getSelectedModelObjects();
        let aceMultiSelectionEventData = {};
        if( _.isNull( currentlySelectedModelObjs ) || _.isUndefined( currentlySelectedModelObjs ) || _.isEmpty( currentlySelectedModelObjs ) ) {
            currentlySelectedModelObjs = [];
        }
        aceMultiSelectionEventData.elementsToSelect = currentlySelectedModelObjs;
        aceMultiSelectionEventData.multiSelect = true;
        eventBus.publish( 'aceElementsSelectedEvent', aceMultiSelectionEventData );
    }

    /**
     * Display image capture upon trigger of image capture event.
     *
     * @param {String} fileUrl - Image capture url.
     */
    displayImageCapture( fileUrl ) {
        if( fileUrl ) {
            this.notifyDisplayImageCapture( true );
            this.viewerImageCaptureContainer.innerHTML = '';
            let displayImgCaptureDiv = document.createElement( 'div' );
            displayImgCaptureDiv.id = 'awDisplayImageCapture';
            this.viewerImageCaptureContainer.appendChild( displayImgCaptureDiv );
            imgViewer.init( this.viewerImageCaptureContainer );
            imgViewer.setImage( fileUrl );
        } else {
            logger.error( 'Failed to display image capture due to missing image url.' );
        }
    }

    /**
     * Deactivates the display if image capture in viewer upon deactivate image capture event.
     */
    deactivateImageCaptureDisplayInView() {
        this.notifyDisplayImageCapture( false );
        this.viewerImageCaptureContainer.innerHTML = '';
    }

    /**
     * Set property based coloring criteria for Viewer
     *
     * @param {Object} eventData Event data containing property matched values grouping proerty attribute
     */
    setPropertyBasedColoringCriteria( eventData ) {
        this.colorCriteria = eventData.propGroupingValues;
        this.colorGroupingProperty = eventData.internalPropertyNameToGroupOn;
        let colorPref = appCtxSvc.getCtx( 'preferences' ).AWC_ColorFiltering[ 0 ];
        if( colorPref === 'true' ) {
            this.viewerCtxData.getCriteriaColoringManager().enableCriteriaColoring( this.colorGroupingProperty, this.colorCriteria );
        }
    }

    /**
     * Change color criteria state
     *
     * @param {Object} eventData Event data containing coloring criteria state.
     */
    changeColoringCriteriaState( eventData ) {
        var colorCriteriaState = eventData.dataVal;
        if( colorCriteriaState === 'true' && this.colorCriteria !== null && this.colorGroupingProperty !== null ) {
            this.viewerCtxData.getCriteriaColoringManager().enableCriteriaColoring( this.colorGroupingProperty, this.colorCriteria );
        } else {
            this.viewerCtxData.getCriteriaColoringManager().disableCriteriaColoring();
        }
    }

    /**
     * Model view proxy
     *
     * @param {Object} eventData Event data for model view proxy
     */
    applyModelViewProxy( eventData ) {
        if( eventData && Array.isArray( eventData.selectedObjects ) && eventData.selectedObjects.length > 0 ) {
            this.viewerCtxData.getModelViewManager().invokeModelViewProxy( eventData.selectedObjects[ 0 ].props.fnd0DisclosedModelView.dbValues[ 0 ] );
        }
    }

    /**
     * Handle render source changed event
     * @param {Object} subPanelContext Sub panel context
     */
    handleRenderSourceChanged( subPanelContext ) {
        this.reload3DViewer( subPanelContext );
    }

    /**
     * Register for viewer resize events
     */
    registerForResizeEvents() {
        let self = this;
        // Handle Window resize event
        AwWindowService.instance.onresize = function() {
            eventBus.publish( 'viewer.setSize', {} );
        };
    }

    /**
     * Register for ace related events
     */
    registerForOther3ViewerEvents() {
        let self = this;

        if( this.awGroupObjCategoryChangeEventListener === null ) {
            this.awGroupObjCategoryChangeEventListener = eventBus.subscribe( 'ace.groupObjectCategoryChanged', function( eventData ) {
                let occmgmtActiveCtx = appCtxSvc.getCtx( 'aceActiveContext' );
                let occmgmtActiveCtxKey = occmgmtActiveCtx && occmgmtActiveCtx.key ? occmgmtActiveCtx.key : 'occmgmtContext';
                if( eventData && occmgmtActiveCtxKey === self.occmgmtContextNameKey ) {
                    self.setPropertyBasedColoringCriteria( eventData );
                }
            }, 'structureViewerData' );
        }

        if( this.colorTogglingEventListener === null ) {
            this.colorTogglingEventListener = eventBus.subscribe( 'aw.ColorFilteringToggleEvent', function( eventData ) {
                let occmgmtActiveCtx = appCtxSvc.getCtx( 'aceActiveContext' );
                let occmgmtActiveCtxKey = occmgmtActiveCtx && occmgmtActiveCtx.key ? occmgmtActiveCtx.key : 'occmgmtContext';
                if( eventData && occmgmtActiveCtxKey === self.occmgmtContextNameKey ) {
                    self.changeColoringCriteriaState( eventData );
                }
            }, 'structureViewerData' );
        }

        if( this.mvProxySelectionChangedEventListener === null ) {
            this.mvProxySelectionChangedEventListener = eventBus.subscribe( 'mvProxyDataProvider.selectionChangeEvent', function( eventData ) {
                let occmgmtActiveCtx = appCtxSvc.getCtx( 'aceActiveContext' );
                let occmgmtActiveCtxKey = occmgmtActiveCtx && occmgmtActiveCtx.key ? occmgmtActiveCtx.key : 'occmgmtContext';
                if( eventData && occmgmtActiveCtxKey === self.occmgmtContextNameKey ) {
                    self.applyModelViewProxy( eventData );
                }
            }, 'structureViewerData' );
        }

        if( this.cleanup3DViewEvent === null ) {
            this.cleanup3DViewEvent = eventBus.subscribe( 'sv.cleanup3DView', function( eventData ) {
                let occmgmtCtx = appCtxSvc.getCtx( self.occmgmtContextNameKey );
                if( ( _.isNull( occmgmtCtx ) || _.isUndefined( occmgmtCtx ) || occmgmtCtx.activeTabTitle !== '3D' ) && self.occmgmtContextNameKey === eventData.occmgmtContextKey ) {
                    self.ctrlCleanup( false );
                }
            }, 'structureViewerData' );
        }

        if( this.restoreActionListener === null ) {
            this.restoreActionListener = eventBus.subscribe( 'acePwa.reset', () => {
                if( self.viewerCtxData && !self.viewerCtxData.isConnectionClosed() ) {
                    let occmgmtContextFromViewerContext = StructureViewerService.instance.getOccmgmtContextFromViewerContext( self.viewerCtxData.getViewerCtxNamespace() );
                    if( occmgmtContextFromViewerContext && occmgmtContextFromViewerContext.restoreProduct ) {
                        self.viewerCtxData.getSessionMgr().applyAutoBookmark().then( () => {
                            viewerPreferenceService.loadViewerPreferencesFromVisSession( self.viewerCtxData );
                        } ).catch( () => {
                            logger.error( 'failed to apply bookmark' );
                        } );
                    }
                }
            }, 'structureViewerData' );
        }
    }

    /**
     * Register for Ace search
     */
    registerForAceSearchEvent() {
        let self = this;
        structureSearchService.startListeningSearchEvent();
        if( this.viewerSearchEventSub === null ) {
            this.viewerSearchEventSub = eventBus.subscribe( 'sv.ApplySearchCriteriaEvent', ( eventData ) => {
                if( eventData && eventData.activeContext === self.occmgmtContextNameKey ) {
                    let searchCriteriaJSON = JSON.stringify( eventData.searchCriteria );
                    if( searchCriteriaJSON !== undefined ) {
                        self.viewerCtxData.getSearchMgr().performSearch( 'Awb0FullTextSearchProvider', searchCriteriaJSON, -1,
                            self.viewerCtxData.ViewerSearchActions.SET_VIEW_ONLY ).then( () => {
                            logger.debug( 'Structureviewer: Viewer Search operation completed' );
                        } ).catch( ( error ) => {
                            logger.error( 'Structureviewer: Viewer Search operation failed:' + error );
                        } );
                    }
                }
            } );
        }
    }

    /**
     * Registers Product Context launch api
     */
    registerAsViewerLaunchInfoProvider() {
        productLaunchInfoProviderService.setViewerContextData( this.viewerCtxData );
        visLaunchInfoProvider.registerProductContextToLaunchVis( productLaunchInfoProviderService.getProductToLaunchableOccMap );
    }

    /**
     * Set host element for CSR rendering of 3d Markups
     */
    setHostElement() {
        let self = this;
        if( viewerPreferenceService.getRenderSource()[ 0 ] === 'CSR' ) {
            self.viewerCtxData.getViewerView().viewMarkupMgr.setHostElement( self.viewerContainerElement[ 0 ] );
        }
    }

    /**
     * Set partition scheme
     */
    setPartitionScheme() {
        let pciObj = StructureViewerService.instance.getViewerPCIToBeLoaded( this.occmgmtContextNameKey );
        if( pciObj.props.fgf0PartitionScheme && Array.isArray( pciObj.props.fgf0PartitionScheme.dbValues ) && pciObj.props.fgf0PartitionScheme.dbValues.length > 0 ) {
            let activePartitionSchemeUid = pciObj.props.fgf0PartitionScheme.dbValues[ 0 ];
            if( !_.isNull( activePartitionSchemeUid ) && !_.isUndefined( activePartitionSchemeUid ) && !_.isEmpty( activePartitionSchemeUid ) ) {
                this.viewerCtxData.getPartitionMgr().setActivePartitionScheme( '', activePartitionSchemeUid );
                let renderOptions = viewerPreferenceService.getRenderSource();
                if( renderOptions && renderOptions.length && renderOptions[ 0 ] === 'CSR' ) {
                    let csrMode = viewerPreferenceService.getViewerCSRPref();
                    if( !this.pvwCsrUnsupportedMsgShown && csrMode && csrMode === 'PVW' ) {
                        this.pvwCsrUnsupportedMsgShown = true;
                        let localTextBundle = localeService.getLoadedText( 'StructureViewerMessages' );
                        this.displayWarningMessage( localTextBundle );
                    }
                }
            } else {
                this.viewerCtxData.getPartitionMgr().setActivePartitionScheme( '', '' );
                this.pvwCsrUnsupportedMsgShown = false;
            }
        } else {
            if( pciObj.props.fgf0PartitionScheme ) {
                this.viewerCtxData.getPartitionMgr().setActivePartitionScheme( '', '' );
                this.pvwCsrUnsupportedMsgShown = false;
            }
        }
    }

    /**
     * Posts user messages for reconcile warning
     *
     * @param {String} message Message to be displayed
     */
    // eslint-disable-next-line class-methods-use-this
    displayWarningMessage( messages ) {
        var buttons = [ {
            addClass: 'btn btn-notify',
            text: messages.Ok,
            onClick: function( $noty ) {
                $noty.close();
            }
        } ];
        msgSvc.showWarning( messages.PartitionUnsupportedPVWCSR, buttons );
    }

    /**
     * Clean up the current
     * @param {Boolean} isReloadViewer - boolean indicating if viewer is reloading while clean up.
     */
    ctrlCleanup( isReloadViewer ) {
        VisOccmgmtCommunicationService.instance.unsubscribe( this );

        if( this.structureViewerSelectionHandler ) {
            this.structureViewerSelectionHandler.cleanUp();
            this.structureViewerSelectionHandler = null;
        }

        if( this.structureViewerVisibilityHandler ) {
            this.structureViewerVisibilityHandler.cleanUp( this.occmgmtContextNameKey );
            this.structureViewerVisibilityHandler = null;
        }

        if( this.viewerCtxData ) {
            this.viewerCtxData.removeViewerConnectionProblemListener( this.handle3DViewerConnectionProblem );
            appCtxSvc.unRegisterCtx( this.viewerCtxData.getViewerCtxNamespace() );
        }

        if( this.productContextInfoChangedEvent ) {
            eventBus.unsubscribe( this.productContextInfoChangedEvent );
            this.productContextInfoChangedEvent = null;
        }

        if( this.awGroupObjCategoryChangeEventListener ) {
            eventBus.unsubscribe( this.awGroupObjCategoryChangeEventListener );
            this.awGroupObjCategoryChangeEventListener = null;
        }

        if( this.colorTogglingEventListener ) {
            eventBus.unsubscribe( this.colorTogglingEventListener );
            this.colorTogglingEventListener = null;
        }

        if( this.viewerSearchEventSub ) {
            eventBus.unsubscribe( this.viewerSearchEventSub );
            this.viewerSearchEventSub = null;
        }

        if( this.mvProxySelectionChangedEventListener ) {
            eventBus.unsubscribe( this.mvProxySelectionChangedEventListener );
            this.mvProxySelectionChangedEventListener = null;
        }

        if( this.cleanup3DViewEvent ) {
            eventBus.unsubscribe( this.cleanup3DViewEvent );
            this.cleanup3DViewEvent = null;
        }

        if( this.restoreActionListener ) {
            eventBus.unsubscribe( this.restoreActionListener );
            this.restoreActionListener = null;
        }

        visLaunchInfoProvider.resetProductContextInfo();
        productLaunchInfoProviderService.clearViewerCtxData();

        if( isReloadViewer ) {
            this.viewerContainerElement[ 0 ].innerHTML = '';
        }

        let sideNavConfig = appCtxSvc.getCtx( 'awSidenavConfig' );
        if( sideNavConfig && sideNavConfig.globalSidenavContext &&
            sideNavConfig.globalSidenavContext.globalNavigationSideNav &&
            sideNavConfig.globalSidenavContext.globalNavigationSideNav.open &&
            sideNavConfig.globalSidenavContext.globalNavigationSideNav.pinned ) {
            eventBus.publish( 'awsidenav.openClose', {
                id: 'globalNavigationSideNav'
            } );
        }
    }

    /**
     * Trigger dynamic update of viewer.
     * This will cause the viewer to re-query Tc for the current product
     * structure and then add and/or remove parts from the model as needed.
     * @param {Object} tempAppSessionResponse createOrUpdateSavedSession SOA response
     * @param {Object} occmgmtContextNameKey occmgmt context name key
     */
    reconfigureViewer( tempAppSessionResponse, occmgmtContextNameKey ) {
        let self = this;
        this.viewerContext = StructureViewerService.instance.getPCIModelObject( occmgmtContextNameKey );
        let options = 0; // hint on how to handle orphan objects - 0 Keep, 1 Discard
        if( this.viewerCtxData ) {
            let dynamicUpdateMgr = this.viewerCtxData.getDynamicUpdateMgr();

            if( tempAppSessionResponse ) {
                let tempAppSession = tempAppSessionResponse.sessionOutputs[ 0 ].sessionObject;
                if( tempAppSession ) {
                    dynamicUpdateMgr.reconfigure( tempAppSession.uid, options ).catch( function( error ) {
                        // Reload viewer
                        self.notify3DViewerReloadForPCIChange();
                    } );
                }
            } else {
                dynamicUpdateMgr.reconfigure( this.viewerContext.uid, options ).catch( function( error ) {
                    // Reload viewer
                    self.notify3DViewerReloadForPCIChange();
                } );
            }
        }
    }

    /**
     * Gets user configurations properties from the aceActiveContext related to the structure.
     * Currently only accounts for Show Suppressed, but can be easily modified to account for
     * Show Excluded by Variant and Show Excluded by Effectivity.
     */
    getStructureConfiguration() {
        let aceActiveCtx = appCtxSvc.getCtx( this.occmgmtContextNameKey );
        if( aceActiveCtx ) {
            return { showSuppressedOcc: aceActiveCtx.showSuppressedOcc };
        }
        return null;
    }

    /**
     * Checks to see if the user preference showSuppressedOcc has been changed.
     * Also updates the structureConfiguration value.
     */
    shouldUpdateShowSuppressed() {
        let retval = false;
        let newStructureConfiguration = this.getStructureConfiguration();

        if( this.structureConfiguration && newStructureConfiguration ) {
            retval = this.structureConfiguration.showSuppressedOcc !== newStructureConfiguration.showSuppressedOcc;
            this.structureConfiguration = newStructureConfiguration;
        }
        return retval;
    }

    /**
     * Gets the current option in the ACE tree for showing suppressed occurrences,
     * then sends that value to the Vis viewer.
     */
    setShowSuppressed() {
        var visibilityMgr = this.viewerCtxData.getVisibilityManager();

        if( visibilityMgr ) {
            let showSuppressed = this.structureConfiguration.showSuppressedOcc;
            visibilityMgr.setShowSuppressed( showSuppressed );
        }
    }

    /**
     * Save the auto bookmark for product
     */
    saveVisAutoBookmark() {
        this.viewerCtxData.getSessionMgr().saveAutoBookmark();
    }

    /**
     * Returns type of viewer
     */
    getViewerType() {
        return this.viewerType;
    }

    /**
     * Returns visibility state
     */
    getVisibilityState() {
        return this.structureViewerVisibilityHandler.getVisibilityState();
    }
}

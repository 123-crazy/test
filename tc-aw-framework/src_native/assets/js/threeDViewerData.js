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
 * This module holds viewer 3D data
 *
 * @module js/threeDViewerData
 */
import _ from 'lodash';
import eventBus from 'js/eventBus';
import imgViewer from 'js/ImgViewer';
import logger from 'js/logger';
import awPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import aw3dViewerService from 'js/aw3dViewerService';
import soaService from 'soa/kernel/soaService';
import cdm from 'soa/kernel/clientDataModel';
import dmSvc from 'soa/dataManagementService';
import AwWindowService from 'js/awWindowService';
import AwTimeoutService from 'js/awTimeoutService';
import viewerPreferenceService from 'js/viewerPreference.service';
import viewerCtxSvc from 'js/viewerContext.service';

const viewer3DParentContainerClass = 'aw-threeDViewer-viewer3DParentContainer';

export default class ThreeDViewerData {
    /**
     * ThreeDViewerData constructor
     * @param {Object} viewerContainerElement - The DOM element to contain the viewer canvas
     */
    constructor( viewerContainerElement ) {
        if( _.isNull( viewerContainerElement ) || _.isUndefined( viewerContainerElement ) ) {
            logger.error( 'Viewer container element can not be null' );
            throw 'Viewer container element can not be null';
        }
        this.viewerContainerElement = viewerContainerElement;
        this.viewerImageCaptureContainer = null;
        this.viewerCtxData = null;
        this.viewerContext = null;
        this.subPanelContext = null;
        this.ROOT_ID = '';

        //Events subscriptions
        this.resizeTimeoutPromise = null;
        this.cleanup3DViewEvent = null;
        this.mvProxySelectionChangedEventListener = null;
    }

    /**
     * Initialize native viewer
     * @param {Object} subPanelContext Sub panel context
     * @returns {Object} Selected object to be opened
     */
    static getSelectedModelObject( subPanelContext ) {
        var selectedMO = appCtxSvc.getCtx( 'mselected' );
        var returnMO = null;
        if( Array.isArray( selectedMO ) && selectedMO.length > 0 ) {
            returnMO = selectedMO[ 0 ];
            var selectedMOType = returnMO.modelType;
            let subLocationContext = appCtxSvc.getCtx( 'sublocation' );
            if( subLocationContext && subLocationContext.label === 'Disclosure' ) {
                let inputData = {
                    primaryObjects: [ cdm.getObject( returnMO.uid ) ],
                    pref: {
                        expItemRev: false,
                        returnRelations: true,
                        info: [ {
                            relationTypeName: 'Fnd0DisclosingObject'
                        } ]
                    }
                };
                return soaService.post( 'Core-2007-09-DataManagement', 'expandGRMRelationsForPrimary', inputData ).then( ( response ) => {
                    if( Array.isArray( response.output ) && response.output[ 0 ] &&
                        Array.isArray( response.output[ 0 ].relationshipData ) && response.output[ 0 ].relationshipData[ 0 ] &&
                        Array.isArray( response.output[ 0 ].relationshipData[ 0 ].relationshipObjects ) && response.output[ 0 ].relationshipData[ 0 ].relationshipObjects[ 0 ]
                    ) {
                        return cdm.getObject( response.output[ 0 ].relationshipData[ 0 ].relationshipObjects[ 0 ].otherSideObject.uid );
                    }
                    return returnMO;
                } ).catch( ( error ) => {
                    logger.error( 'failed to load relation : ' + error );
                    throw 'Could not find collector structure';
                } );
            } else if( subPanelContext.fileData && selectedMOType &&
                selectedMOType.typeHierarchyArray.indexOf( 'CAEAnalysisRevision' ) > -1 ||
                selectedMOType.typeHierarchyArray.indexOf( 'CAEResultRevision' ) > -1 ) {
                var viewerData = subPanelContext;
                if( viewerData ) {
                    var contextObjectUid = null;
                    if( viewerData.datasetData && viewerData.datasetData.uid ) {
                        contextObjectUid = viewerData.datasetData.uid;
                    } else if( viewerData.uid ) {
                        contextObjectUid = viewerData.uid;
                    }
                    returnMO = cdm.getObject( contextObjectUid );
                    return awPromiseService.instance.resolve( returnMO );
                }
            } else {
                return dmSvc.getProperties( [ returnMO.uid ], [ 'IMAN_Rendering' ] ).then( function() {
                    var renderedObj = cdm.getObject( returnMO.uid );
                    if( Array.isArray( renderedObj.props.IMAN_Rendering.dbValues ) && renderedObj.props.IMAN_Rendering.dbValues.length > 0 ) {
                        return returnMO;
                    }
                    var viewerData = subPanelContext;
                    if( viewerData ) {
                        var contextObjectUid = null;
                        if( viewerData.datasetData && viewerData.datasetData.uid ) {
                            contextObjectUid = viewerData.datasetData.uid;
                        } else if( Array.isArray( viewerData.selection ) && viewerData.selection.length > 0 ) {
                            contextObjectUid = viewerData.selection[ 0 ].uid;
                        } else if( viewerData.modelObject.uid ) {
                            contextObjectUid = viewerData.modelObject.uid;
                        } else if( viewerData.uid ) {
                            contextObjectUid = viewerData.uid;
                        }
                        return cdm.getObject( contextObjectUid );
                    }
                } );
            }
        }
    }

    /**
     * Initialize 3D viewer.
     *
     * @param {Object} subPanelContext Sub panel context
     * @param {Boolean} force3DViewerReload boolean indicating if 3D should be reloaded forcefully
     *
     * @returns {Promise} A promise thats resolved after loading
     */
    initialize3DViewer( subPanelContext, force3DViewerReload ) {
        let self = this;
        let returnPromise = awPromiseService.instance.defer();
        let selectedObj = null;
        this.subPanelContext = subPanelContext;
        self.setViewerLoadingStatus( true );
        ThreeDViewerData.getSelectedModelObject( subPanelContext ).then( ( returnMO ) => {
            selectedObj = returnMO;
            if( force3DViewerReload || !aw3dViewerService.isSameProductOpenedAsPrevious( selectedObj ) ) {
                aw3dViewerService.cleanUpPreviousView();
                aw3dViewerService.getViewerLoadInputParameterPromise( selectedObj, self.compute3DViewerWidth(), self.compute3DViewerHeight() ).then( function(
                    viewerLoadInputParams ) {
                    viewerLoadInputParams.initializeViewerContext();
                    self.viewerCtxData = viewerLoadInputParams.getViewerContext();
                    self.registerForConnectionProblems();
                    aw3dViewerService.getViewerView( viewerLoadInputParams ).then( function( viewerData ) {
                        self.setupViewerAfterLoad( viewerData, selectedObj );
                        returnPromise.resolve( self );
                    }, function( errorMsg ) {
                        logger.error( 'Failed to load viewer : ' + errorMsg );
                        returnPromise.reject( errorMsg );
                    } );
                } ).catch( function( error ) {
                    logger.error( 'Failed to load input param : ' + error );
                    self.setViewerLoadingStatus( false );
                } );
            } else {
                aw3dViewerService.restorePreviousView().then( function( viewerData ) {
                    aw3dViewerService.updateStructureViewerVisibility( viewerData[ 0 ].getViewerCtxNamespace(), true );
                    self.setupViewerAfterLoad( viewerData, selectedObj );
                    self.registerForConnectionProblems();
                    AwTimeoutService.instance( function() {
                        eventBus.publish( 'emmProgressIndicator', {
                            viewerContext: viewerData[ 0 ].getViewerCtxNamespace(),
                            emmProgressIndicatorStatus: false
                        } );
                    }, 500 );
                    returnPromise.resolve( self );
                } ).catch( ( errorMsg ) => {
                    logger.error( 'Failed to load viewer : ' + errorMsg );
                    self.setViewerLoadingStatus( false );
                    returnPromise.reject( errorMsg );
                } );
            }
        } );
        return returnPromise.promise;
    }

    /**
     * Registers Product Context launch api
     * @param {Object} viewerData viewer Data
     * @param {Object} viewerContextObj viewer context data object
     */
    setupViewerAfterLoad( viewerData, viewerContextObj ) {
        let self = this;
        self.viewerContainerElement.append( viewerData[ 1 ] );
        self.viewerCtxData = viewerData[ 0 ];
        self.registerForOtherViewerEvents();
        self.setupViewerImageCaptureContainer();
        if( !self.viewerCtxData.isMMVRendering() ) {
            viewerCtxSvc.setShadedMode( self.viewerCtxData.getViewerCtxNamespace(), viewerPreferenceService.getShadedWithEdgesPreference() ? 1 : 0 );
        }
        this.viewerCtxData.updateCurrentViewerProductContext( viewerContextObj );
        self.setViewerLoadingStatus( false );
        AwTimeoutService.instance( function() {
            self.set3DViewerSize();
        } );
        self.registerForResizeEvents();
    }

    /**
     * Set 3d viewer loading status
     * @param {Boolean} isLoading is viewer loading
     */
    setViewerLoadingStatus( isLoading ) {
        this.isLoading = isLoading;
        eventBus.publish( 'threeDViewer.viewerLoadingStatus', {
            viewerContext: aw3dViewerService.getDefaultViewerCtxNamespace(),
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
        eventBus.publish( 'threeDViewer.resetParametersFor3DReload', { viewerContext: this.viewerCtxData.getViewerCtxNamespace() } );
    }

    /**
     * Notify 3D viewer reload event
     */
    notify3DViewerReload() {
        eventBus.publish( 'threeDViewer.reload3DViewer', { viewerContext: this.viewerCtxData.getViewerCtxNamespace() } );
    }

    /**
     * Notify display image capture
     * @param {Boolean} isShow - boolean indicating if image capture should be shown
     */
    notifyDisplayImageCapture( isShow ) {
        eventBus.publish( 'threeDViewer.displayImageCapture', {
            viewerContext: this.viewerCtxData.getViewerCtxNamespace(),
            isShow: isShow
        } );
    }

    /**
     * Reload 3D viewer.
     *
     * @param {Object} subPanelContext Sub panel context
     * @returns {Promise} A promise thats resolved after successful reload
     */
    reload3DViewer( subPanelContext ) {
        if( this.isLoading ) {
            return awPromiseService.instance.reject( 'Already loading!' );
        }
        if( !subPanelContext ) {
            subPanelContext = this.subPanelContext;
        }
        this.notifyResetParametersFor3DReload();
        this.ctrlCleanup( true );
        return this.initialize3DViewer( subPanelContext, true ).catch( ( error ) => {
            logger.error( 'Failed to load viewer : ' + error );
            return awPromiseService.instance.reject( error );
        } );
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
     *
     * @returns {Number} computed client height
     */
    compute3DViewerHeight() {
        let currElement = this.viewerContainerElement.prevObject[ 0 ];
        while( currElement && !_.includes( currElement.className, viewer3DParentContainerClass ) ) {
            currElement = currElement.parentElement;
        }
        let heightElement = this.viewerContainerElement.prevObject[ 0 ];
        while( heightElement && ( !_.includes( heightElement.className, 'aw-base-scrollPanel' ) ? true : heightElement && heightElement.tagName !== 'DIV' ) &&
            !_.includes( heightElement.className, 'aw-viewerjs-dimensions' ) ) {
            heightElement = heightElement.parentElement;
        }
        if( !_.isNull( heightElement ) && !_.isUndefined( heightElement ) ) {
            let parentElement = currElement.parentElement;
            if( appCtxSvc.ctx && appCtxSvc.ctx.locationContext && appCtxSvc.ctx.locationContext[ 'ActiveWorkspace:Location' ] === 'com.siemens.splm.clientfx.tcui.xrt.showObjectLocation' ) {
                //Need to adjust the padding on show object location
                parentElement.style.height = heightElement.clientHeight - 32 + 'px';
                //We need to subtract 40 which is the height of the toolbar
                currElement.style.height = heightElement.clientHeight - 32 - 40 + 'px';
                return heightElement.clientHeight - 32 - 40;
            }
            parentElement.style.height = heightElement.clientHeight + 'px';
            //We need to subtract 40 which is the height of the toolbar
            currElement.style.height = heightElement.clientHeight - 40 + 'px';
            return heightElement.clientHeight - 40;
        }
        return currElement.clientHeight;
    }

    /**
     * Compute 3D viewer width
     *
     * @returns {Number} computed client width
     */
    compute3DViewerWidth() {
        let currElement = this.viewerContainerElement.prevObject[ 0 ];
        while( currElement && !_.includes( currElement.className, viewer3DParentContainerClass ) ) {
            currElement = currElement.parentElement;
        }
        return currElement.clientWidth;
    }

    /**
     * Setup viewer image capture container
     */
    setupViewerImageCaptureContainer() {
        let self = this;
        let currElement = this.viewerContainerElement.prevObject[ 0 ];
        while( currElement && !_.includes( currElement.className, viewer3DParentContainerClass ) ) {
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
     * Register for viewer events
     */
    registerForOtherViewerEvents() {
        let self = this;
        if( self.mvProxySelectionChangedEventListener === null ) {
            self.mvProxySelectionChangedEventListener = eventBus.subscribe(
                'ObjectSet_2_Provider.selectionChangeEvent',
                function( eventData ) {
                    self.viewerCtxData.getModelViewManager().invokeModelViewProxy( eventData.selectedObjects[ 0 ].props.fnd0DisclosedModelView.dbValues[ 0 ] );
                }, 'threeDViewerData' );
        }
    }

    /**
     * Register for viewer resize events
     */
    registerForResizeEvents() {
        let self = this;
        // Handle Window resize event
        AwWindowService.instance.onresize = function() {
            self.set3DViewerSize();
        };
    }

    /**
     * Clean up the current
     * @param {Boolean} isReloadViewer - boolean indicating if viewer is reloading while clean up.
     */
    ctrlCleanup( isReloadViewer ) {
        if( this.viewerCtxData ) {
            this.viewerCtxData.removeViewerConnectionProblemListener( this.handle3DViewerConnectionProblem );
            appCtxSvc.unRegisterCtx( this.viewerCtxData.getViewerCtxNamespace() );
        }

        if( this.mvProxySelectionChangedEventListener ) {
            eventBus.unsubscribe( this.mvProxySelectionChangedEventListener );
            this.mvProxySelectionChangedEventListener = null;
        }

        if( this.cleanup3DViewEvent ) {
            eventBus.unsubscribe( this.cleanup3DViewEvent );
            this.cleanup3DViewEvent = null;
        }

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
}

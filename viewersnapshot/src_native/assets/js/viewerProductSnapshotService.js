// Copyright 2021 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/viewerProductSnapshotService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import viewerSecondaryModelService from 'js/viewerSecondaryModel.service';
import viewerPerformanceService from 'js/viewerPerformance.service';
import messagingService from 'js/messagingService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import logger from 'js/logger';
import soaSvc from 'soa/kernel/soaService';
import fmsUtils from 'js/fmsUtils';
import browserUtils from 'js/browserUtils';
import vmoSvc from 'js/viewModelObjectService';
import viewerCtxSvc from 'js/viewerContext.service';
import declUtils from 'js/declUtils';
import modelPropertySvc from 'js/modelPropertyService';
import parsingUtils from 'js/parsingUtils';
import cdm from 'soa/kernel/clientDataModel';

var exports = {};

var _snapshotPanelCloseEventSubscription = null;
var _fullScreenEventSubscription = null;
var _galleryTabSelectedEvent = null;
var _selectedTabInGallery = 'SnapshotTab';

/**
 * snapshot panel revealed
 *
 * @param {Object} data view model
 */
export let productSnapshotPanelRevealed = function() {
    if( _galleryTabSelectedEvent === null ) {
        _galleryTabSelectedEvent = eventBus.subscribe( 'awTab.selected', ( eventData ) => {
            if( eventData && eventData.scope && eventData.scope.selectedTab && eventData.scope.selectedTab.tabKey ) {
                if( eventData.scope.selectedTab.tabKey === 'InputImageCapture' ) {
                    _selectedTabInGallery = 'ImageCaptureTab';
                } else if( eventData.scope.selectedTab.tabKey === 'InputSnapshot' ) {
                    _selectedTabInGallery = 'SnapshotTab';
                }
            }
        } );
    }
    if( _snapshotPanelCloseEventSubscription === null ) {
        _snapshotPanelCloseEventSubscription = eventBus.subscribe( 'appCtx.register', function( eventData ) {
            if( eventData.name === 'activeToolsAndInfoCommand' ) {
                _unRegisterForEvents();
                _clearSnapshotCtx();
            }
        }, 'viewerProductSnapshotService' );
    }
    if( _fullScreenEventSubscription === null ) {
        _fullScreenEventSubscription = eventBus.subscribe( 'commandBarResized', function() {
            _unRegisterForEvents();
            _clearSnapshotCtx();
        }, 'viewerProductSnapshotService' );
    }
    if( _selectedTabInGallery !== 'SnapshotTab' ) {
        eventBus.publish( 'awTab.setSelected', {
            tabKey: 'InputImageCapture'
        } );
    } else {
        _selectedTabInGallery = 'SnapshotTab';
        _registerSnapshotCtx();
        let snapshotCtx = _getSnapshotCtx();
        if( !snapshotCtx.snapshotView ) {
            snapshotCtx.snapshotView = 'Image';
        }
    }

    let viewerCtx = appCtxSvc.getCtx( _getActiveViewerCmdCtxPartPath() );
    let occmgmtContext = appCtxSvc.getCtx( viewerCtx.occmgmtContextName );
    let currentVMO = vmoSvc.constructViewModelObjectFromModelObject( occmgmtContext.topElement, 'Search' );

    return {
        viewerCtxNamespace: _getActiveViewerCmdCtxPartPath(),
        handleCommandBarClick: this.handleCommandBarClick,
        handleTextEditDblClick: this.handleTextEditDblClick,
        vmoForProductSnapshotGallery: currentVMO
    };
};

/**
 * Get file URL from ticket.
 * @param {String} ticket - File ticket.
 * @returns {String} fileURL file ticket
 */
export let getFileURLFromTicket = function( ticket ) {
    if( ticket ) {
        return browserUtils.getBaseURL() + 'fms/fmsdownload/' + fmsUtils.getFilenameFromTicket( ticket ) +
            '?ticket=' + encodeURIComponent( ticket );
    }
    return null;
};

/**
 * @returns {String} Current viewer context
 */
export let getSnapshotContextOnDiscussion = function() {
    let allViewerCtx = viewerCtxSvc.getRegisteredViewerContextNamseSpaces();
    let occmgmtActiveContext = appCtxSvc.getCtx( 'aceActiveContext' );
    let occmgmtContextKey = occmgmtActiveContext && occmgmtActiveContext.key ? occmgmtActiveContext.key : 'occmgmtContext';
    return _.find( allViewerCtx, function( vc ) {
        let currentViewerContext = appCtxSvc.getCtx( vc );
        if( currentViewerContext && currentViewerContext.occmgmtContextName &&
            currentViewerContext.occmgmtContextName === occmgmtContextKey ) {
            return vc;
        }
    } );
};

/**
 * Creates Product Snapshots in Teamcenter
 *
 * @param  {String} viewerCtxNameSpace viewer context namespace
 * @param  {String} snapshotOwnerUID snapshot Owner's uid
 * @param  {String} relationName relation name with which this snapshot is to be attached
 */
export let createProductSnapshot = function( viewerCtxNameSpace, snapshotOwnerUID, relationName ) {
    let snapshotObject = null;
    /**Currnetly, using getVisLicenseLevels API to check if visServer is Alive. Need to update this in future
     * if we get API to check if the visServer is connected or not.
     */
    let currViewerNamespace = _getActiveViewerCmdCtxPartPath();
    let viewerCurrCtx = viewerCtxSvc.getRegisteredViewerContext( currViewerNamespace );
    let viewerView = viewerCurrCtx.getViewerView();
    return viewerView.getVisLicenseLevels( window.JSCom.Consts.LICENSE_LEVELS.ALL ).then( () => {
        let occmgmtContextKey = viewerCtxSvc.getViewerApplicationContext( currViewerNamespace, viewerCtxSvc.VIEWER_OCCMGMTCONTEXT_NAMESPACE_TOKEN );
        let occmgmtCtx = appCtxSvc.getCtx( occmgmtContextKey );
        return _createProductSnapshot( occmgmtCtx, snapshotOwnerUID, relationName );
    } ).then( result => {
        snapshotObject = result;
        return viewerSecondaryModelService.updateProductSnapshot( viewerCtxNameSpace, snapshotObject.uid );
    } ).then( () => {
        return snapshotObject;
    } ).catch( ( error ) => {
        logger.error( 'ViewerSnapshotService: Create Product Snapshot failed: ' + error );
    } );
};

/**
 * Creates snapshots and fires notifictaion
 *
 * @param  {Object} data view model
 * @param  {String} viewerCtxNameSpace viewer context namespace
 */
export let createProductSnapshotAndNotify = function( data, viewerCtxNameSpace ) {
    if( viewerPerformanceService.isPerformanceMonitoringEnabled() ) {
        viewerPerformanceService.setViewerPerformanceMode( true );
        viewerPerformanceService.startViewerPerformanceDataCapture( viewerPerformanceService.viewerPerformanceParameters.CaptureProductSnapshot );
    }
    return createProductSnapshot( viewerCtxNameSpace ).then( function( snapshotModel ) {
        if( viewerPerformanceService.isPerformanceMonitoringEnabled() ) {
            viewerPerformanceService.stopViewerPerformanceDataCapture( 'Product snapshot created : ' );
            viewerPerformanceService.setViewerPerformanceMode( false );
        }
        if( _.isNull( snapshotModel ) || _.isUndefined( snapshotModel ) ) {
            logger.error( 'ViewerSnapshotService: Create Product Snapshot failed:' );
            throw 'Create Product Snapshot failed';
        } else {
            let msg = data.i18n.captureProductSnapshotSuccess.replace( '{0}', snapshotModel.props.object_string.dbValues[ 0 ] );
            messagingService.showInfo( msg );
            eventBus.publish( 'viewerProductSnapshotListDataUpdated', {} );
            return snapshotModel;
        }
    } ).catch( ( error ) => {
        logger.error( 'viewerProductSnapshotService: Product Snapshot get properties failed: ' + error );
    } );
};

/**
 * Creates snapshots and fires notifictaion On Discussion Panel
 *
 * @param  {Object} data view model
 * @param  {String} viewerCtxNameSpace viewer context namespace
 */
export let createProductSnapshotOnDiscussion = function( data, viewerCtxNameSpace ) {
    exports.createProductSnapshotAndNotify( data, viewerCtxNameSpace ).then( function( snapshotModel ) {
        soaSvc.post( 'Core-2006-03-DataManagement', 'getProperties', {
            objects: [ {
                uid: snapshotModel.uid,
                type: 'Fnd0Snapshot'
            } ],
            attributes: [ 'awp0ThumbnailImageTicket' ]
        } ).then( function() {
            var snapImgVar = {};
            snapImgVar.fmsTicket = snapshotModel.props.awp0ThumbnailImageTicket.dbValues[ 0 ];
            var imageURL = getFileURLFromTicket( snapImgVar.fmsTicket );
            let currentVMO = vmoSvc.constructViewModelObjectFromModelObject( snapshotModel, 'Search' );
            var viewerCtx = appCtxSvc.getCtx( 'viewer' );
            appCtxSvc.updatePartialCtx( 'viewer.discussionCtx', {} );
            viewerCtx.discussionCtx.newProductSnapshot = currentVMO;
            viewerCtx.discussionCtx.newProductSnapshot.thumbnailURL = imageURL;
            eventBus.publish( 'viewerProductSnapshotOnDiscussionUpdated', {} );
        } );
    } );
};

/**
 * Updates selected product snapshot by capturing current viewer state on dicussion Panel
 * @param  {Object} vmo selected snapshot
 * @param  {Object} data view model
 */
export let updateProductSnapshotOnDiscussion = function( vmo, data ) {
    viewerSecondaryModelService.updateProductSnapshot( _getActiveViewerCmdCtxPartPath(), vmo.uid )
        .then( () => {
            soaSvc.post( 'Core-2006-03-DataManagement', 'getProperties', {
                objects: [ {
                    uid: vmo.uid,
                    type: 'Fnd0Snapshot'
                } ],
                attributes: [ 'awp0ThumbnailImageTicket' ]
            } ).then( function() {
                var snapImgVar = {};
                snapImgVar.fmsTicket = vmo.props.awp0ThumbnailImageTicket.dbValues[ 0 ];
                var imageURL = getFileURLFromTicket( snapImgVar.fmsTicket );
                var viewerCtx = appCtxSvc.getCtx( 'viewer' );
                appCtxSvc.updatePartialCtx( 'viewer.discussionCtx', {} );
                viewerCtx.discussionCtx.newProductSnapshot = vmo;
                viewerCtx.discussionCtx.newProductSnapshot.thumbnailURL = imageURL;
                eventBus.publish( 'viewerProductSnapshotOnDiscussionModified', {} );
            } );
        } ).catch( ( error ) => {
            messagingService.showInfo( data.i18n.failedToUpdate );
            logger.error( 'ViewerProductSnapshotService: Product Snapshot update failed: ' + error );
        } );
};

/**
 * delete snapshot context
 *
 */
export let unregisterSnapshotDiscussionContextdata = function() {
    let viewerCtx = appCtxSvc.getCtx( 'viewer' );
    if( viewerCtx && viewerCtx.discussionCtx ) {
        delete viewerCtx.discussionCtx;
    } else {
        let convCtx = appCtxSvc.getCtx( 'Ac0ConvCtx' );
        if( convCtx && convCtx.currentSelectedSnapshot ) {
            delete convCtx.currentSelectedSnapshot;
        }
    }
};

/**
 * Action to show snapshot element on discussion panel reveal
 *
 * @param  {Object} data view model
 */
export let revealSnapshotOnDiscussionPanel = function( data ) {
    let currentDiscussionCtx = appCtxSvc.getCtx( 'Ac0ConvCtx' );
    var selection = [];
    if( currentDiscussionCtx && currentDiscussionCtx.currentSelectedSnapshot ) {
        selection.push( currentDiscussionCtx.currentSelectedSnapshot );
    } else {
        var viewerCtx = appCtxSvc.getCtx( 'viewer' );
        if( viewerCtx && viewerCtx.discussionCtx && viewerCtx.discussionCtx.newProductSnapshot ) {
            selection.push( viewerCtx.discussionCtx.newProductSnapshot );
        }
    }
    return {
        snapshotOnDiscussion: selection,
        snapshotTotalFound: selection.length
    };
};

/**
 * Delete the object from Teamcenter Database
 * @param {*} vmo selected view model
 * @param {*} data view model
 */
export let deleteProductSnapshotAndNotify = function( vmo, data ) {
    soaSvc.post( 'Core-2006-03-DataManagement', 'deleteObjects', { objects: [ vmo ] } ).then( function() {
        let snapshotGallery = appCtxSvc.getCtx( 'mySnapshotGallery' );
        if( !_.isUndefined( snapshotGallery ) ) {
            eventBus.publish( 'primaryWorkarea.reset' );
        }
        messagingService.showInfo( data.i18n.productSnapshotDeletedSuccussfully );
    } ).catch( ( error ) => {
        var msg = data.i18n.productSnapshotDeleteFailed.replace( '{0}', error );
        messagingService.showError( msg );
        logger.error( 'viewerProductSnapshotService: Product Snapshot delete failed: ' + error );
    } );
};

/**
 * Deletes snapshot
 *
 * @param  {Object} vmo selected snapshot
 * @param  {Object} data view model
 */
export let deleteProductSnapshot = function( vmo, data ) {
    var msg = data.i18n.productSnapshotDeleteConfirmationText.replace( '{0}', vmo.cellHeader1 );
    var buttons = [ {
        addClass: 'btn btn-notify',
        text: data.i18n.cancelText,
        onClick: function( $noty ) {
            $noty.close();
        }
    }, {
        addClass: 'btn btn-notify',
        text: data.i18n.deleteText,
        onClick: function( $noty ) {
            $noty.close();
            deleteProductSnapshotAndNotify( vmo, data );
        }
    } ];
    messagingService.showWarning( msg, buttons );
};

/**
 * Starts snapshot edit operation
 *
 * @param  {Object} vmo snapshot
 */
export let startEditProductSnapshot = function( vmo ) {
    var snapshotCtx = _getSnapshotCtx();
    snapshotCtx.snapshotBeingEdit = vmo;
    eventBus.publish( 'showEditProductSnapshot', {} );
};

/**
 * Updates snapshot Name
 *
 * @param  {String} newName new name for snapshot
 * @param  {Object} data view model
 */
export let renameProductSnapshotAndNotify = function( newName, data ) {
    var snapshotCtx = _getSnapshotCtx();
    var inputData = [ {
        object: snapshotCtx.snapshotBeingEdit,
        vecNameVal: [ {
            name: 'object_name',
            values: [
                newName
            ]
        } ]
    } ];

    /* update the name in Teamcenter*/
    soaSvc.post( 'Core-2010-09-DataManagement', 'setProperties', { info: inputData } ).then( function() {
        messagingService.showInfo( data.i18n.updatedProductSnapshotSuccessfully );
        let activeToolsAndInfoCtx = appCtxSvc.getCtx( 'activeToolsAndInfoCommand' );
        if( activeToolsAndInfoCtx.commandId === 'Awv0CaptureGallery' ) {
            eventBus.publish( 'snapshot.productSnapshotRenameSuccessful', {} );
        } else if( activeToolsAndInfoCtx.commandId === 'Ac0UniversalConversationPanel' || activeToolsAndInfoCtx.commandId === 'ac0EditInDiscussLocationPanel' ) {
            eventBus.publish( 'snapshot.productSnapshotDiscRenameSuccessful', {} );
        }
    } ).catch( ( error ) => {
        messagingService.showInfo( data.i18n.failedToUpdate );
        logger.error( 'ViewerSnapshotService: Product Snapshot rename failed: ' + error );
    } );
};

/**
 * Clear previous selection
 *  @param {Object} dataProvider snapshot DataProvider
 */
export let clearPreviousProductSnapshotSelection = function( dataProvider ) {
    var viewModelObject = dataProvider.selectedObjects;
    if( viewModelObject && viewModelObject.length > 0 && dataProvider.selectionModel ) {
        dataProvider.selectionModel.setSelection( [] );
    }
};

/**
 * Set snapshot view
 *
 * @param {String} viewerCtxNamespace viewer context namespace
 * @param {String} snapshotView View to set for snapshot panel
 */
export let setProductSnapshotView = function( viewerCtxNamespace, snapshotView ) {
    let snapshotCtx = appCtxSvc.getCtx( viewerCtxNamespace ).snapshotCtx;
    snapshotCtx.snapshotView = snapshotView;
    eventBus.publish( 'viewerProductSnapshotListDataUpdated', {} );
};

/**
 * Get the default page size used for max to load/return.
 * @param {Array|Object} defaultPageSizePreference - default page size from server preferences
 * @returns {Number} The amount of objects to return from a server SOA response.
 */
export let getDefaultPageSize = function( defaultPageSizePreference ) {
    var defaultPageSize = 50;

    if( defaultPageSizePreference ) {
        if( _.isArray( defaultPageSizePreference ) ) {
            defaultPageSize = exports.getDefaultPageSize( defaultPageSizePreference[ 0 ] );
        } else if( _.isString( defaultPageSizePreference ) ) {
            defaultPageSize = parseInt( defaultPageSizePreference );
        } else if( _.isNumber( defaultPageSizePreference ) && defaultPageSizePreference > 0 ) {
            defaultPageSize = defaultPageSizePreference;
        }
    }

    return defaultPageSize;
};

/**
 * Updates selected product snapshot by capturing current viewer state
 * @param  {Object} vmo selected snapshot
 * @param  {Object} data view model
 */
export let updateProductSnapshotAndNotify = function( vmo, data ) {
    let viewerCurrCtx = viewerCtxSvc.getRegisteredViewerContext( _getActiveViewerCmdCtxPartPath() );
    let viewerView = viewerCurrCtx.getViewerView();
    return viewerView.getVisLicenseLevels( window.JSCom.Consts.LICENSE_LEVELS.ALL ).then( () => {} ).then( () => {
        return _updateStructureInProductSnapshot( vmo );
    } ).then( () => {
        return viewerSecondaryModelService.updateProductSnapshot( _getActiveViewerCmdCtxPartPath(), vmo.uid );
    } ).then( () => {
        eventBus.publish( 'viewerProductSnapshotListDataUpdated', {} );
    } ).catch( ( error ) => {
        messagingService.showInfo( data.i18n.failedToUpdate );
        logger.error( 'ViewerProductSnapshotService: Product Snapshot update failed: ' + error );
    } );
};

/**
 * Handle commandbar selection
 *
 * @param {object} event object
 * @param {object} item: selected Object
 * @param {object} dataProvider: object
 */
export let handleCommandBarClick = function( event, item, dataProvider ) {
    if( dataProvider.selectedObjects.length > 0 && dataProvider.selectedObjects.some( selectedSnapshot => selectedSnapshot.uid === item.uid ) ) {
        event.stopPropagation();
    }
};

/**
 * Intialize Gallery
 *
 * @returns {function} Function to handle click on overflow command.
 */

export let initializeGallery = function() {
    return {
        handleCommandBarClick: this.handleCommandBarClick,
        handleTextEditDblClick: this.handleTextEditDblClick
    };
};

/**
 * Gets snapshot context
 *
 *  @returns {Object} snapshot context
 */
function _getViewerCtx() {
    return appCtxSvc.getCtx( _getActiveViewerCmdCtxPartPath() );
}

/**
 * Gets snapshot context
 *
 *  @returns {Object} snapshot context
 */
function _getSnapshotCtx() {
    /* ToDo : Check */
    if( _getViewerCtx().snapshotCtx === undefined ) {
        _updateActiveViewerCmdCtx( 'snapshotCtx', {
            snapshots: []
        } );
    }
    return _getViewerCtx().snapshotCtx;
}

/**
 * Updates active viewer context
 *
 * @param  {String} partialPath part path
 * @param  {Object} value value at this context path
 */
function _updateActiveViewerCmdCtx( partialPath, value ) {
    var updatedPartialPath = _getActiveViewerCmdCtxPartPath() + '.' + partialPath;
    appCtxSvc.updatePartialCtx( updatedPartialPath, value );
}

/**
 * Registers snapshot context
 */
function _registerSnapshotCtx() {
    var snapshotCtx = _getSnapshotCtx();
    if( snapshotCtx === undefined ) {
        _updateActiveViewerCmdCtx( 'snapshotCtx', {
            snapshots: []
        } );
    }
}

/**
 * Clears snapshot context
 */
function _clearSnapshotCtx() {
    var viewerCtx = appCtxSvc.getCtx( _getActiveViewerCmdCtxPartPath() );
    delete viewerCtx.snapshotCtx;
}

/**
 * Unregisters for events
 */
var _unRegisterForEvents = function() {
    if( _snapshotPanelCloseEventSubscription !== null ) {
        eventBus.unsubscribe( _snapshotPanelCloseEventSubscription );
        _snapshotPanelCloseEventSubscription = null;
    }

    if( _fullScreenEventSubscription !== null ) {
        eventBus.unsubscribe( _fullScreenEventSubscription );
        _fullScreenEventSubscription = null;
    }

    if( _galleryTabSelectedEvent !== null ) {
        eventBus.unsubscribe( _galleryTabSelectedEvent );
        _galleryTabSelectedEvent = null;
    }
};

/**
 * Gets active viewer command context
 *
 * @returns {String} viewer context
 */
var _getActiveViewerCmdCtxPartPath = function() {
    var viewerCtx = appCtxSvc.getCtx( 'viewer' );

    if( viewerCtx.activeViewerCommandCtx ) {
        return viewerCtx.activeViewerCommandCtx;
    }
    return 'awDefaultViewer'; // passing default as snapshot can be created from one step command
};

/**
 * create snapshot object from SOA
 *
 * @param  {Object} occmgmtCtx occurence management context
 * @param {String} snapshotOwnerUID snapshot owner uid
 * @param {String} relationName relation name
 * @returns {Object} snapshot object
 */
let _createProductSnapshot = function( occmgmtCtx, snapshotOwnerUID, relationName ) {
    let hasPartitionScheme = false;
    if( occmgmtCtx.productContextInfo.props.fgf0PartitionScheme ) {
        let partitionSchemeUid = occmgmtCtx.productContextInfo.props.fgf0PartitionScheme.dbValues[ 0 ];
        hasPartitionScheme = !_.isNull( partitionSchemeUid ) && !_.isUndefined( partitionSchemeUid ) && !_.isEmpty( partitionSchemeUid );
    }
    if( occmgmtCtx.productContextInfo.props.awb0AlternateConfiguration && occmgmtCtx.productContextInfo.props.awb0AlternateConfiguration.dbValues[ 0 ] !== '' && !hasPartitionScheme ) {
        let snapshotObject = null;
        return soaSvc.post( 'Internal-Core-2012-10-DataManagement', 'createRelateAndSubmitObjects', {
            inputs: [ {
                clientId: 'AWClient',
                createData: {
                    boName: 'Fnd0Snapshot',
                    propertyNameValues: {
                        object_name: [ '' ],
                        fnd0AllowReadShare: [ 'false' ],
                        fnd0AllowWriteShare: [ 'false' ]
                    }
                },
                pasteProp: '',
                targetObject: {
                    uid: snapshotOwnerUID ? snapshotOwnerUID : '',
                    type: relationName ? relationName : ''
                }
            } ]
        } ).then( createOutput => {
            snapshotObject = createOutput.output[ 0 ].objects[ 0 ];
            return soaSvc.post( 'Internal-ActiveWorkspaceBom-2020-05-OccurrenceManagement', 'updateWorkingContext', {
                input: [ {
                    productInfo: {
                        uid: occmgmtCtx.productContextInfo.uid,
                        type: 'Awb0ProductContextInfo'
                    },
                    workingContext: {
                        uid: snapshotObject.uid,
                        type: 'Fnd0AppSession'
                    },
                    saveResult: true,
                    operation: 'Create'
                } ]
            } );
        } ).then( () => {
            return snapshotObject;
        } );
    }
    return declUtils.loadDependentModule( 'js/occmgmtBackingObjectProviderService' )
        .then( ( occMBOPSMod ) => {
            if( occMBOPSMod ) {
                return occMBOPSMod.getBackingObjects( [ occmgmtCtx.topElement ] );
            }
        } ).then( ( topLinesArray ) => {
            return soaSvc.post( 'Cad-2020-01-AppSessionManagement', 'createOrUpdateSavedSession', {
                sessionsToCreateOrUpdate: [ {
                    sessionToCreateOrUpdate: {
                        objectToCreate: {
                            creInp: {
                                boName: 'Fnd0Snapshot'
                            }
                        }
                    },
                    productAndConfigsToCreate: [ {
                        structureRecipe: {
                            structureContextIdentifier: {
                                product: {
                                    uid: topLinesArray[ 0 ].uid
                                }
                            }
                        }
                    } ]
                } ]
            } );
        } ).then( createOutput => {
            return createOutput.sessionOutputs[ 0 ].sessionObject;
        } );
};

/**
 * Update structure in snapshot object from SOA
 *
 * @param  {Object} snapshotObject snapshot object
 */
let _updateStructureInProductSnapshot = function( snapshotObject ) {
    let occmgmtContextKey = viewerCtxSvc.getViewerApplicationContext( _getActiveViewerCmdCtxPartPath(), viewerCtxSvc.VIEWER_OCCMGMTCONTEXT_NAMESPACE_TOKEN );
    let occmgmtCtx = appCtxSvc.getCtx( occmgmtContextKey );
    let topLinesArray = null;
    let snapshotObjModelObject = cdm.getObject( snapshotObject.uid );
    return declUtils.loadDependentModule( 'js/occmgmtBackingObjectProviderService' )
        .then( ( occMBOPSMod ) => {
            if( occMBOPSMod ) {
                return occMBOPSMod.getBackingObjects( [ occmgmtCtx.topElement ] );
            }
        } ).then( ( topLinesArray1 ) => {
            topLinesArray = topLinesArray1;
            return soaSvc.post( 'Cad-2020-01-AppSessionManagement', 'openSavedSession', {
                sessionsToOpen: [ snapshotObjModelObject ],
                filter: {
                    productStructureFilter: {
                        productStructure: 'RecipeObjectsOnly'
                    }
                }
            } );
        } ).then( ( result ) => {
            let structureCtxStableID = result.sessionOutputs[ 0 ].sessionProductStructures[ 0 ].stableId;
            return soaSvc.post( 'Cad-2020-01-AppSessionManagement', 'createOrUpdateSavedSession', {
                sessionsToCreateOrUpdate: [ {
                    sessionToCreateOrUpdate: {
                        objectToUpdate: snapshotObjModelObject
                    },
                    productAndConfigsToCreate: [ {
                        structureRecipe: {
                            structureContextIdentifier: {
                                product: {
                                    uid: topLinesArray[ 0 ].uid
                                }
                            }
                        },
                        structureRecipeProps: {
                            fnd0CopyStableId: {
                                stringValues: [ structureCtxStableID ]
                            }
                        }
                    } ],
                    detachObjectOrProductsFromSession: [ structureCtxStableID ]
                } ]
            } );
        } );
};

/**
 *
 * @param {*} event
 * @param {*} item
 * @param {*} data
 */
export let handleTextEditDblClick = function( event, item, snapshotDataProvider, data ) {
    if( item.props.fnd0OwningIdentifier && item.props.fnd0OwningIdentifier.dbValue !== null || item.props.owning_user && item.props.owning_user.propertyDisplayName !== 'Owner' ) {
        return;
    }
    if( snapshotDataProvider.selectedObjects.length > 0 && snapshotDataProvider.selectedObjects.some( selectedSnapshot =>
            selectedSnapshot.uid === item.uid ) ) {
        event.stopPropagation();
    }

    if( snapshotDataProvider.selectedObjects.length === 0 || snapshotDataProvider.selectedObjects[ 0 ] !== item ) {
        snapshotDataProvider.selectionModel.setSelection( item );
        modifyProductSnapshot( data );
    }
    //place to store a selected value which can be used whne the currebt obj become previus Sel
    data.modifyProductSnapshotObject = item;
    item.productSnapshotTextBox.isEditable = true;
    item.productSnapshotTextBox.isEnabled = true;
    item.productSnapshotTextBox.autofocus = true;
};

/**
 *
 * @param {*} selectedbj
 * @param {*} data
 * @returns
 */
export let inlineRenameProductSnapshot = function( selectedObj, data ) {
    //check if the object is selected
    let selectedProdSnapObj = _.isArray( selectedObj ) ? selectedObj[ 0 ] : selectedObj;
    if( selectedProdSnapObj ) {
        selectedProdSnapObj.productSnapshotTextBox.isEditable = false;
        selectedProdSnapObj.productSnapshotTextBox.isEnabled = false;
        selectedProdSnapObj.productSnapshotTextBox.autofocus = false;
        data.modifyProductSnapshotObject = '';
        //check if the name is same then return
        if( selectedProdSnapObj.productSnapshotTextBox.dbValue === selectedProdSnapObj.cellHeader1 ) {
            return;
        }
        let inputData = [ {
            object: selectedProdSnapObj,
            vecNameVal: [ {
                name: 'object_name',
                values: [
                    selectedProdSnapObj.productSnapshotTextBox.dbValue
                ]
            } ]
        } ];

        /* update the name in Teamcenter*/
        soaSvc.post( 'Core-2010-09-DataManagement', 'setProperties', { info: inputData } ).then( function() {
            messagingService.showInfo( data.i18n.updatedProductSnapshotSuccessfully );
        } ).catch( ( error ) => {
            messagingService.showInfo( data.i18n.failedToUpdate );
            logger.error( 'ViewerSnapshotService: Product Snapshot rename failed: ' + error );
        } );
    }
};

/**
 * Update the card data
 * @param {*} response
 * @param {*} snapshotCardDataProvider
 * @returns
 */

export let modifyProductSnapshotCardData = function( response ) {
    let jsonString = _.get( response, 'searchResultsJSON' );
    let parsedProductSnasphotsJson = parsingUtils.parseJsonString( jsonString );
    let loadedVMOs = [];
    for( let i = 0; i < parsedProductSnasphotsJson.objects.length; i++ ) {
        loadedVMOs[ i ] = vmoSvc.constructViewModelObjectFromModelObject( cdm.getObject( parsedProductSnasphotsJson.objects[ i ].uid ), 'EDIT' );
    }

    let widgetsProperties = {
        productSnapshotTextBox: {
            displayName: '',
            type: 'STRING',
            renderingHint: 'textbox',
            dbValue: '',
            dispValue: '',
            isEditable: false
        }
    };
    _.forEach( loadedVMOs, function( productSnapshot ) {
        widgetsProperties.productSnapshotTextBox.dbValue = productSnapshot.cellHeader1;
        widgetsProperties.productSnapshotTextBox.dispValue = productSnapshot.cellHeader1;
        productSnapshot.productSnapshotTextBox = modelPropertySvc.createViewModelProperty( widgetsProperties.productSnapshotTextBox );
    } );
    return loadedVMOs;
};

/**
 * Apply snapshot
 *
 * @param  {Object} data view model
 * @param  {Object} dataProvider data provider where selection changed
 * @param  {Object} otherDataProvider data provider where selection needs to sync
 */
export let modifyProductSnapshot = function( data ) {
    if( data.modifyProductSnapshotObject ) {
        inlineRenameProductSnapshot( data.modifyProductSnapshotObject, data );
    }
};

export let renameSnapshotFromPanel = function( data ) {
    var snapshotCtx = _getSnapshotCtx();
    if( snapshotCtx ) {
        let modifiedObject = snapshotCtx.snapshotBeingEdit;
        let updateSnaphotObject = data.ImageViewSearchResults.filter( snapshot => snapshot.uid === modifiedObject.uid );
        if( updateSnaphotObject ) {
            updateSnaphotObject[ 0 ].productSnapshotTextBox.dbValue = updateSnaphotObject[ 0 ].cellHeader1;
            updateSnaphotObject[ 0 ].productSnapshotTextBox.dispValue = updateSnaphotObject[ 0 ].cellHeader1;
            updateSnaphotObject[ 0 ].productSnapshotTextBox.uiValue = updateSnaphotObject[ 0 ].cellHeader1;
        }
    }
};

export default exports = {
    productSnapshotPanelRevealed,
    createProductSnapshotAndNotify,
    createProductSnapshot,
    deleteProductSnapshot,
    deleteProductSnapshotAndNotify,
    startEditProductSnapshot,
    renameProductSnapshotAndNotify,
    clearPreviousProductSnapshotSelection,
    setProductSnapshotView,
    getFileURLFromTicket,
    getDefaultPageSize,
    handleCommandBarClick,
    updateProductSnapshotAndNotify,
    initializeGallery,
    unregisterSnapshotDiscussionContextdata,
    revealSnapshotOnDiscussionPanel,
    getSnapshotContextOnDiscussion,
    createProductSnapshotOnDiscussion,
    modifyProductSnapshotCardData,
    handleTextEditDblClick,
    inlineRenameProductSnapshot,
    modifyProductSnapshot,
    renameSnapshotFromPanel,
    updateProductSnapshotOnDiscussion
};
/**
 * This service contributes to Viewer Snapshots in ActiveWorkspace Visualization
 *
 * @member viewerProductSnapshotService
 * @memberof NgServices
 */
app.factory( 'viewerProductSnapshotService', () => exports );

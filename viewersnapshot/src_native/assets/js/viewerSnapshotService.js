// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/viewerSnapshotService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import viewerSecondaryModelService from 'js/viewerSecondaryModel.service';
import viewerPreferenceService from 'js/viewerPreference.service';
import viewerPerformanceService from 'js/viewerPerformance.service';
import viewerContextService from 'js/viewerContext.service';
import AwPromiseService from 'js/awPromiseService';
import messagingService from 'js/messagingService';
import vmoSvc from 'js/viewModelObjectService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import logger from 'js/logger';
import $ from 'jquery';
import _cdmSvc from 'soa/kernel/clientDataModel';
import AwTimeoutService from 'js/awTimeoutService';

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
export let snapshotPanelRevealed = function( data ) {
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
        }, 'viewerSnapshotService' );
    }
    if( _fullScreenEventSubscription === null ) {
        _fullScreenEventSubscription = eventBus.subscribe( 'commandBarResized', function() {
            _unRegisterForEvents();
            _clearSnapshotCtx();
        }, 'viewerSnapshotService' );
    }
    if( _selectedTabInGallery !== 'SnapshotTab' ) {
        eventBus.publish( 'awTab.setSelected', {
            tabKey: 'InputImageCapture'
        } );
    } else {
        _selectedTabInGallery = 'SnapshotTab';
        _initialize( data );
        var snapshotCtx = _getSnapshotCtx();
        if( !snapshotCtx.snapshotView ) {
            snapshotCtx.snapshotView = 'Image';
        }
    }

    let viewerCtx = appCtxSvc.getCtx( _getActiveViewerCmdCtxPartPath() );
    let occmgmtContext = appCtxSvc.getCtx( viewerCtx.occmgmtContextName );
    let currentVMO = vmoSvc.constructViewModelObjectFromModelObject( occmgmtContext.topElement, 'Search' );
    if( !currentVMO.hasThumbnail ) {
        currentVMO.thumbnailURL = currentVMO.typeIconURL;
    }

    return {
        viewerCtxNamespace: _getActiveViewerCmdCtxPartPath(),
        handleCommandBarClick: exports.handleCommandBarClick,
        vmoForSnapshotGallery: currentVMO
    };
};
/**
 * Based on tab selection function is called
 * @param {Object} eventData eventData
 *
 */
export let isInputSnapshotSelectedView = function( eventData ) {
    if( eventData.scope.selectedTab.tabKey === 'InputImageCapture' && eventData.scope.data &&
        eventData.scope.data.dataProviders && eventData.scope.data.dataProviders.snapshotDataProvider ) {
        clearPreviousSnapshotSelection( eventData.scope.data.dataProviders.snapshotDataProvider );
    } else if( eventData.scope.selectedTab.tabKey === 'InputSnapshot' ) {
        snapshotPanelRevealed( eventData.scope.data );
    }
};
/**
 * Gets all snapshots
 *
 * @returns {Object} object that contains count and array of snapshots
 */
export let getAllSnapshotData = function( searchCriteria ) {
    var snapshotCtx = _getSnapshotCtx();
    if( searchCriteria && !_.isNull( searchCriteria.searchString ) && !_.isUndefined( searchCriteria.searchString ) && !_.isEmpty( searchCriteria.searchString ) ) {
        var filterString = searchCriteria.searchString;
        var filteredList = [];
        var snapshotList = snapshotCtx.snapshots;
        for( var i = 0; i < snapshotList.length; i++ ) {
            var objectFiltered = false;
            var objectName = snapshotList[ i ].cellHeader1;
            if( _.includes( objectName.toUpperCase(), filterString.toUpperCase() ) ) {
                objectFiltered = true;
            }
            if( objectFiltered ) {
                filteredList.push( snapshotList[ i ] );
            }
        }
        return {
            allSnapshots: filteredList,
            totalFound: filteredList.length
        };
    }
    return {
        allSnapshots: snapshotCtx.snapshots,
        totalFound: snapshotCtx.snapshots.length
    };
};

/**
 * Creates snapshots and fires notifictaion
 *
 * @param  {Object} data view model
 * @param  {String} viewerCtxNameSpace viewer context namespace
 */
export let createSnapshotAndNotify = function( data, viewerCtxNameSpace ) {
    if( viewerPerformanceService.isPerformanceMonitoringEnabled() ) {
        viewerPerformanceService.setViewerPerformanceMode( true );
        viewerPerformanceService.startViewerPerformanceDataCapture( viewerPerformanceService.viewerPerformanceParameters.CaptureSessionSnapshot );
    }
    if( _.isUndefined( viewerCtxNameSpace ) ) {
        viewerCtxNameSpace = _getActiveViewerCmdCtxPartPath();
    }
    viewerSecondaryModelService.createSnapshot( viewerCtxNameSpace )
        .then( function( rawSnapshot ) {
            if( viewerPerformanceService.isPerformanceMonitoringEnabled() ) {
                viewerPerformanceService.stopViewerPerformanceDataCapture( 'Session snapshot created :' );
                viewerPerformanceService.setViewerPerformanceMode( false );
            }
            var snapshotCtx = _getSnapshotCtx();
            if( snapshotCtx && snapshotCtx.snapshots ) {
                _createSnapshotModelFromRawSnapshot( rawSnapshot )
                    .then( function( snapshotModel ) {
                        snapshotCtx.snapshots.unshift( snapshotModel );
                        var msg = data.i18n.captureSnapshotSuccess.replace( '{0}', snapshotModel.cellHeader1 );
                        messagingService.showInfo( msg );
                        eventBus.publish( 'viewerSnapshotListDataUpdated', {} );
                    } );
            }
        }, function( reason ) {
            var msg = data.i18n.snapshotCreationFailed.replace( '{0}', reason );
            messagingService.showError( msg );
            logger.error( 'ViewerSnapshotService: Snapshot creation failed: ' + reason );
        } );
};

/**
 * Deletes snapshot
 *
 * @param  {Object} vmo selected snapshot
 * @param  {Object} data view model
 */
export let deleteSnapshot = function( vmo, data ) {
    var msg = data.i18n.snapshotDeleteConfirmationText.replace( '{0}', vmo.cellHeader1 );
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

            vmo.delete()
                .then( function() {
                    var snapshotCtx = _getSnapshotCtx();
                    _.remove( snapshotCtx.snapshots, function( obj ) {
                        return obj === vmo;
                    } );
                    eventBus.publish( 'viewerSnapshotListDataUpdated', {} );
                    messagingService.showInfo( data.i18n.snapshotDeletedSuccussfully );
                }, function( reason ) {
                    var msg = data.i18n.snapshotDeleteFailed.replace( '{0}', reason );
                    messagingService.showError( msg );
                    logger.error( 'ViewerSnapshotService: Snapshot delete failed: ' + reason );
                } );
        }
    } ];
    messagingService.showWarning( msg, buttons );
};

/**
 * Apply snapshot
 * @param  {Object} snapshot selected snapshot
 * @param  {Object} data view model
 * @param  {Object} dataProvider data provider where selection changed
 * @param  {Object} otherDataProvider data provider where selection needs to sync
 */
export let applySnapshot = function( snapshot, data, dataProvider, otherDataProvider ) {
    if( snapshot ) {
        if( viewerPerformanceService.isPerformanceMonitoringEnabled() ) {
            viewerPerformanceService.setViewerPerformanceMode( true );
            viewerPerformanceService.startViewerPerformanceDataCapture( viewerPerformanceService.viewerPerformanceParameters.ApplySessionSnapshot );
        }
        snapshot.Apply().then( function() {
            if( viewerPerformanceService.isPerformanceMonitoringEnabled() ) {
                viewerPerformanceService.stopViewerPerformanceDataCapture( 'Session snapshot applied: ' );
                viewerPerformanceService.setViewerPerformanceMode( false );
            }
            else{
                logger.info( 'ViewerSnapshotService: Snapshot applied' );
            }
            let viewerCtxNamespace = _getActiveViewerCmdCtxPartPath();
            viewerPreferenceService.loadViewerPreferencesFromVisSession( viewerContextService.getRegisteredViewerContext( viewerCtxNamespace ) );
            dataProvider.selectionModel.setSelection( snapshot );
            otherDataProvider.selectionModel.setSelection( snapshot );
            AwTimeoutService.instance( function() {
                viewerContextService.updateSectionCommandState( viewerCtxNamespace );
            }, 500 );
        }, function( reason ) {
            messagingService.showInfo( data.i18n.snapshotApplyFailed );
            logger.error( 'ViewerSnapshotService: Snapshot Apply failed: ' + reason );
        } );
    }
};

/**
 * Starts snapshot edit operation
 *
 * @param  {Object} vmo snapshot
 */
export let startEditSnapshot = function( vmo ) {
    var snapshotCtx = _getSnapshotCtx();
    snapshotCtx.snapshotBeingEdit = vmo;
    eventBus.publish( 'showEditSnapshot', {} );
};

/**
 * Deletes All snapshots
 *
 * @param  {Object} data view model
 */
export let deleteAllSnapshots = function( data ) {
    var msg = data.i18n.allSnapshotDeleteConfirmationText;
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
            var viewerCtxNameSpace = _getActiveViewerCmdCtxPartPath();
            viewerSecondaryModelService.deleteAllSnapshots( viewerCtxNameSpace )
                .then( function() {
                    messagingService.showInfo( data.i18n.allSnapshotDeletedSuccussfully );
                    var snapshotCtx = _getSnapshotCtx();
                    snapshotCtx.snapshots = [];
                    eventBus.publish( 'viewerSnapshotListDataUpdated', {} );
                }, function( reason ) {
                    var msg = data.i18n.snapshotDeleteFailed.replace( '{0}', reason );
                    messagingService.showError( msg );
                    logger.error( 'ViewerSnapshotService: Snapshots delete opeartion failed: ' + reason );
                } );
        }
    } ];
    messagingService.showWarning( msg, buttons );
};

/**
 * Updates snapshot Name
 *
 * @param  {String} newName new name for snapshot
 * @param  {Object} data view model
 */
export let renameSnapshotAndNotify = function( newName, data ) {
    var snapshotCtx = _getSnapshotCtx();
    snapshotCtx.snapshotBeingEdit.setName( newName )
        .then( function() {
            _.forEach( snapshotCtx.snapshots, function( snapshot ) {
                if( snapshotCtx.snapshotBeingEdit.id === snapshot.id ) {
                    snapshot.cellHeader1 = newName;
                    return false;
                }
            } );
            messagingService.showInfo( data.i18n.updatedSnapshotSuccessfully );
            eventBus.publish( 'snapshot.snapshotRenameSuccessful', {} );
        }, function( reason ) {
            eventBus.publish( 'snapshot.snapshotRenameSuccessful', {} );
            messagingService.showInfo( data.i18n.failedToUpdate );
            logger.error( 'ViewerSnapshotService: Snapshot rename failed: ' + reason );
        } );
};

/**
 * Updates snapshot
 *
 * @param  {Object} vmo view model object
 * @param  {Object} data view model
 */
export let updateSnapshotAndNotify = function( vmo, data ) {
    vmo.Update().then( () => {
        let snapshotCtx = _getSnapshotCtx();
        let index = snapshotCtx.snapshots.indexOf( vmo );
        snapshotCtx.snapshots[ index ].getThumbnail().then( ( url ) => {
            snapshotCtx.snapshots[ index ].thumbnailURL = url;
            eventBus.publish( 'viewerSnapshotListDataUpdated', {} );
        } );
    } ).catch( ( reason ) => {
        messagingService.showInfo( data.i18n.failedToUpdate );
        logger.error( 'ViewerSnapshotService: Snapshot update failed: ' + reason );
    } );
};

/**
 * Clear previous selection
 *  @param {Object} -- snapshot DataProvider
 */
export let clearPreviousSnapshotSelection = function( dataProvider ) {
    var viewModelObject = dataProvider.selectedObjects;
    if( viewModelObject && viewModelObject.length > 0 && dataProvider.selectionModel ) {
        dataProvider.selectionModel.setSelection( [] );
    }
};

/**
 * Handle commandbar selection
 *
 * @param {object} event object
 * @param {object} item: selected Object
 * @param {object} dataProvider: object
 */
export let handleCommandBarClick = function( event, item, dataProvider ) {
    if( dataProvider.selectedObjects.length > 0 && dataProvider.selectedObjects.some( selectedSnapshot => selectedSnapshot.id === item.id ) ) {
        event.stopPropagation();
    }
};

/**
 * Set snapshot view
 *
 * @param {String} viewerCtxNamespace viewer context namespace
 * @param {String} snapshotView View to set for snapshot panel
 */
export let setSnapshotView = function( viewerCtxNamespace, snapshotView ) {
    let snapshotCtx = appCtxSvc.getCtx( viewerCtxNamespace ).snapshotCtx;
    snapshotCtx.snapshotView = snapshotView;
    eventBus.publish( 'viewerSnapshotListDataUpdated', {} );
};

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
            snapshotModel.id = rawSnapshot.visObject.resourceID;
            snapshotModel.thumbnailURL = thumbnailURL;
            snapshotModel.hideoverlay = true;
            snapshotModel.hasThumbnail = true;
            snapshotModel.cellHeader1 = name;
            var userName = _cdmSvc.getUser().props.user_name.uiValues[ 0 ];
            snapshotModel.cellHeader2 = userName + '(' + userName + ')';
            deferred.resolve( snapshotModel );
        }, function( reason ) {
            logger.error( 'ViewerSnapshotService: Snapshot getName/getThumbnail opeation failed: ' + reason );
            deferred.reject( reason );
        } );
        return deferred.promise;
    }
}

/**
 * Fetches snapshots from server
 *
 * @param  {Object} data view model
 */
function _fetchSnapshotData( data ) {
    var viewerCtxNameSpace = _getActiveViewerCmdCtxPartPath();
    viewerSecondaryModelService.getAllSnapshots( viewerCtxNameSpace )
        .then( function( rawSnapshotList ) {
            var snapshotCtx = _getSnapshotCtx();
            if( Array.isArray( snapshotCtx.snapshots ) ) {
                snapshotCtx.snapshots.length = 0;
            }
            var rawSnapshotListPromises = [];
            for( var index = 0; index < rawSnapshotList.length; index++ ) {
                var deferred = AwPromiseService.instance.defer();
                rawSnapshotListPromises.push( deferred.promise );
                rawSnapshotList.getSnapshot( index ).then( function( rawSnapshot ) {
                    this.resolve( rawSnapshot );
                }.bind( deferred ) );
            }

            AwPromiseService.instance.all( rawSnapshotListPromises ).then( function( rawSnapshotList ) {
                var snapshotModelPromises = [];
                _.forEach( rawSnapshotList, function( rawSnapshot ) {
                    snapshotModelPromises.push( _createSnapshotModelFromRawSnapshot( rawSnapshot ) );
                } );

                AwPromiseService.instance.all( snapshotModelPromises ).then( function( snapshotModelList ) {
                    //Reverse the snapshots lists to show in desc assuming snapshotModelList are always in asc order
                    _.forEach( snapshotModelList.reverse(), function( snapshotModel ) {
                        snapshotCtx.snapshots.push( snapshotModel );
                    } );

                    eventBus.publish( 'viewerSnapshotListDataUpdated' );
                } );
            } );
        }, function( reason ) {
            var msg = data.i18n.failedToFetchSnapshots.replace( '{0}', reason );
            messagingService.showError( msg );
        } );
}

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
    eventBus.publish( 'setSnapshotContext' );
}

/**
 * Initialize snapshot service
 * @param  {Object} data view model
 */
function _initialize( data ) {
    _registerSnapshotCtx();
    _fetchSnapshotData( data );
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

export default exports = {
    snapshotPanelRevealed,
    getAllSnapshotData,
    createSnapshotAndNotify,
    deleteSnapshot,
    applySnapshot,
    startEditSnapshot,
    deleteAllSnapshots,
    renameSnapshotAndNotify,
    clearPreviousSnapshotSelection,
    setSnapshotView,
    handleCommandBarClick,
    isInputSnapshotSelectedView,
    updateSnapshotAndNotify
};
/**
 * This service contributes to Viewer Snapshots in ActiveWorkspace Visualization
 *
 * @member viewerSnapshotService
 * @memberof NgServices
 */
app.factory( 'viewerSnapshotService', () => exports );

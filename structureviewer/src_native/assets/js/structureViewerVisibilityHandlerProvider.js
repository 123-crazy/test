// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * This service is create viewer context data
 *
 * @module js/structureViewerVisibilityHandlerProvider
 */
import app from 'app';
import objectToCSIDGeneratorService from 'js/objectToCSIDGeneratorService';
import StructureViewerService from 'js/structureViewerService';
import TracelinkSelectionHandler from 'js/tracelinkSelectionHandler';
import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';
import assert from 'assert';
import objectsToPackedOccurrenceCSIDsService from 'js/objectsToPackedOccurrenceCSIDsService';
import VisOccmgmtCommunicationService from 'js/visOccmgmtCommunicationService';
import appCtxService from 'js/appCtxService';

var exports = {};

/**
 * Provides an instance of structure viewer selection handler
 *
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {StructureViewerVisibilityHandler} Returns viewer selection manager
 */
export let getStructureViewerVisibilityHandler = function( viewerContextData ) {
    var visibilityHandler = null;

    if( TracelinkSelectionHandler.instance.isRootSelectionTracelinkType() ) {
        visibilityHandler = TracelinkSelectionHandler.instance.createVisibilityHandler( StructureViewerVisibilityHandler,
            viewerContextData );
    } else {
        visibilityHandler = new StructureViewerVisibilityHandler( viewerContextData );
    }

    return visibilityHandler;
};

/**
 * Class to hold the structure viewer visibility data
 *
 * @constructor StructureViewerVisibilityHandler
 * @param {Object} viewerContextData Viewer Context data
 */
var StructureViewerVisibilityHandler = function( viewerContextData ) {
    assert( viewerContextData, 'Viewer context data can not be null' );
    var self = this;
    var _viewerCtxData = viewerContextData;
    var _isViewerVisibilityListenerAttached = false;
    let updateVisibilityFromViewerInProgress = false;

    /**
     * Register the viewer listener
     *
     * @return {Void}
     */
    self.registerForVisibilityEvents = function( _occmgmtContextNameKey ) {
        if( !_isViewerVisibilityListenerAttached ) {
            VisOccmgmtCommunicationService.instance.registerVisibilityEventsToAce( _occmgmtContextNameKey, _viewerCtxData.getViewerCtxNamespace() );
            _viewerCtxData.getVisibilityManager().addViewerVisibilityChangedListener( self.viewerVisibilityChangedListener );
            _isViewerVisibilityListenerAttached = true;
        }
    };

    /**
     * Get visibility of occurrence in viewer
     *
     * @param {ViewModelObject} vmo a view model object to get visibility
     * @returns {Boolean} boolean indicating of part is visible or not
     */
    self.internalGetOccVisibility = function( vmo ) {
        if( vmo && vmo.modelType && _.includes( vmo.modelType.typeHierarchyArray, 'Fgf0PartitionElement' ) ) {
            var visibility = _viewerCtxData.getVisibilityManager().getPartitionVisibility( StructureViewerService.instance.computePartitionChain( vmo ) );
            if( visibility === _viewerCtxData.getVisibilityManager().VISIBILITY.PARTIAL ||
                visibility === _viewerCtxData.getVisibilityManager().VISIBILITY.INVISIBLE ) {
                return false;
            }
            return true;
        }
        return self.getOccVisibility( _viewerCtxData, vmo );
    };

    /**
     * Clean viewer visibility listeners
     *
     * @param {ViewModelObject} vmo a view model object to toggle visibility
     * @return {Void}
     */
    self.internalToggleOccVisibility = function( eventData ) {
        if( !( eventData &&
                eventData.contextKey ===
                StructureViewerService.instance.getOccmgmtContextNameKeyFromViewerContext( _viewerCtxData.getViewerCtxNamespace() ) ) ) {
            return;
        }
        if( eventData.vmo && eventData.vmo.modelType && _.includes( eventData.vmo.modelType.typeHierarchyArray, 'Fgf0PartitionElement' ) ) {
            _viewerCtxData.getVisibilityManager().togglePartitionPartVisibility( StructureViewerService.instance.computePartitionChain( eventData.vmo ) );
            VisOccmgmtCommunicationService.instance.notifyVisibilityChangesToAce( StructureViewerService.instance.getOccmgmtContextNameKeyFromViewerContext(
                _viewerCtxData.getViewerCtxNamespace(), _viewerCtxData.getViewerCtxNamespace() ) );
        } else {
            self.toggleOccVisibility( _viewerCtxData, eventData.vmo );
        }
    };

    /**
     * Viewer visibility changed listener
     * @param {Boolean} visibilityData visibility to set
     */
    self.viewerVisibilityChangedListener = function( visibilityData ) {
        updateVisibilityFromViewerInProgress = true;
        StructureViewerService.instance.updateViewerSelectionCommandsVisibility( _viewerCtxData );
        if( !appCtxService.getCtx( 'splitView.mode' ) ) {
            VisOccmgmtCommunicationService.instance.notifyVisibilityChangesToObservers( visibilityData );
        }
        VisOccmgmtCommunicationService.instance.notifyVisibilityChangesToAce( StructureViewerService.instance.getOccmgmtContextNameKeyFromViewerContext(
            _viewerCtxData.getViewerCtxNamespace() ), _viewerCtxData.getViewerCtxNamespace() );
    };

    /**
     * handle visibility changes from other Apps
     * @param {Object} visibilityData visibility data from other apps
     */
    self.internalHandleVisibilityChanges = function( visibilityData ) {
        if( updateVisibilityFromViewerInProgress || !visibilityData ) {
            updateVisibilityFromViewerInProgress = false;
            return;
        }
        let visibilityDataCache = {
            invisibleCsids: visibilityData.invisibleCsids,
            invisibleExceptionCsids: visibilityData.invisibleExceptionCsids,
            invisiblePartitionIds: visibilityData.invisiblePartitionIds
        };
        if( visibilityData.isStateChange ) {
            _viewerCtxData.getVisibilityManager().setVisibleState( visibilityData.occurrencesFromViewer, [], false, visibilityDataCache );
        } else {
            _viewerCtxData.getVisibilityManager().setPartsVisibility( visibilityData.occurrencesFromViewer, [], visibilityData.visibilityToSet, false, visibilityDataCache );
        }
    };

    /**
     * Gets visibility data from viewer
     * @returns {Object} visibilityData data
     */
    self.getVisibilityState = function() {
        return Object.create( {
            invisibleCsids: Object.values( _viewerCtxData.getVisibilityManager().invisibleCsids ),
            invisibleExceptionCsids: Object.values( _viewerCtxData.getVisibilityManager().invisibleExceptionCsids ),
            invisiblePartitionIds: Object.values( _viewerCtxData.getVisibilityManager().invisiblePartitionIds )
        } );
    };

    /**
     * Clean viewer visibility listeners
     *
     * @return {Void}
     */
    self.cleanUp = function( occmgmtContextNameKey ) {
        if( _isViewerVisibilityListenerAttached ) {
            _isViewerVisibilityListenerAttached = false;
            VisOccmgmtCommunicationService.instance.deregisterVisibilityEventsToAce( occmgmtContextNameKey );
        }

        if( _viewerCtxData && _viewerCtxData.getVisibilityManager() ) {
            _viewerCtxData.getVisibilityManager().removeViewerVisibilityChangedListener(
                self.viewerVisibilityChangedListener );
        }
    };
};

StructureViewerVisibilityHandler.prototype.toggleOccVisibility = function( viewerCtxData, vmo ) {
    var csid = objectToCSIDGeneratorService.getCloneStableIdChain( vmo );
    if( csid === '/' ) {
        csid = '';
    }
    var selectedObjects = [ vmo ];

    //Getting packed occurences from selected object if any and applying master visibility to all found packed occurences.
    getCloneStableIDsWithPackedOccurrences( viewerCtxData, selectedObjects ).then( function( response ) {
        if( response && response.csids && response.csids.length > 0 ) {
            var masterVisibility = !StructureViewerVisibilityHandler.prototype.getOccVisibility( viewerCtxData, vmo );
            response.csids.forEach( function( item ) {
                viewerCtxData.getVisibilityManager().setPackedPartsVisibility( item, masterVisibility );
            } );
        } else {
            viewerCtxData.getVisibilityManager().toggleProductViewerVisibility( csid );
        }
        StructureViewerService.instance.updateViewerSelectionCommandsVisibility( viewerCtxData );
        VisOccmgmtCommunicationService.instance.notifyVisibilityChangesToAce( StructureViewerService.instance.getOccmgmtContextNameKeyFromViewerContext(
            viewerCtxData.getViewerCtxNamespace() ), viewerCtxData.getViewerCtxNamespace() );
    } );
};

StructureViewerVisibilityHandler.prototype.getOccVisibility = function( viewerCtxData, vmo ) {
    var csid = objectToCSIDGeneratorService.getCloneStableIdChain( vmo );
    if( csid === '/' ) {
        csid = '';
    }
    var visibility = viewerCtxData.getVisibilityManager().getProductViewerVisibility( csid );
    if( visibility === viewerCtxData.getVisibilityManager().VISIBILITY.PARTIAL ||
        visibility === viewerCtxData.getVisibilityManager().VISIBILITY.INVISIBLE ) {
        return false;
    }
    return true;
};

var getCloneStableIDsWithPackedOccurrences = function( viewerCtxData, selectedObjects ) {
    let occmgmtContext = StructureViewerService.instance.getOccmgmtContextFromViewerContext(
        viewerCtxData.getViewerCtxNamespace() );
    let currentProductCtx = occmgmtContext.productContextInfo;
    let packedOccPromise = objectsToPackedOccurrenceCSIDsService.getCloneStableIDsWithPackedOccurrences( currentProductCtx, selectedObjects );
    if( !_.isUndefined( packedOccPromise ) ) {
        return packedOccPromise;
    }
    return AwPromiseService.instance.resolve();
};

export default exports = {
    getStructureViewerVisibilityHandler
};
/**
 * This service is used to get StructureViewerVisibilityHandler
 *
 * @memberof NgServices
 */
app.factory( 'structureViewerVisibilityHandlerProvider', () => exports );

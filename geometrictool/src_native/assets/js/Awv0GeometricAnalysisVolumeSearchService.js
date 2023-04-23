// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awv0GeometricAnalysisVolumeSearchService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import viewerSecondaryModelService from 'js/viewerSecondaryModel.service';
import soaService from 'soa/kernel/soaService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import logger from 'js/logger';
import AwTimeoutService from 'js/awTimeoutService';
import viewerPerformanceService from 'js/viewerPerformance.service';

var exports = {};

var _volumePanelCloseEventSubscription = null;
var _viewerSelectionChangeEventSubscription = null;
var _fullScreenEventSubscription = null;
var _csidToMOPairs = [];
var _registerForEvents = function() {
    /**
     * Listening to gwt.SubLocationContentSelectionChangeEvent event
     */
    if( _viewerSelectionChangeEventSubscription === null ) {
        _viewerSelectionChangeEventSubscription = eventBus.subscribe( 'awViewerContext.update',
            function( eventData ) {
                if( eventData && eventData.property && ( eventData.property === 'viewerSelectionModels' || eventData.property === 'viewerSelectionCSIDS' ) ) {
                    _comparetargetsWithSelections();
                }
            }, 'Awv0GeometricAnalysisVolumeSearchService' );
    }
};

var _comparetargetsWithSelections = function() {
    var targetList = [];
    var selectionList = [];
    var i = 0;
    var geoAnalysisVolumeSearchCtx = exports.getVolumeCtx();

    if( geoAnalysisVolumeSearchCtx !== undefined && geoAnalysisVolumeSearchCtx.targetList !== undefined ) {
        for( ; i < geoAnalysisVolumeSearchCtx.targetList.length; i++ ) {
            targetList.push( geoAnalysisVolumeSearchCtx.targetList[ i ].uid );
        }
    }

    var selections = _getCurrentViewerSelections();

    for( i = 0; selections !== undefined && i < selections.length; i++ ) {
        selectionList.push( selections[ i ].uid );
    }

    var diff = _.difference( selectionList, targetList );

    if( diff.length === 0 ) {
        _updateActiveViewerCmdCtx( 'geoAnalysisVolumeSearch.newTargetForList', false );
    } else {
        _updateActiveViewerCmdCtx( 'geoAnalysisVolumeSearch.newTargetForList', true );
    }
};

var _unRegisterForEvents = function() {
    if( _viewerSelectionChangeEventSubscription !== null ) {
        eventBus.unsubscribe( _viewerSelectionChangeEventSubscription );
        _viewerSelectionChangeEventSubscription = null;
    }

    if( _volumePanelCloseEventSubscription !== null ) {
        eventBus.unsubscribe( _volumePanelCloseEventSubscription );
        _volumePanelCloseEventSubscription = null;
    }

    if( _fullScreenEventSubscription !== null ) {
        eventBus.unsubscribe( _fullScreenEventSubscription );
        _fullScreenEventSubscription = null;
    }
};

var _notifyVolumePanelClosed = function() {
    try {
        exports.setVolumeFilterOnNative( false );
    } catch {
        logger.warn( 'Failed to close volume panel since the viewer is not alive' );
    }
};

var _registerOrUpdateCtx = function() {
    var geoAnalysisVolumeSearchCtx = exports.getVolumeCtx();
    var currentProductContext = _getActiveViewerCmdCtx().viewerCurrentProductContext;
    var currentProductContextUid = currentProductContext ? currentProductContext.uid : undefined;

    if( geoAnalysisVolumeSearchCtx === undefined ) {
        _updateActiveViewerCmdCtx( 'geoAnalysisVolumeSearch', {
            usedProductContextUid: currentProductContextUid,
            targetList: [],
            targetListLength: ''

        } );
    } else if( currentProductContextUid === undefined ||
        geoAnalysisVolumeSearchCtx.usedProductContextUid !== currentProductContext.uid ) {
        _updateActiveViewerCmdCtx( 'geoAnalysisVolumeSearch', {
            usedProductContextUid: currentProductContext.uid
        } );
        exports.removeAllVolumeTargets();
    }
};

var _getCsidListForModelObjects = function( moList ) {
    var csIdList = [];

    for( var i = 0; i < moList.length; i++ ) {
        var idx = _.findIndex( _csidToMOPairs, function( selObj ) { return selObj.modelObj.uid === moList[ i ].uid; } );

        if( idx !== -1 ) {
            var csId = _csidToMOPairs[ idx ].csId;
            csIdList.push( csId );
        } else {
            logger.error( 'Awv0GeometricAnalysisVolumeSearchService: Did not find clone staible id for model object' );
        }
    }

    return csIdList;
};

var _updateCtxWithTargets = function( targets ) {
    _updateActiveViewerCmdCtx( 'geoAnalysisVolumeSearch.targetList', targets );
    _updateActiveViewerCmdCtx( 'geoAnalysisVolumeSearch.targetListLength', targets.length );
    _updateActiveViewerCmdCtx( 'geoAnalysisVolumeSearch.targetCsidList', _getCsidListForModelObjects( targets ) );
    var currentProductCtx = appCtxSvc.getCtx( 'occmgmtContext.productContextInfo' );
    if( currentProductCtx && currentProductCtx.props.awb0PackSimilarElements &&
        currentProductCtx.props.awb0PackSimilarElements.dbValues[ 0 ] && targets && !_.isEmpty( targets ) ) {
        _getCloneStableIDsWithPackedOccurrences( currentProductCtx, targets ).then( function( response ) {
            _updateActiveViewerCmdCtx( 'geoAnalysisVolumeSearch.targetListPkdCsids', response.csids );
            _updateVolumeCorners();
            eventBus.publish( 'geoanalysis.volumeSearchTargetListUpdated', {} );
        }, function( failure ) {
            logger.error( failure );
        } );
    } else {
        _updateActiveViewerCmdCtx( 'geoAnalysisVolumeSearch.targetListPkdCsids', undefined );
        _updateVolumeCorners();
        eventBus.publish( 'geoanalysis.volumeSearchTargetListUpdated', {} );
    }
};

var _updateVolumeCorners = function() {
    var viewerCtxNameSpace = _getActiveViewerCmdCtxPartPath();

    viewerSecondaryModelService.getCornerValuesFromOccListInCtx( viewerCtxNameSpace ).then( function( cornerValues ) {
        eventBus.publish( 'geoanalysis.volumeCornersUpdated', cornerValues ); // to update dbValues
    }, function( failure ) {
        logger.error( failure );
    } );
};

var _getCurrentViewerSelections = function() {
    var activeViewerCtx = _getActiveViewerCmdCtx();
    if( !activeViewerCtx ) {
        return [];
    }
    if( activeViewerCtx.viewerSelectionCSIDS && activeViewerCtx.viewerSelectionCSIDS.length === 0 ) {
        return [ activeViewerCtx.viewerCurrentProductContext ];
    }
    return activeViewerCtx.viewerSelectionModels;
};

var _getCurrentViewerSelectionCsIds = function() {
    var activeViewerCtx = _getActiveViewerCmdCtx();
    if( !activeViewerCtx ) {
        return [];
    }
    if( activeViewerCtx.viewerSelectionCSIDS && activeViewerCtx.viewerSelectionCSIDS.length === 0 ) {
        return [ '' ]; //root
    }
    return activeViewerCtx.viewerSelectionCSIDS;
};

var _getActiveViewerCmdCtxPartPath = function() {
    var viewerCtx = appCtxSvc.getCtx( 'viewer' );
    return viewerCtx.activeViewerCommandCtx;
};

var _getActiveViewerCmdCtx = function() {
    return appCtxSvc.getCtx( _getActiveViewerCmdCtxPartPath() );
};

var _updateActiveViewerCmdCtx = function( partialPath, value ) {
    var updatedPartialPath = _getActiveViewerCmdCtxPartPath() + '.' + partialPath;
    appCtxSvc.updatePartialCtx( updatedPartialPath, value );
};

var _getCloneStableIDsWithPackedOccurrences = function( productContextInfo, selectedObjects ) {
    var fetchPackedOccurrences = false;
    var packingInUse = productContextInfo.props.awb0PackSimilarElements.dbValues[ 0 ];
    if( packingInUse ) {
        fetchPackedOccurrences = true;
    }

    if( !fetchPackedOccurrences || selectedObjects.length === 0 ) {
        return;
    }

    return soaService.postUnchecked( 'Internal-ActiveWorkspaceBom-2017-12-OccurrenceManagement',
        'getPackedOccurrenceCSIDs', {
            occurrences: selectedObjects,
            productContextInfo: productContextInfo
        } );
};

/**
 * Gets Volume Context Object
 */
export let getVolumeCtx = function() {
    var viewerCtx = appCtxSvc.getCtx( _getActiveViewerCmdCtxPartPath() );
    return viewerCtx.geoAnalysisVolumeSearch;
};

/**
 * Draw Volume Box
 */
export let drawVolumeBox = function( cornerVals ) {
    var viewerCtxNameSpace = _getActiveViewerCmdCtxPartPath();
    viewerSecondaryModelService.drawVolumeBox( viewerCtxNameSpace, cornerVals );
};

/**
 * Get all targets
 */
export let getAllTargets = function() {
    var volumeCtx = exports.getVolumeCtx();
    return {
        allTargets: volumeCtx.targetList,
        totalFound: volumeCtx.targetListLength
    };
};

/**
 * volumePanelRevealed
 */
export let volumePanelRevealed = function() {
    if( _volumePanelCloseEventSubscription === null ) {
        _volumePanelCloseEventSubscription = eventBus.subscribe( 'appCtx.register', function( eventData ) {
            if( eventData.name === 'activeToolsAndInfoCommand' ) {
                _notifyVolumePanelClosed();
                _unRegisterForEvents();
            }
        }, 'Awv0GeometricAnalysisvolumeSearchService' );

        if( _fullScreenEventSubscription === null ) {
            _fullScreenEventSubscription = eventBus.subscribe( 'commandBarResized', function() {
                _notifyVolumePanelClosed();
                _unRegisterForEvents();
            }, 'viewerMeasureService' );
        }

        _registerOrUpdateCtx();
        eventBus.publish( 'geoanalysis.volumePanelRevealed', {} );
        _updateVolumeCorners();
    }

    _registerForEvents();
};

/**
 * Add selections to target list
 */
export let addSelectionsToTargetList = function() {
    var selections = _getCurrentViewerSelections();

    if( selections !== undefined && selections.length !== undefined ) {
        var currentTargetList = exports.getVolumeCtx().targetList;
        if( currentTargetList === undefined ) {
            currentTargetList = [];
        }

        var newSelections = _.difference( selections, currentTargetList );

        for( var i = 0; i < newSelections.length; i++ ) {
            var sel = newSelections[ i ];
            currentTargetList.push( sel );
            var csIds = _getCurrentViewerSelectionCsIds();
            var csIdIdx = _.findIndex( selections, function( viewerSel ) { return viewerSel.uid === sel.uid; } );
            _csidToMOPairs.push( { csId: csIds[ csIdIdx ], modelObj: sel } );
        }

        _updateCtxWithTargets( currentTargetList );
    }
};

export let removeAllVolumeTargets = function() {
    _updateCtxWithTargets( [] );
    _csidToMOPairs = [];
};

export let setVolumeFilterOnNative = function( isOn ) {
    var viewerCtxNameSpace = _getActiveViewerCmdCtxPartPath();
    viewerSecondaryModelService.setVolumeFilterOnNative( viewerCtxNameSpace, isOn );
};

export let removeVolumeTarget = function( target ) {
    var currentTargetList = exports.getVolumeCtx().targetList;
    _.remove( currentTargetList, {
        uid: target.uid
    } );

    _.remove( _csidToMOPairs, function( obj ) { return obj.modelObj.uid === target.uid; } );
    _updateCtxWithTargets( currentTargetList );
};

export let updateVolumeCorners = function( declViewModel, eventData ) {
    declViewModel.targetRangeVolumeX1.dbValue = typeof eventData.X1 === 'undefined' || isNaN( eventData.X1 ) ? '' :
        parseFloat( eventData.X1.toFixed( 6 ) );

    declViewModel.targetRangeVolumeY1.dbValue = typeof eventData.Y1 === 'undefined' || isNaN( eventData.Y1 ) ? '' :
        parseFloat( eventData.Y1.toFixed( 6 ) );

    declViewModel.targetRangeVolumeZ1.dbValue = typeof eventData.Z1 === 'undefined' || isNaN( eventData.Z1 ) ? '' :
        parseFloat( eventData.Z1.toFixed( 6 ) );

    declViewModel.targetRangeVolumeX2.dbValue = typeof eventData.X2 === 'undefined' || isNaN( eventData.X2 ) ? '' :
        parseFloat( eventData.X2.toFixed( 6 ) );

    declViewModel.targetRangeVolumeY2.dbValue = typeof eventData.Y2 === 'undefined' || isNaN( eventData.Y2 ) ? '' :
        parseFloat( eventData.Y2.toFixed( 6 ) );

    declViewModel.targetRangeVolumeZ2.dbValue = typeof eventData.Z2 === 'undefined' || isNaN( eventData.Z2 ) ? '' :
        parseFloat( eventData.Z2.toFixed( 6 ) );
};

export let executeVolumeSearch = function( cornerValuesContainer ) {
    if( viewerPerformanceService.isPerformanceMonitoringEnabled() ) {
        viewerPerformanceService.setViewerPerformanceMode( true );
        viewerPerformanceService.startViewerPerformanceDataCapture( viewerPerformanceService.viewerPerformanceParameters.Volume );
    }
    var viewerCtxNameSpace = _getActiveViewerCmdCtxPartPath();
    viewerSecondaryModelService.executeVolumeSearch( viewerCtxNameSpace, cornerValuesContainer ).then( function() {
        if( viewerPerformanceService.isPerformanceMonitoringEnabled() ) {
            viewerPerformanceService.stopViewerPerformanceDataCapture( 'Volume Search Completed : ' );
            viewerPerformanceService.setViewerPerformanceMode( false );
        } else {
            logger.info( 'Volume Search Completed' );
        }
    }, function( failure ) {
        logger.error( failure );
    } );
};

export const updateTargetVolume = function( data ) {
    if( !( data.targetRangeVolumeX1.dbValue === '' || data.targetRangeVolumeX2.dbValue === '' || data.targetRangeVolumeY1.dbValue === '' || data.targetRangeVolumeY2.dbValue === '' || data
            .targetRangeVolumeZ1.dbValue === '' || data.targetRangeVolumeZ2.dbValue === '' ) && data.targetRangeVolumeX1.dbValue <= data.targetRangeVolumeX2.dbValue && data.targetRangeVolumeY1
        .dbValue <= data.targetRangeVolumeY2.dbValue && data.targetRangeVolumeZ1.dbValue <= data.targetRangeVolumeZ2.dbValue ) {
        var cornerValues = exports.getVolumeCtx();
        cornerValues.X1 = data.targetRangeVolumeX1.dbValue;
        cornerValues.Y1 = data.targetRangeVolumeY1.dbValue;
        cornerValues.Z1 = data.targetRangeVolumeZ1.dbValue;
        cornerValues.X2 = data.targetRangeVolumeX2.dbValue;
        cornerValues.Y2 = data.targetRangeVolumeY2.dbValue;
        cornerValues.Z2 = data.targetRangeVolumeZ2.dbValue;
        exports.drawVolumeBox( cornerValues );
    } else {
        AwTimeoutService.instance( function() {
            exports.setVolumeFilterOnNative( false );
        }, 500 );
    }
};

export const initializeVolumeTarget = function( data ) {
    data.targetRangeVolumeX1.initialize = true;
    data.targetRangeVolumeY1.initialize = true;
    data.targetRangeVolumeZ1.initialize = true;
    data.targetRangeVolumeX2.initialize = true;
    data.targetRangeVolumeY2.initialize = true;
    data.targetRangeVolumeZ2.initialize = true;

    _comparetargetsWithSelections();
};

export default exports = {
    getVolumeCtx,
    drawVolumeBox,
    getAllTargets,
    volumePanelRevealed,
    addSelectionsToTargetList,
    removeAllVolumeTargets,
    setVolumeFilterOnNative,
    removeVolumeTarget,
    updateVolumeCorners,
    executeVolumeSearch,
    updateTargetVolume,
    initializeVolumeTarget
};
/**
 * This service contributes to Geometric Search in ActiveWorkspace Visualization
 *
 * @member Awv0GeometricAnalysisVolumeSearchService
 * @memberof NgServices
 */
app.factory( 'Awv0GeometricAnalysisVolumeSearchService', () => exports );

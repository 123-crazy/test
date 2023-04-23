// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awv0GeometricAnalysisProximitySearchService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import viewerSecondaryModelService from 'js/viewerSecondaryModel.service';
import soaService from 'soa/kernel/soaService';
import viewerPreferenceService from 'js/viewerPreference.service';
import viewerPerformanceService from 'js/viewerPerformance.service';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import logger from 'js/logger';

var exports = {};

var Units = {
    mm: 1,
    cm: 2,
    m: 3,
    in: 4,
    ft: 5,
    yd: 6,
    um: 7,
    dm: 8,
    km: 9,
    mils: 10
};

var _proximityPanelCloseEventSubscription = null;
var _viewerSelectionChangeEventSubscription = null;
var _proximityTargetListUpdatedEventSubscription = null;
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
            }, 'Awv0GeometricAnalysisProximitySearchService' );
    }

    /**
     * Listening to geoanalysis.proximitySearchTargetListUpdated event
     */
    if( _proximityTargetListUpdatedEventSubscription === null ) {
        _proximityTargetListUpdatedEventSubscription = eventBus.subscribe(
            'geoanalysis.proximitySearchTargetListUpdated',
            function() {
                _comparetargetsWithSelections();
            }, 'Awv0GeometricAnalysisProximitySearchService' );
    }
};

var _comparetargetsWithSelections = function() {
    var targetList = [];
    var selectionList = [];

    var i = 0;
    var geoAnalysisProximitySearchCtx = _getProximityCtx();

    if( geoAnalysisProximitySearchCtx !== undefined && geoAnalysisProximitySearchCtx.targetList !== undefined ) {
        for( ; i < geoAnalysisProximitySearchCtx.targetList.length; i++ ) {
            targetList.push( geoAnalysisProximitySearchCtx.targetList[ i ].uid );
        }
    }

    var selections = _getCurrentViewerSelections();

    for( i = 0; selections !== undefined && i < selections.length; i++ ) {
        selectionList.push( selections[ i ].uid );
    }

    var diff = _.difference( selectionList, targetList );

    if( diff.length === 0 ) {
        _updateActiveViewerCmdCtx( 'geoAnalysisProximitySearch.newTargetForList', false );
    } else {
        _updateActiveViewerCmdCtx( 'geoAnalysisProximitySearch.newTargetForList', true );
    }
};

var _unRegisterForEvents = function() {
    if( _viewerSelectionChangeEventSubscription !== null ) {
        eventBus.unsubscribe( _viewerSelectionChangeEventSubscription );
        _viewerSelectionChangeEventSubscription = null;
    }

    if( _proximityTargetListUpdatedEventSubscription !== null ) {
        eventBus.unsubscribe( _proximityTargetListUpdatedEventSubscription );
        _proximityTargetListUpdatedEventSubscription = null;
    }

    if( _proximityPanelCloseEventSubscription !== null ) {
        eventBus.unsubscribe( _proximityPanelCloseEventSubscription );
        _proximityPanelCloseEventSubscription = null;
    }

    if( _fullScreenEventSubscription !== null ) {
        eventBus.unsubscribe( _fullScreenEventSubscription );
        _fullScreenEventSubscription = null;
    }
};

var _notifyProximityPanelClosed = function() {
    eventBus.publish( 'geoanalysis.proximityPanelClosed', {} );
};

var _registerOrUpdateCtx = function() {
    var geoAnalysisProximitySearchCtx = _getProximityCtx();
    var currentProductContext = _getActiveViewerCmdCtx().viewerCurrentProductContext;
    var currentProductContextUid = currentProductContext ? currentProductContext.uid : undefined;

    if( geoAnalysisProximitySearchCtx === undefined ) {
        _updateActiveViewerCmdCtx( 'geoAnalysisProximitySearch', {
            usedProductContextUid: currentProductContextUid,
            targetList: [],
            targetListLength: ''
        } );
    } else if( currentProductContextUid === undefined ||
        geoAnalysisProximitySearchCtx.usedProductContextUid !== currentProductContextUid ) {
        _updateActiveViewerCmdCtx( 'geoAnalysisProximitySearch', {
            usedProductContextUid: currentProductContextUid
        } );
        exports.removeAllProximityTargets();
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
            logger.error( 'Awv0GeometricAnalysisProximitySearchService: Did not find clone staible id for model object' );
        }
    }

    return csIdList;
};

var _updateCtxWithTargets = function( targets ) {
    _updateActiveViewerCmdCtx( 'geoAnalysisProximitySearch.targetList', targets );
    _updateActiveViewerCmdCtx( 'geoAnalysisProximitySearch.targetListLength', targets.length );
    _updateActiveViewerCmdCtx( 'geoAnalysisProximitySearch.targetCsidList', _getCsidListForModelObjects( targets ) );
    var currentProductCtx = appCtxSvc.getCtx( 'occmgmtContext.productContextInfo' );
    if( currentProductCtx && currentProductCtx.props.awb0PackSimilarElements &&
        currentProductCtx.props.awb0PackSimilarElements.dbValues[ 0 ] && targets && !_.isEmpty( targets ) ) {
        _getCloneStableIDsWithPackedOccurrences( currentProductCtx, targets ).then( function( response ) {
            _updateActiveViewerCmdCtx( 'geoAnalysisProximitySearch.targetListPkdCsids', response.csids );
            eventBus.publish( 'geoanalysis.proximitySearchTargetListUpdated', {} );
        }, function( failure ) {
            logger.error( failure );
        } );
    } else {
        _updateActiveViewerCmdCtx( 'geoAnalysisProximitySearch.targetListPkdCsids', undefined );
        eventBus.publish( 'geoanalysis.proximitySearchTargetListUpdated', {} );
    }
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

var _getProximityCtx = function() {
    var viewerCtx = appCtxSvc.getCtx( _getActiveViewerCmdCtxPartPath() );
    return viewerCtx.geoAnalysisProximitySearch;
};

var _updateActiveViewerCmdCtx = function( partialPath, value ) {
    var updatedPartialPath = _getActiveViewerCmdCtxPartPath() + '.' + partialPath;
    appCtxSvc.updatePartialCtx( updatedPartialPath, value );
};

/**
 * Get all targets
 */
export let getAllTargets = function() {
    var proximityCtx = _getProximityCtx();
    return {
        allTargets: proximityCtx.targetList,
        totalFound: proximityCtx.targetListLength
    };
};

/**
 * proximityPanelRevealed
 */
export let proximityPanelRevealed = function( proximityUnitText, localeTextBundle ) {
    if( _proximityPanelCloseEventSubscription === null ) {
        _proximityPanelCloseEventSubscription = eventBus.subscribe( 'appCtx.register', function( eventData ) {
            if( eventData.name === 'activeToolsAndInfoCommand' ) {
                _unRegisterForEvents();
                _notifyProximityPanelClosed();
            }
        }, 'Awv0GeometricAnalysisProximitySearchService' );

        if( _fullScreenEventSubscription === null ) {
            _fullScreenEventSubscription = eventBus.subscribe( 'commandBarResized', function() {
                _notifyProximityPanelClosed();
                _unRegisterForEvents();
            }, 'viewerMeasureService' );
        }

        _registerOrUpdateCtx();
        eventBus.publish( 'geoanalysis.proximityPanelRevealed', {} );
    }
    var displayUnit = viewerPreferenceService.getDisplayUnit();
    for( var key in Units ) {
        if( Units[ key ] === displayUnit ) {
            proximityUnitText.uiValue = localeTextBundle[ key ];
        }
    }
    _registerForEvents();
    return {
        proximityUnitText: proximityUnitText
    };
};

/**
 * Add selections to target list
 */
export let addSelectionsToTargetList = function() {
    var selections = _getCurrentViewerSelections();
    if( selections !== undefined && selections.length !== undefined ) {
        var currentTargetList = _getProximityCtx().targetList;
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

export let removeAllProximityTargets = function() {
    _updateCtxWithTargets( [] );
    _csidToMOPairs = [];
};

export let removeProximityTarget = function( target ) {
    var currentTargetList = _getProximityCtx().targetList;
    _.remove( currentTargetList, {
        uid: target.uid
    } );

    _.remove( _csidToMOPairs, function( obj ) { return obj.modelObj.uid === target.uid; } );
    _updateCtxWithTargets( currentTargetList );
};

export let executeProximitySearch = function( input ) {
    if( viewerPerformanceService.isPerformanceMonitoringEnabled() ) {
        viewerPerformanceService.setViewerPerformanceMode( true );
        viewerPerformanceService.startViewerPerformanceDataCapture( viewerPerformanceService.viewerPerformanceParameters.Proximity );
    }
    var viewerCtxNameSpace = _getActiveViewerCmdCtxPartPath();
    viewerSecondaryModelService.executeProximitySearchInDistance( viewerCtxNameSpace, input )
        .then( function() {
            if( viewerPerformanceService.isPerformanceMonitoringEnabled() ) {
                viewerPerformanceService.stopViewerPerformanceDataCapture( 'Proximity Search Completed : ' );
                viewerPerformanceService.setViewerPerformanceMode( false );
            } else {
                logger.info( 'Proximity Search Completed' );
            }
        }, function( failure ) {
            logger.error( failure );
        } );
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

export default exports = {
    getAllTargets,
    proximityPanelRevealed,
    addSelectionsToTargetList,
    removeAllProximityTargets,
    removeProximityTarget,
    executeProximitySearch
};
/**
 * This service contributes to Geometric Proximity Search in ActiveWorkspace Visualization
 *
 * @member Awv0GeometricAnalysisProximitySearchService
 * @memberof NgServices
 */
app.factory( 'Awv0GeometricAnalysisProximitySearchService', () => exports );

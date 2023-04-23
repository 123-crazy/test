// @<COPYRIGHT>@
// ==================================================
// Copyright 2015.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awv0GeometricAnalysisMeasureService
 */
import * as app from 'app';
import viewerMeasureSvc from 'js/viewerMeasureService';
import _ from 'lodash';
import viewerContextService from 'js/viewerContext.service';
import eventBus from 'js/eventBus';
import tcClipboardService from 'js/tcClipboardService';
import AwTimeoutService from 'js/awTimeoutService';
import viewerSecondaryModelService from 'js/viewerSecondaryModel.service';


var exports = {};
let closeSubCommandToolbarEvent = null;
let showSubCommandToolbarEvent = null;
let commandPanelLaunchEvent = null;
let cleanUp3DViewerEvent = null;

let subscribeToThreeDViewerEvents = function() {
    if( commandPanelLaunchEvent === null ) {
        commandPanelLaunchEvent = eventBus.subscribe( 'threeDViewer.commandPanelLaunch', function( eventData ) {
            viewerContextService.updateViewerApplicationContext( eventData.viewerCtxNamespace, viewerContextService.VIEWER_SUB_COMMANDS_LIST, {} );
            viewerContextService.updateViewerApplicationContext( eventData.viewerCtxNamespace, viewerContextService.VIEWER_IS_SUB_COMMANDS_TOOLBAR_ENABLED, false );
            disableMeasurementAndUnsubscribeEvents( eventData.viewerCtxNamespace );
        } );
    }
    if( closeSubCommandToolbarEvent === null ) {
        closeSubCommandToolbarEvent = eventBus.subscribe( 'threeDViewer.hideSubCommandsToolbar', function( eventData ) {
            disableMeasurementAndUnsubscribeEvents( eventData.viewerCtxNamespace );
        } );
    }
    if( showSubCommandToolbarEvent === null ) {
        showSubCommandToolbarEvent = eventBus.subscribe( 'threeDViewer.showSubCommandsToolbar', function( eventData ) {
            let subCommandList = viewerContextService.getViewerApplicationContext( eventData.viewerCtxNamespace, viewerContextService.VIEWER_SUB_COMMANDS_LIST );
            if( eventData && eventData.commandId && subCommandList && subCommandList[ eventData.commandId ] ) {
                disableMeasurementAndUnsubscribeEvents( eventData.viewerCtxNamespace );
            }
        } );
    }
    if( cleanUp3DViewerEvent === null ) {
        cleanUp3DViewerEvent = eventBus.subscribe( 'sv.cleanup3DView', function( eventData ) {
            viewerContextService.updateViewerApplicationContext( eventData.viewerCtxNamespace, viewerContextService.VIEWER_SUB_COMMANDS_LIST, {} );
            viewerContextService.updateViewerApplicationContext( eventData.viewerCtxNamespace, viewerContextService.VIEWER_IS_SUB_COMMANDS_TOOLBAR_ENABLED, false );
            disableMeasurementAndUnsubscribeEvents( eventData.viewerCtxNamespace );
        } );
    }
};

/**
 * Activates measurement mode with pickfilters selected
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {String} mode Measurement mode to be activated doubleMeasurement/singleMeasurement
 */
export let activateMeasurementMode = function( viewerCtxNamespace, mode ) {
    let subToolBarCommandState = viewerMeasureSvc.getMeasurementSubToolBarCommandState( viewerCtxNamespace );
    viewerMeasureSvc.disableMeasurement( viewerCtxNamespace );
    subToolBarCommandState.activeMeasurementMode = mode;
    AwTimeoutService.instance( () => {
        viewerMeasureSvc.activateMeasurementMode( viewerCtxNamespace, mode );
    }, 300 );
    let selectedMeasurementPickFilters = [];
    for( const filter in subToolBarCommandState ) {
        let pickFilter = filter;
        if( subToolBarCommandState[ pickFilter ] === true ) {
            switch ( pickFilter ) {
                case 'partsFilterSelected':
                    selectedMeasurementPickFilters.push( viewerMeasureSvc.PickFilters.PICK_PARTS );
                    break;

                case 'surfaceFilterSelected':
                    selectedMeasurementPickFilters.push( viewerMeasureSvc.PickFilters.PICK_SURFACE );
                    break;

                case 'edgeFilterSelected':
                    selectedMeasurementPickFilters.push( viewerMeasureSvc.PickFilters.PICK_EDGE );
                    break;

                case 'vertexFilterSelected':
                    selectedMeasurementPickFilters.push( viewerMeasureSvc.PickFilters.PICK_VERTEX );
                    break;

                case 'pointFilterSelected':
                    selectedMeasurementPickFilters.push( viewerMeasureSvc.PickFilters.PICK_POINT );
                    break;

                case 'arcCenterFilterSelected':
                    selectedMeasurementPickFilters.push( viewerMeasureSvc.PickFilters.PICK_ARC_CENTER );
                    break;
            }
        }
    }
    viewerMeasureSvc.setSelectedMeasurementPickFilters( selectedMeasurementPickFilters, viewerCtxNamespace, subToolBarCommandState.activeMeasurementMode );
    viewerMeasureSvc.setMeasurementSubToolBarCommandState( viewerCtxNamespace, subToolBarCommandState );
    subscribeToThreeDViewerEvents();
};

/**
 * Sets parts as a picking filter and deselects all feature filter
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 */

export let partsSelectValueChanged = function( viewerCtxNamespace ) {
    var selectedPickFilters = [];
    let subToolBarCommandState = viewerMeasureSvc.getMeasurementSubToolBarCommandState( viewerCtxNamespace );

    if( !subToolBarCommandState.partsFilterSelected ) {
        subToolBarCommandState.partsFilterSelected = true;
        subToolBarCommandState.surfaceFilterSelected = false;
        subToolBarCommandState.vertexFilterSelected = false;
        subToolBarCommandState.edgeFilterSelected = false;
        subToolBarCommandState.pointFilterSelected = false;
        subToolBarCommandState.arcCenterFilterSelected = false;
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_PARTS );
    } else {
        subToolBarCommandState.partsFilterSelected = false;
        subToolBarCommandState.surfaceFilterSelected = true;
        subToolBarCommandState.vertexFilterSelected = true;
        subToolBarCommandState.edgeFilterSelected = true;
        subToolBarCommandState.pointFilterSelected = true;
        subToolBarCommandState.arcCenterFilterSelected = true;
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_SURFACE );
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_EDGE );
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_VERTEX );
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_POINT );
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_ARC_CENTER );
    }
    viewerMeasureSvc.setMeasurementSubToolBarCommandState( viewerCtxNamespace, subToolBarCommandState );
    viewerMeasureSvc.setSelectedMeasurementPickFilters( selectedPickFilters, viewerCtxNamespace, subToolBarCommandState.activeMeasurementMode );
    viewerSecondaryModelService.setMeasurementCommandDataToSessionStorage( viewerCtxNamespace, subToolBarCommandState );
};

/**
 * Sets surface as a picking filter
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 */
export let surfaceSelectValueChanged = function( viewerCtxNamespace ) {
    var selectedPickFilters = [];
    let subToolBarCommandState = viewerMeasureSvc.getMeasurementSubToolBarCommandState( viewerCtxNamespace );
    if( !subToolBarCommandState.surfaceFilterSelected ) {
        subToolBarCommandState.partsFilterSelected = false;
        subToolBarCommandState.surfaceFilterSelected = true;
        selectedPickFilters = viewerMeasureSvc.getSelectedMeasurementPickFilters( viewerCtxNamespace, subToolBarCommandState.activeMeasurementMode );
        if( _.includes( selectedPickFilters, viewerMeasureSvc.PickFilters.PICK_PARTS ) ) {
            selectedPickFilters.length = 0;
        }
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_SURFACE );
    } else {
        if( !subToolBarCommandState.vertexFilterSelected && !subToolBarCommandState.edgeFilterSelected &&
            !subToolBarCommandState.pointFilterSelected && !subToolBarCommandState.arcCenterFilterSelected ) {
            subToolBarCommandState.partsFilterSelected = false;
            subToolBarCommandState.surfaceFilterSelected = true;
            selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_SURFACE );
        } else {
            selectedPickFilters = viewerMeasureSvc.getSelectedMeasurementPickFilters( viewerCtxNamespace, subToolBarCommandState.activeMeasurementMode );
            _.remove( selectedPickFilters, function( currentObject ) {
                return currentObject === viewerMeasureSvc.PickFilters.PICK_SURFACE;
            } );
            subToolBarCommandState.surfaceFilterSelected = false;
        }
    }
    viewerMeasureSvc.setMeasurementSubToolBarCommandState( viewerCtxNamespace, subToolBarCommandState );
    viewerMeasureSvc.setSelectedMeasurementPickFilters( selectedPickFilters, viewerCtxNamespace, subToolBarCommandState.activeMeasurementMode );
    viewerSecondaryModelService.setMeasurementCommandDataToSessionStorage( viewerCtxNamespace, subToolBarCommandState );
};

/**
 * Sets edge as a picking filter
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 */
export let edgeSelectValueChanged = function( viewerCtxNamespace ) {
    var selectedPickFilters = [];
    let subToolBarCommandState = viewerMeasureSvc.getMeasurementSubToolBarCommandState( viewerCtxNamespace );
    if( !subToolBarCommandState.edgeFilterSelected ) {
        subToolBarCommandState.partsFilterSelected = false;
        subToolBarCommandState.edgeFilterSelected = true;
        selectedPickFilters = viewerMeasureSvc.getSelectedMeasurementPickFilters( viewerCtxNamespace, subToolBarCommandState.activeMeasurementMode );
        if( _.includes( selectedPickFilters, viewerMeasureSvc.PickFilters.PICK_PARTS  ) ) {
            selectedPickFilters.length = 0;
        }
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_EDGE );
    } else {
        if( !subToolBarCommandState.vertexFilterSelected && !subToolBarCommandState.surfaceFilterSelected &&
            !subToolBarCommandState.pointFilterSelected && !subToolBarCommandState.arcCenterFilterSelected ) {
            subToolBarCommandState.partsFilterSelected = false;
            subToolBarCommandState.edgeFilterSelected = true;
            selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_EDGE );
        } else {
            selectedPickFilters = viewerMeasureSvc.getSelectedMeasurementPickFilters( viewerCtxNamespace, subToolBarCommandState.activeMeasurementMode );
            _.remove( selectedPickFilters, function( currentObject ) {
                return currentObject === viewerMeasureSvc.PickFilters.PICK_EDGE;
            } );
            subToolBarCommandState.edgeFilterSelected = false;
        }
    }
    viewerMeasureSvc.setMeasurementSubToolBarCommandState( viewerCtxNamespace, subToolBarCommandState );
    viewerMeasureSvc.setSelectedMeasurementPickFilters( selectedPickFilters, viewerCtxNamespace, subToolBarCommandState.activeMeasurementMode );
    viewerSecondaryModelService.setMeasurementCommandDataToSessionStorage( viewerCtxNamespace, subToolBarCommandState );
};

/**
 * Sets vertex as a picking filter
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 */
export let vertexSelectValueChanged = function( viewerCtxNamespace ) {
    var selectedPickFilters = [];
    let subToolBarCommandState = viewerMeasureSvc.getMeasurementSubToolBarCommandState( viewerCtxNamespace );
    if( !subToolBarCommandState.vertexFilterSelected ) {
        subToolBarCommandState.partsFilterSelected = false;
        subToolBarCommandState.vertexFilterSelected = true;
        selectedPickFilters = viewerMeasureSvc.getSelectedMeasurementPickFilters( viewerCtxNamespace, subToolBarCommandState.activeMeasurementMode );
        if( _.includes( selectedPickFilters, viewerMeasureSvc.PickFilters.PICK_PARTS  ) ) {
            selectedPickFilters.length = 0;
        }
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_VERTEX );
    } else {
        if( !subToolBarCommandState.edgeFilterSelected && !subToolBarCommandState.surfaceFilterSelected &&
            !subToolBarCommandState.pointFilterSelected && !subToolBarCommandState.arcCenterFilterSelected ) {
            subToolBarCommandState.partsFilterSelected = false;
            subToolBarCommandState.vertexFilterSelected = true;
            selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_VERTEX );
        } else {
            selectedPickFilters = viewerMeasureSvc.getSelectedMeasurementPickFilters( viewerCtxNamespace, subToolBarCommandState.activeMeasurementMode );
            _.remove( selectedPickFilters, function( currentObject ) {
                return currentObject === viewerMeasureSvc.PickFilters.PICK_VERTEX;
            } );
            subToolBarCommandState.vertexFilterSelected = false;
        }
    }
    viewerMeasureSvc.setMeasurementSubToolBarCommandState( viewerCtxNamespace, subToolBarCommandState );
    viewerMeasureSvc.setSelectedMeasurementPickFilters( selectedPickFilters, viewerCtxNamespace, subToolBarCommandState.activeMeasurementMode );
    viewerSecondaryModelService.setMeasurementCommandDataToSessionStorage( viewerCtxNamespace, subToolBarCommandState );
};

/**
 * Sets point as a picking filter
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 */
export let pointSelectValueChanged = function( viewerCtxNamespace ) {
    var selectedPickFilters = [];
    let subToolBarCommandState = viewerMeasureSvc.getMeasurementSubToolBarCommandState( viewerCtxNamespace );
    if( !subToolBarCommandState.pointFilterSelected ) {
        subToolBarCommandState.pointFilterSelected = true;
        subToolBarCommandState.partsFilterSelected = false;
        selectedPickFilters = viewerMeasureSvc.getSelectedMeasurementPickFilters( viewerCtxNamespace, subToolBarCommandState.activeMeasurementMode );
        if( _.includes( selectedPickFilters, viewerMeasureSvc.PickFilters.PICK_PARTS  ) ) {
            selectedPickFilters.length = 0;
        }
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_POINT );
    } else {
        if( !subToolBarCommandState.edgeFilterSelected && !subToolBarCommandState.surfaceFilterSelected &&
            !subToolBarCommandState.vertexFilterSelected && !subToolBarCommandState.arcCenterFilterSelected ) {
            subToolBarCommandState.partsFilterSelected = false;
            subToolBarCommandState.pointFilterSelected = true;
            selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_POINT );
        } else {
            selectedPickFilters = viewerMeasureSvc.getSelectedMeasurementPickFilters( viewerCtxNamespace, subToolBarCommandState.activeMeasurementMode );
            _.remove( selectedPickFilters, function( currentObject ) {
                return currentObject === viewerMeasureSvc.PickFilters.PICK_POINT;
            } );
            subToolBarCommandState.pointFilterSelected = false;
        }
    }
    viewerMeasureSvc.setMeasurementSubToolBarCommandState( viewerCtxNamespace, subToolBarCommandState );
    viewerMeasureSvc.setSelectedMeasurementPickFilters( selectedPickFilters, viewerCtxNamespace, subToolBarCommandState.activeMeasurementMode );
    viewerSecondaryModelService.setMeasurementCommandDataToSessionStorage( viewerCtxNamespace, subToolBarCommandState );
};

/**
 * Sets arcCenter as a picking filter
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 */
export let arcCenterSelectValueChanged = function( viewerCtxNamespace ) {
    var selectedPickFilters = [];
    let subToolBarCommandState = viewerMeasureSvc.getMeasurementSubToolBarCommandState( viewerCtxNamespace );
    if( !subToolBarCommandState.arcCenterFilterSelected ) {
        subToolBarCommandState.arcCenterFilterSelected = true;
        subToolBarCommandState.partsFilterSelected = false;
        selectedPickFilters = viewerMeasureSvc.getSelectedMeasurementPickFilters( viewerCtxNamespace, subToolBarCommandState.activeMeasurementMode );
        if( _.includes( selectedPickFilters, viewerMeasureSvc.PickFilters.PICK_PARTS  ) ) {
            selectedPickFilters.length = 0;
        }
        selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_ARC_CENTER );
    } else {
        if( !subToolBarCommandState.edgeFilterSelected && !subToolBarCommandState.surfaceFilterSelected &&
            !subToolBarCommandState.vertexFilterSelected && !subToolBarCommandState.pointFilterSelected ) {
            subToolBarCommandState.partsFilterSelected = false;
            subToolBarCommandState.arcCenterFilterSelected = true;
            selectedPickFilters.push( viewerMeasureSvc.PickFilters.PICK_ARC_CENTER );
        } else {
            selectedPickFilters = viewerMeasureSvc.getSelectedMeasurementPickFilters( viewerCtxNamespace, subToolBarCommandState.activeMeasurementMode );
            _.remove( selectedPickFilters, function( currentObject ) {
                return currentObject === viewerMeasureSvc.PickFilters.PICK_ARC_CENTER;
            } );
            subToolBarCommandState.arcCenterFilterSelected = false;
        }
    }
    viewerMeasureSvc.setMeasurementSubToolBarCommandState( viewerCtxNamespace, subToolBarCommandState );
    viewerMeasureSvc.setSelectedMeasurementPickFilters( selectedPickFilters, viewerCtxNamespace, subToolBarCommandState.activeMeasurementMode );
    viewerSecondaryModelService.setMeasurementCommandDataToSessionStorage( viewerCtxNamespace, subToolBarCommandState );
};

/**
 * Copy localized text to clipboard
 * @param {Object} data viewmodel data
 * @param {Object} viewerCtxNamespace Viewer context namespace
 */
export let copyMeasurementTextToClipboard = function( data, viewerCtxNamespace ) {
    let localizedSelectedMeasurementData = null;
    localizedSelectedMeasurementData = viewerMeasureSvc.getSelectedMeasurementLocalizedText( viewerCtxNamespace, data.i18n );
    var formattedString = [];
    for( let localizedData in localizedSelectedMeasurementData ) {
        formattedString.push( localizedData + ': ' + localizedSelectedMeasurementData[ localizedData ] );
    }
    let verdict = tcClipboardService.copyContentToOSClipboard( formattedString );
    if( verdict === false ) {
        data.copiedMeasurementText = null;
    } else {
        data.copiedMeasurementText = formattedString;
    }
};

let disableMeasurementAndUnsubscribeEvents = function( viewerCtxNamespace ) {
    viewerMeasureSvc.disableMeasurement( viewerCtxNamespace );
    eventBus.unsubscribe( cleanUp3DViewerEvent );
    eventBus.unsubscribe( closeSubCommandToolbarEvent );
    eventBus.unsubscribe( showSubCommandToolbarEvent );
    eventBus.unsubscribe( commandPanelLaunchEvent );
    cleanUp3DViewerEvent = null;
    closeSubCommandToolbarEvent = null;
    showSubCommandToolbarEvent = null;
    commandPanelLaunchEvent = null;
};


export default exports = {
    activateMeasurementMode,
    partsSelectValueChanged,
    surfaceSelectValueChanged,
    edgeSelectValueChanged,
    vertexSelectValueChanged,
    pointSelectValueChanged,
    arcCenterSelectValueChanged,
    copyMeasurementTextToClipboard
};
/**
 * @member Awv0GeometricAnalysisMeasureService
 * @memberof NgServices
 */
app.factory( 'Awv0GeometricAnalysisMeasureService', () => exports );

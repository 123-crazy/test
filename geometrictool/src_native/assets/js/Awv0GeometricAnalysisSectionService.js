// @<COPYRIGHT>@
// ==================================================
// Copyright 2021.
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
 * @module js/Awv0GeometricAnalysisSectionService
 */
import * as app from 'app';
import viewerSecondaryModelSvc from 'js/viewerSecondaryModel.service';
import viewerContextService from 'js/viewerContext.service';
import soa_preferenceService from 'soa/preferenceService';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import localeSvc from 'js/localeService';
import AwPromiseService from 'js/awPromiseService';
import AwTimeoutService from 'js/awTimeoutService';
import viewerPerformanceService from 'js/viewerPerformance.service';

var exports = {};
var _sectionSelectionInProgress = false;
var _sectionCreationInProgress = false;
var _sectionModifyInProgress = false;
var _sectionIdToBeProcessedForSelection = {};
var _currentSectionSelectionId = {};
var _showCapsAndLines = null;
var _offsetValTimer = null;
var _offsetSliderValTimer = null;
var eventSectionCreationUsingEntitiesSubscribed = null;
var sectionCreatorOptionsForSurface = {
    SECTION_MODE: window.JSCom.Consts.SectionMode.ALIGN_TO_SURFACE,
    PICK_FILTER: window.JSCom.Consts.PickFilterState.SURFACE
};
var sectionCreatorOptionsForEdge = {
    SECTION_MODE: window.JSCom.Consts.SectionMode.NORMAL_TO_CURVE,
    PICK_FILTER: window.JSCom.Consts.PickFilterState.EDGE
};
let showSubCommandToolbarEvent = null;
let commandPanelLaunchEvent = null;
let cleanUp3DViewerEvent = null;

/**
 * Viewer section panel revealed
 *
 * @function geometricAnalysisSectionPanelRevealed
 */
export let geometricAnalysisSectionPanelRevealed = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    let editData = this.updateEditSectionDetails( data );
    editData.viewerCtxNamespace = _getCurrentViewerCtxNamespace();
    editData.capsValue = data.capsValue;
    if( _.isNull( _showCapsAndLines ) || _.isUndefined( _showCapsAndLines ) ) {
        soa_preferenceService.getStringValue( 'AWV0SectionCapsEdgesInitialState' ).then( function( prefValue ) {
            if( _.isNull( prefValue ) || _.isUndefined( prefValue ) || _.toUpper( prefValue ) === 'TRUE' ) {
                _showCapsAndLines = true;
            } else {
                _showCapsAndLines = false;
            }
            updateCapsValue( editData.capsValue );
            deferred.resolve( editData );
        } ).catch( () => {
            _showCapsAndLines = true;
            updateCapsValue( editData.capsValue );
            deferred.resolve( editData );
        } );
    } else {
        editData.capsValue.dbValue = _showCapsAndLines;
        deferred.resolve( editData );
    }

    var promise = viewerSecondaryModelSvc.initializeSectionsFromContext( _getCurrentViewerCtxNamespace() );
    promise.then( function() {
        _notifySectionListUpdated();
    } );

    return deferred.promise;
};

/**
 * Get all sections data
 */
export let getAllSectionsData = function( dataProvider ) {
    var currentViewerCtxNamespace = _getCurrentViewerCtxNamespace();
    var currentViewerCtx = appCtxSvc.getCtx( currentViewerCtxNamespace );

    var sectionList = null;
    var sectionListLength = 0;
    if( currentViewerCtx.geoAnalysisSection && currentViewerCtx.geoAnalysisSection.sectionList ) {
        sectionList = currentViewerCtx.geoAnalysisSection.sectionList;
        sectionListLength = sectionList.length;
    }
    dataProvider.selectionModel.selectNone();
    for( let i = 0; i < sectionListLength; i++ ) {
        sectionList[ i ].clipData = sectionList[ i ].sectionClipStateList[ sectionList[ i ].sectionClipState ];
        sectionList[ i ].planeIconButton = { iconName: sectionList[ i ].planeThumbnailIcon, tooltip: sectionList[ i ].sectionPlaneLabel };
        if( sectionList[ i ].selected ) {
            _currentSectionSelectionId[ _getCurrentViewerCtxNamespace() ] = sectionList[ i ].sectionId;
            dataProvider.selectionModel.setSelection( sectionList[ i ] );
        }
    }
    return {
        allSectionsData: sectionList,
        totalFound: sectionListLength
    };
};

/**
 * Section value changed
 *
 * @param {String} viewerCtxNamespace viewer context namespace
 * @param {String} sectionId section id
 * @param {Object} sliderData slider model object
 * @param {Boolean} ignoreOffsetSliderUpdate is to ignore offset value
 * @returns {Number} new offset value
 */
export let sliderValueChanged = function( viewerCtxNamespace, sectionId, sliderData, ignoreOffsetSliderUpdate ) {
    if( !sectionId || _sectionSelectionInProgress || ignoreOffsetSliderUpdate ) {
        return;
    }
    let viewerCtxNS = null;
    if( viewerCtxNamespace ) {
        viewerCtxNS = viewerCtxNamespace;
    } else {
        viewerCtxNS = _getCurrentViewerCtxNamespace();
    }
    let newValue = sliderData.dbValue[ 0 ].sliderOption.value;
    _setSectionOffsetValue( viewerCtxNS, sectionId, newValue );

    if( _offsetValTimer ) {
        AwTimeoutService.instance.cancel( _offsetValTimer );
        _offsetValTimer = null;
    }
    _offsetValTimer = AwTimeoutService.instance( function() {
        _resetIgnoreSectionOffset();
        _offsetValTimer = null;
        _notifySectionListUpdated();
    }, 1000 );

    //_notifySectionOffsetUpdated( newValue );
    return newValue;
};

/**
 * Section value moving
 *
 * @param {String} viewerCtxNamespace viewer context namespace
 * @param {String} sectionId section id
 * @param {Object} sliderData slider model object
 * @param {Boolean} ignoreOffsetSliderUpdate is to ignore offset value
 * @returns {Number} new offset value
 */
export let sliderValueMoving = function( viewerCtxNamespace, sectionId, sliderData, ignoreOffsetSliderUpdate ) {
    if( !sectionId || _sectionSelectionInProgress || ignoreOffsetSliderUpdate ) {
        return;
    }
    let viewerCtxNS = null;
    if( viewerCtxNamespace ) {
        viewerCtxNS = viewerCtxNamespace;
    } else {
        viewerCtxNS = _getCurrentViewerCtxNamespace();
    }
    let newValue = sliderData.dbValue[ 0 ].sliderOption.value;
    _moveSectionOffsetValue( viewerCtxNS, sectionId, newValue );
    if( _offsetValTimer ) {
        AwTimeoutService.instance.cancel( _offsetValTimer );
        _offsetValTimer = null;
    }
    _offsetValTimer = AwTimeoutService.instance( function() {
        _resetIgnoreSectionOffset();
        _offsetValTimer = null;
    }, 1000 );
    //_notifySectionOffsetUpdated( newValue );
    return newValue;
};

/**
 * Create viewer section
 *
 * @param {String} viewerCtxNamespace viewer context namespace
 * @param {String} planeId plane id to create section
 */
export let createViewerSection = function( viewerCtxNamespace, planeId ) {
    if( !_currentSectionSelectionId[ viewerCtxNamespace ] ) {
        _createSection( viewerCtxNamespace, planeId );
    } else {
        var deSelectSectionPromise = viewerSecondaryModelSvc.setSectionSelection( viewerCtxNamespace,
            _currentSectionSelectionId[ viewerCtxNamespace ], false );
        deSelectSectionPromise.then( function() {
            _createSection( viewerCtxNamespace, planeId );
        } ).catch( error => {
            _createSection( viewerCtxNamespace, planeId );
        } );
    }
};

export let enterSectionCreationModeUsingEntities = function( viewerCtxNameSpace, sectionMode ) {
    if( sectionMode === 'ALIGN_TO_SURFACE' ) {
        viewerSecondaryModelSvc.enterSectionCreationModeUsingEntities( viewerCtxNameSpace, sectionCreatorOptionsForSurface );
    } else if( sectionMode === 'NORMAL_TO_CURVE' ) {
        viewerSecondaryModelSvc.enterSectionCreationModeUsingEntities( viewerCtxNameSpace, sectionCreatorOptionsForEdge );
    }
    if( eventSectionCreationUsingEntitiesSubscribed === null ) {
        _subscribeSectionUsingEntitiesEvent();
    }
    subscribeToThreeDViewerEvents();
};

var _revealPanelWhenSectionCreatedWithEntities = function( viewerCtxNameSpace, sectionData ) {
    _currentSectionSelectionId[ viewerCtxNameSpace ] = sectionData;
    let activeToolAndInfoCmd = appCtxSvc.getCtx( 'activeToolsAndInfoCommand' );
    if( !activeToolAndInfoCmd || !activeToolAndInfoCmd.commandId || activeToolAndInfoCmd.commandId !== 'Awv0GeometricAnalysisSection' ) {
        AwTimeoutService.instance( function() {
            viewerContextService.activateViewerCommandPanel( 'Awv0GeometricAnalysisSection', 'aw_toolsAndInfo', viewerCtxNameSpace, false );
        }, 1000 );
    }
    _notifySectionListUpdated();
};
/**
 * Subscribe for viewer section using entities created event
 */
var _subscribeSectionUsingEntitiesEvent = function() {
    eventSectionCreationUsingEntitiesSubscribed = eventBus.subscribe( 'SectionCreatedUsingEntities.revealPanel', function( data ) {
        _revealPanelWhenSectionCreatedWithEntities( data.viewerCtxNameSpace, data.sectionData );
    }, 'Awv0GeometricAnalysisSectionService' );
};

let subscribeToThreeDViewerEvents = function() {
    if( commandPanelLaunchEvent === null ) {
        commandPanelLaunchEvent = eventBus.subscribe( 'threeDViewer.commandPanelLaunch', function( eventData ) {
            if( eventData.commandId !== 'Awv0GeometricAnalysisSection' ) {
                disableSectionAndUnsubscribeEvents( eventData.viewerCtxNamespace );
            }
        } );
    }
    if( showSubCommandToolbarEvent === null ) {
        showSubCommandToolbarEvent = eventBus.subscribe( 'threeDViewer.showSubCommandsToolbar', function( eventData ) {
            if( eventData && eventData.commandId ) {
                disableSectionAndUnsubscribeEvents( eventData.viewerCtxNamespace );
            }
        } );
    }
    if( cleanUp3DViewerEvent === null ) {
        cleanUp3DViewerEvent = eventBus.subscribe( 'sv.cleanup3DView', function( eventData ) {
            disableSectionAndUnsubscribeEvents( eventData.viewerCtxNamespace );
        } );
    }
};

let disableSectionAndUnsubscribeEvents = function( viewerCtxNamespace ) {
    viewerSecondaryModelSvc.setSectionModeEnabled( viewerCtxNamespace, false );
    eventBus.unsubscribe( cleanUp3DViewerEvent );
    eventBus.unsubscribe( showSubCommandToolbarEvent );
    eventBus.unsubscribe( commandPanelLaunchEvent );
    cleanUp3DViewerEvent = null;
    showSubCommandToolbarEvent = null;
    commandPanelLaunchEvent = null;
};

/**
 * Modify viewer section
 *
 * @param {String} viewerCtxNamespace viewer context
 * @param {String} sectionId section id
 * @param {String} newNormal new normal
 */
export let modifySection = function( viewerCtxNamespace, sectionId, newNormal ) {
    if( !sectionId || !newNormal || _sectionSelectionInProgress ) {
        return;
    }
    let viewerCtxNS = null;
    if( viewerCtxNamespace ) {
        viewerCtxNS = viewerCtxNamespace;
    } else {
        viewerCtxNS = _getCurrentViewerCtxNamespace();
    }
    _sectionModifyInProgress = true;
    var promise = viewerSecondaryModelSvc.modifySection( viewerCtxNS, sectionId, newNormal );
    promise.then( function() {
        viewerSecondaryModelSvc.updateEditSectionIdToViewerContext( viewerCtxNamespace, sectionId );
        var viewerCtx = appCtxSvc.getCtx( 'viewer' );
        viewerCtx.editSectionViewerCtxNamespace = viewerCtxNamespace;
        appCtxSvc.updateCtx( 'viewer', viewerCtx );
        _notifySectionListUpdated();
    } );
};

/**
 * Create viewer section
 *
 * @param {String} viewerCtxNamespace viewer context
 * @param {String} planeId plane id to create section
 */
var _createSection = function( viewerCtxNamespace, planeId ) {
    if( viewerPerformanceService.isPerformanceMonitoringEnabled() ) {
        viewerPerformanceService.setViewerPerformanceMode( true );
        viewerPerformanceService.startViewerPerformanceDataCapture( viewerPerformanceService.viewerPerformanceParameters.CreateSection );
    }
    var promise = viewerSecondaryModelSvc.createViewerSection( viewerCtxNamespace, planeId );
    _sectionCreationInProgress = true;
    promise.then( function( currentSelectedSectionId ) {
        if( viewerPerformanceService.isPerformanceMonitoringEnabled() ) {
            viewerPerformanceService.stopViewerPerformanceDataCapture( 'Section created : ' );
            viewerPerformanceService.setViewerPerformanceMode( false );
        }
        _currentSectionSelectionId[ viewerCtxNamespace ] = currentSelectedSectionId;
        let activeToolAndInfoCmd = appCtxSvc.getCtx( 'activeToolsAndInfoCommand' );
        if( !activeToolAndInfoCmd || !activeToolAndInfoCmd.commandId || activeToolAndInfoCmd.commandId !== 'Awv0GeometricAnalysisSection' ) {
            AwTimeoutService.instance( function() {
                viewerContextService.activateViewerCommandPanel( 'Awv0GeometricAnalysisSection', 'aw_toolsAndInfo', viewerCtxNamespace, false );
            }, 1000 );
        }
        _notifySectionListUpdated();
    } );
};

/**
 * Select viewer section
 *
 * @param {Object} dataProvider data provider
 */
export let handleSectionSelectionChangeEvent = function( viewerCtxNamespace, dataProvider ) {
    if( _sectionCreationInProgress ) {
        _sectionCreationInProgress = false;
        return AwPromiseService.instance.resolve();
    }
    let viewerCtxNS = null;
    if( viewerCtxNamespace ) {
        viewerCtxNS = viewerCtxNamespace;
    } else {
        viewerCtxNS = _getCurrentViewerCtxNamespace();
    }
    let selectedSection = dataProvider.selectionModel.getSelection();
    let sectionId = null;
    if( Array.isArray( selectedSection ) && selectedSection.length > 0 ) {
        sectionId = selectedSection[ 0 ].sectionId;
    }
    return selectSection( viewerCtxNS, sectionId );
};

/**
 * Delete all sections
 */
export let deleteAllSections = function() {
    var promise = viewerSecondaryModelSvc.deleteAllSections( _getCurrentViewerCtxNamespace() );
    promise.then( function() {
        _currentSectionSelectionId[ _getCurrentViewerCtxNamespace() ] = null;
        _notifySectionListUpdated();
    } );
};

/**
 * Show delete confirmation
 *
 * @param {Object} data object
 */
export let deleteSelectedSection = function( vmo ) {
    var sectionJSO = appCtxSvc.getCtx( 'viewerSectionToBeDeleted' );
    var viewerSectionToBeDeleted = {};
    viewerSectionToBeDeleted.sectionId = vmo.sectionId;
    viewerSectionToBeDeleted.sectionText = vmo.offsetLabel.toString() + ' = ' + vmo.offsetValue.toString();

    if( appCtxSvc.getCtx( 'viewerSectionToBeDeleted' ) ) {
        appCtxSvc.registerCtx( 'viewerSectionToBeDeleted', viewerSectionToBeDeleted );
    } else {
        appCtxSvc.updateCtx( 'viewerSectionToBeDeleted', viewerSectionToBeDeleted );
    }
    eventBus.publish( 'geoanalysis.deleteSection', {} );
};

/**
 * Delete selected sections
 */
export let deleteSelectedSectionAction = function() {
    var sectionJSO = appCtxSvc.getCtx( 'viewerSectionToBeDeleted' );
    var promise = viewerSecondaryModelSvc.deleteSection( _getCurrentViewerCtxNamespace(), sectionJSO.sectionId );
    promise.then( function() {
        if( _.isEqual( parseInt( sectionJSO.sectionId ), parseInt( _currentSectionSelectionId[ _getCurrentViewerCtxNamespace() ] ) ) ) {
            _currentSectionSelectionId[ _getCurrentViewerCtxNamespace() ] = null;
        }
        appCtxSvc.unRegisterCtx( 'viewerSectionToBeDeleted' );
        _notifySectionListUpdated();
    } );
};

/**
 * clean up edit panel section data
 */
export let cleanUpEditPanelData = function() {
    let viewerCtx = appCtxSvc.getCtx( 'viewer' );
    delete viewerCtx.editSectionViewerCtxNamespace;
};

/**
 * Section offset editing started
 */
export let setSectionOffsetEditingStarted = function() {
    appCtxSvc.registerCtx( 'viewerSectionInEditMode', true );
};

/**
 * Section offset editing finished
 */
export let setSectionOffsetEditingFinished = function() {
    appCtxSvc.unRegisterCtx( 'viewerSectionInEditMode' );
};

/**
 * Delete selected sections
 */
export let clearDeleteSectionContext = function() {
    appCtxSvc.unRegisterCtx( 'viewerSectionToBeDeleted' );
};

/**
 * Show caps and cut lines changed
 *
 * @param {String} settingValue new value
 */
export let showCapsAndCutLinesChanged = function( settingValue ) {
    var promise = viewerSecondaryModelSvc.setShowCapsAndCutLines( _getCurrentViewerCtxNamespace(), settingValue );
    promise.then( function() {
        _showCapsAndLines = settingValue;
    } );
};

/**
 * Section offset value updated
 *
 * @param {String} viewerCtxNamespace viewer context
 * @param {String} sectionId section id
 * @param {String} newValue new value
 * @param {Boolean} isValid is valid offset value
 * @param {Boolean} ignoreOffsetUpdate is to ignore offset value
 *
 * @returns {Number} new value
 */
export let sectionOffsetUpdated = function( viewerCtxNamespace, sectionId, newValue, isValid, ignoreOffsetUpdate ) {
    if( !sectionId || _sectionSelectionInProgress || ignoreOffsetUpdate ) {
        return;
    }
    if( _sectionModifyInProgress ) {
        _sectionModifyInProgress = false;
        return;
    }
    let viewerCtxNS = null;
    if( viewerCtxNamespace ) {
        viewerCtxNS = viewerCtxNamespace;
    } else {
        viewerCtxNS = _getCurrentViewerCtxNamespace();
    }
    if( typeof isValid === 'boolean' ) {
        _notifySectionOffsetValidation( viewerCtxNS, isValid );
    }
    if( isValid ) {
        _setSectionOffsetValue( viewerCtxNS, sectionId, newValue );
        if( _offsetSliderValTimer ) {
            AwTimeoutService.instance.cancel( _offsetSliderValTimer );
            _offsetSliderValTimer = null;
        }
        _offsetSliderValTimer = AwTimeoutService.instance( function() {
            _resetIgnoreSectionSliderOffset();
            _offsetSliderValTimer = null;
            _notifySectionListUpdated();
        }, 1000 );
        return newValue;
    }
};

/**
 * Section visibility value updated
 * @param {String} viewerCtxNamespace viewer context
 * @param {String} sectionId section id
 */
export let sectionVisibilityUpdated = function( viewerCtxNamespace, sectionId ) {
    if( !sectionId || _sectionSelectionInProgress ) {
        return;
    }
    let viewerCtxNS = null;
    if( viewerCtxNamespace ) {
        viewerCtxNS = viewerCtxNamespace;
    } else {
        viewerCtxNS = _getCurrentViewerCtxNamespace();
    }
    viewerSecondaryModelSvc.toggleSectionVisibility( viewerCtxNS, sectionId );
};

/**
 * Set setShowCapsAndEdges preference
 *
 * @returns {Boolean} boolean indicating whether to show caps and cutlines
 */
export let setShowCapsAndEdgesAction = function() {
    viewerSecondaryModelSvc.setCapping( _getCurrentViewerCtxNamespace(), _showCapsAndLines );
    viewerSecondaryModelSvc.setGlobalCutLines( _getCurrentViewerCtxNamespace(), _showCapsAndLines );
    return _showCapsAndLines;
};

/**
 * Set setShowCapsAndEdges preference
 *
 * @returns {Boolean} boolean indicating whether to show caps and cutlines
 */
export let loadSectionCellDetails = function( subPanelCtx ) {
    return subPanelCtx.sectionClipStateList[ subPanelCtx.sectionClipState ];
};

/**
 * Updated the clip state of a cross section
 *
 * @param {String} viewerCtxNamespace viewer context
 * @param {String} sectionId section id
 * @param {Object} clipState Clipset to be updated
 */
export let updateClipState = function( viewerCtxNamespace, sectionId, clipState ) {
    let viewerCtxNS = null;
    if( viewerCtxNamespace ) {
        viewerCtxNS = viewerCtxNamespace;
    } else {
        viewerCtxNS = _getCurrentViewerCtxNamespace();
    }
    if( !sectionId || _sectionSelectionInProgress ) {
        return;
    }
    var promise = viewerSecondaryModelSvc.updateClipState( viewerCtxNS, sectionId, Number( clipState ) );
    promise.then( function() {
        _notifySectionListUpdated();
    } );
};

/**
 * Sets whether capping for cross sections should be drawn
 *
 * @param {String} viewerCtxNamespace viewer context
 * @param {Boolean} showCapping Object containing show caps value
 */
export let showCaps = function( viewerCtxNamespace, showCapping ) {
    let viewerCtxNS = null;
    if( viewerCtxNamespace ) {
        viewerCtxNS = viewerCtxNamespace;
    } else {
        viewerCtxNS = _getCurrentViewerCtxNamespace();
    }
    _showCapsAndLines = showCapping;
    viewerSecondaryModelSvc.setCapping( viewerCtxNS, showCapping );
};

/**
 * Sets whether cut lines for the new cross sections should be drawn
 *
 * @param {Object} data Object containing create cut lines value
 */
export let createCutLines = function( data ) {
    viewerSecondaryModelSvc.setGlobalCutLines( _getCurrentViewerCtxNamespace(), data.dbValue[ 0 ].isChecked );
};

/**
 * Sets whether the Cut Lines status of the cross section
 *
 * @param {String} viewerCtxNamespace viewer context
 * @param {String} sectionId section id
 * @param {Object} cutLinesState Clipset to be updated
 */
export let showCutLinesPerSection = function( viewerCtxNamespace, sectionId, cutLinesState ) {
    if( !sectionId || _sectionSelectionInProgress ) {
        return;
    }
    let viewerCtxNS = null;
    if( viewerCtxNamespace ) {
        viewerCtxNS = viewerCtxNamespace;
    } else {
        viewerCtxNS = _getCurrentViewerCtxNamespace();
    }
    viewerSecondaryModelSvc.setCutLines( viewerCtxNS, cutLinesState, sectionId );
    viewerSecondaryModelSvc.setGlobalCutLines( viewerCtxNS, cutLinesState );
};

/**
 * Sets the offset value
 *
 * @param {Number} newOffsetVal new offset value
 */
export let setOffsetPropertyValue = function( newOffsetVal ) {
    return newOffsetVal;
};

/**
 * Sets the offset value on slider
 *
 * @param {Number} newOffsetVal new offset value
 */
export let setOffsetSliderPropertyValue = function( newOffsetVal ) {
    return newOffsetVal;
};

/**
 * Section edit panel details
 * @param {Object} data data object
 * @returns {Promise} A promise that is resolved with properties value
 */
export let updateEditSectionDetails = function( data ) {
    let sectionToggleData = data.sectionToggle;
    let offsetPropData = data.offsetProp;
    let sectionPlaneData = data.sectionPlane;
    let clipStateData = data.clipState;
    let sectionProps = data.normalSectionProps;
    let cutLineProp = data.cutLineProp;
    let sectionPanelOffsetSliderProp = data.sectionPanelOffsetSliderProp;
    let minValue = 0;
    let maxValue = 0;
    let finalErrorMessage = '';

    if( data.dataProviders.sectionsDataProvider.selectedObjects.length > 0 ) {
        let editSectionData = data.dataProviders.sectionsDataProvider.selectedObjects[ 0 ];
        if( editSectionData.sectionPlaneNamesProp.length > 3 ) {
            sectionProps = data.customSectionProps;
        } else {
            sectionProps = data.normalSectionProps;
        }
        cutLineProp.dbValue = editSectionData.sectionCutLinesState;
        sectionToggleData.dbValue = editSectionData.isSectionVisible;
        sectionPlaneData.dbValue = editSectionData
            .sectionPlaneSelectionIdProp.toString();
        sectionPlaneData.dispValue = editSectionData.sectionPlaneLabel;
        sectionPlaneData.uiValue = editSectionData.sectionPlaneLabel;
        if( Array.isArray( sectionPlaneData.newDisplayValues ) && sectionPlaneData.newDisplayValues.length > 0 ) {
            sectionPlaneData.newDisplayValues = null;
        }
        clipStateData
            .dbValue = editSectionData.sectionClipState.toString();
        clipStateData.dispValue = editSectionData.sectionClipStateList[ editSectionData.sectionClipState ];
        clipStateData.uiValue =
            editSectionData.sectionClipStateList[ editSectionData.sectionClipState ];
        offsetPropData.dbValue = Number( editSectionData.offsetValue );

        minValue = editSectionData.offsetMinValue;
        maxValue = editSectionData.offsetMaxValue;
        sectionPanelOffsetSliderProp.dbValue[ 0 ].sliderOption.min = minValue;
        sectionPanelOffsetSliderProp
            .dbValue[ 0 ].sliderOption.max = maxValue;
        sectionPanelOffsetSliderProp.dbValue[ 0 ].sliderOption.step = ( maxValue - minValue ) / 50;
        sectionPanelOffsetSliderProp.dbValue[ 0 ].sliderOption
            .value = editSectionData.offsetValue;

        let resource = app.getBaseUrlPath() + '/i18n/GeometricAnalysisMessages';
        let localTextBundle = localeSvc.getLoadedText( resource );
        finalErrorMessage = localTextBundle.getInvalidEditboxValueWarning;
        finalErrorMessage = finalErrorMessage.replace( '{0}',
            minValue );
        finalErrorMessage = finalErrorMessage.replace( '{1}', maxValue );
    }

    AwTimeoutService.instance( function() {
        eventBus.publish( 'geoanalysis.showEditSectionSlider', {} );
    }, 1000 );

    return {
        sectionProps: sectionProps,
        cutLineProp: cutLineProp,
        sectionPanelOffsetSliderProp: sectionPanelOffsetSliderProp,
        sectionToggleData: sectionToggleData,
        sectionPlaneData: sectionPlaneData,
        clipStateData: clipStateData,
        offsetPropData: offsetPropData,
        minValue: Number( minValue ),
        maxValue: Number( maxValue ),
        finalErrorMessage: String( finalErrorMessage )
    };
};

/**
 * Set section offset value
 *
 * @param {String} viewerCtxNS viewer context
 * @param {String} sectionId section id
 * @param {String} newValue new value
 */
var _setSectionOffsetValue = function( viewerCtxNS, sectionId, newValue ) {
    viewerSecondaryModelSvc.setSectionOffsetValue( viewerCtxNS, sectionId, newValue ).then( () => {
        _notifySectionListUpdated();
    } );
};

/**
 * Select the passed section
 *
 * @param {String} viewerCtxNS viewer context
 * @param {String} sectionId section id
 */
var selectSection = function( viewerCtxNS, sectionId ) {
    var deferred = AwPromiseService.instance.defer();
    if( _.isNull( sectionId ) ) {
        viewerSecondaryModelSvc.setSectionSelection( viewerCtxNS, _currentSectionSelectionId[ viewerCtxNS ], false );
        _currentSectionSelectionId[ viewerCtxNS ] = null;
        deferred.resolve();
        return deferred.promise;
    } else if( _.isEqual( parseInt( sectionId ), parseInt( _currentSectionSelectionId[ viewerCtxNS ] ) ) ) {
        deferred.resolve();
        return deferred.promise;
    }
    if( !_sectionSelectionInProgress ) {
        _sectionSelectionInProgress = true;
        _sectionIdToBeProcessedForSelection[ viewerCtxNS ] = null;
        if( !_.isNull( _currentSectionSelectionId[ viewerCtxNS ] ) ) {
            let deSelectSectionPromise = viewerSecondaryModelSvc.setSectionSelection(
                viewerCtxNS, _currentSectionSelectionId[ viewerCtxNS ], false );
            deSelectSectionPromise.then( function() {
                let selectSectionPromise = viewerSecondaryModelSvc.setSectionSelection(
                    viewerCtxNS, sectionId, true );
                selectSectionPromise.then( function() {
                    _currentSectionSelectionId[ viewerCtxNS ] = sectionId;
                    AwTimeoutService.instance( function() {
                        _sectionSelectionInProgress = false;
                    }, 1000 );
                    if( _.isNull( _sectionIdToBeProcessedForSelection[ viewerCtxNS ] ) ) {
                        _notifySectionListUpdated();
                    } else {
                        selectSection( viewerCtxNS, _sectionIdToBeProcessedForSelection[ viewerCtxNS ] );
                    }
                    deferred.resolve();
                } );
            } ).catch( ( error ) => {
                deferred.reject( error );
            } );
        } else {
            let selectSectionPromise = viewerSecondaryModelSvc.setSectionSelection( viewerCtxNS, sectionId, true );
            selectSectionPromise.then( function() {
                _currentSectionSelectionId[ viewerCtxNS ] = sectionId;
                AwTimeoutService.instance( function() {
                    _sectionSelectionInProgress = false;
                }, 1000 );
                if( _.isNull( _sectionIdToBeProcessedForSelection[ viewerCtxNS ] ) ) {
                    _notifySectionListUpdated();
                } else {
                    selectSection( viewerCtxNS, _sectionIdToBeProcessedForSelection[ viewerCtxNS ] );
                }
                deferred.resolve();
            } ).catch( ( error ) => {
                deferred.reject( error );
            } );
        }
    } else {
        _sectionIdToBeProcessedForSelection[ viewerCtxNS ] = sectionId;
        deferred.resolve();
    }
    return deferred.promise;
};

/**
 * Move section offset value
 *
 * @param {String} viewerCtxNS viewer context
 * @param {String} sectionId section id
 * @param {String} newValue new value
 */
var _moveSectionOffsetValue = function( viewerCtxNS, sectionId, newValue ) {
    viewerSecondaryModelSvc.moveSection( viewerCtxNS, sectionId, newValue );
};

/**
 * Set offset value
 */
var _notifySectionOffsetUpdated = function( newValue ) {
    eventBus.publish( 'geoanalysis.sectionOffsetUpdated', { newValue: newValue } );
};

/**
 * Set slider value
 */
var _notifySectionOffsetSliderUpdated = function( newValue ) {
    eventBus.publish( 'geoanalysis.sectionOffsetSliderUpdated', { newValue: newValue } );
};

/**
 * Reset ignore section offset
 */
var _resetIgnoreSectionOffset = function() {
    eventBus.publish( 'geoanalysis.resetIgnoreSectionOffset', {} );
};

/**
 * Reset ignore section offset
 */
var _resetIgnoreSectionSliderOffset = function() {
    eventBus.publish( 'geoanalysis.resetIgnoreSectionSliderOffset', {} );
};

/**
 * Notify to select edited
 */
var _notifySectionListUpdated = function() {
    eventBus.publish( 'geoanalysis.sectionsListUpdated', {} );
};

/**
 * Get viewer context
 */
var _getCurrentViewerCtxNamespace = function() {
    return appCtxSvc.getCtx( 'viewer.activeViewerCommandCtx' );
};

/**
 * Get caps value
 */
var updateCapsValue = function( capsValue ) {
    viewerSecondaryModelSvc.setCapping( _getCurrentViewerCtxNamespace(), _showCapsAndLines );
    capsValue.dbValue = _showCapsAndLines;
};

/**
 * Is valid input section offset value
 *
 * @param {Number} newValue new offset value
 * @param {Number} minValue minimum offset value
 * @param {Number} maxValue maximum offset value
 */
export let isValidInputSectionValue = function( newValue, minValue, maxValue ) {
    return minValue <= newValue && newValue <= maxValue;
};

/**
 * Is valid input section offset value
 *
 * @param {Object} offsetProp new offset value
 * @param {String} errorMessage minimum offset value
 * @param {Boolean} isValidOffset boolean indicating if offset value is valid
 */
export let setOffsetPropValidationMessage = function( offsetProp, errorMessage, isValidOffset ) {
    offsetProp.validationCriteria = [];
    if( isValidOffset ) {
        offsetProp.validationCriteria[ 0 ] = '';
    } else {
        offsetProp.validationCriteria[ 0 ] = errorMessage;
    }
    return offsetProp;
};

/**
 * Show edit section slider
 */
export let showEditSectionSlider = function() {
    return true;
};

/**
 * Cleanup geoanalysis sections
 */
export let cleanupGeoAnalysisSectionPanel = function() {
    let viewerCtx = appCtxSvc.getCtx( _getCurrentViewerCtxNamespace() );
    delete viewerCtx.geoAnalysisSection;
    appCtxSvc.updateCtx( _getCurrentViewerCtxNamespace(), viewerCtx );
    if( eventSectionCreationUsingEntitiesSubscribed !== null ) {
        eventBus.unsubscribe( eventSectionCreationUsingEntitiesSubscribed );
        eventSectionCreationUsingEntitiesSubscribed = null;
    }
};

/**
 * Send notification for validation message
 *
 * @param {String} viewerCtxNS viewer context
 * @param {Boolean} isValid viewer context
 */
var _notifySectionOffsetValidation = function( viewerCtxNS, isValid ) {
    eventBus.publish( 'geoanalysis.offsetValueValidation', { viewerCtxNamespace: viewerCtxNS, isValid: isValid } );
};
var timeout = null;
/**
 * Update value from section plane position change
 * @param {string} data offset value
 */
export let sectionPlanePositionChange = function( data ) {
    if( !_.isNull( timeout ) ) {
        AwTimeoutService.instance.cancel( timeout );
    }
    timeout = AwTimeoutService.instance( function() {
        _notifySectionOffsetUpdated( data );
        timeout = null;
    }, 500 );
};

/**
 * Reset ignore section offset
 * @returns {Boolean} reset flag
 */
export let resetIgnoreSectionOffset = function() {
    return false;
};

export default exports = {
    geometricAnalysisSectionPanelRevealed,
    getAllSectionsData,
    sliderValueChanged,
    sliderValueMoving,
    createViewerSection,
    enterSectionCreationModeUsingEntities,
    modifySection,
    handleSectionSelectionChangeEvent,
    deleteAllSections,
    deleteSelectedSection,
    deleteSelectedSectionAction,
    setSectionOffsetEditingStarted,
    setSectionOffsetEditingFinished,
    clearDeleteSectionContext,
    showCapsAndCutLinesChanged,
    sectionOffsetUpdated,
    sectionVisibilityUpdated,
    setShowCapsAndEdgesAction,
    updateClipState,
    showCaps,
    createCutLines,
    showCutLinesPerSection,
    updateEditSectionDetails,
    setOffsetPropertyValue,
    setOffsetSliderPropertyValue,
    isValidInputSectionValue,
    setOffsetPropValidationMessage,
    loadSectionCellDetails,
    cleanUpEditPanelData,
    showEditSectionSlider,
    cleanupGeoAnalysisSectionPanel,
    sectionPlanePositionChange,
    resetIgnoreSectionOffset
};
/**
 * @member Awv0GeometricAnalysisSectionService
 * @memberof NgServices
 */
app.factory( 'Awv0GeometricAnalysisSectionService', () => exports );

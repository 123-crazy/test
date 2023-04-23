// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Cm1RevertMergeUtils
 */
import app from 'app';

import appCtxService from 'js/appCtxService';
import localeSvc from 'js/localeService';
import AwPromiseService from 'js/awPromiseService';
import LocationNavigationService from 'js/locationNavigation.service';
import cdmSvc from 'soa/kernel/clientDataModel';
import dataManagementService from 'soa/dataManagementService';
import occurrenceManagementServiceManager from 'js/occurrenceManagementServiceManager';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import AwStateService from 'js/awStateService';
import ctxStateMgmtService from 'js/contextStateMgmtService';
import aceStructureConfigurationService from 'js/aceStructureConfigurationService';
import viewModelObjectService from 'js/viewModelObjectService';

var exports = {};
let _contentUnloadedListener = null;
let _eventSubDefs = [];
let urlParamsMap = {
    rootQueryParamKey: 'uid',
    selectionQueryParamKey: 'c_uid',
    openStructureQueryParamKey: 'o_uid',
    productContextQueryParamKey: 'pci_uid',
    csidQueryParamKey: 'c_csid',
    secondaryPageIdQueryParamKey: 'spageId',
    topElementQueryParamKey: 't_uid',
    pageIdQueryParamKey: 'pageId',
    recipeParamKey: 'recipe',
    subsetFilterParamKey: 'filter',
    contextOverride: 'incontext_uid'
};
var _TRUE = [ 'true' ];

export let getInputForRevert = function(  ) {
    let inputs = [];
    let selectedVmo =  appCtxService.ctx.selected;

    // If selection is from ACE
    if( selectedVmo.modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ) {
        for( var selCount = 0; selCount < appCtxService.ctx.mselected.length; selCount++ ) {
            let input = {
                selectedBOMLine: appCtxService.ctx.mselected[ selCount ].uid,
                selectedObject:  'AAAAAAAAAAAAAA',
                propertiesToRevert: [],
                secondarySelections : [],
                revertChildren : false
            };
            inputs.push( input );
        }
    } else {   // If selection is from secondary work area like object-set table

        var parentSelectionUid = '';
        var parentSelection  = appCtxService.ctx.pselected;
        if( parentSelection.modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ){
            parentSelection = parentSelection.props.awb0UnderlyingObject;
            parentSelectionUid = parentSelection.dbValues[0];
        } else {
            parentSelectionUid = parentSelection.uid;
        }

        let secSelections = [];
        let relationName = '';
        if( appCtxService.ctx.relationContext && appCtxService.ctx.relationContext.relationInfo && appCtxService.ctx.relationContext.relationInfo.length > 0 ) {
            relationName = appCtxService.ctx.relationContext.relationInfo[0].relationType;
            for( var selCount = 0; selCount < appCtxService.ctx.relationContext.relationInfo.length; selCount++ ) {
                if( parentSelectionUid === appCtxService.ctx.relationContext.relationInfo[ selCount ].secondaryObject.uid ){ //handle S2P
                    secSelections.push( appCtxService.ctx.relationContext.relationInfo[ selCount ].primaryObject.uid );
                } else{
                    secSelections.push( appCtxService.ctx.relationContext.relationInfo[ selCount ].secondaryObject.uid );
                }

            }
        }

        var input  = {
            selectedBOMLine: 'AAAAAAAAAAAAAA',
            selectedObject:  parentSelectionUid,
            propertiesToRevert: [ relationName ],
            secondarySelections : secSelections,
            revertChildren : false
        };

        inputs.push( input );
    }

    return inputs;
};

export let createWarningParameterForRevert = function(  ) {
    let selectedObjects = [];
    let selectedVmo =  appCtxService.ctx.selected;
    if( selectedVmo.modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ) {
        for( var selCount = 0; selCount < appCtxService.ctx.mselected.length; selCount++ ) {
            selectedObjects.push( appCtxService.ctx.mselected[ selCount ] );
        }
    } else {
        selectedObjects.push( appCtxService.ctx.pselected );
    }

    var resource = 'ChangeMessages';
    var localTextBundle = localeSvc.getLoadedText( resource );

    var hasAdd = false;
    var hasRemove = false;
    var hasUpdate = false;
    var hasAttachement = false;
    var hasRevise = false;
    let warningText = '';
    if( selectedObjects && selectedObjects.length > 0 ) {
            for( var s = 0; s < selectedObjects.length; s++ ) {
                warningText += selectedObjects[ s ].props.object_string.uiValues[ 0 ];

                if( selectedVmo.modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ) {
                    let isReplaced = false;
                    let isRevise = false;
                    let updatedPropNames = selectedObjects[ s ].props.awb0MarkupPropertyNames.dbValues;
                    if( updatedPropNames && updatedPropNames.length > 0 ) {
                        for( var p = 0; p < updatedPropNames.length; p++ ) {
                            if( updatedPropNames[ p ] === 'awb0ArchetypeId' ) {
                                isReplaced = true;
                                break;
                            }
                        }
                        if( !isReplaced ){
                            for( var p = 0; p < updatedPropNames.length; p++ ) {
                                if( updatedPropNames[ p ] === 'awb0ArchetypeRevId' ) {
                                    isRevise = true;
                                    break;
                                }
                            }
                        }
                    }
                    let actionName = '';
                    let markupType = selectedObjects[ s ].props.awb0MarkupType.dbValues[ 0 ];
                    if( markupType === '128' ) { // Added line
                        actionName = localTextBundle.Cm1AddText;
                        hasAdd = true;
                    }
                    if( markupType === '144' ) { // Added with absolute occ property change line
                        actionName = localTextBundle.Cm1AddText;
                        hasAdd = true;
                    }
                    if( markupType === '2' ) { // Removed line
                        actionName = localTextBundle.Cm1RemoveText;
                        hasRemove = true;
                    }
                    if( markupType === '16' ) { // Property Change
                        if( isReplaced ) {
                            actionName = localTextBundle.Cm1ReplaceText; // If ID is different it's Replace Line
                        } else {
                            actionName = localTextBundle.Cm1PropertyChangeText;
                        }
                        hasUpdate = true;
                    }

                    if( isRevise ){
                        actionName = "Revise";
                        hasRevise = true;
                    }

                    warningText += ' - ' + actionName;
                    warningText += '\n';
                } else {
                    warningText += ' - ' + localTextBundle.Cm1AttachementText; // Revert from Object Set table
                    warningText += '\n';
                    hasAttachement = true;
                }
            }
        }

    return {
        revertErrorText : warningText,
        hasAddRevertOperation : hasAdd,
        hasRemoveRevertOperation : hasRemove,
        hasUpdateRevertOperation : hasUpdate,
        hasAttachementRevertOperation : hasAttachement,
        hasReviseOperation : hasRevise

    };

};

export let getInputForMerge = function(  ) {

    let selectedSourceLines = [];

    //Get the selected source lines
    for( var selCount = 0; selCount < appCtxService.ctx.mselected.length; selCount++ ) {
        let sourceLineUid = appCtxService.ctx.mselected[ selCount ].uid;
        selectedSourceLines.push(sourceLineUid);
    }

    //Populate input for SOA
    let input = {
        sourceLines: selectedSourceLines,
        targetLine:  appCtxService.ctx.occmgmtContext2.modelObject.uid,
        propertiesToMerge: [],
        mergeChildren : false
    };

    return input;
};

/**
 * Load Merge data before page launch
 *
 * @returns {Promise} Promise after data load is done
 */
export let loadMergeData = function( params ) {
    let defer = AwPromiseService.instance.defer();

    appCtxService.ctx.taskUI = {};

    localeSvc.getLocalizedText( 'ChangeMessages', 'Cm1MergeViewTitle' ).then( function( result ) {
        appCtxService.ctx.taskUI.moduleTitle = result;
    } );

    localeSvc.getLocalizedText( 'ChangeMessages', 'Cm1MergeViewTitle' ).then( function( result ) {
        appCtxService.ctx.taskUI.taskTitle = result;
    } );

    appCtxService.updatePartialCtx( 'splitView.mode', true );
    appCtxService.updatePartialCtx( 'splitView.viewKeys', [ 'occmgmtContext', 'occmgmtContext2' ] );

    appCtxService.ctx.skipAutoBookmark = true;
    appCtxService.ctx.hideRightWall = true;
    occurrenceManagementServiceManager.initializeOccMgmtServices();
    _registerListeners();

    let uidForLoadObject = [];
    let stateParams = appCtxService.getCtx( 'state.params' );
    if( stateParams ) {
        let sourceUID = stateParams.src_uid ? stateParams.src_uid : stateParams.uid;
        uidForLoadObject.push( sourceUID );

        let targetUID = stateParams.trg_uid ? stateParams.trg_uid : stateParams.uid2;
        uidForLoadObject.push( sourceUID );
    }

    let objectCount = uidForLoadObject.length;
    dataManagementService.loadObjects( uidForLoadObject ).then( function() {
        let viewModelObjects = [];
        for( let i = 0; i < objectCount; i++ ) {
            let modelObject = cdmSvc.getObject( uidForLoadObject[ i ] );
            viewModelObjects.push( modelObject );
        }

        if( objectCount === 2 ) {
            appCtxService.updatePartialCtx('mergeChangesCtx.srcStructure', viewModelObjects[ 0 ] );
            appCtxService.updatePartialCtx( 'mergeChangesCtx.trgStructure', viewModelObjects[ 1 ] );
            appCtxService.updatePartialCtx( 'modelObjectsToOpen', viewModelObjects);
        }

        defer.resolve();
    } );

    return defer.promise;
};

/**
 * Unregister listeners
 */
let _unRegisterListeners = function() {
    if( _contentUnloadedListener ) {
        eventBus.unsubscribe( _contentUnloadedListener );
        _contentUnloadedListener = null;
    }
};


/**
 * Register listeners
 */
let _registerListeners = function() {
    // Register Page Unload listener
    if( !_contentUnloadedListener ) {
        _contentUnloadedListener = eventBus.subscribe( 'Cm1MergeChanges.contentUnloaded', _cleanupMergeChangesariableFromCtx, 'Cm1RevertMergeUtils' );
    }
};

/**
 * Clean up ACE context
 */
let _cleanupMergeChangesariableFromCtx = function() {
    appCtxService.unRegisterCtx( 'modelObjectsToOpen' );
    let mergeViewKeys = appCtxService.getCtx( 'splitView.viewKeys' );
    _.forEach( mergeViewKeys, function( mergeViewKey ) {
        appCtxService.unRegisterCtx( mergeViewKey );
    } );
    appCtxService.unRegisterCtx( 'splitView' );
    appCtxService.unRegisterCtx( 'taskUI' );
    appCtxService.unRegisterCtx( 'mergeChangesCtx' );
    appCtxService.unRegisterCtx( 'aceActiveContext' );
    appCtxService.updateCtx( 'hideRightWall', undefined );
    _unRegisterListeners();
    occurrenceManagementServiceManager.destroyOccMgmtServices();
};

/**
 * Get request preference object
 *
 * @param {object} provider - provider/subPanelContext object
 * @returns {object} - Request preference object
 */
let _getRequestPrefObject = function( provider ) {
    let requestPref = appCtxService.ctx.requestPref ? appCtxService.ctx.requestPref : {
        savedSessionMode: 'ignore'
    };

    if( provider.openMode ) {
        requestPref.openWPMode = provider.openMode;
    }

    requestPref.showChange =_TRUE;
    requestPref.savedSessionMode = 'ignore';

    return requestPref;
};

/**
 * Set expansion state of context
 *
 * @param {string} contextKey - context key
 */
let _setExpansionState = function( contextKey ) {
    if( appCtxService.ctx.mergeChangesCtx.resetTreeExpansionState ) {
        appCtxService.ctx[ contextKey ].resetTreeExpansionState = true;
    }
};

/**
 * Update breadcrumb
 *
 * @param {object} eventData - Event data
 * @param {object} provider - provider/subPanelContext object
 */
let _updateBreadCrumbs = function( eventData, provider ) {
    if( eventData.lastSelectedObject ) {
        eventBus.publish( provider.breadcrumbConfig.vm + '.updateBreadCrumb', eventData );
    }
};


/**
 * Register context for Merge Changes BOM Panel
 *
 * @param {object} provider - provider/subPanelContext object
 */
let _registerContext = function( provider ) {
    let requestPref = _getRequestPrefObject( provider );
    appCtxService.registerCtx( 'requestPref', requestPref );
    let baseSelectionId = provider.baseSelection ? provider.baseSelection.uid : undefined;
    appCtxService.registerCtx( provider.viewKey, {
        currentState: {
            uid: baseSelectionId
        },
        previousState: {},
        requestPref: requestPref,
        transientRequestPref: {},
        modelObject: provider.baseSelection,
        readOnlyFeatures: {},
        urlParams: provider.urlParams,
        expansionCriteria: {},
        isRowSelected: false,
        supportedFeatures: [],
        columnsToExclude: provider.columnsToExclude
    } );
};

/**
 * Register ACE active context
 *
 * @param {string} contextKey - context key
 */
let _registerAceActiveContext = function( contextKey ) {
    appCtxService.registerCtx( 'aceActiveContext', {
        key: contextKey,
        context: appCtxService.ctx[ contextKey ]
    } );
};

/**
 * Method to update the sub panel context
 *
 * @param {object} data - Merge Changes BOM Panel View model
 */
let updateSubPanelContext = function updateSubPanelContext( data ) {
    if( appCtxService.ctx ) {
        data.contextInfo = {
            modelObject: appCtxService.ctx[ data.provider.viewKey ].modelObject,
            provider: data.provider
        };
        data.baseSelection = data.contextInfo.modelObject;
    }
};

/**
 * Update context state from URL
 *
 * @param {string} contextKey Key of context to update
 */
let _updateState = function( contextKey ) {
    let newState = {};
    let isStateChanged = false;
    let previousState = appCtxService.ctx[ contextKey ].previousState;

    let urlParamMapForCurrentContext = appCtxService.ctx[ contextKey ].urlParams;
    _.forEach( AwStateService.instance.params, function( value, parameter ) {
        if( _.values( urlParamMapForCurrentContext ).indexOf( parameter ) > -1 ) {
            let queryParam = _.invert( urlParamMapForCurrentContext )[ parameter ];
            let currentStateParam = urlParamsMap[ queryParam ];
            newState[ currentStateParam ] = value;
            isStateChanged = isStateChanged ? true : ( AwStateService.instance.params[ parameter ] || previousState[ currentStateParam ] ) &&
                AwStateService.instance.params[ parameter ] !== previousState[ currentStateParam ];
        }
    } );

    _setExpansionState( contextKey );

    if( isStateChanged ) {
        if( newState.uid !== appCtxService.ctx[ contextKey ].currentState.uid ) {
            //Silently update State as this use case will be handled by show object controller.
            appCtxService.ctx[ contextKey ].currentState = newState;
        } else {
            ctxStateMgmtService.updateContextState( contextKey, newState, false );
        }
    }
};

/**
 * Register occDataLoadedEvent event
 *
 * @param {object} data Merge Changes BOM Panel view model
 */
let _registerOccDataLoadedEvent = function( data ) {
    let mergeChangesBomPanelOccDataLoadedSubDef = eventBus.subscribe( 'occDataLoadedEvent', function( eventData ) {
        if( eventData && eventData.contextKey && eventData.contextKey === data.contextKey ) {
            updateSubPanelContext( data );
            _updateBreadCrumbs( eventData = {
                id: eventData.contextKey,
                lastSelectedObject: eventData.context
            }, data.provider );
        }
    } );
    _eventSubDefs.push( mergeChangesBomPanelOccDataLoadedSubDef );
};

/**
 * Register register event listerner
 *
 * @param {object} data Merge Change BOM Panel view model
 */
let _registerEventListeners = function( data ) {
    _registerOccDataLoadedEvent( data );
};
/**
 * Initialize MergeChanges Panel
 *
 * @param {object} subPanelContext - panel data
 * @param {object} data - Declarative data
 */
export let initializeMergeChangesPanel = function( subPanelContext, data ) {
    data.provider = subPanelContext;
    data.contextKey = data.provider.viewKey;
    _registerContext( data.provider );
    _registerAceActiveContext( data.contextKey );
    _registerEventListeners( data );
    _updateState( data.contextKey );
    var vmo = viewModelObjectService.createViewModelObject(data.provider.baseSelection.uid );
    data.vmo = vmo;
};

/**
 * Cleanup registration done by MergeChanges
 */
export let cleanupMergeChangesPanel = function() {
    _.forEach( _eventSubDefs, function( eventSubDef ) {
        eventBus.unsubscribe( eventSubDef );
    } );
    _eventSubDefs.length = 0;
};


export let initializeAceConfigHeader = function( data ) {
    aceStructureConfigurationService.populateContextKey( data );
    var vmo = viewModelObjectService.createViewModelObject( appCtxService.ctx[data.viewKey].openedElement.props.awb0UnderlyingObject.dbValues[ 0 ] );
    data.vmo = vmo;
};

/**
 * Revert redline utility functions
 * @param {appCtxService} appCtxService - Service to use
 * @param {localeSvc} occmgmtUtils - Service to use
 */

export default exports = {
    createWarningParameterForRevert,
    getInputForRevert,
    getInputForMerge,
    loadMergeData,
    initializeMergeChangesPanel,
    cleanupMergeChangesPanel,
    initializeAceConfigHeader
};
/**
 * @member Cm1RevertMergeUtils
 * @memberof NgServices
 */
app.factory( 'Cm1RevertMergeUtils', () => exports );

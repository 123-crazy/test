// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * Service for cbaBomPanel view.
 * @module js/CbaBomPanelService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import AwStateService from 'js/awStateService';
import ctxStateMgmtService from 'js/contextStateMgmtService';
import CBAImpactAnalysisService from 'js/CBAImpactAnalysisService';
import CadBomOccurrenceAlignmentUtil from 'js/CadBomOccurrenceAlignmentUtil';

let exports = {};
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

/**
 * Get request preference object
 *
 * @param {object} provider - provider/subPanelContext object
 * @returns {object} - Request preference object
 */
let _getRequestPrefObject = function( provider ) {
    let requestPref = appCtxSvc.ctx.requestPref ? _.clone( appCtxSvc.ctx.requestPref ) : {
        savedSessionMode: 'ignore'
    };

    if( provider.openMode ) {
        requestPref.openWPMode = provider.openMode;
    }
    // Check whether the CBA page is launched through a change
    if( CBAImpactAnalysisService.isImpactAnalysisMode() && CBAImpactAnalysisService.shouldShowRedlinesInIA( provider ) ) {
        // LCS-455624 Enable redlining only for the source strucutre which is associated to ECN context.
        // No Show change in request preference => redline is enabled by default if the context top item is associated with ECN
        // Show change = false in reuqest preference => redline is not enabled even if the context top item is associated with ECN
        // Show change = true in request preference => redline is enabled even if the context top item is associated with closed ECN
        requestPref.showChange = [ 'true' ];
    } else {
        // For the the target structure which is yet to be updated; redline should not be enabled
        // So explicity pass show chnage = false in request preference
        requestPref.showChange = [ 'false' ];
    }
    return requestPref;
};

/**
 * Set default display view mode
 *
 * @param {object} provider - provider/subPanelContext object
 */
let _setDefaultDisplayMode = function( provider ) {
    let cbaViewModePrefValue = appCtxSvc.getCtx( 'preferences.AW_SubLocation_CBASublocation_ViewMode' );
    provider.defaultDisplayMode = cbaViewModePrefValue ? cbaViewModePrefValue[ 0 ] : provider.defaultDisplayMode;
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
 * Set expansion state of context
 *
 * @param {string} contextKey - context key
 */
let _setExpansionState = function( contextKey ) {
    if( appCtxSvc.ctx.cbaContext.resetTreeExpansionState ) {
        appCtxSvc.ctx[ contextKey ].resetTreeExpansionState = true;
    }
};

/**
 * Register context for CBA BOM Panel
 *
 * @param {object} provider - provider/subPanelContext object
 */
let _registerContext = function( provider ) {
    let requestPref = _getRequestPrefObject( provider );
    appCtxSvc.registerCtx( 'requestPref', requestPref );
    let baseSelectionId = provider.baseSelection ? provider.baseSelection.uid : undefined;
    if( CBAImpactAnalysisService.isImpactAnalysisMode() ) {
        provider.columnsToExclude = CBAImpactAnalysisService.filterColumnsToExclude( provider );
    }
    appCtxSvc.registerCtx( provider.viewKey, {
        currentState: {},
        previousState: {},
        requestPref: requestPref,
        modelObject: provider.baseSelection,
        readOnlyFeatures: {},
        urlParams: provider.urlParams,
        expansionCriteria: {},
        isRowSelected: false,
        supportedFeatures: [],
        columnsToExclude: provider.columnsToExclude,
        transientRequestPref: {
            startFreshNavigation:true
        },
        persistentRequestPref: {
            showExplodedLines:false
        }
    } );
};

/**
 * Register ACE active context
 *
 * @param {string} contextKey - context key
 */
let _registerAceActiveContext = function( contextKey ) {
    appCtxSvc.registerCtx( 'aceActiveContext', {
        key: contextKey,
        context: appCtxSvc.ctx[ contextKey ]
    } );
};

/**
 * Method to update the sub panel context
 *
 * @param {object} data - CBA BOM Panel View model
 */
let updateSubPanelContext = function updateSubPanelContext( data ) {
    if( appCtxSvc.ctx ) {
        data.contextInfo = {
            modelObject: appCtxSvc.ctx[ data.provider.viewKey ].modelObject,
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
    let previousState = appCtxSvc.ctx[ contextKey ].previousState;

    let urlParamMapForCurrentContext = appCtxSvc.ctx[ contextKey ].urlParams;
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
        if( newState.uid !== appCtxSvc.ctx[ contextKey ].currentState.uid ) {
            //Silently update State as this use case will be handled by show object controller.
            appCtxSvc.ctx[ contextKey ].currentState = newState;
        } else {
            ctxStateMgmtService.updateContextState( contextKey, newState, false );
        }
    }
};

/**
 * Register occDataLoadedEvent event
 *
 * @param {object} data CBA BOM Panel view model
 */
let _registerOccDataLoadedEvent = function( data ) {
    let cbaBomPanelOccDataLoadedSubDef = eventBus.subscribe( 'occDataLoadedEvent', function( eventData ) {
        if( eventData && eventData.contextKey && eventData.contextKey === data.contextKey ) {
            updateSubPanelContext( data );
            _updateBreadCrumbs( eventData = {
                id: eventData.contextKey,
                lastSelectedObject: eventData.context
            }, data.provider );
        }
    } );
    _eventSubDefs.push( cbaBomPanelOccDataLoadedSubDef );
};

/**
 * Register breadcrumb config view model refresh event
 *
 * @param {object} data CBA BOM Panel view model
 */
let _registerBreadcrumbConfigVMRefreshEvent = function( data ) {
    let eventTopic = data.provider.breadcrumbConfig.vm + '.refresh';
    let breadcrumbConfigVMRefreshSubDef = eventBus.subscribe( eventTopic, function( eventData ) {
        if( eventData.lastSelectedObject ) {
            _updateBreadCrumbs( eventData, data.provider );
        } else {
            if( data.ctx && data.ctx[ data.provider.viewKey ].modelObject ) {
                _updateBreadCrumbs( eventData = {
                    id: data.provider.viewKey,
                    lastSelectedObject: data.ctx[ data.provider.viewKey ].modelObject
                }, data.provider );
            }
        }
    } );
    _eventSubDefs.push( breadcrumbConfigVMRefreshSubDef );
};

/**
 * Register register event listerner
 *
 * @param {object} data CBA BOM Panel view model
 */
let _registerEventListeners = function( data ) {
    _registerOccDataLoadedEvent( data );
    _registerBreadcrumbConfigVMRefreshEvent( data );
};

/**
 * Initialize cbaBomPanel
 *
 * @param {object} subPanelContext - panel data
 * @param {object} data - Declarative data
 */
export let initializeCbaBomPanel = function( subPanelContext, data ) {
    data.provider = subPanelContext;
    data.contextKey = data.provider.viewKey;
    _setDefaultDisplayMode( data.provider );
    _registerContext( data.provider );
    _registerAceActiveContext( data.contextKey );
    _registerEventListeners( data );
    _updateState( data.contextKey );

    CadBomOccurrenceAlignmentUtil.registerSplitViewMode();
};

/**
 * Cleanup registration done by cbaBomPanel
 */
export let cleanupCbaBomPanel = function() {
    _.forEach( _eventSubDefs, function( eventSubDef ) {
        eventBus.unsubscribe( eventSubDef );
    } );
    _eventSubDefs.length = 0;
};

export default exports = {
    initializeCbaBomPanel,
    cleanupCbaBomPanel
};
app.factory( 'CbaBomPanelService', () => exports );

//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * Service responsible for managing BWC state and local storage expansion
 *
 * @module js/aceRestoreBWCStateService
 */

import app from 'app';
import appCtxService from 'js/appCtxService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import awTableStateService from 'js/awTableStateService';
import dateTimeService from 'js/dateTimeService';
import localeService from 'js/localeService';
import occmgmtUtils from 'js/occmgmtUtils';
import soaSvc from 'soa/kernel/soaService';

var exports = {};

var _commandLogListener = null;
var _appCtxUpdateListener = null;
var _swcCreateListener = null;
var _signoutListener = null;
var _configChangeListener = null;
var _inlineAuthListener = null;
var nullDate = '0001-01-01T00:00:00+00:00';
const INTERACTED_PRODUCT_UIDS = 'interactedProductUids';
var _invalidCommandsForInteraction = [];

// Populate all the commands which are not considered valid for interaction.
_populateInvalidCommandsForInteraction();

/**
 * Initializes restoreBWCState service.
 */
export let initialize = function() {
    // Subscribe to aw-command-logEvent event
    if( !_commandLogListener ) {
        _commandLogListener = eventBus.subscribe( 'aw-command-logEvent', function( eventData ) {
            if( appCtxService.ctx.aceActiveContext ) {
                if( appCtxService.ctx.aceActiveContext.context.currentState && isProductInteracted( appCtxService.ctx.aceActiveContext.context.currentState.uid ) ) {
                    return;
                }

                //Check if command is not valid for interaction. Return from here.
                if( _invalidCommandsForInteraction.includes( eventData.sanCommandId ) ) {
                    return;
                }

                // Reset command clear the bookmark and expansion state.
                // No need to fire interaction event. Else it will do the same thing again.
                if( eventData.sanCommandId === 'Awb0ResetStructure' ) {
                    _addInteractedProductToSessionStorage( appCtxService.ctx.aceActiveContext.context.currentState.uid );
                    return;
                }
                eventBus.publish( 'occMgmt.interaction' );
            }
        } );
    }

    if( !_appCtxUpdateListener ) {
        _appCtxUpdateListener = eventBus.subscribe( 'appCtx.update', function( context ) {
            if( appCtxService.ctx.aceActiveContext && ( context.name === 'aceActiveContext' || context.name === 'occmgmtContext' ) && ( context.target === 'activeTab' &&
                appCtxService.ctx.aceActiveContext.context.activeTab ) && !isProductInteracted( appCtxService.ctx.aceActiveContext.context.currentState.uid ) ) {
                eventBus.publish( 'occMgmt.interaction' );
            }
        } );
    }

    if( !_configChangeListener ) {
        _configChangeListener =  eventBus.subscribe( 'configurationChangeStarted', function() {
            if( appCtxService.ctx.aceActiveContext && !isProductInteracted( appCtxService.ctx.aceActiveContext.context.currentState.uid ) ) {
                eventBus.publish( 'occMgmt.interaction' );
            }
        } );
    }

    if( !_swcCreateListener ) {
        _swcCreateListener = eventBus.subscribe( 'swc.objectCreated', function( eventData ) {
            if( appCtxService.ctx.aceActiveContext && eventData.createdObject && !isProductInteracted( eventData.createdObject.uid ) ) {
                _addInteractedProductToSessionStorage( eventData.createdObject.uid );
                appCtxService.ctx.swcCreatedObjectUid = eventData.createdObject.uid;
            }
        } );
    }

    if( !_signoutListener ) {
        _signoutListener = eventBus.subscribe( 'session.signOut', function() {
            if( appCtxService.ctx.aceActiveContext ) {
                appCtxService.ctx.aceActiveContext.signoutInProgress = true;
            }
        } );
    }

    if( !_inlineAuthListener ) {
        _inlineAuthListener = eventBus.subscribe( 'occTreeTable.cellStartEdit', function( eventData ) {
            if( appCtxService.ctx.aceActiveContext && !isProductInteracted( appCtxService.ctx.aceActiveContext.context.currentState.uid ) ) {
                eventBus.publish( 'occMgmt.interaction' );
            }
        } );
    }
};

export let destroy = function() {
    if( _commandLogListener ) {
        eventBus.unsubscribe( _commandLogListener );
        _commandLogListener = null;
    }
    if( _appCtxUpdateListener ) {
        eventBus.unsubscribe( _appCtxUpdateListener );
        _appCtxUpdateListener = null;
    }
    if( _swcCreateListener ) {
        eventBus.unsubscribe( _swcCreateListener );
        _swcCreateListener = null;
    }
    if( _signoutListener ) {
        eventBus.unsubscribe( _signoutListener );
        _signoutListener = null;
    }
    if( _inlineAuthListener ) {
        eventBus.unsubscribe( _inlineAuthListener );
        _inlineAuthListener = null;
    }
    if( _configChangeListener ) {
        eventBus.unsubscribe( _configChangeListener );
        _configChangeListener = null;
    }
};

/** Invoke resetUserWorkingContext SOA
 * @param {*} contextKey - contextKey.
 */
export let resetUserWorkingContextState = function( contextKey ) {
    // reset the _current* variables to null first, so that they dont retain the values from last call.
    var contextState = {
        context: appCtxService.ctx[ contextKey ],
        key: contextKey
    };
    var productContext = occmgmtUtils.getObject( contextState.context.currentState.pci_uid );

    var soaInput = {
        inputData: {
            productContext: productContext,
            requestPref: {}
        }
    };

    soaSvc.postUnchecked( 'Internal-ActiveWorkspaceBom-2020-12-OccurrenceManagement', 'resetUserWorkingContextState', soaInput ).then( function( response ) {
        if( !_.isUndefined( response.requestPref ) && !_.isUndefined( response.requestPref.recipeReset ) && _.isEqual( response.requestPref.recipeReset[ 0 ], 'true' ) ) {
            if( !_.isUndefined( contextKey ) ) {
                appCtxService.ctx[ contextKey ].requestPref.recipeReset = 'true';
            }
        }
    }, function( error ) {
        throw soaSvc.createError( error );
    } );
};

/** Capture toggle tree node action (expand and collapse).
 * @param {Object} declViewModel - declViewModel.
 * @param {*} contextKey - contextKey.
 * @param {Object} eventData - eventData
 */
export let toggleTreeNode = function( declViewModel, contextKey, eventData ) {
    var contextState = {
        context: appCtxService.ctx[ contextKey ],
        key: contextKey
    };

    var skipAutoBookmark = typeof appCtxService.ctx.skipAutoBookmark === 'undefined' ? false : appCtxService.ctx.skipAutoBookmark;
    if( !skipAutoBookmark && !isProductInteracted( contextState.context.currentState.uid ) ) {
        // Add interacted product to session storage
        _executeProductInteraction( declViewModel, contextKey );

        // Clear local expansion state
        eventBus.publish( contextState.context.vmc.name + '.resetState' );

        // Invoke SOA to clear bookmark.
        resetUserWorkingContextState( contextKey );

        // Add expanded node to local storage
        if( eventData.isExpanded ) {
            var gridId = Object.keys( declViewModel.grids )[ 0 ];
            awTableStateService.saveRowExpanded( declViewModel, gridId, eventData );
        }
    }
};

/** Return true interaction happened for this product in a session. Except selection other action e.g. command intreaction, expand are
 * considered as interaction.
 * @param {*} uid - Product uid.
 * @return {*} return true jf product uid does not exist in session storage.
 */
export let isProductInteracted = function( uid ) {
    var isProductInteracted = true;
    var interactedProductUids = sessionStorage.getItem( INTERACTED_PRODUCT_UIDS );
    if( !interactedProductUids || interactedProductUids === 'null' || !interactedProductUids.includes( uid ) ) {
        isProductInteracted = false;
    }
    return isProductInteracted;
};

/** Return true interaction happened for this product and auto-bookmark exist for the product.
 * @param {TreeLoadInput} treeLoadInput TreeLoadInput
 * @param {*} treeLoadOutput - treeLoadOutput.
 * @param {*} uid - Product uid.
 * @return {*} return true or false
 */
export let isRestoreOptionApplicable = function( treeLoadInput, treeLoadOutput, uid ) {
    // Its not applicable for skipAutoBookmark cases like split view
    var skipAutoBookmark = typeof appCtxService.ctx.skipAutoBookmark === 'undefined' ? false : appCtxService.ctx.skipAutoBookmark;
    if( skipAutoBookmark ) {
        return false;
    }

    var autoSavedSessionDateTime = treeLoadOutput.autoSavedSessiontimeForRestoreOption;
    // Return true in both the condition are true
    // 1. isProductInteracted return false
    // 2. autoSavedSessiontime is not null date || its back button case
    if( !isProductInteracted( uid ) && ( autoSavedSessionDateTime && autoSavedSessionDateTime !== nullDate || _.isEqual( treeLoadInput.openOrUrlRefreshCase, 'backButton' ) ) ) {
        _formatRestoreMessageTime( autoSavedSessionDateTime );
        return true;
    }
    return false;
};

/** Add interacted product to session storage. Except selection other action e.g. command intreaction, expand are considered as
 *  interaction. Also set isProductInteracted = true which will hide the guidance message.
 * @param {Object} declViewModel - declViewModel.
 * @param {Object} uwDataProvider - uwDataProvider.
 * @param {*} contextKey - contextKey.
 */
export let processProductInteraction = function( declViewModel, uwDataProvider, contextKey ) {
    _executeProductInteraction( declViewModel, contextKey );
    // Clear local storage and auto-bookmark
    eventBus.publish( uwDataProvider.name + '.resetState' );

    // Invoke SOA to clear bookmark.
    resetUserWorkingContextState( contextKey );
    return false;
};

/**
 * Add product to session storage.
 * @param {Object} declViewModel - declViewModel
 * @param {TreeLoadInput} treeLoadInput - treeLoadInput.
 * @param {*} treeLoadOutput - treeLoadOutput.
 * @param {Object} uwDataProvider - data provider
 * @param {*} contextState - Context State
 *
 * * @return {*} return true or false
 */
export let addOpenedProductToSessionStorage = function( declViewModel, treeLoadInput, treeLoadOutput, uwDataProvider, contextState ) {
    // Restore feature should not be enabled in skipAutoBookmark
    var skipAutoBookmark = typeof appCtxService.ctx.skipAutoBookmark === 'undefined' ? false : appCtxService.ctx.skipAutoBookmark;
    var hasDuplicateData = occmgmtUtils.isFeatureSupported( treeLoadOutput.pciModelObject, 'Awb0HasCloneDataFeature' );

    // If product interaction happened already. No need to proceed further return from here.
    if( skipAutoBookmark || isProductInteracted( contextState.context.currentState.uid ) || hasDuplicateData ) {
        // If product has duplicate data associated. Add product to session storage.
        // Structure with duplicate data should always open in restore mode. Restore message should not come.
        if ( hasDuplicateData ) {
            _addInteractedProductToSessionStorage( contextState.context.currentState.uid );
        }

        return false;
    }

    // So far interaction has not happened. This should be a product reopen case. Unless it is not url refresh just return from here.
    if( !contextState.context.restoreProduct && treeLoadInput.openOrUrlRefreshCase && !_.isEqual( treeLoadInput.openOrUrlRefreshCase, 'urlRefresh' ) ) {
        return isRestoreOptionApplicable( treeLoadInput, treeLoadOutput, contextState.context.currentState.uid );
    }

    // Seems to be interaction case e.g. expand sub-assembly, reset, browser refresh, sorting.
    // Clear the expansion for scenarios like sorting, config change, url refresh
    var clearExpansion = true;
    var clearBookmark = true;

    // Dont clear the expansion in case of expand sub-assembly case
    if( !( treeLoadInput.sortCriteria && treeLoadInput.sortCriteria.length > 0 ) && _.isUndefined( treeLoadInput.openOrUrlRefreshCase ) &&
        _.isEmpty( contextState.context.configContext ) ) {
        clearExpansion = false;
    }

    // Dont clear the auto-bookmark in url refresh case. As it will get updated in getOcc call with current client state(default state).
    // Also same flow takes place in copy paste of URL where auto-bookmark should not be cleared out.
    if( _.isEqual( treeLoadInput.openOrUrlRefreshCase, 'urlRefresh' ) ) {
        clearBookmark = false;
    }

    if( contextState.context.restoreProduct ) {
        delete contextState.context.restoreProduct;
        clearExpansion = true;
        clearBookmark = false;
    }
    _executeProductInteraction( declViewModel, contextState.key );

    // Clear local storage and auto-bookmark
    if( clearExpansion ) {
        eventBus.publish( uwDataProvider.name + '.resetState' );
    }

    // Invoke SOA to clear bookmark.
    if( clearBookmark ) {
        resetUserWorkingContextState( contextState.key );
    }

    return false;
};

/**
 * Action for restore button on default open state message. Update the session storage with product uid as interacted product.
 * Invoke getOcc SOA as first time open case e.g. no PCI, no C_uid, default request pref
 * @param {*} contextKey - occmgmtContext
 */
export let restoreProduct = function( contextKey ) {
    var contextState = {
        context: appCtxService.ctx[ contextKey ],
        key: contextKey
    };
    var productUid = contextState.context.currentState.uid;

    // Clear appCtx
    contextState.context.currentState = {};
    contextState.context.requestPref = {};
    contextState.context.selectedModelObjects = {};

    // set startFreshNavigation = true, set productUid and savedSessionMode= 'restore'
    contextState.context.startFreshNavigation = true;
    contextState.context.requestPref.savedSessionMode = 'restore';
    contextState.context.currentState.uid = productUid;
    contextState.context.restoreProduct = true;
    eventBus.publish( 'acePwa.reset' );
};

/** Format autoSavedSessionDateTime to show date in 'Today' or 'Yesterday' or in date time format.
 *  @param {*} autoSavedSessionDateTime - autoSavedSessionDateTime.
 */
function _formatRestoreMessageTime( autoSavedSessionDateTime ) {
    // Get the difference from current date
    var currentDate = new Date();
    var autoSavedSessionDate = new Date( autoSavedSessionDateTime );
    var dateDiff = autoSavedSessionDate.getDate() - currentDate.getDate();

    // Format the date string as pe
    if( dateDiff === 0 || dateDiff === -1 ) {
        var resource = 'OccurrenceManagementConstants';
        var localeTextBundle = localeService.getLoadedText( resource );
        var autoSavedSessionTime = ', ' + dateTimeService.formatSessionTime( autoSavedSessionDateTime );
    }

    var defaultOpenStateMessageTime = '';
    if( dateDiff === 0 ) {
        defaultOpenStateMessageTime = localeTextBundle.occurrenceManagementTodayTitle.concat( autoSavedSessionTime );
    } else if( dateDiff === -1 ) {
        defaultOpenStateMessageTime = localeTextBundle.occurrenceManagementYesterdayTitle.concat( autoSavedSessionTime );
    } else {
        defaultOpenStateMessageTime = dateTimeService.formatNonStandardDate( autoSavedSessionDateTime, dateTimeService.getSessionDateTimeFormat() );
    }
    appCtxService.ctx.aceActiveContext.context.defaultOpenStateMessageTime = defaultOpenStateMessageTime;
}

/** Add interacted product to session storage.
 *  @param {*} uid - uid.
 */
function _addInteractedProductToSessionStorage( uid ) {
    // Restore feature should not be enabled in skipAutoBookmark
    var skipAutoBookmark = typeof appCtxService.ctx.skipAutoBookmark === 'undefined' ? false : appCtxService.ctx.skipAutoBookmark;
    if( skipAutoBookmark || appCtxService.ctx.aceActiveContext.signoutInProgress ) {
        return;
    }

    var interactedProductUids = [];
    if( sessionStorage.getItem( INTERACTED_PRODUCT_UIDS ) ) {
        interactedProductUids = JSON.parse( sessionStorage.getItem( INTERACTED_PRODUCT_UIDS ) );
    }
    interactedProductUids.push( uid );
    sessionStorage.setItem( INTERACTED_PRODUCT_UIDS, JSON.stringify( interactedProductUids ) );
}

/** Add interacted product to session storage. Except selection other action e.g. command intreaction, expand are considered as
 *  interaction. Also set isRestoreOptionApplicableForProduct = false which will hide the guidance message. Clear local storage expansion
 *  and invoke resetUserWorkingContext SOA to clear auto-bookmark.
 * @param {Object} declViewModel - declViewModel.
 * @param {*} contextKey - contextKey.
 */
function _executeProductInteraction( declViewModel, contextKey ) {
    // Interaction in skip auto-bookmark mode are not valid interaction
    var skipAutoBookmark = typeof appCtxService.ctx.skipAutoBookmark === 'undefined' ? false : appCtxService.ctx.skipAutoBookmark;
    var contextState = {
        context: appCtxService.ctx[ contextKey ],
        key: contextKey
    };

    // If product interaction has happened no need to proceed further
    if( skipAutoBookmark || isProductInteracted( contextState.context.currentState.uid ) ) {
        return;
    }

    // Add interacted product to session storage
    _addInteractedProductToSessionStorage( contextState.context.currentState.uid );

    // Set enableExpansionStateCaching = true. This will enable the local storage functionality
    var gridId = Object.keys( declViewModel.grids )[ 0 ];
    if( declViewModel.grids[ gridId ].gridOptions ) {
        declViewModel.grids[ gridId ].gridOptions.enableExpansionStateCaching = true;
    }

    // Unsubscribe events
    if( _commandLogListener || _appCtxUpdateListener || _inlineAuthListener || _configChangeListener ) {
        eventBus.unsubscribe( _commandLogListener );
        eventBus.unsubscribe( _appCtxUpdateListener );
        eventBus.unsubscribe( _inlineAuthListener );
        eventBus.unsubscribe( _configChangeListener );
        _commandLogListener = null;
        _appCtxUpdateListener = null;
        _inlineAuthListener = null;
        _configChangeListener = null;
    }

    return;
}

/**
 * Populate all the commands for which interaction is not valid.
 */
function _populateInvalidCommandsForInteraction() {
    _invalidCommandsForInteraction.push( 'Awp0GoHome' );
    _invalidCommandsForInteraction.push( 'Awp0GoBack' );
    _invalidCommandsForInteraction.push( 'Awp0ShowHomeFolder' );
    _invalidCommandsForInteraction.push( 'Awa0ShowPredictions' );
    _invalidCommandsForInteraction.push( 'Awp0GoFavorites' );
    _invalidCommandsForInteraction.push( 'Awp0GoInboxWithoutBubble' );
    _invalidCommandsForInteraction.push( 'Awp0GoChanges' );
    _invalidCommandsForInteraction.push( 'Awp0GoSchedules' );
    _invalidCommandsForInteraction.push( 'Awp0GoScheduleTasks' );
    _invalidCommandsForInteraction.push( 'Awp0ShowAlertWithoutBubble' );
    _invalidCommandsForInteraction.push( 'Awp0HelpGroup' );
    _invalidCommandsForInteraction.push( 'Awp0Help' );
    _invalidCommandsForInteraction.push( 'Awp0HelpAbout' );
    _invalidCommandsForInteraction.push( 'Cm1NoChangeContext' );
    _invalidCommandsForInteraction.push( 'Awp0GoReports' );
    _invalidCommandsForInteraction.push( 'cmdQuickAccess' );
    _invalidCommandsForInteraction.push( 'Awp0ChangeTheme' );
    _invalidCommandsForInteraction.push( 'Awp0ShowCompactLayout' );
    _invalidCommandsForInteraction.push( 'Awp0ShowComfyLayout' );
    _invalidCommandsForInteraction.push( 'Awp0CommandLabelToggle' );
    _invalidCommandsForInteraction.push( 'Awp0ShowReactiveLogging' );
    _invalidCommandsForInteraction.push( 'cmdViewProfile' );
}

/**
 * ace Restore BWC State Service utility
 */
export default exports = {
    initialize,
    destroy,
    isProductInteracted,
    addOpenedProductToSessionStorage,
    processProductInteraction,
    toggleTreeNode,
    restoreProduct,
    isRestoreOptionApplicable
};
app.factory( 'aceRestoreBWCStateService', () => exports );

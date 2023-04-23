// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/awDataNavigatorService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import backgroundWorkingContextService from 'js/backgroundWorkingContextService';
import contextStateMgmtService from 'js/contextStateMgmtService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import occmgmtUtils from 'js/occmgmtUtils';
import cdm from 'soa/kernel/clientDataModel';
import tcCommandVisibilityService from 'js/tcCommandVisibilityService';

var exports = {};
var _eventSubDefs = [];

export let initializeDataNavigator = function( data, subPanelContext ) {
    data.contextKey = subPanelContext.contextKey;
    appCtxSvc.updatePartialCtx( subPanelContext.contextKey + '.sublocation.clientScopeURI', subPanelContext.provider.clientScopeURI );
    appCtxSvc.updatePartialCtx( subPanelContext.contextKey + '.sublocation.defaultClientScopeURI', subPanelContext.provider.clientScopeURI );
    appCtxSvc.registerCtx( 'objectQuotaContext', { useObjectQuota: true } );
    data.syncContextWithPWASelectionEventSubscription = eventBus.subscribe( 'appCtx.update', function( event ) {
        if( event.name === data.contextKey && event.target === 'currentState' ) {
            syncContextWithPWASelection( event, subPanelContext );
        }
    } );
    data.occDataLoadedEventSubscription = eventBus.subscribe( 'occDataLoadedEvent', function() {
        if( data.locked && data.locked !== false ) {
            data.handleUnlockForCommandVisibility();
            data.locked = false;
        }
    } );
    _eventSubDefs.push( eventBus.subscribe( 'productContextChangedEvent', function( eventData ) {
        if( eventData.transientRequestPref && eventData.transientRequestPref.selectionToUpdatePostTreeLoad ) {
            _.defer( function() {
                contextStateMgmtService.syncContextState( subPanelContext.contextKey, eventData.transientRequestPref.selectionToUpdatePostTreeLoad );
            } );
        }
    } ) );
    let unlockCommandVisibilityObj = {};
    unlockCommandVisibilityObj.handleToUnlockCommandVisibility = tcCommandVisibilityService.addLock();
    unlockCommandVisibilityObj.locked = true;

    if( data && data.aceSearchPolicyOverride ) {
        appCtxSvc.registerCtx( 'aceSearchPolicyOverride', data.aceSearchPolicyOverride );
    }

    if( subPanelContext.provider.enableOccMgmtCommands ) {
        appCtxSvc.registerPartialCtx( 'sublocation.enableOccMgmtCommands', subPanelContext.provider.enableOccMgmtCommands );
    }

    return unlockCommandVisibilityObj;
};

export let destroyDataNavigator = function( data ) {
    appCtxSvc.unRegisterCtx( 'objectQuotaContext' );
    appCtxSvc.unRegisterCtx( 'isRedLineMode' );
    appCtxSvc.unRegisterCtx( 'sublocation.enableOccMgmtCommands' );
    eventBus.unsubscribe( data.syncContextWithPWASelectionEventSubscription );
    eventBus.unsubscribe( data.occDataLoadedEventSubscription );
    _.forEach( _eventSubDefs, function( subDef ) {
        eventBus.unsubscribe( subDef );
    } );
};

/**
 * @param {Object} newState - Changed param-value map
 *
 * @return {Boolean} true if there is any change compared to existing values
 */
function _haveTopParamsOrTheirValuesChanged( newState, subPanelContext ) {
    var previousState = appCtxSvc.getCtx( subPanelContext.contextKey ).previousState;

    var changed = false;

    _.forEach( newState, function( value, name ) {
        /**
         * Check if we don't care about this parameter.
         */
        if( name !== 't_uid' ) {
            return true;
        }

        if(
            !previousState || !previousState.hasOwnProperty( name ) ||
            previousState[ name ] !== value ) {
            changed = true;
            return false;
        }
    } );

    return changed;
} // _haveTopParamsOrTheirValuesChanged

/**
 * @param {Object} newState - changed param-value map
 *
 * @return {Boolean} true if there is any change compared to existing values
 */
function _havePwaParamsOrTheirValuesChanged( newState, subPanelContext, previousState ) {
    var changed = false;

    _.forEach( newState, function( value, name ) {
        /**
         * Check if we don't care about this parameter.
         */
        if( name === 'page' || name === 'pageId' || name === subPanelContext.selectionQueryParamKey ||
            name === 'pci_uid' || name === 'spageId' || name === 'incontext_uid' ) {
            return true;
        }

        /**
         * We don't care about o_uid changes when we are in tree viewMode.
         */
        if( name === 'o_uid' && subPanelContext.viewConfig.view === 'tree' ) {
            return true;
        }

        if( !previousState || !previousState.hasOwnProperty( name ) ||
            previousState[ name ] !== value ) {
            changed = true;
            return false;
        }
    } );

    return changed;
} //_havePwaParamsOrTheirValuesChanged

function _isObjectBOMWorkset( object ) {
    var isObjectBOMWorkset = false;
    if( object && object.props && object.props.awb0UnderlyingObject ) {
        var underlyingObjUid = object.props.awb0UnderlyingObject.dbValues[ 0 ];
        var modelObjForUnderlyingObj = cdm.getObject( underlyingObjUid );
        if( modelObjForUnderlyingObj.modelType.typeHierarchyArray.indexOf( 'Fnd0WorksetRevision' ) > -1 ) {
            isObjectBOMWorkset = true;
        }
    }
    return isObjectBOMWorkset;
} // _isObjectBOMWorkset

var reloadPrimaryWorkArea = function( newState, subPanelContext, previousState ) {
    if( occmgmtUtils.isTreeView() && _haveTopParamsOrTheirValuesChanged( newState, subPanelContext ) ) {
        eventBus.publish( 'acePwa.reset', {
            retainTreeExpansionStates: false,
            viewToReset: subPanelContext.contextKey
        } );
    } else if( _havePwaParamsOrTheirValuesChanged( newState, subPanelContext, previousState ) ) {
        eventBus.publish( 'acePwa.reset', {
            viewToReset: subPanelContext.contextKey
        } );
    }
};

export let getParentUid = function( context ) {
    if( context.view === 'tree' ) {
        return appCtxSvc.ctx[ context.contextKey ].currentState.t_uid;
    }
    return appCtxSvc.ctx[ context.contextKey ].currentState.o_uid;
};

/**
 * Ensure the correct object is selected
 *
 * @param {String} uidToSelect - The uid of the object that should be selected
 */
let updatePWASelection = function( uidToSelect, subPanelContext ) {
    let pwaSelectionModel = appCtxSvc.ctx[ subPanelContext.contextKey ].pwaSelectionModel;
    if( uidToSelect ) {
        //If multi select is enabled ignore single select changes
        if( pwaSelectionModel.getCurrentSelectedCount() < 2 || appCtxSvc.ctx[ subPanelContext.contextKey ].currentState.o_uid !== appCtxSvc.ctx[ subPanelContext.contextKey ].currentState.c_uid ) {
            if( ( occmgmtUtils.isTreeView() || occmgmtUtils.isResourceView() ) && uidToSelect === getParentUid( { view: subPanelContext.viewConfig.view, contextKey: subPanelContext.contextKey } ) &&
                appCtxSvc.ctx[ subPanelContext.contextKey ].showTopNode ) {
                return;
            } else if( uidToSelect === getParentUid( { view: subPanelContext.viewConfig.view, contextKey: subPanelContext.contextKey } ) &&
                ( pwaSelectionModel.getCurrentSelectedCount() < 2 && !pwaSelectionModel.multiSelectEnabled ) ) {
                //Ensure the base selection is the only selection
                pwaSelectionModel.setSelection( [] );
            } else {
                //set new selection if markUpEnabled and not in multiselect.
                //Add new uid to selection if more than one selectedobjects
                if( uidToSelect !== getParentUid( { view: subPanelContext.viewConfig.view, contextKey: subPanelContext.contextKey } ) ) {
                    if( pwaSelectionModel.getCurrentSelectedCount() > 1 || pwaSelectionModel.multiSelectEnabled ) {
                        pwaSelectionModel.addToSelection( [ uidToSelect ] );
                    } else {
                        pwaSelectionModel.setSelection( [ uidToSelect ] );
                    }
                }
            }
        }
    } else {
        //Reset to base selection is the only selection
        pwaSelectionModel.setSelection( [] );
    }
};

export let syncContextWithPWASelection = function( eventData, subPanelContext ) {
    return backgroundWorkingContextService.ensureSaveComplete().then(
        function() {
            var newState = eventData.value[subPanelContext.contextKey].currentState;
            var previousState = eventData.value[subPanelContext.contextKey].previousState;            
            reloadPrimaryWorkArea( newState, subPanelContext, previousState );
            if( newState.hasOwnProperty( subPanelContext.selectionQueryParamKey ) ) {
                updatePWASelection( newState[ subPanelContext.selectionQueryParamKey ], subPanelContext );
            }
        } );
};

export let syncRootElementInfoForProvidedSelection = function( productInfo, contextKey ) {
    if( productInfo && productInfo.rootElement ) {
        var currentRootElement = appCtxSvc.ctx[ contextKey ].rootElement;
        if( !currentRootElement || currentRootElement.uid !== productInfo.rootElement.uid ) {
            appCtxSvc.updatePartialCtx( contextKey + '.rootElement', productInfo.rootElement );
        }
    }
};

/**
 * @param {Object} selectedObject Object representing selection made by the user
 *
 * @return {Object} Uid of the productContext corresponding to the selected object if it is available in
 *         the elementToPCIMap; the productContext from the URL otherwise and rootElement for current selected object.
 */
export let getProductInfoForCurrentSelection = function( selectedObject, contextKey ) {
    //Default productInfo is current info
    var productInfo = {
        newPci_uid: appCtxSvc.ctx[ contextKey ].currentState.pci_uid
    };

    if( appCtxSvc.ctx[ contextKey ].elementToPCIMap ) {
        var parentObject = selectedObject;
        do {
            if( parentObject && appCtxSvc.ctx[ contextKey ].elementToPCIMap[ parentObject.uid ] ) {
                productInfo.rootElement = parentObject;
                productInfo.newPci_uid = appCtxSvc.ctx[ contextKey ].elementToPCIMap[ parentObject.uid ];

                return productInfo;
            }

            var parentUid = occmgmtUtils.getParentUid( parentObject );
            parentObject = cdm.getObject( parentUid );
        } while( parentObject && !_isObjectBOMWorkset( parentObject ) );
    } else {
        productInfo.rootElement = appCtxSvc.ctx[ contextKey ].topElement;
    }

    return productInfo;
};

export let populateVisibleServerCommands = function( data, contextKey ) {
    var currentSelection = _.get( appCtxSvc.ctx[ contextKey ], 'selectedModelObjects.0.uid' );
    var SoaSelection = _.get( data.soaInput.getVisibleCommandsInfo[ 0 ].selectionInfo.filter( function( selection ) {
        return selection.parentSelectionIndex === 1;
    } )[ 0 ], 'selectedObjects.0.uid' );
    if( currentSelection === SoaSelection ) {
        appCtxSvc.updatePartialCtx( contextKey + '.visibleServerCommands', data.visibleCommandsInfo );
    }
};

export default exports = {
    initializeDataNavigator,
    destroyDataNavigator,
    syncContextWithPWASelection,
    getParentUid,
    syncRootElementInfoForProvidedSelection,
    getProductInfoForCurrentSelection,
    populateVisibleServerCommands
};
app.factory( 'awDataNavigatorService', () => exports );

/**
 * Return this service's name as the 'moduleServiceNameToInject' property.
 */

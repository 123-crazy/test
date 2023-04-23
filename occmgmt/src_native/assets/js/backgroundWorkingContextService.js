//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * Service responsible for saving Background Working Context
 *
 * @module js/backgroundWorkingContextService
 */
import app from 'app';
import soaSvc from 'soa/kernel/soaService';
import appCtxService from 'js/appCtxService';
import aceRestoreBWCStateService from 'js/aceRestoreBWCStateService';
import cdm from 'soa/kernel/clientDataModel';
import AwPromiseService from 'js/awPromiseService';
import messagingSvc from 'js/messagingService';
import eventBus from 'js/eventBus';

import 'js/occmgmtGetService';

import _ from 'lodash';

var exports = {};

var _startSaveAutoBookmarkSubDef = null;
var _lastSavedSelectedElement = null;
var _lastSavedActiveTab = null;

var _currentActiveTab = null;
var _currentSelectedElement = null;

var _currentOpenedElement = null;
var _currentOpenedObjectUid = null;

var _swcPromise = null;
var _appCtxUpdateListener = null;
var _resetEventListener = null;

/**
 * @constructor
 */
var IModelObject = function( uid, type ) {
    this.uid = uid;
    this.type = type;
};

/**
 * @param {String} uid - ID of an object in the CDM to return (or return a new IModelObject of unknown type if the
 *            object is not in the CDM)
 *
 * @return {IModelObject} The IModelObject associated with the given ID.
 */
function _getObject( uid ) {
    if( uid ) {
        var obj = cdm.getObject( uid );
        if( !obj ) {
            return new IModelObject( uid, 'unknownType' );
        }
        return obj;
    }
    return null;
}

var isUserContextSaveRequired = function( eventData ) {
    //don't save usercontext if _currentOpenedElement is null
    if( _currentOpenedElement === undefined || _currentOpenedElement === null ) {
        return false;
    }

    // nothing to save if both _currentSelectedElement and _currentActiveTab is null
    if( _currentSelectedElement === null && _currentActiveTab === null && ( eventData === null || eventData === undefined ) ) {
        return false;
    }

    if( !aceRestoreBWCStateService.isProductInteracted( _currentOpenedObjectUid ) ) {
        return false;
    }

    // save user context only if the last saved selected element or Active tab
    // is different from current selected element/active tab
    // Only when its not initiated from timer
    if( (_lastSavedSelectedElement !== _currentSelectedElement || _lastSavedActiveTab !== _currentActiveTab ) && !( eventData && _.isEqual( eventData.source, 'timer' ) ) ) {
        return true;
    }

    // call soa when it it is called from aceInContextOverrideService i.e. when set in context is toggled
    if( eventData && eventData.incontext_uid ) {
        return true;
    }

    var addInWorkingCtxData = appCtxService.getCtx( 'addInWorkingCtxData' );
    if( addInWorkingCtxData ) {
        if( addInWorkingCtxData.requestPref && addInWorkingCtxData.requestPref.deleteCloneData && addInWorkingCtxData.requestPref.deleteCloneData[ 0 ] === 'true' ) {
            return true;
        }
        if( addInWorkingCtxData.cloneContentSaveSpecifications && Object.keys( addInWorkingCtxData.cloneContentSaveSpecifications.data ).length > 0 ) {
            return true;
        }
    }
    return false;
};

var forceRefreshTabsWhenResetOrLoadedForFirstTime = function() {
    eventBus.publish( 'aceSecondaryWorkArea.refreshTabs' );
};

var initializeLastSavedAttributes = function() {
    //get the last saved attributes when the product is opened
    _appCtxUpdateListener = eventBus.subscribe( 'appCtx.update', function( event ) {
        let aceActiveContext = appCtxService.getCtx( 'aceActiveContext' );
        if( aceActiveContext ) {
            if( event.name === aceActiveContext.key && event.target === 'sublocationAttributes' ) {
                if( _lastSavedActiveTab === null && _lastSavedSelectedElement === null ) {
                    var ctx = event.value.aceActiveContext.context.sublocationAttributes;
                    _lastSavedActiveTab = ctx && ctx.awb0ActiveSublocation ? ctx.awb0ActiveSublocation[ 0 ] : null;
                    //if nothing is selected then c_uid is set to the value of o_uid, set the last saved selection
                    // only if there is a explicit selection.
                    if( appCtxService.ctx.state.params.o_uid !== appCtxService.ctx.state.params.c_uid ) {
                        _lastSavedSelectedElement = appCtxService.ctx.state.params.c_uid;
                    }

                    forceRefreshTabsWhenResetOrLoadedForFirstTime();
                }
            }
        }
    } );

    //when reset is performed the auto bookmark will be deleted, so the active tab and selection
    // will be lost as well. reset the last saved values to null so that after 30 sec the
    // new values will be saved to the auto bookmark
    _resetEventListener = eventBus.subscribe( 'ace.resetStructureStarted', function() {
        _lastSavedActiveTab = null;
        _lastSavedSelectedElement = null;
    } );
};

var populateCloneContentSaveSpecifications = function( soaInput ) {
    var addInWorkingCtxData = appCtxService.getCtx( 'addInWorkingCtxData' );
    if( addInWorkingCtxData ) {
        if( addInWorkingCtxData.requestPref && addInWorkingCtxData.requestPref.deleteCloneData && addInWorkingCtxData.requestPref.deleteCloneData[ 0 ] === 'true' ) {
            var deleteCloneData = addInWorkingCtxData.requestPref.deleteCloneData;
            soaInput.requestPref.deleteCloneData = deleteCloneData;
            appCtxService.updatePartialCtx( 'addInWorkingCtxData.requestPref.deleteCloneData', [ 'false' ] );
        }
        if( addInWorkingCtxData.cloneContentSaveSpecifications ) {
            var cloneInfo = addInWorkingCtxData.cloneContentSaveSpecifications.data;
            var cloneData = Object.keys( cloneInfo ).map( function( dupInfo ) { return cloneInfo[ dupInfo ]; } );

            if( cloneData.length > 0 ) {
                var productModelObj = { uid: appCtxService.ctx.aceActiveContext.context.productContextInfo.uid, type: appCtxService.ctx.aceActiveContext.context.productContextInfo.type };
                soaInput.contextState.cloneContentSaveSpecifications = [
                    [ productModelObj ],
                    [ cloneData ]
                ];
            }
            if( addInWorkingCtxData.cloneContentSaveSpecifications.removeOnRead ) {
                Object.keys( cloneInfo ).forEach( function( key ) { delete cloneInfo[ key ]; } );
            }
        }
    }
};

var handleFailedStateForCloneData = function( soaInput, failedUIDs ) {
    var addInWorkingCtxData = appCtxService.getCtx( 'addInWorkingCtxData' );
    if( addInWorkingCtxData ) {
        var cloneInfo = addInWorkingCtxData.cloneContentSaveSpecifications.data;
        var cloneData = Object.keys( cloneInfo ).map( function( dupInfo ) { return cloneInfo[ dupInfo ]; } );
        for( var j = 0, len = failedUIDs.length; j < len; ++j ) {
            //Check if failed occurrence has already been applied any new action.
            if( indexOfFailedUid( cloneData, failedUIDs[ j ] ) === -1 ) {
                //If occurrence does not have new action then get previous action from soaInput
                if( soaInput.contextState.cloneContentSaveSpecifications.length > 0 ) {
                    var inputArray = soaInput.contextState.cloneContentSaveSpecifications[ 1 ][ 0 ];
                    var index = indexOfFailedUid( inputArray, failedUIDs[ j ] );
                    if( index > -1 ) {
                        var id = inputArray[ index ].element.uid;
                        cloneInfo[ id ] = inputArray[ index ];
                    }
                }
            }
        }
    }
};
var indexOfFailedUid = function( cloneData, failedUID ) {
    var index = -1;
    for( var i = 0, length = cloneData.length; i < length; ++i ) {
        if( cloneData[ i ].element.uid === failedUID ) {
            index = i;
            break;
        }
    }
    return index;
};
/**
 * Initialize the Background Working Context service - called when Content location is revealed
 */
export let initialize = function() {
    _startSaveAutoBookmarkSubDef = eventBus.subscribe( 'StartSaveAutoBookmarkEvent', function( eventData ) {
        exports.saveUserWorkingContextState( false, eventData );
    } );
    initializeLastSavedAttributes();
};

/**
 * Ensure that page is not in the process of saving working context
 */
export let ensureSaveComplete = function() {
    return _swcPromise ? _swcPromise : AwPromiseService.instance.when();
};

/**
 * Make a SaveUserWorkingContextState SOA call to save the current user client state information for the opened
 * object.
 */
export let saveUserWorkingContextState = function( shouldFireEventOnSuccess, eventData ) {
    // reset the _current* variables to null first, so that they dont retain the values from last call.
    _currentOpenedElement = null;
    _currentActiveTab = null;
    _currentSelectedElement = null;
    _currentOpenedObjectUid = null;

    let currentContext = appCtxService.ctx.aceActiveContext && appCtxService.getCtx( appCtxService.ctx.aceActiveContext.key );
    let activeContext = appCtxService.ctx.aceActiveContext && appCtxService.ctx.aceActiveContext.context;

    //When we are in Content tab, and press back button that again takes us to Content tab, info of new product
    //gets passed on to saveUserWorkingContextState2() SOA. It causes issue for Duplicate case and should be avoided.

    //If opened object has changed between currentState and previouState and currentContext is not yet populated,
    //make saveUserWorkingContextState2() call with previousState.
    if( _.isUndefined( currentContext ) && activeContext && !_.isEqual( activeContext.currentState.uid, activeContext.previousState.uid ) ) {
        if( !_.isEmpty( activeContext.previousState ) ) {
            _currentOpenedElement = _getObject( activeContext.previousState.o_uid );
            _currentSelectedElement = activeContext.previousState.c_uid;
            _currentActiveTab = activeContext.previousState.spageId;
            _currentOpenedObjectUid = activeContext.previousState.uid;
        }
    } else if( activeContext && activeContext.currentState ) {
        _currentOpenedElement = _getObject( activeContext.currentState.o_uid );
        _currentSelectedElement = activeContext.currentState.c_uid;
        _currentActiveTab = activeContext.currentState.spageId;
        _currentOpenedObjectUid = activeContext.currentState.uid;
    }

    if( !isUserContextSaveRequired( eventData ) ) {
        if( shouldFireEventOnSuccess ) {
            eventBus.publish( 'saveBWC.success' );
        }
        return  AwPromiseService.instance.resolve();
    }

    var soaInput = {
        contextState: {
            openedObject: _currentOpenedElement,
            sublocationAttributes: {},
            cloneContentSaveSpecifications: [
                [],
                []
            ]
        },
        requestPref: {}
    };

    //_currentActiveTab will be null in List/Tree mode. SOA fails if active tab is set to null.
    // Don't add _currentActiveTab to the input SOA if it null.

    if( _currentActiveTab ) {
        soaInput.contextState.sublocationAttributes.awb0ActiveSublocation = [ _currentActiveTab ];
    }

    if( _currentSelectedElement ) {
        soaInput.contextState.sublocationAttributes.awb0SelectedElementPath = [ _currentSelectedElement ];
    }

    // process awb0OverrideContextElement only if this soa is called from aceInContextOverrideService
    if( eventData && eventData.incontext_uid ) {
        soaInput.contextState.sublocationAttributes.awb0OverrideContextElement = [ eventData.incontext_uid ];
        soaInput.requestPref.isSetCase = _.isEqual( appCtxService.ctx.aceActiveContext.context.currentState.incontext_uid, eventData.incontext_uid ) ? [ 'false' ] : [ 'true' ];
    }

    populateCloneContentSaveSpecifications( soaInput );

    try {
        _swcPromise = soaSvc.post( 'Internal-ActiveWorkspaceBom-2019-06-OccurrenceManagement',
            'saveUserWorkingContextState2', soaInput ).then( function( response ) {
                _swcPromise = null;
                if( response ) {
                    _lastSavedActiveTab = _currentActiveTab;
                    _lastSavedSelectedElement = _currentSelectedElement;

                    if( shouldFireEventOnSuccess ) {
                        eventBus.publish( 'saveBWC.success' );
                    }
                }
                return  AwPromiseService.instance.resolve();
            },
            function( error ) {
                if( error.cause && error.cause.plain ) {
                    handleFailedStateForCloneData( soaInput, error.cause.plain );
                    var errMessage = messagingSvc.getSOAErrorMessage( error );
                    messagingSvc.showError( errMessage );
                }
            } );
    } catch ( e ) {
        eventBus.publish( 'saveBWC.failure' );
    }
    return _swcPromise;
};

/**
 * Reset the Background Working Context service - called when user navigates away from Content
 */
export let reset = function() {
    exports.saveUserWorkingContextState();
    if( _startSaveAutoBookmarkSubDef ) {
        eventBus.unsubscribe( _startSaveAutoBookmarkSubDef );
        _startSaveAutoBookmarkSubDef = null;
    }

    if( _appCtxUpdateListener ) {
        eventBus.unsubscribe( _appCtxUpdateListener );
        _appCtxUpdateListener = null;
    }

    if( _resetEventListener ) {
        eventBus.unsubscribe( _resetEventListener );
        _resetEventListener = null;
    }

    _lastSavedActiveTab = null;
    _lastSavedSelectedElement = null;

    _currentOpenedElement = null;
    _currentActiveTab = null;
    _currentSelectedElement = null;
    _currentOpenedObjectUid = null;
};

/**
 * Background Working Context service utility
 */

export default exports = {
    initialize,
    ensureSaveComplete,
    saveUserWorkingContextState,
    reset
};
app.factory( 'backgroundWorkingContextService', () => exports );

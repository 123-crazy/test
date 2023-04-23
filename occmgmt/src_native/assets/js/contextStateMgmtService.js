// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/contextStateMgmtService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * @param {Object} paramsToBeStoredOnUrl - parameter map to store on URL.
 */
export let getContextKeyFromParentScope = function( parentScope ) {
    var scope = parentScope;
    while( !scope.contextKey ) {
        if( scope.$parent ) {
            scope = scope.$parent;
        } else {
            break;
        }
    }
    return scope.contextKey ? scope.contextKey : "";
};

export let updateContextState = function( contextKey, newState, mergeWithCurrentState ) {
    //get Current State and store as Previous State
    var currentState = appCtxSvc.getCtx( contextKey ).currentState;
    appCtxSvc.updatePartialCtx( contextKey + '.previousState', JSON.parse( JSON.stringify( currentState ) ) );
    //Create new merged state using Current State and New State and store as Current State
    if( mergeWithCurrentState ) {
        newState = _.assign( {}, currentState, newState );
    } else {
        _.forEach( currentState, function( value, name ) {
            if( !newState.hasOwnProperty( name ) ) {
                newState[ name ] = null;
            }
        } );
    }
    appCtxSvc.updatePartialCtx( contextKey + '.currentState', JSON.parse( JSON.stringify( newState ) ) );
};

export let syncContextState = function( contextKey, newState ) {
    //get Current State and create new Merged State using Current State and New State
    var currentState = appCtxSvc.getCtx( contextKey ).currentState;
    var mergedState = _.assign( {}, currentState, newState );
    //Store Previous and Current state as new merged state
    appCtxSvc.updatePartialCtx( contextKey + '.previousState', JSON.parse( JSON.stringify( mergedState ) ) );
    appCtxSvc.updatePartialCtx( contextKey + '.currentState', JSON.parse( JSON.stringify( mergedState ) ) );
};

export let updateActiveContext = function( contextKey, newState ) {
    var oldContextkey = appCtxSvc.getCtx( 'aceActiveContext.key' );
    var activeContext = appCtxSvc.ctx[ contextKey ];
    if( newState ) {
        activeContext.currentState = JSON.parse( JSON.stringify( newState ) );
    }
    appCtxSvc.updatePartialCtx( 'aceActiveContext', {
        key: contextKey,
        context: activeContext
    } );
    appCtxSvc.updatePartialCtx( 'locationContext.modelObject', appCtxSvc.ctx[ contextKey ].modelObject );
    if( contextKey !== oldContextkey ) {
        eventBus.publish( 'occDataLoadedEvent',{
            dataProviderActionType : "activateWindow"
        } );
        eventBus.publish( 'aceActiveContextChanged' );
    }
};
export default exports = {
    getContextKeyFromParentScope,
    updateContextState,
    syncContextState,
    updateActiveContext
};
app.factory( 'contextStateMgmtService', () => exports );

/**
 * Return this service's name as the 'moduleServiceNameToInject' property.
 */

// Copyright (c) 2020 Siemens
/* eslint-env es6 */

/**
 * This service provides helpful APIs to register/unregister/update context variables used to hold application state.
 *
 * @module js/appCtxService
 *
 * @publishedApolloService
 */
import _ from 'lodash';
import app from 'app';
import eventBus from 'js/eventBus';
import AwStateService from 'js/awStateService';
import AwRootScopeService from 'js/awRootScopeService';
import debugService from 'js/debugService';

let exports;

export let ctx = {};

/**
 * Register application context variable
 *
 * @param {String} name - The name of context variable
 * @param {Object} value - The value of context variable
 */
export let registerCtx = function( name, value ) {
    debugService.debug( 'ctx', name, 'register' );
    exports.ctx[ name ] = value;

    // Announce app context registration
    eventBus.publish( 'appCtx.register', {
        name: name,
        value: value
    } );
};

/**
 * Register part of a context
 *
 * @param {String} path - Path to the context
 * @param {Object} value - The value of context variable
 * @ignore
 */
export let registerPartialCtx = function( path, value ) {
    debugService.debug( 'ctx', path, 'register' );
    var splitPath = path.split( '.' );
    var context = splitPath.shift();

    _.set( exports.ctx, path, value );

    // Announce app context registration
    eventBus.publish( 'appCtx.register', {
        name: context,
        target: splitPath.join( '.' ),
        value: value
    } );
};

/**
 * Unregister application context variable
 *
 * @param {String} name - The name of context variable
 */
export let unRegisterCtx = function( name ) {
    debugService.debug( 'ctx', name, 'unregister' );
    delete exports.ctx[ name ];
    // Announce app context un-registration
    eventBus.publish( 'appCtx.register', {
        name: name
    } );
};

/**
 * Update application context and Announce app context update by publishing an {@link module:js/eventBus|event}
 * 'appCtx.update' with eventData as {"name": ctxVariableName, "value": ctxVariableValue}
 *
 * @param {String} name - The name of context variable
 * @param {Object} value - The value of context variable
 */
export let updateCtx = function( name, value ) {
    debugService.debug( 'ctx', name, 'modify' );
    exports.ctx[ name ] = value;
console.log(name);
console.log(value);
    // Announce app context update
    eventBus.publish( 'appCtx.update', {
        name: name,
        value: value
    } );
};

/**
 * Get application context variable value
 *
 * @param {String} path - Path to the context
 * @returns {Object} Value (if any) at the indicated context path location.
 */
export let getCtx = function( path ) {
    return _.get( exports.ctx, path );
};

/**
 * Update part of a context
 *
 * @param {String} path - Path to the context
 * @param {Object} value - The value of context variable
 * @ignore
 */
export let updatePartialCtx = function( path, value ) {
    debugService.debug( 'ctx', path, 'modify' );
    var splitPath = path.split( '.' );
    var context = splitPath.shift();
    var currentCtx = _.get( exports.ctx, path );
    // This will typically be done using angular binding, so we don't want an event potentially every $digest
    if( value !== currentCtx ) {
        var newCtx = _.set( exports.ctx, path, value );

        // Announce update
        eventBus.publish( 'appCtx.update', {
            name: context,
            value: newCtx,
            target: splitPath.join( '.' )
        } );
    }
};

/**
 * Update app context from object
 *
 * @param {Object} ctxObject - The source context objeect containing properties that need to be update on global ctx
 */
export let updateCtxFromObject = function( ctxObject ) {
    if( ctxObject ) {
        _.forEach( ctxObject, function( value, name ) {
            exports.updateCtx( name, value );
        } );
    }
};

let addKeyBoardListner = () => {
    // Let the document know when the keyboard is being used
    document.body.addEventListener( 'keydown', function( event ) {
        document.body.classList.add( 'keyboard' );
        //On Keyboard operate, start first with element having focus startpoint
        let focusStartEle = document.querySelector( '.aw-focus-startpoint' );
        if( focusStartEle !== null ) {
            focusStartEle.focus();
            focusStartEle.classList.remove( 'aw-focus-startpoint' );
        }
    }, true );

    // disable focus styling when mouse is clicked
    document.body.addEventListener( 'mousedown', function( event ) {
        document.body.classList.remove( 'keyboard' );
        let focusStartEle = document.querySelector( '.aw-focus-startpoint' );
        if( focusStartEle !== null ) {
            focusStartEle.classList.remove( 'aw-focus-startpoint' );
        }
    }, true );
};

/**
 * Initialize the state infomation on appCtxService
 * This function should be called after app initialize
 */
export let loadConfiguration = function() {
    addKeyBoardListner();
    let rootScope = AwRootScopeService.instance;
    let state = AwStateService.instance;
    // Put the state parameters into the context
    exports.registerCtx( 'state', state.params );

    var processParameters = function processParameters( stateParams ) {
        return Object.keys( stateParams ) // Filter parameters that are not set
            .filter( function( param ) {
                return stateParams[ param ];
            } ) // Build the new object
            .reduce( function( acc, nxt ) {
                acc[ nxt ] = stateParams[ nxt ];
                return acc;
            }, {} );
    }; // When the state parameters change

    rootScope.$on( '$locationChangeSuccess', function() {
        // Update the context
        exports.registerCtx( 'state', {
            params: state.params,
            processed: processParameters( state.params )
        } );

        eventBus.publish( 'LOCATION_CHANGE_COMPLETE' );
    } ); // When the state parameters change

    rootScope.$on( '$stateChangeSuccess', function( event, newState, newStateParams, oldState ) {
        debugService.debug( 'routes', oldState.name, newState.name );
        // Update the context
        exports.registerCtx( 'state', {
            params: newStateParams,
            processed: processParameters( newStateParams )
        } );
    } );
};

exports = {
    ctx,
    registerCtx,
    registerPartialCtx,
    updateCtx,
    updatePartialCtx,
    unRegisterCtx,
    getCtx,
    updateCtxFromObject,
    loadConfiguration
};
export default exports;

/**
 * @memberof NgServices
 * @member configurationService
 *
 * @returns {configurationService} Reference to the service API object.
 */
app.factory( 'appCtxService', () => exports );

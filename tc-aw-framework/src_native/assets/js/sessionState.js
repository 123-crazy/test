// Copyright (c) 2020 Siemens

/**
 * This is purely a Require module. It will get called on the initial flow path and state is checked during route
 * transitions. It will do an on demand load of the session manager service.
 *
 * @module js/sessionState
 */
import logger from 'js/logger';
import AwStateService from 'js/awStateService';

var exports = {};

var _isSessionAuthenticated = false;
var _authInProgress = false;

export let setAuthStatus = function( isAuth ) {
    _isSessionAuthenticated = isAuth;
};

export let getIsAuthenticated = function() {
    return _isSessionAuthenticated;
};

export let isAuthenticationInProgress = function() {
    return _authInProgress;
};

export let setAuthenticationInProgress = function( val ) {
    _authInProgress = val;
};

export let forceNavigation = function( toState, toParams ) {
    // try to put an async "gap" around the state.go - much like the sessionmgr interaction..
    import( 'js/sessionManager.service' ).then( function() {
        try {
            AwStateService.instance.go( toState, toParams );
        } catch( e ) {
            // For aligning with former code flow, do nothing and not error out
        }
    } );
};
/**
 * this is the wrapper around the checkSessionValid() api. this is the defer point at which we can async load.
 */
export let performValidSessionCheck = function( targetNavDetails ) {
    // this is the break point for our dependency load.  on demand load of the session manager service.
    import( 'js/sessionManager.service' ).then( function( sessionManagerService ) {
        sessionManagerService.checkSessionValid( targetNavDetails );
    } );
};

export let runPostLoginStages = function() {
    // this is the break point for our dependency load.  on demand load of the session manager service.
    import( 'js/sessionManager.service' ).then( function( sessionManagerService ) {
        sessionManagerService.runPostLoginBlocking().then( function() {
            sessionManagerService.runNavToState();
        }, function() {
            if( logger.isTraceEnabled() ) {
                logger.trace( 'SM: end runPostLoginBlocking Stage - but ERROR' );
            }
            sessionManagerService.runNavToState();
        } );
    } );
};

/**
 * wrapper around the session manager api. load upon request and invoke session manager.
 *
 * @param {Object} $q
 * @return {Promise} promise
 */
export let pickAuthenticator = function( $q ) {
    // this is the break point for our dependency load.  on demand load of the session manager service.
    return $q( function( resolve ) {
        import( 'js/sessionManager.service' ).then( function( sessionManagerService ) {
            resolve( sessionManagerService.pickAuthenticator() );
        } );
    } );
};

/**
 * Invoked when the state change was successful from UI router
 */
export let routeStateChangeSuccess = function( event, toState, toParams, fromState, fromParams ) {
    // this is the break point for our dependency load.  on demand load of the session manager service.
    import( 'js/locationNavigation.service' ).then( function( dep ) {
        let locationNavigationSvc = dep.default.instance;
        locationNavigationSvc.routeStateChangeSuccess( event, toState, toParams, fromState, fromParams );
    } );
};

// Require Module only - not an Angular service.
exports = {
    setAuthStatus,
    getIsAuthenticated,
    isAuthenticationInProgress,
    setAuthenticationInProgress,
    forceNavigation,
    performValidSessionCheck,
    runPostLoginStages,
    pickAuthenticator,
    routeStateChangeSuccess
};
export default exports;

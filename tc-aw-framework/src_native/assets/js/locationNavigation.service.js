// Copyright (c) 2020 Siemens
/* eslint-env es6 */

/**
 * This represents the Location Navigation and tracking
 *
 * @module js/locationNavigation.service
 */

// module
import app from 'app';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import appCtxService from 'js/appCtxService';

// service
import AwBaseService from 'js/awBaseService';
import AwStateService from 'js/awStateService';
import AwRootScopeService from 'js/awRootScopeService';
import AwUrlMatcherFactoryService from 'js/awUrlMatcherFactoryService';
import leavePlaceSvc from 'js/leavePlace.service';
import localeService from 'js/localeService';
import wcagSvc from 'js/wcagService';

export default class LocationNavigationService extends AwBaseService {
    // Only for unit test purpose
    static reset() {
        leavePlaceSvc.reset();
        AwBaseService.reset.apply( this );
        AwStateService.reset();
        AwRootScopeService.reset();
    }

    constructor() {
        super();

        // service and module references
        this._state = AwStateService.instance;

        this._rootScope = AwRootScopeService.instance;

        // members
        this._stateStackNames = null;

        this._stateStack = null;

        this._popState = null;

        this._xrtShowObjectState = [ 'com_siemens_splm_clientfx_tcui_xrt_showObject', 'com_siemens_splm_clientfx_tcui_xrt_showMultiObject' ];

        /**
         * {Integer} The number of previous states that will be persisted for navigation from back button.
         * If the number of states exceeds this count, the earliest state will be forgotten.
         */
        this._persistentStatesCount = 24;

        this.init();

        this._rootScope.$on( '$locationChangeSuccess', ( event, newUrl, oldUrl ) => {
            var newLocation = this.parseUrl( newUrl );
            var oldLocation = this.parseUrl( oldUrl );
            this.updateCurrentDisplayName();

            /*
             * Several location changes are made during show object location as query parameters are added do not
             * want to check changes until toLocation are valid locations
             */
            if( newLocation.params && newLocation.params.uid ) {
                if( oldLocation.params ) {
                    if( oldLocation.params.uid && newLocation.params.uid !== oldLocation.params.uid ||
                        newLocation.params.uid === oldLocation.params.uid && newLocation.state.name !== oldLocation.state.name ) {
                        this.routeStateChangeSuccess( event, newLocation.state, newLocation.params,
                            oldLocation.state, oldLocation.params );
                    }
                } else {
                    this.routeStateChangeSuccess( event, newLocation.state, newLocation.params,
                        oldLocation.state, oldLocation.params );
                }
            }
            eventBus.publish( '$locationChangeSuccess', { event, newUrl, oldUrl } );
            logger.trace( '#### locationChangeSuccess changed! new: ' + newUrl + ', oldUrl: ' + oldUrl );
        } );

        this._rootScope.$on( '$stateChangeStart', ( event, toState, toParams, fromState, fromParams, options ) => {
            // Put it here means only after login the event will be raised.
            // Hoot it with routeChangeHandler may be dangerous for now since it is before login
            eventBus.publish( '$stateChangeStart', {
                event: event,
                toState: toState,
                toParams: toParams,
                fromState: fromState,
                fromParams: fromParams,
                options: options
            } );
        } );

        this._rootScope.$on( '$locationChangeStart', ( event, newUrl, oldUrl ) => {
            const newLocation = this.parseUrl( newUrl );
            const oldLocation = this.parseUrl( oldUrl );
            eventBus.publish( '$locationChangeStart', {
                event: event,
                newUrl: newUrl,
                oldUrl: oldUrl,
                newLocation: newLocation,
                oldLocation: oldLocation
            } );
        } );

        this._rootScope.$on( 'windowResize', function() {
            eventBus.publish( 'aw.windowResize' );
        } );
    }

    /**
     * Initializes the previous routes and route names if they are present in sessionStorage
     */
    init() {
        this._stateStack = [];
        this._stateStackNames = [];
        try {
            if( sessionStorage.getItem( 'STATES_ARRAY_NAMES' ) && sessionStorage.getItem( 'STATES_ARRAY' ) ) {
                this._stateStackNames = JSON.parse( sessionStorage.getItem( 'STATES_ARRAY_NAMES' ) );
                this._stateStack = JSON.parse( sessionStorage.getItem( 'STATES_ARRAY' ) );
            }
        } catch ( e ) {
            logger.trace( 'Error in location initiation', e );
        }
    }

    /**
     * Function parses a URL and returns an object consisting of state and params
     * @param {string} url url input as string
     * @returns {object} URL object with parse result
     */
    parseUrl( url ) {
        let urlMatcherFactory = AwUrlMatcherFactoryService.instance;
        var stateStart = url.lastIndexOf( '#' );
        var paramsStart = url.lastIndexOf( '?' );
        var state = url.substring( stateStart + 1 );
        var paramsStr = '';
        var params = {};
        if( paramsStart > -1 ) {
            state = url.substring( stateStart + 1, paramsStart );
            paramsStr = url.substr( paramsStart + 1 );
            var paramPairs = paramsStr.split( '&' );
            for( var i = 0; i < paramPairs.length; i++ ) {
                var keyValue = paramPairs[ i ].split( '=' );
                if( keyValue.length === 2 ) {
                    params[ keyValue[ 0 ] ] = urlMatcherFactory.type( 'string' )
                        .decode( decodeURIComponent( keyValue[ 1 ] ) );
                }
            }
        }
        if( state === '/com.siemens.splm.clientfx.tcui.xrt.showObject' ) {
            state = this._xrtShowObjectState[ 0 ];
        } else if( state === '/com.siemens.splm.clientfx.tcui.xrt.showMultiObject' ) {
            state = this._xrtShowObjectState[ 1 ];
        } else if( state.charAt( 0 ) === '/' ) {
            state = state.substring( 1 );
        }
        return {
            state: {
                name: state.split( '/' ).slice( -1 )[0]
            },
            params: params,
            url: url
        };
    }

    /**
     * goBack function wired to the goBack Button
     */
    goBack() {
        this._popState = this._stateStack.pop();

        sessionStorage.setItem( 'STATES_ARRAY', JSON.stringify( this._stateStack ) );

        this._stateStackNames.pop();

        if( this._stateStackNames.length === 0 ) {
            this._stateStackNames.push( document.title );
        }

        sessionStorage.setItem( 'STATES_ARRAY_NAMES', JSON.stringify( this._stateStackNames ) );

        appCtxService.registerCtx( 'previousLocationDisplayName ', this.getGoBackLocation() );

        if( this._popState && this._popState.state ) {
            logger.trace( '&&&&& go pop state' + this._popState.state.name );

            this._state.go( this._popState.state.name, this._popState.params, {
                inherit: false
            } );

            if( this._rootScope.$$phase !== '$apply' && this._rootScope.$$phase !== '$digest' ) {
                this._rootScope.$apply();
            }
        }
    }

    peekLastState() {
        if( this._stateStack && this._stateStack.length > 0 ) {
            return this._stateStack[ this._stateStack.length - 1 ];
        }
        return undefined;
    }

    getGoBackLocation() {
        if( this._stateStackNames && this._stateStackNames.length > 1 ) {
            return this._stateStackNames[ this._stateStackNames.length - 2 ];
        }
        return localeService.getLoadedTextFromKey( 'UIMessages.noPreviousLocation' );
    }

    updateCurrentDisplayName() {
        var title;
        if( this._stateStackNames && this._stateStackNames.length > 0 ) {
            title = document.title;
            this._stateStackNames[ this._stateStackNames.length - 1 ] = title.substr( title.indexOf( '-' ) + 1 );
            sessionStorage.setItem( 'STATES_ARRAY', JSON.stringify( this._stateStack ) );
        }
        if( this._stateStackNames && this._stateStackNames.length === 0 ) {
            title = document.title;
            this._stateStackNames[ 0 ] = title.substr( title.indexOf( '-' ) + 1 );
            sessionStorage.setItem( 'STATES_ARRAY', JSON.stringify( this._stateStack ) );
        }
        return undefined;
    }

    /**
     * Invoked when the state change was successful from UI router
     * @param {object} event event body
     * @param {object} toState state object transit to
     * @param {object} toParams paramters for toState
     * @param {object} fromState state object transit from
     * @param {object} fromParams paramters for fromState
     */
    routeStateChangeSuccess( event, toState, toParams, fromState, fromParams ) {
        if( fromState && fromState.name !== 'checkAuthentication' ) {
            if( this._popState && this._popState.state.name === toState.name ) {
                //This condition needed to restrict to save state on stack once user clicked on back button more than once
                // and state name is different (Reference defect -LCS-462441)
                if( !( event.name === '$locationChangeSuccess' && fromState.name !== toState.name ) ) {
                    this._popState = null;
                }
                    return;
            }

            if( toState && toState.parent && fromState && fromState.parent && toState.parent === fromState.parent ) {
                return;
            }

            var newState = {
                state: fromState,
                params: fromParams,
                displayName: document.title
            };

            if( this._stateStack.length > 0 ) {
                var lastState = this.peekLastState();

                if( lastState.state.name !== newState.state.name && newState.state.name !== '' ) {
                    this._stateStack.push( newState );
                    this._stateStackNames.push( newState.displayName );
                    logger.trace( '^^^^1 pushing newState ' + newState.state.name );
                } else if( newState.state.name !== '' && lastState.params.uid !== newState.params.uid &&
                    ( newState.params.uid !== toParams.uid || newState.state.name !== toState.name ) ) {
                    this._stateStack.push( newState );
                    this._stateStackNames.push( newState.displayName );
                    logger.trace( '^^^^2 pushing newState ' + newState.state.name );
                }
            } else if( !newState.state.abstract ) {
                this._stateStack.push( newState );
                this._stateStackNames.push( newState.displayName );
                logger.trace( '^^^^3 pushing newState ' + newState.state.name );
            }
            // If persisted states count exceeds allowed count, remove earliest state
            if( this._stateStack.length > this._persistentStatesCount ) {
                this._stateStack.shift();
                this._stateStackNames.shift();
            }

            sessionStorage.setItem( 'STATES_ARRAY_NAMES', JSON.stringify( this._stateStackNames ) );
            sessionStorage.setItem( 'STATES_ARRAY', JSON.stringify( this._stateStack ) );
        }
        // Once location is changed, fix focus navigation starting point ( check solution )
        //https://sarahmhigley.com/writing/focus-navigation-start-point/#assistive-tech-support
        let eleToFocus = document.querySelector( '.aw-skip-to-main-container' );
        if( eleToFocus !== null ) {
            eleToFocus.focus();
        }
        appCtxService.registerCtx( 'previousLocationDisplayName ', this.getGoBackLocation() );
    }

    /**
     * Function to update the state parameter
     * @param {string} paramName parameter name
     * @param {string} paramValue parameter value
     */
    updateStateParameter( paramName, paramValue ) {
        this._state.params[ paramName ] = paramValue;
        this._state.go( '.', this._state.params, {
            inherit: true
        } );
    }

    /**
     * Function to transition to a new state
     * @param {string} transitionTo URL that transit to
     * @param {object} toParams parameter for transitionTo
     * @param {object} options transition options
     */
    go( transitionTo, toParams, options ) {
        this._state.go( transitionTo, toParams, options );
    }
}

app.factory( 'locationNavigationService', () => LocationNavigationService.instance );

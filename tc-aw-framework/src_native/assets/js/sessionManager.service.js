// Copyright (c) 2021 Siemens

/**
 * This represents the session tracking and authentication detection.
 *
 * NOTE - it gets loaded prior to the app.initModule - so can't leverage the typical angular resolution.
 *
 * @module js/sessionManager.service
 */
import app from 'app';
import cfgSvc from 'js/configurationService';
import contributionSvc from 'js/contribution.service';
import postLgnPipeLneSvc from 'js/postLoginPipeline.service';
import eventBus from 'js/eventBus';
import browserUtils from 'js/browserUtils';
import sessionState from 'js/sessionState';
import localStrg from 'js/localStorage';
import logger from 'js/logger';
import analyticsSvc from 'js/analyticsService';
import splmStatsService from 'js/splmStatsService';
import declUtils from 'js/declUtils';
import 'config/authenticator';

// Service
import AwPromiseService from 'js/awPromiseService';
import AwStateService from 'js/awStateService';

var _debug_logAuthActivity = browserUtils.getUrlAttributes().logAuthActivity !== undefined;

// service and module references

// members
var _savedNavTarget;
var _targetAuthenticator;

// flag to suppress location reload during logoff; required for SSO support (ie11 + IIS)
var _suppressReload = false;

// prop set/get functions

var exports = {};

/**
 * property setter - defer to the state module.
 *
 * @param {Boolean} isAuth - Whether or not session is currently authenticated.
 */
export let setAuthStatus = function( isAuth ) {
    sessionState.setAuthStatus( isAuth );
};

/**
 * property getter - defer to the state module.
 *
 * @return {Boolean} is session currently authenticated
 */
export let getAuthStatus = function() {
    return sessionState.getIsAuthenticated();
};

/**
 * property getter - defer to the state module.
 *
 * @return {Boolean} is authentication in progress
 */
export let isAuthenticationInProgress = function() {
    return sessionState.isAuthenticationInProgress();
};

/**
 * property setter - defer to the state module.
 *
 * @param {Boolean} inProg - is authentication currently in progress.
 */
export let setAuthenticationInProgress = function( inProg ) {
    sessionState.setAuthenticationInProgress( inProg );
};

/**
 * responsible for choosing the appropriate authenticator logic to be used. resolve the promise with the
 * appropriate authenticator. This needs more work to account for the various authenticators....
 *
 * how do we get the list of authenticators? logic to pick which one?
 *
 * @return {Promise} returns a promise to be resolved once the correct authenticator is chosen.
 */
export let pickAuthenticator = function() {
    // determine how to "contribute" the different authenticators,
    if( _targetAuthenticator ) {
        // if an authenticator is already set, just use it.
        return AwPromiseService.instance.resolve( _targetAuthenticator );
    }

    var name;

    return cfgSvc.getCfg( 'solutionDef' ).then( function( solution ) {
        name = solution.authenticator;

        return cfgSvc.getCfg( 'authenticator' );
    } ).then( function( authenticators ) {
        if( _debug_logAuthActivity ) {
            logger.info( 'SM: pickAuthenticator: ' + name );
        }

        return declUtils.loadDependentModule( authenticators[ name ].dep );
    } ).then( function( module ) {
        if( !module ) {
            throw new Error( 'No authenticator provided!' );
        }

        return module.getAuthenticator();
    } ).then( function( authenticator ) {
        _targetAuthenticator = authenticator;

        return _targetAuthenticator;
    } );
};

// Sign out related functions/behavior

/**
 * logic to invoke the authenticator signOut functionality.
 *
 * @return {Promise} promise
 */
var callAuthSignOut = function() {
    if( _targetAuthenticator ) {
        return _targetAuthenticator.signOut().then( function() {
            exports.postSignOut();
        } ).catch( function() {
            // signOut error, but just continue the path
            logger.error( 'SM: authenticator signOut() err' );
            exports.postSignOut();
        } );
    }

    logger.error( 'SM:ERROR - processing signOut, but no Authenticator is available' );
};

/**
 * method to begin the session termination flow. Starts the signOut process.
 *
 * @return {Promise} promise
 */
export let terminateSession = function() {
    sessionStorage.clear(); // clearing the sessionStorage once session is terminated
    return exports.pickAuthenticator().then( function() {
        return callAuthSignOut();
    } );
};

/**
 * Wrapper function around the window location reset method to allow for unit test execution.
 *
 * Having a distinct method allows test logic to mock out the actual call.
 */
export let setLocationToDefault = function() {
    // need to reload the whole location, not just the $state() to refresh content.
    // Force a refresh of the page to clear memory.
    // This adds in security & memory leaks.
    // should go back to the default or startup page.  Use the base URL
    var base = location.origin + location.pathname + location.search;
    if( _targetAuthenticator && _targetAuthenticator.getPostSignOutURL ) {
        base = _targetAuthenticator.getPostSignOutURL();
        _suppressReload = true;
    }

    if( _debug_logAuthActivity ) {
        logger.info( 'SM: setLocationToDefault - target URL: ' + base );
    }

    exports.locationReplace( base );
};

/**
 * To support unit test, we need a wrapper function which can be mocked to support Jasmine unit tests.
 *
 * @param {String} url - URL to set.
 */
export let locationReplace = function( url ) {
    // eslint-disable-next-line no-debugger
    debugger;

    _suppressReload = true;
    location.replace( url );
};

/**
 * This is the post authenticator signOut stage. At this point there is no longer a valid session. Update state
 * and trigger refresh navigation.
 */
export let postSignOut = function() {
    exports.setAuthStatus( false );
    exports.setAuthenticationInProgress( false );
    localStrg.publish( 'signingOut', 'true' );
    setLocationToDefault();
};

localStrg.subscribe( 'signingOut', () => {
    setLocationToDefault();
} );

/**
 * this resolves the in-doubt state of the session, calls detection soa to see if there is a valid session or
 * not. If there is, continue navigation to target and mark session as authenticated. If no active session,
 * start the authentication processing.
 *
 * NOTE - this runs DURING initialization as part of the first state change, and the angular is not yet
 * initialized.
 *
 * @param {Object} navigationTarget - structure with data for the ui-router request.
 * @return {Promise} promise
 */
export let checkSessionValid = function( navigationTarget ) {
    _savedNavTarget = navigationTarget; // save for post auth.

    if( _debug_logAuthActivity ) {
        logger.info( 'SM: checkSessionValid: ' + 'navigationTarget=' + navigationTarget );
    }

    localStrg.removeItem( 'signingOut' );

    // 1) get the correct authenticator, then defer to the authenticator.
    //    SSO & userPW will share some of the getSessionInfo3 path for updating session details.
    // the pick authenticator will determine which of the authenticators to use.

    // the way pickAuthenticator is called from route resolve, we have to pass it the promise
    var deferred = AwPromiseService.instance.defer();

    exports.pickAuthenticator().then( function( authenticator ) {
        if( _debug_logAuthActivity ) {
            logger.info( 'SM: authenticator chosen' );
        }

        authenticator.checkIfSessionAuthenticated().then( function() {
            if( _debug_logAuthActivity ) {
                logger.info( 'SM: auth check Good! already authenticated' );
            }

            exports.setAuthStatus( true );

            var allStagesAuthenticated = postLgnPipeLneSvc.checkPostLoginAuthenticatedStages();

            if( allStagesAuthenticated ) {
                exports.runNavToState();
                eventBus.publish( 'authentication.complete', { status: 'OK' } );
            } else {
                exports.runPostLoginBlocking().then( function() {
                    exports.runNavToState();
                    eventBus.publish( 'authentication.complete', { status: 'OK' } );
                }, function() {
                    if( _debug_logAuthActivity ) {
                        logger.info( 'SM: end runPostLoginBlocking Stage - but ERROR' );
                    }

                    exports.runNavToState();
                    eventBus.publish( 'authentication.complete', { status: 'OK' } );
                } );
            }

            deferred.resolve();
        } ).catch( function( err ) {
            if( _debug_logAuthActivity ) {
                logger.info( 'SM: auth check exception: ' + '\n' + JSON.stringify( err, null, 2 ) + '\n' + ' SM: Go to "checkAuthentication" state' );
            }

            if( err && err.cause && err.cause.status === 500 ) {
                // "Internal Server Error" which typically means that this API isn't available on the server
                logger.error( err );
                window.location.replace( browserUtils.getBaseURL() + 'serverError.html' );
            }

            exports.setAuthenticationInProgress( true ); // indicator that in-process of authenticating

            AwStateService.instance.go( 'checkAuthentication' );
            eventBus.publish( 'authentication.complete', { status: 'Failed' } );

            deferred.resolve();
        } );
    }, function( err ) {
        logger.error( 'SM: Unable to pick an authenticator - serious configuration error!' );

        eventBus.publish( 'authentication.complete', { status: 'Failed' } );
        deferred.reject( err );
    } );

    return deferred.promise;
};

/**
 * Stage 2 of the authentication flow. Owned by the session manager.
 *
 * fires the session.signIn event
 *
 * used as the post authentication common flow. Mark the authentication state complete, continue with the login
 * flow/pipeline.
 *
 * @return {Promise} promise
 */
export let authenticationSuccessful = function() {
    exports.setAuthStatus( true );
    exports.setAuthenticationInProgress( false );

    if( _debug_logAuthActivity ) {
        logger.info( 'SM: authSuccessful, fire "session.signIn" event' );
    }

    // Used to fire this event ONLY for User/PW SOA call, fire it here for ALL authenticators
    // this is the point in the session state flow that the authentication is known to be OK.
    eventBus.publish( 'session.signIn', {} );

    // initial authentication is complete.  Let the authenticator do any initialization,
    // then see if there is postLogin pipeline content to be executed...
    return exports.runPostAuthInit().then( function() {
        if( _debug_logAuthActivity ) {
            logger.info( 'SM: runPostAuthInit Stage complete - continue to next Auth step' );
        }

        return exports.runPostLoginBlocking();
    } ).then( function() {
        return exports.runNavToState();
    } );
};

/**
 * Reset PipeLine while signing in
 */
export let resetPipeLine = function() {
    if( _debug_logAuthActivity ) {
        logger.info( 'SM: resetPipeLine' );
    }

    postLgnPipeLneSvc.resetPostLoginStages();
};

/**
 * next stage of the authentication path. This is a spot for the authenticator to run any specific logic. At
 * this point we've successfully authenticated and any specific initialization can be done.
 *
 * @return {Promise} a promise which is resolved when the authenticator initialization is complete.
 */
export let runPostAuthInit = function() {
    return exports.pickAuthenticator().then( function() {
        if( _debug_logAuthActivity ) {
            logger.info( 'SM: runPostAuthInit' );
        }

        analyticsSvc.authenticationSuccessful();

        return _targetAuthenticator ? _targetAuthenticator.postAuthInitialization() : AwPromiseService.instance.resolve();
    } );
};

/**
 * This function is responsible for invoking a single pipeline step definition.
 *
 * A step definition can either identify a route to run OR provide a work function. If the "routeName" is
 * provided, that takes precedence and that route will be called.
 *
 * The continuation promise is passed along to the route as part of the custom data structure with a member name
 * of "nextContinuation". for the work function, the promise is passed as a function argument.
 *
 * In either case, the route OR the work function MUST either resolve or reject the promise. Resolve path
 * continues pipeline execution, reject will immediately exit the pipeline and not invoke any of the remaining
 * tasks.
 *
 * @param {Object} stepDefn - a step definition for running a single contributed "step"
 * @param {Object} curIdx - index of the current step definition in the list
 * @param {Function} fOK - success function to invoke
 * @param {Function} fErr - error function to invoke
 */
var runOneStep = function( stepDefn, curIdx, fOK, fErr ) {
    // TODO - assert the inputs, non-null stepDefn, fOk & fErr are functions.

    if( _debug_logAuthActivity ) {
        logger.info( 'SM: running on steps for idx: ' + curIdx + ' name: ' + stepDefn.name );
    }

    // if not active, skip it altogether
    if( !stepDefn.active ) {
        if( _debug_logAuthActivity ) {
            logger.info( 'SM: not active, skipping step: ' + stepDefn.name );
        }

        fOK( curIdx );
    }

    // the stepPromise represents the continuation for the pipeline step.
    var stepPromise = AwPromiseService.instance.defer();

    stepPromise.promise.then( function() {
        if( _debug_logAuthActivity ) {
            logger.info( 'SM: done with pipeline Step continue. ' + stepDefn.name );
        }

        fOK( curIdx );
    }, function() {
        if( _debug_logAuthActivity ) {
            logger.info( 'SM: done with pipeline Step - REJECT ' + stepDefn.name );
        }

        fErr( curIdx );
    } );

    // branch to either routeName for a route, or call the workFunction
    if( stepDefn.routeName && stepDefn.routeName.length > 0 ) {
        // invoke the route
        var stName = stepDefn.routeName;

        var options = {
            notify: true, // notify must be true..
            location: false
        };

        var myState = AwStateService.instance.get( stName );

        // pass the continuation promise as custom data.
        if( myState ) {
            if( myState.data ) {
                myState.data.nextContinuation = stepPromise;
            } else {
                myState.data = {
                    nextContinuation: stepPromise
                };
            }
        }

        AwStateService.instance.go( stName, {}, options );
    } else {
        // call the work function
        if( stepDefn.workFunction ) {
            stepDefn.workFunction( stepDefn, stepPromise );
        } else {
            if( _debug_logAuthActivity ) {
                logger.info( 'SM: No work function, assume fOK path' );
            }

            fOK( curIdx );
        }
    }
};

/**
 * This is the pipeline execution stage - the session manager blocks on any post logic processes. This is a
 * configuration point to execute any contributed post authentication logic.
 *
 * The "postLoginPipeline" named contributions are used to obtain pipeline "step" definitions which identify the
 * logic or route to be run.
 *
 * @return {Promise} promise
 */
export let runPostLoginBlocking = function() {
    var postLogInPiplinePromise = AwPromiseService.instance.defer();

    // 1) get the list of contributors (0..n)
    // 2) get the stepDefinitions from each
    // 3) sort the stepDefinitions by priority value
    // 4) invoke each in order.  If one rejects then break the chain. ??? or NOT
    // 5) when all have run, then continue with the next stage step.

    contributionSvc.require( 'postLoginPipeline' ).then( function( contributors ) {
        if( contributors && contributors.length > 0 ) {
            var pipeLineSteps = postLgnPipeLneSvc.sortPostLoginPipeline( contributors );

            // iterate and call each step,
            // upon last one, continue the postLogInPiplinePromise
            if( pipeLineSteps && pipeLineSteps.length > 0 ) {
                var fNext = null;
                var fErr = null;

                fNext = function( compStepIdx ) {
                    pipeLineSteps[ compStepIdx ].status = true;

                    localStrg.publish( 'postLoginStagesKey', JSON.stringify( pipeLineSteps ) );

                    var nextIdx = compStepIdx + 1;

                    if( nextIdx >= pipeLineSteps.length ) {
                        // done with the last one,
                        if( _debug_logAuthActivity ) {
                            logger.info( 'SM: done with last step, continue post promise' );
                        }

                        postLogInPiplinePromise.resolve();
                    } else {
                        // run next one
                        runOneStep( pipeLineSteps[ nextIdx ], nextIdx, fNext, fErr );
                    }
                };

                fErr = function( compStepIdx ) {
                    // step failure, do we fail the pipeline, or continue with the other steps?
                    // could log the issue and fall into the fNext() ...
                    pipeLineSteps[ compStepIdx ].status = false;

                    localStrg.publish( 'postLoginStagesKey', JSON.stringify( pipeLineSteps ) );

                    if( _debug_logAuthActivity ) {
                        logger.info( 'SM: one of the steps had an error: ' + compStepIdx );
                    }

                    postLogInPiplinePromise.reject();
                };

                var pipeLineStepToExecute = null;
                var stepIndex = 0;

                for( ; stepIndex < pipeLineSteps.length; stepIndex++ ) {
                    // find the step that has status false
                    if( !pipeLineSteps[ stepIndex ].status ) {
                        pipeLineStepToExecute = pipeLineSteps[ stepIndex ];
                        break;
                    }
                }

                // start running the steps if step to execute is not null
                if( pipeLineStepToExecute ) {
                    runOneStep( pipeLineStepToExecute, stepIndex, fNext, fErr );
                } else {
                    // this means all steps have been successfully executed. resolve the promise
                    postLogInPiplinePromise.resolve();
                }
            } else {
                // no pipeLine steps, continue on.
                postLogInPiplinePromise.resolve();
            }
        } else {
            // no contributors
            postLogInPiplinePromise.resolve();
        }
    }, function() {
        // some reject on the contribution service - continue on.
        logger.error( 'SM: contribution service error for postLoginPipeline' );

        postLogInPiplinePromise.resolve();
    } );

    // the full pipeline promise - when all step definition handlers have completed.
    return postLogInPiplinePromise.promise;
};

/**
 * This is the final authentication stage. At this point all handlers have run, the authenticator has done it's
 * initialization, we can now navigate to the desired target state.
 */
export let runNavToState = function() {
    if( _savedNavTarget ) {
        if( _debug_logAuthActivity ) {
            logger.info( 'SM: runNavToState Stage - redirect to original target: ' + _savedNavTarget.toState );
        }

        AwStateService.instance.go( _savedNavTarget.toState, _savedNavTarget.toParams, _savedNavTarget.options );
    } else {
        logger.error( 'SM: post auth, runNavToState - NO saved Nav Target!!' );
        // what to do in this situation?  what is the "default" state?
    }
};

/**
 * location reload
 */
function reload() {
    if( !_suppressReload ) {
        location.reload( false );
    }
}

/**
 * init set up for localStorage
 */
export let initLocalStorage = function() {
    /**
     * Setup to listed to changes in any associated browser's session state.
     */
    localStrg.subscribe( 'awSession', reload );
};

export let reset = function() {
    _targetAuthenticator = null;
};

// No dependency on appCtxService, but need the service initialized for event registration

/**
 * Since this module can be loaded GWT-side by the ModuleLoader class we need to return an object indicating
 * which service should be injected to provide the API for this module.
 */
exports = {
    setAuthStatus,
    getAuthStatus,
    isAuthenticationInProgress,
    setAuthenticationInProgress,
    pickAuthenticator,
    terminateSession,
    setLocationToDefault,
    locationReplace,
    postSignOut,
    checkSessionValid,
    authenticationSuccessful,
    resetPipeLine,
    runPostAuthInit,
    runPostLoginBlocking,
    runNavToState,
    initLocalStorage,
    reset
};
export default exports;

initLocalStorage();

// setup analytics profiler.
splmStatsService.initProfiler();

/**
 * The native session manager service. This is the coordination/orchestration component which manages the
 * authentication state and authentication processing for signIn and signOut session behavior. The chosen
 * Authenticator performs the actual mechanics of any authentication.
 *
 * @class sessionManagerService
 * @memberof NgServices
 */
app.factory( 'sessionManagerService', () => exports );

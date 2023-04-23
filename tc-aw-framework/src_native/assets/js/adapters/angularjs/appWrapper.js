// Copyright (c) 2020 Siemens
/* eslint-env es6 */

/**
 * This module provides APIs common to initialize and interact with AngularJS-based application modules.
 *
 *
 * @module app
 */
import _ from 'lodash';
import Debug from 'Debug';
import browserUtils from 'js/browserUtils';
import logger from 'js/logger';
import ngModule from 'angular';
import ngTemplateCache from 'js/angulartemplatecache';
import locationDecorator from 'js/location.decorator';
import awConfiguration from 'js/awConfiguration';

var trace = new Debug( 'appWrapper' );

/**
 * Sets the number of `$digest` iterations the scope should attempt to execute before giving up and assuming that
 * the model is unstable.
 * <P>
 * The current OOTB default is 10 iterations.
 * <P>
 * Note: In complex applications it's possible that the dependencies between `$watch`s will result in several digest
 * iterations. However if an application needs more than the default 10 digest iterations for its model to stabilize
 * then you should investigate what is causing the model to continuously change during the digest.
 *
 * Increasing the TTL could have performance implications, so you should not change it without proper justification.
 *
 * {Number} The maximum number of digest iterations to attempt.
 */
var _MAX_DIGEST_CYCLES = 12;

/**
 * The relative path from the root of the deployed war file to all modules and resources used by this application
 * module (e.g. 'assets').
 *
 * @private
 */
var _baseUrlPath = '';

/**
 * A cached reference to the AngularJS $injector service.
 */
var _injector;

/**
 * The '.QName' value of an 'invalid user' exception from an SOA operation.
 *
 * @private
 */
var _exceptionQName = 'http://teamcenter.com/Schemas/Soa/2006-03/Exceptions.InvalidUserException';

/**
 * Cache of 'controller' implementations registered before AngularJS was fully initialized.
 * <P>
 * Note: When using the Karma test runner, there is no starting 'bootstrap' module to control the guaranteed order
 * of initial module loading. So controller (et al.) may need to be registered from different modules as they load
 * __before__ the AngularJS application module has been fully configured and initialized.
 * <P>
 * To address this, we hold onto implementations registered via the 'controller', 'directory' and 'factory' calls
 * until Angular has fully started up.
 *
 * @private
 */
var _pendingControllers = [];

/**
 * Cache of 'directive' implementations registered before AngularJS was fully initialized (see note above).
 *
 * @private
 */
var _pendingDirectives = [];

/**
 * Cache of 'component' implementations registered before AngularJS was fully initialized (see note above).
 *
 * @private
 */
var _pendingComponents = [];

/**
 * Cache of 'factory' service implementations registered before AngularJS was fully initialized (see note above).
 *
 * @private
 */
var _pendingFactories = [];

/**
 * Cache of 'filter' implementations registered before AngularJS was fully initialized (see note above).
 *
 * @private
 */
var _pendingFilters = [];

/**
 * Cache of 'service' implementations registered before AngularJS was fully initialized (see note above).
 *
 * @private
 */
var _pendingServices = [];

/**
 * Cache of 'constant' implementations registered before AngularJS was fully initialized (see note above).
 *
 * @private
 */
var _pendingConstants = [];

/**
 * Reference to the AngularJS application module last created by a call to 'initModule'.
 *
 * Create sveral mock method here for handle the registation before AngularJS was fully initialized (see not above)
 *
 * @private
 */
var _appModule = {
    controller: function( name, impl ) {
        // trace( 'controller:queue:verbose', arguments );
        _pendingControllers.push( {
            name: name,
            impl: impl
        } );
    },
    directive: function( name, impl ) {
        // trace( 'directive:queue:verbose', arguments );
        _pendingDirectives.push( {
            name: name,
            impl: impl
        } );
    },
    component: function( name, impl ) {
        // trace( 'component:queue:verbose', arguments );
        _pendingComponents.push( {
            name: name,
            impl: impl
        } );
    },
    filter: function( name, impl ) {
        // trace( 'filter:queue:verbose', arguments );
        _pendingFilters.push( {
            name: name,
            impl: impl
        } );
    },
    factory: function( name, impl ) {
        // trace( 'factory:queue:verbose', arguments );
        _pendingFactories.push( {
            name: name,
            impl: impl
        } );
    },
    service: function( name, impl ) {
        // trace( 'service:queue:verbose', arguments );
        _pendingServices.push( {
            name: name,
            impl: impl
        } );
    },
    constant: function( name, impl ) {
        // trace( 'constant:queue:verbose', arguments );
        _pendingConstants.push( {
            name: name,
            impl: impl
        } );
    }
};

/**
 * Setup to intercept an 'invalid user' SOA exception seen during login and to avoid it causing an exception to be
 * logged.
 *
 * @param {Object} $provide - Reference to the AngularJS '$provide' service.
 */
var _setupExceptionHandler = function( $provide ) {
    $provide.factory( 'exceptionLoggingService', [ '$log', function( $log ) {
        /**
         * Handles all exceptions.
         *
         * @param {Exception} exception - The exception to handle.
         */
        function _error( exception ) {
            trace( 'exception', exception );
            var invalidUserSession = exception && exception.cause && exception.cause[ '.QName' ] === _exceptionQName;
            var ngAriaDoesNotExist = exception && exception.stack && _.includes( exception.stack, 'ngAria' );

            if( !invalidUserSession && !ngAriaDoesNotExist ) {
                $log.error.apply( $log, arguments );
            }
        }

        return _error;
    } ] );

    $provide.provider( '$exceptionHandler', {
        $get: [ 'exceptionLoggingService', function( exceptionLoggingService ) {
            return exceptionLoggingService;
        } ]
    } );
};

/**
 * Register any pending injectable implementations to the (now) initialized AngularJS application module.
 * <P>
 * Note: We want to keep the pending injectable around in case AngularJS gets initialized multiple time (which
 * happens for each 'beforeEach( module('xxxx') )' during Jasmine/Karma testing)
 *
 * @private
 * @param {Object} app - AngularJS service.
 */
var _setupPendingInjectables = function( app ) {
    _.forEach( _pendingControllers, function( pending ) {
        app.controller( pending.name, pending.impl );
    } );

    _.forEach( _pendingDirectives, function( pending ) {
        app.directive( pending.name, pending.impl );
    } );

    _.forEach( _pendingComponents, function( pending ) {
        app.constant( pending.name, pending.impl );
    } );

    _.forEach( _pendingFactories, function( pending ) {
        app.factory( pending.name, pending.impl );
    } );

    _.forEach( _pendingFilters, function( pending ) {
        app.filter( pending.name, pending.impl );
    } );

    _.forEach( _pendingServices, function( pending ) {
        app.service( pending.name, pending.impl );
    } );

    _.forEach( _pendingConstants, function( pending ) {
        app.constant( pending.name, pending.impl );
    } );
};

/**
 * Utility function to prefix the base app url path to the templateUrl from the route.
 *
 * @param {String} templateUrl - The base URL to inflate.
 *
 * @returns {String} URL to current template.
 */
var _inflateTemplateUrlPath = function( templateUrl ) {
    var result = templateUrl;
    if( templateUrl ) {
        // do we need to check if the base path is already there?
        result = getBaseUrlPath() + templateUrl;
    }
    return result;
};

/**
 * Adds an AngularJS 'controller' definition to this application.
 *
 * @param {String} name - Name of the 'controller' being registered.
 * @param {Function} impl - Function that implements the 'controller'.
 */
export let controller = function( name, impl ) {
    _appModule.controller( name, impl );
};

/**
 * Adds an AngularJS 'directive' definition to this application.
 *
 * @param {String} name - Name of the 'directive' being registered.
 * @param {Function} impl - Function that returns the 'directive' definition object.
 */
export let directive = function( name, impl ) {
    _appModule.directive( name, impl );
};

/**
 * Adds an AngularJS 'component' definition to this application.
 *
 * @param {String} name - Name of the 'directive' being registered.
 * @param {Function} impl - Function that returns the 'directive' definition object.
 */
export let component = function( name, impl ) {
    _appModule.component( name, impl );
};

/**
 * Adds an AngularJS 'filter' definition to this application.
 *
 * @param {String} name - Name of the 'filter' being registered.
 * @param {Function} impl - Function that implements the 'filter'.
 */
export let filter = function( name, impl ) {
    _appModule.filter( name, impl );
};

/**
 * Adds an AngularJS injectable 'service' definition to this application.
 *
 * @param {String} name - Name of the 'service' being registered.
 * @param {Function} impl - Function that implements the 'service'.
 */
export let factory = function( name, impl ) {
    _appModule.factory( name, impl );
};

/**
 * Adds an AngularJS injectable 'service' for this application.
 *
 * @param {String} name - Name of the 'service' being registered.
 * @param {Function} impl - Function that implements the 'service'.
 */
export let service = function( name, impl ) {
    _appModule.service( name, impl );
};

/**
 * Adds an AngularJS injectable 'constant' for this application.
 *
 * @param {String} name - Name of the 'constant' being registered.
 * @param {Object} impl - The constant object.
 */
export let constant = function( name, impl ) {
    _appModule.constant( name, impl );

    // Beyond Angular Service Conversion - add constant to configurationService
    awConfiguration.set( name, impl );
};

/**
 * Load configration before AngularJS initialized.
 *
 * @param {String} name - Name of the 'constant' being registered.
 * @param {Object} impl - The constant object.
 */
function loadConfiguration() {
    /**
     * Set default Paste Handler Configuration
     */
    let defaultPasteHandlerConfiguration = '{{defaultPasteHandlerConfiguration}}';
    awConfiguration.set( 'defaultPasteHandlerConfiguration', defaultPasteHandlerConfiguration );

    /**
     * Set default drag and drop Handler Configuration
     */
    let defaultDragAndDropHandlers = '{{defaultDragAndDropHandlers}}';
    awConfiguration.set( 'defaultDragAndDropHandlers', defaultDragAndDropHandlers );

    /**
     * Place holder for image repository Configuration
     */
    let imageRepositoryConfiguration = '{{imageRepositoryConfiguration}}';
    awConfiguration.set( 'imageRepositoryConfiguration', imageRepositoryConfiguration );
}

/**
 * Create and initialize an AngularJS application module.
 *
 * @param {String} appModuleName - Name of the new AngularJS application module to create and initialize.
 * @param {String[]} depModules - Array of module names to the application is dependent upon (if any).
 * @param {Boolean} doBoostrap - TRUE if the 'bootstrap' function on the application module should be invoked before
 *            returning.
 * @param {String} defBaseUrlPath - The default relative path from the root of the deployed war file to all modules
 *            and resources used by this application module (e.g. 'assets').
 * @param {null|Object} routesConfig - An optional module reference where a 'route definition' object is defined and
 *            which is used to registers all AngularJS routing needed for the application (or NULL if not needed).
 * @param {null|Object} routeChangeHandler - route change handler
 *
 * @returns {AngularModule} A reference to a new AngularJS module that has been configured and optionally bootstraped.
 */
export let initModule = function( appModuleName, depModules, doBoostrap, defBaseUrlPath, routesConfig,
    routeChangeHandler ) {
    /**
     * Check if this is a supported browser (and load a 'incompatible browser' page if not).
     */
    browserUtils.checkSupport();

    // Start up the AngularJS application module.
    _appModule = ngModule.module( appModuleName, depModules );

    /**
     * Set default Paste Handler Configuration
     */
    _appModule.constant( 'defaultPasteHandlerConfiguration', awConfiguration.get( 'defaultPasteHandlerConfiguration' ) );

    /**
     * Set default drag and drop Handler Configuration
     */
    _appModule.constant( 'defaultDragAndDropHandlers', awConfiguration.get( 'defaultDragAndDropHandlers' ) );

    /**
     * Place holder for image repository Configuration
     */
    _appModule.constant( 'imageRepositoryConfiguration', awConfiguration.get( 'imageRepositoryConfiguration' ) );

    // Define angular constants
    if( routesConfig ) {
        _appModule.constant( 'defaultRoutePath', routesConfig.defaultRoutePath );
        awConfiguration.set( 'defaultRoutePath', routesConfig.defaultRoutePath );
    }

    // Set common passed in and URL-based state properties.
    _baseUrlPath = defBaseUrlPath;

    if( routesConfig ) {
        trace( 'routesConfig', routesConfig );
        _appModule.config( [
            '$stateProvider',
            '$urlRouterProvider',
            '$locationProvider',
            '$controllerProvider',
            '$compileProvider',
            '$filterProvider',
            '$provide',
            '$httpProvider',
            '$rootScopeProvider',
            function( $stateProvider, $urlRouterProvider, $locationProvider, $controllerProvider, $compileProvider,
                $filterProvider, $provide, $httpProvider, $rootScopeProvider ) {
                $locationProvider.hashPrefix( '' );

                wrapAngularJS( $controllerProvider, $compileProvider, $filterProvider, $provide, $rootScopeProvider );

                // B-05531 Security fix for CSRF
                // https://gist.github.com/mlynch/be92735ce4c547bd45f6
                $httpProvider.defaults.withCredentials = true;

                // Make the $stateProvider accessible at runtime
                $provide.service( '$stateProvider', [ function() {
                    var self = this; // eslint-disable-line no-invalid-this
                    self.state = $stateProvider.state;
                } ] );

                $provide.decorator( '$location', locationDecorator );

                /**
                 * Set up application URL routing
                 */
                if( routesConfig.routes ) {
                    ngModule.forEach( routesConfig.routes, function( route, path ) {
                        // inflate the base path if needed
                        route.templateUrl = _inflateTemplateUrlPath( route.templateUrl );
                        $stateProvider.state( path, route );
                    } );
                }

                if( routesConfig.defaultRoutePath ) {
                    $urlRouterProvider.otherwise( function( $injector ) {
                        var $location = $injector.get( '$location' );
                        var $state = $injector.get( '$state' );
                        if( $location.path() ) {
                            var tokens = $location.path().split( ';' );
                            if( tokens.length > 1 ) {
                                var state = tokens[ 0 ].slice( 1 ).replace( /\./g, '_' );
                                var params = {};
                                for( var i = 1; i < tokens.length; i++ ) {
                                    var subTokens = tokens[ i ].split( '=' );
                                    if( subTokens.length === 2 ) {
                                        // Custom decoding from GWT - double encoded, '=' replaced with \2
                                        params[ subTokens[ 0 ] ] = decodeURIComponent(
                                            decodeURIComponent( subTokens[ 1 ] ) ).replace( /\\2/g, '=' );
                                    }
                                }
                                return $state.go( state, params, {
                                    location: 'replace' // update the old url in history
                                } );
                            }
                            // Go to error location if url not found
                            return $state.go( 'errorSubLocation' );
                        }
                        // Go to default location if no url. Also, pass the flag so that validation can be
                        // performed (whether default route path has been changed) before actual navigation
                        return $state.go( $injector.get( 'defaultRoutePath' ), {
                            validateDefaultRoutePath: 'true'
                        }, {
                            location: 'replace'
                        } );
                    } );
                }
            }
        ] );
    } else {
        _appModule.config( [ '$controllerProvider', '$compileProvider', '$filterProvider', '$provide', '$rootScopeProvider', wrapAngularJS ] );
    }
    // Load a map of all HTML templates.
    if( ngTemplateCache ) {
        _appModule.run( [ '$templateCache', function( $templateCache ) {
            ngTemplateCache.init( $templateCache );
        } ] );
    }
    /**
     * When there are routes, register the state change handler
     *
     * @param {Object} $rootScope - AngularJS top $scope.
     */
    if( routesConfig && routeChangeHandler ) {
        _appModule.run( [
            '$rootScope',
            function( $rootScope ) {
                $rootScope.$on( '$stateChangeStart', function( event, toState, toParams, fromState, fromParams,
                    options ) {
                    // invoke the contributed state change handler.  Expected function name
                    if( !_injector ) {
                        var docNgElement = ngModule.element( document.body );
                        _injector = docNgElement.injector();
                        if( !_injector ) {
                            _injector = ngModule.injector( [ 'ng' ] );
                        }
                    }

                    routeChangeHandler.routeStateChangeStart( event, toState, toParams, fromState, fromParams,
                        options );
                } );

                $rootScope.$on( '$stateNotFound', function( event, unfoundState ) {
                    logger.warn( '$stateNotFound error: ', unfoundState );
                    if( _injector ) {
                        var $state = _injector.get( '$state' );
                        $state.go( 'errorSubLocation' );
                    }
                } );

                $rootScope.$on( '$stateChangeError', function( event, toState, toParams, fromState, fromParams,
                    error ) {
                    // If a string error message is provided show it to user with noty
                    if( typeof error === 'string' && _injector ) {
                        import( 'js/NotyModule' ).then( function() {
                            var notyService = _injector.get( 'notyService' );
                            notyService.showInfo( error );
                        } );
                    } else {
                        // Otherwise just log to the console
                        logger.error( '$stateChangeError error: ', error );
                    }
                } );

                $rootScope.$on( '$stateChangeSuccess', function( event, toState, toParams, fromState, fromParams ) {
                    routeChangeHandler.routeStateChangeSuccess( event, toState, toParams, fromState, fromParams );
                } );
            }
        ] );
    }

    if( doBoostrap ) {
        ngModule.bootstrap( document, [ appModuleName ], {
            strictDi: true
        } );
    }

    _injector = ngModule.element( document ).injector();

    // Query solution's browser title & set document.title
    if( _injector ) { // not set when run from Karma
        import( 'js/configurationService' ).then( function() {
            _injector.get( 'configurationService' ).getCfg( 'solutionDef' ).then( function( solution ) {
                if( solution && solution.browserTitle ) {
                    document.title = solution.browserTitle;
                }
            } );
        } );

        var $window = _injector.get( '$window' );
        var $rootScope = _injector.get( '$rootScope' );
        $window.addEventListener( 'resize', _.debounce( function( event ) {
            $rootScope.$broadcast( 'windowResize', event );
        }, 200 ) );
    }

    return _appModule;
};

/**
 * Cache references to common AngularJS services.
 * Call stack:
 * - bootstrap
 *   - initModule
 *     - wrapAngularJS
 *
 * @param {Object} $controllerProvider - $controllerProvider
 * @param {Object} $compileProvider    - $compileProvider
 * @param {Object} $filterProvider     - $filterProvider
 * @param {Object} $provide            - $provide
 * @param {Object} $rootScopeProvider  - $rootScopeProvider
 */
function wrapAngularJS( $controllerProvider, $compileProvider, $filterProvider, $provide, $rootScopeProvider ) {
    _appModule.controller = function() {
        trace( 'controller:verbose', arguments );
        return $controllerProvider.register.apply( this, arguments );
    };
    _appModule.directive = function() {
        trace( 'directive:verbose', arguments );
        return $compileProvider.directive.apply( this, arguments );
    };
    _appModule.component = function() {
        trace( 'component:verbose', arguments );
        return $compileProvider.component.apply( this, arguments );
    };
    _appModule.filter = function() {
        trace( 'filter:verbose', arguments );
        return $filterProvider.register.apply( this, arguments );
    };
    _appModule.factory = function() {
        trace( 'factory:verbose', arguments );
        return $provide.factory.apply( this, arguments );
    };
    _appModule.service = function() {
        trace( 'service:verbose', arguments );
        return $provide.service.apply( this, arguments );
    };
    _appModule.constant = function() {
        trace( 'constant:verbose', arguments );
        return $provide.constant.apply( this, arguments );
    };

    $rootScopeProvider.digestTtl( _MAX_DIGEST_CYCLES );

    _setupPendingInjectables( _appModule );
    _setupExceptionHandler( $provide );
}

/**
 * Get the base url path.
 *
 * @returns {String} The relative path from the root of the deployed war file to all modules and resources used by
 *          this application module (e.g. 'assets').
 */
export let getBaseUrlPath = function() {
    return _baseUrlPath;
};

/**
 * Get a reference to the AngularJS App's '$injector'.
 *
 * @returns {Object} The service API (or false).
 */
export let getInjector = function() {
    if( _injector ) {
        return _injector;
    }

    return {
        get: function( moduleName ) {
            logger.error( 'AngularJS injector is not available. Module not injected: ' + moduleName );
        }
    };
};

/**
 * Set the base url path.
 *
 * @param {String} url - The relative path from the root of the deployed war file to all modules and resources used
 *            by this application module (e.g. 'assets'). .
 */
export let setBaseUrlPath = function( url ) {
    _baseUrlPath = url;
};

/**
 * Flag to change some internal logic to make it testable
 */
export let isTestMode = false;

export default {
    getInjector,
    service,
    directive,
    controller,
    component,
    filter,
    isTestMode,
    factory,
    getBaseUrlPath,
    setBaseUrlPath,
    constant,
    initModule,
    wrapAngularJS
};

// Load configuratino intermediately
loadConfiguration();

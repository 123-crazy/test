// Copyright 2022 Siemens Product Lifecycle Management Software Inc.

/* global afxDynamicImport QWebChannelSync qt embedConfigDetails */

/**
 * This module provides basic hosting startup-level shared functionality APIs.
 *
 * @module js/hosting/hostSupportService
 * @namespace hostSupportService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import hostInteropSvc from 'js/hosting/hostInteropService';
import _ from 'lodash';
import $ from 'jquery';
import browserUtils from 'js/browserUtils';
import eventBus from 'js/eventBus';
import cfgSvc from 'js/configurationService';
import hostServices from 'js/hosting/hostConst_Services';
// import hostLogging from 'js/hosting/hostLogging';
import logger from 'js/logger';
import 'config/hosting';

// eslint-disable-next-line valid-jsdoc

var urlAttributes = browserUtils.getUrlAttributes();

/**
 * {Boolean} TRUE if ... should be logged.
 */
var _debug_logHandShakeActivity = urlAttributes.logHandShakeActivity !== undefined;

/**
 * {Boolean} TRUE if the 'host' be allowed to handle SOA requests if it also supports the required services.
 * FALSE if only the 'client' should handle SOA requests.
 */
var _soaSupportEnabled = true;

/**
 * Perform an async load of the given collection of modules and have them register any of their
 * contributions.
 *
 * @param {StringArray} modulesToLoad - Array of module names to load async.
 *
 * @returns {Promise} Resolved with an array of service references that have an 'initialize' function that must be called
 * once 'handshake' and 'configuration' phases are complete.
 */
function _loadAndRegisterModules( modulesToLoad ) {
    var deferred = AwPromiseService.instance.defer();

    var servicesToInitialize = [];

    afxDynamicImport( modulesToLoad, function() {
        _.forEach( arguments, function( hostSvc ) {
            if( hostSvc ) {
                if( hostSvc.registerHostingModule ) {
                    hostSvc.registerHostingModule();
                }

                if( hostSvc.initialize ) {
                    servicesToInitialize.push( hostSvc );
                }
            }
        } );

        deferred.resolve( servicesToInitialize );
    } );

    return deferred.promise;
}

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * This function is called by the client-side service to log a message back at the host.
 *
 * @memberof hostSupportService
 *
 * @param {String} message - Text of message to log back on the 'host'.
 */
export let log = function( message ) {
    hostInteropSvc.log( message );
};

/**
 * Setup the hosting layer now in the 'bootstrap' phase of the application starting up.
 *
 * @memberof hostSupportService
 */
export let postInit = function() {
    // await hostLogging.addHostingLogging();
    /**
     * Check if we are being hosted within a QT/Chromium-based browser.
     * <P>
     * If so: We need to be sure it is fully initialized. To do that, we async load an QT-supplied module
     * and create a 'QWebChannelSync' object provided by that module. Ths object's <CTOR> callback assures
     * QT is fully started up. We then proceed to start the official 'handShake' phase.
     * <P>
     * If not: We are NOT in QT...Start the official 'handShake' phase assuming we are in a 'default'
     * browser.
     * <P>
     * Note: In the future (aw4.x?) this type browser-specific code should be contributed via JSON
     * configuration. However, when its the 1st instance, its hard to know the correct long-term pattern. QT
     * may be picked up by other hosts and SPLM has bought into it. So, good enough for aw4.1.
     */
    if( typeof qt !== 'undefined' ) {
        browserUtils.attachScriptToDocument( 'qrc:///qtwebchannel/qwebchannel.js', function() {
            /**
             * Check if the required 'qwebchannel' was found and that 'QWebChannelSync' is defined.
             * <P>
             * If so: Wait for it to tell use we are ready to talk.
             * <P>
             * If not: Just proceed with the 'handshake' phase normally (assuming we are using an older
             * QT version).
             */
            if( QWebChannelSync ) {
                new QWebChannelSync( qt.webChannelTransport, // eslint-disable-line no-undef
                    function( channel ) {
                        window.external = channel.objects.external;

                        if( typeof embedConfigDetails !== 'undefined' && embedConfigDetails !== null ) {
                            embedConfigDetails();
                        }

                        exports.initiateHostHandShake().then( function() {
                            appCtxSvc.registerCtx( 'aw_hosting_enabled', true );
                        }, function( err ) {
                            hostInteropSvc.log( 'postInit: ' + 'QT' + ' ' + 'failed' + '\n' + err );
                        } );
                    } );
            } else {
                exports.initiateHostHandShake().then( function() {
                    appCtxSvc.registerCtx( 'aw_hosting_enabled', true );
                }, function( err ) {
                    hostInteropSvc.log( 'postInit: ' + 'default' + ' ' + 'failed' + '\n' + err );
                } );
            }
        } );
    } else {
        exports.initiateHostHandShake().then( function() {
            appCtxSvc.registerCtx( 'aw_hosting_enabled', true );
        }, function( err ) {
            hostInteropSvc.log( 'postInit: ' + 'default' + ' ' + 'failed' + '\n' + err );
        } );
    }
};

/**
 * Begin host-side handshake that will cause the exchange of available services.
 * <P>
 * Note: This function is not meant to be called outside of 'postInit'. It is visible externally to aid in
 * automated testing.
 *
 * @memberof hostSupportService
 * @private
 *
 * @return {Promise} Resolved (with a simple text message) when the handshake phase is complete.
 */
export let initiateHostHandShake = function() {
    var deferred = AwPromiseService.instance.defer();

    var initialServicesToInit = [];

    /**
     * Setup to be told when handshake 'startup' (and then 'configured') steps are completed (or failed)
     */
    eventBus.subscribe( 'hosting.startup', function( success ) {
        if( _debug_logHandShakeActivity ) {
            hostInteropSvc.log( 'initiateHostHandShake: ' + 'hosting.startup: success=' + success );
        }

        if( success ) {
            /**
             * Load (and register) other 'contributed' hosting modules (services, et al.)
             * <P>
             * Note: Any of these modules may be optional based on specific host-client configuration.
             */
            var otherModulesToLoad = [];

            var hostingConfig = cfgSvc.getCfgCached( 'hosting' );

            _.forEach( hostingConfig.postHandshakeModules, function( moduleDef ) {
                otherModulesToLoad.push( moduleDef.module );
            } );

            _loadAndRegisterModules( otherModulesToLoad ).then( function( servicesToInit ) {
                /**
                 * Make sure any basic hosting services are ready to process eventBus activity (if needed).
                 */
                var promises = [];

                /**
                 * Make sure contributed services are also ready to process eventBus activity (if needed).
                 */
                _.forEach( initialServicesToInit, function( hostSvc ) {
                    promises.push( initializeWrap( hostSvc ) );
                } );

                _.forEach( servicesToInit, function( hostSvc ) {
                    promises.push( initializeWrap( hostSvc ) );
                } );

                /**
                 * Wait for all the 'initialze' functions to complete.
                 */
                AwPromiseService.instance.all( promises ).then( function() {
                    initialServicesToInit = null; // Remove any refs to services (to be nice)

                    /**
                     * We are done with the client-half of the handshake startup. Start to get host
                     * configuration options.
                     */
                    deferred.resolve( 'Hosting handshake completed' );
                } );
            } );
        } else {
            deferred.reject( 'Hosting handshake failed' );
        }

        if( _debug_logHandShakeActivity ) {
            eventBus.subscribe( 'hosting.configured', function() {
                hostInteropSvc.log( 'initiateHostHandShake: ' + 'hosting.configured' );
            } );
        }
    } );

    /**
     * Set the CTX flag for 'embeddedLocationView' if it is included in the URL used to launch AW.
     */
    if( urlAttributes.embeddedLocationView && urlAttributes.embeddedLocationView.trim().toLowerCase() === 'true' ) {
        appCtxSvc.registerCtx( 'embeddedLocationView', true );
    }

    /**
     * Load (and register) the 'initial' hosting modules (services, et al.).
     */
    var initialModulesToLoad = hostInteropSvc.loadClientConfiguration();

    _loadAndRegisterModules( initialModulesToLoad ).then( function( servicesToInitRet ) {
        initialServicesToInit = servicesToInitRet;

        /**
         * Tell the host that we are setup and ready to start the 'handshake' phase.
         */
        hostInteropSvc.startHostHandShake().then( function() {
            if( _debug_logHandShakeActivity ) {
                hostInteropSvc.log( 'initiateHostHandShake: ' + 'startHostHandShake: ' + 'success' );
            }
        }, function( err ) {
            if( _debug_logHandShakeActivity ) {
                hostInteropSvc.log( 'initiateHostHandShake: ' + 'startHostHandShake: ' + 'failed' + '\n' + err );
            }

            deferred.reject( err );
        } );
    } );

    return deferred.promise;
};

/**
 * Wrap the calls to the service initialize to ensure that it doesn't break host init overall & that we report any caught exceptions.
 * 
 * @param {Object} svc - service to initialize
 * @returns {Promise} promise
 */
function initializeWrap( svc ) {
    try{
        return svc.initialize();
    }catch( err ) {
        logger.error( err );
    }
}

/**
 * Determine if the 'host' supports sending SOA requests back-n-forth through it.
 *
 * @returns {Boolean} TRUE if the 'host' supports sending SOA requests through it.
 */
export let isSoaEnabled = function() {
    return _soaSupportEnabled &&
        hostInteropSvc.isHostServiceAvailable(
            hostServices.HS_ASYNC_SOA_JSON_MESSAGE_SVC,
            hostServices.VERSION_2014_02 );
};

/**
 * @param {Boolean} enabled - TRUE if the 'host' be allowed to handle SOA requests if it also supports the
 * required services. FALSE if only the 'client' should handle SOA requests.
 */
export let setSoaSupportEnabled = function( enabled ) {
    _soaSupportEnabled = enabled;

    appCtxSvc.registerCtx( 'aw_hosting_soa_support_checked', false );
};

/**
 * Use jquery to append the custom css file for component locations to the document header
 *
 * @param {Boolean} embeddedLocationView - TRUE if the 'embedded' (no 'chrome') state should be set.
 */
export let setEmbeddedLocationView = function( embeddedLocationView ) {
    /**
     * Check if we have NOT already included the CSS
     */
    var cssInclude = $( 'link[href$="component-location-overlay.css"]:first' );

    if( embeddedLocationView ) {
        if( !cssInclude.length ) {
            $( '<link href="' + app.getBaseUrlPath() + '/css/component-location-overlay.css" type="text/css" rel="stylesheet" />' ).insertAfter( 'link[href$="/main.css"]:first' );
        }

        /**
         * Set the context that controls other things.
         */
        appCtxSvc.registerCtx( 'embeddedLocationView', true );
    } else {
        if( cssInclude.length ) {
            cssInclude.remove();
        }

        /**
         * Set the context that controls other things.
         */
        appCtxSvc.unRegisterCtx( 'embeddedLocationView' );
    }
};

export default exports = {
    log,
    postInit,
    initiateHostHandShake,
    isSoaEnabled,
    setSoaSupportEnabled,
    setEmbeddedLocationView
};
/**
 * Register this service with AngularJS.
 *
 * @memberof NgServices
 * @member hostSupportService
 */
app.factory( 'hostSupportService', () => exports );

/**
 * Disable support for PointerEvents since HammerJS does not work correctly with a browser that is being wrapped by
 * a host (that does not pass along these type events).
 * <P>
 * Note: This code must be run BEFORE HammerJS is loaded since the event support flag is checked and set during its
 * loading phase (via a self executing function).
 * <P>
 * To maintain compatibility in a hosted RAC (et al.) using IE10+ we have to drop support for 'pointer' event. This
 * will cause only mouse events to be passed to the Hammer APIs. The SWT Browser cannot pass pointer event along to
 * the browser, only mouse events.
 * <P>
 * D-14536 - Hosting: Selection of AW items in RAC host is broken.
 */
if( window.PointerEvent ) {
    delete window.PointerEvent;
}
if( window.webkitPointerEvent ) {
    delete window.webkitPointerEvent;
}
if( window.mozPointerEvent ) {
    delete window.mozPointerEvent;
}
if( window.MSPointerEvent ) {
    delete window.MSPointerEvent;
}
if( window.msPointerEvent ) {
    delete window.msPointerEvent;
}
if( window.oPointerEvent ) {
    delete window.oPointerEvent;
}

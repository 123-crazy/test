// Copyright (c) 2020 Siemens

/* global San */

/**
 * This is the analytics service. It manages enablement & logging of messages to a backend analytics logging server.
 *
 * For more information about Siemens Analytics:
 * <ul>
 * <li>http://bitools.net.plm.eds.com/wiki/analytics:user_information</li>
 * <li>http://bitools.net.plm.eds.com/wiki/analytics:devguide:javascript_client</li>
 * </ul>
 *
 * @module js/splmAnalyticsService
 */
import app from 'app';
import _ from 'lodash';
import Debug from 'Debug';
import eventBus from 'js/eventBus';
import cfgSvc from 'js/configurationService';
import AwPromiseService from 'js/awPromiseService';
import AwRootScopeService from 'js/awRootScopeService';

/**
 * This flag indicates if the user was authenticated in this page instead of re-using an authenication from a
 * previous page load.
 *
 * @type {boolean}
 * @private
 */
var _authenticated = false;

/**
 * This array holds a list of event objects to be logged into the SAN server.
 *
 * @type {Array}
 * @private
 */
var _sanLogEventList = [];

/**
 * Id of the user logged in to the current session.
 *
 * @type {string}
 * @private
 */
var _userId = '';

/**
 * Vendor Id from the license.
 *
 * @type {string}
 * @private
 */
var _vendorId = '';

/**
 * This flag indicates if analytics are enabled for this session.
 *
 * @type {boolean}
 * @private
 */
var _enabled = false;

/**
 * The license level of the currently logged in user
 *
 * @type {string}
 * @private
 */
var _licenseLevel;


var _autoTestMode = false;

var trace = new Debug( 'splmAnalyticsService' );

var exports = {};

var _themeWhiteList = [];

var _commandsWhitelist = [];

var _pageWhitelist = [];

var _useInternalServer;

var _isIdle = false;

var MAX_PARTIAL_ERROR_COUNT = 10;

/**
 * @ignore
 */
export let setAutoTestMode = function() {
    _autoTestMode = true;
};

/**
 * This is a test support method to reset the service to default values. It should not be used outside of unit
 * testing.
 * @ignore
 */
export let reset = function() {
    _authenticated = false;
    _enabled = false;
};

/**
 * This method should be invoked upon successful authentication a backend server. It should not be invoked upon
 * client side page refresh if the previous server session is reused. This method should be called 0 or 1 times per
 * session.
 */
export let authenticationSuccessful = function() {
    _authenticated = true;
};

/**
 * This method should be invoked before the enable() method.
 * This sets the data that the will be used by the initialization process during the enable
 *
 * @param {map} preInitData Map of key value pairs. "user_id" and "vendor_id" are the two supported keys.
 */
export let setPreInitData = function( preInitData ) {
    _userId = preInitData.user_id;
    _vendorId = preInitData.vendor_id;
    if( preInitData.user_license_level ) {
        _licenseLevel = preInitData.user_license_level;
    }
};

/**
 * This method should be called when the client determines that Analytics logging should be enabled. This method
 * should be called 0 or 1 times per session.
 *
 * @param {Boolean} useInternalServer Log to the InternalServer
 * @return {Promise} promise
 */
export let enable = function( useInternalServer, repo ) {
    if( _autoTestMode ) {
        _enabled = false;
        return undefined;
    }
    _useInternalServer = useInternalServer;
    // load Siemens Analytics (San)
    return AwPromiseService.instance( function( resolve ) {
        import( 'lib/piwik/analytics' ).then( function() {
            if( _authenticated ) {
                var solution;
                AwPromiseService.instance.all( [
                    cfgSvc.getCfg( 'OOTB_Verification' ).then( function( OOTB_Verification ) {
                        _pageWhitelist = OOTB_Verification.locations;
                        _commandsWhitelist = OOTB_Verification.commands;
                        _themeWhiteList = OOTB_Verification.themes;
                    } ),
                    cfgSvc.getCfg( 'solutionDef' ).then( function( solutionDef ) {
                        solution = solutionDef;
                    } )
                ] ).then( function() {
                    cfgSvc.getCfg( 'versionConstants' ).then( function( versionConstants ) {
                        _initializeSan( useInternalServer, repo, solution, versionConstants );

                        _enabled = true;
                        localStorage.setItem( 'AW_SAN_OPTOUT', 'false' );
                        localStorage.setItem( 'AW_SAN_DO_DISABLE', 'false' );

                        // If Analytics was previously disabled, enabled it now.
                        San.disable( false );

                        // Subscribe to other events for logging.
                        _subscribeForEvents( 'selectFilter' );

                        _idleSetup();
                        eventBus.subscribe( 'idle', _getResolutionZoomInfo );

                        // Log the SOA errors during Idle time only.
                        // This can be done only after the _idleSetup() call.
                        _subscribeForErrors();
                        eventBus.subscribe( 'idle', _logEventDataAtIdle );
                        resolve();
                    } );
                } );
            } else {
                resolve();
            }
        } );
    } );
};

/**
 * This method should be called when the client determines that Analytics logging should be disabled. This method
 * should be called 0 or 1 times per session.
 *
 * The Opt-out state is stored in the localStorage. San itself can rememeber the opt-out state.
 * But, we want to be sure on our end as well.
 *
 * @param {Boolean} useInternalServer log to the internal server
 * @param {String}  encVendId encrypted Vendor Id
 */
export let disable = function( useInternalServer, encVendId, repo ) {
    _enabled = false;

    if( localStorage.getItem( 'AW_SAN_OPTOUT' ) === 'true' ) {
        // If we know that the user opted out and we have already processed it.
        // Nothing more to do.
        return;
    }

    import( 'lib/piwik/analytics' ).then( function() {
        if( _authenticated ) {
            var solution;
            cfgSvc.getCfg( 'solutionDef' ).then( function( solutionDef ) {
                solution = solutionDef;
                return cfgSvc.getCfg( 'versionConstants' );
            } ).then( function( versionConstants ) {
                _initializeSan( useInternalServer, repo, solution, versionConstants );

                // If Analytics was previously enabled, we will log one "participating=false" event.
                // San.logEvent( "participating=false") call is not working if
                // San.disable(true) is called right after the San.logEvent().
                // So, we call San.disable(true), during the subsequent login.
                var doDisable = localStorage.getItem( 'AW_SAN_DO_DISABLE' );
                if( doDisable === null || doDisable === 'false' ) {
                    var participatingProp = { Participating: 'false' };

                    if( encVendId ) {
                        participatingProp.Site = encVendId;
                    }

                    _enabled = true;
                    San.disable( false );
                    exports.logEvent( solution.solutionName, participatingProp );
                    exports.logProductInfo( 'Participating', 'Opt-Out' );
                    _enabled = false;
                    localStorage.setItem( 'AW_SAN_DO_DISABLE', 'true' );
                    // San.disable( true );
                    // Calling San.disable(true) here prevents the above logEvent() call from going through.
                } else if( doDisable === 'true' ) {
                    //
                    _enabled = false;
                    San.disable( true );
                    localStorage.setItem( 'AW_SAN_OPTOUT', 'true' );
                    localStorage.setItem( 'AW_SAN_DO_DISABLE', 'false' );
                }
            } );
        }
    } );
};

/**
 * This method should be used by the client to log an event to the Analytics server. This method can be called
 * whether Analytics has been enabled or not.
 *
 * @param {String} name - name of an event
 * @param {Object} property - value of the event. It can be a simple string, a JSON string, or empty. No other data
 *            types are supported.
 * @ignore
 */
export let logEvent = function( name, property ) {
    if( _enabled ) {
        var eventObject = _.isPlainObject( property ) ? JSON.stringify( property ) : property;
        San.logEvent( name, eventObject );
        trace( 'LogEvent', name, property );
    }
};

/**
 * Log Page Load Events.
 *
 * @ignore
 */
export let logPageViewEvent = function() {
    var rootScope = AwRootScopeService.instance;
    if( rootScope ) {
        rootScope.$on( '$stateChangeSuccess', function( ignore, toState ) {
            if( _enabled ) {
                var targetPageName = exports.publishableValue( toState.name, 'page' );
                targetPageName = toState.name.substr( toState.name.lastIndexOf( '_' ) + 1 );
                San.logPageView( targetPageName );
                trace( 'Page View', targetPageName );
            }
        } );
    }
};

/**
 * This method should be used by the client to log an event to the Analytics server. This method can be called
 * whether Analytics has been enabled or not.
 *
 * @param {String} name - name of an event
 * @param {Object} property - value of the event. It can be a simple string, a JSON string, or empty. No other data
 *            types are supported.
 * @ignore
 */
export let logProductInfo = function( name, property ) {
    if( _enabled ) {
        var productObject = _.isPlainObject( property ) ? JSON.stringify( property ) : property;
        San.addProductInfo( name, productObject );
        trace( 'LogProductInfo', name, property );
    }
};

/**
 * This method should be used by the client to log a command to the Analytics server.
 * This method can be called whether Analytics has been enabled or not.
 *
 * @param {Object} data - value of the event. It can be a simple string, a JSON string, or empty. No other data
 *            types are supported.
 * @ignore
 */
export let logCommands = function( data ) {
    if( _enabled ) {
        cfgSvc.getCfg( 'solutionDef' ).then( function( solutionDef ) {
            var solutionName = solutionDef.solutionName.concat( ' ' ).concat( 'Commands' );

            // Convert the "san" prefixed names to human readable names.
            if( _.isPlainObject( data ) && data.hasOwnProperty( 'sanCommandId' ) ) {
                var readableKeyData = {};
                _.forEach( data, function( value, key ) {
                    switch ( key ) {
                        case 'sanCommandId':
                            readableKeyData[ 'Command Id' ] = exports.publishableValue( value, 'COMMAND' );
                            break;
                        case 'sanCommandTitle':
                            if( exports.publishableValue( data.sanCommandId, 'COMMAND' ) === data.sanCommandId ) {
                                readableKeyData[ 'Command Title' ] = value;
                            } else {
                                readableKeyData[ 'Command Title' ] = exports.publishableValue( data.sanCommandId, 'COMMAND' );
                            }
                            break;
                        case 'sanViewMode':
                            readableKeyData[ 'View Mode' ] = value;
                            break;
                        case 'sanPrimaryPercentage':
                            readableKeyData[ 'Primary Percentage' ] = value;
                            break;
                        case 'sanTileAction':
                            readableKeyData[ 'Tile Action' ] = value;
                            break;
                        case 'sanCmdLocation':
                            readableKeyData[ 'Command Location' ] = value;
                            break;
                        case 'sanPixelSize':
                            readableKeyData[ 'Pixel Size' ] = value;
                            break;
                        case 'sanWidth':
                            readableKeyData.width = value;
                            break;
                        case 'sanHeight':
                            readableKeyData.height = value;
                            break;
                        case 'sanCommandData':
                            readableKeyData.cmdData = value;
                            break;
                        default:
                            readableKeyData[ key ] = value;
                    }
                } );
            }

            if( _licenseLevel && readableKeyData ) {
                readableKeyData['User License Level'] = _licenseLevel;
            }
            // Now, log the data.
            var keyData = _.isPlainObject( readableKeyData ) ? JSON.stringify( readableKeyData ) : readableKeyData;
            San.logEvent( solutionName, keyData );
            trace( solutionName, readableKeyData );
        } );
    }
};

/**
 * This method should be used by the client to log a command to the Analytics server only when it is a non-declarative command.
 * This method can be called whether Analytics has been enabled or not.
 * @param {Object} data - value of the event. It can be a simple string, a JSON string, or empty. No other data
 *            types are supported.
 * @ignore
 */
export let logNonDeclarativeCommands = function( data ) {
    if( _enabled ) {
        cfgSvc.getCfg( 'solutionDef' ).then( function( solutionDef ) {
            var solutionName = solutionDef.solutionName.concat( ' ' ).concat( 'Commands' );

            // Convert the "san" prefixed names to human readable names.
            if( _.isPlainObject( data ) && data.hasOwnProperty( 'sanCommandId' ) ) {
                var readableKeyData = {};
                _.forEach( data, function( value, key ) {
                    switch ( key ) {
                        case 'sanCommandId':
                            readableKeyData[ 'Command Id' ] = value;
                            break;
                        case 'sanCommandTitle':
                            readableKeyData[ 'Command Title' ] = value;
                            break;
                        case 'sanViewMode':
                            readableKeyData[ 'View Mode' ] = value;
                            break;
                        case 'sanPrimaryPercentage':
                            readableKeyData[ 'Primary Percentage' ] = value;
                            break;
                        case 'sanTileAction':
                            readableKeyData[ 'Tile Action' ] = value;
                            break;
                        case 'sanCmdLocation':
                            readableKeyData[ 'Command Location' ] = value;
                            break;
                        case 'sanPixelSize':
                            readableKeyData[ 'Pixel Size' ] = value;
                            break;
                        case 'sanWidth':
                            readableKeyData.width = value;
                            break;
                        case 'sanHeight':
                            readableKeyData.height = value;
                            break;
                        case 'sanCommandData':
                            readableKeyData.cmdData = value;
                            break;
                        default:
                            readableKeyData[ key ] = value;
                    }
                } );
            }

            if( _licenseLevel && readableKeyData ) {
                readableKeyData['User License Level'] = _licenseLevel;
            }
            // Now, log the data.
            var keyData = _.isPlainObject( readableKeyData ) ? JSON.stringify( readableKeyData ) : readableKeyData;
            San.logEvent( solutionName, keyData );
            trace( solutionName, readableKeyData );
        } );
    }
};


/**
 * This method should be used by the client to check if an UI artifact can be logged to Analytics.
 *
 *
 * @param {String} artifactName - name of the UI artifact to be checked to see if it is okay to log to analytics
 * @param {String} artifactType - Type of the artifact. The following is the list of Valid values are:
 *                                  "Theme", "Command", and "Page"
 * @returns {String} - value to report
 */
export let publishableValue = function( artifactName, artifactType ) {
    if( _useInternalServer ) {
        return artifactName;
    }
    if( artifactType.toUpperCase() === 'THEME' ) {
        if( _themeWhiteList && _themeWhiteList.length > 0 ) {
            if( _themeWhiteList.indexOf( artifactName ) < 0 ) {
                return 'Customer';
            }
        } else {
            return 'Unknown';
        }
    } else if( artifactType.toUpperCase() === 'COMMAND' ) {
        if( artifactName === 'Tile' || artifactName.startsWith( 'action_' ) ) {
            return artifactName;
        }
        if( _commandsWhitelist && _commandsWhitelist.length > 0 ) {
            if( _commandsWhitelist.indexOf( artifactName ) < 0 ) {
                return 'Customer';
            }
        } else {
            return 'Unknown';
        }
    } else if( artifactType.toUpperCase() === 'PAGE' ) {
        if( _pageWhitelist && _pageWhitelist.length > 0 ) {
            if( _pageWhitelist.indexOf( artifactName ) < 0 ) {
                return 'Customer';
            }
        } else {
            return 'Unknown';
        }
    }
    return artifactName;
};

/**
 * This method logs all the data stored by _sanLogEventList in FIFO during Idle time.
 *
 */
function _logEventDataAtIdle() {
    if( _enabled ) {
        while( _sanLogEventList.length > 0  && _isIdle ) {
            var logEventData = _sanLogEventList.shift();
            San.logEvent( logEventData.solutionName, logEventData.jsonData );
            trace( 'Idle', logEventData.solutionName, logEventData.jsonData );
        }
    }
}

/**
 * This method should be used by the client to log Errors to the Analytics server.
 * This method can be called whether Analytics has been enabled or not.
 *
 * @param {Object} data - Partial Error data from a SOA response.
 */
function _logErrors( data ) {
    setTimeout( function() {
        if( _enabled ) {
            var soaPartialError = data.sanPartialErrors;
            var serviceName = 'unknown';
            var operationName = 'unknown';

            // teamcenter.com, awp0, ics1 are internal SOAs that we want to report.
            // Customer SOAs use IDs with numerals > 3 - for these we are not reporting the names.
            if( /teamcenter.com/i.test( data.sanQName ) ) {
                serviceName = data.sanServiceName;
                operationName = data.sanOperationName;
            } else {
                // Get the "awp0" from "http://awp0.com/Schemas/Internal/AWS2/2016-03/..."
                // If that has a number > 3, it is a customer SOA.
                var templatePrefix = /:\/\/(.*)\..*\//i.exec( data.sanQName );
                if( templatePrefix.length > 1 && /[0123]/.test( templatePrefix[ 1 ] ) ) {
                    serviceName = data.sanServiceName;
                    operationName = data.sanOperationName;
                } else {
                    serviceName = 'Customer';
                    operationName = 'Customer';
                }
            }

            cfgSvc.getCfg( 'solutionDef' ).then( function( solutionDef ) {
                var solutionName = solutionDef.solutionName.concat( ' ' ).concat( 'Errors' );
                var partial_error_count = 0;
                soaPartialError.forEach( function( error, errIdx ) {
                    if( partial_error_count > MAX_PARTIAL_ERROR_COUNT ) {
                        return;
                    }
                    error.errorValues.forEach( function( errorValue, evIdx ) {
                        // Log only error level 3 and above.
                        // Error levels below 3 are info/warning categories.
                        if( errorValue.level < 3 ) {
                            return;
                        }

                        var errorData = {};
                        // Report error Code and Level as string values, instead of int.
                        // Analytics site to generate reports such as "sum", "average", etc. for int.
                        // Sending it as string ensures that we can count the number of occurrences of a particular error code, etc.
                        errorData.Code = String( errorValue.code );
                        errorData.Level = String( errorValue.level );
                        errorData[ 'Stack Index' ] = evIdx;
                        errorData[ 'Error Set' ] = errIdx;
                        errorData[ 'Service Name' ] = serviceName;
                        errorData[ 'Operation Name' ] = operationName;
                        errorData[ 'Log Correlation ID' ] = data.sanLogCorrelationID;

                        var LogEventData = {};
                        LogEventData.solutionName = solutionName;
                        LogEventData.jsonData = JSON.stringify( errorData );
                        _sanLogEventList.push( LogEventData );
                    } );
                    partial_error_count++;
                } );
            } );
        }
    }, 0, data );
    return;
}

/**
 * This method should be used by the client to subscribe to log as "Command" events to the Analytics server.
 * This method can be called only when Analytics is enabled.
 *
 */
function _subscribeForErrors() {
    // Log the Search Filter events in the "left side" Navigation panel.
    eventBus.subscribeOnChannel( {
        channel: 'SAN_Events',
        topic: 'aw-command-logErrros',
        callback: _logErrors
    } );
}

/**
 * This method should be used by the client to subscribe to log as "Command" events to the Analytics server.
 * This method can be called only when Analytics is enabled.
 *
 * @param {String} eventName - name of an event to subscribe to.
 */
function _subscribeForEvents( eventName ) {
    // Log the Search Filter events in the "left side" Navigation panel.
    eventBus.subscribe( eventName, function( data ) {
        var property = {};
        if( data.source && data.categoryName ) {
            property[ 'Command Id' ] = data.filterType;
            property[ 'Command Location' ] = data.source;

            // If the user enables the filter in the filter panel,
            // the "filterSelected" field is coming in as "false"
            if( data.hasOwnProperty( 'filterSelected' ) ) {
                if( data.filterSelected === true ) {
                    property[ 'Command Location' ] = data.source.concat( ' OFF' );
                } else {
                    property[ 'Command Location' ] = data.source.concat( ' ON' );
                }
            }
        }

        if( !_.isEmpty( property ) ) {
            exports.logCommands( property );
        }
    } );
}

/**
 * Records resolution and zoom information and logs it to Siemens analytics
 *
 */
function _getResolutionZoomInfo() {
    var resolutionZoomData = JSON.parse( localStorage.getItem( 'sanResolutionZoom' ) );
    var new_resolutionZoomData = {
        sanCommandId: 'ResolutionZoomData',
        sanCommandTitle: 'Resolution / Zoom Info',
        width: parseInt( window.innerWidth ),
        height: parseInt( window.innerHeight ),
        zoom: Math.round( window.devicePixelRatio * 100 )
    };

    // if we have a resolution from last time...
    if( resolutionZoomData ) {
        // if the resolution has changed since the last time we reported it...
        if( !( resolutionZoomData.width === new_resolutionZoomData.width &&
                resolutionZoomData.height === new_resolutionZoomData.height &&
                resolutionZoomData.zoom === new_resolutionZoomData.zoom ) ) {
            localStorage.setItem( 'sanResolutionZoom', JSON.stringify( new_resolutionZoomData ) );
            exports.logNonDeclarativeCommands( new_resolutionZoomData );
        }
    } else {
        // this is the first time reporting this info, store it in localStorage and publish
        localStorage.setItem( 'sanResolutionZoom', JSON.stringify( new_resolutionZoomData ) );
        exports.logNonDeclarativeCommands( new_resolutionZoomData );
    }
}

/**
 * This waits for either a "progress.start" or "progress.end" event to come in and once they do, it starts up an idle event publisher.
 */
function _idleSetup() {
    /**
     * @param {String|null} endPoint - optional endPoint of the progress event
     */
    function processEvent( endPoint ) {
        if( !/\/getUnreadMessages$/.test( endPoint ) ) {
            _isIdle = false;
            eventBus.unsubscribe( progressStartListener );
            eventBus.unsubscribe( progressEndListener );
            _startupIdleEventPublisher();
        }
    }

    var progressStartListener = eventBus.subscribe( 'progress.start', processEvent );
    var progressEndListener = eventBus.subscribe( 'progress.end', processEvent );
}

/**
 * Sets up an Idle event publisher. This publisher uses a burndown timer which checks how long it has been since a "progress.end" or "progress.start"
 * event has come in. If one of those events come in, the burndown timer is restarted. Once the burndown exceeds its timer it will fire a single "idle"
 * event and then resume listening for a "progress.end"/"progress.start" event.
 */
function _startupIdleEventPublisher() {
    var idleBurndown;

    /**
     */
    function processEvent() {
        _isIdle = false;
        clearTimeout( idleBurndown );
        idleBurndown = _setupBurndownTimer( progressStartListener, progressEndListener );
    }

    var progressStartListener = eventBus.subscribe( 'progress.start', processEvent );
    var progressEndListener = eventBus.subscribe( 'progress.end', processEvent );

    idleBurndown = _setupBurndownTimer( progressStartListener, progressEndListener );
}

/**
 * Creates the burndown timer
 *
 * @param {Object} progressStartListener - eventBus subscription handle
 * @param {Object} progressEndListener - eventBus subscription handle
 * @return {Number} A Number, representing the ID value of the timer that is set. Use this value with the clearTimeout() method to cancel the timer.
 */
function _setupBurndownTimer( progressStartListener, progressEndListener ) {
    var idle_cutoff_seconds = 30;
    return setTimeout( function() {
        _isIdle = true;
        eventBus.publish( 'idle', {} );
        _idleSetup();
        eventBus.unsubscribe( progressStartListener );
        eventBus.unsubscribe( progressEndListener );
    }, idle_cutoff_seconds * 1000 );
}

/**
 * Initialize the SAN SDK
 *
 * @param {Boolean} useInternalServer - boolean indicating if the data should go to the internal site or external site
 * @param {String} repo - optional parameter which can be used to overwrite the predefined repo, used for redirecting to TcX repo
 * @param {Object} solution - solution object used to define the application name
 * @param {Object} versionConstants - object used to define the application version
 */
function _initializeSan( useInternalServer, repo, solution, versionConstants ) {
    San.setUserIdentifier( _userId );
    San.setCustomerIdentifier( _vendorId );
    var solutionId = repo ? repo : solution.solutionId;
    var fullVersion = versionConstants.name + '@' + versionConstants.version + ' (' + versionConstants.description + ')';
    // pull language from awSession in localStorage and convert to the object that SAN is expecting.

    var applicationLanguage = '';
    var sanApplicationLanguage = '';
    try {
        applicationLanguage = JSON.parse( localStorage.getItem( 'awSession:/' ) ).locale;
    } catch ( error ) {
        try {
            applicationLanguage = localStorage.getItem( 'locale:/' );
        } catch ( error ) {
            applicationLanguage = '';
        }
    }
    // Several AW locales like de are not in the format that SAN is expecting. This if block updates them to the proper format.
    if ( applicationLanguage && applicationLanguage.length === 5 ) {
        sanApplicationLanguage = 'applicationLanguage_' + applicationLanguage.toUpperCase();
    } else if( applicationLanguage && applicationLanguage.length === 2 ) {
        sanApplicationLanguage = 'applicationLanguage_' + applicationLanguage.toUpperCase() + '_' + applicationLanguage.toUpperCase();
    }else {
        sanApplicationLanguage = 'applicationLanguageNone';
    }
    // if for some reason, the language value lookup fails, default to None
    // Languages which AW supports that SAN does not would be corrected here.
    if ( San[sanApplicationLanguage] ) {
        sanApplicationLanguage = San[sanApplicationLanguage];
    } else {
        sanApplicationLanguage = San.applicationLanguageNone;
    }
    // enable data obfuscation
    San.obfData( true );
    // status and err_message are left for debugger use, not to be displayed to customer via console, etc
    let status = San.initialize(
        solutionId,
        versionConstants.version,
        fullVersion,
        sanApplicationLanguage,
        useInternalServer || undefined,
        app.getBaseUrlPath() + '/lib/piwik/piwik.js'
    );
    let err_message = San.getLastErrorMessage();
}

exports = {
    setAutoTestMode,
    reset,
    authenticationSuccessful,
    setPreInitData,
    enable,
    disable,
    logEvent,
    logPageViewEvent,
    logProductInfo,
    logCommands,
    logNonDeclarativeCommands,
    publishableValue
};
export default exports;

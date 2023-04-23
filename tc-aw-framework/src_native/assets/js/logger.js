// Copyright (c) 2020 Siemens
/* eslint-disable no-console */

/**
 * This service is used to announce various level logging events to the console.
 * <p>
 * Expected URL patterns:<br>
 * (1) http://localhost:3000?logLevel=ERROR<br>
 * (2) http://localhost:3000?logLevel=ERROR&locale=fr<br>
 * (3) http://localhost:8080/?logLevel=ERROR#/Declarative%20Building%20Blocks/Elements/aw-autofocus
 *
 * APIs :
 * (1) isDebugEnabled(): Checks whether this Logger is enabled for the DEBUG Level. Returns: true if debug output is enabled.
 * (2) isErrorEnabled(): Checks whether this Logger is enabled for the ERROR Level. Returns: true if error output is enabled.
 * (3) isInfoEnabled(): Checks whether this Logger is enabled for the INFO Level. Returns: true if info output is enabled.
 * (4) isTraceEnabled(): Checks whether this Logger is enabled for the TRACE Level. Returns: true if trace output is enabled.
 * (5) isWarnEnabled(): Checks whether this Logger is enabled for the WARN Level. Returns: true if warning output is enabled.
 * (6) debug(): Displays a message in the console. You pass one or more objects to this method, each of which are evaluated and concatenated into a space-delimited string.
 * The first parameter you pass may contain format specifiers, a string token composed of the percent sign (%) followed by a letter that indicates the formatting to be applied.
 * (7) info(): Identical to debug()
 * (8) error(): Similar to info() but also includes a stack trace from where the method was called.
 * (9) warn(): This API is like info() but also displays a yellow warning icon along with the logged message.
 * (10) trace(): Prints a stack trace from the point where the method was called, including links to the specific lines in the JavaScript source.
 *
 * @module js/logger
 * @publishedApolloService
 */
import _ from 'lodash';
import browserUtils from 'js/browserUtils';

var exports = {};

/** Log correlation ID. */
var _logCorrelationID = '';

/** How many times the log correlation id has been updated */
var _logCorrelationIDUpdates = 0;

/** Random base for log correlation id to help prevent collisions */
var _logCorrelationBase = Math.random().toString( 36 ).substring( 2 );

/** Event Bus */
var _eventBus;

/** Logger output level. */
var _level;

switch ( browserUtils.getUrlAttributes().logLevel ) {
    case 'OFF':
        _level = 0;
        break;
    case 'ERROR':
    case 'SEVERE':
        _level = 1;
        break;
    case 'WARN':
    case 'WARNING':
        _level = 2;
        break;
    case 'INFO':
    case 'CONFIG':
        _level = 3;
        break;
    case 'DEBUG':
    case 'FINE':
        _level = 4;
        break;
    case 'TRACE':
    case 'FINER':
    case 'FINEST':
        _level = 5;
        break;
    case 'ALL':
        _level = 6;
        break;
    default:
        _level = 3;
        break;
}

/**
 * Support Node.js usage of this service. window isn't defined & it's missing console.debug & console.warn.
 */
if( !console.error ) {
    console.error = console.log;
}
if( !console.warn ) {
    console.warn = console.log;
}
if( !console.info ) {
    console.info = console.log;
}
if( !console.debug ) {
    console.debug = console.log;
}
if( !console.trace ) {
    console.trace = console.log;
}

/**
 * @param {String} levelIn - log level
 * @param {output} output string
 */
var postLog = function( levelIn, output ) {
    if( _eventBus && _eventBus.publish ) {
        _eventBus.publish( 'log', {
            level: levelIn,
            output: output
        } );
    }
};

/**
 * @return {String} log correlation ID
 */
export let getCorrelationID = function() {
    return _logCorrelationID + ':' + _logCorrelationBase + '.' + Date.now();
};

/**
 * @return {String} log correlation ID
 */
function getCorrelationIDPrefix() {
    return _logCorrelationID ? _logCorrelationID + '\n' : '';
}

/**
 * @param {String} prefix log correlation ID prefix
 */
export let updateCorrelationID = function( prefix ) {
    if( prefix ) {
        _logCorrelationIDUpdates++;
        _logCorrelationID = prefix + '/' + _logCorrelationIDUpdates;
        if( exports.isTraceEnabled() ) {
            exports.trace( 'CorrelationID changed: ' + _logCorrelationID );
        }
    } else {
        _logCorrelationID = Date.now().toString();
    }
};

/**
 * Checks whether this Logger is enabled for the ERROR Level.
 *
 * @returns {boolean} true if error output is enabled.
 */
export let isErrorEnabled = function() {
    return _level >= 1;
};

/**
 * Checks whether this Logger is enabled for the WARN Level.
 *
 * @returns {boolean} true if warning output is enabled.
 */
export let isWarnEnabled = function() {
    return _level >= 2;
};

/**
 * Checks whether this Logger is enabled for the INFO Level.
 *
 * @returns {boolean} true if info output is enabled.
 */
export let isInfoEnabled = function() {
    return _level >= 3;
};

/**
 * Checks whether this Logger is enabled for the DEBUG Level.
 *
 * @returns {boolean} true if debug output is enabled.
 */
export let isDebugEnabled = function() {
    return _level >= 4;
};

/**
 * Checks whether this Logger is enabled for the TRACE Level.
 *
 * @returns {boolean} true if trace output is enabled.
 */
export let isTraceEnabled = function() {
    return _level >= 5;
};

/**
 * Handle argument processing to support IE short coming.
 *
 * @return {Array} arguments to console function
 */
function handleArg() {
    var args = [ getCorrelationIDPrefix() ];
    for( var ii = 0; ii < arguments.length; ii++ ) {
        args.push( arguments[ ii ] );
    }
    return args;
}

/**
 * Similar to info() but also includes a stack trace from where the method was called.
 */
export let error = function() {
    if( exports.isErrorEnabled() ) {
        console.error.apply( console, handleArg.apply( this, arguments ) );
        postLog( 'SEVERE', Array.prototype.join.call( arguments, ' ' ) );
    }
};

/**
 * This method is like info() but also displays a yellow warning icon along with the logged message.
 */
export let warn = function() {
    if( exports.isWarnEnabled() ) {
        console.warn.apply( console, handleArg.apply( this, arguments ) );
        postLog( 'WARNING', Array.prototype.join.call( arguments, ' ' ) );
    }
};

/**
 * This method is identical to debug() except for log level = 'CONFIG'.
 */
export let info = function() {
    if( exports.isInfoEnabled() ) {
        console.info.apply( console, handleArg.apply( this, arguments ) );
        postLog( 'CONFIG', Array.prototype.join.call( arguments, ' ' ) );
    }
};

export let success = info;

/**
 * Displays a message in the console. You pass one or more objects to this method, each of which are evaluated and
 * concatenated into a space-delimited string. The first parameter you pass may contain format specifiers, a string
 * token composed of the percent sign (%) followed by a letter that indicates the formatting to be applied.
 */
export let debug = function() {
    if( exports.isDebugEnabled() ) {
        console.debug.apply( console, handleArg.apply( this, arguments ) );
        postLog( 'FINE', Array.prototype.join.call( arguments, ' ' ) );
    }
};

/**
 * Prints a stack trace from the point where the method was called, including links to the specific lines in the
 * JavaScript source.
 */
export let trace = function() {
    if( exports.isTraceEnabled() ) {
        console.debug.apply( console, handleArg.apply( this, arguments ) );
        postLog( 'FINER', Array.prototype.join.call( arguments, ' ' ) );
    }
};

/**
 * The method assumes there would be a 'declarativeLog' method on console and it routes logs to the method.
 * 'console.declarativeLog' can be used by devTools to record the logs. The method takes one parameter as a 'string'.
 */
export let declarativeLog = function() {
    if( console.declarativeLog ) {
        console.declarativeLog.apply( console, handleArg.apply( this, arguments ) );
    }
};

/**
 * Check if 'declarative logging' is enabled.
 *
 * @return {Boolean} TRUE if declarative debug logging is curently enabled.
 */
export let isDeclarativeLogEnabled = function() {
    return console.declarativeLog ? true : false; // eslint-disable-line no-unneeded-ternary
};

/**
 * Set event bus.
 *
 * @param {Object} eventBus - The event bus API object.
 */
export let setEventBus = function( eventBus ) {
    _eventBus = eventBus;
};

exports = {
    getCorrelationID,
    updateCorrelationID,
    isErrorEnabled,
    isWarnEnabled,
    isInfoEnabled,
    isDebugEnabled,
    isTraceEnabled,
    error,
    warn,
    info,
    success,
    debug,
    trace,
    declarativeLog,
    isDeclarativeLogEnabled,
    setEventBus
};
export default exports;

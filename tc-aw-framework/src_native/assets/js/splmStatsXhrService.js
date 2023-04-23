// Copyright (c) 2020 Siemens

/**
 * @module js/splmStatsXhrService
 */
import _ from 'lodash';
import logger from 'js/logger';
import splmStatsJsService from 'js/splmStatsJsService';

var exports = {};

var _procs = [];
var _xhrCounter = 0;

var _realOpen = null;
var _xhrSender = null;

var _enabled = false;

var _mainProc = null;

export let getCount = function() {
    return _xhrCounter;
};

export let setMainProc = function( processor ) {
    _mainProc = processor;
};

export let install = function() {
    if( !_enabled ) {
        _realOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function( method, url, async, user, password ) {
            _xhrCounter++; //Try to add as early as possible to avoid pre-finishing pollyfill
            _realOpen.call( this, method, url, async, user, password );
            this.requestURL = url;
        };

        _xhrSender = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function( data ) {
            var xhr = this;
            _xhrCounter++; // Side Effect fix (helper) - More accurate to have +1 on open and +1 on send and then -2 on receive response
            xhr.addEventListener( 'readystatechange', function() {
                if( xhr.readyState === 4 ) {
                    _xhrCounter -= 2;
                }
            } );

            /**
             * Only wrap the function if there is an 'onload' function to wrap (i.e. NOT trying to do a
             * Socket.IO/WebSocket call which has no such function).
             */
            if( splmStatsJsService.enabled() && xhr.onload ) {
                xhr.onload = splmStatsJsService.wrapFunction( xhr, xhr.onload, xhr.requestURL );
            }

            try {
                if( _mainProc ) {
                    _mainProc( xhr, data );
                }
            } catch ( error ) {
                logger.warn( error );
            }

            _xhrSender.call( xhr, data );
        };
        _enabled = true;
    }
};

export let uninstall = function() {
    return true;
};

export let addProc = function( proc ) {
    _procs.push( proc );
};

export let removeProc = function( proc ) {
    _procs = _.filter( _procs, function( procObj ) {
        return proc !== procObj;
    } );
};

install();

exports = {
    getCount,
    setMainProc,
    install,
    uninstall,
    addProc,
    removeProc
};
export default exports;

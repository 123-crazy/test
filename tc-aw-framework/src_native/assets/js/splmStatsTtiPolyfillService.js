// Copyright (c) 2020 Siemens

/**
 * A modified version of tti-profill done by BigClayClay - Handles the 'handling' for Ttipolyfill
 * 
 * https://github.com/GoogleChromeLabs/tti-polyfill
 *
 * @module js/splmStatsTtiPolyfillService
 *
 * @publishedApolloService
 *
 */
import _ from 'lodash';
import nativeExports from 'js/splmStatsNativeExports';

var exports = {};

var _ttiPolyfill = null;
var _deferredPromise = null;

export let getCurrentPromise = function() {
    return _deferredPromise;
};

export let isRunning = function() {
    if( _ttiPolyfill && _ttiPolyfill.isRunning() ) {
        return true;
    }
    return false;
};

export let waitForPageToLoad = function() {
    if( !_ttiPolyfill ) {
        _deferredPromise = null;
        _ttiPolyfill = new nativeExports.SPLMStatsTtiPolyfill();
        _deferredPromise = _ttiPolyfill.waitForPageToLoad();
        _deferredPromise.then( function() {
            _ttiPolyfill = null;
        } );
    }
    return _deferredPromise;
};

export let resetPingBusyDebounce = function() {
    if( exports.isRunning() ) {
        _ttiPolyfill.resetPingBusyDebounce();
    }
};

exports = {
    getCurrentPromise,
    isRunning,
    waitForPageToLoad,
    resetPingBusyDebounce
};
export default exports;

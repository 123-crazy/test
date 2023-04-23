// Copyright (c) 2020 Siemens

/**
 * A modified version of tti-profill done by BigClayClay
 *
 * https://github.com/GoogleChromeLabs/tti-polyfill
 *
 * @module js/splmStatsTtiPolyfill
 *
 * @publishedApolloService
 *
 */
import _ from 'lodash';
import eventBus from 'js/eventBus';
import splmStatsXhrService from 'js/splmStatsXhrService';
import AwPromiseService from 'js/awPromiseService';
import AwRootScopeService from 'js/awRootScopeService';
import AwTimeoutService from 'js/awTimeoutService';
import splmStatsService from 'js/splmStatsService';
import splmStatsUtils from 'js/splmStatsUtils';
/**
 * Instances of this class represent TTIpolyfill
 *
 * @class SPLMStatsTtiPolyfill
 */
function SPLMStatsTtiPolyfill() {
    var self = this;

    /**
     * Time to wait for $digest cycles to make sure no more.
     */
    var LAST_DIGEST_BUSY_WAIT = 200;

    var _isRunning = false;

    var _interval = LAST_DIGEST_BUSY_WAIT;

    var _resetPingBusyDebounce_ = null;

    self.setInterval = function( interval ) {
        _interval = interval > 0 ? interval : LAST_DIGEST_BUSY_WAIT;
    };

    self.isRunning = function() {
        return _isRunning;
    };

    self.resetPingBusyDebounce = function() {
        if( _resetPingBusyDebounce_ ) {
            _resetPingBusyDebounce_();
        }
    };

    self.waitForPageToLoad = function() {
        var _observer = null;
        var _lockWatcher = null;
        var _digestLock = true;
        var defer = AwPromiseService.instance.defer();
        var _locListener = null;
        var _commandListener = null;
        var _debounceCount = 0;

        // This method is the key magic to cover:
        // - extra long digest
        // - extra long css flow
        // - non-angularJS top method
        // - If we have already resolved our promise, disregard any further scheduling until we cleanup listeners
        var _resetPingBusyDebounce = function() {
            if( _isRunning ) {
                _pingBusyDebounce.cancel();
                timeout( _pingBusyDebounceTimer, 0, false );
            }
        };

        if( !_isRunning ) {
            var rootScope = AwRootScopeService.instance;
            var timeout = AwTimeoutService.instance;
            var _pingBusyDebounce = _.debounce( function() {
                _debounceCount++;
                if( splmStatsXhrService.getCount() > 0 ) {
                    _resetPingBusyDebounce();
                } else {
                    var plStatsCustomWaitStatus = splmStatsService.getPLStatsCustomFlag();
                    if( !_digestLock && _isRunning && _debounceCount > 1 && !plStatsCustomWaitStatus && splmStatsUtils.getTimeoutCount() === 0 ) {
                        _isRunning = false;
                        _lockWatcher();
                        _locListener();
                        eventBus.unsubscribe( _commandListener );
                        if( _observer ) {
                            _observer.disconnect();
                        }
                        defer.resolve();
                        _debounceCount = 0;
                    } else {
                        _pingBusyDebounce.cancel();
                        _pingBusyDebounce();
                    }
                }
            }, _interval, {
                maxWait: 10000,
                trailing: true,
                leading: false
            } );

            var _pingBusyDebounceTimer = function() {
                // Runs after last digest cycle...
                _digestLock = false;
                _pingBusyDebounce();
            };
            _resetPingBusyDebounce_ = _resetPingBusyDebounce;

            _lockWatcher = rootScope.$watch( function() {
                _digestLock = true;
                _resetPingBusyDebounce();
            } );

            _locListener = rootScope.$on( '$locationChangeStart', function() {
                _resetPingBusyDebounce();
            } );

            _commandListener = eventBus.subscribe( 'aw-command-logEvent', function() {
                _resetPingBusyDebounce();
            } );

            // Safari 6 and 6.1 for desktop, iPad, and iPhone are the only browsers that
            // have WebKitMutationObserver but not un-prefixed MutationObserver.
            // Some browser doesn't have both.
            // https://developer.mozilla.org/docs/Web/API/MutationObserver
            var BrowserMutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
            if( BrowserMutationObserver ) {
                _observer = new BrowserMutationObserver( function() {
                    _digestLock = true;
                    _resetPingBusyDebounce();
                } );

                var config = { attributes: true, childList: true, subtree: true, characterData: true };
                _observer.observe( document, config );
            }

            _pingBusyDebounce();
            _isRunning = true;
        }
        return defer.promise;
    };

    return self;
}

export default SPLMStatsTtiPolyfill;

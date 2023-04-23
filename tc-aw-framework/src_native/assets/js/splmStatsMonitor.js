// Copyright (c) 2020 Siemens

/**
 * Montior
 *
 * @module js/splmStatsMonitor
 * @publishedApolloService
 */
import _ from 'lodash';
import splmStatsTtiService from 'js/splmStatsTtiPolyfillService';

/**
 * Instances of this class represent a Monitor
 *
 * @class SPLMStatsProfiler
 */
 export default function SPLMStatsMonitor() {
    var self = this;

    var _listeners = [];

    var _profiler = null;

    var _running = false;

    self.addListener = function( listener ) {
        _listeners.push( listener );
    };

    self.addProfiler = function( profiler ) {
        _profiler = profiler;
    };

    self.addReporter = function( _reporter ) {
        if( _profiler ) {
            _profiler.addReporter( _reporter );
        }
    };

    self.setTitle = function( title ) {
        _profiler.setTitle( title );
    };

    self.isRunning = function() {
        return _running;
    };

    /**
     * Starts the monitoring -> Starts each profiler, then waits for the page to be completely settled (Ng, DOM, Network)
     * Then promise resolves, and we report the data for each reporter attached
     */
    self.run = function() {
        if( !_running ) {
            _profiler.start();
            splmStatsTtiService.waitForPageToLoad().then( function() {
                if( _running ) {
                    _running = false;
                    _profiler.stop();
                    _profiler.report();
                }
            } );
            _running = true;
        } else {
            splmStatsTtiService.resetPingBusyDebounce();
        }
    };

    self.enable = function() {
        _.forEach( _listeners, function( listener ) {
            listener.start( self );
        } );
    };

    self.disable = function() {
        _.forEach( _listeners, function( listener ) {
            listener.stop( self );
        } );
    };
    return self;
}

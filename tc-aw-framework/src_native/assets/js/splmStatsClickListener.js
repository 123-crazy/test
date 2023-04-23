// Copyright (c) 2020 Siemens

/**
 * Listener for click events
 *
 * @module js/splmStatsClickListener
 *
 * @publishedApolloService
 */

import splmStatsUtils from 'js/splmStatsUtils';

/**
 * Instances of this class represent click listener
 *
 * @class SPLMStatsMonitor
 */
function SPLMStatsClickListener() {
    var self = this;
    var _monitor = null;
    var _clickHandler = function() {
        splmStatsUtils.resetTimeoutCount();
        _monitor.run();
    };

    self.start = function( monitor ) {
        _monitor = monitor;
        document.addEventListener( 'mousedown', _clickHandler );
        document.addEventListener( 'click', _clickHandler );
    };

    self.stop = function( monitor ) {
        document.removeEventListener( 'mousedown', _clickHandler );
        document.removeEventListener( 'click', _clickHandler );
        _monitor = null;
    };

    return self;
}

export default SPLMStatsClickListener;

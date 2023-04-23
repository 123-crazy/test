// Copyright (c) 2020 Siemens

/**
 * Listener for command events
 *
 * @module js/splmStatsCommandListener
 *
 * @publishedApolloService
 *
 */
import eventBus from 'js/eventBus';
import cfgSvc from 'js/configurationService';

/**
 * Listener for command events
 *
 * @class SPLMStatsMonitor
 */
function SPLMStatsCommandListener() {
    var self = this;

    var _event = null;

    var _commandConfig = [];

    self.start = function( monitor ) {
        _event = eventBus.subscribe( 'aw-command-logEvent', function( commandLogData ) {
            if( _commandConfig.includes( commandLogData.sanCommandId ) ) {
                monitor.setTitle( commandLogData.sanCommandId );
                monitor.run();
            }
        } );
    };

    self.stop = function() {
        eventBus.unsubscribe( _event );
    };

    var baseConfig = cfgSvc.getCfgCached( 'analytics.splmStatsConfiguration' );
    _commandConfig = baseConfig && baseConfig.triggers && baseConfig.triggers.commands ? baseConfig.triggers.commands : [];

    return self;
}

export default SPLMStatsCommandListener;

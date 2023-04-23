// Copyright (c) 2020 Siemens

/**
 * Location Listener Trigger for monitor
 *
 * @module js/splmStatsLocationListener
 *
 * @publishedApolloService
 *
 */
import browserUtils from 'js/browserUtils';
import AwRootScopeService from 'js/awRootScopeService';


/**
 * Location Listener Trigger for monitor
 *
 * @class SPLMStatsMonitor
 */
function SPLMStatsLocationListener() {
    var self = this;

    var _listener = null;

    self.start = function( _monitor ) {
        var rootScope = AwRootScopeService.instance;
        _listener = rootScope.$on( '$locationChangeStart', function( event, next, current ) {
            _monitor.setTitle( browserUtils.getWindowLocation().hash );
            _monitor.run();
        } );
    };

    self.stop = function() {
        _listener();
    };

    return self;
}

export default SPLMStatsLocationListener;

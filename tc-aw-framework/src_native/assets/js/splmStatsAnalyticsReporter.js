// Copyright (c) 2020 Siemens

/**
 * Reports performance metrics to Tcanalytics
 *
 * @module js/splmStatsAnalyticsReporter
 * @publishedApolloService
 */
import _ from 'lodash';
import _t from 'js/splmStatsConstants';
import splmAnalyticsService from 'js/splmAnalyticsService';
import splmStatsUtils from 'js/splmStatsUtils';
import cfgSvc from 'js/configurationService';
import appCtxService from 'js/appCtxService';
import AwRootScopeService from 'js/awRootScopeService';

/**
 * Instances of this class represent reporter for sending performance metrics to Tcanalytics
 *
 * @class SPLMStatsAnalyticsReporter
 */
function SPLMStatsAnalyticsReporter() {
    var self = this;

    var _listener = null;

    var _locationListener = null;

    var targetPageName = null;

    var _analyticsEnabled = false;

    var _analyticsContext = null;

    /**
     * Gets the key from the application context service and formats it as the context configuration ( enableCtxInfo object ) dictates
     *
     * @param {String} key - One of the objects in enableCtxInfo.appCtxKeys array
     * @param {Object} ctx - Current application context queried from appCtxService
     *
     * @return {String} The result string after filtering/formatting the raw value form appCtxService
     */
    var _processCtxKey = function( key, ctx ) {
        var notFound = false;
        for( var i = 0; i < key.searchPaths.length; i++ ) {
            var currentPath = key.searchPaths[ i ];
            var tempCtx = ctx;
            for( var j = 0; j < currentPath.length; j++ ) {
                if( tempCtx[ currentPath[ j ] ] ) {
                    tempCtx = tempCtx[ currentPath[ j ] ];
                } else {
                    notFound = true;
                    break;
                }
            }
            if( notFound ) {
                break;
            }
            if( tempCtx !== ctx ) {
                return tempCtx;
            }
        }
        return null;
    };

    /**
     * Hook point to set the context object used for filtering/formatting context information.
     *
     * @param {Object} obj - Context configuration object to set
     */
    self.setAnalyticsContext = function( obj ) {
        _analyticsContext = obj;
    };

    /**
     * Gets context data from appCtxService and formats it with _processCtxKey
     *
     * @return {Object} Processed context object to be sent to Tcanalytics
     */
    var _getContextData = function() {
        var ctxObj = null;
        if( !_analyticsContext ) {
            _analyticsContext = cfgSvc.getCfgCached( 'analytics.splmStatsConfiguration' );
        }
        ctxObj = {};
        var ctx = appCtxService.ctx;
        if( _analyticsContext && _analyticsContext.appCtxKeys ) {
            for( var i = 0; i < _analyticsContext.appCtxKeys.length; i++ ) {
                var k = _analyticsContext.appCtxKeys[ i ];
                var value = _processCtxKey( k, ctx );
                if( value ) {
                    ctxObj[ k.name ] = value;
                }
            }
        }
        return ctxObj;
    };

    /**
     * Formats a string on the context object to remove unecessary characters specific in the configuration object
     *
     * @param {String} ctxString - Unformatted context string
     *
     * @return {String} Processed context object to be sent to Tcanalytics
     */
    var _processCtxString = function( ctxString ) {
        if( _analyticsContext.appCtxValueFilters ) {
            for( var i = 0; i < _analyticsContext.appCtxValueFilters.length; i++ ) {
                while( ctxString.indexOf( _analyticsContext.appCtxValueFilters[ i ] ) !== -1 ) {
                    ctxString = ctxString.replace( _analyticsContext.appCtxValueFilters[ i ], '' );
                }
            }
        }
        if( ctxString === 'SummaryView' ) {
            ctxString = 'ListSummaryView';
        }
        return ctxString;
    };

    /**
     * Checks to see if analytics are enabled, if so then log the performance object
     *
     * @param {Object} obj - Formatted performance object
     */
    var _logAnalyticsEvent = function( obj ) {
        if( _analyticsEnabled && !splmStatsUtils.isAnalyticsDisabled() ) {
            var eventName = _analyticsContext && _analyticsContext.name ? _analyticsContext.name : _t.ANALYTICS_EVENT_NAME;
            splmAnalyticsService.logEvent( 'Performance::' + eventName, obj );
        }
    };

    /**
     * Enabled checking for what triggered the performance monitoring. If it's a location change, send analytics data.
     *
     */
    self.enable = function() {
        var rootScope = AwRootScopeService.instance;
        if( !_listener && rootScope ) {
            _listener = rootScope.$on( '$locationChangeStart', function( event, next, current ) {
                _analyticsEnabled = true;
            } );
            _locationListener = rootScope.$on( '$stateChangeSuccess', function( ignore, toState ) {
                targetPageName = toState.name.substr( toState.name.lastIndexOf( '_' ) + 1 );
            } );
        }
    };

    /**
     * Cleans up the watcher from location checking above when done monitoring performance
     *
     */
    self.disable = function() {
        if( _listener ) {
            _listener();
            _locationListener();
        }
    };

    /**
     * Formats and sends our raw performance object data to the analytics logging function
     *
     * @param {Object} performanceObject - Raw/Unformatted performance object
     */
    self.report = function( performanceObject ) {
        //TARGET_AW42: This is only for debug purpose which can be simplified later
        var ctxResult = _getContextData();

        var DOMCostlyWidgetsCount = splmStatsUtils.getCostlyWidgetsCount();

        var locationInformation = {};
        if( _analyticsContext && _analyticsContext.appCtxKeys ) {
            _.forEach( _analyticsContext.appCtxKeys, function( key ) {
                if( key.name && ctxResult[ key.name ] ) {
                    locationInformation[ 'plstats' + key.name ] = _processCtxString( ctxResult[ key.name ] );
                }
            } );
        }
        locationInformation.plstatsLocation = targetPageName;
        _logAnalyticsEvent( _.assign( {
            sanAnalyticsType: 'Performance',
            plstatsTTI: parseFloat( ( performanceObject.TTI / 1000 ).toFixed( 3 ) ), // Seconds
            plstatsScriptingTime: parseFloat( parseFloat( performanceObject.scriptTime / 1000 ).toFixed( 3 ) ), // Seconds
            plstatsMemoryUsed: parseFloat( ( performanceObject.MemoryUsed / 1000000 ).toFixed( 3 ) ) || 0, //MB
            plstatsDigestCycles: performanceObject.AngularJS.DigestCycles,
            plstatsNetworkRequestCount: performanceObject.XHR.details.length,
            plstatsTotalNetworkTime: parseFloat( ( performanceObject.totalNetworkTime / 1000 ).toFixed( 3 ) ), // Seconds
            plstatsNetworkRequestSize: performanceObject.XHR.requestSize,
            plstatsNetworkResponseSize: performanceObject.XHR.responseSize,
            plstatsWatcherCount: performanceObject.AngularJS.watcherCount,
            plstatsElemCount: performanceObject.DOM.elemCount,
            plstatsBrowserType: performanceObject.BrowserType,
            plstatsCostlyWidgetsCount: DOMCostlyWidgetsCount
        }, locationInformation ) );

        _analyticsEnabled = false;
    };

    return self;
}

export default SPLMStatsAnalyticsReporter;

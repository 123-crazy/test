// Copyright (c) 2020 Siemens

/**
 * AngularJS Watcher/Profiler for performance log
 *
 * @module js/splmStatsXhrProcessor
 *
 * @publishedApolloService
 *
 */
import _ from 'lodash';
import logger from 'js/logger';
import splmStatsXhrService from 'js/splmStatsXhrService';
import splmStatsUtils from 'js/splmStatsUtils';

/**
 * Instances of this class represent a profiler for HTTP Request/Response
 *
 * @class SPLMStatsXhrProcessor
 */
function SPLMStatsXhrProcessor() {
    var self = this;

    var _processingTime = 0;
    var _startProcessorTime = 0;
    var _endProcessorTime = 0;

    var _XMLHttpRequests = [];
    var _XMLFinishedHttpRequests = [];
    var _internalXMLHttpRequests = [];
    var _maxHTTPPayload = {
        requestUrl: '',
        payloadSize: 0
    };
    var _transferSize = 0;
    var _requestSize = 0;
    var _responseSize = 0;
    var _XMLNetworkTimes = [];
    var _errorInfo = {
        requestsAborted: [],
        requestsErrored: [],
        requestsTimeout: []
    };
    var _sortedXMLNetworkTimes = [];
    var _eventListeners = {
        abort: function( xhr ) {
            _errorInfo.requestsAborted.push( xhr );
        },
        error: function( xhr ) {
            _errorInfo.requestsErrored.push( xhr );
        },
        timeout: function( xhr ) {
            _errorInfo.requestsTimeout.push( xhr );
        }
    };

    var max = function( a, b ) {
        return a > b ? a : b;
    };

    var _processNetworkGaps = function() {
        _startProcessorTime = window.performance.now();
        var firstStart = 0;
        var firstStop = 0;
        var tStart = 0;
        var tStop = 0;
        var totalTime = 0;
        if( _XMLNetworkTimes.length > 0 ) {
            _sortedXMLNetworkTimes = _XMLNetworkTimes.sort( function( a, b ) {
                return a.timeStart > b.timeStart ? 1 : -1;
            } );

            firstStart = _sortedXMLNetworkTimes[ 0 ].timeStart;
            firstStop = _sortedXMLNetworkTimes[ 0 ].timeStop;
            totalTime = firstStop - firstStart;

            for( var i = 1; i < _sortedXMLNetworkTimes.length; i++ ) {
                tStart = _sortedXMLNetworkTimes[ i ].timeStart;
                tStop = _sortedXMLNetworkTimes[ i ].timeStop;

                if( tStart < firstStop && firstStop < tStop ) {
                    totalTime += tStop - firstStop;
                } else if( tStart < firstStop && tStop < firstStop ) {
                    //Do nothing, time already accounted for...
                } else if( firstStop < tStart ) {
                    totalTime += tStop - tStart;
                }

                firstStop = max( tStop, firstStop );
            }
        }
        _endProcessorTime = window.performance.now();
        _processingTime += _endProcessorTime - _startProcessorTime;
        return totalTime;
    };

    var _processErrorInfo = function() {
        _startProcessorTime = window.performance.now();
        var errorXhrs = _errorInfo.requestsAborted.concat( _errorInfo.requestsErrored ).concat( _errorInfo.requestsTimeout );
        var _newErrorInfo = {
            requestsAborted: [],
            requestsErrored: [],
            requestsTimeout: []
        };
        _.forEach( _internalXMLHttpRequests, function( obj ) {
            var idx = errorXhrs.indexOf( obj.XHR );
            if( idx !== -1 ) {
                if( _errorInfo.requestsTimeout.includes( obj.XHR ) ) {
                    _newErrorInfo.requestsTimeout.push( obj );
                } else if( _errorInfo.requestsErrored.includes( obj.XHR ) ) {
                    _newErrorInfo.requestsErrored.push( obj );
                } else {
                    _newErrorInfo.requestsAborted.push( obj );
                }
            }
        } );

        _.forEach( _XMLFinishedHttpRequests, function( req ) {
            if( req.status && req.status.toLowerCase() !== 'ok' ) {
                _newErrorInfo.requestsErrored = _newErrorInfo.requestsErrored.concat( [ req ] );
            }
        } );
        _endProcessorTime = window.performance.now();
        _processingTime += _endProcessorTime - _startProcessorTime;
        return _newErrorInfo;
    };

    // -------------------------------------------------------------
    // HTTP Request/Response Info
    // -------------------------------------------------------------
    var _xhrProc = function( xhr, data ) {
        _startProcessorTime = window.performance.now();
        _transferSize += data && data.length ? data.length : 0;
        _requestSize += data && data.length ? data.length : 0;
        var JSONData;
        try {
            JSONData = typeof data === 'string' ? JSON.parse( data ) : {};
        } catch ( error ) {
            if( !xhr.requestURL.includes( 'socket.io' ) ) {
                logger.warn( 'XHR Data not in JSON format' );
            }
            JSONData = {};
        }
        var dataObj = {
            timeStart: splmStatsUtils.now(),
            XHR: xhr,
            timeResponse: 0,
            requestSize: data && data.length ? data.length : 0,
            logCorrelationID: JSONData.header && JSONData.header.state && JSONData.header.state.logCorrelationID ? JSONData.header.state.logCorrelationID : 0,
            startedDateTime: new Date().toISOString()
        };
        _XMLHttpRequests.push( dataObj );

        _.forEach( _eventListeners, function( val, key ) {
            xhr.addEventListener( key, function() {
                val( xhr );
            } );
        } );

        xhr.addEventListener( 'readystatechange', function() {
            if( xhr.readyState === 4 ) {
                _startProcessorTime = window.performance.now();
                var endTimeStamp = splmStatsUtils.now();
                _transferSize += xhr.response.length;
                _responseSize += xhr.response.length;
                for( var x in _XMLHttpRequests ) {
                    if( _XMLHttpRequests[ x ].XHR === xhr ) {
                        _XMLHttpRequests[ x ].timeResponse = endTimeStamp;

                        var url = xhr.responseURL;
                        if( !url || url.length === 0 ) {
                            url = xhr.requestURL || '';
                        }
                        // / Access to response data here ///
                        _XMLHttpRequests[ x ].totalTime = _XMLHttpRequests[ x ].timeResponse - _XMLHttpRequests[ x ].timeStart;
                        _XMLHttpRequests[ x ].responseUrl = url; // response url not available in IE, would have to customize looking in service data for url but not AW specific

                        _XMLFinishedHttpRequests.push( {
                            timeTaken: _XMLHttpRequests[ x ].totalTime,
                            status: xhr.statusText,
                            responseUrl: url,
                            responseSize: xhr.response.length || xhr.response.byteLength,
                            logCorrelationID: _XMLHttpRequests[ x ].logCorrelationID,
                            startedDateTime: _XMLHttpRequests[ x ].startedDateTime,
                            requestSize: _XMLHttpRequests[ x ].requestSize
                        } );
                        _internalXMLHttpRequests.push( {
                            timeTaken: _XMLHttpRequests[ x ].totalTime
                        } );
                        if( _maxHTTPPayload.payloadSize < xhr.response.length ) {
                            _maxHTTPPayload.payloadSize = xhr.response.length;
                            _maxHTTPPayload.requestUrl = url;
                        }

                        _XMLNetworkTimes.push( {
                            timeStart: _XMLHttpRequests[ x ].timeStart,
                            timeStop: endTimeStamp
                        } );

                        _XMLHttpRequests.splice( x, x + 1 );
                        break;
                    }
                }
                _endProcessorTime = window.performance.now();
                _processingTime += _endProcessorTime - _startProcessorTime;
            }
        } );
        _endProcessorTime = window.performance.now();
        _processingTime += _endProcessorTime - _startProcessorTime;
    };

    splmStatsXhrService.setMainProc( _xhrProc );

    var _reset = function() {
        _XMLHttpRequests = [];
        _XMLFinishedHttpRequests = [];
        _internalXMLHttpRequests = [];
        _maxHTTPPayload = {
            requestUrl: '',
            payloadSize: 0
        };
        _transferSize = 0;
        _requestSize = 0;
        _responseSize = 0;
        _XMLNetworkTimes = [];
        _sortedXMLNetworkTimes = [];
        _errorInfo = {
            requestsAborted: [],
            requestsErrored: [],
            requestsTimeout: []
        };
    };

    self.start = function() {
        _reset();
        _startProcessorTime = window.performance.now();
        _endProcessorTime = window.performance.now();
        _processingTime += _endProcessorTime - _startProcessorTime;
    };

    self.stop = function() {
        _startProcessorTime = window.performance.now();
        _endProcessorTime = window.performance.now();
        _processingTime += _endProcessorTime - _startProcessorTime;
    };

    self.getProcessingTime = function() {
        var _time = _processingTime;
        _processingTime = 0;
        return { XHRProcessorOverhead: _time };
    };

    self.getMetrics = function() {
        return {
            totalNetworkTime: _processNetworkGaps(),
            XHR: {
                requestSize: _requestSize,
                responseSize: _responseSize,
                totalSize: _transferSize,
                maxRequest: {
                    url: _maxHTTPPayload.requestUrl,
                    size: _maxHTTPPayload.payloadSize
                },
                details: _XMLFinishedHttpRequests,
                errorInfo: _processErrorInfo()
            },
            totalNetworkCost: _transferSize
        };
    };

    return self;
}

export default SPLMStatsXhrProcessor;

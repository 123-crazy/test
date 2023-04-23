// Copyright (c) 2020 Siemens

/**
 * AngularJS Watcher Profiler for perfomance log
 *
 * @module js/splmStatsNgProcessor
 *
 * @publishedApolloService
 *
 */
import splmStatsUtils from 'js/splmStatsUtils';
import AwRootScopeService from 'js/awRootScopeService';

/**
 * Instances of this class represent a profiler for AnuglarJS Scripting Time
 *
 * @class SPLMStatsNgProcessor
 */
function SPLMStatsNgProcessor() {
    var self = this;
    var _startTime = 0;
    var _endTime = 0;
    var _processingTime = 0;
    var _startProcessorTime = 0;
    var _endProcessorTime = 0;
    var _watchersStart = 0;
    var _watchersEnd = 0;
    var _digestCycleCount = 0;
    var _digestWatcher = null;

    var _reset = function() {
        _startTime = 0;
        _endTime = 0;
        _watchersStart = 0;
        _watchersEnd = 0;
        _digestCycleCount = 0;
    };

    self.start = function() {
        _startProcessorTime = window.performance.now();
        _reset();
        _watchersStart = splmStatsUtils.countWatchersFn();
        _digestWatcher = AwRootScopeService.instance.$watch( function() {
            _digestCycleCount++;
        } );
        _startTime = splmStatsUtils.now();
        _endProcessorTime = window.performance.now();
        _processingTime += _endProcessorTime - _startProcessorTime;
    };

    self.stop = function() {
        _startProcessorTime = window.performance.now();
        _endTime = splmStatsUtils.now();
        if( _digestWatcher ) {
            _digestWatcher();
            _digestWatcher = null;
        }
        _watchersEnd = splmStatsUtils.countWatchersFn();
        _endProcessorTime = window.performance.now();
        _processingTime += _endProcessorTime - _startProcessorTime;
    };

    self.getProcessingTime = function() {
        var _time = _processingTime;
        _processingTime = 0;
        return { NgProcessorOverhead: _time };
    };

    self.getMetrics = function() {
        return {
            TTI: _endTime - _startTime - splmStatsUtils.getLastTimeout() / 2,
            AngularJS: {
                watcherDifference: _watchersEnd - _watchersStart,
                DigestCycles: _digestCycleCount,
                watcherCount: _watchersEnd
            }
        };
    };

    return self;
}

export default SPLMStatsNgProcessor;

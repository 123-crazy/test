// Copyright (c) 2020 Siemens

/**
 * JavaScript Processor to get total scripting time
 *
 * @module js/splmStatsJsProcessor
 *
 */
import _ from 'lodash';
import splmStatsJsService from 'js/splmStatsJsService';

/**
 * JavaScript Processor to get total scripting time
 *
 * @class SPLMStatsJsProcessor
 */
function SPLMStatsJsProcessor() {
    var self = this;

    var _processingTime = 0;
    var _startProcessorTime = 0;
    var _endProcessorTime = 0;

    var _scriptJournals = [];

    /**
     * @returns {Float} Total scripting time for angular events
     */
    var _processScriptTime = function() {
        _startProcessorTime = window.performance.now();

        var totalTime = 0;
        _.forEach( _scriptJournals, function( obj ) {
            totalTime += obj.endTime - obj.startTime;
        } );

        _endProcessorTime = window.performance.now();
        _processingTime += _endProcessorTime - _startProcessorTime;
        return totalTime;
    };

    /**
     * 
     * @param {Object} data - startTime, endTime, name of process to track scripting time 
     */
    var _proc = function( data ) {
        _startProcessorTime = window.performance.now();
        _scriptJournals.push( data );
        _endProcessorTime = window.performance.now();
        _processingTime += _endProcessorTime - _startProcessorTime;
    };

    var _reset = function() {
        _scriptJournals = [];
    };

    self.start = function() {
        _startProcessorTime = window.performance.now();
        _reset();
        splmStatsJsService.addProc( _proc );
        _endProcessorTime = window.performance.now();
        _processingTime += _endProcessorTime - _startProcessorTime;
    };

    self.stop = function() {
        _startProcessorTime = window.performance.now();
        splmStatsJsService.removeProc( _proc );
        _endProcessorTime = window.performance.now();
        _processingTime += _endProcessorTime - _startProcessorTime;
    };

    self.getProcessingTime = function() {
        var _time = _processingTime;
        _processingTime = 0;
        return { JsProcessorOverhead: _time };
    };
    /**
     * @returns {Object} Object containg Total Scripting Time
     */
    self.getMetrics = function() {
        return {
            scriptTime: _processScriptTime()
        };
    };

    return self;
}

export default SPLMStatsJsProcessor;

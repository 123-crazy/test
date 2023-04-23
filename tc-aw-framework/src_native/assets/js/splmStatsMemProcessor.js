// Copyright (c) 2020 Siemens

/**
 * Memory Processor 
 *
 * @module js/splmStatsMemProcessor
 *
 * @publishedApolloService
 */

/**
 * Instances of this class represent a profiler for Memory Usage
 *
 * @class SPLMStatsMemProcessor
 */
function SPLMStatsMemProcessor() {
    var self = this;

    var _processingTime = 0;

    var _startProcessorTime = 0;

    var _endProcessorTime = 0;

    var _memoryCaptures = [];

    var _reset = function() {
        _memoryCaptures = [];
    };

    self.start = function() {
        _startProcessorTime = window.performance.now();
        _reset();

        if( window.performance && window.performance.memory ) {
            _memoryCaptures.push( {
                _usedJSHeapSize: ( window.performance.memory.usedJSHeapSize / window.performance.memory.jsHeapSizeLimit * 100 ).toFixed( 2 ) + '%',
                _bytesUsed: window.performance.memory.usedJSHeapSize
            } );
        }

        _endProcessorTime = window.performance.now();
        _processingTime += _endProcessorTime - _startProcessorTime;
    };

    self.stop = function() {
        _startProcessorTime = window.performance.now();
        if( window.performance && window.performance.memory ) {
            _memoryCaptures.push( {
                _usedJSHeapSize: ( window.performance.memory.usedJSHeapSize / window.performance.memory.jsHeapSizeLimit * 100 ).toFixed( 2 ) + '%',
                _bytesUsed: window.performance.memory.usedJSHeapSize
            } );
        }
        _endProcessorTime = window.performance.now();
        _processingTime += _endProcessorTime - _startProcessorTime;
    };

    self.getProcessingTime = function() {
        var _time = _processingTime;
        _processingTime = 0;
        return { MemProcessorOverhead: _time };
    };

    self.getMetrics = function() {
        if( window.performance && window.performance.memory ) {
            var memoryConsumption = _memoryCaptures[ _memoryCaptures.length - 1 ]._bytesUsed - _memoryCaptures[ 0 ]._bytesUsed; //end minus beginning
            var metrics = {
                MemoryConsumption: memoryConsumption, //Bytes base value
                MemoryUsed: _memoryCaptures[ _memoryCaptures.length - 1 ]._bytesUsed,
                MemoryStart: _memoryCaptures[ _memoryCaptures.length - 1 ]._bytesUsed,
                MemoryEnd: _memoryCaptures[ 0 ]._bytesUsed
            };
            return metrics;
        }
        return {
            MemoryConsumption: 0,
            MemoryUsed: 0
        };
    };

    return self;
}

export default SPLMStatsMemProcessor;

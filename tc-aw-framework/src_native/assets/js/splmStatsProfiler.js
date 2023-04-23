// Copyright (c) 2020 Siemens

/**
 * AngularJS Watcher Profiler for perfomance log
 *
 * @module js/splmStatsProfiler
 *
 * @publishedApolloService
 *
 */
import _ from 'lodash';
import browserUtils from 'js/browserUtils';


/**
 * Instances of this class represent a processor for HTTP Request/Response
 *
 * @class SPLMStatsProfiler
 */
function SPLMStatsProfiler() {
    var self = this;

    var _processorMap = {};
    var _reporters = [];

    // Context string as identifier
    var _title = '';

    var _processingTime = false;

    self.includeProcessorTime = function() {
        _processingTime = true;
    };

    self.getIncludeProcessorTime = function() {
        return _processingTime;
    };

    self.start = function() {
        _.forEach( _processorMap, function( processor ) {
            processor.start();
        } );
    };

    self.stop = function() {
        _.forEach( _processorMap, function( processor ) {
            processor.stop();
        } );
    };

    self.getMertics = function() {
        var mertics = {};
        _.forEach( _processorMap, function( processor ) {
            _.assign( mertics, processor.getMetrics() );
            _.assign( mertics, processor.getProcessingTime() );
        } );
        mertics.title = _title;
        mertics.BrowserType = browserUtils.getBrowserType();
        return mertics;
    };

    self.report = function() {
        var metrics = self.getMertics();
        _.forEach( _reporters, function( reporter ) {
            reporter.report( metrics );
        } );
    };

    self.addProcessor = function( name, processor ) {
        _processorMap[ name ] = processor;
    };

    self.addReporter = function( reporter ) {
        _reporters.push( reporter );
    };

    self.setTitle = function( title ) {
        _title = title;
    };

    return self;
}

export default SPLMStatsProfiler;

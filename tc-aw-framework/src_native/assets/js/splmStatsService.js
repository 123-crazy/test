// Copyright (c) 2020 Siemens

/**
 * This utility module provides helpful functions intended to efficiently manipulate pltable contents.
 *
 * @module js/splmStatsService
 */
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import cfgSvc from 'js/configurationService';
import SPLMStatsXhrProcessor from 'js/splmStatsXhrProcessor';
import SPLMStatsDomProcessor from 'js/splmStatsDomProcessor';
import SPLMStatsMemProcessor from 'js/splmStatsMemProcessor';
import SPLMStatsNgProcessor from 'js/splmStatsNgProcessor';
import SPLMStatsJsProcessor from 'js/splmStatsJsProcessor';
import SPLMStatsAnalyticsReporter from 'js/splmStatsAnalyticsReporter';
import SPLMStatsDebugReporter from 'js/splmStatsDebugReporter';
import SPLMStatsMobileReporter from 'js/splmStatsMobileReporter';
import SPLMStatsCucumberReporter from 'js/splmStatsCucumberReporter';
import SPLMStatsProfiler from 'js/splmStatsProfiler';
import SPLMStatsMonitor from 'js/splmStatsMonitor';
import SPLMStatsClickListener from 'js/splmStatsClickListener';
import SPLMStatsLocationListener from 'js/splmStatsLocationListener';
import SPLMStatsCommandListener from 'js/splmStatsCommandListener';
import SPLMStatsUtils from 'js/splmStatsUtils';

var exports = {};
var plStatsCustomWait = false;
var plStatsEnabled = false;

var _createDefaultProfiler = function() {
    var profiler = new SPLMStatsProfiler();
    profiler.addProcessor( 'XHR', new SPLMStatsXhrProcessor() );
    profiler.addProcessor( 'DOM', new SPLMStatsDomProcessor() );
    profiler.addProcessor( 'MEM', new SPLMStatsMemProcessor() );
    profiler.addProcessor( 'NG', new SPLMStatsNgProcessor() );
    profiler.addProcessor( 'JS', new SPLMStatsJsProcessor() );
    profiler.includeProcessorTime();
    return profiler;
};

var _defaultAnalyticsConfig = {
    splmStatsConfiguration: {
        name: 'ActiveWorkspaceTest',
        appCtxValueFilters: [
            'com.siemens.splm.clientfx.tcui.xrt.',
            'com.siemens.splm.client.search.',
            'com.siemens.splm.client.',
            'teamcenter.search.search',
            'SubLocation',
            'Location'
        ],
        appCtxKeys: [ {
                name: 'Sublocation',
                searchPaths: [
                    [ 'locationContext', 'ActiveWorkspace:SubLocation' ]
                ]
            },
            {
                name: 'ViewMode',
                searchPaths: [
                    [ 'ViewModeContext', 'ViewModeContext' ]
                ]
            },
            {
                name: 'PrimaryPage',
                searchPaths: [
                    [ 'xrtPageContext', 'primaryXrtPageID' ]
                ]
            },
            {
                name: 'SecondaryPage',
                searchPaths: [
                    [ 'xrtPageContext', 'secondaryXrtPageID' ]
                ]
            },
            {
                name: 'clientScopeURI',
                searchPaths: [
                    [ 'sublocation', 'clientScopeURI' ]
                ]
            },
            {
                name: 'SelectedObjectType',
                searchPaths: [
                    [ 'selected', 'type' ]
                ]
            }
        ],
        triggers: {
            commands: []
        }
    }
};

export let createCucumberMonitor = function() {
    var profiler = _createDefaultProfiler();

    profiler.addReporter( new SPLMStatsCucumberReporter() );
    profiler.addReporter( new SPLMStatsDebugReporter() );

    var monitor = new SPLMStatsMonitor();

    monitor.addProfiler( profiler );
    plStatsEnabled = true;

    monitor.addListener( new SPLMStatsClickListener() );
    monitor.addListener( new SPLMStatsLocationListener() );
    monitor.addListener( new SPLMStatsCommandListener() );

    return monitor;
};

export let createAnalyticsMonitor = function() {
    var profiler = _createDefaultProfiler();

    var monitor = new SPLMStatsMonitor();
    monitor.addProfiler( profiler );
    plStatsEnabled = true;

    monitor.addListener( new SPLMStatsClickListener() );
    monitor.addListener( new SPLMStatsLocationListener() );
    monitor.addListener( new SPLMStatsCommandListener() );
    return monitor;
};

export let createCommandMonitor = function() {
    var profiler = _createDefaultProfiler();
    profiler.addReporter( new SPLMStatsDebugReporter() );

    plStatsEnabled = true;
    var monitor = new SPLMStatsMonitor();
    monitor.addProfiler( profiler );
    monitor.addListener( new SPLMStatsCommandListener() );

    return monitor;
};

export let createLocationMonitor = function() {
    var profiler = _createDefaultProfiler();
    profiler.addReporter( new SPLMStatsDebugReporter() );

    plStatsEnabled = true;
    var monitor = new SPLMStatsMonitor();
    monitor.addProfiler( profiler );
    monitor.addListener( new SPLMStatsLocationListener() );

    return monitor;
};

/**
 * Function to enable custom wait for plStats
 */
export let enablePLStatsCustomWait = function() {
    plStatsCustomWait = true;
};

/**
 * Function to disable custom wait for plStats
 */
export let disablePLStatsCustomWait = function() {
    plStatsCustomWait = false;
};

/**
 * Function to return custom plStats flag
 */
export let getPLStatsCustomFlag = function() {
    return plStatsCustomWait;
};

/**
 * Function to check if PLStats is enabled
 * @returns {Boolean} plStatsEnabled
 */
export let isPLStatsEnabled = function() {
    return plStatsEnabled;
};

export let initProfiler = function() {
    var urlAttrs = browserUtils.getUrlAttributes();
    var usePLStats = urlAttrs.usePLStats !== undefined;
    var profileUrl = urlAttrs.profileUrl !== undefined;
    var profileCmd = urlAttrs.profileCmd !== undefined;
    if( usePLStats || !SPLMStatsUtils.isAnalyticsDisabled() ) {
        // Enable a profiler by default
        var testMonitor = exports.createAnalyticsMonitor();
        var analyticsReporter = new SPLMStatsAnalyticsReporter();
        analyticsReporter.enable();
        testMonitor.addReporter( analyticsReporter );

        if( usePLStats ) {
            testMonitor.addReporter( new SPLMStatsDebugReporter() );
        }
        if( usePLStats && browserUtils.isMobileOS ) {
            testMonitor.addReporter( new SPLMStatsMobileReporter() );
        }
        testMonitor.enable();
        testMonitor.run();

        if( profileUrl ) {
            // Location Profiler
            var locMonitor = exports.createLocationMonitor();
            locMonitor.enable();
        }

        if( profileCmd ) {
            // Command Profiler
            var cmdMonitor = exports.createCommandMonitor();
            cmdMonitor.enable();
        }
    }
};

export let installAnalyticsConfig = function() {
    if( !cfgSvc.getCfgCached( 'analytics.splmStatsConfiguration' ) ) {
        cfgSvc.add( 'analytics', _defaultAnalyticsConfig );
    }
};

exports = {
    createCucumberMonitor,
    createAnalyticsMonitor,
    createCommandMonitor,
    createLocationMonitor,
    initProfiler,
    installAnalyticsConfig,
    enablePLStatsCustomWait,
    disablePLStatsCustomWait,
    getPLStatsCustomFlag,
    isPLStatsEnabled
};
export default exports;

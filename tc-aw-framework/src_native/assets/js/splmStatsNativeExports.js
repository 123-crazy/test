// Copyright (c) 2020 Siemens

/**
 * This a name space reference to PL Stats Native method.
 * @module js/splmStatsNativeExports
 */
import _SPLMStatsXhrProcessor from 'js/splmStatsXhrProcessor';
import _SPLMStatsDomProcessor from 'js/splmStatsDomProcessor';
import _SPLMStatsMemProcessor from 'js/splmStatsMemProcessor';
import _SPLMStatsNgProcessor from 'js/splmStatsNgProcessor';
import _SPLMStatsJsProcessor from 'js/splmStatsJsProcessor';
import _SPLMStatsAnalyticsReporter from 'js/splmStatsAnalyticsReporter';
import _SPLMStatsDebugReporter from 'js/splmStatsDebugReporter';
import _SPLMStatsMobileReporter from 'js/splmStatsMobileReporter';
import _SPLMStatsCucumberReporter from 'js/splmStatsCucumberReporter';
import _SPLMStatsProfiler from 'js/splmStatsProfiler';
import _SPLMStatsMonitor from 'js/splmStatsMonitor';
import _SPLMStatsClickListener from 'js/splmStatsClickListener';
import _SPLMStatsLocationListener from 'js/splmStatsLocationListener';
import _SPLMStatsCommandListener from 'js/splmStatsCommandListener';
import _SPLMStatsTtiPolyfill from 'js/splmStatsTtiPolyfill';

var exports = {};

export let SPLMStatsXhrProcessor = _SPLMStatsXhrProcessor;
export let SPLMStatsAnalyticsReporter = _SPLMStatsAnalyticsReporter;
export let SPLMStatsClickListener = _SPLMStatsClickListener;
export let SPLMStatsCommandListener = _SPLMStatsCommandListener;
export let SPLMStatsCucumberReporter = _SPLMStatsCucumberReporter;
export let SPLMStatsDebugReporter = _SPLMStatsDebugReporter;
export let SPLMStatsDomProcessor = _SPLMStatsDomProcessor;
export let SPLMStatsJsProcessor = _SPLMStatsJsProcessor;
export let SPLMStatsLocationListener = _SPLMStatsLocationListener;
export let SPLMStatsMemProcessor = _SPLMStatsMemProcessor;
export let SPLMStatsMobileReporter = _SPLMStatsMobileReporter;
export let SPLMStatsMonitor = _SPLMStatsMonitor;
export let SPLMStatsNgProcessor = _SPLMStatsNgProcessor;
export let SPLMStatsProfiler = _SPLMStatsProfiler;
export let SPLMStatsTtiPolyfill = _SPLMStatsTtiPolyfill;

exports = {
    SPLMStatsXhrProcessor,
    SPLMStatsAnalyticsReporter,
    SPLMStatsClickListener,
    SPLMStatsCommandListener,
    SPLMStatsCucumberReporter,
    SPLMStatsDebugReporter,
    SPLMStatsDomProcessor,
    SPLMStatsJsProcessor,
    SPLMStatsLocationListener,
    SPLMStatsMemProcessor,
    SPLMStatsMobileReporter,
    SPLMStatsMonitor,
    SPLMStatsNgProcessor,
    SPLMStatsProfiler,
    SPLMStatsTtiPolyfill
};
export default exports;

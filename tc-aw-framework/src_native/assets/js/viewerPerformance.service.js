// @<COPYRIGHT>@
// ==================================================
// Copyright 2022.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/viewerPerformance.service
 */
import splmStatsService from 'js/splmStatsService';
import logger from 'js/logger';

/**
 * Export
 */
let exports = {};
var activePerformanceParameter = null;
var isPLStatsEnabled = null;

/* Enum viewer performance parameters */
export const viewerPerformanceParameters = {
    InitialLoading: 'InitialLoading',
    SessionSave: 'SessionSave',
    CaptureProductSnapshot: 'CaptureProductSnapshot',
    CaptureSessionSnapshot: 'CaptureSessionSnapshot',
    ApplyProductSnapshot: 'ApplyProductSnapshot',
    ApplySessionSnapshot: 'ApplySessionSnapshot',
    CreateSection: 'CreateSection',
    AreaSelect: 'AreaSelect',
    Measurement: 'Measurement',
    Proximity: 'Proximity',
    Volume: 'Volume'
};
Object.freeze( viewerPerformanceParameters );

/**
 * Function to enable plStats custom wait for 3D viewer
 */
export let enablePLStatsCustomWaitFor3DViewer = function() {
    splmStatsService.enablePLStatsCustomWait();
};

/**
 * Function to disable plstats custom wait for 3D viewer
 */
export let disablePLStatsCustomWaitFor3DViewer = function() {
    splmStatsService.disablePLStatsCustomWait();
};

/**
 * Function to enable 3D viewer wait flag
 */
export let enable3DViewerWaitFlag = function() {
    window.automationCustomWait = true;
};

/**
 * Function to disable 3D viewer wait flag
 */
export let disable3DViewerWaitFlag = function() {
    window.automationCustomWait = false;
};

/**
 * Set 3D viewer perfromance mode
 *
 * @param {Boolean} mode true if viewer is visible
 */
export let setViewerPerformanceMode = function( isEnabled ) {
    if( isEnabled ) {
        exports.enable3DViewerWaitFlag();
        exports.enablePLStatsCustomWaitFor3DViewer();
    } else {
        exports.disable3DViewerWaitFlag();
        exports.disablePLStatsCustomWaitFor3DViewer();
    }
};

/**
 * Start viewer performance data capture
 *
 * @param {String} active performance parameter
 */
export let startViewerPerformanceDataCapture = function( activePerformanceParam ) {
    if( viewerPerformanceParameters.hasOwnProperty( activePerformanceParam ) ) {
        activePerformanceParameter = activePerformanceParam;
        window.startInitialise3Dusecase = window.performance.now();
    } else {
        window.startInitialiseSelectionUsecase = window.performance.now();
    }
};

/**
 * Print performace info
 *
 * @param {String} active Performance param
 */
let printPerformaceInfo = function( activePerformanceInfo, performanceCaptureStartTime ) {
    logger.info( '+=========================================================================+' );
    logger.info( '| ' + activePerformanceInfo, ( ( window.performance.now() - performanceCaptureStartTime ) / 1000 ).toFixed( 4 ) + 's' );
    logger.info( '+=========================================================================+' );
};

/**
 * Stop viewer performance data capture
 *
 * @param {String} active Performance Parameter
 * @param {Boolean} true in case of Intermittent Capture
 */
export let stopViewerPerformanceDataCapture = function( activePerformanceInfo, viewerAction ) {
    if( viewerAction === 'IntermittentCapture' ) {
        printPerformaceInfo( activePerformanceInfo, window.startInitialise3Dusecase );
    } else if( viewerAction === 'viewerOrTreeSelection' && window.startInitialiseSelectionUsecase ) {
        printPerformaceInfo( activePerformanceInfo, window.startInitialiseSelectionUsecase );
        delete window.startInitialiseSelectionUsecase;
    } else if( window.startInitialise3Dusecase ) {
        printPerformaceInfo( activePerformanceInfo, window.startInitialise3Dusecase );
        delete window.startInitialise3Dusecase;
        activePerformanceParameter = null;
    }
};

/**
 * Get Viewer Actions Info
 *
 ** @returns {String} active performance parameter
 */
export let getViewerPerformanceInfo = function() {
    return activePerformanceParameter;
};

/**
 * Check if performance monitor is enabled
 *
 * @returns {Boolean} true/false
 */
export let isPerformanceMonitoringEnabled = function() {
    if( isPLStatsEnabled === null ) {
        isPLStatsEnabled = splmStatsService.isPLStatsEnabled();
        return isPLStatsEnabled;
    } else {
        return isPLStatsEnabled;
    }
};

/**
 *A glue code to support viewer performance service
 *
 * @param {Object} splmStatsService - splmStatsService
 *
 * @return {Object} - Service instance
 *
 * @member viewerPerformanceService
 *
 */
export default exports = {
    enablePLStatsCustomWaitFor3DViewer,
    disablePLStatsCustomWaitFor3DViewer,
    enable3DViewerWaitFlag,
    disable3DViewerWaitFlag,
    setViewerPerformanceMode,
    startViewerPerformanceDataCapture,
    stopViewerPerformanceDataCapture,
    isPerformanceMonitoringEnabled,
    getViewerPerformanceInfo,
    viewerPerformanceParameters
};


// Copyright (c) 2020 Siemens

/**
 * This service provides angular idle check to delay some critical watcher which impacts the performance
 *
 * @module js/awIdleWatcherService
 */
import app from 'app';
import SPLMStatsTtiPolyfillSvc from 'js/splmStatsTtiPolyfillService';

var exports = {};

export let isRunning = function() {
    return SPLMStatsTtiPolyfillSvc.isRunning();
};

/**
 * Returns a promise
 * @returns {Promise} - Promise that can be .then() attached to do any work after resolving/rejecting
 */
export let waitForPageToLoad = function() {
    return SPLMStatsTtiPolyfillSvc.waitForPageToLoad();
};

exports = {
    isRunning,
    waitForPageToLoad
};
export default exports;
/**
 * This service provides helpful APIs to register/unregister/update variables used to hold application state.
 *
 * @memberof NgServices
 * @member awNgIdleService
 *
 *
 * @returns {awNgIdleService} Reference to service's API object.
 */
app.factory( 'awIdleWatcherService', () => exports );

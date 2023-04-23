// Copyright (c) 2020 Siemens

/**
 * This service provides helpful APIs to set/check mock mode, used by application to work with mocked data.
 *
 * @module js/mockModeService
 *
 * @publishedApolloService
 */
import app from 'app';

var isMockMode = false;

var exports = {};

/**
 * Specify whether mock mode is active or not
 *
 * @returns {isMockMode} true/false.
 */
export let isMockModeActive = function() {
    return isMockMode;
};

/**
 * Update mock mode flag
 *
 * @param {boolean} activeStatus - true/false
 */
export let setMockMode = function( activeStatus ) {
    isMockMode = activeStatus;
};

exports = {
    isMockModeActive,
    setMockMode
};
export default exports;
/**
 * This service provides helpful APIs to set/verify mock mode.
 *
 * @memberof NgServices
 * @member mockModeService
 *
 * @returns {mockModeService} Reference to service's API object.
 */
app.factory( 'mockModeService', () => exports );

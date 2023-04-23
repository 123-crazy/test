// Copyright (c) 2020 Siemens
/* eslint-env es6 */

/**
 * Replacement for app.constant
 *
 * @module js/awConfiguration
 */
import _ from 'lodash';

export let config = {};

/**
 * @param {Path} path - path
 * @param {Object} data - Value to set at the 'path' location in the configuration.
 * @ignore
 */
export let set = function( path, data ) {
    _.set( config, path, data );
};

/**
 * Get cached configuration data.
 * This is only intended to be used by the bootstrap prior to NG module initialization.
 *
 * @param {String} path - path
 * @return {Object} request value if already cached
 */
export let get = function( path ) {
    return _.get( config, path );
};

// set assets
set( 'baseUrl', 'assets' );

export default {
    config,
    set,
    get
};

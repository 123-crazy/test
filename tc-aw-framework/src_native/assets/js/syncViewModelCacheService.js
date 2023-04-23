// Copyright (c) 2020 Siemens
/* eslint-env es6 */

/**
 * cache all active view models
 *
 * @module js/syncViewModelCacheService
 */
import _ from 'lodash';

export let config = {};

/**
 * @param {Path} path - path
 * @param {Object} data - Value to set at the 'path' location.
 * @ignore
 */
export let set = function( path, data ) {
    _.set( config, path, data );
};

/**
 * Get cached data.
 *
 * @param {String} path - path
 * @return {Object} get value if already cached
 */
export let get = function( path ) {
    return _.get( config, path );
};


export default {
    set,
    get
};

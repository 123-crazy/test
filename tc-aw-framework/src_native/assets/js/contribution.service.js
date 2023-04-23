// Copyright (c) 2020 Siemens

/* global afxDynamicImport */

/**
 * Service to manage native contributions using a registry object generated at build time. Uses ES6 import to load pieces
 * defined in the registry on demand. Also defines the {@link NgServices.contributionService} which is accessible
 * through injection.
 *
 * @module js/contribution.service
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import AwInjectorService from 'js/awInjectorService';
import cfgSvc2 from 'js/configurationService';
import _ from 'lodash';
import Debug from 'Debug';
import logger from 'js/logger';

import 'config/contributions';

var trace = new Debug( 'contributionService' );

let exports = {};

/**
 * Load the set of contributions that are mapped to the given key string.
 *
 * Each contribution should return a function. The function will be called with the key of the contribution
 * and a promise to resolve with the object. With this method contributions have the ability to get the
 * contribution dynamically instead of returning a static object.
 *
 * @param {String} key - The key that the contribution is mapped to
 * @return {Promise} A promise containing the objects that have been contributed.
 */
export let require = function( key ) {
    return cfgSvc2.getCfg( 'contributions' ).then( function( contributionProviders ) {
        if( contributionProviders[ key ] ) {
            return AwPromiseService.instance( function( resolve ) {
                // Allow module loader to manage the caching / registry
                trace( 'Loading contributions', key );
                afxDynamicImport( contributionProviders[ key ], function handleLoadedContribution() {
                    trace( 'Contribution load complete', key );
                    // Create a promise for each contribution function
                    var promises = [];
                    // Number of arguments is not known so have parse manually as array
                    _.forEach( Array.prototype.slice.call( arguments ), function( arg, index ) {
                        if( _.isFunction( arg ) ) {
                            var deferredLp = AwPromiseService.instance.defer();
                            arg( key, deferredLp, AwInjectorService.instance );
                            promises.push( deferredLp.promise );
                        } else {
                            logger.error( contributionProviders[ key ][ index ] +
                                ' did not return a contribution function' );
                        }
                    } );

                    // And resolve the main promise once all are resolved
                    resolve( AwPromiseService.instance.all( promises ) );
                } );
            } );
        }
        logger.trace( key + ' not found in contribution registry' );
        return [];
    } );
};

/**
 * Support a callback based pattern when angular is not loaded. This should only be used before the angular start.
 *
 * Async contributions are not supported with this pattern, so any contributions that support this method must
 * return the value directly.
 *
 * @param {String} key - The key that the contribution is mapped to
 * @param {Function} callback - A callback to call with the newly loaded contributions
 */
export let requireBeforeAppInitialize = function( key, callback ) {
    // The following fallback is to support the bootstrap usage.
    var contributionProviders = cfgSvc2.getCfgCached( 'contributions' );
    if( contributionProviders[ key ] ) {
        // Allow module loader to manage the caching / registry
        afxDynamicImport( contributionProviders[ key ], function() {
            var result = [];
            // Number of arguments is not known so have parse manually as array
            _.forEach( Array.prototype.slice.call( arguments ), function( arg, index ) {
                if( _.isFunction( arg ) ) {
                    result.push( arg( key ) );
                } else {
                    logger.error( contributionProviders[ key ][ index ] + ' did not return a contribution function' );
                }
            } );
            callback( result );
        } );
    } else {
        logger.trace( key + ' not found in contribution registry' );
        callback( [] );
    }
};

exports = {
    require,
    requireBeforeAppInitialize
};
export default exports;
/**
 * Service to manage native contributions using a registry object generated at build time.
 *
 * @memberOf NgServices
 */
app.factory( 'contributionService', () => exports );

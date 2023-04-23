// Copyright (c) 2020 Siemens

/**
 * @module js/awDuiLocalizationService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import localeSvc from 'js/localeService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

/**
 * Cached reference to the angular $q or promise service
 *
 * @private
 */

/**
 * cached reference to the _locale service
 *
 * @private
 */

/**
 * cached reference to the processed i18n map
 *
 * @private
 */
var _cachedI18nMap = {};

var exports = {};

/**
 * When notified that the i18n has changed clear out the cache.
 *
 * This will make any following calls to the i18n provider call the configuration service again
 */
eventBus.subscribe( 'configurationChange.i18n', function() {
    _cachedI18nMap = {};
} );

/**
 * Populate I18n map.
 *
 * @param {Object} i18nObjects - I18n data from ViewModel json
 * @param {String} cacheI18nKey - (Optional) Key value which refers to processed i18n in cached i18n Map.
 * @param {boolean} useNative - use browser native API to execute. Don't use it in return before beyond angular is done
 * @returns {Promise} an angular promise
 */
export let populateI18nMap = function( i18nObjects, cacheI18nKey, useNative ) {
    let PromiseObj = useNative ? Promise : AwPromiseService.instance;
    if( !i18nObjects ) {
        PromiseObj.resolve();
    }
    var i18n = {};
    var allPromises = [];

    return new PromiseObj( ( resolve, reject ) => {
        /**
         * Only cache processed i18n, when there is a cacheI18nKey defined
         */
        if( cacheI18nKey && _.isString( cacheI18nKey ) ) {
            if( !_cachedI18nMap[ cacheI18nKey ] ) {
                for( var key2 in i18nObjects ) {
                    var promise2 = getLocalizedText( key2, i18nObjects[ key2 ], useNative );
                    then( i18n, key2, promise2 );
                    allPromises.push( promise2 );
                }

                PromiseObj.all( allPromises ).then( function() {
                    _cachedI18nMap[ cacheI18nKey ] = i18n;
                    resolve( i18n );
                } );
            } else {
                resolve( _cachedI18nMap[ cacheI18nKey ] );
            }
        } else {
            for( var key in i18nObjects ) {
                var promise = getLocalizedText( key, i18nObjects[ key ], useNative );
                then( i18n, key, promise );

                allPromises.push( promise );
            }

            PromiseObj.all( allPromises ).then( function() {
                resolve( i18n );
            } );
        }
    } );
};

/**
 * A helper method to attach a then(...) to provided promise
 *
 * @param {Object} i18n - The object holding i18n key object map
 * @param {String} key - The key into key map
 * @param {Promise} promise - AngularJS promise object
 */
var then = function( i18n, key, promise ) {
    promise.then( function( localizedText ) {
        i18n[ key ] = localizedText;
    } );
};

/**
 * Get a localized text for provided text from provided bundles
 *
 * @param {String} englishText - Key for lookup
 * @param {String|StringArray} bundles - Bundle(s) to look in.
 * @param {boolean} useNative - use browser native API to execute. Don't use it in return before beyond angular is done
 *
 * @returns {Promise} A promise resolved with the bundle object once loaded.
 */
var getLocalizedText = function( englishText, bundles, useNative ) {
    let PromiseObj = useNative ? Promise : AwPromiseService.instance;
    if( _.isArray( bundles ) ) {
        return getLocalizedTextFormBundlesRecursively( englishText, bundles.slice( 0 ), useNative );
    }
    // to support inline localization text
    return PromiseObj.resolve( bundles );
};

/**
 * Get a localized text for provided text from provided bundles, recursively if not found in previous bundle.
 *
 * @param {String} englishText - Key for lookup
 * @param {String|StringArray} bundles - Bundle(s) to look in.
 * @param {boolean} useNative - use browser native API to execute. Don't use it in return before beyond angular is done
 * @returns {Promise} promise with localizedText
 */
var getLocalizedTextFormBundlesRecursively = function( englishText, bundles, useNative ) {
    let PromiseObj = useNative ? Promise : AwPromiseService.instance;
    if( bundles.length === 0 ) {
        return PromiseObj.resolve();
    }
    return getLocalizedTextFromOneBundle( englishText, bundles.shift(), useNative ).then( function( localizedText ) {
        if( localizedText !== undefined ) {
            return localizedText;
        }
        return getLocalizedTextFormBundlesRecursively( englishText, bundles, useNative );
    } );
};

/**
 * Get a localized text for provided text from provided bundle.
 *
 * @param {String} englishText - Key for lookup
 * @param {String} bundle - Bundle to look in.
 * @param {boolean} useNative - use browser native API to execute. Don't use it in return before beyond angular is done
 *
 * @returns {Promise} A promise resolved with the bundle object once loaded.
 */
var getLocalizedTextFromOneBundle = function( englishText, bundle, useNative ) {
    return localeSvc.getLocalizedText( bundle, englishText, useNative );
};

exports = {
    populateI18nMap
};
export default exports;
/**
 * @memberof NgServices
 * @member awDuiLocalizationService
 *
 * @param {$q} $q - Service to use.
 * @param {localeService} localeSvc - Service to use.
 *
 * @returns {awDuiLocalizationService} Instance of the service API object.
 */
app.factory( 'awDuiLocalizationService', () => exports );

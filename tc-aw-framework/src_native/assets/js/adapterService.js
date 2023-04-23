// Copyright (c) 2020 Siemens

/**
 * This service is used to find the alternate object for a given model object
 *
 * @module js/adapterService
 * @namespace adapterService
 */
import app from 'app';
import adapterParser from 'js/adapterParserService';
import assert from 'assert';
import cfgSvc from 'js/configurationService';

import 'config/adapters';

let exports;

let _adapterConfigObject;

/**
 * ############################################################<BR>
 * Define the public functions exposed by this module.<BR>
 * ############################################################<BR>
 */

/**
 * This method returns the adapted objects based on a given object. This takes an array of source objects on which
 * the conditions will be applied. If any of the source object satisfies the condition, it takes the target object
 * corresponding to the sourceobject and returns it.
 *
 * @param {Array} sourceObjects - source objects
 * @param {Boolean} isFullyAdapted - if object should be recursively adapted
 * @return {Promise} Resolved with an array of adapted objects containing the results of the operation.
 */
export let getAdaptedObjects = function( sourceObjects, isFullyAdapted ) {
    assert( _adapterConfigObject, 'The Adapter Config service is not loaded' );
    return adapterParser.getAdaptedObjects( sourceObjects, _adapterConfigObject, isFullyAdapted );
};

/**
 * This method returns the adapted objects based on a given object. This takes an array of source objects on which
 * the conditions will be applied. If any of the source object satisfies the condition, it takes the target object
 * corresponding to the sourceobject and returns it.
 *
 * This is a blocking call and assumes that the underlying property on current object is already loaded and available
 * in cdm for the adapter service to fetch the adapted object. This function does not perform soa call neither does it
 * support capability to invoke functions from dependent modules
 *
 * @param {Array} sourceObjects - source objects
 * @return {Array} Adapted objects
 */
export let getAdaptedObjectsSync = function( sourceObjects ) {
    assert( _adapterConfigObject, 'The Adapter Config service is not loaded' );
    return adapterParser.getAdaptedObjectsSync( sourceObjects, _adapterConfigObject );
};

/**
 * This method apply and evaluate the conditions on the source object and returns boolean value accordingly.
 *
 * @param {Object} sourceObject - source object
 * @return {Object} verdict object
 */
export let applyConditions = function( sourceObject ) {
    adapterParser.setConfiguration( _adapterConfigObject );
    return adapterParser.applyConditions( sourceObject );
};

export let loadConfiguration = function() {
    _adapterConfigObject = cfgSvc.getCfgCached( 'adapters' );
};

exports = {
    getAdaptedObjects,
    getAdaptedObjectsSync,
    applyConditions,
    loadConfiguration
};
export default exports;

loadConfiguration();

/**
 * @member adapterService
 * @memberof NgServices
 *
 * @param {adapterParserService} adapterParser - Service to use.
 *
 * @returns {adapterService} Instance of the service API object.
 */
app.factory( 'adapterService', () => exports );

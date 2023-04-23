// Copyright (c) 2020 Siemens

/**
 * This service is used to the saveHandler object based on configuration.
 *
 * @module js/saveHandlerService
 */
import app from 'app';
import adapterParser from 'js/adapterParserService';
import appCtxService from 'js/appCtxService';
import assert from 'assert';
import _ from 'lodash';
import cfgSvc from 'js/configurationService';

import 'config/saveHandlers';

var _adapterConfigObject;

var exports = {};

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
 * @return {Promise} Resolved with an array of adapted objects containing the results of the operation.
 */
export let getSaveServiceHandlers = function( sourceObjects ) {
    assert( _adapterConfigObject, 'The Adapter Config service is not loaded' );
    sourceObjects.push( appCtxService.ctx );
    return adapterParser.getAdaptedObjects( sourceObjects, _adapterConfigObject ).then(
        function( adaptedObjects ) {
            _.forEach( sourceObjects, function( n ) {
                adaptedObjects = _.without( adaptedObjects, n );
            } );
            return adaptedObjects;
        } );
};

//  FIXME this should be loaded async but before the sync API below that uses it is called
_adapterConfigObject = cfgSvc.getCfgCached( 'saveHandlers' );

exports = {
    getSaveServiceHandlers
};
export default exports;
/**
 * @memberof NgServices
 */
app.factory( 'saveHandlerService', () => exports );

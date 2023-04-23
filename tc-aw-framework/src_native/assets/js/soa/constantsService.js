// Copyright (c) 2020 Siemens

/**
 * Note: Many of the the functions defined in this module return a {@linkcode module:angujar~Promise|Promise} object.
 * The caller should provide callback function(s) to the 'then' method of this returned object (e.g. successCallback,
 * [errorCallback, [notifyCallback]]). These methods will be invoked when the associated service result is known.
 *
 * @module soa/constantsService
 */
import app from 'app';
import soaSvc from 'soa/kernel/soaService';
import _ from 'lodash';

var exports = {};

/**
 * @private
 */
export let _cache = {
    globalConstant: {},
    typeConstant: {}
};

/**
 * @param {String} typeName - type name
 * @param {String} constantName - constant name
 * @return {String} type constant value
 */
export let getConstantValue = function( typeName, constantName ) {
    if( exports._cache.typeConstant.hasOwnProperty( typeName ) ) {
        var typeConstants = exports._cache.typeConstant[ typeName ];
        if( typeConstants.hasOwnProperty( constantName ) ) {
            return typeConstants[ constantName ];
        }
    }
    return null;
};

/**
 * @param {StringArray} keys - array of global constant names
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let getGlobalConstantValues2 = function( keys ) {
    return soaSvc.post( 'BusinessModeler-2011-06-Constants', 'getGlobalConstantValues2', {
        keys: keys
    } ).then( function( response ) {
        if( response.constantValues ) {
            _.forEach( response.constantValues, function( constantValue ) {
                exports._cache.globalConstant[ constantValue.key ] = constantValue.value;
            } );
        }
        return response;
    } );
};

/**
 * @param {StringArray} keys - array of type constant keys
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let getTypeConstantValues = function( keys ) {
    return soaSvc.post( 'BusinessModeler-2007-06-Constants', 'getTypeConstantValues', {
        keys: keys
    } ).then( function( response ) {
        if( response.constantValues ) {
            _.forEach( response.constantValues, function( constantValue ) {
                var typeName = constantValue.key.typeName;
                if( !exports._cache.typeConstant.hasOwnProperty( typeName ) ) {
                    exports._cache.typeConstant[ typeName ] = {};
                }
                var typeConstants = exports._cache.typeConstant[ typeName ];
                typeConstants[ constantValue.key.constantName ] = constantValue.value;
            } );
        }
        return response;
    } );
};

exports = {
    _cache,
    getConstantValue,
    getGlobalConstantValues2,
    getTypeConstantValues
};
export default exports;
/**
 * TODO
 *
 * @memberof NgServices
 * @member soa_constantsService
 */
app.factory( 'soa_constantsService', () => exports );

// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * Service to handle object type related functionality 
 * @module js/cbaObjectTypeService
 */

import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';
import constantsService from 'soa/constantsService';
import cbaConstants from 'js/cbaConstants';
import appCtxSvc from 'js/appCtxService';
import adapterSvc from 'js/adapterService';

let exports = {};

/**
 * Create input for BO Constant check SOA
 * @param {List} objectList The list of objects to check
 * @returns {Array} The list of objects
 */
let _createCheckBOTypeInput = function( objectList ) {
    let constantNameToCheck = cbaConstants.PART_DESIGN_QUALIFIER;
    let constantTypesToCheck = [];

    _.forEach( objectList, function( object ) {
        constantTypesToCheck.push( {
            typeName: object.type,
            constantName: constantNameToCheck
        } );
    } );

    return constantTypesToCheck;
};

/**
 * Check Bussiness object type
 * @param {List} constantTypesToCheck  List of constant type to check
 * @returns {object} Object contains separate map for designs, parts and products
 */
let _checkBOType = function( constantTypesToCheck ) {
    let deferred = AwPromiseService.instance.defer();
    let output = {};
    constantsService.getTypeConstantValues( constantTypesToCheck ).then( function( response ) {
        if( response && response.constantValues && response.constantValues.length > 0 ) {
            let designTypes = [];
            let partTypes = [];
            let productTypes = [];

            let typeConstantValues = response.constantValues;

            _.forEach( typeConstantValues, function( constantValue ) {
                let constantKey = constantValue.key;
                let constantName = constantKey.constantName;

                if( constantName === cbaConstants.PART_DESIGN_QUALIFIER ) {
                    if( constantValue.value === cbaConstants.DESIGN ) {
                        designTypes.push( constantKey.typeName );
                    } else if( constantValue.value === cbaConstants.PART ) {
                        partTypes.push( constantKey.typeName );
                    } else if( constantValue.value === cbaConstants.PRODUCT_EBOM ) {
                        productTypes.push( constantKey.typeName );
                    }
                    let partDesignQualifierType = appCtxSvc.getCtx( cbaConstants.CTX_PATH_PART_DESIGN_QUALIFIER + '.' + constantKey.typeName );
                    if ( !partDesignQualifierType ) {
                        appCtxSvc.updatePartialCtx( cbaConstants.CTX_PATH_PART_DESIGN_QUALIFIER + '.' + constantKey.typeName, constantValue.value );
                    }
                }
            } );

            output.designTypes = designTypes;
            output.partTypes = partTypes;
            output.productTypes = productTypes;
            deferred.resolve( output );
        }
    } );
    return deferred.promise;
};

/**
 * Get Design and Part from input list if any available.
 * @param {List} objectList List of objects to check
 * @returns {Object} Returns a object which hold designTypes, PartTypes and productTypes separated opbject
 */
export let getDesignsAndParts = function( objectList ) {
    let defer = AwPromiseService.instance.defer();

    let designTypes = [];
    let partTypes = [];
    let productTypes = [];

    let constantTypesToCheck = _createCheckBOTypeInput( objectList );

    let promise = _checkBOType( constantTypesToCheck );
    promise.then( function( result ) {
        let objectTypeMap = result;

        _.forEach( objectList, function( object ) {
            if( objectTypeMap.designTypes.includes( object.type ) ) {
                designTypes.push( object );
            } else if( objectTypeMap.partTypes.includes( object.type ) ) {
                partTypes.push( object );
            } else if( objectTypeMap.productTypes.includes( object.type ) ) {
                productTypes.push( object );
            }
        } );
        let output = {
            designTypes: designTypes,
            partTypes: partTypes,
            productTypes: productTypes
        };
        defer.resolve( output );
    } );
    return defer.promise;
};

/**
 * check whether the object is having given type i.e. qualifier type  
 * @param {*} object - Object
 * @param {*} type - Type can be Design/Part/Product
 * @returns {Boolean} - True if the object is having given type, otherwise false
 */
export let isObjectOfGivenType = function( object, type ) {
    let constantValue = appCtxSvc.getCtx( cbaConstants.CTX_PATH_PART_DESIGN_QUALIFIER + '.' + object.type );
    let result;
    let defer = AwPromiseService.instance.defer();

    if ( !constantValue ) {
        let objectList = [ object ];
        let constantTypesToCheck = _createCheckBOTypeInput( objectList );

        let promise = constantsService.getTypeConstantValues( constantTypesToCheck );
        promise.then( function( response ) {
            result =  response.constantValues[0].value === type;
            defer.resolve( result );
        } );
    } else {
        result =  constantValue === type;
        defer.resolve( result );
    }
    return defer.promise;
};


/**
 * Get object qualifier type
 * @param {object} object - Object to check
 * @returns {string} - Object qualifier type
 */
export let getObjectQualifierType = function( object ) {
    let adaptedObject = adapterSvc.getAdaptedObjectsSync( [ object ] )[0];

    if( appCtxSvc.ctx.preferences.FND0_DESIGNREVISION_TYPES.includes( adaptedObject.type ) ) {
        return cbaConstants.DESIGN;
    }

    if( appCtxSvc.ctx.preferences.FND0_PARTREVISION_TYPES.includes( adaptedObject.type ) ) {
        return cbaConstants.PART;
    }

    if( appCtxSvc.ctx.preferences.FND0_PRODUCTEBOMREVISION_TYPES.includes( adaptedObject.type ) ) {
        return cbaConstants.PRODUCT_EBOM;
    }
};

/**
 * cbaObjectTypeService
 */
export default exports = {
    getDesignsAndParts,
    isObjectOfGivenType,
    getObjectQualifierType

};
app.factory( 'cbaObjectTypeService', () => exports );

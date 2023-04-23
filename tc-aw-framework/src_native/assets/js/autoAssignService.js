// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/autoAssignService
 */
import * as app from 'app';
import soaSvc from 'soa/kernel/soaService';
import cdm from 'soa/kernel/clientDataModel';
import AwPromiseService from 'js/awPromiseService';
import uwPropertySvc from 'js/uwPropertyService';
import _ from 'lodash';
import logger from 'js/logger';

/**
 * Check if property is auto-assignable
 *
 * @param {Object} prop - The property
 * @return {Boolean} true if property is auto-assignable, false otherwise
 */
var _isAutoAssignable = function( prop ) {
    if( prop && prop.propertyDescriptor && prop.propertyDescriptor.constantsMap &&
        prop.propertyDescriptor.constantsMap.autoassignable === '1' ) {
        return true;
    }

    return false;
};

/**
 * Get the owning type of the property
 *
 * @param {Object} prop - The property
 * @return {String} The owning type
 */
var _getOwningType = function( prop ) {
    var parentViewObj = cdm.getObject( prop.parentUid );
    return parentViewObj.modelType ? parentViewObj.modelType.owningType : null;
};

/**
 * Extract the auto-assignable create properties from view model data.
 *
 * @param {Object} data - The view model data
 * @param {Number} opType - The operation type code
 * @return {ObjectArray} The array of auto-assignable properties
 */
var _getAllAutoAssignableProperties = function( data, opType ) {
    var keys;
    if( opType === 1 && data.objCreateInfo ) {
        keys = data.objCreateInfo.propNamesForCreate;
    } else {
        keys = Object.keys( data );
    }

    var autoAssignableProps = [];
    _.forEach( keys, function( key ) {
        var prop = _.get( data, key );
        if( _isAutoAssignable( prop ) ) {
            autoAssignableProps.push( prop );
        }
    } );

    return autoAssignableProps;
};

/**
 * Get the operation type code given operation type string
 *
 * @param {String} operationType - The operation type, must be 'CREATE', 'REVISE', or 'SAVEAS'
 * @return {Number|null} The operation type
 */
var _getOpType = function( operationType ) {
    if( operationType === 'CREATE' ) {
        return 1;
    } else if( operationType === 'REVISE' ) {
        return 2;
    } else if( operationType === 'SAVEAS' ) {
        return 3;
    }

    return null;
};

var exports = {};

/**
 * Async function to Auto-assign all properties
 *
 * @param {Object} data - The view model data
 * @param {String} operationType - The operation type, must be 'CREATE', 'REVISE', or 'SAVEAS'
 * @returns {Promise} Promise object
 */
export let autoAssignAllProperties = function( data, operationType ) {
    var opType = _getOpType( operationType );
    if( opType === null ) {
        logger.warn( 'autoAssignService.autoAssignProperty: unknown operation type!!' );
        return AwPromiseService.instance.resolve();
    }

    var autoAssignableProps = _getAllAutoAssignableProperties( data, opType );
    if( !autoAssignableProps || autoAssignableProps.length === 0 ) {
        logger.warn( 'autoAssignService.autoAssignAllProperties: No properties to auto-assign!!' );
        return AwPromiseService.instance.resolve();
    }

    // Populate SOA input
    var inputData = {
        generateNextValuesIn: []
    };

    _.forEach( autoAssignableProps, function( propIn ) {
        var owningType = _getOwningType( propIn );
        if( owningType === null ) {
            logger.warn( 'autoAssignService.autoAssignAllProperties: business object type for prop not found!!' );
        }

        var propName = propIn.propertyName;

        if( propIn.isAutoAssign === false ) {
            propIn.dbValue = '';
            return;
        }

        // Fill the pattern info.
        var propNameWithPattern = {};
        if( propIn.selectedPattern && _.isString( propIn.selectedPattern ) ) {
            propNameWithPattern[ propName ] = propIn.selectedPattern;
        } else if( _.isArray( propIn.patterns ) ) {
            propNameWithPattern[ propName ] = propIn.patterns[ 0 ];
        } else {
            propNameWithPattern[ propName ] = '';
        }

        var input = {
            clientId: propName,
            businessObjectName: owningType,
            operationType: opType,
            propertyNameWithSelectedPattern: propNameWithPattern
        };

        inputData.generateNextValuesIn.push( input );
    } );

    if( inputData.generateNextValuesIn.length === 0 ) {
        logger.warn( 'autoAssignService.autoAssignAllProperties: No properties to auto-assign!!' );
        return;
    }

    return soaSvc.post( 'Core-2013-05-DataManagement', 'generateNextValues', inputData )
        .then( function( response ) {
            // Loop through the auto-assignable props and set the generated values
            _.forEach( autoAssignableProps, function( propIn ) {
                var propName = propIn.propertyName;
                for( var id in response.generatedValues ) {
                    var genValue = response.generatedValues[ id ];
                    if( genValue.clientId === propName && genValue.generatedValues[ propName ] ) { // matched
                        if( genValue.generatedValues[ propName ].errorCode === 0 ) {
                            propIn.dbValue = genValue.generatedValues[ propName ].nextValue;
                            uwPropertySvc.updateViewModelProperty( propIn );
                        } else {
                            // LCS-637172 Blank out the property value if server returns error
                            propIn.dbValue = '';
                            uwPropertySvc.updateViewModelProperty( propIn );
                            logger.error( //
                                'autoAssignService.autoAssignAllProperties: Auto assign failed due to errorCode ' +
                                genValue.generatedValues[ propName ].errorCode );
                        }
                        break;
                    }
                }
            } );
        } ).catch( function() {
            // LCS-637172 Blank out the property value if server returns error
            _.forEach( autoAssignableProps, function( propIn ) {
                propIn.dbValue = '';
                uwPropertySvc.updateViewModelProperty( propIn );
            } );
        } );
};

/**
 * Auto-assign a single property.
 *
 * @param {Object} prop - The property to be auto-assigned
 * @param {String} operationType - The operation type, must be 'CREATE', 'REVISE', or 'SAVEAS'
 * @param {String} pattern - The pattern to be used for auto-assign; may be empty string
 * @param {Object} sourceObject - The source model object; must be set for 'REVISE' and 'SAVEAS' operation types
 * @param {Object} hasRevRuleAttached - The ViewModelProperty indicating if revision naming rule is attached
 */
export let autoAssignProperty = function( prop, operationType, pattern, sourceObject, hasRevRuleAttached ) {
    if( !_isAutoAssignable( prop ) ) {
        logger.warn( 'autoAssignService.autoAssignProperty: property is not auto-assignable!!' );
        return;
    }

    // Prepare SOA input
    // 1. operation type
    var opType = _getOpType( operationType );
    if( opType === null ) {
        logger.warn( 'autoAssignService.autoAssignProperty: unknown operation type!!' );
        return;
    }

    // 2. pattern
    var propName = prop.propertyName;
    var propNameWithPattern = {};
    if( pattern ) {
        // A new pattern is supplied, use it
        propNameWithPattern[ propName ] = pattern;
    } else if( prop.selectedPattern && _.isString( prop.selectedPattern ) ) {
        // No new pattern is given, use teh selected pattern on prop
        propNameWithPattern[ propName ] = prop.selectedPattern;
    } else if( _.isArray( prop.patterns ) ) {
        // No new pattern is given, use one form pattern map
        propNameWithPattern[ propName ] = prop.patterns[ 0 ];
    } else {
        propNameWithPattern[ propName ] = '';
    }

    var input = {
        operationType: opType,
        propertyNameWithSelectedPattern: propNameWithPattern
    };

    // 3. The BO type (i.e. the owning type of the prop)
    input.businessObjectName = _getOwningType( prop );

    // 4. For Revise and SaveAs, add source object
    if( opType === 2 || opType === 3 ) {
        if( sourceObject ) {
            input.additionalInputParams = {
                sourceObject: sourceObject.uid
            };
        } else {
            logger.warn( 'autoAssignService.autoAssignProperty: source object not specified!!' );
            return;
        }
    }

    var inputData = {
        generateNextValuesIn: [ input ]
    };

    // If prop is 'item_revision_id' has revision naming rule attached, use already generated pattern
    // If hasRevRuleAttached is only condition , then case where both naming rule and revision naming rules
    // are attached would fail
    if( propName === 'item_revision_id' && hasRevRuleAttached ) {
        prop.dbValue = pattern;
    } else {
        var promise = soaSvc.post( 'Core-2013-05-DataManagement', 'generateNextValues', inputData );
        promise.then( function( response ) {
            if( response.generatedValues[ 0 ].generatedValues[ propName ].errorCode === 0 ) {
                prop.dbValue = response.generatedValues[ 0 ].generatedValues[ propName ].nextValue;
            } else {
                // LCS-637172 Blank out the property value if server returns error
                prop.dbValue = '';
                logger.error( 'autoAssignService.autoAssignProperty: Auto assign failed due to errorCode ' +
                    response.generatedValues[ 0 ].generatedValues[ propName ].errorCode );
            }
        } ).catch( function() {
            // LCS-637172 Blank out the property value if server returns error
            prop.dbValue = '';
        } );
    }
};

export default exports = {
    autoAssignAllProperties,
    autoAssignProperty
};
/**
 * Auto assign service
 *
 * @memberof NgServices
 * @member saveAsService
 */
app.factory( 'autoAssignService', () => exports );

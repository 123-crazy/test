// Copyright (c) 2020 Siemens

/**
 * @module js/dynamicPropertyService
 */
import app from 'app';
import modelPropertySvc from 'js/modelPropertyService';
import cdm from 'soa/kernel/clientDataModel';
import dateTimeSvc from 'js/dateTimeService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import _ from 'lodash';
import parsingUtils from 'js/parsingUtils';
import 'js/uwDirectiveBaseUtils';

/**
 * Define the 'operator' that separate the 'operands' of an expression.
 */
var _operators = /\=\=|!=|:|&&|>|>=|<|<=/;

/**
 * Returns the individual fields
 *
 * @param {Object}objectData - Model object
 * @param {String}condName - Nested Property structure
 * @return {ObjectArray} output - Nested output structure
 */
function _getInputData( objectData, condName ) {
    var output;
    if( condName === 'dateApi' ) {
        var dobj = _.get( objectData, condName );
        var dval = null;

        if( dobj.dateObject ) {
            dval = dateTimeSvc.formatUTC( dobj.dateObject );
        }
        output = dval;
    } else {
        output = _.get( objectData, condName );
    }
    return output;
}

/**
 * Check the nested structure and returns the field.
 *
 * @param {Object}objectIndex - Index in array objects
 * @param {String}arrayObjs - Model object
 * @param {String}inArray - JSON string
 * @return {Object} Nested output structure
 */
function _constructOutputData( objectIndex, arrayObjs, inArray ) {
    var output = [];

    for( var i in inArray ) {
        var f = Object.getOwnPropertyNames( inArray[ i ] );
        if( f[ 0 ] === 'structName' ) {
            var functionName = _.get( inArray[ i ], f[ 0 ] );
            var t = _.get( inArray[ i ], f[ 1 ] );
            var k = _prepareObject( objectIndex, arrayObjs, t );

            output[ functionName ] = _.assign( {}, k );
        } else {
            var t2 = _.get( inArray[ i ], f[ 1 ] );
            var condName = _.get( inArray[ i ], f[ 0 ] );

            output[ condName ] = _getInputData( arrayObjs[ objectIndex ], t2 );
        }
    }

    if( output.dateValue ) {
        output.value = 0;
    }

    return output;
}

/**
 * Return the display string from the object
 *
 * @param {Object }objectData - Input Object
 * @param {String} prop - Property string
 * @param {String} dataInput - If any specific string or property define in the Input
 * @return {String} dispName - Display String
 *
 */
function _getDisplayName( objectData, prop, dataInput ) {
    var dispName;
    if( dataInput ) {
        var objUid = _.get( objectData, dataInput );
        var mObject = cdm.getObject( objUid );
        dispName = _.get( mObject, prop );
    } else {
        dispName = _.get( objectData, prop );
    }
    return dispName;
}

/**
 * Evaluate condition expression
 *
 * @param {String} expression - Expression {note: currently supporting ==,!=,&&,>,>=,<,<=}
 * @param {Object} evaluationEnv - The data environment for expression evaluation
 * @param {ObjectArray} objectData - The array of function objects which can be used in expression evaluation
 *
 * @return {Object} The evaluated condition result
 */
function _evaluateCondition( expression, evaluationEnv, objectData ) {
    var operands = expression.split( _operators );

    var reValue = false;

    var tempType = _.get( objectData, operands[ 0 ] );

    if( tempType === operands[ 1 ] ) {
        reValue = evaluationEnv;
    }

    return reValue;
}

/**
 * Evaluate the condition and return the value
 *
 * @param {Object}objectData - Model object
 * @param {String}types - Property name
 *
 * @return {Object} Supported type for the declarative
 */
function getPropertyValue( objectData, types ) {
    var returnVal = '';

    for( var i in types ) {
        var f = Object.getOwnPropertyNames( types[ i ] );
        var condName = _.get( types[ i ], f[ 0 ] );
        var condVal = _.get( types[ i ], f[ 1 ] );
        var val = _evaluateCondition( condName, condVal, objectData );
        if( val ) {
            returnVal = val;
        }
    }

    return returnVal;
}

/**
 * Evaluate expression
 *
 * @param {String} expression - expression {note: currently supporting ==,!=,&&,>,>=,<,<=}
 * @return {ObjectArray} operands - Array of the string objects
 */
function _getOperands( expression ) {
    return expression.split( _operators );
}

/**
 * Returns the nested property
 *
 * @param {Object}objectIndex - Index in array objects
 * @param {String}arrayObjs - Model object
 * @param {String}inArray - JSON string
 * @return {ObjectArray} output - Nested output structure
 */
function _prepareObject( objectIndex, arrayObjs, inArray ) {
    var output = [];
    var objectData = arrayObjs[ objectIndex ];

    for( var i in inArray ) {
        var f = Object.getOwnPropertyNames( inArray[ i ] );

        var condName = _.get( inArray[ i ], f[ 0 ] );
        var condValue = _.get( inArray[ i ], f[ 1 ] );

        if( f[ 0 ] === 'structName' ) {
            output[ condName ] = _constructOutputData( objectIndex, arrayObjs, condValue );
        } else {
            output[ condName ] = _getInputData( objectData, condValue );
        }
    }
    return output;
}

var exports = {};

/**
 * Get the view model property using the SOA input
 *
 * @param {String} arrayObjs - SOA response
 * @param {String} n - viewModel property
 * @return {ObjectArray} output - A ViewModel property object array
 */
export let createDynProperty = function( arrayObjs, n ) {
    var output = [];

    if( n.viewModelPropValues ) {
        for( var i in arrayObjs ) {
            var g = n.viewModelPropValues;
            var d = Object.getOwnPropertyNames( n.viewModelPropValues );

            var dispName = null;
            var ptype = null;
            var dbValue = null;

            for( var k in d ) {
                if( d[ k ] === 'displayName' ) {
                    dispName = _getDisplayName( arrayObjs[ i ], g[ d[ k ] ], n.dataInput );
                }
                if( d[ k ] === 'type' ) {
                    ptype = getPropertyValue( arrayObjs[ i ], g[ d[ k ] ] );
                }
                if( d[ k ] === 'dbValue' ) {
                    dbValue = getPropertyValue( arrayObjs[ i ], g[ d[ k ] ] );
                }
            }

            var propAttrHolder = {
                displayName: dispName,
                type: ptype,
                isRequired: '',
                isEditable: '',
                dbValue: dbValue,
                dispValue: '',
                labelPosition: ''
            };
            var viewProp = modelPropertySvc.createViewModelProperty( propAttrHolder );

            if( d[ k ] === 'propMisc' ) {
                var z = g[ d[ k ] ];

                for( var h in z ) {
                    var pName = z[ h ].propName;
                    var pValue = z[ h ].value;
                    var objUid = _.get( arrayObjs[ i ], pValue );
                    viewProp[ pName ] = objUid;
                }
            }
            output.push( viewProp );
        }
    }

    return output;
};

/**
 * prepare the SOA input using the JSON data for dynamic properties
 *
 * @param {Array} arrayObjs - ViewModelProperty Array
 * @param {Array} inArray - JSON array from data.
 *
 * @return {ObjectArray} Output array
 */
export let createSoaInput = function( arrayObjs, inArray ) {
    var modelOutput = [];

    for( var obj in arrayObjs ) {
        var output = _constructOutputData( obj, arrayObjs, inArray );

        modelOutput.push( _.assign( {}, output ) );
    }

    return modelOutput;
};

/**
 * prepare the SOA input using the JSON data for dynamic properties
 *
 * @param {objectArray} dynmData - JSON array from data.
 * @param {objectArray} data - ViewModelProperty Array
 * @param {objectArray} response - response object
 *
 * @return {ObjectArray} Output array
 */
export let processDataParseDefination = function( dynmData, data, response ) {
    var arrayObjs = response;
    var parseData = null;

    if( dynmData.outputFormat ) {
        var val = parsingUtils.parentGet( data, dynmData.dataInput );
        return exports.createSoaInput( val, dynmData.outputFormat );
    }

    if( dynmData.dataFilter ) {
        var filterStr = dynmData.dataFilter[ 0 ];
        var filterKeys = Object.getOwnPropertyNames( filterStr );
        var filterVal = filterStr[ filterKeys ];
        arrayObjs = exports.filterObjects( response, filterKeys, dynmData.path, filterVal, dynmData.dataInput );
        parseData = arrayObjs;
    }

    if( dynmData.outputFormatType && dynmData.outputFormatType === 'ViewModelObject' ) {
        var modelObjUid = parsingUtils.parentGet( response, dynmData.dataInput );
        var operationType = 'Edit';
        if( dynmData.operationType ) {
            operationType = dynmData.operationType;
        }

        var viewModelObj = viewModelObjectSvc.createViewModelObject( modelObjUid, operationType );
        if( viewModelObj ) {
            var propertyNames = _.keys( viewModelObj.props ).sort();
            viewModelObj.sortedPropNames = propertyNames;
        }

        return viewModelObj;
    }

    if( dynmData.viewModelPropValues ) {
        var parseTempData = exports.createDynProperty( arrayObjs, dynmData );
        parseData = parseTempData;
    }

    return parseData;
};

/**
 * Filter the Inputs based on some condition
 *
 * @param {Object} response -Response from server
 * @param {String} filterProperty - any filter condition
 * @param {String} path - Traversal path in output
 * @param {String} expectedValue - If any condition to check
 * @param {string} filterInput - any extra parameter to check
 *
 * @return {ObjectArray} Filtered objects from source array
 */
export let filterObjects = function( response, filterProperty, path, expectedValue, filterInput ) {
    var modelObjects = [];
    var modelObjectsArray = _.get( response, path );

    for( var i in modelObjectsArray ) {
        var operands = _getOperands( expectedValue );
        var tempObj = _.get( modelObjectsArray[ i ], operands[ 0 ] );

        if( !tempObj && filterInput ) {
            var objUid = _.get( modelObjectsArray[ i ], filterInput );
            var mObject = cdm.getObject( objUid );
            tempObj = _.get( mObject, operands[ 0 ] );
        }

        if( tempObj === operands[ 1 ] ) {
            modelObjects.push( modelObjectsArray[ i ] );
        }
    }

    return modelObjects;
};

exports = {
    createDynProperty,
    createSoaInput,
    processDataParseDefination,
    filterObjects
};
export default exports;
/**
 * Service to define for populating the dynamic data in view model format in panel.
 *
 * @member dynamicPropertyService
 * @memberof NgServices
 */
app.factory( 'dynamicPropertyService', () => exports );

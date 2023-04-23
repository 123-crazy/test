// Copyright (c) 2020 Siemens

/**
 * This service is used to parse the mongo-db like expression.
 *
 * @module js/adapterParserService
 *
 * @namespace adapterParserService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import assert from 'assert';
import expressionParserUtils from 'js/expressionParserUtils';
import declUtils from 'js/declUtils';

var _adapterConfigObject;

var exports = {};

var OP_ARRAY = [ '$and', '$or' ];

var _conditionQuickEval = {};

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
 * @param {Array} adapterConfigObject - Configuration to base adapting operation on.
 *
 * @returns {ObjectArray} objects adapted from source using adapter configuration.
 */
export let getAdaptedObjectsSync = function( sourceObjects, adapterConfigObject ) {
    var adaptedObjects = [];
    adaptedObjects = adaptedObjects.concat( sourceObjects );

    assert( adapterConfigObject, 'The Adapter Config service is not loaded' );
    _adapterConfigObject = adapterConfigObject;

    if( !_.isEmpty( _adapterConfigObject ) ) {
        var adoptees = [];
        _.forEach( sourceObjects, function( sourceObject ) {
            var verdictObj = exports.applyConditions( sourceObject );
            if( verdictObj && verdictObj.verdict ) {
                var targetProp = _adapterConfigObject[ verdictObj.index ].target;
                if( targetProp.prop ) {
                    var propObjs = sourceObject.props[ targetProp.prop ];
                    propObjs = _.isArray( propObjs ) ? propObjs : [ propObjs ];
                    _.forEach( propObjs, function( prop ) {
                        if( prop && prop.dbValues ) {
                            _.forEach( prop.dbValues, function( dbValue ) {
                                var modelObject = cdm.getObject( dbValue );
                                if( modelObject ) {
                                    adoptees.push( modelObject );
                                } else {
                                    adoptees.push( sourceObject );
                                }
                            } );
                        }
                    } );
                }
            }
        } );

        if( adoptees && adoptees.length > 0 ) {
            adaptedObjects = adoptees;
        }
    }

    return adaptedObjects;
};

/**
 * This method returns the adapted objects based on a given object. This takes an array of source objects on which
 * the conditions will be applied. If any of the source object satisfies the condition, it takes the target object
 * corresponding to the sourceobject and returns it.
 *
 * @param {Array} sourceObjects - source objects
 * @param {Array} adapterConfigObject - Configuration to base adapting operation on.
 * @param {Boolean} isFullyAdapted - if object should be recursively adapted
 *
 * @return {Promise} Resolved with an array of adapted objects containing the results of the operation.
 */
export let getAdaptedObjects = function( sourceObjects, adapterConfigObject, isFullyAdapted ) {
    assert( adapterConfigObject, 'The Adapter Config service is not loaded' );
    _adapterConfigObject = adapterConfigObject;

    if( !_.isEmpty( _adapterConfigObject ) ) {
        var promises = [];
        var adoptees = [];
        _.forEach( sourceObjects, function( sourceObject ) {
            promises.push( _getAdaptedObjectSource( sourceObject, isFullyAdapted ) );
        } );

        return AwPromiseService.instance.all( promises ).then( function( results ) {
            _.forEach( results, function( result ) {
                adoptees = adoptees.concat( result );
            } );
            return adoptees;
        } );
    }
    return AwPromiseService.instance.resolve( sourceObjects );
};

/**
 * This is to set the adapter config object
 *
 * @param {Array} adapterConfigObject - Configuration to base adapting operation on.
 */
export let setConfiguration = function( adapterConfigObject ) {
    _adapterConfigObject = adapterConfigObject;
};

/**
 * This method apply and evaluate the conditions on the source object and returns boolean value accordingly.
 *
 * @param {Object} sourceObject - source object
 * @param {Object} configObject - solution config object in case this function is called from a different context
 * @returns {Object} verdict object
 */
export let applyConditions = function( sourceObject, configObject ) {
    var index = 0;
    var verdict = false;
    if( !_.isUndefined( configObject ) ) {
        _adapterConfigObject = configObject;
    }
    while( index < _adapterConfigObject.length ) {
        var adaptrObjConf = _adapterConfigObject[ index ];
        var adaptrObjConfConds = adaptrObjConf.conditions;
        if( adaptrObjConfConds ) {
            var condKeys = _.keys( adaptrObjConfConds )[ 0 ];
            if( _.indexOf( OP_ARRAY, condKeys ) >= 0 ) {
                verdict = _traverseQueryTree( adaptrObjConfConds, sourceObject )[ 0 ];
            } else {
                verdict = _evaluateLeafNodes( adaptrObjConfConds, sourceObject );
            }
        }
        if( verdict ) {
            break;
        }
        index++;
    }

    var verdictObj = {};
    verdictObj.index = index;
    verdictObj.verdict = verdict;

    return verdictObj;
};

/**
 * @param {Object} sourceObject - source object
 * @param {Object} verdictObj - verdict object
 *
 * @return {Promise} Resolved with an array of adoptees containing the results of the operation.
 */
var _getAdoptees = function( sourceObject, verdictObj ) {
    var deferred = AwPromiseService.instance.defer();
    var allAdoptees = [];

    if( verdictObj.verdict ) {
        var targetProp = _adapterConfigObject[ verdictObj.index ].target;
        if( targetProp.prop ) {
            var adaptedObjs = sourceObject.props[ targetProp.prop ];
            if( adaptedObjs ) {
                const isArray = Array.isArray( adaptedObjs );
                if( isArray && adaptedObjs.length > 0 ) {
                    allAdoptees = allAdoptees.concat( adaptedObjs );
                } else if( isArray === false ) {
                    allAdoptees.push( adaptedObjs );
                }
            }
        }

        if( ( targetProp.method || targetProp.methodAsync ) && targetProp.deps ) {
            declUtils.loadDependentModule( targetProp.deps ).then(
                function( depModuleObj ) {
                    // _deps will be undefined when try to load adapterService inside itself
                    var _depModuleObj = depModuleObj;
                    if( !depModuleObj && targetProp.deps === 'js/adapterService' ) {
                        _depModuleObj = exports;
                    }

                    if( targetProp.method ) {
                        var ret = _depModuleObj[ targetProp.method ].apply( _depModuleObj, [ allAdoptees ] );
                        deferred.resolve( ret );
                    } else {
                        var retPromise = _depModuleObj[ targetProp.methodAsync ].apply( _depModuleObj, [ allAdoptees ] );
                        retPromise.then( function( response ) {
                            deferred.resolve( response );
                        }, function( error ) {
                            deferred.reject( error );
                        } );
                    }
                } );
        } else {
            deferred.resolve( allAdoptees );
        }
    } else {
        allAdoptees.push( sourceObject );
        deferred.resolve( allAdoptees );
    }

    return deferred.promise;
};

/**
 * private object, not exposed out of service This is placeholder of two functions
 */
var _logicalOperator = {};

/**
 * This takes array of boolean values and evaluate it in AND mode.
 *
 * @param {Object} values - values
 * @return {boolean} verdict
 */
_logicalOperator.$and = function( values ) {
    assert( values instanceof Array, 'Values is not an array' );
    var verdict = true;
    _.forEach( values, function( val ) {
        if( !val ) {
            verdict = false;
            return false; // to break the loop, not return value
        }
    } );
    return verdict;
};

/**
 * This takes array of boolean values and evaluate it in OR mode
 *
 * @param {Object} values - values
 * @return {Boolean} verdict
 */
_logicalOperator.$or = function( values ) {
    assert( values instanceof Array, 'Values is not an array' );
    var verdict = false;
    _.forEach( values, function( val ) {
        if( val ) {
            verdict = true;
            return false; // to break the loop, not return value
        }
    } );
    return verdict;
};

/**
 *
 * This method traverses the adapter condition file recursively to evaluate it against the source object
 *
 * @param {Object} rootObj - root object
 * @param {Object} sourceObject - source object
 * @return {Array} values
 */
var _traverseQueryTree = function( rootObj, sourceObject ) {
    var values = [];
    _.forEach( rootObj, function( childObj, logicalOps ) {
        if( _.indexOf( OP_ARRAY, logicalOps ) >= 0 ) {
            assert( childObj instanceof Array, 'The value of and/or logical operators should be in Array' );
            values.push( _logicalOperator[ logicalOps ]( _traverseQueryTree( childObj, sourceObject ) ) );
        } else if( _.intersection( OP_ARRAY, _.keys( childObj ) ).length > 0 ) {
            values = values.concat( _traverseQueryTree( childObj, sourceObject ) );
        } else {
            var val = _evaluateLeafNodes( childObj, sourceObject );
            if( !_.isUndefined( val ) ) {
                values.push( val );
            }
        }
    } );
    return values;
};

/**
 * @param {Object} leafNode - leaf node
 * @param {Object} sourceObject - source object
 * @return {Boolean|null} TRUE if conditions are valid
 */
var _evaluateLeafNodes = function( leafNode, sourceObject ) {
    var propKey = _.keys( leafNode )[ 0 ];
    assert( _.indexOf( OP_ARRAY, propKey ) < 0, 'These are not the leaf level nodes to evaluate' );
    if( _.indexOf( OP_ARRAY, propKey ) < 0 ) {
        var propRealValue = _.get( sourceObject, propKey );
        var condition = _.get( leafNode, propKey );
        var condKey = _.keys( condition )[ 0 ];
        var condVal = _.get( condition, condKey );
        var compareToKey = propKey + '@' + condKey; // modelType.typeHierarchy@$in
        var compareTo = {};
        compareTo[ compareToKey ] = condVal;
        if( !_conditionQuickEval[ compareToKey ] ) {
            _conditionQuickEval[ compareToKey ] = expressionParserUtils.getEvaluationFn( condKey, propKey, compareTo );
        }
        return _conditionQuickEval[ compareToKey ]( condVal, propRealValue );
    }
    return null;
};

/**
 * Retrieves the adapted object recursively.
 *
 * @param {*} sourceObject - source object
 * @param {*} isFullyAdapted - if object should be recursively adapted
 * @return {Promise} Resolved with an array of adoptees containing the results of the operation.
 */
var _getAdaptedObjectSource = function( sourceObject, isFullyAdapted ) {
    var deferred = AwPromiseService.instance.defer();
    var adaptedReturnObjects = [];
    var verdictObject = exports.applyConditions( sourceObject );

    if( verdictObject.verdict ) {
        var adaptedObjectPromise = _getAdoptees( sourceObject, verdictObject );

        adaptedObjectPromise.then( function( adaptedObjects ) {
            if( isFullyAdapted ) {
                var deferredPromises = [];

                _.forEach( adaptedObjects, function( adaptedObject ) {
                    deferredPromises.push( _getAdaptedObjectSource( adaptedObject, isFullyAdapted ) );
                } );

                AwPromiseService.instance.all( deferredPromises ).then( function( results ) {
                    _.forEach( results, function( result ) {
                        adaptedReturnObjects = adaptedReturnObjects.concat( result );
                    } );

                    deferred.resolve( adaptedReturnObjects );
                } );
            } else {
                deferred.resolve( adaptedObjects );
            }
        } );
    } else {
        adaptedReturnObjects.push( sourceObject );
        deferred.resolve( adaptedReturnObjects );
    }

    return deferred.promise;
};

exports = {
    getAdaptedObjectsSync,
    getAdaptedObjects,
    setConfiguration,
    applyConditions
};
export default exports;
/**
 * @member adapterParserService
 * @memberof NgServices
 *
 */
app.factory( 'adapterParserService', () => exports );

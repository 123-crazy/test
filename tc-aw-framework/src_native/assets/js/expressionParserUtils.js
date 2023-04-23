// Copyright (c) 2020 Siemens

/**
 * Module for condition/expression parser utilities
 *
 * @module js/expressionParserUtils
 */
import _ from 'lodash';
import parsingUtils from 'js/parsingUtils';
import dateParserUtils from 'js/dateParserUtils';
import Debug from 'Debug';

var trace = new Debug( 'expressionParserUtils' );
var exports = {};

/**
 * Reference to operators in expression objects
 */

export let $SOURCE = '$source';
export let $QUERY = '$query';
export let $ADAPT = '$adapt';
export let $ALL = '$all';
export let $AND = '$and';
export let $OR = '$or';
export let $EVENTSOURCE = '$eventSource';
export let $NOT = '$not';

/**
 * Map used to point to the utility function name based on the expression
 */
var _map_expr2Function = {
    $eq: 'equalTo',
    $lt: 'lessThan',
    $lte: 'lessThanOrEqualTo',
    $gt: 'greaterThan',
    $gte: 'greaterThanOrEqualTo',
    $ne: 'notEqualTo',
    $neq: 'notEqualsTo',
    $in: 'within',
    $notin: 'notIn',
    $isNull: 'isNull',
    $notNull: 'notNull',
    $vlookup: 'vlookup',
    $regexp: 'regexp',
    $notinrange: 'notInRange',
    $notinregexp: 'notInRegexp',
    $typeOf: 'typeOf'
};

/**
 * Gets dbValue for a non array property.
 *
 * @param {Object} prop - property object
 *
 * @return {Object} dbValue of the property
 */
var _getDbValueForProp = function( prop ) {
    var propValue = null;
    if( prop && prop.dbValue ) {
        propValue = prop.dbValue;
    } else if( prop && prop.dbValues && prop.dbValues.length > 0 ) {
        propValue = prop.dbValues[ 0 ];
    }

    return propValue;
};

/**
 * Traverses given path in the received object and returns the value
 * @param {String} path dot separated path
 * @param {Object} obj object to be traversed for finding the value against received path
 *
 * @return {Object} returns object as resolved by traversing the path inside the object
 */
export let resolve = function( path, obj ) {
    var resolvedObj;
    if( path && _.isString( path ) && obj && _.isObject( obj ) ) {
        resolvedObj = path.split( '.' ).reduce( function( prev, curr ) {
            return prev ? prev = _.get( prev, curr ) : undefined;
        }, obj );
    }

    return resolvedObj;
};

/**
 * Get alls sub expressions from a condition expression.
 *
 * @param {String|Object} s condition expression
 * @param {String} key the key which is being prcessed
 * @returns {String[]} nested sub-expressions
 */
export let getSubExpressions = function( s, key ) {
    if( typeof s === 'string' && ( key === $ADAPT || key === $SOURCE ) ) {
        //remove interpolation from the expression
        let expression = s.replace( '{{', '' ).replace( '}}', '' );
        //replace .0. with [0]. to avoid breaking change
        if( expression.includes( '.0.' ) ) {
            expression = expression.replace( '.0.', '[0].' );
        }
        //there are expressions which uses uiValues.0 pattern convert them as well
        if( expression.endsWith( '.0' ) ) {
            expression = expression.replace( '.0', '[0]' );
        }
        return [ expression ];
    }
    if( typeof s === 'object' ) {
        return Object.keys( s ) //Object.values( s ) if not for IE11
            .reduce( ( acc, nxt ) => acc.concat( getSubExpressions( s[ nxt ], nxt ) ), [] );
    }
    return [];
};

/**
 * Update dynamic values against the query operator. Ex: "$eq": "{{ctx.selected.props.object_string.dbValues[0]}}"
 * @param {Object} query Object containing operator as key and value that needs to be resolved from data node
 * @param {Object} dataNode Object used to resolve the values
 * @return {Object} updated query
 */
export let updateDynamicValues = function( query, dataNode ) {
    // LCS-166817 - Active Workspace tree table view performance in IE and embedded in TCVis is bad - Framework Fixes
    // Do copy only at level 0
    // LCS-168813 - AW404-Comparison use cases fails as color swab is not made available
    // _.clone( var, true ) is not in lodash any more...we should use _.cloneDeep
    // there are still several usage for _.clone(var, true), it gets copied here and that
    // is why we cause the regression.
    var updatedQuery = _.cloneDeep( query );
    return updateDynamicValuesInternal( updatedQuery, dataNode );
};

var updateDynamicValuesInternal = function( updatedQuery, dataNode ) {
    var expression = {};
    var expressionDataType;
    _.forEach( updatedQuery, function( value, key ) {
        if( key === '$notinrange' || dateParserUtils.isDate( value ) ) {
            expressionDataType = exports.getExpressionDataType( value );
            if( expressionDataType ) {
                expression = dateParserUtils.getExpressionDateValue( value, expressionDataType );
                updatedQuery.expressionType = expressionDataType;
                value = expression.value;
                updatedQuery[ key ] = expression.value;
            }
        }

        if( _.isString( value ) && _.startsWith( value, '{{' ) ) {
            var dynamicValToResolve = parsingUtils.getStringBetweenDoubleMustaches( value );
            updatedQuery[ key ] = exports.resolve( dynamicValToResolve, dataNode );
        } else if( _.isObject( value ) ) {
            updatedQuery[ key ] = exports.updateDynamicValues( value, dataNode );
        }
    } );
    return updatedQuery;
};

/**
 * Evaluates eventSource expression
 * @param {Object} exp eventSource expression
 * @param {Object} contextObj context object
 * @return {Boolean} verdict of expression evaluation
 */
export let evaluateEventSourceExpression = function( exp, contextObj ) {
    let eventSourceVal = exp[ exports.$EVENTSOURCE ];
    let evalResult = false;
    if( contextObj && contextObj.data && contextObj._source ) {
        let { data, _source } = contextObj;
        // need to check self/view-id/view-name
        if( _source === data._internal.modelId && ( eventSourceVal === 'self' || eventSourceVal === data._internal.viewId || eventSourceVal === data._internal.panelId ) ) {
            evalResult = true;
        }
    }
    return evalResult;
};

let checkOperatorResult = function( performAND, performOR, performNOT, evalCheckResult, result ) {
    if( performAND ) {
        return evalCheckResult && result;
    } else if( performOR ) {
        return evalCheckResult || result;
    } else if( performNOT ) {
        return !result;
    }
    return result;
};

/**
 * Evaluates checks using expression parser utils
 * @param {Object} query Object definition containing query details to be evaluated on received object
 * @param {Array} objects Array of objects against which the query needs to be evaluated
 * @param {Object} adapterSvc Adapter service
 * @return {Boolean} verdict of expression evaluation
 */
export let evaluateExpressions = function( query, objects, adapterSvc ) {
    var newValue = false;
    var queryToUse = query;
    var values = objects;
    if( !_.isArray( objects ) ) {
        values = [ objects ];
    }
    // determine whether all or atleast one result(s) should match
    var matchAll = queryToUse[ exports.$ALL ];

    // fetch the inner query that is value of $all
    queryToUse = matchAll || queryToUse;

    // evaluate the check on each of the value
    newValue = values.reduce( function( valReduceResult, value ) {
        // determine existence of multiple checks against same source inside the query
        var performAND = queryToUse[ exports.$AND ] || queryToUse[ exports.$ALL ];
        var performOR = queryToUse[ exports.$OR ];
        var performNOT = queryToUse[ exports.$NOT ];

        // create array of checks to be evaluated on the source
        var evalChecks = performAND || performOR || [ queryToUse ];
        evalChecks = performNOT ? [ performNOT ] : evalChecks;
        var verdict = evalChecks.reduce( function( evalCheckResult, evalCheck ) {
            var path = exports.resolve( exports.$SOURCE, evalCheck );
            // path i.e. $source can optionally have $adapt indicating the propValue needs to be adapted before use
            var shouldAdapt = path && path[ exports.$ADAPT ];
            path = shouldAdapt || path;

            if( !path && evalCheck && evalCheck[ exports.$EVENTSOURCE ] ) {
                const evalResult = evaluateEventSourceExpression( evalCheck, value );
                return checkOperatorResult( performAND, performOR, performNOT, evalCheckResult, evalResult );
            }

            var condition = exports.resolve( exports.$QUERY, evalCheck ) || evalCheck;
            var propValue = path ? exports.resolve( path, value ) : value;

            if( shouldAdapt ) {
                var valuesToAdapt = _.isArray( propValue ) ? propValue : [ propValue ];
                propValue = adapterSvc.getAdaptedObjectsSync( valuesToAdapt );
            }

            // determine whether the query has nested queries with $all / $and / $or / $source
            var recurseExpressionEvaluation = condition && ( condition[ exports.$NOT ] ||
                condition[ exports.$ALL ] || condition[ exports.$AND ] || condition[ exports.$OR ] || condition[ exports.$SOURCE ] );
            var result;
            if( recurseExpressionEvaluation ) {
                result = exports.evaluateExpressions( condition, propValue, adapterSvc );
            } else {
                result = exports.evaluateConditionExpression( condition, null, propValue );
            }

            return checkOperatorResult( performAND, performOR, performNOT, evalCheckResult, result );
        }, performAND );

        return matchAll ? valReduceResult && verdict : valReduceResult || verdict;
    }, matchAll );

    return newValue;
};

/**
 * Evaluate conditions eg. 1. "conditions": { "subscriptionId": { "$eq": "{{uid}}" } } eg. 2. "conditions": {
 * "object_desc": { "$eq": "Plane" }, "object_name": { "$eq": "Plane001" } }
 *
 * @param {Object} conditions - map of conditions
 * @param { Object } vmoObj - view model object properties map
 * @return {Boolean} TRUE if all conditions are valid
 */
export let evaluateConditions = function( conditions, vmoObj ) {
    var isValid = true;
    var vmoProps = vmoObj.props;
    for( var propName in conditions ) {
        if( conditions[ propName ] ) {
            if( _.isObject( conditions[ propName ] ) ) {
                var condition = conditions[ propName ];
                var vmoProp = vmoProps[ propName ];
                var propValue = _getDbValueForProp( vmoProp );

                var compareTo = {};
                for( var key in condition ) {
                    var value = condition[ key ];

                    var propKey = propName + '@' + key;
                    if( _.startsWith( value, '{{' ) ) {
                        var propToCompare = parsingUtils.getStringBetweenDoubleMustaches( value );
                        var prop = vmoProps[ propToCompare ];
                        if( !prop ) {
                            compareTo[ propKey ] = vmoObj[ propToCompare ];
                        } else {
                            compareTo[ propKey ] = _getDbValueForProp( prop );
                        }
                    } else {
                        compareTo[ propKey ] = value;
                    }
                }

                isValid = exports.evaluateConditionExpression( condition, propName, propValue, compareTo );
            } else {
                isValid = false;
            }
        }
        // break if even one condition is invalid
        if( !isValid ) {
            break;
        }
    }

    return isValid;
};

/**
 * Evaluate condition expression
 *
 * @param {Object} condition - condition object
 * @param {Object} propName - property name
 * @param {Object} propValue - real value of the property
 * @param {Object} compareTo - real value of the property
 * @return {Boolean} TRUE if conditions are valid
 */
export let evaluateConditionExpression = function( condition, propName, propValue, compareTo ) {
    var isValid = false;
    var resolvedPropValue = null;

    if( condition ) {
        for( var key in condition ) {
            if( key !== 'expressionType' ) {
                if( _.startsWith( key, '$' ) && _.has( _map_expr2Function, key ) ) {
                    var functionName = _map_expr2Function[ key ];
                    if( _.startsWith( condition[ key ], '{{' ) ) {
                        resolvedPropValue = compareTo[ propName + '@' + key ];
                    } else {
                        resolvedPropValue = condition[ key ];
                    }
                    if( condition.expressionType === 'Date' && propValue && resolvedPropValue ) {
                        var parsedDates = dateParserUtils.getParsedDates( propValue, resolvedPropValue );
                        resolvedPropValue = parsedDates.queryDate;
                        propValue = parsedDates.sourceDate;
                    }
                    isValid = exports[ functionName ]( resolvedPropValue, propValue, condition.expressionType );
                } else {
                    isValid = false;
                }
            }
        }
    }
    return isValid;
};

/**
 * Evaluating whether condition value is equal to property value.
 *
 * @param {String} condValue - condition value
 * @param {String} propValue - property value to compare with
 *
 * @return {Boolean} TRUE if condition value is equal to property value
 */
export let equalTo = function( condValue, propValue ) {
    var isValid = false;
    if( condValue && propValue ) {
        isValid = condValue.toString() === propValue.toString();
    } else {
        isValid = condValue === propValue;
    }

    return isValid;
};

/**
 * Evaluating whether viewmodel property is of a particular type .
 *
 * @param {Object} vmo - viewmodel object
 * @param {String} type - type of property.
 *
 * @return {Boolean} TRUE if condition value is equal to property value
 */

export let typeOf = function( type, vmo ) {
    var typeHieararchyArray = [];
    if( vmo ) {
        if( vmo.modelType && _.isArray( vmo.modelType.typeHierarchyArray ) ) {
            typeHieararchyArray = vmo.modelType.typeHierarchyArray;
        } else if( _.isArray( vmo.typeHierarchy ) ) {
            typeHieararchyArray = vmo.typeHierarchy;
        } else if( vmo.type ) {
            typeHieararchyArray = vmo.type;
        }
    }

    return typeHieararchyArray.includes( type );
};

/**
 * Evaluating whether property value contains the condition value .
 *
 * @param {Array} condValue - condition value array
 * @param {Array} propValue - property value to compare with. It should be an array containing values.
 *
 * @return {Boolean} TRUE if condition value is equal to property value
 */

export let within = function( condValue, propValue ) {
    var isValid = false;
    var testValue = _.isArray( propValue ) ? propValue : [ propValue ];
    var values = _.isArray( condValue ) ? condValue : [ condValue ];
    isValid = values.some( function( value ) {
        return _.indexOf( testValue, value ) >= 0;
    } );
    return isValid;
};
/**
 * Evaluating whether property value contains the condition value .
 *
 * @param {Array} condValue - condition value array
 * @param {Array} propValue - property value to compare with. It should be an array containing values.
 *
 * @return {Boolean} TRUE if condition value is equal to property value
 */

export let notInRange = function( condValue, propValue, type ) {
    var isNotInRange = false;
    var isConditionValid = false;

    if( condValue && condValue.length === 2 && propValue && type ) {
        var conditionLeft = condValue[ 0 ];
        var conditionRight = condValue[ 1 ];
        switch ( type ) {
            case 'Date':
                if( _.isFinite( conditionLeft ) && _.isFinite( conditionRight ) && _.isFinite( propValue ) ) {
                    isConditionValid = true;
                }
                break;

            case 'Number':
                conditionLeft = Number( conditionLeft );
                conditionRight = Number( conditionRight );
                propValue = Number( propValue );
                isConditionValid = true;
                break;

            case 'String':
                conditionLeft = conditionLeft.toString();
                conditionRight = conditionRight.toString();
                isConditionValid = true;
                break;
        }
        if( isConditionValid && conditionLeft > propValue || conditionRight < propValue ) {
            isNotInRange = true;
        }
    }

    return isNotInRange;
};

/**
 * Evaluating whether property value is not in the condition value array.
 *
 * @param {Array} condValue - condition value array
 * @param {Array} propValue - property value to compare with. It should be an array containing values.
 *
 * @return {Boolean} TRUE if condition values do not contain property value
 */

export let notIn = function( condValue, propValue ) {
    var verdict = exports.within( condValue, propValue );
    return !verdict;
};

/**
 * Evaluating whether condition value is less than property value. Only applicable for numbers
 *
 * @param {String} condValue - condition value
 * @param {String} propValue - property value to compare with
 *
 * @return {Boolean} TRUE if property value is less than condition value
 */
export let lessThan = function( condValue, propValue ) {
    var isValid = false;
    var condValueIn = Number( condValue );
    var propValueIn = Number( propValue );

    if( _.isFinite( condValueIn ) && _.isFinite( propValueIn ) ) {
        if( propValueIn < condValueIn ) {
            isValid = true;
        }
    }
    return isValid;
};

/**
 * Evaluating whether condition value is less than or equal to property value. Only applicable for numbers
 *
 * @param {String} condValue - condition value
 * @param {String} propValue - property value to compare with
 *
 * @return {Boolean} TRUE if property value is less than or equal to condition value
 */
export let lessThanOrEqualTo = function( condValue, propValue ) {
    var isValid = false;
    var condValueIn = Number( condValue );
    var propValueIn = Number( propValue );

    if( _.isFinite( condValueIn ) && _.isFinite( propValueIn ) ) {
        if( propValueIn <= condValueIn ) {
            isValid = true;
        }
    }
    return isValid;
};

/**
 * Evaluating whether condition value is greater than property value. Only applicable for numbers
 *
 * @param {String} condValue - condition value
 * @param {String} propValue - property value to compare with
 *
 * @return {Boolean} TRUE if property value is greater than condition value
 */
export let greaterThan = function( condValue, propValue ) {
    var isValid = false;
    var condValueIn = Number( condValue );
    var propValueIn = Number( propValue );

    if( _.isFinite( condValueIn ) && _.isFinite( propValueIn ) ) {
        if( propValueIn > condValueIn ) {
            isValid = true;
        }
    }

    return isValid;
};

/**
 * Evaluating whether condition value is greater than or equal to property value. Only applicable for numbers
 *
 * @param {String} condValue - condition value
 * @param {String} propValue - property value to compare with
 *
 * @return {Boolean} TRUE if property value is greater than or equal to condition value
 */
export let greaterThanOrEqualTo = function( condValue, propValue ) {
    var isValid = false;

    var condValueIn = Number( condValue );
    var propValueIn = Number( propValue );

    if( _.isFinite( condValueIn ) && _.isFinite( propValueIn ) ) {
        if( propValueIn >= condValueIn ) {
            isValid = true;
        }
    }
    return isValid;
};

/**
 * Evaluating whether condition value is not equal to property value.
 *
 * @param {String} condValue - condition value
 * @param {String} propValue - property value to compare with
 *
 * @return {Boolean} TRUE if condition value is not equal to property value
 */
export let notEqualTo = function( condValue, propValue ) {
    var isValid = false;

    if( condValue && propValue ) {
        isValid = condValue.toString() !== propValue.toString();
    } else {
        isValid = condValue !== propValue;
    }
    return isValid;
};

/**
 * Applicable for validation criteria -  Evaluating whether condition value is not equal to property value.
 *
 * @param {String} condValue - condition value
 * @param {String} propValue - property value to compare with
 *
 * @return {Boolean} TRUE if condition value is not equal to property value
 */
export let notEqualsTo = function( condValue, propValue ) {
    var isValid = false;

    if( condValue && propValue ) {
        isValid = condValue.toString() !== propValue.toString();
    }

    return isValid;
};

/**
 * Evaluating whether condition value matches the property value
 *
 * @param {String|Object} condValue - condition value. It can be a string to be transformed into a pattern,
 * or an object containing a $pattern and $options properties used to construct the RegExp object.
 * @param {String} propValue - property value to match against
 *
 * @return {Boolean} TRUE if condition matches the property value
 */
export let regexp = function( condValue, propValue ) {
    var isValid = false;
    var regexp;
    var value = propValue ? String( propValue ) : '';
    if( _.isString( condValue ) ) {
        regexp = new RegExp( condValue );
    } else if( _.isObject( condValue ) && condValue.$pattern ) {
        try {
            regexp = new RegExp( condValue.$pattern, condValue.$options );
        } catch ( err ) {
            // Invalid options
            isValid = false;
        }
    }
    if( regexp ) {
        isValid = regexp.test( value );
    }
    return isValid;
};

/**
 * Evaluating whether condition value matches the property value
 *
 * @param {String|Object} condValue - condition value. It can be a string to be transformed into a pattern,
 * or an object containing a $pattern and $options properties used to construct the RegExp object.
 * @param {String} propValue - property value to match against
 *
 * @return {Boolean} TRUE if condition matches the property value
 */
export let notInRegexp = function( condValue, propValue ) {
    if( condValue && propValue ) {
        return !exports.regexp( condValue, propValue );
    }
    return false;
};

/**
 * Enables looking up a value in given range and matching another value with the value at the same index but
 * different column in the range
 *
 * Example: Range is an array of arrays where first array holds objects and second array holds array of values.
 * range : [
 *   [ {"uid":"v1"}, {"uid":"v11"}, {"uid":"v111"} ],
 *   [ ["color1"], ["color2"], ["color3"] ]
 * }
 *
 * Calling vlookup with following inputs will return true:
 * vlookupInput = {
 *  "lookupValue" : "v11",
 *  "lookupValueKey" : "uid",
 *  "matchKey" : 1,
 *  "matchValue": "color2"
 * }
 * vlookup( vlookupInput, range ) :: returns true
 *
 * @param {Object} vlookupInput - Javascript object holding the lookupValue, lookupValueKey, matchKey and matchValue
 * @param {Object} range -        Javascript object with each value as array of string/int/boolean or objects OR
 *                                    array of string/int/boolean or object arrays
 *
 * @return {Boolean} TRUE if condition value is not equal to property value
 */
export let vlookup = function( vlookupInput, range ) {
    var lookupValueKey = vlookupInput.lookupValueKey;
    var lookupValue = vlookupInput.lookupValue;
    var matchKey = vlookupInput.matchKey;
    var matchValue = vlookupInput.matchValue;

    var valToMatchFromRange;

    // determine the lookup strategy based on type of range object
    if( _.isArray( range ) ) {
        // range is an array of arrays
        var matchIndex = -1;
        _.forEach( range, function( value ) {
            var values = _.isArray( value ) ? value : [ value ];
            _.forEach( values, function( currVal, arrPos ) {
                if( currVal ) {
                    var lookupValToMatch = lookupValueKey ? currVal[ lookupValueKey ] : currVal;
                    if( lookupValue === lookupValToMatch ) {
                        matchIndex = arrPos;
                        return false;
                    }
                }
            } );

            if( matchIndex > -1 ) {
                valToMatchFromRange = matchKey ? range[ matchKey ][ matchIndex ] : Object.keys( range )[ matchIndex ];
                valToMatchFromRange = valToMatchFromRange && _.isArray( valToMatchFromRange ) && valToMatchFromRange.length > 0 ? valToMatchFromRange[ 0 ] : valToMatchFromRange;
                return false;
            }
        } );
    } else {
        // range is an object with key value pair
        _.forEach( range, function( value, key ) {
            if( key === lookupValue ) {
                valToMatchFromRange = value;
                return false;
            }
        } );
    }

    return valToMatchFromRange === matchValue;
};

/* Gets eval function to cache for quicker evals in future */
/**
 *
 * @param {String} condKey - $in
 * @param {String} propKey - modelType.typeHierarchy
 */
export let getEvaluationFn = function( condKey, propKey ) {
    if( condKey[ 0 ] === '$' ) {
        return exports[ _map_expr2Function[ condKey ] ];
    }
    return function() {
        return false;
    };
};

/**
 * Evaluating whether property value is null
 *
 * @param {String} condValue - condition value - this is ignored
 * @param {String} propValue - property value to check for null reference
 *
 * @return {Boolean} TRUE if property value is null
 */
export let isNull = function( condValue, propValue ) {
    return !propValue;
};

/**
 * Evaluating whether property value is null
 *
 * @param {String} condValue - condition value - this is ignored
 * @param {String} propValue - property value to check for null reference
 *
 * @return {Boolean} TRUE if property value is null
 */
export let notNull = function( condValue, propValue ) {
    return !exports.isNull( condValue, propValue );
};

/**
 *get expression data type
 *
 * @param {object} value - date object
 *
 * @return {String} dataType like - date,string,number
 */
export let getExpressionDataType = function( value ) {
    try {
        var dataType;
        if( value ) {
            if( dateParserUtils.isDate( value ) ) {
                dataType = 'Date';
            } else if( _.isNumber( value[ 0 ] ) && _.isNumber( value[ 1 ] ) ) {
                dataType = 'Number';
            } else if( _.isString( value[ 0 ] ) && _.isString( value[ 1 ] ) ) {
                dataType = 'String';
            }
        }
        return dataType;
    } catch ( e ) {
        trace( 'Error in expression', e, value );
        return undefined;
    }
};

exports = {
    $SOURCE,
    $QUERY,
    $ADAPT,
    $ALL,
    $AND,
    $OR,
    $EVENTSOURCE,
    $NOT,
    resolve,
    updateDynamicValues,
    evaluateExpressions,
    evaluateConditions,
    evaluateConditionExpression,
    evaluateEventSourceExpression,
    equalTo,
    within,
    notInRange,
    notIn,
    lessThan,
    lessThanOrEqualTo,
    greaterThan,
    greaterThanOrEqualTo,
    notEqualTo,
    notEqualsTo,
    regexp,
    notInRegexp,
    vlookup,
    isNull,
    notNull,
    getExpressionDataType,
    typeOf,
    getEvaluationFn,
    getSubExpressions
};
export default exports;

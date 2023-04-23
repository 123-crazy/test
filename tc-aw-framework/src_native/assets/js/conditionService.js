// Copyright (c) 2020 Siemens
/* eslint-env es6 */

/**
 * This service provides the APIs to evaluate the declarative condition expression using given viewmodel context
 *
 * @publishedApolloService
 *
 * @module js/conditionService
 */

import app from 'app';
import AwParseService from 'js/awParseService';
import adapterService from 'js/adapterService';
import _ from 'lodash';
import assert from 'assert';
import eventBus from 'js/eventBus';
import parsingUtils from 'js/parsingUtils';
import expressionParserUtils from 'js/expressionParserUtils';
import logger from 'js/logger';
import debugService from 'js/debugService';
/**
 * the real exports in ng mode, which we want to expose it in top export too.
 */
export let moduleServiceImpl = {};

/**
 * Processes call back from watch due to state change and fires a 'condition.valueChanged' event in case the evaluation result of
 * the condition differs from the old value
 *
 * @param {Object} conditionStates - The set of conditions to announce any expression changes to.
 * @param {String} conditionName - The name of the condition to update when the expression changes.
 * @param {Array} queries - The array of objects containing query definitions
 * @param {Array} values - The array of objects of changed value to be used for each of the query object
 * @param {BooleanArray} adaptExpressions - The array of boolean values indicating whether each of the value needs to be adapted prior to usage
 * @param {Boolean} performAnd - Boolean value true indicating results of each query evaluation should be ANDed, false indicates ORed
 * @param {Object} conditionExpressions - The set of conditions values to announce any expression changes to.
 */
function _processWatch( conditionStates, conditionName, queries, values, adaptExpressions, performAnd, conditionExpressions ) {
    var oldValue = conditionStates[ conditionName ];

    var newValue = queries.reduce( function( prevVerdict, currQuery, queryIndex ) {
        var verdict;
        var valuesToUse = values[ queryIndex ];
        if( currQuery && _.isObject( currQuery ) && values && values.length === queries.length ) {
            // determine whether object requires to be adapted
            if( adaptExpressions[ queryIndex ] ) {
                var valuesToAdapt = _.isArray( valuesToUse ) ? valuesToUse : [ valuesToUse ];
                valuesToUse = adapterService.getAdaptedObjectsSync( valuesToAdapt );
            }
            // expression is an object, hence process the query object inside it
            verdict = expressionParserUtils.evaluateExpressions( currQuery, valuesToUse, adapterService );
        } else {
            // expression is simple string with boolean result
            verdict = Boolean( values && valuesToUse );
        }

        var newExpressionValue = valuesToUse;
        if( conditionExpressions.hasOwnProperty( conditionName ) && conditionExpressions[ conditionName ] !== newExpressionValue ) {
            eventBus.publish( 'condition.expressionValueChanged', {
                condition: 'conditions.' + conditionName,
                oldValue: conditionExpressions[ conditionName ],
                newValue: newExpressionValue
            } );
            conditionExpressions[ conditionName ] = valuesToUse;
        }
        return performAnd ? prevVerdict && verdict : prevVerdict || verdict;
    }, performAnd );

    if( oldValue !== newValue ) {
        if( logger.isDeclarativeLogEnabled() ) {
            debugService.debugConditions( conditionName, newValue, queries, 'ViewModel' );
        }
        conditionStates[ conditionName ] = newValue;
        eventBus.publish( 'condition.valueChanged', {
            condition: 'conditions.' + conditionName,
            oldValue: oldValue,
            newValue: newValue
        } );
    }
}

/**
 * Register a watch for given expression on provided scope and update conditionStates[conditionName] when
 * expression's value changes.
 *
 * @param {Object} conditionStates - The set of conditions to announce any expression changes to.
 * @param {Object} dataCtxNode - The 'dataCtxNode' (aka '$scope') to register the expression watch against.
 * @param {String} conditionName - The name of the condition to update when the expression changes.
 * @param {Array} expressions - Array of expression to be watched for value change.
 * @param {Object} conditionExpressions - The set of conditions to announce any values changes to.
 * @param {Array} queries - Optional parameter of array of objects containing query definitions for expression
 * @param {Array} adaptExpressions - Optional parameter array of booleans to indcate whether each expression should be adapted on watch callback
 * @param {Boolean} deepWatch - Optional parameter to indicate whether deep watching of the object is required or not
 * @param {Boolean} performAnd - Option parameter to indicate whether to perform AND or OR. Value true indicates ANDing
 */
function _registerWatch( conditionStates, dataCtxNode, conditionName, expressions, conditionExpressions, queries, adaptExpressions, deepWatch, performAnd ) {
    if( !queries ) {
        var watchQueryAdaptInfo = {
            watchers: [],
            queries: [],
            adapt: []
        };

        var multiAttributeANDExpression;
        var multiAttributeORExpression;
        expressions.map( function( expr ) {
            multiAttributeANDExpression = expr[ expressionParserUtils.$AND ];
            multiAttributeORExpression = expr[ expressionParserUtils.$OR ];

            var expressionsFinal = multiAttributeANDExpression || multiAttributeORExpression || expressions;
            expressionsFinal.map( function( finalExpr ) {
                var sourceToWatch = expressionParserUtils.resolve( expressionParserUtils.$SOURCE, finalExpr );
                var needsToAdapt = sourceToWatch && sourceToWatch[ expressionParserUtils.$ADAPT ];
                sourceToWatch = needsToAdapt || sourceToWatch || finalExpr;

                var executeQuery = expressionParserUtils.resolve( expressionParserUtils.$QUERY, finalExpr );
                watchQueryAdaptInfo.watchers.push( sourceToWatch );
                watchQueryAdaptInfo.queries.push( executeQuery || finalExpr );
                watchQueryAdaptInfo.adapt.push( Boolean( needsToAdapt ) );
            } );
        } );

        _registerWatch( conditionStates, dataCtxNode, conditionName, watchQueryAdaptInfo.watchers, conditionExpressions, watchQueryAdaptInfo.queries,
            watchQueryAdaptInfo.adapt, true, multiAttributeANDExpression );
    } else {
        // process expressions, queries and adaptExpressions array
        dataCtxNode.$watchGroup( expressions, function _watchConditionChange1( values ) {
            var dynamicValueResolvedQueries = queries.map( function( query ) {
                return expressionParserUtils.updateDynamicValues( query, dataCtxNode );
            } );

            _processWatch( conditionStates, conditionName, dynamicValueResolvedQueries, values, adaptExpressions, performAnd, conditionExpressions );
        }, deepWatch );
    }
}

/**
 * Initialize the condition service, register listeners for conditions using the given scope.
 *
 * @param {Object} conditionStates - The set of conditions to set an initial value of 'false' on.
 *
 * @param {Object} dataCtxNode - The 'dataCtxNode' (aka '$scope') to register the expression watch against.
 *
 * @param {Object} conditions - the condition object
 *
 * @param {Object} conditionExpressions - The set of conditions to track values.
 */
function _bindConditionWithExpression( conditionStates, dataCtxNode, conditions, conditionExpressions ) {
    if( conditions ) {
        _.forEach( conditions, function( condition, conditionName ) {
            conditionStates[ conditionName ] = false;
            if( condition.trackValues ) {
                conditionExpressions[ conditionName ] = undefined;
            }
            _registerWatch( conditionStates, dataCtxNode, conditionName, [ condition.expression ], conditionExpressions );
        } );
    }
}

/**
 * This method traverses the data tree and creates a listener for condition.
 *
 * @param {Object} dataCtxNode - The 'dataCtxNode' (aka '$scope') to register the expression watch against.
 *
 * @param {Object} declViewModel - The object who properties will be updated when the associated conditions are
 *            updated.
 */
function _bindDataWithCondition0( dataCtxNode, declViewModel ) {
    _.forEach( declViewModel, function( propValue, propName ) {
        /**
         * Skip binding to any '_internal' properties or those with 'null' values.
         */
        if( !propValue || _.isBoolean( propValue ) || _.isNumber( propValue ) || _.isFunction( propValue ) ) {
            return true;
        }

        if( _.isString( propValue ) ) {
            if( /^{{conditions\./.test( propValue ) ) {
                var results = propValue.match( parsingUtils.REGEX_DATABINDING );

                if( results && results.length === 4 ) {
                    dataCtxNode.$watch( results[ 2 ], function _watchConditionChange2( value ) {
                        declViewModel[ propName ] = Boolean( value );
                    } );
                }
            }
        } else if( _.isObject( propValue ) && !_.isEmpty( propValue ) ) {
            if( propValue.condition && propValue.value ) {
                dataCtxNode.$watch( propValue.condition, function _watchConditionChange3( value ) {
                    declViewModel[ propName ] = value ? propValue.value : null;
                } );
            } else {
                /**
                 * Recurse to bind with any sub-structures
                 */
                _bindDataWithCondition0( dataCtxNode, propValue );
            }
        }
    } );
}

var exports = {};

/**
 * Initialize the condition service, bind expression-condition-data
 *
 * @param {Object} declViewModel - The 'declViewModel' containing the set of conditions states as named properties.
 *
 * @param {Object} dataCtxNode - The 'dataCtxNode' (aka '$scope') this 'declViewModel' is placed on.
 *
 * @param {Object} conditions - the conditions object from JSON data.
 * @ignore
 */
export let init = function( declViewModel, dataCtxNode, conditions ) {
    if( dataCtxNode && conditions && declViewModel ) {
        _bindConditionWithExpression( declViewModel._internal.conditionStates, dataCtxNode, conditions, declViewModel._internal.conditionExpressions );
        _bindDataWithCondition( dataCtxNode, declViewModel );
    }
};

/**
 * This method traverses the data tree and creates a listener for condition.
 *
 * @param {Object} dataCtxNode - The 'dataCtxNode' (aka '$scope') to register the expression watch against.
 *
 * @param {Object} declViewModel - The object who properties will be updated when the associated conditions are
 *            updated.
 */
var _bindDataWithCondition = function( dataCtxNode, declViewModel ) {
    _.forEach( declViewModel._internal.origDeclViewModelJson.data, function( propVal, propName ) {
        _bindDataWithCondition0( dataCtxNode, declViewModel[ propName ] );
    } );
};

/**
 * This method initializes the condition service, register listeners for conditions using the given scope and also
 * creates a listener for condition for a dynamically created viewmodel property
 *
 * @param {Object} declViewModel - The object who properties will be updated when the associated conditions are
 *            updated.
 * @param {Stirng} propertyName - the dynamically created viewmodel property who properties will be updated
 *                                         when the associated conditions are updated.
 * @param {Object} conditionObj - the conditions object could be
 * 1. { name: 'checkLabelName',
 *      expression: {
 *      "$source": "data.expirationDate.dateApi.dateValue",
 *      "$query": {
 *      "$lt": "Date({{data.creationDate.dateApi.dateValue}})"
 *       }
 *   }
 *  }
 *  OR
 * 2. { name: 'checkLabelName',
 *         expression: "data.lotNumber.dbValue.indexOf('PQ') == -1"
 *    }
 *
 * @param {Object} dataCtxNode - The 'dataCtxNode' (aka '$scope') to register the expression watch against.
 */
export let attachDynamicCondition = function( declViewModel, propertyName, conditionObj, dataCtxNode ) {
    var conditions = {
        [ conditionObj.name ]: {
            expression: conditionObj.expression
        }
    };
    if( !dataCtxNode ) {
        dataCtxNode = declViewModel._internal.origCtxNode;
    }

    assert( propertyName, 'Proeprty Name is not defined' );
    var viewModelProperty = declViewModel[ propertyName ];
    assert( viewModelProperty, 'Unable to find propertyName in declViewModel' );

    _bindConditionWithExpression( declViewModel._internal.conditionStates, dataCtxNode, conditions, declViewModel._internal.conditionExpressions );
    _bindDataWithCondition0( dataCtxNode, viewModelProperty );
    dataCtxNode.conditions = declViewModel.getConditionStates();
};

/**
 * Evaluate condition expression
 *
 * @param {DeclViewModel} declViewModel - The 'declViewModel' context to evaluate the condition within.
 * @param {String} expression - Expression
 * @param {Object} evaluationEnv - The data environment for expression evaluation.
 * @param {Object} depModuleObj - The module object who's functions can be used in expression evaluation.
 *
 * @return {Any} The evaluated expression result.
 */
export let parseExpression = function( declViewModel, expression, evaluationEnv, depModuleObj ) {
    var evaluationContext = {};
    _.assign( evaluationContext, declViewModel, evaluationEnv, depModuleObj );
    if( _.isObject( expression ) ) {
        // loop through query and replace all instances of dynamic values i.e. {{xyz}} by actual values
        var updatedExpression = expressionParserUtils.updateDynamicValues( expression, evaluationContext );
        return expressionParserUtils.evaluateExpressions( updatedExpression, evaluationContext, adapterService );
    }

    return AwParseService.instance( expression )( evaluationContext );
};

/**
 * Evaluate condition expression and ensure a boolean is returned
 *
 * @param {DeclViewModel} declViewModel - The 'declViewModel' context to evaluate the condition within.
 * @param {String} expression - Expression
 * @param {Object} evaluationEnv - The data environment for expression evaluation.
 * @param {Object} depModuleObj - The module object who's functions can be used in expression evaluation.
 *
 * @return {Boolean} The evaluated condition result.
 */
export let evaluateCondition = function( declViewModel, expression, evaluationEnv, depModuleObj ) {
    return Boolean( exports.parseExpression( declViewModel, expression, evaluationEnv, depModuleObj ) );
};

const _evaluateConditionBasedExpression = function( condition, declViewModel, evaluateDepParams  ) {
    var finalConditionExpression;
    if( _.startsWith( condition, 'conditions.' ) ) {
        if( declViewModel._internal ) {
            finalConditionExpression = _.get( declViewModel._internal, condition );
        }else{
            finalConditionExpression = _.get( evaluateDepParams.conditionList, condition );
        }
    }
    // for condition": 'ctx.xyz || ctx.abc' or condition": '!ctx.xyz' or condition": '!conditions.xyz'
    if( finalConditionExpression === undefined ) {
        finalConditionExpression = condition;
    }else if( finalConditionExpression.expression ) {
        finalConditionExpression = finalConditionExpression.expression;
    }


    if( evaluateDepParams ) {
        return evaluateCondition( declViewModel, finalConditionExpression, evaluateDepParams.evaluationEnv, evaluateDepParams.depModuleObj );
    }
    return evaluateCondition( declViewModel, finalConditionExpression );
};

/**
 * Evaluate all variants of condition
 *
 * @param {String} condition - condition to evaluate
 * @param {DeclViewModel} declViewModel - context obj that is used for resolution like viewModel object
 * @param {Object} evaluateDepParams - attributes conditionList, clauseName, evaluationEnv, depModuleOb
 *                                {Object} conditionList- Conditions object of viewmodel
 *                                {String} clauseName -"activewhen","visiblewhen"
 *                                {Object} evaluationEnv -specific data required for this call like ctx.
 *                                {Object} depModuleObj
 * @return {Boolean} return true, if expression evalutes to true.
 */
export let evaluateConditionExpression = function( condition, declViewModel, evaluateDepParams ) {
      if( evaluateDepParams && typeof condition[evaluateDepParams.clauseName] === 'boolean' ) {
            return condition[evaluateDepParams.clauseName];
        /*
         *    activewhen: true
         */
        } else if( evaluateDepParams && condition[evaluateDepParams.clauseName] ) {
            condition = _.get( condition, evaluateDepParams.clauseName + '.condition' );

            if ( typeof condition === 'boolean' ) {
               return condition; //{  condition: true }
            }
        }
        if( condition && condition.length ) {
         /*
            evaluate * conditions expression
            *: {
                condition: "conditions.xyz"
            }
            */
            return _evaluateConditionBasedExpression( condition, declViewModel, evaluateDepParams );
        }
    return false;
};

Object.assign( moduleServiceImpl, exports );

exports = {
    init,
    attachDynamicCondition,
    parseExpression,
    evaluateCondition,
    evaluateConditionExpression
};
export default exports;
/**
 * This service contributes condition support in declarative UI framework. A view Model can have a conditions
 * section defined and these conditions can be used in view or in data sections of the 'declViewModel'.
 *
 * @memberof NgServices
 * @member conditionService
 *
 * @param {Object} AwParseService.instance - Service to use.
 * @param {Object} adapterService - Service to use.
 * @returns { Object } Instance of the service API object.
 */
app.factory( 'conditionService', () => exports );

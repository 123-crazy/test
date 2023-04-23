// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/*jshint -W061 */

/**
 * @module js/evaluateExpressionInGivenContext
 */
import app from 'app';

var exports = {};

var typeCast = function( value, type ) {
    var retValue;

    switch ( type ) {
        case "INTEGER":
            retValue = parseInt( value );
            break;
        default:
            retValue = value;
    }

    return retValue;
};

/**
 * @param data context for expression
 * @param ctx appctx for expression
 * @param conditions conditions for expression
 * @param expr expression to be solved with given context
 * @param type INTEGER etc.
 * @return value of expression
 */
export let parseExpression = function( data, ctx, conditions, expr, type ) {
    var currentVal = ( new Function( 'data', 'ctx', 'conditions', 'return ' + expr ) )( data, ctx, conditions );
    return typeCast( currentVal, type );
};

export default exports = {
    parseExpression
};
/**
 * @memberof NgServices
 * @member occmgmtUtils
 */
app.factory( 'evaluateExpressionInGivenContext', () => exports );

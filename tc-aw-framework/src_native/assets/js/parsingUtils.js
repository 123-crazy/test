// Copyright (c) 2020 Siemens

/**
 * This module is part of declarative UI framework and provides view model processing functionalities.
 *
 * @module js/parsingUtils
 */

import _ from 'lodash';
import logger from 'js/logger';

/**
 * Define the base object used to provide all of this module's external API on.
 *
 * @private
 */
var exports = {};

/**
 * {Regex} Regular expression that allows extraction of the text between starting '{{' and ending '}}' using String
 * class 'match' function.
 * <P>
 * Note: The regex will only extract 4 segments w/the following for [1] & [3]<BR>
 * results[1] === '{{' && results[3] === '}}' *
 */
export let REGEX_DATABINDING = /^({{)([a-zA-Z0-9$._\s:\[\]\']+)(}})$/;

/**
 * @param {String} expression -
 * @return {String} The string between mustaches or 'undefined'
 */
export let getStringInDoubleMustachMarkup = function( expression ) {
    if( expression.match ) {
        var results = expression.match( exports.REGEX_DATABINDING );
        if( results && results.length === 4 ) {
            return results[ 2 ];
        }
    }
    return undefined;
};

/**
 * @param {String} expression -
 * @return {String} insertionString - the string between mustaches
 */
export let getStringBetweenDoubleMustaches = function( expression ) {
    var insertionString = expression;
    if( _.isString( insertionString ) ) {
        if( _.startsWith( insertionString, '{{' ) ) {
            insertionString = _.trimStart( insertionString, '{{' );
            insertionString = _.trimEnd( insertionString, '}}' );
        }
        return insertionString;
    }
    return undefined;
};

/**
 * Get the required value from the JSON.
 *
 * @param {Object} input - Input object.
 * @param {Object} path - path from which to search the input.
 * @return {Object} - searched output.
 */
export let parentGet = function( input, path ) {
    var retVal = _.get( input, path );

    if( retVal !== undefined ) {
        return retVal;
    }
    if( input && input.$parent ) {
        return exports.parentGet( input.$parent, path );
    }
};

/**
 * Try to parse the JSON string, return the JavaScript Object after parsing, false if cannot parse.
 *
 * @param {String} jsonString - JSON string to parse into Object
 */
export let parseJsonString = function( jsonString ) {
    try {
        var jsonObject = JSON.parse( jsonString );

        if( jsonObject && typeof jsonObject === 'object' ) {
            return jsonObject;
        }
    } catch ( exception ) {
        logger.error( 'Error parsing the JSON string: ' + exception );
    }

    return false;
};

/**
 * @param {String} expression -
 * @return {String} key of i18n ex- incase of i18n.Close,it will return "Close".
 */
export let geti18nKey = function( expression ) {
    var regex = /{{i18n.([_a-zA-Z0-9]+)}}/i;
    if( arguments.length === 1 && _.isString( expression ) ) {
        return expression.match( regex )[ 1 ];
    }
    return true;
};

exports = {
    REGEX_DATABINDING,
    getStringInDoubleMustachMarkup,
    getStringBetweenDoubleMustaches,
    parentGet,
    parseJsonString,
    geti18nKey
};
export default exports;

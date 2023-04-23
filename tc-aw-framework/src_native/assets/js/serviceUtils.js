// Copyright (c) 2020 Siemens
/* eslint-env es6 */

/**
 * This module provides the utility functions for supporting aw service.
 *
 * @module js/serviceUtils
 */

/**
 * simple http get. PLEASE DON'T use it as promise chain - it will cause issue in angularJS mode
 * @param {string} theUrl url as string
 * @returns {Promise} promise
 */
export function httpGet( theUrl ) {
    return new Promise( ( resolve, reject ) => {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = function() {
            if( xmlHttp.readyState === 4 && xmlHttp.status === 200 ) {
                resolve( xmlHttp.responseText );
            }
        };

        xmlHttp.onerror = function( e ) {
            reject( e );
        };

        xmlHttp.open( 'GET', theUrl, true ); // true for asynchronous
        xmlHttp.send( null );
    } );
}

/**
 * simple http get for JSON specific and fake response data structure.
 * PLEASE DON'T use it as promise chain - it will cause issue in angularJS mode
 * @param {string} theUrl url as string
 * @returns {Promise} promise
 */
export function httpGetJsonObject( theUrl ) {
    return httpGet( theUrl ).then( ( txt ) => {
        return {
            data: JSON.parse( txt )
        };
    } );
}

const isOpenParenthesis = ( character, expression, charIndex ) => {
    const getPreviousNonEmptyChar = () => {
        let prevChar = '';
        if( charIndex > 0 ) {
            let index = charIndex - 1;
            while( index >= 0 ) {
                prevChar = expression.charAt( index );
                if( prevChar.trim() !== '' ) {
                    break;
                }
                index--;
            }
        }
        return prevChar;
    };
    if( character === '(' ) {
        const prevChar = getPreviousNonEmptyChar();
        if( prevChar === '' || prevChar === ')' || prevChar === '(' ||
            prevChar === '!' || prevChar === '&' || prevChar === '|' ) {
            return true;
        }
    }
    return false;
};

const isClosedParenthesis = ( character, expression, charIndex ) => {
    const getNextNonEmptyChar = () => {
        let nextChar = '';
        if( charIndex < expression.length ) {
            let index = charIndex + 1;
            while( index <= expression.length ) {
                nextChar = expression.charAt( index );
                if( nextChar.trim() !== '' ) {
                    break;
                }
                index++;
            }
        }
        return nextChar;
    };
    const getPreviousNonEmptyChar = () => {
        let prevChar = '';
        if( charIndex > 0 ) {
            let index = charIndex - 1;
            while( index >= 0 ) {
                prevChar = expression.charAt( index );
                if( prevChar.trim() !== '' ) {
                    break;
                }
                index--;
            }
        }
        return prevChar;
    };
    if( character === ')' ) {
        const nextChar = getNextNonEmptyChar();
        const prevChar = getPreviousNonEmptyChar();
        if( nextChar === '' || nextChar === ')' || nextChar === '(' ||
            nextChar === '!' || nextChar === '&' || nextChar === '|' ) {
            if( prevChar !== '(' ) {
                return true;
            }
        }
    }
    return false;
};

const isNegation = ( character, expression, charIndex ) => {
    const getNextNonEmptyChar = () => {
        let nextChar = '';
        if( charIndex < expression.length ) {
            let index = charIndex + 1;
            while( index <= expression.length ) {
                nextChar = expression.charAt( index );
                if( nextChar.trim() !== '' ) {
                    break;
                }
                index++;
            }
        }
        return nextChar;
    };
    if( character === '!' ) {
        const nextChar = getNextNonEmptyChar();
        if( nextChar !== '=' ) {
            return true;
        }
    }
    return false;
};

/**
 * This API breaks the given expression to array of sub expression
 * which can be evaluated individually..
 * @param {String} expression The expression to parse.
 * @returns {Array} Array of Expression.
 */
export const parseExpression = expression => {
    if( !expression ) { return undefined; }
    const characters = Array.from( expression );
    const expressions = [];
    let expr = null;
    characters.forEach( ( character, index ) => {
        if( isOpenParenthesis( character, expression, index ) || isClosedParenthesis( character, expression, index ) ||
            isNegation( character, expression, index ) || character === '&' || character === '|' ) {
            if( expr ) {
                expressions.push( expr.trim() );
                expr = null;
            }
            expressions.push( character );
        } else {
            if( expr === null ) {
                expr = '';
            }
            expr = `${expr}${character}`;
            if( index === expression.length - 1 ) {
                expressions.push( expr.trim() );
                expr = null;
            }
        }
    } );
    return expressions;
};
/**
 * Decode value from string.
 * @param {String} val - decode string value
 * @returns {String} value String
 */
export function valFromString( val ) {
    return val !== null ? val.toString().replace( /(~~|~2F)/g, function( m ) { return { '~~': '~', '~2F': '/' }[ m ]; } ) : val;
}

export default {
    httpGet,
    httpGetJsonObject,
    parseExpression,
    valFromString
};

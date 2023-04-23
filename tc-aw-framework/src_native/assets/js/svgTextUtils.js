// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module defines svg text utils
 *
 * @module js/svgTextUtils
 */
import app from 'app';
import logSvc from 'js/logger';

var exports = {};

/**
 * get the sub string in the condition of the font face and the width of present area
 *
 * @param text string needs to draw
 * @param cssClassName CSS class name
 * @param maxWidth max width for text to draw
 * @param withEllipsis flag if truncate text with ellipsis
 * @return max sub string of the text can be drawn
 */
export let truncateText = function( text, cssClassName, maxWidth, withEllipsis ) {
    try {
        if( !text ) {
            return text;
        }

        var textMaxLength = exports.calculateTextWidth( text, cssClassName );
        if( textMaxLength > maxWidth ) {
            var i = text.length;
            while( i >= 0 && exports.calculateTextWidth( text.substring( 0, i ), cssClassName ) > maxWidth ) {
                i--;
            }

            if( i >= 0 ) {
                var resultStr = text.substring( 0, i );
                var resultLen = resultStr.length;
                var j = resultLen;
                var suffix = '';
                if( withEllipsis ) {
                    suffix = '...';
                }
                while( j >= 0 &&
                    exports.calculateTextWidth( text.substring( 0, j ) + suffix, cssClassName ) > maxWidth ) {
                    j--;
                }

                if( j > 0 ) {
                    resultStr = text.substring( 0, j ) + suffix;
                }

                return resultStr;
            }
            return '';
        }
        return text;
    } catch ( e ) {
        logSvc.error( 'truncateText Exception!' );
        return text;
    }
};

/**
 * calculate the pixel width of a string based on font related properties
 *
 * @param text text
 * @param cssClassName CSS class name
 * @return the size
 */
export let calculateTextWidth = function( text, cssClassName ) {
    if( text === null || text.length === 0 ) {
        return 0;
    }

    try {
        var tempSpan = document.createElement( 'span' );
        var tempDiv = document.createElement( 'div' );

        tempDiv.className = 'invisible';
        tempDiv.appendChild( tempSpan );

        window.top.document.body.appendChild( tempDiv );

        tempSpan.className = cssClassName;

        tempSpan.textContent = text;

        var ret = tempSpan.offsetWidth;
        window.top.document.body.removeChild( tempDiv );
        return ret;
    } catch ( e ) {
        logSvc.error( e.name + ':' + e.message );
        return 0;
    }
};

/**
 * Calculate the max sub string
 *
 * @param text input the string of the svg text
 * @param cssClassName CSS class name
 * @param maxWidth the max width of the rect to contain the svg text
 * @param withEllipsis flag if truncate text with ellipsis
 * @return if the max width of the svg text less than maxwidth, otherwise max length sub string with ellipsis added.
 */
export let truncateSvgText = function( text, cssClassName, maxWidth, withEllipsis ) {
    if( navigator.userAgent.toLowerCase().indexOf( 'firefox/12.0' ) >= 0 ) {
        return exports.truncateText( text, cssClassName, maxWidth, withEllipsis );
    }

    var stubDiv = window.top.document.getElementById( 'stubDivForSvgText' );
    var svgText = null;

    if( stubDiv === null ) {
        var svgNode = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );

        svgNode.setAttribute( 'xmlns', 'http://www.w3.org/2000/svg' );
        svgNode.setAttribute( 'xmlns:xlink', 'http://www.w3.org/1999/xlink' );

        svgText = document.createElementNS( 'http://www.w3.org/2000/svg', 'text' );

        svgNode.appendChild( svgText );

        stubDiv = document.createElement( 'div' );

        stubDiv.id = 'stubDivForSvgText';
        stubDiv.className = 'invisible';

        stubDiv.appendChild( svgNode );

        window.top.document.body.appendChild( stubDiv );

        svgText.textContent = text;
    } else {
        var list = stubDiv.getElementsByTagName( 'text' );
        if( list.length > 0 ) {
            svgText = list[ 0 ];
            svgText.textContent = text;
        }
    }

    if( !svgText ) {
        return '';
    }

    // To set the font data
    svgText.className.baseVal = cssClassName;

    var resultStr = text;

    var textMaxWidth = svgText.getComputedTextLength();

    if( textMaxWidth > maxWidth ) {
        var i = text.length;
        svgText.textContent = text.substring( 0, i );

        while( i >= 0 && svgText.getComputedTextLength() > maxWidth ) {
            svgText.textContent = text.substring( 0, i );
            i--;
        }

        if( i >= 0 ) {
            resultStr = svgText.textContent;
            var j = resultStr.length;
            var suffix = '';
            if( withEllipsis ) {
                suffix = '...';
            }
            svgText.textContent += suffix;

            while( j >= 0 && svgText.getComputedTextLength() > maxWidth ) {
                svgText.textContent = text.substring( 0, j ) + suffix;
                j--;
            }

            if( j > 0 ) {
                resultStr = svgText.textContent;
            } else {
                resultStr = '';
            }
        } else {
            resultStr = '';
        }
    }
    return resultStr;
};

export default exports = {
    truncateText,
    calculateTextWidth,
    truncateSvgText
};
app.factory( 'svgTextUtils', () => exports );

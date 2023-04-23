// Copyright (c) 2021 Siemens
/* eslint-disable sonarjs/cognitive-complexity */

/**
 * A simple and inexpensive HTML Sanitizer which detects and/or eliminates HTML that can cause potential cross-site
 * scripting (XSS) and other UI issues.
 *
 * @module js/sanitizer
 */
import app from 'app';
import _ from 'lodash';
import localeSvc from 'js/localeService';

/**
 * HTML 'anchor' regular expression
 *
 * @private
 */
var REGEX_FRAGMENT_ANCHOR_SCRIPT = /href="[^"]*?java[^"]*?"/;

/**
 * HTML 'src=java' regular expression
 *
 * @private
 */
var REGEX_FRAGMENT_SRC_SCRIPT = /src=java*/;

/**
 * HTML 'style="java' regular expression
 *
 * @private
 */
var REGEX_FRAGMENT_STYLE_SCRIPT = /style="[^"]*?java[^"]*?"/;

/**
 * HTML 'style="java' regular expression
 *
 * @private
 */
var REGEX_FRAGMENT_STYLE_WEIRD = /style="[^"]*?&[^"]*?"/;

/**
 * HTML '<style on*=' regular expression (e.g. 'onload=', 'onerror=', etc.).
 *
 * @private
 */
var REGEX_FRAGMENT_STYLE_ATTR = /<style.*(on\S+)(\s*)=/;

/**
 * HTML entity regular expression
 *
 * @private
 */
var REGEX_HTML_ENTITY = /[a-z]+|#[0-9]+|#x[0-9a-fA-F]+/i;

/**
 * HTML 'on*' regular expression (e.g. 'onload=', 'onerror=', etc.).
 *
 * @private
 */
var REGEX_IMG_ATTR = /(\b)(on\S+)(\s*)=/i;

/**
 * HTML 'base64' regular expression (e.g. 'data:image/jpeg;base64').
 *
 * @private
 */
var REGEX_BASE64_IMG = /(\b)(src="data:image\S+)(\s*)base64/i;

/**
 * HTML escaped entity regular expression
 *
 * @private
 */
var REGEX_HTML_ESCAPED_ENTITY = /&[a-z]+;|&#[0-9]+;/i;

/**
 * {RegEx} Matches external links
 */
var REGEX_URL_PATTERN =
    /http(|s):\/\/[\w\-]+(\.[\w\-]+)+([\w.,@?\^=%&amp;:\/\$~+\*#()[\]\-]*[\w@?\^=%&amp;\/~+#()[\]\-])?|http(|s):\/\/([\w\-]+)+([\w.,@?\^=%&amp;:\/\$~+\*#()[\]\-]*[\w@?\^=%&amp;\/~+\*#()[\]\-])?/gi; // eslint-disable-line no-useless-escape

/**
 * HTML 'image' regular expression
 *
 * @private
 */
var REGEX_INVALID_HTML = new RegExp( REGEX_FRAGMENT_ANCHOR_SCRIPT.source + '|' //
    +
    REGEX_FRAGMENT_SRC_SCRIPT.source + '|' //
    +
    REGEX_FRAGMENT_STYLE_SCRIPT.source + '|' //
    +
    REGEX_FRAGMENT_STYLE_ATTR.source + '|' //
    +
    REGEX_FRAGMENT_STYLE_WEIRD.source, 'i' );

/**
 * Global array of HTML black list tags used for sanitization
 *
 * @private
 */
var TAG_BLACKLIST = [ 'applet', 'audio', 'body', 'embed', 'fieldset', 'form', 'frame', 'frameset', 'input',
    'iframe', 'meta', 'object', 'output', 'param', 'script', 'style', 'textarea', 'video'
];

/**
 * Global reference to invalid HTML locale string
 *
 * @private
 */
let _invalidHtmlMessage;

/**
 * HTML escapes a character. HTML meta characters will be escaped.
 *
 * @private
 *
 * @param {String} unsafe - unsafe HTML String which needs to be escaped.
 *
 * @return {String} Returns escaped and safe HTML String.
 */
function _escapeHtml( unsafe ) {
    if( !/['"<>&]+/.test( unsafe ) ) {
        return unsafe;
    }

    return unsafe.replace( /&/g, '&amp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' ).replace( /"/g,
        '&quot;' ).replace( /'/g, '&#39;' );
}

/**
 * HTML meta characters will be un-escaped. This method should be used only after sanitizing the input.
 *
 * @private
 *
 * @param {String} escapedSafe - escapedSafe HTML String which needs to be un-escaped.
 *
 * @return {String} Returns un-escaped and safe HTML String.
 */
function _unEscapeHtml( escapedSafe ) { // eslint-disable-line no-unused-vars
    return escapedSafe.replace( /&amp;/ig, '&' ).replace( /&lt;/ig, '<' ).replace( /&gt;/ig, '>' ).replace(
        /&quot;/ig, '"' ).replace( /&#39;/ig, '\'' );
}

/**
 * HTML-escapes a string, but does not double-escape HTML-entities already present in the string.
 *
 * @param {String} value - HTML String which needs to be escaped.
 *
 * @param {Boolean} replaceAnchors - TRUE if any HTTP type external references should be wrapped in an HTML <a
 *            href="XXXXX"></a> (i.e. 'anchors').
 *
 * @param {Boolean} replaceNewLines - TRUE if any newline characters should be replaced by an HTML '<BR>'
 *
 * @return {String} Returns escaped and safe HTML.
 */
export let htmlEscapeAllowEntities = function( value, replaceAnchors, replaceNewLines ) {
    if( _.isString( value ) && value.length > 0 ) {
        if( !/(['"<>&]+|(http)+|\n)/i.test( value ) ) {
            return value;
        }

        var escaped;

        if( !/&+/.test( value ) ) {
            escaped = _escapeHtml( value );
        } else {
            var splitArray = value.split( '&', -1 );

            var nSegment = splitArray.length;

            for( var ndx = 0; ndx < nSegment; ndx++ ) {
                var currSegment = splitArray[ ndx ];

                /**
                 * The first segment is never part of a valid tag;
                 * <P>
                 * Note that if the input string starts with a tag, we will get an empty segment at the
                 * beginning.
                 */
                if( ndx === 0 ) {
                    escaped = _escapeHtml( currSegment );
                    continue;
                }

                var entityEnd = currSegment.indexOf( ';' );

                if( entityEnd > 0 && REGEX_HTML_ENTITY.test( currSegment.substring( 0, entityEnd ) ) ) {
                    // Concatenate the entity without escaping.
                    escaped = escaped.concat( '&' ).concat( currSegment.substring( 0, entityEnd + 1 ) );

                    // Concatenate the rest of the segment, escaped.
                    escaped = escaped.concat( _escapeHtml( currSegment.substring( entityEnd + 1 ) ) );
                } else {
                    // The segment did not start with an entity reference, so escape the whole segment.
                    escaped = escaped.concat( '&amp;' ).concat( _escapeHtml( currSegment ) );
                }
            }
        }

        if( replaceAnchors && escaped ) {
            // replaces url text to hyperlinks
            escaped = escaped.replace( REGEX_URL_PATTERN, '<a href="$&">$&</a>' );
        }

        if( replaceNewLines && escaped ) {
            // replaces new lines to <br> tags
            escaped = escaped.replace( /\n/g, '<br/>' );
        }

        return escaped;
    }

    return '';
};

/**
 * Simple and inexpensive HTML Sanitizer which accepts the subset of TAG_WHITELIST array of HTML white list
 * tags.
 *
 * @param {StringArray} values - Array of HTML Strings which needs to be sanitized.
 *
 * @return {StringArray} Returns sanitized HTML string array.
 */
export let sanitizeHtmlValues = function( values ) {
    if( values && values.length > 0 ) {
        for( var ii = values.length - 1; ii >= 0; ii-- ) {
            var originalHtml = values[ ii ];
            var sanitizedHtml = exports.sanitizeHtmlValue( originalHtml );
            if( sanitizedHtml && originalHtml !== sanitizedHtml ) {
                values[ ii ] = sanitizedHtml;
            }
        }
    }

    return values;
};

/**
 * Simple and inexpensive HTML Sanitizer which detects and/or eliniates HTML that can cause potential cross-site
 * scripting and other UI issues.
 *
 * @param {String} rawValue - HTML String which needs to be sanitized.
 *
 * @return {String} Returns sanitized HTML or Invalid HTML string when there is malicious string.
 */
export let sanitizeHtmlValue = function( rawValue ) {
    var sanitized = '';
    var decodedValue = '';

    if( _.isString( rawValue ) ) {
        // load _invalidHtmlMessage if it is not loaded
        if( !_invalidHtmlMessage ) {
            exports.setInvalidHtmlMessage( localeSvc.getLoadedText().INVALID_HTML );
        }

        /**
         * Decode html escaped entity characters before applying sanitization, so that it will also catch
         * escaped XSS vulnerability attacks.
         */
        if( REGEX_HTML_ESCAPED_ENTITY.test( rawValue ) ) {
            decodedValue = _.unescape( rawValue );
        } else {
            decodedValue = rawValue;
        }

        /**
         * Break the string into n+1 segments based on any HTML tags
         * <P>
         * Loop for each of these segments.
         */
        var splitArray = decodedValue.split( '<', -1 );

        var nSplit = splitArray.length;

        for( var ndx = 0; ndx < nSplit; ndx++ ) {
            var currSegment = splitArray[ ndx ];

            /**
             * The first segment is never part of a valid tag;
             * <P>
             * Note that if the input string starts with a tag, we will get an empty segment at the beginning.
             */
            if( ndx === 0 ) {
                sanitized = sanitized.concat( exports.htmlEscapeAllowEntities( currSegment ) );
                continue;
            }

            /**
             * Determine if the current segment is the start of an attribute-free tag or end-tag in our
             * whitelist.
             */
            var tagStart = 0; // will be 1 if this turns out to be an end tag.
            var tagEnd = currSegment.indexOf( '>' );
            var tag = null;
            var isValidTag = true;
            var selfClosingTag = false;

            if( tagEnd > 0 ) {
                if( currSegment.charAt( 0 ) === '/' ) {
                    tagStart = 1;
                }

                // for self closing tags ex: '<br />'
                if( currSegment.charAt( tagEnd - 1 ) === '/' ) {
                    selfClosingTag = true;
                    tagEnd -= 1;
                }

                tag = currSegment.substring( tagStart, tagEnd );

                var exist = tag.replace( /\s(\w|\D).*/ig, '' ); // for attributes

                if( TAG_BLACKLIST.indexOf( exist.toLowerCase().trim() ) !== -1 ) {
                    isValidTag = false;
                }

                if( isValidTag ) {
                    // concat the tag, not escaping it
                    if( tagStart === 0 ) {
                        /**
                         * Check for image attribute script <BR>
                         * <img src="" onerror="alert('securityIssue_img');"/>
                         */
                        if( REGEX_BASE64_IMG.test( tag ) ) {
                            // split tag into attributes, and process individually
                            // to avoid false positives.
                            var attributes = tag.match( /[\w-]+="[^"]*"/g );

                            for( var i = 0; i < attributes.length; i++ ) {
                                if( attributes[ i ].indexOf( 'src=' ) < 0 &&
                                    REGEX_IMG_ATTR.test( attributes[ i ] ) ) {
                                    return _invalidHtmlMessage;
                                }
                            }
                        } else if( REGEX_IMG_ATTR.test( tag ) ) {
                            return _invalidHtmlMessage;
                        }
                        sanitized = sanitized.concat( '<' );
                    } else {
                        // we had seen an end-tag
                        sanitized = sanitized.concat( '</' );
                    }

                    if( selfClosingTag ) {
                        sanitized = sanitized.concat( tag ).concat( '/>' );

                        // concat the rest of the segment, escaping it
                        sanitized = sanitized.concat( exports.htmlEscapeAllowEntities( currSegment
                            .substring( tagEnd + 2 ) ) );
                    } else {
                        sanitized = sanitized.concat( tag ).concat( '>' );

                        // concat the rest of the segment, escaping it
                        sanitized = sanitized.concat( exports.htmlEscapeAllowEntities( currSegment
                            .substring( tagEnd + 1 ) ) );
                    }
                } else {
                    return _invalidHtmlMessage;
                }
            } else {
                sanitized = sanitized.concat( '<' );
                sanitized = sanitized.concat( exports.htmlEscapeAllowEntities( currSegment ) );
            }
        }

        /**
         * Check for weird style stuff
         */
        if( REGEX_INVALID_HTML.test( sanitized ) ) {
            return _invalidHtmlMessage;
        }
    }

    return rawValue;
};

/**
 * Set the message that is seen when invalid HTML content is found.
 * <P>
 * Note: This message is normally set based on the value returned by the 'localeService'. This method is marked
 * 'private' and is intended to be used during testing to allow a preditable value to be returned.
 *
 * @private (this method should be used for unit test only)
 *
 * @param {String} message - Localized text to return from 'sanitizeHtmlValue' when some issue is found.
 */
export let setInvalidHtmlMessage = function( message ) {
    _invalidHtmlMessage = message;
};

const exports = {
    htmlEscapeAllowEntities,
    sanitizeHtmlValues,
    sanitizeHtmlValue,
    setInvalidHtmlMessage
};
export default exports;

/**
 * Escape markup which Highcharts will unescape internally
 *
 * Full sanitize is not necessary (and causes issues) because Highcharts internally sets as
 * text on DOM element (does not create element from string)
 *
 * @param {String} x Value to escape
 * @returns {String} Escaped value
 */
exports.escapeMarkup = x => x.replace( /</g, '&lt;' ).replace( />/g, '&gt;' );

/**
 * An XSS Sanitizer.
 *
 * @memberof NgServices
 * @member sanitizer
 *
 * @param {localeService} localeSvc - Service to use.
 *
 * @returns {sanitizer} Reference to service API Object.
 */
app.factory( 'sanitizer', () => exports );

// Copyright (c) 2020 Siemens

/**
 * This module provides reusable functions related to handling URL manipulation.
 *
 * @module js/browserUtils
 *
 * @publishedApolloService
 */

/**
 * {String} Base URL for the current application's root 'document' without any query or location attributes and (if
 * otherwise valid) with a trailing '/' assured (e.g. 'http://100.100.100.100:8888/awc/').
 */
var _cachedBaseURL;

/**
 * Regular Expression from: https://tools.ietf.org/html/rfc3986#appendix-B
 * <pre>
 * Input:
 * https://www.ics.uci.edu/pub/ietf/uri/?locale=dldl&sbsbs=ddd#Related/fkfkfkf/s/s/
 *
 * Output:
 * Full match   0-80    `https://www.ics.uci.edu/pub/ietf/uri/?locale=dldl&sbsbs=ddd#Related/fkfkfkf/s/s/`
 * Group 1. 0-6 `https:`
 * Group 2. 0-5 `https`
 * Group 3. 6-37    `//www.ics.uci.edu/pub/ietf/uri/`
 * Group 4. 8-37    `www.ics.uci.edu/pub/ietf/uri/`
 * Group 5. 37-37   ``
 * Group 6. 37-59   `?locale=dldl&sbsbs=ddd`
 * Group 7. 38-59   `locale=dldl&sbsbs=ddd`
 * Group 8. 59-80   `#Related/fkfkfkf/s/s/`
 * Group 9. 60-80   `Related/fkfkfkf/s/s/`
 * </pre>
 *
 * @param {String} url -
 *
 * @returns {StringArray} Result
 */
function _matchUrlGroups( url ) {
    return url.match( /^(([^:?#]+):)?(\/\/([^?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/ );
}

/**
 * Remove the given attribute (and its value) from the specified URL (if it exists).
 *
 * @param {String} urlToEdit - The original URL to evaluate and change.
 * @param {String} attrToRemove - Name of the attribute to remove.
 *
 * @returns {String} The given URL with the specified attribute removed (if it origianlly existed).
 */
function _removeUrlAttribute( urlToEdit, attrToRemove ) {
    var urlToReturn = urlToEdit;

    if( urlToEdit.indexOf( attrToRemove ) !== -1 ) {
        var results = _matchUrlGroups( urlToEdit );

        // Check if we have any search attributes
        if( results[ 7 ] ) {
            urlToReturn = results[ 1 ] + results[ 3 ]; // protocol + server w/port

            if( results[ 6 ] ) { // 'search' attributes
                var searchAttrs = results[ 6 ];

                // Check if this attr has a value
                var attrStartNdx = searchAttrs.indexOf( attrToRemove + '=' );

                if( attrStartNdx !== -1 ) {
                    // Find the next attr (or end)
                    var nextAttrStartNdx = searchAttrs.indexOf( '&', attrStartNdx );

                    var strToRemove;

                    if( nextAttrStartNdx !== -1 ) {
                        // extract attr and value (without prefix) to be removed (i.e. collapse out)
                        strToRemove = searchAttrs.substring( attrStartNdx, nextAttrStartNdx + 1 );
                    } else {
                        // check if we are removing the whole set of 'search' attrs
                        if( attrStartNdx === 1 ) {
                            strToRemove = searchAttrs;
                        } else {
                            // extract attr and value (with prefix) to be removed
                            strToRemove = searchAttrs.substring( attrStartNdx - 1, searchAttrs.length );
                        }
                    }

                    var strWithOutParam = searchAttrs.replace( strToRemove, '' );

                    urlToReturn += strWithOutParam;
                } else {
                    // Non-value case not handled yet var ndx3 = searchAttrs.indexOf( '&', attrStartNdx );

                    urlToReturn += searchAttrs;
                }
            }

            if( results[ 8 ] ) { // hash location
                urlToReturn += results[ 8 ];
            }
        }
    }

    return urlToReturn;
}

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Note: This API is here to allow Jasmine 'spyOn' type testing to act enough like a browser to test these URL
 * functions.
 *
 * @returns {Object} The current 'window.location' object.
 */
export let getWindowLocation = function() {
    return window.location;
};

/**
 * Note: This API is here to allow jasmine testing to act enough like a browser to test URL functions.
 *
 * @returns {Object} The current 'window.navigator' object.
 */
export let getWindowNavigator = function() {
    return window.navigator;
};

/**
 * Note: This API is here to allow jasmine testing to act enough like a browser to test URL functions.
 *
 * @param {String} url - The URK value to set as the window's HRef.
 */
export let setWindowHRef = function( url ) {
    window.location.href = url;
};

/**
 *
 * Returns Base URL for the current application
 *
 * @returns {String} Base URL for the current application's root 'document' without any query or location attributes
 *          and (if otherwise valid) with a trailing '/' assured (e.g. 'http://100.100.100.100:8888/awc/').
 */
export let getBaseURL = function() {
    if( !_cachedBaseURL ) {
        // strip 'index.html' from end of pathname if present
        var location = exports.getWindowLocation();

        var pathname = location.pathname;

        // IE11 on Windows 10 doesn't have 'location.origin' object, so let's set it
        if( !location.origin ) {
            location.origin = location.protocol + '//' + location.hostname +
                ( location.port ? ':' + location.port : '' );
        }

        _cachedBaseURL = location.origin + pathname.substring( 0, pathname.lastIndexOf( '/' ) + 1 );
    }

    return _cachedBaseURL;
};

var _navigator = getWindowNavigator();

/**
 * Checks if browser is IE. TRUE if browser is IE
 */
export let isIE = _navigator.userAgent.search( /(trident|edge)/i ) > -1;

/**
 * Checks if browser is non Edge IE. TRUE if browser is non Edge IE
 */
export let isNonEdgeIE = /trident/i.test( _navigator.userAgent );

/**
 * Checks if running on a mobile OS. TRUE if we're currently running on a mobile OS
 */
export let isMobileOS = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test( _navigator.userAgent );

/**
 * Checks if it is touch device, true if it is touch device
 */
export let isTouchDevice = 'ontouchstart' in window || navigator.msMaxTouchPoints > 0;

/**
 * Checks if browser is Firefox. TRUE if browser is Firefox
 */
export let isFirefox = _navigator.userAgent.search( /firefox/i ) > -1;

/**
 * Checks if browser is Qt. TRUE if browser is Qt
 */
export let isQt = _navigator.userAgent.search( /QtWebEngine/i ) > -1;

/**
 * Checks if browser is Safari.
 */
export let isSafari = /^((?!chrome|android).)*safari/i.test( navigator.userAgent );

/**
 * Returns an object who's properties represent the 'search' attributes of the current $location (or window's URL if
 * _jsniInjector is not initialized).
 * <P>
 * Note: This should only be used if the attributes are needed before angular startup, otherwise use $state.params
 * or $location.search()
 *
 * @return {Object} An object who's properties represent the 'search' attributes of the current $location (or
 *         window's URL if _jsniInjector is not initialized).
 * @ignore
 */
export let getUrlAttributes = function() {
    /**
     * Check if AngularJS has started and _jsniInjector is setup
     * <P>
     * If so: use $location.search()
     */
    if( window._jsniInjector ) {
        return window._jsniInjector.service( '$location' ).search();
    }

    return exports.getWindowLocationAttributes();
};

/**
 * Returns the browser type and the version of that browser as a string
 *
 * https://stackoverflow.com/questions/2400935/browser-detection-in-javascript
 */
export let getBrowserType = function() {
    var ua = navigator.userAgent;
    var tem = null;
    var M = ua.match( /(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i ) || [];
    if( /trident/i.test( M[ 1 ] ) ) {
        tem = /\brv[ :]+(\d+)/g.exec( ua ) || [];
        return 'IE ' + ( tem[ 1 ] || '' );
    }
    if( M[ 1 ] === 'Chrome' ) {
        tem = ua.match( /\b(OPR|Edge)\/(\d+)/ );
        if( tem !== null ) {
            return tem.slice( 1 ).join( ' ' ).replace( 'OPR', 'Opera' );
        }
    }
    M = M[ 2 ] ? [ M[ 1 ], M[ 2 ] ] : [ navigator.appName, navigator.appVersion, '-?' ];
    if( ( tem = ua.match( /version\/(\d+)/i ) ) !== null ) {
        M.splice( 1, 1, tem[ 1 ] );
    }
    return M.join( ' ' );
};

/**
 * Returns an object who's properties represent the 'search' attributes of the current window's URL.
 * <P>
 * Note: These attributes are only the ones BEFORE the '#' in the URL. All attributes AFTER the '#' are accessed by
 * using the $state.params or $location.search()
 *
 * @return {Object} An object who's properties represent the 'search' attributes of the current window's URL.
 */
export let getWindowLocationAttributes = function() {
    var retAttr = {};

    var location = exports.getWindowLocation();

    if( location.search ) {
        var paramPairs = location.search.substring( 1 ).split( '&' );

        paramPairs.forEach( function( paramString ) {
            var param = paramString.split( '=' );

            if( param.length === 1 ) {
                retAttr[ param[ 0 ] ] = '';
            } else {
                retAttr[ param[ 0 ] ] = decodeURIComponent( param[ 1 ] );
            }
        } );
    }

    return retAttr;
};

/**
 * Checks the type and version of the browser running this script to determine if currently supported. If not, the
 * page is changed to a page with an explanation of the situation.
 */
export let checkSupport = function() {
    var agentStr = exports.getWindowNavigator().userAgent;

    console.debug( agentStr ); // eslint-disable-line no-console

    var oldIE = false;

    if( agentStr.search( /Trident/ ) > -1 ) {
        oldIE = agentStr.search( /MSIE (2|3|4|5|6|7|8|9|10)./ ) > -1 && agentStr.search( /Trident\/[1-6]\./ ) > -1;
    } else {
        oldIE = agentStr.search( /MSIE (2|3|4|5|6|7|8|9|10)./ ) > -1;
    }

    var oldChrome = agentStr.search( /Chrome\/([1-9]|1[0-9]|2[0-8])\./ ) > -1;

    var oldFirefox = agentStr.search( /Firefox\/([1-9]|1[0-9]|2[0-7])\./ ) > -1;

    if( oldIE || oldChrome || oldFirefox ) {
        console.error( 'Unsupported browser. Please upgrade.' ); // eslint-disable-line no-console

        exports.getWindowLocation().replace( 'unsupported.html' );
    }
};

/**
 * Updates the URL with locale information
 *
 * @param {String} newLocale - The locale value which needs to be set e.g. 'en_US'
 */
export let updateBrowserUrl = function( newLocale ) {
    if( newLocale ) {
        var location = exports.getWindowLocation();

        var newHRef = _removeUrlAttribute( location.href, 'locale' );

        var results = _matchUrlGroups( newHRef );

        // Build up the protocol and location portion
        var newUrl = results[ 1 ] + results[ 3 ];

        // Check if we already have some search attributes (or not)
        if( results[ 6 ] ) {
            newUrl += results[ 6 ];
            newUrl += '&locale=';
            newUrl += newLocale;
        } else {
            newUrl += '?locale=';
            newUrl += newLocale;
        }

        // Add back the hash portion (if necessary)
        if( results[ 8 ] ) {
            newUrl += results[ 8 ];
        }

        exports.setWindowHRef( newUrl );
    }
};

/**
 * Remove the given named attribute from the 'search' area (i.e. URL attributes before the '#') of the browser's
 * current URL.
 *
 * @param {String} attrToRemove - Name of the attribute to remove.
 */
export let removeUrlAttribute = function( attrToRemove ) {
    if( attrToRemove ) {
        var location = exports.getWindowLocation();

        var newHRef = _removeUrlAttribute( location.href, attrToRemove );

        if( newHRef !== location.href ) {
            exports.setWindowHRef( newHRef );
        }
    }
};

/**
 * Attach script to the document.
 * If script is already attached to DOM then just call onload callback
 *
 * @param {String} src - source path of the script.
 * @param {String} onLoadCallback - on load callback
 */
export let attachScriptToDocument = function( src, onLoadCallback ) {
    var scriptElement = document.querySelector( `script[src="${src}"]` );
    if( scriptElement ) {
        onLoadCallback();
    } else {
        scriptElement = document.createElement( 'script' );
        scriptElement.type = 'text/javascript';
        scriptElement.src = src;
        document.head.appendChild( scriptElement );
        scriptElement.onload = function() {
            onLoadCallback();
        };
    }
};

export default exports = {
    getWindowLocation,
    getWindowNavigator,
    setWindowHRef,
    getBaseURL,
    isIE,
    isNonEdgeIE,
    isMobileOS,
    isTouchDevice,
    isFirefox,
    isQt,
    isSafari,
    getUrlAttributes,
    getBrowserType,
    getWindowLocationAttributes,
    checkSupport,
    updateBrowserUrl,
    removeUrlAttribute,
    attachScriptToDocument
};

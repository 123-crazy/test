// Copyright (c) 2020 Siemens

/**
 * Navigation service which wraps navigation mechanism from the consumers.
 *
 * @module js/navigationService
 */
import app from 'app';
import _ from 'lodash';
import navigationUtils from 'js/navigationUtils';
import browserUtils from 'js/browserUtils';
import parsingUtils from 'js/parsingUtils';
import AwStateService from 'js/awStateService';
import appCtxSvc from 'js/appCtxService';
import workspaceSvc from 'js/workspaceService';
import 'js/conditionService';
import 'js/contextContributionService';
import logger from 'js/logger';

/**
 * Cached reference to the various AngularJS and AW services.
 */

var exports = {};

/**
 * URL sanitizer.
 *
 * @private
 */
var REGEX_SEARCH_SANITIZE = /(javascript|data:|script|http)/;

/**
 * Is logging on.
 *
 * @private
 */
var debug_logAuthActivity = browserUtils.getUrlAttributes().logAuthActivity !== undefined;

/**
 * Create link to navigate the object.
 *
 * @param {Object} action - The 'declAction' object.
 * @param {Object} navigationParams - The 'navigationParams' object specific for "Navigation" action type
 */
function navigateObject( action, navigationParams ) {
    var url = '';
    var navObject = getWindowLocationObject();
    // Check to see if they just want a raw url, and not a reference to some place in the application.
    if( action.navigateTo.indexOf( 'http' ) === 0 ) {
        url = action.navigateTo;
    } else {
        url = browserUtils.getBaseURL();

        /**
         * Check if there are any parameters 'before the #' AND we are NOT trying to launch some other
         * application.
         * <P>
         * If so: Include these in the base URL since they are a necessary context for any 'internal' navigation
         * operation. Specfically, used to preserve hosting and logging options.
         * <P>
         * Note: This is a fix for LCS-173770 (et al.) since any external application would/should be in control
         * of any other context options.
         */

        if( navObject.search && !_.startsWith( action.navigateTo, 'launcher' ) ) {
            url += navObject.search;
        }

        var stateSvc = navigationUtils.getState();

        // Since findState isn't public API, we need to use href to check whether path is registered
        // in state or not.
        var statePath = stateSvc.href( action.navigateTo, navigationParams, {
            inherit: false
        } );

        if( statePath ) {
            url += statePath;
        } else {
            url += action.navigateTo;

            var first = true;

            _.forEach( navigationParams, function( value, key ) {
                if( !_.isObject( value ) ) {
                    if( first ) {
                        url += '?';
                        first = false;
                    } else {
                        url += '&';
                    }

                    url = url + key + '=' + value;
                }
            } );
        }
    }

    var navTarget = '_self'; //default target for navigation targets
    var windowFeatures = null;

    if( action.navigateIn === 'newTab' ) {
        navTarget = '_blank';
    } else if( action.navigateIn === 'newWindow' ) {
        windowFeatures = 'location=yes,menubar=yes,titlebar=yes,toolbar=yes,resizable=yes,scrollbars=yes,';

        var width = window.outerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        var height = window.outerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        var top = window.screenTop ? window.screenTop : window.screenY;
        var left = window.screenLeft ? window.screenLeft : window.screenX;

        if( action.options ) {
            for( var key in action.options ) {
                var value = action.options[ key ];
                if( key === 'top' ) {
                    top = value;
                } else if( key === 'left' ) {
                    left = value;
                } else if( key === 'height' ) {
                    height = value;
                } else if( key === 'width' ) {
                    width = value;
                }
            }
        }

        windowFeatures = windowFeatures + 'top=' + top + ',left=' + left + ',height=' + height + ',width=' +
            width;
        navTarget = '_blank';
    }

    if( action.actionType === 'Navigate' ) {
        if( action.navigateIn === 'newTab' ) {
            var openInNewTab = window.open( url, navTarget );
            if( openInNewTab ) {
                openInNewTab.location = url;
            }
        } else if( action.navigateIn === 'newWindow' ) {
            var openInNewWindow = window.open( url, navTarget, windowFeatures );
            if( openInNewWindow ) {
                openInNewWindow.location = url;
            }
        } else {
            if( statePath ) {
                stateSvc.go( action.navigateTo, navigationParams, {
                    inherit: false
                } );
            } else {
                var openInNavTarget = window.open( '', navTarget );
                if( openInNavTarget ) {
                    openInNavTarget.location = url;
                }
            }
        }
        return undefined;
    } else if( evaluateIfHrefPopulateOperation ) {
        url = decodeURIComponent( url ); // to ensure encoded uri is decoded or else $locationStateChangeSuccess does not get triggered thus losing state history
        return {
            urlContent: url,
            target: navTarget
        };
    }
}

/**
 * wrap window object access in a function
 *
 * @return {Object} structure with window.location pathname, search, and href values
 */
function getWindowLocationObject() {
    return {
        pathname: window.location.pathname,
        search: sanitizeSearch( window.location.search ),
        href: window.location.href
    };
}

/**
 * Basic sanitization routine that looks for redirection exploits.
 *
 * @return {String} value after fully decoded.
 */
function sanitizeSearch( value ) {
    var decodedValue = decodeURIValue( value );
    if( REGEX_SEARCH_SANITIZE.test( decodedValue ) ) {
        if( debug_logAuthActivity ) {
            logger.info( decodedValue + ' has been removed from location search parameter after being found to contain unsafe data.' );
        }
        return null;
    }
    return value;
}

/**
* Multi level decode to get around double encoding exploits
*
* @return {String} value after fully decoded.
*/
function decodeURIValue( value ) {
    var decodedValue = decodeURIComponent( value );
    if( value === decodedValue ) {
        return value;
    }
    return decodeURIValue( decodedValue );
}

/**
 * Create link to navigate the object
 *
 * @param {Object} action - The 'declAction' object.
 * @param {Object} navigationParams - The 'navigationParams' object specific for "Navigation" action type
 */
export let navigate = function( action, navigationParams ) {
    var url = undefined;

    return workspaceSvc.getAvailableNavigations( appCtxSvc.ctx.workspace.workspaceId ).then( function( navigateConfigurations ) {
        var evaluationContext = {};
        /*
          Runtime evaluation context consisting of the ctx , state and navigation context
        */
        evaluationContext.ctx = appCtxSvc.ctx;
        var navigateContext = evaluateParam( navigationParams.navigationContext, evaluationContext );
        evaluationContext.navigationContext = navigateContext;
        evaluationContext.state = AwStateService.instance;

        //evaluate navigateTo
        const result = action.navigateTo.match( parsingUtils.REGEX_DATABINDING );
        if( result && result.length === 4 ) {
            action.navigateTo = _.get( evaluationContext, result[ 2 ], action.navigateTo );
        }
        var activeNavigation = navigationUtils.findActiveWorkspaceNavigation( navigateConfigurations, evaluationContext );

        if( activeNavigation ) {
            action.navigateTo = activeNavigation.page;
            var params = _.assign( {}, navigationParams, activeNavigation.params );
            var contextParam = evaluateParam( params, evaluationContext );
            url = navigateObject( action, contextParam );
        } else {
            url = navigateObject( action, navigationParams );
        }
        return url;
    } );
};

/**
 * Evaluate if the operation is for population of href attribute of anchor <a> tag
 *
 * @param {Object} action param all params on the navigation
 * @return {Boolean} whether true or false
 */
function evaluateIfHrefPopulateOperation( action ) {
    if( _.isUndefined( action.actionType ) && !_.isUndefined( action.navigateTo ) && !_.isUndefined( action.navigationParams ) ) {
        return true;
    }
    return false;
}

/**
 * Evaluate the param on the workspace
 *
 * @param {Object} param all params on the navigation
 * @param {Object} evaluationContext - Scope to execute  with
 * @return {Object} resolved param.
 */
function evaluateParam( param, evaluationContext ) {
    _.forEach( param, function( value, key ) {
        var parameterKey = parsingUtils.getStringBetweenDoubleMustaches( value );
        var val = _.get( evaluationContext, parameterKey, null );
        if( val ) {
            _.set( param, key, _.get( evaluationContext, parameterKey, null ) );
        }
    } );
    return param;
}

exports = {
    navigate
};
export default exports;
/**
 * This service provides necessary APIs to navigate to a URL within AW.
 *
 * @memberof NgServices
 * @member navigationService
 *
 * @returns {navigationService} Reference to service.
 */
app.factory( 'navigationService', () => exports );

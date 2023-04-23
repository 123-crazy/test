// Copyright (c) 2020 Siemens

/**
 * This service manages the gateway functionality.
 *
 * @module js/tileService
 */
import app from 'app';
import commandSvc from 'js/command.service';
import localeSvc from 'js/localeService';
import navigationSvc from 'js/navigationService';
import viewModelService from 'js/viewModelService';
import declDataProviderService from 'js/declDataProviderService';
import $ from 'jquery';
import _ from 'lodash';
import analyticsSvc from 'js/analyticsService';
import browserUtils from 'js/browserUtils';

var exports = {};

var COMMANDARGS_DELIMITER = '&';
var LOCALE_TOKEN = '${locale}';

/**
 * Process concatenated command argument string, splits it based off delimiter '&' and returns an array
 *
 * @param {String} cmdArgString - concatenated command argument string
 * @return {Array} Array of command arguments after splitting them based off '&'
 */
export let processCommandArgs = function( cmdArgString ) {
    var cmdArgArray = [];
    if( cmdArgString ) {
        cmdArgArray = cmdArgString.split( COMMANDARGS_DELIMITER );
    }

    return cmdArgArray;
};

/**
 * Decode action parameters value
 *
 * @param {Object} actionParams - tile action parameters
 * @return {Object} action parameters after decoding them
 */
export let decodeActionParams = function( actionParams ) {
    var actionParamsIn = {};
    if( actionParams ) {
        _.forEach( actionParams, function( value, key ) {
            /**
             * GWT uses a non-standard encoding with + instead of %20.
             * TODO: This should be removed once server side URL building is removed or updated
             */
            value = value.replace( /\+/g, '%20' );
            // Custom decoding from GWT - double encoded, '=' replaced with \2
            actionParamsIn[ key ] = decodeURIComponent(
                decodeURIComponent( value ) ).replace( /\\2/g, '=' );
        } );
    }

    return actionParamsIn;
};

/**
 *  Construct url with query parameters for tile
 * @param {String} url - URL of tile action
 * @param {Object} actionParams  - tile action parameters
 * @return {String} constructed full URL
 */
let _constructActionURL = function( url, actionParams ) {
    var fullUrl = url;
    var decodedActionParams = exports.decodeActionParams( actionParams );
    var param = $.param( decodedActionParams );
    if( param && param.length > 0 ) {
        fullUrl += '?' + param;
    }
    return fullUrl;
};

/**
 * Process all action types which are related to url i.e.
 * <br> 0 - Default <br>
 * <br> 1 - External Url <br>
 * <br> 2 - Static Resource <br>
 *
 * @param {Object} tileAction - tile action object
 */
export let processUrlAction = function( tileAction ) {
    if( tileAction ) {
        var action = { actionType: 'Navigate' };

        if( tileAction.actionType === 1 ) { // External URL
            if( tileAction.url.indexOf( 'http' ) === 0 ) {
                window.open( _constructActionURL( tileAction.url, tileAction.actionParams ), '', '' );
            } else {
                window.open( _constructActionURL( browserUtils.getBaseURL() + tileAction.url, tileAction.actionParams ), '', '' );
            }
        } else if( tileAction.actionType === 2 ) { // Static resource
            var locale = localeSvc.getLocale();
            // Get the relative path for the resource. Replace the locale token if present.
            var relativeUrlPath = '/' + tileAction.url.replace( LOCALE_TOKEN, locale );

            if( _.endsWith( tileAction.url, '.pdf' ) ) {
                action.navigateTo = 'com_siemens_splm_clientfx_pdfjs_showPdfFileSubLocation';
                navigationSvc.navigate( action, exports.decodeActionParams( {
                    file: relativeUrlPath,
                    uid: ''
                } ) );
            } else {
                // Prepend the module path
                var staticResourceLocation = app.getBaseUrlPath() + relativeUrlPath;
                // Open the link provided for the tile in a new tab in the same window
                // Pass in empty string for name. This will open the link in another tab in the same window.
                action.navigateIn = 'newTab';
                action.navigateTo = staticResourceLocation;
                navigationSvc.navigate( action, exports.decodeActionParams( tileAction.actionParams ) );
            }
        } else { // default
            var REGEX_DOT = /\./g;
            var urlIn = tileAction.url;

            if( REGEX_DOT.test( tileAction.url ) ) {
                urlIn = tileAction.url.replace( REGEX_DOT, '_' );
            }

            action.navigateTo = urlIn;
            navigationSvc.navigate( action, exports.decodeActionParams( tileAction.actionParams ) );
        }
    }
};

/**
 * Process command action type i.e.
 * <br> 3 - Command <br>
 *
 * @param {Object} tileAction - tile action object
 * @param {Object} context - 'dataCtxNode' (a.k.a AngularJS '$scope')
 */
export let processCommandAction = function( tileAction, context ) {
    if( tileAction ) {
        var cmdArgs;

        if( context ) {
            context.commandContext = context.commandContext || {};
        }

        if( tileAction.actionParams ) {
            cmdArgs = exports.processCommandArgs( tileAction.actionParams.cmdArg );
            if( context ) {
                context.commandContext.cmdArgs = cmdArgs;
                context.commandContext.cmdId = tileAction.actionParams.cmdId;
            }
        }

        commandSvc.executeCommand( tileAction.commandId, cmdArgs, context );
    }
};

/**
 * Perform operation for gateway tile after clicking it, according to its action Type
 *
 * @param {Object} tileAction - tile action object
 * @param {Object} context - 'dataCtxNode' (a.k.a AngularJS '$scope')
 */
export let performAction = function( tileAction, context ) {
    if( tileAction ) {
        var sanTileActionCmdId = '';
        if( tileAction.url ) {
            exports.processUrlAction( tileAction );
            sanTileActionCmdId = 'URL';
        } else if( tileAction.commandId ) {
            exports.processCommandAction( tileAction, context );
            sanTileActionCmdId = tileAction.commandId;
        } else {
            var declViewModel = viewModelService.getViewModel( context, true );
            if( declViewModel ) {
                declDataProviderService.executeLoadAction( tileAction, declViewModel._internal.origDeclViewModelJson, context );
            }
        }
    }

    var sanTileData = {};
    sanTileData.sanAnalyticsType = 'Tile';
    sanTileData.sanCommandId = 'Tile';
    if( context && context.tile && context.tile.displayName ) {
        sanTileData.sanCommandTitle = context.tile.displayName;
    }
    sanTileData.sanTileAction = sanTileActionCmdId;
    analyticsSvc.logCommands( sanTileData );

    var predictionLogData = {
        analyticsType: 'Tile',
        sanCommandId: 'Tile',
        commandAnchor: 'Tile',
        tileInfo: context.tile
    };
    analyticsSvc.logPredictionData( predictionLogData );
};

exports = {
    processCommandArgs,
    decodeActionParams,
    processUrlAction,
    processCommandAction,
    performAction
};
export default exports;
/**
 * This service manages the gateway functionality.
 *
 * @memberof NgServices
 * @member tileService
 */
app.factory( 'tileService', () => exports );

// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define  */

/**
 * This service is used to manage command visibility.
 *
 * @module js/tcCommandVisibilityService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import AwHttpService from 'js/awHttpService';
import async from 'js/async.service';
import soaService from 'soa/kernel/soaService';
import cdm from 'soa/kernel/clientDataModel';
import appCtxService from 'js/appCtxService';
import localeService from 'js/localeService';
import messagingService from 'js/messagingService';
import adapterService from 'js/adapterService';
import functional from 'js/functionalUtility.service';
import viewModelProcessingFactory from 'js/viewModelProcessingFactory';
import dmSvc from 'soa/dataManagementService';
import _ from 'lodash';
import Debug from 'Debug';
import eventBus from 'js/eventBus';
import logger from 'js/logger';

var trace = new Debug( 'command:tcCommandVisibilityService' );

/*eslint-disable-next-line valid-jsdoc*/

/**
 * @private
 *
 * @property {promise} Cached reference.
 */
var URL_PARAMETER_PREFIX = 'UrlParameter_';

/**
 * @private
 *
 * @property {promise} Cached reference.
 */
var XRT_PAGE_ID = 'ActiveXrtPageId';

/**
 * Parameters that should trigger a command context change event
 *
 * @private
 * @member _commandContextParams
 * @memberOf commandVisibilityService
 */
var _commandContextParams = [
    'mselected',
    'sublocation'
];

/**
 * The input from the last time the SOA was called
 */
var _lastSoaInput = null;

/**
 * Map<CommandId,Promise> that contains any active loads of visibility for a specific command
 */
var activeCommandLoads = {};

/**
 * Commands that have server visibility and are currently in a command bar
 */
var serverVisibilityConsumerCounts = {};

/**
 * Simple counter to support multiple locks and unlocks of command visibility service
 */
var lockCount = 0;

/**
 * Any ongoing visibility load call
 */
var activeSoaLoad = null;

/**
 * Check if input to the SOA has changed
 *
 * @param {Object} ni first input
 * @param {Object} oi second input
 * @returns {Boolean} true if it has changed
 */
var checkIfInputChanged = function( ni, oi ) {
    return !_.isEqual( ni.clientScopeURI, oi.clientScopeURI ) ||
        !_.isEqual( ni.selectionInfo, oi.selectionInfo );
};

/**
 * Check if any model object appears in both arrays. Checks based
 * on uid not object identity
 *
 * @param {ModelObject[]} objectsA First list of model objects
 * @param {ModelObject[]} objectsB Second list of model objects
 * @return {Boolean} Whether any object appears in both lists
 */
var anyUidMatch = function( objectsA, objectsB ) {
    var selectedUidMap = objectsA
        .map( functional.getProp( 'uid' ) )
        .reduce( functional.toBooleanMap, {} );
    return objectsB
        .map( functional.getProp( 'uid' ) )
        .filter( functional.fromMap( selectedUidMap ) ).length > 0;
};

/**
 * check for objects modified and then get visible commands for modified objects
 *
 * @function checkForRefresh
 *
 * @return {Promise} A promise containing the array of command IDs
 */
var checkForRefresh = _.debounce( function checkForRefresh( objects ) {
    //If SOA call is active wait until it is complete to check if forced refresh is necessary
    ( activeSoaLoad || AwPromiseService.instance.resolve() ).then( function() {
        var needVisibilityUpdate = anyUidMatch( appCtxService.getCtx( 'mselected' ) || [], objects );

        //Force getVisibleCommands call
        var forceRefreshVisibility = function() {
            getVisibleCommands( true ).then( function( visibleCommands ) {
                appCtxService.updateCtx( 'visibleServerCommands', visibleCommands );
            } );
        };

        var selectedObjects = appCtxService.getCtx( 'mselected' );
        // If selection not refreshed, check for alternate selection
        if( !needVisibilityUpdate ) {
            adapterService.getAdaptedObjects( selectedObjects ).then( function( adaptedObjs ) {
                _.forEach( adaptedObjs, function( adaptedObject ) {
                    if( !needVisibilityUpdate ) {
                        var matches = _.filter( objects, function( obj ) {
                            var mo = obj;
                            if( obj.length ) {
                                mo = obj[ 0 ];
                            }
                            return mo.uid === adaptedObject.uid;
                        } );
                        if( matches && matches.length ) {
                            needVisibilityUpdate = true;
                        }
                    }
                } );
                if( needVisibilityUpdate ) {
                    forceRefreshVisibility();
                }
            } );
        } else {
            forceRefreshVisibility();
        }
    } );
}, 250, {
    trailing: true,
    leading: false
} );

/**
 * Get the SOA input
 *
 * @param {List<String>} commandIds Specific IDs to include in the call instead of all commands

 * @return {Object[]} Array of filtered Objects.
 */
var getVisibleCommandsSoaInput = function( commandIds ) {
    return {
        getVisibleCommandsInfo: [ {
            clientScopeURI: appCtxService.getCtx( 'sublocation.clientScopeURI' ) || '',
            selectionInfo: getSelectionInfo(),
            commandContextInfo: getCommandContext(),
            commandInfo: getCommandInfo( commandIds )
        } ]
    };
};

/**
 * Get the model object info that will actually be sent to the server.
 * <P>
 * Note: We do not want to send any of the properties, just the UID since the next code will do a deep
 * compare on the set of objects to see if anything changed sine the last time it asked for command
 * visibility.
 *
 * @param {ModelObject} mo Model object
 * @return {Object} Model object data that is sent to server
 */
var toSoaModelObject = function( mo ) {
    return {
        //Would remove type but the defaulting in soa service actually modifies input
        //which means next comparison would trigger another SOA call
        type: 'unknownType',
        uid: mo.uid
    };
};

/**
 * Get the selection information for SOA input
 *
 * @return {Object[]} Array of filtered Objects.
 */
var getSelectionInfo = function() {
    var selection = appCtxService.getCtx( 'mselected' ) || [];
    var parentSelection = appCtxService.getCtx( 'pselected' );

    if( parentSelection && parentSelection.uid === cdm.NULL_UID ) {
        parentSelection = null;
    }

    var soaMOs = [];
    var isTCGQL = appCtxService.getCtx( 'istcgql' );
    _.forEach( selection, function( selectedObj ) {
        var mo = cdm.getObject( selectedObj.uid );
        if( mo ) {
            soaMOs.push( toSoaModelObject( mo ) );
        } else {
            if( isTCGQL ) {
                soaMOs.push( toSoaModelObject( selectedObj ) );
            }
        }
    } );

    var selInfo = [];

    if( soaMOs.length ) {
        var primarySelection = {
            contextName: '',
            parentSelectionIndex: parentSelection ? 1 : -1,
            selectedObjects: soaMOs
        };

        selInfo.push( primarySelection );
    }

    if( parentSelection ) {
        var pmo = cdm.getObject( parentSelection.uid );
        if( pmo ) {
            selInfo.push( {
                contextName: '',
                parentSelectionIndex: -1,
                selectedObjects: [ toSoaModelObject( parentSelection ) ]
            } );
        }
    }

    return selInfo;
};

/**
 * Get the selection information for SOA input
 *
 * @return {Object[]} Array of filtered Objects.
 */
var getCommandContext = function() {
    var hostingInfo = [ {
        contextName: 'IsHosted',
        contextValue: appCtxService.ctx.aw_hosting_enabled ? 'true' : 'false'
    }, {
        contextName: 'HostType',
        contextValue: appCtxService.ctx.aw_host_type || ''
    } ];

    //uid is always included since many teams have used to avoid writing conditions against what is selected vs the opened object
    var urlInfo = ( appCtxService.getCtx( 'commandContextParameters' ) || [] ).concat( [ 'uid' ] ).map( function( param ) {
        if( _.includes( param, XRT_PAGE_ID ) ) {
            return {
                contextName: XRT_PAGE_ID,
                contextValue: _.replace( param, XRT_PAGE_ID + ':', '' )
            };
        }
        return {
            contextName: URL_PARAMETER_PREFIX + param,
            contextValue: appCtxService.getCtx( 'state.processed.' + param ) || ''
        };
    } );

    return hostingInfo.concat( urlInfo );
};

/**
 * Get the command information for SOA input
 *
 * @param {List<String>} commandIds Specific IDs to include in the call instead of all commands
 * @return {Object[]} Command info
 */
var getCommandInfo = function( commandIds ) {
    return _.uniq( commandIds ).sort().map( function( commandId ) {
        return {
            commandCollectionId: '',
            commandId: commandId
        };
    } );
};

/**
 * Start event listeners and do any other necessary setup
 */
var init = function() {
    //Subscribe for model object related data modified event
    eventBus.subscribe( 'cdm.relatedModified', function( data ) {
        checkForRefresh( data.relatedModified );
    } );
    //Subscribe for cdm.updated event
    eventBus.subscribe( 'cdm.updated', function( data ) {
        checkForRefresh( data.updatedObjects );
    } );
};

/**
 * Check if context has changed and visibility needs to be updated
 *
 * @param {Object} contextData The context data which have might changed
 * @return {Boolean} - A boolean which indicates if command context has changed.
 */
var hasCommandContextChanged = function( contextData ) {
    //If one of the parameters used in building the context has changed
    if( _commandContextParams.indexOf( contextData.name ) !== -1 ) {
        if( !_lastSoaInput ) {
            return true;
        }
        //And the new SOA input does not match the last input
        var newInput = getVisibleCommandsSoaInput( Object.keys( serverVisibilityConsumerCounts ) );
        var ni = newInput.getVisibleCommandsInfo[ 0 ];
        var oi = _lastSoaInput.getVisibleCommandsInfo[ 0 ];
        //Exclude command list changes from this check - will be handled separately
        if( checkIfInputChanged( ni, oi ) ) {
            //Then load the new visibility if the soa input is valid
            return newInput.getVisibleCommandsInfo[ 0 ].clientScopeURI !== '';
        }
    }
    return false;
};

/**
 * Get a map with command visibility info
 *
 * @param {Boolean} force True if the server should be called again even if input has not changed
 * @return {Promise} A promise that will be resolved with the visible commands map
 */
var getVisibleCommands = function( force ) {
    var commandIdsToLoad = Object.keys( serverVisibilityConsumerCounts );
    trace( 'Full visibility reload', commandIdsToLoad, force );
    return AwPromiseService.instance.all( commandIdsToLoad.map( function( commandId ) {
        //Use the same queuing setup that lazy load uses to ensure no extra SOA calls
        return loadVisibility( commandId );
    } ) ).then( function( results ) {
        //Result of every promise will be the same
        return results[ 0 ];
    } );
};

/**
 * Update the server visibility context and fire an event to say it is updated
 *
 * @param {Boolean} soaCallFinished - if soa call finished
 */
var updateSoaVisibilityContext = function( soaCallFinished, input, visibleCommandsInfo ) {
    //Most likely not necessary, previously used to prevent aw-command click before server visibility completion
    //Stuck with this as API as app team services are checking also
    appCtxService.registerCtx( 'serverCommandVisibility', {
        soaCallFinished: soaCallFinished
    } );
    //Should not be necessary but stuck with this as API as app team services depend on this event
    eventBus.publish( 'soa.getVisibleCommands', {
        soaCallFinished: soaCallFinished,
        soaInput: input,
        visibleCommandsInfo: visibleCommandsInfo
    } );
};

/**
 * Call the SOA to load visibility for a list of commands
 *
 * @param {List<String>} commandIds Command ids to include
 * @returns {Promise} Promise resolved when done
 */
var loadVisibilityBatch = function( commandIds ) {
    var input = getVisibleCommandsSoaInput( commandIds );
    _lastSoaInput = input;

    //call dmSvc.loadObjects before getVisibleCommands when using tcgql
    var isTCGQL = appCtxService.getCtx( 'istcgql' );
    if( isTCGQL ) {
        var favViewModel = appCtxService.getCtx( 'ViewModeContext.ViewModeContext' );
        var isNotSummaryView = favViewModel === 'TableView' || favViewModel === 'ListView' || favViewModel === 'ImageView';
        var selectObjUids = [];
        var mselectObjs = appCtxService.getCtx( 'mselected' );
        _.forEach( mselectObjs, function( selectedObj ) {
            var uid = selectedObj.uid;
            if( uid ) {
                selectObjUids.push( uid );
            }
        } );
        var isMultiSelected = selectObjUids.length > 1;
        if( selectObjUids.length > 0 && ( isNotSummaryView || isMultiSelected ) ) {
            dmSvc.loadObjects( selectObjUids );
        }
    }

    trace( 'Calling SOA', commandIds );
    activeSoaLoad = soaService.postUnchecked( 'Internal-AWS2-2016-03-UiConfig', 'getVisibleCommands', input, {} )
        .then( function( response ) {
            activeSoaLoad = null;
            // Report any partial errors to console and process the remaining commands information present in response
            if( response.ServiceData && response.ServiceData.partialErrors ) {
                var err = soaService.createError( response.ServiceData );
                logger.error( err.stack );
            }
            //"Fill out" the info and ensure non visibile commands have property set to false
            var visibleCommandsInfo = response.visibleCommandsInfo
                .reduce( function( acc, nxt ) {
                    acc[ nxt.commandId ] = true;
                    return acc;
                }, {} );
            commandIds.forEach( function( id ) {
                visibleCommandsInfo[ id ] = visibleCommandsInfo[ id ] || false;
            } );
            //Merge context here to handle lazy load case
            //In full reload case promise result will be used to fully replace context
            var currentCtx = appCtxService.getCtx( 'visibleServerCommands' ) || {};
            _.assign( currentCtx, visibleCommandsInfo );
            appCtxService.registerCtx( 'visibleServerCommands', currentCtx );
            updateSoaVisibilityContext( true, input, currentCtx );
            return visibleCommandsInfo;
        }, function( error ) {
            activeSoaLoad = null;
            updateSoaVisibilityContext( true );
            if( error ) {
                if( error.cause && error.cause.status === -1 ) {
                    // Show custom error message
                    localeService.getTextPromise().then( function( localTextBundle ) {
                        messagingService.showError( localTextBundle.SERVER_ERROR );
                    } );
                } else if( error.message ) {
                    messagingService.showError( error.message );
                } else {
                    messagingService.showError( JSON.stringify( error ) );
                }
            }
            return error;
        } );
    return activeSoaLoad;
};

/**
 * Add a lock to the command visibility service. Service will not make any
 * SOA call until all locks are cleared. Additonal calls to load server visibility
 * will continue to add to queue
 *
 * @returns {Function} Unlock function that should be called to clear the lock
 */
var addLock = function() {
    lockCount++;
    trace( 'Visibility service locked', lockCount );
    return function unlock() {
        lockCount--;
        trace( 'Visibility service unlocked', lockCount );
    };
};

var maxViewModelActiveCount = 20; // * debounce time = max time to wait before SOA call
var viewModelActiveCounter = 0;

/**
 * Unlock detection function
 *
 * @returns {Boolean} If the service is unlocked
 */
var unlockFunction = function() {
    if( lockCount !== 0 ) {
        trace( 'Visibility service is locked - Manual' );
    } else if( AwHttpService.instance.pendingRequests.length !== 0 ) {
        trace( 'Visibility service is locked - HTTP is active' );
    } else if( viewModelProcessingFactory.isAnyViewModelActive() ) {
        viewModelActiveCounter++;
        trace( 'Visibility service is locked - View model is active' );
        if( viewModelActiveCounter > maxViewModelActiveCount ) {
            trace( 'Reached max wait time for view models to complete' );
        }
    }
    if( lockCount === 0 &&
        AwHttpService.instance.pendingRequests.length === 0 &&
        ( !viewModelProcessingFactory.isAnyViewModelActive() || viewModelActiveCounter > maxViewModelActiveCount ) ) {
        setTimeout( function() {
            viewModelActiveCounter = 0;
        }, 1000 );
        return true;
    }
    return false;
};

/**
 * Load the visibility for a single command
 *
 * Will wait until HTTP is not active and service is not locked before starting SOA call
 *
 * @param {String} commandId ID of the command to load visibility for
 * @returns {Promise} Promise resolved when visibility is loaded and context is updated
 */
var loadVisibility = async.debouncePromise( loadVisibilityBatch, 50, {
    isUnlocked: unlockFunction
} );

/**
 * Load the server visibility for the given command
 *
 * @param {String} commandId command id
 * @returns {Promise<Boolean>} Promise resolved when done
 */
var loadServerVisibility = function( commandId ) {
    serverVisibilityConsumerCounts[ commandId ] = ( serverVisibilityConsumerCounts[ commandId ] || 0 ) + 1;
    trace( 'Consumer added', commandId, serverVisibilityConsumerCounts[ commandId ] );
    //check serverVisibilityConsumerCounts instead of app context as load to update app context may be active
    if( serverVisibilityConsumerCounts[ commandId ] !== 1 ) {
        trace( 'Server visibility already loaded', commandId );
        return AwPromiseService.instance.resolve();
    } else if( !activeCommandLoads[ commandId ] ) {
        trace( 'Server visibility load started', commandId );
        activeCommandLoads[ commandId ] = loadVisibility( commandId ).then( function() {
            delete activeCommandLoads[ commandId ];
        } );
    } else {
        trace( 'Server visibility load in progress', commandId );
    }
    return activeCommandLoads[ commandId ];
};

/**
 * Bulk unload of server visibility
 *
 * @param {List<String>} commandIds ids to unload
 * @returns {Promise} Promise resolved when done
 */
var unloadServerVisibilityBatch = function( commandIds ) {
    var currentCtx = appCtxService.getCtx( 'visibleServerCommands' ) || {};
    commandIds.forEach( function( commandId ) {
        serverVisibilityConsumerCounts[ commandId ]--;
        if( serverVisibilityConsumerCounts[ commandId ] === 0 ) {
            trace( 'All consumers removed, deleting', commandId );
            delete serverVisibilityConsumerCounts[ commandId ];
            delete currentCtx[ commandId ];
        }
    } );
    trace( 'Bulk unload of server visibility complete', serverVisibilityConsumerCounts );
    appCtxService.registerCtx( 'visibleServerCommands', currentCtx );
    return AwPromiseService.instance.resolve();
};

/**
 * Unload server visibility of a single command. Somewhat like a cache as it will not immediately
 * remove the visibility. Instead the removal is queued the same as visibility loading. This allows
 * any new consumers of that visibility to come in later without forcing a new SOA call.
 *
 * 3000ms debounce means command visibility will only be unloaded 3s after the last time it was needed
 *
 * @param {String} commandId ID of the command to unload
 */
var unloadServerVisibility = async.debouncePromise( unloadServerVisibilityBatch, 3000 );

var exports = {};
export { init as init };
export { hasCommandContextChanged as hasCommandContextChanged };
export { getVisibleCommands as getVisibleCommands };
export { loadServerVisibility as loadServerVisibility };
export { unloadServerVisibility as unloadServerVisibility };
export { addLock as addLock };
export default exports = {
    init,
    hasCommandContextChanged,
    getVisibleCommands,
    loadServerVisibility,
    unloadServerVisibility,
    addLock
};
/**
 * @memberof NgServices
 * @member tcCommandVisibilityService
 */
app.factory( 'tcCommandVisibilityService', () => exports );

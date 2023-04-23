// Copyright (c) 2020 Siemens

/**
 * This file contains the utility methods for workspace management.
 *
 * @module js/workspaceService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import localeSvc from 'js/localeService';
import uwPropertySvc from 'js/uwPropertyService';
import cfgSvc from 'js/configurationService';
import workspaceValidationService from 'js/workspaceValidationService';
import appCtxSvc from 'js/appCtxService';
import awIconService from 'js/awIconService';
import _ from 'lodash';

import 'js/workspaceInitService';

/**
 * Cached reference to the various AngularJS and AW services.
 */

var exports = {};

/**
 * Get all workspaces
 *
 * @return {Promise} Resolved with workspace list
 */
export let getAllWorkspaces = function() {
    var emptyFilterList = {};
    emptyFilterList.workspacesViewModel = '[]';
    return exports.getWorkspaces( emptyFilterList, true );
};

/**
 * Get filtered workspaces
 *
 * @param {Object} response - Contains list of workspace IDs based on which filtering needs to happen
 * @return {Promise} Resolved with workspace list
 */
export let getFilteredWorkspaces = function( response ) {
    return exports.getWorkspaces( response, false );
};

/**
 * Get available commands for the given workspace
 *
 * @param {String} activeWorkSpaceId - active workspace ID
 * @return {Array} command list
 */
export let getWorkspaceCommands = function( activeWorkSpaceId ) {
    var inKey = 'includedCommands';
    var exKey = 'excludedCommands';
    return cfgSvc.getCfg( 'workspace' ).then( function( workspaceCfg ) {
        var workspaceCommands = [];
        var activeWorkspace = {};
        if( workspaceCfg ) {
            activeWorkspace = _.get( workspaceCfg, activeWorkSpaceId );
        }
        workspaceCommands[ inKey ] = activeWorkspace.includedCommands;
        workspaceCommands[ exKey ] = activeWorkspace.excludedCommands;
        return workspaceCommands;
    } );
};

/**
 * Get available commands for the given workspace
 *
 * @param {String} commands - commands on page
 * @return {Array} filter command list
 */
export let getActiveWorkspaceCommands = function( commands ) {
    var workspaceDefinition = appCtxSvc.getCtx( 'workspace' );

    if( !workspaceValidationService.isExclusiveWorkspace( workspaceDefinition ) ) {
        return commands;
    }
    var inclusiveCmds = appCtxSvc.getCtx( 'workspace.includedCommands' );

    if( inclusiveCmds && inclusiveCmds.length === 0 ) {
        return null;
    }
    if( inclusiveCmds !== undefined ) {
        var inclusiveCmdsOverlay = _.filter( commands, function( cmdOverlay ) {
            return inclusiveCmds.includes( cmdOverlay.commandId );
        } );
    }
    var includedcmds = inclusiveCmds === undefined ? commands : inclusiveCmdsOverlay;
    var exclusiveCmds = appCtxSvc.getCtx( 'workspace.excludedCommands' );

    if( exclusiveCmds !== undefined ) {
        var cmdDiffArray = [];
        cmdDiffArray = inclusiveCmdsOverlay && inclusiveCmdsOverlay.length > 0 ? inclusiveCmdsOverlay : includedcmds;
        return cmdDiffArray.filter( cmdOverlay => !exclusiveCmds.includes( cmdOverlay.commandId ) );
    }
    return includedcmds;
};

/**
 * Get available context configuration for the given workspace
 *
 * @param {String} activeWorkSpaceId - active workspace ID
 * @return {Array} page list
 */
export let getAvailableContexts = function( activeWorkSpaceId ) {
    return cfgSvc.getCfg( 'workspace' ).then( function( workspaceCfg ) {
        var activeWorkspace = {};
        if( workspaceCfg ) {
            activeWorkspace = _.get( workspaceCfg, activeWorkSpaceId );
        }
        return activeWorkspace.availableContextConfigurations;
    } );
};

/**
 * Get available navigation configuration for the given workspace
 * @param {Object} activeWorkSpaceId - active workspace ID based on wworkspace
 * @return {Array} availableNavigations -navigation list
 */
export let getAvailableNavigations = function( activeWorkSpaceId ) {
    var navigationConfigs;
    var availableNavigations = [];
    return AwPromiseService.instance.all( [ cfgSvc.getCfg( 'workspace' ).then( function( workspaceCfg ) {
        navigationConfigs = _.cloneDeep( workspaceCfg );
        return true;
    } ) ] ).then( function() {
        if( navigationConfigs ) {
            _.forEach( navigationConfigs, function( workspaceDefn ) {
                if( activeWorkSpaceId === workspaceDefn.workspaceId && workspaceDefn.availableNavigations ) {
                    availableNavigations = workspaceDefn.availableNavigations;
                }
                if( availableNavigations.length > 0 ) {
                    availableNavigations.sort();
                }
            } );
        }

        return availableNavigations;
    } );
};

/**
 * Get available workspaces
 *
 * @param {Object} response - Contains list of workspace IDs based on which filtering needs to happen
 * @param {Boolean} returnAll - true for getting all workspaces, false to filter workspaces
 * @return {Promise} Resolved with workspace list
 */
export let getWorkspaces = function( response, returnAll ) {
    var workspace = {};
    var responseWorkspaceList = JSON.parse( response.workspacesViewModel );
    workspace.workspaceList = [];
    workspace.workspaceCount = 0;

    var viewModel;
    return cfgSvc.getCfg( 'solutionDef' ).then( function( solutionDef ) {
        return cfgSvc.getCfg( 'workspace' );
    } ).then( function( workspaceCfg ) {
        viewModel = _.cloneDeep( workspaceCfg );
        var workspaceNames = [];
        _.forEach( viewModel, function( workspaceDefn ) {
            // Check whether it is a valid workspace definition. If so, lookup the workspace name
            if( workspaceDefn.workspaceName ) {
                workspaceNames.push( workspaceDefn.workspaceName );
            }
        } );
        return exports.getMultipleLocalizedText( workspaceNames );
    } ).then( function( workspaceNameMap ) {
        _.forEach( viewModel, function( workspaceDefn ) {
            // Proceed only if this is a valid workspace
            if( workspaceDefn.workspaceId ) {
                if( returnAll ||
                    _.includes( responseWorkspaceList, workspaceDefn.workspaceId ) ) {
                    var workspaceObj = {};
                    workspaceObj.uid = workspaceDefn.workspaceId;
                    workspaceObj.props = {};

                    var workspaceName;
                    if( workspaceDefn.workspaceName.key ) {
                        workspaceName = workspaceNameMap[ workspaceDefn.workspaceName.key ];
                    } else {
                        workspaceName = workspaceDefn.workspaceName;
                    }
                    var viewProp = uwPropertySvc.createViewModelProperty( 'object_string', 'object_string', 'string',
                        workspaceDefn.workspaceId, [ workspaceName ] );
                    workspaceObj.props[ viewProp.propertyName ] = viewProp;
                    workspaceObj.cellHeader1 = workspaceName;
                    workspaceObj.cellHeader2 = workspaceDefn.workspaceId;
                    workspaceObj.modelType = 'Awp0Workspace';
                    workspaceObj.typeIconURL = awIconService.getTypeIconFileUrl( workspaceObj );
                    // Fake clear editable states for this mock vmo
                    workspaceObj.clearEditiableStates = function() { return; };
                    workspace.workspaceList.push( workspaceObj );
                }
            }
        } );
        workspace.workspaceCount = workspace.workspaceList.length;
        return workspace;
    } );
};

/**
 * Reload page
 */
export let reloadPage = function() {
    location.reload( false );
};

/**
 * Get available page
 *
 * @return {Array} page list
 */
export let getAvailablePages = function() {
    var generatedRoutes;
    var viewModel;
    return AwPromiseService.instance.all( [ cfgSvc.getCfg( 'workspace' ).then( function( workspaceCfg ) {
        viewModel = _.cloneDeep( workspaceCfg );
        return true;
    } ), cfgSvc.getCfg( 'states' ).then( function( states ) {
        generatedRoutes = states;
        return true;
    } ) ] ).then( function() {
        var workspace = {};
        workspace.pageList = [];
        workspace.pageCount = 0;

        if( viewModel ) {
            _.forEach( viewModel, function( workspaceDefn ) {
                var availablePages = [];
                if( workspaceDefn.availablePages && workspaceValidationService.isExclusiveWorkspace( workspaceDefn ) ) {
                    availablePages = workspaceDefn.availablePages;
                } else if( !workspaceValidationService.isExclusiveWorkspace( workspaceDefn ) ) {
                    availablePages = Object.keys( generatedRoutes );
                }

                availablePages.sort();

                _.forEach( availablePages, function( availablePage ) {
                    var pageObj = {};
                    pageObj.props = {};
                    pageObj.uid = availablePage;
                    var viewProp = uwPropertySvc.createViewModelProperty( 'object_string', 'object_string',
                        'string', availablePage, [ availablePage ] );
                    pageObj.props[ viewProp.propertyName ] = viewProp;
                    // Fake clearEditable States
                    pageObj.clearEditiableStates = function() { return; };
                    if( _.has( generatedRoutes, availablePage ) ) {
                        var routePageObject = generatedRoutes[ availablePage ];
                        pageObj.cellHeader1 = availablePage;
                        if( routePageObject.data ) {
                            if( routePageObject.data.label ) {
                                workspaceValidationService.getLocalizedText( routePageObject.data.label ).then(
                                    function( result ) {
                                        pageObj.cellHeader1 = result;
                                    } );
                            }
                        }
                        pageObj.cellHeader2 = availablePage;
                        pageObj.modelType = 'pages';
                        pageObj.typeIconURL = awIconService.getTypeIconFileUrl( pageObj );
                        if( !routePageObject.abstract &&
                            _.find( workspace.pageList, pageObj ) === undefined ) {
                            workspace.pageList.push( pageObj );
                        }
                    }
                } );
            } );
        }

        workspace.pageCount = workspace.pageList.length;
        return workspace;
    } );
};

/**
 * Get localized text for multiple labels.
 *
 * @param {Array} labels - If label is string, return as is. If it contains source and key, retrieve value from the
 *            locale file
 * @return {Promise} Which will resolve with map containing key to label mapping
 */
export let getMultipleLocalizedText = function( labels ) {
    return AwPromiseService.instance( function( resolve ) {
        _.defer( function() {
            var promises = {};
            _.forEach( labels, function( label ) {
                if( typeof label === 'string' ) {
                    // If the label is a string just return it
                    promises[ label ] = AwPromiseService.instance.when( label );
                } else {
                    // Otherwise get the label from the localized file
                    promises[ label.key ] = localeSvc.getLocalizedText( label.source,
                        label.key );
                }
            } );

            resolve( AwPromiseService.instance.all( promises ) );
        } );
    } );
};

/**
 * Load the column configuration
 *
 * @param {Object} dataprovider - the data provider
 */
export let loadColumns = function( dataprovider ) {
    dataprovider.columnConfig = {
        columns: [ {
            name: 'object_string',
            displayName: 'object_string',
            typeName: 'WorkspaceObject',
            width: 150,
            pinnedLeft: true,
            enableColumnMenu: false,
            enableSorting: false,
            enableFiltering: false
        } ]
    };
};

exports = {
    getAllWorkspaces,
    getFilteredWorkspaces,
    getWorkspaceCommands,
    getActiveWorkspaceCommands,
    getAvailableContexts,
    getAvailableNavigations,
    getWorkspaces,
    reloadPage,
    getAvailablePages,
    getMultipleLocalizedText,
    loadColumns
};
export default exports;
/**
 * This service provides necessary APIs to maintain various workspace objects and related objects.
 *
 * @memberof NgServices
 * @member workspaceService
 */
app.factory( 'workspaceService', () => exports );

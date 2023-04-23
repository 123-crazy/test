// Copyright (c) 2020 Siemens

/**
 * This file contains the utility methods for workspace management.
 *
 * @module js/workspaceValidationService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import workspaceInitService from 'js/workspaceInitService';
import cfgSvc from 'js/configurationService';
import localeSvc from 'js/localeService';
import _ from 'lodash';
import awConfiguration from 'js/awConfiguration';

// Service
import AwPromiseService from 'js/awPromiseService';

/**
 * Cached reference to the various AngularJS and AW services.
 */

var exports = {};

/**
 * Check whether the passed page ID is a valid page
 *
 * @param {String} Page ID
 */
export let isValidPageAsync = function( pageId ) {
    var workspaceDefinition = appCtxSvc.getCtx( 'workspace' );
    var isWorkspaceChange = workspaceInitService.getisWorkspaceChange();

    if( workspaceDefinition && !isWorkspaceChange ) {
        let Promise = AwPromiseService.instance;
        return Promise.resolve( exports.isValidPage( pageId ) );
    }

    return exports.setWorkspaceId().then( function() {
        return exports.isValidPage( pageId );
    } );
};

/**
 * Check whether the passed page ID is a valid page
 *
 * @param {String} pageId - Page ID
 * @return {Boolean} is valid page?
 */
export let isValidPage = function( pageId ) {
    var validPage = true;
    var workspaceDefinition = appCtxSvc.getCtx( 'workspace' );
    if( workspaceDefinition && workspaceDefinition.availablePages ) {
        // Check the validity of the page only if it is exclusive workspace. For inclusive
        // workspace, all pages are valid pages
        if( exports.isExclusiveWorkspace( workspaceDefinition ) ) {
            validPage = _.includes( workspaceDefinition.availablePages, pageId );
        }
    }
    return validPage;
};

/**
 * Check whether the passed workspace is an exclusive workspace
 *
 * @param {Object} workspaceDefinition - Workspace definition
 * @return {Boolean} true for exclusive workspace, false otherwise
 */
export let isExclusiveWorkspace = function( workspaceDefinition ) {
    return workspaceDefinition.workspaceType === 'Exclusive';
};

/**
 * Set the workspace ID
 *
 * @return {Promise} promise
 */
export let setWorkspaceId = function() {
    var totalWorkspaceCount = workspaceInitService.getTotalWorkspaceCount();
    var solution;
    var workspaceId;
    return cfgSvc.getCfg( 'solutionDef' ).then( function( solutionDef ) {
        solution = solutionDef;
        workspaceId = workspaceInitService.getWorkspaceId();
        // If server has no workspace entry, set the default workspace and increment the workspace count
        // by 1 so that visibility of the WS link can be controlled correctly.
        if( !workspaceId && solution.defaultWorkspace ) {
            workspaceId = solution.defaultWorkspace;
            totalWorkspaceCount++;
        }
        return cfgSvc.getCfg( 'workspace' );
    } ).then( function( workspaceCfg ) {
        var allWorkspaceDefn = _.cloneDeep( workspaceCfg );

        var workspaceDefn = allWorkspaceDefn[ workspaceId ];
        // If the workspace ID returned by server is not a valid one, revert the workspace increment. (This is a
        // very corner usecase and should never happen but adding a preventive check.)
        if( !workspaceDefn ) {
            workspaceDefn = allWorkspaceDefn[ solution.defaultWorkspace ];
            totalWorkspaceCount--;
        }
        appCtxSvc.registerCtx( 'totalWorkspaceCount', totalWorkspaceCount );
        appCtxSvc.registerCtx( 'workspace', workspaceDefn );
        exports.getLocalizedText( workspaceDefn.workspaceName ).then( function( result ) {
            workspaceDefn.workspaceName = result;
            appCtxSvc.updateCtx( 'workspace', workspaceDefn );
        } );
        var defaultRoutePath = awConfiguration.get( 'defaultRoutePath' );
        if( defaultRoutePath !== workspaceDefn.defaultPage ) {
            // set the value
            app.constant( 'defaultRoutePath', workspaceDefn.defaultPage );
            appCtxSvc.registerCtx( 'defaultRoutePath', workspaceDefn.defaultPage );
        }
        return workspaceDefn;
    } );
};

/**
 * Get localized text.
 *
 * @param {Object} label - If label is string, return as is. If it contains source and key, retrieve value from the
 *            locale file
 * @return {String} localized text
 */
export let getLocalizedText = function( label ) {
    if( _.isString( label ) ) {
        // If the label is a string just return it
        return AwPromiseService.instance.resolve( label );
    }

    // Otherwise get the label from the localized file
    return localeSvc.getLocalizedText( label.source, label.key );
};

exports = {
    isValidPageAsync,
    isValidPage,
    isExclusiveWorkspace,
    setWorkspaceId,
    getLocalizedText
};
export default exports;
/**
 * This service provides necessary APIs to validate workspace artifacts.
 *
 * @memberof NgServices
 * @member workspaceValidationService
 */
app.factory( 'workspaceValidationService', () => exports );

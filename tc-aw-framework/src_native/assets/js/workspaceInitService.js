// Copyright (c) 2020 Siemens

/**
 * This service provides necessary APIs to initialize workspace.
 *
 * @module js/workspaceInitService
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

var _workspaceId = null;
var _isWorkspaceChange = false;
var _totalWorkspaceCount = null;

eventBus.subscribe( 'sessionInfo.updated', function( extraInfoOut ) {
    if( _workspaceId !== extraInfoOut.WorkspaceId ) {
        _isWorkspaceChange = true;
    }
    _workspaceId = extraInfoOut.WorkspaceId ? extraInfoOut.WorkspaceId : '';
    _totalWorkspaceCount = extraInfoOut.WorkspacesCount ? parseInt( extraInfoOut.WorkspacesCount ) : 0;
} );

/**
 * Get workspace Id
 *
 * @return {String} Workspace Id
 */
export let getWorkspaceId = function() {
    return _workspaceId;
};

/**
 * Get the flag for the workspace change
 *
 * @return {String} Workspace Id
 */
export let getisWorkspaceChange = function() {
    return _isWorkspaceChange;
};

/**
 * Get total workspace count
 *
 * @return {integer} Total workspace count
 */
export let getTotalWorkspaceCount = function() {
    return _totalWorkspaceCount;
};

exports = {
    getWorkspaceId,
    getisWorkspaceChange,
    getTotalWorkspaceCount
};
export default exports;
/**
 * This service provides necessary APIs to initialize workspace.
 *
 * @memberof NgServices
 * @member workspaceInitService
 */
app.factory( 'workspaceInitService', () => exports );

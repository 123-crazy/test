// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */
/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 * 
 * @module js/showReplaceOwningProjectCellCommandHandler
 */
import app from 'app';
import AssignProjectsService from 'js/AssignProjectsService';
import _ from 'lodash';
import ngModule from 'angular';
import eventBus from 'js/eventBus';

/**
 * 
 */

var exports = {};
var _owningProject = null;

/**
 * Execute the command.
 * <P>
 * The command context should be setup before calling isVisible, isEnabled and execute.
 * 
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 */
export let execute = function( vmo ) {

    if( vmo && vmo.uid ) {
        _owningProject = vmo;
        eventBus.publish( "awp0AssignProjects.replaceProject" );
    }
};

/**
 * Remove projects . Called when clicked on the remove projects cell command
 * <P>
 * The command context should be setup before calling isVisible, isEnabled and execute.
 * 
 * @param {ViewModelObject} data - view model json object
 * 
 */
export let replaceOwningProject = function( data ) {
    AssignProjectsService.replaceOwningProject( data, _owningProject );
};

/**
 * Set command context for show object cell command which evaluates isVisible and isEnabled flags
 * 
 * @param {ViewModelObject} context - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {Object} $scope - scope object in which isVisible and isEnabled flags needs to be set.
 */
export let setCommandContext = function( context, $scope ) {
    $scope.cellCommandVisiblilty = true;
};

export default exports = {
    execute,
    replaceOwningProject,
    setCommandContext
};
/**
 * This service creates name value property
 * 
 * @memberof NgServices
 * @member Awp0NameValueCreate
 */
app.factory( 'showReplaceOwningProjectCellCommandHandler', () => exports );

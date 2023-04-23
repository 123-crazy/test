// Copyright (c) 2020 Siemens

/**
 * This is the command handler for open in NewTab
 *
 * @module js/openInNewTabCommandHandler
 */
import app from 'app';
import commandsMapSvc from 'js/commandsMapService';
import navigationUtils from 'js/navigationUtils';

var exports = {};

/**
 * Cached CommandsMapService
 */

/**
 * Set command context for command which evaluates isVisible and isEnabled flags
 *
 * @param {ViewModelObject} context - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {Object} $scope - scope object in which isVisible and isEnabled flags needs to be set.
 */
export let setCommandContext = function( context, $scope ) {
    if( commandsMapSvc.isInstanceOf( 'BusinessObject', context.modelType ) ) {
        $scope.cellCommandVisiblilty = true;
    } else {
        $scope.cellCommandVisiblilty = false;
    }
};

/**
 * Execute the command.
 * <P>
 * The command context should be setup before calling isVisible, isEnabled and execute.
 *
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 */
export let execute = function( vmo ) {
    var url = navigationUtils.urlProcessing( vmo );
    var openLink = window.open( '', '_blank' );
    openLink.location = url;
};

exports = {
    setCommandContext,
    execute
};
export default exports;
/**
 * Open in new tab command handler service which sets the visibility of the command in cell list based off object
 * type. This command is visible for all the object types
 *
 * @memberof NgServices
 * @member viewFileCommandHandler
 */
app.factory( 'openInNewTabCommandHandler', () => exports );

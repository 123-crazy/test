// Copyright (c) 2020 Siemens

/**
 * This is the command handler for remove object from cell list.
 *
 * @module js/removeObjectCellCommandHandler
 */
import app from 'app';

var exports = {};

/**
 * Set command context for remove object cell command which evaluates isVisible and isEnabled flags
 *
 * @param {ViewModelObject} context - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {Object} $scope - scope object in which isVisible and isEnabled flags needs to be set.
 */
export let setCommandContext = function( context, $scope ) {
    $scope.cellCommandVisiblilty = true;
};

/**
 * Execute the command.
 * <P>
 * The command context should be setup before calling isVisible, isEnabled and execute.
 *
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {Object} $scope - scope object in which isVisible and isEnabled flags needs to be set.
 */
export let execute = function( vmo, $scope ) {
    $scope.$emit( 'awList.removeObjects', {
        toRemoveObjects: [ vmo ]
    } );
};

exports = {
    setCommandContext,
    execute
};
export default exports;
/**
 * Remove object command handler service.
 *
 * @memberof NgServices
 * @member showObjectCommandHandler
 */
app.factory( 'removeObjectCellCommandHandler', () => exports );

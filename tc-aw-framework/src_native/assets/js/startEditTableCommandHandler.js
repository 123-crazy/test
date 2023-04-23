// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define

 */

/**
 * This is the command handler for edit in table
 *
 * @module js/startEditTableCommandHandler
 */
import * as app from 'app';
import editHandlerService from 'js/editHandlerService';

var exports = {};

/**
 * Execute the command.
 * <P>
 * The command context should be setup before calling isVisible, isEnabled and execute.
 *
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 */
export let execute = function( vmo ) {
    console.log( "start edit table" );
    if( !editHandlerService.isEditEnabled() ) {
        var editHandler = editHandlerService.getEditHandler( "TABLE_CONTEXT" );
        if( editHandler.canStartEdit() && !editHandler.editInProgress() ) {
            editHandler.startEdit();
        }
    }
};

export default exports = {
    execute
};
/**
 * Open in new tab command handler service which sets the visibility of the command in cell list based off object
 * type. This command is visible for all the object types
 *
 * @memberof NgServices
 * @member viewFileCommandHandler
 */
app.factory( 'startEditTableCommandHandler', () => exports );

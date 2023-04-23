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
 * @module js/programChangeService
 */
import app from 'app';
import selectionService from 'js/selection.service';
import commandPanelService from 'js/commandPanel.service';
import appCtxService from 'js/appCtxService';

var exports = {};

export let removeChangeOperation = function() {
    var relationInputs = [];
    var selection = selectionService.getSelection().selected;
    if( selection && selection.length > 0 ) {
        var primaryObj = selectionService.getSelection().parent;
        for( var index = 0; index < selection.length; index++ ) {
            relationInputs.push( {
                primaryObject: primaryObj,
                secondaryObject: selection[ index ],
                relationType: "Pch0PlanChangeRelation"
            } );
        }
    }
    return relationInputs;
};

/**
 * Method for invoking and registering/unregistering data for the AddChanges command panel
 *
 * @param {String} commandId - Command Id for the Add Deliverable command
 * @param {String} location - Location of the Add Deliverable command
 * @param {Object} ctx - The Context object
 */
export let openPanelForAddChange = function( commandId, location, ctx ) {
    var jso = {};
    var selection = ctx.selected;
    var changeObj = "ChangeObject";

    if( selection ) {
        jso = {
            selected: selection
        };
        appCtxService.registerCtx( changeObj, jso );
    } else {
        appCtxService.unRegisterCtx( changeObj );
    }
    commandPanelService.activateCommandPanel( commandId, location );
};

export default exports = {
    removeChangeOperation,
    openPanelForAddChange
};
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member programChangeService
 */
app.factory( 'programChangeService', () => exports );

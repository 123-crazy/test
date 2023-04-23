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
 * @module js/prgPlanningEventChangeService
 */
import app from 'app';
import selectionService from 'js/selection.service';
import commandPanelService from 'js/commandPanel.service';
import appCtxService from 'js/appCtxService';

var exports = {};

export let removeEventChangeOperation = function() {
    var relationInputs = [];
    var selection = selectionService.getSelection().selected;
    if( selection && selection.length > 0 ) {
        var primaryObj = selectionService.getSelection().parent;
        for( var index = 0; index < selection.length; index++ ) {
            relationInputs.push( {
                primaryObject: primaryObj,
                secondaryObject: selection[ index ],
                relationType: "Pec0EventChangeRelation"
            } );
        }
    }
    return relationInputs;
};

export let relateChangePanel = function( commandId, location ) {
    var ChangeObject = 'ChangeObject';
    var selection = appCtxService.ctx.selected;
    if( selection ) {
        var selectedObj = {
            selected: selection
        };
        appCtxService.registerCtx( ChangeObject, selectedObj );

    } else {
        appCtxService.unRegisterCtx( ChangeObject );
    }
    commandPanelService.activateCommandPanel( commandId, location );
};

export default exports = {
    removeEventChangeOperation,
    relateChangePanel
};
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member prgPlanningEventChangeService
 */
app.factory( 'prgPlanningEventChangeService', () => exports );

//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Saw1ScheduleMemberService
 */
import app from 'app';
import commandPanelService from 'js/commandPanel.service';
import appCtxService from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';

var exports = {};

/**
 * Method for invoking and registering/unregistering data for the addMember command panel
 * 
 * @param {String} commandId - Command Id for the Add Member command
 * @param {String} location - Location of the Add Member command
 * @param {Object} ctx - The Context object
 */

export let getAddMemberPanel = function( commandId, location, ctx ) {
    var jso = {};

    var schedule = 'schedule';

    var selection = ctx.selected;

    console.log("----------------------------------------------");
    console.log(ctx);
    console.log(selection);
    console.log("----------------------------------------------");
    if( selection ) {

        jso = {
            selectedObject: selection
        };
        console.log(jso);
        appCtxService.registerCtx( schedule, jso );

    } else {

        appCtxService.unRegisterCtx( schedule );

    }

    commandPanelService.activateCommandPanel( commandId, location );
};

export default exports = {
    getAddMemberPanel
};
/**
 * Service to display Shift Schedule panel.
 * 
 * @member Saw1ScheduleMemberService
 * @memberof NgServices
 */
app.factory( 'Saw1ScheduleMemberService', () => exports );

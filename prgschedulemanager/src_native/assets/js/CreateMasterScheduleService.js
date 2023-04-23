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
 * @module js/CreateMasterScheduleService
 */
import app from 'app';
import selectionService from 'js/selection.service';
import commandPanelService from 'js/commandPanel.service';
import appCtxService from 'js/appCtxService';

var exports = {};

export let openCreateMasterSchedulePanel = function( commandId, location ) {
    var selectedSchedules = 'selectedSchedules';

    var inputs = selectionService.getSelection().selected;

    if( inputs && inputs.length > 0 ) {
        appCtxService.registerCtx( selectedSchedules, inputs );

    } else {
        appCtxService.unRegisterCtx( selectedSchedules );
    }

    commandPanelService.activateCommandPanel( commandId, location );
};

export default exports = {
    openCreateMasterSchedulePanel
};
/**
 * Service for create master schedule panel.
 * 
 * @member CreateMasterScheduleService
 * @memberof NgServices
 */
app.factory( 'CreateMasterScheduleService', () => exports );

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
 * @module js/ShiftSchedulePanel
 */
import app from 'app';
import commandPanelService from 'js/commandPanel.service';
import selectionService from 'js/selection.service';
import appCtxService from 'js/appCtxService';

var exports = {};

export let getShiftSchedulePanel = function( commandId, location ) {
    var Scheduletag = 'Scheduletag';
    var selection = selectionService.getSelection().selected;
    var scheduleObject;
    var flag;
    var endDateSchedulingFlag;
    var nameOfSchedule;
    if( selection && selection.length > 0 ) {
        flag = selection[ 0 ].props.end_date_scheduling.dbValues[ 0 ];
        if( flag === "0" ) {
            endDateSchedulingFlag = false;
        } else {
            endDateSchedulingFlag = true;
        }
        nameOfSchedule = selection[ 0 ].props.object_name.dbValues[ 0 ];
        scheduleObject = {
            selected: selection[ 0 ],
            isEndDateScheduling: endDateSchedulingFlag,
            scheduleName: nameOfSchedule
        };
        appCtxService.registerCtx( Scheduletag, scheduleObject );
    } else {
        appCtxService.unRegisterCtx( Scheduletag );
    }
    commandPanelService.activateCommandPanel( commandId, location );
};

export default exports = {
    getShiftSchedulePanel
};
app.factory( 'ShiftSchedulePanel', () => exports );

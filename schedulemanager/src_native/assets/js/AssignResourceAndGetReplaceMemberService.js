// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * @module js/AssignResourceAndGetReplaceMemberService
 */
import app from 'app';
import selectionService from 'js/selection.service';
import commandPanelService from 'js/commandPanel.service';
import appCtxService from 'js/appCtxService';
import soa_kernel_clientDataModel from 'soa/kernel/clientDataModel';

var exports = {};

export let getAssignResourcePanel = function( commandId, location ) {
    var schedule = 'schedule';

    var selection = selectionService.getSelection().selected;

    if( selection && selection.length > 0 ) {
        var parent = selectionService.getSelection().parent;

        var scheduleObj = {
            selectedObject: selection,
            scheduleTag: parent
        };

        appCtxService.registerCtx( schedule, scheduleObj );
    } else {
        appCtxService.unRegisterCtx( schedule );
    }

    commandPanelService.activateCommandPanel( commandId, location );
};

export let getReplaceMemberPanel = function( commandId, location ) {
    var schedule = 'schedule';
    var selection = selectionService.getSelection().selected;
    if( selection && selection.length > 0 ) {
        var parent = selectionService.getSelection().parent;
        var jso;
        jso = {
            ScheduleMember: selection[ 0 ],
            selectedObject: parent
        };
        appCtxService.registerCtx( schedule, jso );
    } else {
        appCtxService.unRegisterCtx( schedule );
    }
    commandPanelService.activateCommandPanel( commandId, location );
};

export let getDesignateDisciplineToMembersPanel = function( commandId, location ) {
    var designateDiscInfo = 'designateDiscInfo';
    var selection = selectionService.getSelection().selected;
    if( selection && selection.length > 0 ) {
        var parent = selectionService.getSelection().parent;
        var jso;
        var disciplineObj = soa_kernel_clientDataModel.getObject( selection[ 0 ].props.resource_tag.dbValues[ 0 ] );
        jso = {
            disciplineObj: disciplineObj,
            scheduleObj: parent
        };
        appCtxService.registerCtx( designateDiscInfo, jso );
    } else {
        appCtxService.unRegisterCtx( designateDiscInfo );
    }
    commandPanelService.activateCommandPanel( commandId, location );
};

export let getUser = function() {
    var selection = selectionService.getSelection().selected;
    var userObj;
    if( selection && selection.length > 0 ) {
        userObj = soa_kernel_clientDataModel.getObject( selection[ 0 ].props.resource_tag.dbValues[ 0 ] );
    }
    return userObj;
};

exports = {
    getAssignResourcePanel,
    getReplaceMemberPanel,
    getDesignateDisciplineToMembersPanel,
    getUser
};

export default exports;
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member AssignResourceAndGetReplaceMemberService
 */
app.factory( 'AssignResourceAndGetReplaceMemberService', () => exports );

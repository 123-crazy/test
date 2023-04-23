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
 * Module to provide the context menu service for SM Gantt.
 *
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/SMGantt/ganttContextMenuService
 */
import app from 'app';
import AwTimeoutService from 'js/awTimeoutService';
import popupSvc from 'js/popupService';
import ngModule from 'angular';
import $ from 'jquery';
import ganttManager from 'js/uiGanttManager';
import splmTableNative from 'js/splmTableNative';

var service = {};

var createContextMenu = function createContextMenu() {
    var html = '<aw-popup-command-bar anchor="saw1_ganttContextMenu" own-popup="false" close-on-click="true" ></aw-popup-command-bar>';
    var cellScope = {};
    cellScope.contextAnchor = 'aw_contextMenu2';
    return splmTableNative.util.createNgElement( html, "", cellScope );
};

/**
 * Opens a pop-up(context) menu at the right-click location.
 *
 * @param {Event} event - the right click event
 * @param $scope {Object} - Directive scope
 */
export let showContextMenu = function( event, $scope ) {

    if( !event.target || event.which !== 3 /*hold and press touch event*/ ) {
        return;
    }

    var taskId = ganttManager.getGanttInstance().locate( event );

    if( !taskId || !ganttManager.getGanttInstance().getTask( taskId ) ) {
        return;
    }

    popupSvc.show( {
        domElement: createContextMenu(),
        context: $scope,
        options: {
            whenParentScrolls: 'close',
            targetEvent: event
        }
    } );
};

export default service = {
    showContextMenu
};
/**
 * The factory to create the context menu service for SM Gantt.
 *
 * @member ganttContextMenuService
 * @memberof NgServices
 */
app.factory( 'ganttContextMenuService', () => service );

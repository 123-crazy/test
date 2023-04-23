// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/*jshint -W061 */

/**
 * @module js/Arm0PopupMenuPanel
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import ngModule from 'angular';

var exports = {};

var _actionList = null;

/**
 * Handle the  popup menu click event
 *@param {Object} selectedObject - Selected pop up menu item
 */
export let handleCommandSelection = function( selectedObject ) {
    var row = selectedObject.selectedRow;
    eventBus.publish( row.eventName );
};

/**
 * Method to update the options. If nothing is copied thrn only show Cut and Copy else
 * show paste options as well
 * @param {Object} data - the data object of view model
 */
export let updateOptions = function( data ) {
    appCtxService.ctx.Arm0ShowActionPanelVisible = true;
    data.actionItems.dbValue = _actionList;
    var requiredHeight;
    requiredHeight = 40 * data.actionItems.dbValue.length + 'px';

    var panelId = 'Arm0PopupMenuPanelBalloonPopup';
    var actionsBalloonPopup = $( 'body' ).find( 'aw-balloon-popup-panel#' + panelId );
    if( actionsBalloonPopup && actionsBalloonPopup.length > 0 ) {
        var popupLayoutEle = actionsBalloonPopup.find( '.aw-layout-popup' );
        popupLayoutEle[ 0 ].style.height = requiredHeight;
        var panelScrollBody = $( actionsBalloonPopup.find( 'div.aw-base-scrollPanel.ng-scope' )[ 0 ] );
        panelScrollBody.attr( 'style', 'min-height:' + requiredHeight );
        panelScrollBody.attr( 'style', 'height:' + requiredHeight );
        var popupElemScope = ngModule.element( actionsBalloonPopup ).scope();
        popupElemScope.setMaxHeight();
    }
};

/**
 * Refresh menu item list
 * @param {Object} data - view model object data
 */
export let updateActionList = function( data ) {
    data.actionItems.dbValue = data.eventData.actionItems.dbValue;
    eventBus.publish( 'requirementDocumentation.refreshOptions' );
};

/**
 * Close instance of aw-balloon-popup created to show type actions
 */
export let closeExistingBalloonPopup = function() {
    appCtxService.ctx.Arm0ShowActionPanelVisible = false;
    var panelId = 'Arm0PopupMenuPanelBalloonPopup';
    var actionsBalloonPopup = $( 'body' ).find( 'aw-balloon-popup-panel#' + panelId );
    if( actionsBalloonPopup && actionsBalloonPopup.length > 0 ) {
        var popupElemScope = ngModule.element( actionsBalloonPopup ).scope();

        var eventData = {
            popupId: actionsBalloonPopup[ 0 ].id
        };
        eventBus.publish( 'balloonPopup.Close', eventData );
        popupElemScope.$broadcast( 'awPopupWidget.close', eventData );
        actionsBalloonPopup.detach();
    }
};

/**
 * Register context for show type actions
 * @param {Object} data - view model object data
 */
export let registerCxtForActionsPanel = function( data ) {
    exports.closeExistingBalloonPopup();
    data.selectedObjectUid = [];
    data.selectedObjectUid.push( data.eventData.sourceObject[0].uid );
    _actionList = data.actionItems.dbValue;
    eventBus.publish( 'requirementDocumentation.showActionsPanel', data.eventData );
};

export let getActionMenuForMoveCommands = function( data ) {
    var baseUrl = app.getBaseUrlPath();
    return [
        {
            displayName: data.i18n.moveUpCommandTitle,
            internalName: 'Move Up',
            eventName : 'Arm0HTMLSpecTemplateEditAndPreview.MoveUp',
            iconURL : baseUrl + '/image/cmdMoveUp24.svg'
        },
        {
            displayName: data.i18n.moveDownCommandTitle,
            internalName: 'Move Down',
            eventName : 'Arm0HTMLSpecTemplateEditAndPreview.MoveDown',
            iconURL : baseUrl + '/image/cmdMoveDown24.svg'
        },
        {
            displayName: data.i18n.promoteCommandTitle,
            internalName: 'Promote',
            eventName : 'Arm0HTMLSpecTemplateEditAndPreview.Promote',
            iconURL : baseUrl + '/image/cmdPromote24.svg'
        },
        {
            displayName: data.i18n.demoteCommandTitle,
            internalName: 'Demote',
            eventName : 'Arm0HTMLSpecTemplateEditAndPreview.Demote',
            iconURL : baseUrl + '/image/cmdDemote24.svg'
        }
    ];
};

export default exports = {
    handleCommandSelection,
    updateOptions,
    updateActionList,
    closeExistingBalloonPopup,
    registerCxtForActionsPanel,
    getActionMenuForMoveCommands
};
/**
 * @memberof NgServices
 */
app.factory( 'Arm0PopupMenuPanel', () => exports );

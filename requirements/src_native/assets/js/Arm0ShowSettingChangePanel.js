// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * @module js/Arm0ShowSettingChangePanel
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import ngModule from 'angular';

var exports = {};

/**
 * To show on load options on click of setting icon
 * @param {Object} data - the data object of view model
 */
export let updateOptionsOnLoad = function( data ) {
    appCtxService.ctx.Arm0ShowSettingChangePanelVisible = true;
    var requiredHeight = 'auto';
    var panelId = 'Arm0ShowSettingChangePanelBalloonPopup';
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
 * Gets the setting change and fires the event to
 *@param {Object} selectedObject - selected row
 */
export let handleCommandSelection = function( selectedObject ) {
    var row = selectedObject.selectedRow;
    if( row.internalName === 'Revise' || row.internalName === 'Update' || row.internalName === 'Delete' || row.internalName === 'Add' || row.internalName === 'NoChange' || row.internalName === 'AcceptUpdate' ) {
        var eventData = {
            sourceObject: row
        };
        eventBus.publish( 'importpreview.updateSetting', eventData );
    }
};

/**
 * Returns the selected object
 *
 * @return {Object} selected object
 */
export let getSelectedObject = function() {
    var uid = appCtxService.getCtx( 'selectedRequirementObjectUID' );
    return cdm.getObject( uid );
};

/**
 * Close instance of aw-balloon-popup created to show setting actions
 */
export let closeExistingBalloonPopup = function() {
    appCtxService.ctx.Arm0ShowActionPanelVisible = false;
    var actionsBalloonPopup = $( 'body' ).find( 'aw-popup-panel2' );
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

export let updateHeight = function( data ) {
    var size = data.actionItems.dbValue.length;
    var actionsBalloonPopup = document.getElementsByClassName( 'aw-popup-balloon' );
    if( actionsBalloonPopup && actionsBalloonPopup.length > 0 ) {
        var popupLayoutEle = actionsBalloonPopup[0];
        var scrollPanel = popupLayoutEle.getElementsByClassName( 'aw-base-scrollPanel' );
        if( scrollPanel && scrollPanel.length > 0 ) {
            if( size === 1 ) {
            scrollPanel[0].style.height = 81 + 'px';
            popupLayoutEle.style.height = '100px';
            } else{
                scrollPanel[0].style.height = 60 * size + 'px';
                popupLayoutEle.style.height = 60 * size + 20 + 'px';
            }
        }
    }
};

export default exports = {
    updateOptionsOnLoad,
    handleCommandSelection,
    getSelectedObject,
    closeExistingBalloonPopup,
    updateHeight
};
/**
 * @memberof NgServices
 */
app.factory( 'Arm0ShowSettingChangePanel', () => exports );

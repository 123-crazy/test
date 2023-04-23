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
 * @module js/Arm0ShowBalloonPopupPanelView
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import ngModule from 'angular';
import { DOMAPIs as dom } from 'js/domUtils';

var exports = {};
var eventData = {};

/**
 * Method to update the options. 
 * 
 * @param {Object} data - the data object of view model
 */
export let updateOptions = function( data ) {
    data.actionItems.dbValue = eventData.actionItemList;
    appCtxService.ctx.Arm0ShowActionPanelVisible = true;
    var requiredHeight = data.actionItems.dbValue.length * 32;
    var panelId = 'Arm0ShowActionsPanelBalloonPopup';
    var actionsBalloonPopup = $( 'body' ).find( 'aw-balloon-popup-panel#' + panelId );
    if ( actionsBalloonPopup && actionsBalloonPopup.length > 0 ) {
        var popupLayoutEle = actionsBalloonPopup.find( '.aw-layout-popup' );
        popupLayoutEle[0].style.height = requiredHeight + 'px';
        var panelScrollBody = $( actionsBalloonPopup.find( 'div.aw-base-scrollPanel.ng-scope' )[0] );
        panelScrollBody.attr( 'style', 'min-height:' + requiredHeight + 'px' );
        panelScrollBody.attr( 'style', 'height:' + requiredHeight + 'px' );
        var popupElemScope = ngModule.element( actionsBalloonPopup ).scope();
        popupElemScope.setMaxHeight();
    }
};

/**
 * register context for show commands from on balloon popup
 */
export let registerCxtForBalloonPopup = function( data ) {
    //exports.closeExistingBalloonPopup();
    var balloonPopeventData = data.eventMap[ 'requirementDocumentation.registerCxtForBalloonPopup'];
    eventData = balloonPopeventData;
    eventBus.publish( 'requirementDocumentation.showBalloonPopupActionsPanel', balloonPopeventData );
};
/**
 * @param {Object} row - selected row from popup
 */
export let handleCommandSelection = function( selectedObject ) {
    var row = selectedObject.selectedRow;
    if( eventData.callback ) {
        eventData.callback( row.internalName );
    }
};

export default exports = {
    updateOptions,
    registerCxtForBalloonPopup,
    handleCommandSelection
};
/**
 * @memberof NgServices
 */
app.factory( 'Arm0ShowBalloonPopupPanelView', () => exports );

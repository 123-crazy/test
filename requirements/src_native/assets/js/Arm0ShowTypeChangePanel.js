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
 * @module js/Arm0ShowTypeChangePanel
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import rmTreeDataService from 'js/Arm0ImportPreviewJsonHandlerService';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import ngModule from 'angular';

var exports = {};

/**
 * Method to update the options. If nothing is copied thrn only show Cut and Copy else
 * show paste options as well
 * @param {Object} data - the data object of view model
 */
export let updateOptionsOnLoad = function( data ) {
    var allowedTypeList = [];
    appCtxService.ctx.Arm0ShowActionPanelVisible = true;
    var allowedTypes = rmTreeDataService.getAllowedTypesInfo();
    var allowedTypeObject = {};
    for( var index = 0; index < allowedTypes.length; index++ ) {
        var objectElements = allowedTypes[ index ];
        allowedTypeObject = {
            displayName: objectElements.displayTypeName,
            internalName: objectElements.typeName,
            typeIconURL: objectElements.typeIconURL
        };
        allowedTypeList.push( allowedTypeObject );
    }

    data.allowedTypesInfo = allowedTypeList;

    var requiredHeight = 'auto';
    var panelId = 'Arm0ShowTypeChangePanelBalloonPopup';
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
 *@param {Object} selectedObject - selected row
 */
export let handleCommandSelection = function( selectedObject ) {
    var row = selectedObject.selectedRow;
    var eventData = {
        sourceObject: row
    };
    eventBus.publish( 'importPreview.changeTypeEvent', eventData );
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
 * Close instance of aw-balloon-popup created to show type actions
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

export default exports = {
    updateOptionsOnLoad,
    handleCommandSelection,
    getSelectedObject,
    closeExistingBalloonPopup
};
/**
 * @memberof NgServices
 */
app.factory( 'Arm0ShowTypeChangePanel', () => exports );

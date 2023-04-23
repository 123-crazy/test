// @<COPYRIGHT>@
// ==================================================
// Copyright 2016.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */
/**
 * This provides functionality related to traceability matrix to replace the structure after matrix gets generated
 * @module js/Arm0PasteCrossReferenceLinkPopup
 */

import app from 'app';
import ckeditorOperations from 'js/ckeditorOperations';
import appCtxSvc from 'js/appCtxService';
import ClipboardService from 'js/clipboardService';
import requirementsUtils from 'js/requirementsUtils';
import iconService from 'js/iconService';
import eventBus from 'js/eventBus';

var exports = {};

var _data = null;

/**
 * Method to initialize the view model properties of popup
 * @param {Object} data - the viewmodel data for this panel
 */
export let initPopup = function( data ) {
    _data = data;
    _data.canShowCustomTextBox = false;
    var crossRefLinkData = JSON.parse( localStorage.getItem( 'rmCrossRefLinkClipboard' ) );
    if( crossRefLinkData ) {
        data.pasteOptionsItems.dbValue[ 0 ].displayName = crossRefLinkData.paraNum + ' : ' + crossRefLinkData.name;
        data.pasteOptionsItems.dbValue[ 2 ].displayName = crossRefLinkData.paraNum + ' : ' + crossRefLinkData.name;
        data.pasteOptionsItems.dbValue[ 1 ].displayName = crossRefLinkData.paraNum + ' ' + crossRefLinkData.id + ' ' + crossRefLinkData.name;
        data.pasteOptionsItems.dbValue[ 3 ].displayName = crossRefLinkData.paraNum + ' ' + crossRefLinkData.id + ' ' + crossRefLinkData.name;
        data.pasteOptionsItems.dbValue[ 2 ].iconURL = iconService.getTypeIconURL( crossRefLinkData.type );
        data.pasteOptionsItems.dbValue[ 3 ].iconURL = iconService.getTypeIconURL( crossRefLinkData.type );
        data.pasteOptionsItems.dbValue[ 2 ].type = crossRefLinkData.type;
        data.pasteOptionsItems.dbValue[ 3 ].type = crossRefLinkData.type;
        eventBus.publish( 'pasteCrossReferenceLinkPopup.refreshPasteOptionsItems' );

        // Initialize selected data with first option
        data.selectedObject = {
            displayName: crossRefLinkData.paraNum + ' : ' + crossRefLinkData.name
        };
    }

    data.handlePasteCrossRefSelection = handlePasteCrossRefSelection;
};

export let handlePasteCrossRefSelection = function( selectedRow ) {
    if( selectedRow.displayName === 'Custom' ) {
        _data.canShowCustomTextBox = true;
    } else {
        _data.canShowCustomTextBox = false;
    }
    _data.selectedObject = selectedRow;
};

/**
 * Method to decide whether to show cross refeprece link popup or not.
 */
export let canShowPasteCrossRefLinkPopup = function() {
    var modelObjects = ClipboardService.instance.getContents();
    var crossRefLinkObject = JSON.parse( localStorage.getItem( 'rmCrossRefLinkClipboard' ) );
    for( var i = 0; i < modelObjects.length; i++ ) {
        if( modelObjects[ i ].props ) {
            if( !modelObjects[ i ].props.awb0UnderlyingObject ) {
                var cellProp = [ 'awb0UnderlyingObject' ];
                var arrModelObjs = [ modelObjects[ i ] ];
                requirementsUtils.loadModelObjects( arrModelObjs[ 0 ], cellProp ).then( function() {
                    self.showPopup( modelObjects[ i ], crossRefLinkObject.revID );
                } );
            } else {
                self.showPopup( modelObjects[ i ], crossRefLinkObject.revID );
                break;
            }
        }
    }
};

/**
 * Method to fire event to show cross reference link popup.
 * @param {Object} modelObject The model object copied for cross reference.
 * @param {String} revID The revision id of the object.
 */
self.showPopup = function( modelObject, revID ) {
    if( modelObject.props && modelObject.props.awb0UnderlyingObject.dbValues[ 0 ] === revID ) {
        eventBus.publish( 'requirementDocumentation.showPasteCrossReferenceLinkPopup' );
    }
};

/**
 * Method to fire event to show cross reference link popup.
 */
export let closePopupWindow = function() {
    eventBus.publish( 'awPopup.close' );
};

/**
 * Method to paste cross reference link in ckeditor
 * @param {Object} data The data object of view model
 */
export let pasteCrossRefLink = function( data ) {
    var linkDisplayValue = null;
    var iconURL = null;
    if( data.selectedObject.displayName === 'Custom' ) {
        linkDisplayValue = data.customTextBox.dbValue;
    } else {
        if( data.selectedObject.iconURL ) {
            iconURL = data.selectedObject.iconURL;
        }
        linkDisplayValue = data.selectedObject.displayName;
    }
    var crossRefLinkData = JSON.parse( localStorage.getItem( 'rmCrossRefLinkClipboard' ) );
    ckeditorOperations.insertCrossReferenceLink( appCtxSvc.ctx.AWRequirementsEditor.id, crossRefLinkData.occID, crossRefLinkData.revID, linkDisplayValue, iconURL, appCtxSvc.ctx );
    localStorage.removeItem( 'rmCrossRefLinkClipboard' );
};

/**
 * Method to fire event to initialize the view model properties of popup
 */
export let callInitPasteCrossRefLinkPopup = function() {
    eventBus.publish( 'pasteCrossReferenceLinkPopup.afterReveal' );
};

export default exports = {
    initPopup,
    handlePasteCrossRefSelection,
    canShowPasteCrossRefLinkPopup,
    closePopupWindow,
    pasteCrossRefLink,
    callInitPasteCrossRefLinkPopup
};
app.factory( 'Arm0PasteCrossReferenceLinkPopup', () => exports );

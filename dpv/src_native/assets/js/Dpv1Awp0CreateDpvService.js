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
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 * 
 * @module js/Dpv1Awp0CreateDpvService
 */
import app from 'app';
import eventBus from 'js/eventBus';

var exports = {};
var oldselected;
/**
 * Add the subpanel to the existing panel.
 * 
 * @param {String} data - The view model data
 * 
 */
export let displayCriteriaPanel = function( data ) {
    if( data ) {
        var selectedObject = data.dataProviders.awTypeSelector.selectedObjects[ 0 ];
        //dataprovider dbValue

        if( !selectedObject ) {
            return;
        }
        oldselected = selectedObject;

        var source_Name = selectedObject.props.type_name.displayValues[ 0 ];
        var destPanelId = "Dpv1Awb0ApplyRuleSetTcRA";
        if( source_Name !== "TcRA" ) {
            destPanelId = "Dpv1Awp0CreateDpvSub";

        }

        //set contextChanged for the active view to reset the subsequent panels to pristine
        var activePanel = data.getSubPanel( data.activeView );
        if( activePanel ) {
            activePanel.contextChanged = true;
        }

        var context = {
            destPanelId: destPanelId,
            title: selectedObject.props.type_name.displayValues[ 0 ]
        };

        if( oldselected !== selectedObject ) {
            context.recreatePanel = true;
        }
        eventBus.publish( "awPanel.navigate", context );

        //Clear our any data on the textbox
        if( data.saveToDataSet ) {
            data.saveToDataSet.dbValue = null;
        }

    }
};

export default exports = {
    displayCriteriaPanel
};
/**
 * TODO
 * 
 * @member Dpv1Awp0CreateDpvService
 * @memberof NgServices
 */
app.factory( 'Dpv1Awp0CreateDpvService', () => exports );

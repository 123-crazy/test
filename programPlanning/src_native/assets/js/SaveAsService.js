//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/SaveAsService
 */
import app from 'app';
import commandPanelService from 'js/commandPanel.service';
import selectionService from 'js/selection.service';
import appCtxService from 'js/appCtxService';

var exports = {};

/**
 * Method for invoking and registering/unregistering data for the Save As command panel
 * 
 * @param {String} commandId - Command Id for the Save As command
 * @param {String} location - Location of the Save As command
 */
export let getSaveAsPanel = function( commandId, location ) {

    var selection = selectionService.getSelection().selected;
    if( selection && selection.length > 0 ) {
        var jso = {
            "selectedobject": selection
        };
        appCtxService.registerCtx( 'SaveAsContext', jso );

    } else {
        appCtxService.unRegisterCtx( 'SaveAsContext' );
    }
    commandPanelService.activateCommandPanel( commandId, location );
};

export default exports = {
    getSaveAsPanel
};
/**
 * Program Planning save as command Panel Service utility
 * 
 * @memberof NgServices
 * @member saveAsService
 */
app.factory( 'SaveAsService', () => exports );

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
 * @module js/startEditGroupCommandService
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';
import editHandlerService from 'js/editHandlerService';
import _ from 'lodash';

let exports = {};

/**
 * execute the start edit command handler
 * 
 * @param {String} handler context
 */
export let execute = function( handler, viewModeContext ) {
    // this is required to let save edit know which handler is active.
    if( !handler ) {
        handler = ( viewModeContext === "TableView" || viewModeContext === "TreeView" ) ? "TABLE_CONTEXT" :
            "NONE";

    }
    editHandlerService.setActiveEditHandlerContext( handler );

    if( !editHandlerService.isEditEnabled() ) {
        var editHandler = editHandlerService.getEditHandler( handler );
        if( editHandler.canStartEdit() && !editHandler.editInProgress() ) {
            editHandler.startEdit();
        }
    }
};

export default exports = {
    execute
};
/**
 * start edit command Service
 * 
 * @memberof NgServices
 */
app.factory( 'startEditGroupCommandService', () => exports );

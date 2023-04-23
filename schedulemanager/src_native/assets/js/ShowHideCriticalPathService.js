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
 * @module js/ShowHideCriticalPathService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';

var exports = {};

/**
 * Get the selection for toggle command
 * 
 * @return the selection state for command
 */
export let getToggleCommandSelectionForShowHideCriticalPath = function( prefVals ) {
    var prefVal = prefVals.SM_View_CriticalPath[ 0 ];
    var colorValue = false;
    var isCommandfHighlighted = "false";
    var falseStr = "False";
    // to check false case insensitive 
    if( prefVal.toUpperCase() === falseStr.toUpperCase() ) {
        isCommandfHighlighted = "true";
        colorValue = true;
    }
    appCtxService.updatePartialCtx( "decoratorToggle", colorValue );
    var ctx = appCtxService.getCtx( "searchResponseInfo" );
    if( ctx ) {
        ctx.searchColorToggle = colorValue;
        appCtxService.updateCtx( "searchResponseInfo", ctx );
    }
    //update data section with latest value
    prefVals.SM_View_CriticalPath[ 0 ] = isCommandfHighlighted;
    return isCommandfHighlighted;
};

export default exports = {
    getToggleCommandSelectionForShowHideCriticalPath
};
/**
 * Service for Show Hide Critical Path.
 * 
 * @member ShowHideCriticalPathService
 * @memberof NgServices
 */
app.factory( 'ShowHideCriticalPathService', () => exports );

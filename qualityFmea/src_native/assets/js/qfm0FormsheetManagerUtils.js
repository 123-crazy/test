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

/**
 * This file is used as utils file for reloading and refreshing Formsheet View
 *
 * @module js/qfm0FormsheetManagerUtils
 */

import app from 'app';
import appCtxService from 'js/appCtxService';
import infragisticsLob from 'infragisticsLob';
import qfm0FormsheetService from 'js/qfm0FormsheetService';

var exports = {};
var formsheetContext = 'formsheetContext'; 

export let reloadFormsheet = function( addElementInput, formsheetColIdx ) {
    qfm0FormsheetService.assureCSSInitialization();
    qfm0FormsheetService.getFormsheetData( null, addElementInput, formsheetColIdx );
};

export default exports = {
    reloadFormsheet
};

app.factory( 'qfm0FormsheetManagerUtils', () => exports );

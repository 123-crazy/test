// @<COPYRIGHT>@
// ===========================================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ===========================================================================
// @<COPYRIGHT>@

/* global
 */

/**
 * A service that has implementation for the import of the Awp0SearchFolder and its hierarchy
 *
 * @module js/Awp0SearchFolderImportService
 */

import * as app from 'app';
import browserUtils from 'js/browserUtils';

/**
 * Populate the fields on import panel.
 *
 * @param  {Object} data - viewModel
 *
 */
export let populateImportSearchFolderPanel = function( data ) {
    // Create Fms Upload URL
    data.fmsUploadUrl = browserUtils.getBaseURL() + 'fms/fmsupload/';
};

/* eslint-disable-next-line valid-jsdoc*/
const exports = {
    populateImportSearchFolderPanel
};

export default exports;

/**
 * Register the service
 *
 * @memberof NgServices
 * @member Awp0SearchFolderImportService
 *
 *@return {*} exports
 */
app.factory( 'Awp0SearchFolderImportService', () => exports );

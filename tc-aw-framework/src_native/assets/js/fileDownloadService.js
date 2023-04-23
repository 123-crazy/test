// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/fileDownloadService
 */
import * as app from 'app';

var exports = {};

/**
 * Prepare download file message
 * @param {OBJECT} data - declarative ViewModel Information
 * @param {String} textMsgParamForImanFileObj  - file name derived from ImanFile object
 * @param {String} textMsgParamForDatasetObj  - file name derived from Dataset object
 * @return {String } finalMessage - Final message to be displayed in the sublocation view
 */
export let prepareMessageBeforeDownload = function( data, textMsgParamForImanFileObj, textMsgParamForDatasetObj ) {
    var finalMessage = null;
    if( textMsgParamForImanFileObj !== undefined ) {
        finalMessage = data.i18n.fileDownloadRetryMessage.replace( '{0}', textMsgParamForImanFileObj );
    }
    if( textMsgParamForDatasetObj !== undefined ) {
        finalMessage = data.i18n.fileDownloadRetryMessage.replace( '{0}', textMsgParamForDatasetObj );
    }
    return finalMessage;
};

export default exports = {
    prepareMessageBeforeDownload
};
/**
 * file download utility
 *
 * @memberof NgServices
 * @member fileDownloadService
 */
app.factory( 'fileDownloadService', () => exports );

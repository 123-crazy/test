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
 * This provides functionality related to Word Round-trip: Import the word
 * @module js/Arm0ImportChangesInWordRoundTrip
 */

import app from 'app';
import browserUtils from 'js/browserUtils';

var exports = {};

var microServiceURLString = 'tc/micro/REQIMPORT/v1/api/import/importdocument';

/**
 * Returns the input for the microservice call
 *
 * @param {Object} data - The view model data
 * @param {Object} ctx - the Context Object
 * @return {Array} inputs of the microservice call
 */
export let getImportWordDocumentInput = function( data, ctx ) {
    var options = [];
    if( data.overwriteConflict.dbValue ) {
        var option = {
            option: 'OverwriteConflicts',
            val: 'true'
        };
        options.push( option );
    }

    var inputs = [ {
        selectedObject: ctx.selected,
        transientFileWriteTicket: data.importData,
        applicationFormat: 'RoundTripImport',
        createSpecElementType: 'Alenia.docx',
        specificationType: '',
        isLive: false,
        isRunInBackground: false,
        isPermanentconvertToHtml: '',
        importAsSpec: '',
        pasteTopSpecRevisionUnderSelection: true,
        specDesc: '',
        keywordImportRules: [],
        importOptions: options
    } ];
    return inputs;
};

/**
 * Returns the url for the microservice call
 *
 * @param {Object} data - The view model data
 * @param {Object} ctx - the Context Object
 * @return {String} dbValue of the selected type
 */
export let getMicroServiceURL = function( data, ctx ) {
    var url = browserUtils.getBaseURL() + microServiceURLString;
    data.toplineID = ctx.occmgmtContext.topElement.uid;
    data.toplineRevID = ctx.occmgmtContext.topElement.props.awb0UnderlyingObject.dbValues[ 0 ];
    data.includeComments = data.importComments.dbValue;
    return url;
};
export let getOccurrenceId = function( updatedRevIds ) {
    var div = [];
    var objects =[];
        for(var i=0; i<updatedRevIds.length; i++)
        {
          div[i]= document.querySelector( 'div[revisionId="' + updatedRevIds[i]  + '"]' );
        if(div[i]!==null){
            objects.push({
            uid:div[i].id});
        }
    }   
        return objects;
 };

export default exports = {
    getImportWordDocumentInput,
    getMicroServiceURL,
    getOccurrenceId
};
app.factory( 'Arm0ImportChangesInWordRoundTrip', () => exports );

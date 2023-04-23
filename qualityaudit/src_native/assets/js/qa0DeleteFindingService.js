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

 * @module js/qa0DeleteFindingService
 */

import * as app from 'app';
import 'jquery';

var exports = {};


/**
* This function will create the SOA input for deleteRelations for removing findings.
* @param {Object} auditObject Audit object, that contains the findings
* @param {String} relation name of the audit finding relation
* @param {Array} selectedFindings Array of selected audit findings to be removed
* @return {Array} Returns inputData array for deleteRelations service
*/
export let createDeleteFindingsInput = function( auditObject, relation, selectedFindings ) {
    var inputData = {};
    var soaInput = [];
    if ( auditObject && selectedFindings && selectedFindings.length > 0 ) {
        selectedFindings.forEach( function( selectedObj ) {
            inputData = {
                clientId: 'AWClient',
                primaryObject: selectedObj,
                relationType: relation,
                secondaryObject: auditObject,
                userData: { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' }
            };
            soaInput.push( inputData );
        } );
    }
    return soaInput;
};

export default exports = {
    createDeleteFindingsInput
};

app.factory( 'qa0DeleteFindingService', () => exports );


/* eslint-disable max-lines */
// @<COPYRIGHT>@
// ==================================================
// Copyright 2022.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Module for the Import Excel
 *
 * @module js/Arm0ImportFromExcel
 */
 import app from 'app';


 var exports = {};

export let importOptions = function( data ) {
    var importOptions = [];
    importOptions.push( 'RoundTripImport' );
    if ( data.conflict.dbValue ) {
        importOptions.push( 'overWrite' );
    }
    return importOptions;
};


export default exports = {
    importOptions
};
/**
 * Arm0ImportFromExcel panel service utility
 *
 * @memberof NgServices
 * @member Arm0ImportFromExcel
 */
app.factory( 'Arm0ImportFromExcel', () => exports );

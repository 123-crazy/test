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
 * @module js/occurenceManagementEditService
 */
import app from 'app';
import soaSvc from 'soa/kernel/soaService';

var exports = {};

/**
 * Remove an occurrence.
 * 
 * @param {removeElementsFromProductInputData} inputs - Object of removeElementsFromProductInputData type
 */
export let removeElementsFromProduct = function( inputs ) {
    soaSvc.post( "Internal-ActiveWorkspaceBom-2012-10-OccurrenceManagement", "removeElementsFromProduct",
        inputs );

};
/**
 * occuremceManagementEditService service utility
 */

export default exports = {
    removeElementsFromProduct
};
app.factory( 'occurenceManagementEditService', () => exports );

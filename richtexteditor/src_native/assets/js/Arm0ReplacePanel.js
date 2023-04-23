// @<COPYRIGHT>@
// ==================================================
// Copyright 2016.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */
/**
 * This provides functionality related to traceability matrix to replace the structure after matrix gets generated
 * @module js/Arm0ReplacePanel
 */

import app from 'app';

var exports = {};

/**
 * Set the selected objects on search panel.
 * @param {Object} data - the viewmodel data for this panel
 * @param {Object} selectedObjects - selected objects on search results
 */
export let handleSearchSelection = function( data, selectedObjects ) {
    if( selectedObjects.length > 0 ) {
        data.selectedObject = selectedObjects[ 0 ];
    } else {
        data.selectedObject = undefined;
    }
};

export default exports = {
    handleSearchSelection
};
app.factory( 'Arm0ReplacePanel', () => exports );

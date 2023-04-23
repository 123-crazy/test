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
 * @module js/setPreferenceService
 */
import app from 'app';
import soaSvc from 'soa/kernel/soaService';

var exports = {};

/**
 * Set preference.
 * 
 * @param {setPreferencesAtLocations} inputs - Object of setPreferencesAtLocations type
 */
export let setPreferencesAtLocations = function( inputs ) {
    soaSvc.post( "Administration-2012-09-PreferenceManagement", "setPreferencesAtLocations", inputs );

};

/**
 * Set preference.
 * 
 * @param {setPreferencesAtLocations} inputs - Object of setPreferencesAtLocations type
 */
export let setPreferencesDefinition = function( inputs ) {
    soaSvc.post( "Administration-2012-09-PreferenceManagement", "setPreferencesDefinition", inputs );

};

/**
 * setPreferenceService service utility
 */

export default exports = {
    setPreferencesAtLocations,
    setPreferencesDefinition
};
app.factory( 'setPreferenceService', () => exports );

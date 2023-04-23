// Copyright (c) 2020 Siemens

/**
 * This module provides propApi service in native.
 *
 * @module js/propAPIService
 */

import app from 'app';

var exports = {};

/**
 * Create the propapi object and native methods on the propapi object
 *
 * @param {propertyOverlay} object - Property Overlay object
 */

export let createPropAPI = function( propertyOverLay ) {
    if( !propertyOverLay.propApi ) {
        propertyOverLay.propApi = {};
    }

    /*
     * once the native LOVService will be available , remove the comment propertyOverLay.propApi.setLOVValueProvider =
     * function() { _uwPropertySvc.setHasLov( eventdata.propOverlay, true ); if( !eventdata.propOverlay.lovApi ) {
     * _lovSvc.initNativeCellLovApi( eventdata.propOverlay, null, "create", null ); } };
     * propertyOverLay.propApi.setAutoAssignHandler = $entry( function() { // Hook for the autoAssigin handler });
     */
};

exports = {
    createPropAPI
};
export default exports;
app.factory( 'propAPIService', () => exports );

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
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 * 
 * @module js/Awp0AttachedLicense
 */
import app from 'app';
import _ from 'lodash';

var exports = {};

/**
 * Fetches all projects from the SOA and remove the projects which are already assigned , populate the available
 * project list with the remaining projects.
 * 
 * @param {object} response - the soa response
 * 
 * @return {Object} objs: Array of projects to populate the available project list count: Number of projects
 *         soaResult: Soa Response
 * 
 */
export let processAvailableLicenses = function( response ) {
    var availableLicense = [];

    _.forEach( response.modelObjects, function( modelObject ) {
        availableLicense.push( modelObject );

    } );

    return availableLicense;

};

export default exports = {
    processAvailableLicenses
};
/**
 * This service creates name value property
 * 
 * @memberof NgServices
 * @member Awp0AssignProjects
 */
app.factory( 'Awp0AttachedLicense', () => exports );

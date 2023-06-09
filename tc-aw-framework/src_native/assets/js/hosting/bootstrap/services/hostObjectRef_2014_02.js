// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */
/**
 * @module js/hosting/bootstrap/services/hostObjectRef_2014_02
 * @namespace hostObjectRef_2014_02
 */
import * as app from 'app';
import hostBaseRefSvc from 'js/hosting/hostBaseRefService';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Create new {InteropObjectRef_2014_02} based on the given info.
 *
 * @memberof hostObjectRef_2014_02
 *
 * @param {String} dbId - database Id.
 * @param {String} objId - unique object Id.
 * @param {String} objType - object type.
 *
 * @return {InteropObjectRef_2014_02} New instance initialized with given info.
 */
export let createObjectRef = function( dbId, objId, objType ) {
    return hostBaseRefSvc.createBasicObjectRef( dbId, objId, objType );
};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostObjectRef_2014_02
 */
export let registerHostingModule = function() {
    // Nothing to contribute (at this time)
};

export default exports = {
    createObjectRef,
    registerHostingModule
};
/**
 * Register service.
 *
 * @member hostObjectRef_2014_02
 * @memberof NgServices
 *
 * @param {hostBaseRefService} hostBaseRefSvc - Service to use.
 *
 * @returns {hostObjectRef_2014_02} Reference to this service's API object.
 */
app.factory( 'hostObjectRef_2014_02', () => exports );

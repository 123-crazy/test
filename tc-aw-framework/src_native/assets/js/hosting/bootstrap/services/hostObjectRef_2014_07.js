// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */
/**
 * @module js/hosting/bootstrap/services/hostObjectRef_2014_07
 * @namespace hostObjectRef_2014_07
 */
import * as app from 'app';

var exports = {};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostObjectRef_2014_07
 */
export let registerHostingModule = function() {
    // Nothing to contribute (at this time)
};

export default exports = {
    registerHostingModule
};
/**
 * Register service.
 *
 * @member hostObjectRef_2014_07
 * @memberof NgServices
 *
 * @returns {hostObjectRef_2014_07} Reference to this service's API object.
 */
app.factory( 'hostObjectRef_2014_07', () => exports );

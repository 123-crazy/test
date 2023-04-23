// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * @module js/hosting/inf/services/hostSelection_2014_07
 * @namespace hostSelection_2014_07
 */
import * as app from 'app';
import hostSelection_0 from 'js/hosting/inf/services/hostSelection_2014_02';
import hostServices from 'js/hosting/hostConst_Services';

// eslint-disable-next-line valid-jsdoc

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Create new client-side service.
 *
 * @memberof hostSelection_2014_07
 *
 * @returns {SelectionListenerSvc} New instance of the service API object.
 */
export let createSelectionListenerSvc = function() {
    var svc = hostSelection_0.createSelectionListenerSvc();

    svc.setVersion( hostServices.VERSION_2014_07 );

    return svc;
};

/**
 * Create new client-side message.
 *
 * @memberof hostSelection_2014_07
 *
 * @returns {SelectionMessage} New instance of the service message object.
 */
export let createSelectionMessage = function() {
    return hostSelection_0.createSelectionMessage();
};

/**
 * Create new client-side proxy.
 *
 * @memberof hostSelection_2014_07
 *
 * @returns {SelectionProviderProxy} New instance of the proxy API object.
 */
export let createSelectionProviderProxy = function() {
    var svc = hostSelection_0.createSelectionProviderProxy();

    svc.setVersion( hostServices.VERSION_2014_07 );

    return svc;
};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostSelection_2014_07
 */
export let registerHostingModule = function() {
    exports.createSelectionListenerSvc().register();
};

export default exports = {
    createSelectionListenerSvc,
    createSelectionMessage,
    createSelectionProviderProxy,
    registerHostingModule
};
/**
 * Register service.
 *
 * @member hostSelection_2014_07
 * @memberof NgServices
 */
app.factory( 'hostSelection_2014_07', () => exports );

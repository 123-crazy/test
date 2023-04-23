// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * @module js/hosting/sol/services/hostSearch_2014_02
 * @namespace hostSearch_2014_02
 */
import * as app from 'app';
import AwStateService from 'js/awStateService';
import AwRootScopeService from 'js/awRootScopeService';
import hostFactorySvc from 'js/hosting/hostFactoryService';
import _ from 'lodash';
import logger from 'js/logger';
import hostServices from 'js/hosting/hostConst_Services';

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// InitiateSearchSvc
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

/**
 *  Hosting service to display given page for identified object.
 *
 * @constructor
 * @memberof hostSearch_2014_02
 * @extends hostFactoryService.BaseCallableService
 */
var InitiateSearchSvc = function() {
    hostFactorySvc.getCallableService().call( this,
        hostServices.CS_INITIATE_SEARCH,
        hostServices.VERSION_2014_02 );
};

InitiateSearchSvc.prototype = hostFactorySvc.extendCallableService();

/**
 * This is an incoming call to this service trigger the related event handlers.
 *
 * @function handleIncomingEvent
 * @memberof hostSearch_2014_02.InitiateSearchSvc
 *
 * @param {String} jsondata - JSON encoded payload from the host.
 */
InitiateSearchSvc.prototype.handleIncomingEvent = function( jsondata ) {
    try {
        if( jsondata ) {
            var criteria = JSON.parse( jsondata );

            AwStateService.instance.go( 'teamcenter_search_search', {
                searchCriteria: criteria
            } );

            /**
             * Make sure we $digest these change soon.
             */
            AwRootScopeService.instance.$evalAsync();
        }
    } catch ( ex ) {
        logger.error( ex );
    }
};

// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------
// Public Functions
// -------------------------------------------------------------------------------
// -------------------------------------------------------------------------------

var exports = {};

/**
 * Create new client-side service.
 *
 * @memberof hostSearch_2014_02
 *
 * @returns {InitiateSearchSvc} New instance of the service message object.
 */
export let createInitiateSearchSvc = function() {
    return new InitiateSearchSvc();
};

/**
 * Register any client-side (CS) services (or other resources) contributed by this module.
 *
 * @memberof hostSearch_2014_02
 */
export let registerHostingModule = function() {
    exports.createInitiateSearchSvc().register();
};

export default exports = {
    createInitiateSearchSvc,
    registerHostingModule
};
app.factory( 'hostSearch_2014_02', () => exports );

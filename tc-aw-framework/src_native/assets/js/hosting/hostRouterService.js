// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global define
 */

/**
 * @module js/hosting/hostRouterService
 * @namespace hostRouterService
 */
import * as app from 'app';
import hostConfigKeys from 'js/hosting/hostConst_ConfigKeys';
import hostRouterSvc from 'js/hosting/sol/services/hostRouter_2020_01';
import hostConfigSvc from 'js/hosting/hostConfigService';
import AwRootScopeService from 'js/awRootScopeService';

/**
 * make a shallow copy of the object
 *
 * @member hostRouterService
 * @memberof NgServices
 *
 * @param {Object} object - object to be copied
 *
 * @returns {Object} a copy of the object's first set of properties
 */
function _shallowCopy( object ) {
    var copy = {};
    var key;

    for ( key in object ) {
        if ( typeof object[key] !==  'object' ) {
            copy[key] = object[key];
        }
    }
    return copy;
}

var exports = {};

/**
 * Finish initilization of this service now that hostign has started.
 *
 * @memberof hostSelectionService
 *
 */
export let initialize = () => {
    var $rootScope = AwRootScopeService.getService( '$rootScope' );

    $rootScope.$on( '$stateChangeStart', function( event, toState, toParams, fromState, fromParams, options ) {
        var fromStateShallow = _shallowCopy( fromState );
        var fromParamsShallow = _shallowCopy( fromParams );
        var toStateShallow = _shallowCopy( toState );
        var toParamsShallow = _shallowCopy( toParams );
        var optionsShallow = _shallowCopy( options );

        hostRouterSvc.createHostRouterProxy().sendURLChange( hostRouterSvc.createHostRouterMsg( fromStateShallow, fromParamsShallow, toStateShallow, toParamsShallow, optionsShallow ) );
        if( !hostConfigSvc.getOption( hostConfigKeys.ALLOW_CHANGE_LOCATION ) ) {
            if( !fromState.abstract ) {
                event.preventDefault();
            }
        }
    } );
};

app.factory( 'hostRouterService', () => exports );

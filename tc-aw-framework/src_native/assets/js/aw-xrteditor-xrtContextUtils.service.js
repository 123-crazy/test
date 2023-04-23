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
 * @module js/aw-xrteditor-xrtContextUtils.service
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import notifySvc from 'js/messagingService';

/**
 * @private
 */
var _serviceModel = {
    xrtContext: {},
    ctxParts: []
};

var exports = {};

/**
 */
export let setContext = function() {
    /**
     * Extract context parts
     */
    _serviceModel.ctxParts.push( {
        type: 'application'
    } );
};

/**
 *
 */
export let getXrtData = function( params ) {
    var deferred = AwPromiseService.instance.defer();
    var missingMsg = '';
    var noParams = false;

    if( !params.prefLocation && !params.client && !params.objectType && !params.xrtType ) {
        noParams = true;
    }

    if( !noParams ) {
        if( !params.prefLocation ) {
            missingMsg += 'prefLocation ';
        }

        if( !params.client ) {
            missingMsg += 'client ';
        }

        if( !params.objectType ) {
            missingMsg += 'objectType ';
        }

        if( !params.xrtType ) {
            missingMsg += 'xrtType ';
        }

        // if( !params.location ) {
        // missingMsg += 'location ';
        // }
        // if( !params.subLocation ) {
        // missingMsg += 'subLocation ';
        // }
    }

    if( !noParams ) {
        if( missingMsg.length === 0 ) {
            var request = {
                type: params.objectType,
                stylesheetType: params.xrtType,
                preferenceLocation: params.prefLocation
            };

            if( params.client && params.client === 'AWC' ) {
                request.client = params.client;
            }

            if( params.location !== '' ) {
                if( params.location ) {
                    request.location = params.location;
                }

                if( params.subLocation && params.subLocation !== '' ) {
                    request.sublocation = params.subLocation;
                }
            }

            soaSvc.post( 'Internal-AWS2-2016-03-DataManagement', 'getUnprocessedXRT', request ).then(
                function( response ) {
                    deferred.resolve( response.dsInfo );
                },
                function() {
                    deferred.resolve();
                } );
        } else {
            notifySvc.showError( 'URL is Missing ' + missingMsg );
            deferred.resolve( '<unable to get XRT/>' );
        }
    } else {
        deferred.resolve();
    }

    return deferred.promise;
};

export default exports = {
    setContext,
    getXrtData
};
/**
 * XRT Context Service for getting info about the XRT
 *
 * @memberof NgServices
 * @member xrtContextService
 */
app.factory( 'xrtContextService', () => exports );

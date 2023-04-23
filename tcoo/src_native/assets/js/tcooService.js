// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * This file contains the methods for tcoo viewer
 *
 * @module js/tcooService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import logger from 'js/logger';
import browserUtils from 'js/browserUtils';
import AwHttpService from 'js/awHttpService';

var exports = {};

/**
 * process the response from getLaunchInfo soa call and resolve the promise with appropriate argument
 *
 * @param {Object} response from soa call
 * @param {Object} deferred promise for resolution
 */
export let processLaunchInfo = function( response, deferred ) {
    if( response && response.data && response.data.oosUrlString ) {
        deferred.resolve( response );
    } else {
        logger.error( "wopi url not set." );
        if( response && response.data ) {
            deferred.resolve( response );
        } else {
            deferred.resolve( null );
        }
    }
};

/**
 * get the launch url for tcoo viewer
 *
 * @param {Object} input for microservice call
 * @return {String} launch Url
 */
export let getLaunchUrl = function( launchInfoInput ) {
    var deferred = AwPromiseService.instance.defer();

    // tcooweb microservice call
    var url = browserUtils.getBaseURL() + 'micro/tcooweb/v1/wopi/files/launchinfo';

    // for http request other than GET, we need to use AwHttpService. Its instance is $http.
    // So that the X-XSRF-TOKEN header can be set.
    var $http = AwHttpService.instance;
    var postPromise = $http.post( url, launchInfoInput, { headers: { 'Content-Type': 'application/json' } } );
    postPromise.then( function( response ) {
        exports.processLaunchInfo( response, deferred );
    }, function( err ) {
        // error message if the soa call's promise is not resolved.
        deferred.reject( err );
    } );

    return deferred.promise;
};

/**
 * Uppdate jsdocs
 */
export let getResolvedPromise = function() {
    var deferred = AwPromiseService.instance.defer();
    deferred.resolve();
    return deferred.promise;
};

export default exports = {
    processLaunchInfo,
    getLaunchUrl,
    getResolvedPromise
};
/**
 * The service to perform SOA or REST calls.
 *
 * @member actionService
 * @memberof NgServices
 */
app.factory( 'tcooService', () => exports );

// Copyright (c) 2020 Siemens

/**
 * This module provides a way for declarative framework to do outgoing calls like SOA or REST.
 *
 * @module js/graphQLService
 *
 * @namespace graphQLService
 */
import app from 'app';
import AwHttpService from 'js/awHttpService';
import AwPromiseService from 'js/awPromiseService';
import localeService from 'js/localeService';
import _ from 'lodash';
import assert from 'assert';
import eventBus from 'js/eventBus';
import browserUtils from 'js/browserUtils';
import logger from 'js/logger';

// eslint-disable-next-line valid-jsdoc

/**
 * Define public API
 */
var exports = {};

/**
 * Makes GraphQL call with given inputData. return the promise object.
 *
 * @param {Object} inputData - The 'inputData' object.
 *
 * @return {Promise} A promise object resolved with the results of the SOA call (or rejected if there is a
 *         problem).
 */
export let callGraphQL = function( inputData ) {
    eventBus.publish( 'progress.start', {} );

    return AwHttpService.instance.post( browserUtils.getBaseURL() + inputData.endPoint, inputData.request, {
        headers: {
            'Accept-Language': localeService.getLocale()
        }
    } ).then( function( response ) {
        var endPt = null;
        assert( response, 'No response given for ' + endPt );

        var body = response.data;

        try {
            if( body.errors ) {
                /** If no data, reject the promise. Otherwise report an error and return data */
                if( _.isEmpty( body.data ) ) {
                    eventBus.publish( 'progress.end', {} );

                    return AwPromiseService.instance.reject( body.errors[ 0 ].message );
                }

                logger.error( body.errors[ 0 ].message );
            }
        } catch ( err ) {
            // Do nothing.
        }

        eventBus.publish( 'progress.end', {} );

        if( typeof body !== 'string' || body.indexOf( '<?xml version' ) === -1 ) {
            return body;
        }

        return AwPromiseService.instance.reject( 'Unexpected response body for: ' + endPt );
    }, function( err ) {
        eventBus.publish( 'progress.end', {} );
        throw err;
    } );
};

exports = {
    callGraphQL
};
export default exports;
/**
 * The service to perform GraphQL calls.
 *
 * @member graphQLService
 * @memberof NgServices
 */
app.factory( 'graphQLService', () => exports );

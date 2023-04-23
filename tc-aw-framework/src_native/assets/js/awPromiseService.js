// Copyright (c) 2020 Siemens
/* eslint-env es6 */
/* eslint-disable class-methods-use-this */

/**
 * This service provides core angularJS $q/promise service abstraction.
 * https://github.com/angular/angular.js/blob/master/src/ng/q.js
 *
 * @module js/awPromiseService
 */
import _ from 'lodash';
import AwInjectorService from 'js/awInjectorService';
import awConfiguration from  'js/awConfiguration';

function getNgPromiseService() {
    return AwInjectorService.instance.get( '$q' );
}
/**
 * static resolve function
 * @param {*} resolveFunc resolver
 * @param {*} val value
 * @returns {Promise} promise with resolved result
 */
function resolveInternal( resolveFunc, val ) {
    return resolveFunc ? resolveFunc( val ) : Promise.resolve( val );
}
/**
 * static reject function
 * @param {*} rejectFunc rejecter
 * @param {*} val value
 * @returns {Promise} promise with resolved result
 */
function rejectInternal( rejectFunc, val ) {
    return rejectFunc ? rejectFunc( val ) : Promise.reject( val );
}

/**
 * instance function for AwPromiseService
 * @param {fn} callback as function( resolve, reject )
 * @returns {Promise} promise object
 */
function createPromise( callback ) {
    let promise = new Promise( ( resolve, reject ) => {
        const resolveWrapper = ( value ) => {
            return resolveInternal( resolve, value );
        };
        const rejectWrapper = ( value ) => {
            return rejectInternal( reject, value );
        };
        callback ? callback( resolveWrapper, rejectWrapper ) : resolve();
    } );
    return promise;
}

// Decorate instance
createPromise.resolve = resolveInternal.bind( null, undefined );

createPromise.reject = rejectInternal.bind( null, undefined );

createPromise.defer = () => {
    let deferred = {};
    deferred.promise = new Promise( ( resolve, reject ) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
    } );
    return deferred;
};

createPromise.all = ( promises ) => {
    let isPromisesArray = Array.isArray( promises );
    let result = isPromisesArray ? promises : [];
    //Angular use cases support- promises could be object
    if ( !isPromisesArray ) {
        _.forEach( promises, ( promise, key ) => {
            result.push( promise.then( ( data ) => {
                return {
                    [key]: data
                };
            } ) );
        } );
        //resolve promise as a object, bydefault promise.all resolves promise as a array
        return Promise.all( result ).then( ( arrayData ) => {
            let responseObj = {};
            _.forEach( arrayData, ( obj ) => {
                _.forEach( obj, ( val, key ) => {
                    responseObj[key] = val;
                } );
            } );
            return responseObj;
        } );
    }
    return Promise.all( result );
};

createPromise.when = ( value ) => {
    return Promise.resolve( value );
};

createPromise.race = ( promises ) => {
    return Promise.race( promises );
};

function isNativePromiseEnabled() {
    return awConfiguration.get( 'isNativePromiseEnabled' );
}

const getNativeInstance = () => createPromise;

export default {
    getNativeInstance,
    get instance() {
        if ( isNativePromiseEnabled() ) {
            return createPromise;
        }
        return getNgPromiseService();
    }
};

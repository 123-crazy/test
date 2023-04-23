// Copyright (c) 2020 Siemens

/**
 * Defines {@link NgServices.async} which provides a set of utilities for handling async methods
 *
 * @module js/async.service
 * @requires app
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import AwTimeoutService from 'js/awTimeoutService';
import Debug from 'Debug';

var trace = new Debug( 'async' );

/* eslint-disable-next-line valid-jsdoc*/

let exports = {};

/**
 * Get an api capable of executing the given api async
 *
 * @param {Function<List<a>>} methodToExecute Method to call. Input will be a list of a where a is the input to the debounced method
 * @param {Number} debounceTime How long to debounce method calls
 * @param {Lock} lock A "lock" with a "isUnlocked" function. Allows external control of call on top of debounce
 * @returns {Function<a>} A debounced version of the method that supports individual calls
 */
var debouncePromise = function( methodToExecute, debounceTime, lock ) {
    /**
     * Promise tracking any currently active batch.
     *
     * Resolved once the method is actually executed.
     */
    var deferred = null;

    /**
     * The current active timer. If allowed to complete the method will be executed.
     */
    var debounceTimer = null;

    /**
     * Items to pass to the network
     */
    var items = [];

    /**
     * Flag tracking if the service was previously locked
     */
    var wasLocked = false;

    /**
     * Actually execute the action
     *
     * @returns {Promise} Promise resolved after execution
     */
    var doAction = function() {
        // Clear the reference to current batch - set to null to prevent additions to current batch post timeout
        var currentDefer = deferred;
        var currentItems = items;
        deferred = null;
        items = [];
        // Actually do the method
        return methodToExecute( currentItems ).then( currentDefer.resolve );
    };

    /**
     * Add a new item to batch
     *
     * Returns a promise resolved when the method is actually executed.
     *
     * @param {a} item The item to add
     * @returns {Promise} Promise resolved when action is actually executed
     */
    return function( item ) {
        // If a batch is not already active create a new one
        if( !deferred ) {
            deferred = AwPromiseService.instance.defer();
        }
        // If the timer is running cancel it
        if( debounceTimer ) {
            AwTimeoutService.instance.cancel( debounceTimer );
        }
        // Add item to batch and start a new timer
        items.push( item );
        var timerComplete = function() {
            if( lock ) {
                if( lock.isUnlocked() ) {
                    if( !wasLocked ) {
                        trace( 'Debounce is unlocked doing action', debounceTime );
                        // Debounce after unlock has finished, safe to do action
                        doAction();
                    } else {
                        trace( 'Debounce is unlocked restarting timer', debounceTime );
                        wasLocked = false;
                        // Unlock just happened, restart regular debounce
                        debounceTimer = AwTimeoutService.instance( timerComplete, debounceTime );
                    }
                } else {
                    trace( 'Debounce is locked', debounceTime );
                    wasLocked = true;
                    // Locked, reset timer and check again after debounce
                    debounceTimer = AwTimeoutService.instance( timerComplete, debounceTime );
                }
            } else {
                // No extra lock, just do the action
                doAction();
            }
        };
        trace( 'New item added resetting timer', debounceTime, item );
        debounceTimer = AwTimeoutService.instance( timerComplete, debounceTime );
        // Return the "shared" promise
        return deferred.promise;
    };
};
export { debouncePromise as debouncePromise };

exports = {
    debouncePromise
};
export default exports;
/**
 * A set of utilities for handling async methods
 *
 * @class async
 * @memberOf NgServices
 */
app.factory( 'async', () => exports );

// Copyright (c) 2020 Siemens

/* eslint-disable require-jsdoc */

/**
 * @module js/promiseThrottle
 */

class AbortError extends Error {
    constructor() {
        super( 'Throttled function aborted' );
        this.name = 'AbortError';
    }
}

const promiseThrottle = ( fn, interval, limit = 1 ) => {
    if ( !Number.isFinite( limit ) ) {
        throw new TypeError( 'Expected `limit` to be a finite number' );
    }

    if ( !Number.isFinite( interval ) ) {
        throw new TypeError( 'Expected `interval` to be a finite number' );
    }

    const queue = new Map();

    let currentTick = 0;
    let activeCount = 0;

    const throttled = function( ...args ) {
        let timeout;
        return new Promise( ( resolve, reject ) => {
            const execute = () => {
                resolve( fn.apply( this, args ) );
                queue.delete( timeout );
            };

            const now = Date.now();

            if ( now - currentTick > interval ) {
                activeCount = 1;
                currentTick = now;
            } else if ( activeCount < limit ) {
                activeCount++;
            } else {
                currentTick += interval;
                activeCount = 1;
            }

            timeout = setTimeout( execute, currentTick - now );

            queue.set( timeout, reject );
        } );
    };

    throttled.abort = () => {
        for ( const timeout of queue.keys() ) {
            clearTimeout( timeout );
            queue.get( timeout )( new AbortError() );
        }

        queue.clear();
    };

    return throttled;
};

export {
    promiseThrottle,
    AbortError
};
export default promiseThrottle;

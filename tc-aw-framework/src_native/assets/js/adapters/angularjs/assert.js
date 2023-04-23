// Copyright (c) 2020 Siemens

/**
 * This module is used to adapt the functionality provided by NodeJS module, 'assert', to work within an AngularJS based
 * application.
 *
 * @module assert
 */
import logger from 'js/logger';

/**
 * This function throws an exception with the given message text if the given 'expression' evaluates to FALSE.
 *
 * @param {Object} condition - Expression to evaluate.
 * @param {string} message - Message text to use in any exception thrown.
 */
export default function( condition, message ) {
    if( !condition ) {
        logger.warn( 'assert failed: ' + message );
        throw new Error( 'assert failed: ' + message );
    }
}

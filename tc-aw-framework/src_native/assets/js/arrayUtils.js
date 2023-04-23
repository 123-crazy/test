// Copyright (c) 2020 Siemens

/**
 * This utility module provides helpful functions intended to efficiently manipulate array contents.
 *
 * @module js/arrayUtils
 */
import _ from 'lodash';

var exports = {};

/**
 * Insert a 'source' array into a 'target' array starting at a given location.
 *
 * @param {ObjectArray} targetArray - Array elements where the 'source' element will be inserted into.
 *
 * @param {Number} index - The index in the 'target' array *at which* the 1st 'source' element should be placed
 *            (e.g. '0' indicates the 1st 'source' element will be the 1st element in the 'target' when done).
 *
 * @param {ObjectArray} sourceArray - Array elements to be inserted into the 'target' array.
 */
export let insert = function( targetArray, index, sourceArray ) {
    /**
     * Check for simple case of appending into an empty array.
     */
    if( targetArray.length === 0 && index === 0 ) {
        _.forEach( sourceArray, function( value ) {
            targetArray.push( value );
        } );
    } else {
        index = Math.min( index, targetArray.length );

        var destNdx = index + 1;

        _.forEach( sourceArray, function( sourceObj ) {
            targetArray.splice( destNdx, 0, sourceObj );
            destNdx++;
        } );
    }
};

/**
 * Insert a 'source' array into a 'target' array starting at just before a given location.
 *
 * @param {ObjectArray} targetArray - Array elements where the 'source' elements will be inserted into.
 *
 * @param {Number} index - The index in the 'target' array *at which* the last 'source' element should be placed
 *            (i.e. 'source' elements are inserted such that the last element of the 'source' would be placed before
 *            the element currently at this index).
 *
 * @param {ObjectArray} sourceArray - Array elements to be inserted into the 'target' array.
 */
export let insertBefore = function( targetArray, index, sourceArray ) {
    /**
     * Check for simple case of appending into an empty array.
     */
    if( targetArray.length === 0 && index === 0 ) {
        _.forEach( sourceArray, function( value ) {
            targetArray.push( value );
        } );
    } else {
        index = Math.min( index, targetArray.length );

        var destNdx = index;

        _.forEach( sourceArray, function( sourceObj ) {
            targetArray.splice( destNdx, 0, sourceObj );
            destNdx++;
        } );
    }
};

exports = {
    insert,
    insertBefore
};
export default exports;

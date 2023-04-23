// Copyright (c) 2020 Siemens

/**
 * Virtual repeat service
 *
 * @module js/awVirtualRepeatService
 */
import app from 'app';
import $ from 'jquery';

/**
 * Local variables
 *
 * @private
 */
var localVars = {};

/**
 * CSS width property
 */
localVars.WIDTH = 'width';

/**
 * CSS height property
 */
localVars.heightName = 'height';

/**
 * CSS pixel dimension
 */
localVars.PX = 'px';

/**
 * Number of additional elements to render above and below the viewable area
 */
localVars.NUM_EXTRA = 3;

/**
 * Maximum element size
 */
localVars.MAX_ELEMENT_SIZE = 1533917;

let exports = {};

/**
 * Set size of scroller element
 *
 * @param {Number} size - size to be set.
 * @param {Element} resizerElement - list resizer element
 */
export let setScrollerSize = function( size, resizerElement ) {
    if( resizerElement ) {
        // Clear any existing dimensions.
        resizerElement.innerHTML = '';

        // If the size falls within the browser's maximum explicit size for a single element, we can
        // set the size and be done. Otherwise, we have to create children that add up the the desired
        // size.
        if( size < localVars.MAX_ELEMENT_SIZE ) {
            resizerElement.style[ localVars.heightName ] = size + localVars.PX;
        }
    }
};

/**
 * Set Transform for offsetter element
 *
 * @param {Array} rowHeights - array of row heights
 * @param {Number} columns - number of columns
 * @param {Number} startIndex - new start index
 * @param {Element} offsetterElem - list offsetter element
 */
export let setTransform = function( rowHeights, columns, startIndex, offsetterElem, itemSize ) {
    var transformHeight = exports.calculateTransformHeight( rowHeights, columns, startIndex, itemSize );
    var transform = 'translateY(' + transformHeight + 'px)';

    offsetterElem.style.webkitTransform = transform;
    offsetterElem.style.transform = transform;
};

/**
 * Calculates average item size
 *
 * @param {Array} rowHeights - array of item sizes
 */
export let calculateAverageRowHeight = function( rowHeights ) {
    var totalHeight = 0;
    var avgRowHeight = 0;
    var numberOfRows = 0;

    if( rowHeights ) {
        $.each( rowHeights, function( key, rowHeight ) {
            totalHeight += rowHeight;
            numberOfRows++;
        } );

        if( totalHeight !== 0 && numberOfRows !== 0 ) {
            avgRowHeight = Math.floor( totalHeight / numberOfRows );
        }
    }

    return avgRowHeight;
};

/**
 * Calculates transform height
 *
 * @param {Array} rowHeights - array of row heights
 * @param {Number} columns - number of columns
 * @param {Number} startIndex - new start index
 */
export let calculateTransformHeight = function( rowHeights, columns, startIndex, itemSize ) {
    var rowNumber = Math.floor( startIndex / columns );
    return rowNumber * itemSize;
};

exports = {
    setScrollerSize,
    setTransform,
    calculateAverageRowHeight,
    calculateTransformHeight
};
export default exports;
/**
 * This service maintains utility functions for virtual repeat functionality
 *
 * @memberof NgServices
 * @member awVirtualRepeatService
 */
app.factory( 'virtualRepeatService', () => exports );

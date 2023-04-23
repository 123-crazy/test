// Copyright (c) 2020 Siemens

/**
 * Max Row service is used to calculate the height of array widget based on max row count. This service is only
 * applicable for Array widget.
 * <P>
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/uwMaxRowService
 */
import app from 'app';
import { range } from 'lodash';

var exports = {};

/**
 * @private
 *
 * @param {Element} liElement - DOM element the controller is attached to.
 *
 * @return {Number} - returns single row height of an array.
 */
export let _calculateRowHeight = function( liElement ) {
    // row height is equal to max(min-height, line-height) + padding.
    // row height is just the height of a single line - can't use element height
    // if an element has multiple lines it takes multiple rows
    var lineHeight = Math.max( parseInt( liElement.css( 'line-height' ), 10 ), // line-height css property
        parseInt( liElement.css( 'min-height' ), 10 ) ); // min-height css property

    return lineHeight + parseInt( liElement.css( 'padding-top' ), 10 ) +
        parseInt( liElement.css( 'padding-bottom' ), 10 );
};

/**
 * @private
 *
 * @param {Element} $element - DOM element the controller is attached to.
 * @param {Number} maxRowCount - maximum row count visible.
 *
 * @return {Number} - returns calculated array height based of max row count.
 */
export let _calculateArrayHeight = function( $element, maxRowCount = 5 ) {
    if( $element ) {
        const rowHeights = range( maxRowCount ).map( idx => {
            // Get the next row
            const liElement = $element.find( 'ul li.aw-jswidgets-arrayValueCellListItem:nth-child(' + ( idx + 1 ) + ')' );
            if( liElement.outerHeight() ) {
                return exports._calculateRowHeight( liElement );
            }
            return 0;
        } ).filter( x => x !== null );
        const maxRowHeight = Math.max( ...rowHeights );
        //if row is not found or does not have height use max row height
        return rowHeights.reduce( ( acc, nxt ) => acc + ( nxt || maxRowHeight ), 0 );
    }
    return 0;
};

exports = {
    _calculateRowHeight,
    _calculateArrayHeight
};
export default exports;
/**
 * Definition for the uwMaxRowService service used by (aw-property-array-val) and (aw-property-non-edit-array-val).
 *
 * @member uwMaxRowService
 * @memberof NgServices
 */
app.factory( 'uwMaxRowService', () => exports );

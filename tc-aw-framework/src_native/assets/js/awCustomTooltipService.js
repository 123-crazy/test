// Copyright (c) 2020 Siemens

/**
 * This is used to read the tooltip of visual indicator and replace '#' with '\n', to show each status in new line.
 *
 * @module js/awCustomTooltipService
 */
import app from 'app';

var exports = {};
/**
 * event is a type of mouseover event.
 */
export let showCustomTooltip = function( event ) {
    var res = event.title.split( '#' );
    var arrayLength = res.length;
    if( arrayLength > 1 ) {
        var status = '';
        for( var i = 0; i < arrayLength; i++ ) {
            if( status === '' ) {
                status = res[ i ];
            } else {
                status = status + '\n' + res[ i ];
            }
        }
        event.title = status;
    }
};
/**
 * This is the primary service used to create custom tooltip for celllist objects on the mouseover event of visual
 * indicator.
 *
 * @member awCustomTooltipService
 */

exports = {
    showCustomTooltip
};
export default exports;
app.factory( 'awCustomTooltipService', () => exports );

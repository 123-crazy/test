// Copyright (c) 2019 Siemens

/* global define */

/**
 * This module provides graph style support
 *
 * @module js/graphStyleUtils
 */
import _ from 'lodash';

'use strict';

/**
 * Define public API
 */
var exports = {};

/**
 * The dash style enumeration
 */
var DashStyle = {
    /**
     * The solid style
     */
    SOLID: 'SOLID',
    /**
     * The dash style
     */
    DASH: 'DASH',
    /**
     * The dash-dot style
     */
    DASHDOT: 'DASHDOT',
    /**
     * The dash-dot-dot style
     */
    DASHDOTDOT: 'DASHDOTDOT',
    /**
     * The dot style
     */
    DOT: 'DOT'
};

/**
 * Generate dash segments
 *
 * @param dashStyle edge style
 * @return dash style array
 */
export let generateDashSegments = function( dashStyle ) {
    var segments = [];
    switch ( dashStyle ) {
        case DashStyle.DASH:
            segments = [ 5, 5 ];
            break;
        case DashStyle.DASHDOT:
            segments = [ 5, 5, 2, 5 ];
            break;
        case DashStyle.DASHDOTDOT:
            segments = [ 5, 5, 2, 5, 2, 5 ];
            break;
        case DashStyle.DOT:
            segments = [ 2, 5 ];
            break;
        default:
    }
    return segments;
};

/**
 * convert color to array
 *
 * @return color
 */
export let parseColor = function( color ) {
    var dfColor = null;

    if( !color ) {
        return null;
    }

    if( _.startsWith( color, 'rgb' ) ) {
        color = _.trimStart( color, 'rgb' );
    } else if( _.startsWith( color, 'argb' ) ) {
        color = _.trimStart( color, 'argb' );
    }
    var value = color.substring( 1, color.length - 1 ).split( ',' );
    if( value.length === 3 ) {
        dfColor = new window.SDF.Utils.Color( parseInt( value[ 0 ] ), parseInt( value[ 1 ] ), parseInt( value[ 2 ] ),
            255 );
    } else if( value.length === 4 ) {
        dfColor = new window.SDF.Utils.Color( parseInt( value[ 1 ] ), parseInt( value[ 2 ] ), parseInt( value[ 3 ] ),
            parseInt( value[ 0 ] ) );
    }
    return dfColor;
};

export let getTransparentColor = function() {
    return new window.SDF.Utils.Color( 0, 0, 0, 0 );
};

/**
 * Get the SVG &lt;image&gt; element string for the given image URL.
 *
 * @param {String} imageUrl - The image URL
 *
 * @return {String} the SVG &lt;image&gt; element string
 */
export let getSVGImageTag = function( imageUrl ) {
    var url = imageUrl;
    if( !url ) {
        url = '';
    }

    var imageString = '<image xmlns=\'http://www.w3.org/2000/svg\' xmlns:xlink=\'http://www.w3.org/1999/xlink\'' +
        ' height=\'100%\' width=\'100%\' class=\'aw-base-icon\' xlink:href=\'<%imageURL%>\' draggable=\'false\' ondragstart=\'return false;\' />';
    return imageString.replace( /<%imageURL%>/g, url );
};

export default exports = {
    generateDashSegments,
    parseColor,
    getTransparentColor,
    getSVGImageTag
};

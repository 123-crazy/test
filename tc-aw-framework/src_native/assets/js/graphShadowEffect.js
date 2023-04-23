// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module defines graph shadow effect
 *
 * @module js/graphShadowEffect
 */

'use strict';

var exports = {};

/**
 * The tag for filter element
 */
var TAG = 'filter';

/**
 * The tag for feOffset element
 */
var FEOFFSET_TAG = 'feOffset';

/**
 * The tag for feColorMatrix element
 */
var FECOLORMATRIX_TAG = 'feColorMatrix';

/**
 * The tag for feGaussianBlur element
 */
var FEGAUSSIANBLUR_TAG = 'feGaussianBlur';

/**
 * The tag for feBlend element
 */
var FEBLEND_TAG = 'feBlend';

/**
 * The namespace URI of SVG
 */
var URI_SVG = 'http://www.w3.org/2000/svg';

/**
 * Register a shadow effect
 *
 * @param effectId the effect id
 * @param svgElement the SVG element where the effect is registered
 * @param xOffset the x offset
 * @param yOffset the y offset
 * @param blurDeviation the Gaussian blur deviation
 * @param colorMatrix the color matrix Every pixel's color value (represented by an [R,G,B,A] vector) is matrix
 *            multiplied to create a new color. Can be null
 */
export let registerEffect = function( effectId, svgElement, xOffset, yOffset, blurDeviation, colorMatrix ) {
    if( !effectId || !svgElement ) {
        return;
    }

    var effect = document.getElementById( effectId );
    if( !effect ) {
        var filterElement = document.createElementNS( URI_SVG, TAG );
        filterElement.id = effectId;

        var offsetElement = document.createElementNS( URI_SVG, FEOFFSET_TAG );
        offsetElement.setAttribute( 'result', 'offOut' );
        offsetElement.setAttribute( 'in', 'SourceGraphic' );
        offsetElement.setAttribute( 'dx', xOffset );
        offsetElement.setAttribute( 'dy', yOffset );
        filterElement.appendChild( offsetElement );

        var blurIn = 'offOut';
        if( colorMatrix ) {
            blurIn = 'matrixOut';
            var matrixElement = document.createElementNS( URI_SVG, FECOLORMATRIX_TAG );
            matrixElement.setAttribute( 'result', blurIn );
            matrixElement.setAttribute( 'in', 'offOut' );
            matrixElement.setAttribute( 'type', 'matrix' );
            matrixElement.setAttribute( 'values', colorMatrix );
            filterElement.appendChild( matrixElement );
        }

        var blurElement = document.createElementNS( URI_SVG, FEGAUSSIANBLUR_TAG );
        blurElement.setAttribute( 'result', 'blurOut' );
        blurElement.setAttribute( 'in', blurIn );
        blurElement.setAttribute( 'stdDeviation', blurDeviation );
        filterElement.appendChild( blurElement );

        var blendElement = document.createElementNS( URI_SVG, FEBLEND_TAG );
        blendElement.setAttribute( 'in', 'SourceGraphic' );
        blendElement.setAttribute( 'in2', 'blurOut' );
        blendElement.setAttribute( 'mode', 'normal' );
        filterElement.appendChild( blendElement );

        svgElement.appendChild( filterElement );
    }
};

export default exports = {
    registerEffect
};

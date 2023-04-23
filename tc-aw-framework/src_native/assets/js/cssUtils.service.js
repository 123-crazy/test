// Copyright (c) 2020 Siemens

/**
 * Defines {@link NgServices.cssUtils} which provides a set of utilities for extracting properties from css.
 *
 * @module js/cssUtils.service
 * @requires app
 * @requires jquery
 * @requires lodash
 */
import app from 'app';
import $ from 'jquery';
import _ from 'lodash';

let exports = {};

/**
 * Get the value of a property from a CSS class. If that class does not have the property the default 'div'
 * property will be returned.
 *
 * @method getPropertyFromCssClass
 * @memberOf NgControllers.awColumnChartCtrl
 *
 * @param className {String} - Name of the class
 * @param property {String} - Name of the property
 *
 * @return {String} Property value
 */
export let getPropertyFromCssClass = function( className, property ) {
    // Create and append div so CSS is computed
    var e = $( '<div>', {
        class: className
    } ).appendTo( 'body' );
    // Get the property
    var prop = e.css( property );
    // and remove the div
    e.remove();
    return prop;
};

/**
 * Get the background color for the 'aw-charts-chartColor' classes 1-9.
 *
 * @method getPropertyFromCssClass
 * @memberOf NgControllers.awColumnChartCtrl
 *
 * @return {String[]} Chart colors
 */
export let getColumnChartColors = function( chartColorOverrideClass ) {
    return _.range( 1, 11 ).map( function( i ) {
        return exports.getPropertyFromCssClass( chartColorOverrideClass + i, 'background-color' );
    } );
};

exports = {
    getPropertyFromCssClass,
    getColumnChartColors
};
export default exports;
/**
 * A set of utilities for extracting properties from css.
 *
 * @class cssUtils
 * @memberOf NgServices
 */
app.factory( 'cssUtils', () => exports );

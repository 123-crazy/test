// Copyright (c) 2020 Siemens

/**
 * @module js/awSashUtils
 */
import $ from 'jquery';
import ngUtils from 'js/ngUtils';
import 'js/aw-splitter.directive';

var exports = {};

/**
 * Initialize (i.e. 'bootstrap') the angular system and create an angular controller on a new 'child' of the
 * given 'parent' element.
 *
 * @param {Element} parentElement - The DOM element the controller and 'inner' HTML content will be added to.
 *            <P>
 *            Note: All existing 'child' elements of this 'parent' will be removed.
 *
 * @param {Callback} apiFn - API for call backs from this controller.
 */
export let initWidget = function( parentElement ) {
    /**
     * Create an 'outer' <DIV> (to hold the given 'inner' HTML) and create the angular controller on it.
     * <P>
     * Remove any existing 'children' of the given 'parent'
     * <P>
     * Add this new element as a 'child' of the given 'parent'
     * <P>
     * Include the DOM elements into the AngularJS system for AW and set the callback API function.
     */
    var ctrlElement = $( '<div class="aw-layout-splitterLine"></div>' );

    ctrlElement
        .html( '<aw-splitter min-size-1=\'317\' min-size-2=\'300\' isPrimarySplitter=true direction=\'vertical\'></aw-splitter>' );

    $( parentElement ).empty();
    $( parentElement ).append( ctrlElement );

    ngUtils.include( parentElement, ctrlElement );
};

/**
 * Return the object that defines the public API of this module.
 */
exports = {
    initWidget
};
export default exports;

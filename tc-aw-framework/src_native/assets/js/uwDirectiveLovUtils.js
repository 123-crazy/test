// Copyright (c) 2020 Siemens

/**
 * @module js/uwDirectiveLovUtils
 */
import ngModule from 'angular';
import 'js/aw-when-scrolled.directive';
import 'js/aw-property-lov-val.directive';
import 'js/aw-property-lov-child.directive';

var exports = {};

/**
 * This method will set selected LOV entry
 *
 * @param {Element} parentElement - The DOM element to retrieve scope.
 * @param {Object} lovEntry - The LOVEntry object containing the values to set the scope property's 'ui' and 'db'
 *            values based upon.
 */
export let setSelectedLovEntry = function( parentElement, lovEntry ) {
    if( parentElement ) {
        var ctrlElement = ngModule.element( parentElement.querySelector( '.aw-jswidgets-propertyVal' ) );
        if( ctrlElement ) {
            var ngScope = ngModule.element( ctrlElement ).scope();
            if( ngScope && ngScope.$$childHead ) {
                ngScope.$$childHead.setSelectedLOV( lovEntry );
            }
        }
    }
};

exports = {
    setSelectedLovEntry
};
export default exports;

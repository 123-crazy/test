// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aw-xrteditor-directives.directive
 */
import * as app from 'app';
import $ from 'jquery';

/**
 * TODO
 *
 * @example TODO
 *
 * @member jq-selectable
 * @memberof NgAttributeDirectives
 */
app.directive( 'jqSelectable', [ function() {
    return {
        restrict: 'A',
        link: function( scope, $element, attrs ) {
            var jqueryElm = $( $element );
            // $(jqueryElm).selectable();
        }
    };
} ] );

/**
 * TODO
 *
 * @example TODO
 *
 * @member ng-enter
 * @memberof NgMixedDirectives
 */
app.directive( 'ngEnter', [ function() {
    return function( scope, element, attrs ) {
        element.bind( 'keydown keypress', function( event ) {
            if( event.which === 13 ) {
                scope.$apply( function() {
                    scope.$eval( attrs.ngEnter );
                } );
                event.preventDefault();
            }
        } );
    };
} ] );

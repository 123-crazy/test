// Copyright (c) 2020 Siemens

/**
 * Definition for the 'aw-autofocus' directive used to autofocus an element.
 *
 * @module js/aw-autofocus.directive
 */
import app from 'app';
import $ from 'jquery';

/**
 * Definition for the 'aw-autofocus' directive used to autofocus an element
 *
 * @example <someHtmlTag aw-autofocus ></someHtmlTag>
 *
 * @member aw-autofocus
 * @memberof NgAttributeDirectives
 */
app.directive( 'awAutofocus', function() {
    return {
        restrict: 'A',
        controller: [ '$scope', '$element', function( $scope, $element ) {
            if( $scope.autoFocus ) {
                $( $element[ 0 ] ).focus();
            }
        } ],
        scope: {
            autoFocus: '='
        }
    };
} );

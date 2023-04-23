// Copyright (c) 2020 Siemens

/**
 * Attribute Directive to change the visibility of an element based on a condition.
 *
 * @module js/visible-when.directive
 */
import app from 'app';
import 'js/wysiwygModeService';

/**
 * Attribute Directive to change the visibility of an element based on a condition.
 *
 * @example TODO
 *
 * @member visible-when
 * @memberof NgAttributeDirectives
 */
app.directive( 'visibleWhen', [ 'wysModeSvc', function( wysModeSvc ) {
    return {
        restrict: 'A',
        replace: true,
        link: function( scope, element, attr ) {
            scope.$watch( attr.visibleWhen, function( value ) {
                if( !wysModeSvc.isWysiwygMode( scope ) ) {
                    if( value ) {
                        element.removeClass( 'hidden' );
                    } else {
                        element.addClass( 'hidden' );
                    }
                }
            } );
        }
    };
} ] );

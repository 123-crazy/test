// Copyright (c) 2020 Siemens

/**
 * Attribute directive to drive loading more values on scroll.
 *
 * @module js/aw-when-scrolled.directive
 */
import app from 'app';

/**
 * Attribute directive to drive loading more values on scroll.
 *
 * @example TODO
 *
 * @member aw-when-scrolled
 * @memberof NgAttributeDirectives
 *
 * @deprecated afx@4.3.0
 * @alternative <AwWidget>
 * @obsoleteIn afx@5.1.0
 */
app.directive( 'awWhenScrolled', function() {
    return {
        restrict: 'A',
        link: function( scope, $element, attrs ) {
            var raw = $element[ 0 ];
            $element.on( 'scroll.lov', function() {
                // trigger when scroll reaches bottom; compensate by 1px since ui zoom causes imprecise rounding issues
                if( raw.scrollTop + raw.offsetHeight + 1 >= raw.scrollHeight ) {
                    scope.$evalAsync( attrs.awWhenScrolled );
                }
            } );
        }
    };
} );

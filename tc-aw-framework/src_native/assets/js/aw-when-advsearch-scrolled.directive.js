// Copyright (c) 2020 Siemens

/**
 * Attribute directive to drive loading more values on scroll.
 *
 * @module js/aw-when-advsearch-scrolled.directive
 */
import app from 'app';

/**
 * Attribute directive to drive loading more values on scroll.
 *
 *
 * @member aw-when-advsearch-scrolled
 * @memberof NgAttributeDirectives
 */
app.directive( 'awWhenAdvsearchScrolled', function() {
    return {
        restrict: 'A',
        link: function( scope, $element, attrs ) {
            const OVERHEAD_HEIGHT = 4;
            var raw = $element[ 0 ];
            $element.on( 'scroll.lov', function() {
                if( raw.scrollTop + raw.offsetHeight + OVERHEAD_HEIGHT >= raw.scrollHeight ) {
                    scope.$evalAsync( attrs.awWhenAdvsearchScrolled );
                }
            } );
        }
    };
} );

// Copyright (c) 2020 Siemens

/**
 * Directive to perform transclusion.
 *
 * @module js/aw-transclude.directive
 */
import app from 'app';

/**
 * Directive to perform transclusion.
 *
 * @example <div aw-transclude>
 *
 * @member aw-transclude
 * @memberof NgAttributeDirectives
 */
app.directive( 'awTransclude', [ function() {
    return {
        restrict: 'A',
        link: function( scope, element, attrs, ctrl, $transclude ) {
            $transclude( scope, function( clone ) {
                element.append( clone );
            } );
        }
    };
} ] );

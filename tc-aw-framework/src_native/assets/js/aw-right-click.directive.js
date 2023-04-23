// Copyright (c) 2020 Siemens

/**
 * Attribute directive to handle right click event.
 *
 * @module js/aw-right-click.directive
 */
import app from 'app';

/**
 * Attribute directive to to handle right click event.
 *
 * @example <div aw-right-click="handleRightClick($event)" ></div>
 *
 * @member aw-right-click
 * @memberof NgAttributeDirectives
 */
app.directive( 'awRightClick', [ function() {
    return {
        restrict: 'A',
        link: function( $scope, $element, $attrs ) {
            $element.bind( 'contextmenu', function( event ) {
                event.preventDefault();
                $scope.$eval( $attrs.awRightClick, {
                    $event: event
                } );
            } );
        }
    };
} ] );

// Copyright (c) 2020 Siemens

/**
 * Directive to wrap the HTML 'on-load' callback
 *
 * @module js/aw-on-load.directive
 */
import app from 'app';

/**
 * Directive to provide callback when an HTML element is loaded Wraps the HTML 'on-load' event
 *
 * @example <iframe aw-on-load='onLoadCallback()'></iframe>
 *
 * @member aw-on-load
 * @memberof NgAttributeDirectives
 */
app.directive( 'awOnLoad', function() {
    return {
        restrict: 'A',
        priority: 9999,
        scope: {
            awOnLoadCallBack: '&awOnLoad'
        },
        link: function( $scope, $element ) {
            $element.on( 'load', function() {
                return $scope.awOnLoadCallBack();
            } );
        }
    };
} );

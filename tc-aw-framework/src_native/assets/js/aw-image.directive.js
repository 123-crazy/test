// Copyright (c) 2020 Siemens

/**
 * Directive to display a thumbnail img using xrt thumbnail image styling .
 *
 * @module js/aw-image.directive
 */
import app from 'app';
import declUtils from 'js/declUtils';

/**
 * Directive to display a thumbnail img using xrt thumbnail image styling.
 *
 * @example <aw-image source="vpProp.url"></aw-image>
 *
 * @member aw-image
 * @memberof NgElementDirectives
 */
app.directive( 'awImage', [ function() {
    return {
        restrict: 'E',
        scope: {
            source: '=',
            isIcon: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-image.directive.html',
        replace: true,
        link: function( $scope ) {
            if( !declUtils.isNil( $scope.source ) ) {
                $scope.source = $scope.source.replace( /\bassets\b\//gm, app.getBaseUrlPath() + '/' );
            }
        }
    };
} ] );

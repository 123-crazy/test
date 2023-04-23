// Copyright (c) 2020 Siemens

/**
 * Directive to display an image.
 *
 * @module js/aw-pic.directive
 */
import app from 'app';
import 'js/aw-icon.directive';
import 'js/exist-when.directive';

/**
 * Directive to display an image.
 *
 * @example <aw-pic source="vpProp.url" alt="{{vmprop.propertyDisplayName}}" />
 * @example <aw-pic iconId="vpProp.iconID" />
 * @example <aw-pic class="aw-widget-thumbnail" iconId="vpProp.iconID" />
 *
 * @member aw-pic
 * @memberof NgElementDirectives
 *
 * @returns {Object} - Directive's declaration details
 */
app.directive( 'awPic', [ function() {
    return {
        restrict: 'E',
        scope: {
            source: '=',
            iconId: '=',
            alt: '@'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-pic.directive.html',
        link: function( $scope, $element ) {
            $element.addClass( 'aw-widget-pic' );

            if( $scope.source ) {
                $scope.source = $scope.source.replace( /\bassets\b\//gm, app.getBaseUrlPath() + '/' );

                if( !$scope.alt ) {
                    $scope.alt = $scope.source;

                    var src = $scope.source;
                    $scope.alt = src.substring( src.lastIndexOf( '/' ) + 1 );
                }
            }
        }
    };
} ] );

// Copyright (c) 2020 Siemens

/**
 * Directive to display the selection summary of multiple model objects.
 *
 * @module js/aw-native-sublocation.directive
 */
import app from 'app';
import ngModule from 'angular';
import 'js/aw.native.sublocation.controller';
import 'js/aw-workarea-title.directive';
import 'js/aw-primary-workarea.directive';
import 'js/aw-secondary-workarea.directive';
import 'js/aw-sublocation.directive';
import 'js/aw-splitter.directive';
import 'js/aw-include.directive';
import 'js/exist-when.directive';

/**
 * Directive to display the selection summary of multiple model objects.
 *
 * @example <aw-native-sublocation>My content here!</aw-native-sublocation>
 *
 * @member aw-native-sublocation
 * @memberof NgElementDirectives
 */
app.directive( 'awNativeSublocation', [ function() {
    return {
        restrict: 'E',
        templateUrl: app.getBaseUrlPath() + '/html/aw.native.sublocation.html',
        transclude: true,
        scope: {
            provider: '=',
            baseSelection: '=?',
            showBaseSelection: '=?',
            controller: '@?'
        },
        controller: [
            '$scope',
            '$controller',
            function( $scope, $controller ) {
                var ctrl = this;
                ngModule.extend( ctrl, $controller( $scope.hasOwnProperty( 'controller' ) ? $scope.controller :
                    'NativeSubLocationCtrl', {
                        $scope: $scope
                    } ) );
            }
        ]
    };
} ] );

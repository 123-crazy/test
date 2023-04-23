// Copyright (c) 2020 Siemens

/**
 * Directive to support arrange cell implementation.
 *
 * @module js/arrange-cell.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/aw-list.controller';

/**
 * Directive for arrange cell implementation.
 *
 * @member arrangeCell
 * @memberof NgElementDirectives *
 * @deprecated afx@4.1.0.
 * @alternative NA
 * @obsoleteIn afx@5.0.0
 */
app.directive( 'arrangeCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        controller: [ '$scope', function( $scope ) {
            $scope.$watch( 'vmo.visible', function watchColumnDefVisibility() {
                $scope.vmo.hiddenFlag = !$scope.vmo.visible;
                eventBus.publish( 'columnVisibilityChanged', $scope.vmo );
            } );
        } ],
        templateUrl: app.getBaseUrlPath() + '/html/arrange-cell.directive.html'
    };
} ] );

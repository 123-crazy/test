/* Copyright (c) 2020 Siemens */

/**
 * Directive to display notification cell
 *
 * @module js/aw-notification-cell.directive
 */

import app from 'app';
import 'js/aw-row.directive';
import 'js/aw-click.directive';
import 'js/aw-cell-command-bar.directive';
import 'js/aw-clickable-title.directive';
import 'js/aw-include.directive';
import 'js/aw-repeat.directive';
import 'js/aw-class.directive';
import 'js/aw-icon.directive';

/**
 * Directive to display notification cell
 *
 * @example <aw-notification-cell vmo = "item"> </aw-notification-cell>
 *
 * @member aw-notification-cell
 */
app.directive( 'awNotificationCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '<'
        },
        controller: [ '$scope', function( $scope ) {
            var notificationLevels = {
                high: 'high',
                medium: 'medium',
                low: 'low'
            };

            $scope.isHighNotificationlevel = $scope.vmo.notificationLevel === notificationLevels.high;
            $scope.isMediumNotificationlevel = $scope.vmo.notificationLevel === notificationLevels.medium;
            $scope.isLowNotificationlevel = $scope.vmo.notificationLevel === notificationLevels.low;

            $scope.isIconIncluded = $scope.vmo.typeIconURL !== undefined;
            $scope.isCustomViewIncluded = $scope.vmo.viewName !== undefined;

            $scope.onNotificationClickAction = function( selectedObject ) {
                selectedObject.notificationRead = true;
            };
        } ],
        templateUrl: app.getBaseUrlPath() + '/html/aw-notification-cell.directive.html'
    };
} ] );

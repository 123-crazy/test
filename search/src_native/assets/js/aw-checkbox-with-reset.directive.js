// Copyright (c) 2020 Siemens

/**
 * List populated by ng-repeat from controller's lov data and progressively loaded via the data services.
 *
 * @module js/aw-checkbox-with-reset.directive
 */
import app from 'app';
import 'js/aw.checkbox.with.reset.controller';
import 'js/aw-property-label.directive';
import 'js/aw-property-image.directive';
import 'js/aw-pattern.directive';
import 'js/aw-when-scrolled.directive';
import 'js/aw-property-checkbox-val.directive';
import 'js/aw-click.directive';
import 'js/aw-popup-panel2.directive';
import 'js/aw-icon.directive';

/**
 * List populated by ng-repeat from controller's lov data and progressively loaded via the data services.
 *
 * @example <aw-checkbox-with-reset prop="prop"></aw-checkbox-with-reset>
 *
 * @member aw-checkbox-with-reset
 * @memberof NgElementDirectives
 */
app.directive( 'awCheckboxWithReset', function() {
    return {
        restrict: 'E',
        scope: {
            prop: '=',
            resetAction: '@'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-checkbox-with-reset.directive.html',
        controller: 'awCheckboxWithResetController',
        link: function( $scope ) {
            $scope.popupTemplate = '/html/aw-checkbox-with-reset.popup-template.html';
        }
    };
} );

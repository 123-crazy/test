// Copyright (c) 2020 Siemens

/**
 * List populated by ng-repeat from controller's lov data and progressively loaded via the data services.
 *
 * @module js/aw-checkbox-list.directive
 */
import app from 'app';
import 'js/aw.checkbox.list.controller';
import 'js/aw-property-image.directive';
import 'js/aw-when-scrolled.directive';
import 'js/aw-property-checkbox-val.directive';
import 'js/aw-click.directive';
import 'js/aw-popup-panel2.directive';
import 'js/aw-property-lov-child.directive';

/**
 * List populated by ng-repeat from controller's lov data and progressively loaded via the data services.
 *
 * @example <aw-checkbox-list prop="prop"></aw-checkbox-list>
 *
 * @member aw-checkbox-list
 * @memberof NgElementDirectives
 */
app.directive( 'awCheckboxList', function() {
    return {
        restrict: 'E',
        scope: {
            prop: '=?'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-checkbox-list.directive.html',
        controller: 'awCheckboxListController',
        link: function( $scope ) {
            $scope.popupTemplate = '/html/aw-checkbox-list.popup-template.html';
        }
    };
} );

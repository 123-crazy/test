// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-property-time-val) directive.
 *
 * @module js/aw-property-time-val.directive
 */
import app from 'app';
import 'js/aw.date.time.controller';
import 'js/aw-property-error.directive';
import 'js/aw-property-lov-child.directive';
import 'js/aw-validator.directive';
import 'js/aw-when-scrolled.directive';
import 'js/aw-widget-initialize.directive';
import 'js/aw-property-image.directive';
import 'js/aw-popup-panel2.directive';

/**
 * Definition for the (aw-property-time-val) directive.
 *
 * @example TODO
 *
 * @member aw-property-time-val
 * @memberof NgElementDirectives
 */
app.directive( 'awPropertyTimeVal', function() {
    return {
        restrict: 'E',
        scope: {
            // prop comes from the parent controller's scope
            prop: '='
        },
        controller: 'awDateTimeController',
        templateUrl: app.getBaseUrlPath() + '/html/aw-property-time-val.directive.html',
        link: function( $scope ) {
            $scope.popupTemplate = '/html/aw-property-time-val.popup-template.html';
        }
    };
} );

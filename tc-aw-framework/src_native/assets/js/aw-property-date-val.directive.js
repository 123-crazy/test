// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-property-date-val) directive.
 *
 * @module js/aw-property-date-val.directive
 */
import app from 'app';
import 'js/aw.date.time.controller';
import 'js/aw-property-error.directive';
import 'js/aw-datebox.directive';
import 'js/aw-validator.directive';
import 'js/aw-widget-initialize.directive';
import 'js/aw-property-image.directive';

/**
 * Definition for the (aw-property-date-val) directive.
 *
 * @example TODO
 *
 * @member aw-property-date-val
 * @memberof NgElementDirectives
 */
app.directive( 'awPropertyDateVal', function() {
    return {
        restrict: 'E',
        scope: {
            // prop comes from the parent controller's scope
            prop: '=',
            changeAction: '@?',
            quickNav: '@?'
        },
        controller: 'awDateTimeController',
        templateUrl: app.getBaseUrlPath() + '/html/aw-property-date-val.directive.html'
    };
} );

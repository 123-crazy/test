// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-property-date-time-val) directive
 *
 * @module js/aw-property-date-time-val.directive
 */
import app from 'app';
import 'js/uwDirectiveDateTimeService';
import 'js/aw-property-date-val.directive';
import 'js/aw-property-lov-val.directive';
import 'js/aw-property-non-edit-val.directive';
import 'js/aw-property-time-val.directive';

/**
 * Definition for the (aw-property-date-time-val) directive
 *
 * @member aw-property-date-time-val
 * @memberof NgElementDirectives
 */
app.directive( 'awPropertyDateTimeVal', [
    'uwDirectiveDateTimeService',
    function( uwDirectiveDateTimeSvc ) {
        /**
         * Note: We need to include 'uwDirectiveDateTimeService' since there is initialization that occurs during the
         * load.
         */
        uwDirectiveDateTimeSvc.assureDateTimeLocale();

        return {
            restrict: 'E',
            scope: {
                // prop comes from the parent controller's scope
                prop: '=',
                changeAction: '@?',
                quickNav: '@?'
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-property-date-time-val.directive.html'
        };
    }
] );

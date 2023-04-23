// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-property-date-time-val) directive.
 *
 * @module js/aw-property-date-time.directive
 */
import app from 'app';
import 'js/uwDirectiveDateTimeService';
import 'js/aw-property-date-time-val.directive';
import 'js/aw-property-non-edit-val.directive';

/**
 * Definition for the (aw-property-date-time-val) directive.
 *
 * @member aw-property-date-time
 * @memberof NgElementDirectives
 */
app.directive( 'awPropertyDateTime', [
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
                prop: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-property-date-time.directive.html'
        };
    }
] );

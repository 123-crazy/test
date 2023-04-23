// Copyright (c) 2020 Siemens

/**
 * List populated by ng-repeat from controller's lov data and progressively loaded via the data services.
 *
 * @module js/aw-checkbox-multiselect.directive
 */
import app from 'app';
import 'js/aw-property-label.directive';
import 'js/aw-pattern.directive';
import 'js/aw-checkbox-list.directive';

/**
 * List populated by ng-repeat from controller's lov data and progressively loaded via the data services.
 *
 * @example <aw-checkbox-multiselect prop="prop"></aw-checkbox-multiselect>
 *
 * @member aw-checkbox-multiselect
 * @memberof NgElementDirectives
 */
app.directive( 'awCheckboxMultiselect', function() {
    return {
        restrict: 'E',
        scope: {
            prop: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-checkbox-multiselect.directive.html'
    };
} );

// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-property-boolean) directive.
 *
 * @module js/aw-property-boolean.directive
 */
import app from 'app';
import 'js/aw-property-checkbox-val.directive';
import 'js/aw-property-non-edit-val.directive';
import 'js/aw-property-radio-button-val.directive';
import 'js/aw-property-toggle-button-val.directive';
import 'js/aw-property-tri-state-val.directive';

/**
 * Definition for the (aw-property-boolean) directive.
 *
 * @example TODO
 *
 * @member aw-property-boolean
 * @memberof NgElementDirectives
 *
 * @deprecated afx@4.3.0
 * @alternative <AwWidget>
 * @obsoleteIn afx@6.0.0
 *
 */
app.directive( 'awPropertyBoolean', function() {
    return {
        restrict: 'E',
        scope: {
            // 'prop' is defined in the parent (i.e. controller's) scope
            prop: '=',
            hint: '@'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-property-boolean.directive.html'
    };
} );

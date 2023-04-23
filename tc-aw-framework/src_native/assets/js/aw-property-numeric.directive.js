// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-property-numeric) directive.
 *
 * @module js/aw-property-numeric.directive
 */
import app from 'app';
import 'js/aw-property-non-edit-val.directive';
import 'js/aw-property-integer-val.directive';
import 'js/aw-property-double-val.directive';

/**
 * Definition for the (aw-property-numeric) directive.
 *
 * @example TODO
 *
 * @member aw-property-numeric
 * @memberof NgElementDirectives
 *
 * @deprecated afx@4.3.0.
 * @alternative <AwWidget>
 * @obsoleteIn afx@6.0.0
 */
app.directive( 'awPropertyNumeric', function() {
    return {
        restrict: 'E',
        scope: {
            // 'prop' is defined in the parent (i.e. controller's) scope
            prop: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-property-numeric.directive.html'
    };
} );

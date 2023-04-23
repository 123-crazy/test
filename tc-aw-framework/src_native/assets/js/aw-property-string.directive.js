// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-property-string) directive.
 *
 * @module js/aw-property-string.directive
 */
import app from 'app';
import 'js/aw-property-non-edit-val.directive';
import 'js/aw-property-string-val.directive';

/**
 * Definition for the (aw-property-string) directive.
 *
 * @example TODO
 *
 * @member aw-property-string
 * @memberof NgElementDirectives
 *
 * @deprecated afx@4.3.0.
 * @alternative none, not used anymore
 * @obsoleteIn afx@6.0.0
 */
app.directive( 'awPropertyString', function() {
    return {
        restrict: 'E',
        scope: {
            // 'prop' is defined in the parent (i.e. controller's) scope
            prop: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-property-string.directive.html'
    };
} );

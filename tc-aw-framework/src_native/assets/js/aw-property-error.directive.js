// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-property-error) directive.
 *
 * @module js/aw-property-error.directive
 */
import app from 'app';
import 'js/aw.property.error.controller';

/**
 * Definition for the (aw-property-error) directive.
 *
 * @example TODO
 *
 * @member aw-property-error
 * @memberof NgElementDirectives
 *
 * @deprecated afx@4.3.0.
 * @alternative none, not used anymore
 * @obsoleteIn afx@6.0.0
 */
app.directive( 'awPropertyError', function() {
    return {
        restrict: 'E',
        transclude: 'true',
        controller: 'awPropertyErrorController',
        templateUrl: app.getBaseUrlPath() + '/html/aw-property-error.directive.html'
    };
} );

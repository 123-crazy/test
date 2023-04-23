// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-property-rendering-hint) directive.
 *
 * @module js/aw-property-rendering-hint.directive
 */
import app from 'app';
import 'js/aw-property-non-edit-val.directive';
import 'js/aw-property-text-area-val.directive';
import 'js/aw-property-text-box-val.directive';

/**
 * Definition for the (aw-property-rendering-hint) directive.
 *
 * @example TODO
 *
 * @member aw-property-rendering-hint
 * @memberof NgElementDirectives
 */
app.directive( 'awPropertyRenderingHint', function() {
    return {
        restrict: 'E',
        scope: {
            // hint and prop are defined in the parent (i.e. controller's) scope
            hint: '=',
            prop: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-property-rendering-hint.directive.html'
    };
} );

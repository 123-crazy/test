// Copyright (c) 2020 Siemens

/**
 * Directive to display a numeric styling.
 *
 * @module js/aw-numeric.directive
 */
import app from 'app';
import 'js/aw-property-label.directive';
import 'js/aw-property-lov-val.directive';
import 'js/aw-property-non-edit-val.directive';
import 'js/aw-property-integer-val.directive';
import 'js/aw-property-double-val.directive';

/**
 * Directive to display a numeric styling.
 *
 * @example <aw-numeric prop="data.xxx"></aw-numeric>
 *
 * @member aw-numeric
 * @memberof NgElementDirectives
 */
app.directive( 'awNumeric', [ function() {
    return {
        restrict: 'E',
        scope: {
            // 'prop' is defined in the parent (i.e. controller's) scope
            prop: '=',
            changeAction: '@?'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-numeric.directive.html'
    };
} ] );

// Copyright (c) 2020 Siemens

/**
 * Directive to display a label styling.
 *
 * @module js/aw-label.directive
 */
import app from 'app';
import 'js/aw-property-label.directive';
import 'js/aw-property-non-edit-val.directive';

/**
 * Directive to display a label styling.
 *
 * @example <aw-label prop="data.xxx"></aw-label> *
 *
 * @member aw-label
 * @memberof NgElementDirectives
 */
app.directive( 'awLabel', [ function() {
    return {
        restrict: 'E',
        scope: {
            // 'prop' is defined in the parent (i.e. controller's) scope
            prop: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-label.directive.html'
    };
} ] );

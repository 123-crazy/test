// Copyright (c) 2020 Siemens

/**
 * Directive to display a textarea styling.
 *
 * @module js/aw-textarea.directive
 */
import app from 'app';
import 'js/aw-property-label.directive';
import 'js/aw-property-lov-val.directive';
import 'js/aw-property-non-edit-val.directive';
import 'js/aw-property-text-area-val.directive';

/**
 * Directive to display a textarea styling.
 *
 * @example <aw-textarea prop="data.xxx"></aw-textarea>
 *
 * @member aw-textarea
 * @memberof NgElementDirectives
 */
app.directive( 'awTextarea', [ function() {
    return {
        restrict: 'E',
        scope: {
            // 'prop' is defined in the parent (i.e. controller's) scope
            prop: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-textarea.directive.html'
    };
} ] );

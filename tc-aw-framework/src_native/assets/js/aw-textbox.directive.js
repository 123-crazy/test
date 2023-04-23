// Copyright (c) 2020 Siemens

/**
 * Directive to display a textbox styling.
 *
 * @module js/aw-textbox.directive
 */
import app from 'app';
import 'js/aw-property-label.directive';
import 'js/aw-property-lov-val.directive';
import 'js/aw-property-non-edit-val.directive';
import 'js/aw-property-text-box-val.directive';
import 'js/exist-when.directive';

/**
 * Directive to display a textbox styling.
 *
 * @example <aw-textbox prop="data.xxx"></aw-textbox>
 *
 * @member aw-textbox
 * @memberof NgElementDirectives
 */
app.directive( 'awTextbox', [ function() {
    return {
        restrict: 'E',
        scope: {
            // 'prop' is defined in the parent (i.e. controller's) scope
            prop: '='
        },
        replace: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-textbox.directive.html'
    };
} ] );

// Copyright (c) 2020 Siemens

/**
 * Directive to display a toggle button styling.
 *
 * @module js/aw-togglebutton.directive
 */
import app from 'app';
import 'js/aw-property-label.directive';
import 'js/aw-property-toggle-button-val.directive';

/**
 * Directive to display a toggle button styling.
 *
 * @example <aw-togglebutton prop="data.xxx"></aw-togglebutton>
 *
 * @member aw-togglebutton
 * @memberof NgElementDirectives
 * @deprecated : 'changeAction' is deprecated we should use action instead.
 */
app.directive( 'awTogglebutton', [ function() {
    return {
        restrict: 'E',
        scope: {
            // 'prop' is defined in the parent (i.e. controller's) scope
            prop: '=',
            changeAction: '@?',
            action: '@?'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-togglebutton.directive.html'
    };
} ] );

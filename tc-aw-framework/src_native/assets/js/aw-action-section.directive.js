// Copyright (c) 2020 Siemens

/**
 * Directive to display a section containing some actions like buttons in a panel footer.
 *
 * @module js/aw-action-section.directive
 * @deprecated afx@4.1.0, Moving away from angular.
 * @alternative aw-panel-section
 * @obsoleteIn afx@5.0.0
 */
import * as app from 'app';

/**
 * Directive to display a section containing some actions like buttons in a panel footer.
 *
 * @example <aw-action-section></aw-action-section>
 *
 * @member aw-action-section
 * @memberof NgElementDirectives
 */
app.directive( 'awActionSection', [ function() {
    return {
        restrict: 'E',
        transclude: true,
        template: '<div class="aw-layout-actionSection" ng-transclude></div>'
    };
} ] );

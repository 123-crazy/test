// Copyright (c) 2020 Siemens

/**
 * @module js/aw-filter-separator.directive
 */
import app from 'app';
import 'js/visible-when.directive';
import 'js/aw-i18n.directive';

/**
 * Directive to display search categories.
 *
 * @example <aw-filter-separator ></aw-filter-separator>
 *
 * @member aw-filter-separator
 * @memberof NgElementDirectives
 */
app.directive( 'awFilterSeparator', [ function() {
    return {
        restrict: 'E',
        transclude: true,
        scope: {},
        template: '<div class="aw-ui-filterSeparator" ng-transclude ></div>',
        replace: true
    };
} ] );

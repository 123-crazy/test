// Copyright (c) 2020 Siemens

/**
 * Directive to display a break xrt styling.
 *
 * @module js/aw-separator.directive
 */
import app from 'app';

/**
 * Directive to display a break xrt styling.
 *
 * @example <aw-separator></aw-separator>
 *
 * @member aw-separator
 * @memberof NgElementDirectives
 */
app.directive( 'awSeparator', [ function() {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-separator.directive.html',
        scope: {
            isVertical: '=?'
        }
    };
} ] );

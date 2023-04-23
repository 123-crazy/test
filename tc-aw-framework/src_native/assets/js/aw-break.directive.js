// Copyright (c) 2020 Siemens

/**
 * Directive to display a break xrt styling.
 *
 * @module js/aw-break.directive
 */
import app from 'app';

/**
 * Directive to display a break xrt styling.
 *
 * @example <aw-break></aw-break>
 *
 * @member aw-break
 * @memberof NgElementDirectives
 */
app.directive( 'awBreak', [ function() {
    return {
        restrict: 'E',
        template: '<div class="aw-xrt-sectionBreak"></div>',
        replace: true
    };
} ] );

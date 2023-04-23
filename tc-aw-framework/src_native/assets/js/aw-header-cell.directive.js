// Copyright (c) 2020 Siemens

/**
 * Directive to support header cell implementation
 *
 * @module js/aw-header-cell.directive
 */
import app from 'app';

/**
 * Directive for header cell implementation.
 *
 * @example <aw-header-cell title="Title"></aw-header-cell>
 *
 * @member aw-header-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awHeaderCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            title: '@'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-header-cell.directive.html'
    };
} ] );

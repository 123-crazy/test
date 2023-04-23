// Copyright (c) 2020 Siemens

/**
 * Directive to support dynamic config command cell implementation.
 *
 * @module js/aw-action-cell.directive
 */
import app from 'app';

// eslint-disable-next-line valid-jsdoc
/**
 * Directive for aw-action-cell implementation.
 *
 * @example <aw-action-cell vmo="model"></aw-action-cell>
 *
 * @member aw-action-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awActionCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        transclude: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-action-cell.directive.html'
    };
} ] );

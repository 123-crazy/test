// Copyright (c) 2020 Siemens

/**
 * Directive to support dynamic config command cell implementation.
 *
 * @module js/aw-toolbar-cell.directive
 */
import app from 'app';

// eslint-disable-next-line valid-jsdoc
/**
 * Directive for aw-toolbar-cell implementation.
 *
 * @example <aw-toolbar-cell vmo="model"></aw-toolbar-cell>
 *
 * @member aw-toolbar-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awToolbarCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        transclude: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-toolbar-cell.directive.html'
    };
} ] );

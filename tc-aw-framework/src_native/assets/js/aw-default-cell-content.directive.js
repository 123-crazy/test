// Copyright (c) 2020 Siemens

/**
 * Directive to support default cell content implementation.
 *
 * @module js/aw-default-cell-content.directive
 */
import app from 'app';
import 'js/aw-visual-indicator.directive';
import 'js/aw-highlight-property-html.directive';
import 'js/aw-clickable-title.directive';

/**
 * Directive for default cell content implementation.
 *
 * @example <aw-default-cell-content vmo="model"></aw-default-cell-content>
 *
 * @member aw-default-cell-content
 * @memberof NgElementDirectives
 */
app.directive( 'awDefaultCellContent', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-default-cell-content.directive.html'
    };
} ] );

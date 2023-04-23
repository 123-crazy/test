// Copyright (c) 2020 Siemens

/**
 * Directive to support default cell implementation.
 *
 * @module js/aw-default-cell.directive
 */
import app from 'app';
import 'js/aw-model-icon.directive';
import 'js/aw-default-cell-content.directive';

/**
 * Directive for default cell implementation.
 *
 * @example <aw-default-cell vmo="model"></aw-default-cell>
 * @example <aw-default-cell vmo="model" hideoverlay="true"></aw-default-cell>
 *
 * @member aw-default-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awDefaultCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '=',
            hideoverlay: '<?'
        },
        transclude: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-default-cell.directive.html'
    };
} ] );

// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Directive to support change owner panel list cell implementation.
 * 
 * @module js/aw-changeowner-cell.directive
 */
import * as app from 'app';
import 'js/aw-model-icon.directive';
import 'js/aw-changeowner-cell-content.directive';

/**
 * Directive for change owner panel list cell implementation.
 * 
 * @example <aw-changeowner-cell vmo="model"></aw-changeowner-cell>
 * 
 * @member aw-changeowner-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awChangeownerCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        transclude: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-changeowner-cell.directive.html'
    };
} ] );

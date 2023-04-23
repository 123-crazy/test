// Copyright (c) 2020 Siemens

/**
 * Directive to display the selection summary of multiple model objects.
 *
 * @module js/aw-base-sublocation.directive
 * @requires app
 */
import app from 'app';
import 'js/aw.base.sublocation.controller';
import 'js/aw-sublocation.directive';
import 'js/aw-transclude-replace.directive';

/**
 * Directive to display the selection summary of multiple model objects.
 *
 * @example <aw-base-sublocation>My content here!</aw-base-sublocation>
 *
 * @member aw-base-sublocation
 * @memberof NgElementDirectives
 */
app.directive( 'awBaseSublocation', [ function() {
    return {
        restrict: 'E',
        templateUrl: app.getBaseUrlPath() + '/html/aw-base-sublocation.directive.html',
        transclude: true,
        scope: {
            provider: '=',
            baseSelection: '=?'
        },
        controller: 'BaseSubLocationCtrl'
    };
} ] );

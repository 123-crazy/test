// Copyright (c) 2020 Siemens

/**
 * Defines the {@link NgElementDirectives.aw-header-subtitle}
 *
 * @module js/aw-header-subtitle.directive
 * @requires app
 */
import app from 'app';
import 'js/aw-include.directive';
import 'js/aw-header-context.directive';
import 'js/aw-repeat.directive';

/**
 * Directive to display the header subtitle for User/Group/Role etc.
 *
 * @example <aw-header-subtitle></aw-header-subtitle>
 *
 * @member aw-header-subtitle
 * @memberof NgElementDirectives
 * @deprecated afx@4.1.0.
 * @alternative NA
 * @obsoleteIn afx@5.0.0
 */
app.directive( 'awHeaderSubtitle', [ function() {
    return {
        restrict: 'E',
        scope: {},
        controller: [ '$scope', function( $scope ) {

        } ],
        templateUrl: app.getBaseUrlPath() + '/html/aw-header-subtitle.directive.html'
    };
} ] );

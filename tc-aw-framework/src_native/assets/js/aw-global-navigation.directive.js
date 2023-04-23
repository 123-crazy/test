// Copyright (c) 2020 Siemens

/**
 * Defines the {@link NgElementDirectives.aw-global-navigation}
 *
 * @module js/aw-global-navigation.directive
 */
import app from 'app';
import 'js/aw-row.directive';
import 'js/aw-column.directive';
import 'js/aw-include.directive';
import 'js/aw-sidenav.directive';

/**
 * Directive to display the global navigation toolbar.
 * @example <aw-global-navigation></aw-global-navigation>
 *
 * @member aw-global-navigation
 * @memberof NgElementDirectives
 *
 * @deprecated afx@4.3.0.
 * @alternative <AwSidenav>
 * @obsoleteIn afx@5.1.0
 */

app.directive( 'awGlobalNavigation', [
    'appCtxService',
    function( appCtxService ) {
        return {
            restrict: 'E',
            replace: false,
            scope: {
                toolbarView: '@'
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-global-navigation.directive.html',
            link: function( $scope ) {
                $scope.sideNavData = {
                    slide: 'FLOAT',
                    direction: 'LEFT_TO_RIGHT',
                    animation: true,
                    width: 'STANDARD',
                    height: 'FULL',
                    isPinnable: true
                };
            },
            controller: [ '$scope', function( $scope ) {
                $scope.ctx = appCtxService.ctx;
            } ]
        };
    }
] );

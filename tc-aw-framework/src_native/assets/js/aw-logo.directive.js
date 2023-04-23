// Copyright (c) 2020 Siemens

/**
 * Defines the {@link NgElementDirectives.aw-global-toolbar}
 *
 * @module js/aw-logo.directive
 */
import app from 'app';
import 'js/appCtxService';
import 'js/aw-progress-indicator.directive';
import 'js/aw-command-bar.directive';
import 'js/aw-icon.directive';

/**
 * Directive to display the global toolbar. Consists of a command bar with global commands and the Siemens logo. The
 * Siemens logo can be hidden with a UI configuration option.
 *
 * @example <aw-global-toolbar></aw-global-toolbar>
 *
 * @member aw-global-toolbar
 * @memberof NgElementDirectives
 */
app.directive( 'awLogo', [ 'appCtxService', function( appCtxSvc ) {
    return {
        restrict: 'E',
        scope: {},
        templateUrl: app.getBaseUrlPath() + '/html/aw-logo.directive.html',
        link: function( $scope ) {
            $scope.logoEnabled = true;

            if( appCtxSvc.getCtx( 'aw_hosting_enabled' ) ) {
                $scope.logoEnabled = appCtxSvc.getCtx( 'aw_hosting_config.ShowSiemensLogo' );
            }
        }
    };
} ] );

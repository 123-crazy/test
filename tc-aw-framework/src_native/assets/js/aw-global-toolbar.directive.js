// Copyright (c) 2020 Siemens

/**
 * Defines the {@link NgElementDirectives.aw-global-toolbar}
 *
 * @module js/aw-global-toolbar.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/configurationService';
import 'js/appCtxService';
import 'js/localStorage';
import 'js/localeService';
import 'js/aw-progress-indicator.directive';
import 'js/aw-command-bar.directive';
import 'js/aw-icon.directive';
import 'js/aw-column.directive';
import 'js/aw-header-context.directive';
import 'js/aw-row.directive';
import 'js/aw-avatar.directive';
import 'js/aw-include.directive';

/**
 * Directive to display the global toolbar. Consists of a command bar with global commands and the Siemens logo. The
 * Siemens logo can be hidden with a UI configuration option. Clicking the logo will print debug information.
 *
 * @example <aw-global-toolbar></aw-global-toolbar>
 *
 * @member aw-global-toolbar
 * @memberof NgElementDirectives
 *
 * @deprecated afx@4.3.0.
 * @alternative none, not used anymore
 * @obsoleteIn afx@5.1.0
 */
app.directive( 'awGlobalToolbar', [
    'appCtxService', 'localStorage', 'localeService',
    function( appCtxSvc, localStrg, localeSvc ) {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                vmo: '=?'
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-global-toolbar.directive.html',
            link: function( $scope ) {
                $scope.logoEnabled = true;
                var _globalTBState = 'globalTBState';
                $scope.ctx = appCtxSvc.ctx;

                localeSvc.getTextPromise().then( function( localTextBundle ) {
                    $scope.closeText = localTextBundle.CLOSE_PANEL;
                    $scope.openText = localTextBundle.OPEN_PANEL;
                } );

                if( localStrg.get( _globalTBState ) ) {
                    $scope.ctx.globalToolbarExpanded = localStrg.get( _globalTBState ) === 'true';
                } else {
                    $scope.ctx.globalToolbarExpanded = false;
                }

                if( appCtxSvc.getCtx( 'aw_hosting_enabled' ) ) {
                    $scope.logoEnabled = appCtxSvc.getCtx( 'aw_hosting_config.ShowSiemensLogo' );
                }

                // When a chevron in bread crumb is globalToolbarExpanded
                $scope.onChevronClick = function( selectedCrumb, event ) {
                    $scope.$evalAsync( function() {
                        $scope.ctx.globalToolbarExpanded = !$scope.ctx.globalToolbarExpanded;
                        localStrg.publish( _globalTBState, $scope.ctx.globalToolbarExpanded );
                        $scope.ctx.globalToolbarOverlay = false;
                    } );
                };

                ( function handleProPicClickEvent() {
                    // Add listener
                    var subDef = eventBus.subscribe( 'onProPicClick', function() {
                        $scope.$evalAsync( $scope.onProPicClick );
                    } );

                    // And remove it when the scope is destroyed
                    $scope.$on( '$destroy', function() {
                        eventBus.unsubscribe( subDef );
                    } );
                } )();

                $scope.onProPicClick = function() {
                    $scope.$evalAsync( function() {
                        if( !$scope.ctx.globalToolbarExpanded ) {
                            $scope.ctx.globalToolbarExpanded = true;
                            $scope.ctx.globalToolbarOverlay = true;
                            // Fire commandBarResized event so that the command overflow can be recalculated
                            eventBus.publish( 'commandBarResized' );
                        } else {
                            $scope.ctx.globalToolbarExpanded = false;
                            $scope.ctx.globalToolbarOverlay = false;
                        }
                    } );
                };

                // When a state parameter changes
                $scope.$on( '$locationChangeSuccess', function() {
                    if( $scope.ctx.globalToolbarOverlay ) {
                        $scope.ctx.globalToolbarExpanded = false;
                        $scope.ctx.globalToolbarOverlay = false;
                    }
                } );
            }
        };
    }
] );

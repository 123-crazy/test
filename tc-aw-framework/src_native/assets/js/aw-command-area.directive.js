// Copyright (c) 2020 Siemens

/**
 * @module js/aw-command-area.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/aw-command-area.controller';
import 'js/appCtxService';
import 'js/aw-include.directive';

/**
 * Defines the aw-command-area directive.
 *
 * @example <aw-command-area area="navigation"></aw-command-area area>
 *
 * @member aw-command-area
 * @memberof NgElementDirectives
 * @deprecated afx@4.1.0.
 * @alternative aw-sidenav
 * @obsoleteIn afx@5.0.0
 */
app.directive( 'awCommandArea', [
    'appCtxService',
    function( appCtxService ) {
        return {
            restrict: 'E',
            scope: {
                area: '@'
            },
            replace: true,
            templateUrl: app.getBaseUrlPath() + '/html/aw-command-area.directive.html',
            controller: 'awCommandAreaController',
            link: function( $scope, $element, $attrs, $controller ) {
                var initialCommand = appCtxService.getCtx( $controller._commandContext );
                if( initialCommand ) {
                    $controller.updateCommand( initialCommand );
                }

                // When the active command context changes update the command display
                var subDef = eventBus.subscribe( 'appCtx.register', function( data ) {
                    if( data.name === $controller._commandContext ) {
                        $controller.updateCommand( data.value );
                    }
                } );

                // Remove listener when scope is destroyed
                $scope.$on( '$destroy', function() {
                    if( $scope.command ) {
                        $scope.command.isSelected = false;
                        $scope.command = null;
                    }
                    eventBus.unsubscribe( subDef );
                } );
            }
        };
    }
] );

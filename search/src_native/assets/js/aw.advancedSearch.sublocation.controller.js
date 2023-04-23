// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Defines the {@link NgControllers.AdvancedSearchSubLocationCtrl}
 *
 * @module js/aw.advancedSearch.sublocation.controller
 * @requires app
 * @requires angular
 * @requires js/eventBus
 * @requires js/aw.default.location.controller
 */
import app from 'app';
import ngModule from 'angular';
import eventBus from 'js/eventBus';
import 'js/aw.native.sublocation.controller';
import 'js/appCtxService';
import 'js/localeService';
import 'js/command.service';

'use strict';
/*eslint-disable-next-line valid-jsdoc*/
/**
 * Advanced search sublocation controller.
 * @memberOf NgControllers
 */
app
    .controller(
        'AdvancedSearchSubLocationCtrl',
        [
            '$scope',
            '$state',
            '$controller',
            '$timeout',
            'appCtxService',
            'commandService',
            function( $scope, $state, $controller, $timeout, appCtxService, commandService ) {
                var ctrl = this;
                var panelOpen = false;
                //DefaultSubLocationCtrl will handle setting up context correctly
                ngModule.extend( ctrl, $controller( 'NativeSubLocationCtrl', {
                    $scope: $scope
                } ) );

                var ctxAdvancedSearch = appCtxService.getCtx( "advancedSearch" );
                if( !ctxAdvancedSearch ) {
                    var advancedSearch = {
                        criteria: ""
                    };
                    appCtxService.registerCtx( "advancedSearch", advancedSearch );
                }

                if( !appCtxService.ctx.activeNavigationCommand && $state.params.savedQueryName ) {
                    commandService.executeCommand( 'Awp0AdvancedSearch', null, $scope );
                    panelOpen = true;
                }
                var doSearchListener = eventBus.subscribe( 'search.doAdvancedSearch', function( eventData ) {
                    if( $scope.provider && $scope.provider.params ) {
                        $scope.provider.params.searchCriteria = eventData;
                    }
                    eventBus.publish( 'primaryWorkarea.reset' );
                } );

                var openPanel = function() {
                    if( !( appCtxService.ctx.activeNavigationCommand && appCtxService.ctx.activeNavigationCommand.commandId === 'Awp0AdvancedSearch' ) ) {
                        var ctxSearch = appCtxService.getCtx( "search" );
                        if( !( typeof ctxSearch !== 'undefined' && ctxSearch.totalFound > 0 ) && !panelOpen ) {
                            $timeout( function() {
                                commandService.executeCommand( 'Awp0AdvancedSearch', null, $scope );
                            }, 300 );
                        }
                    }
                };

                //Remove listeners on destroy
                $scope.$on( '$destroy', function() {
                    eventBus.unsubscribe( doSearchListener );
                } );

                //When a state parameter changes
                $scope.$on( '$locationChangeSuccess', function() {
                    //Update the provider

                    openPanel();
                    var context = appCtxService.getCtx( 'advancedSearch' );
                    if( context && context.searchCriteria && $scope.provider && $scope.provider.params ) {
                        $scope.provider.params.searchCriteria = context.searchCriteria.uiValue;
                    }
                } );
            }
        ] );

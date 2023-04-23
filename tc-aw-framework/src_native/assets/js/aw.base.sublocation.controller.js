// Copyright (c) 2020 Siemens

/**
 * Defines the {@link NgControllers.BaseSubLocationCtrl}
 *
 * @module js/aw.base.sublocation.controller
 * @requires app
 * @requires js/command.service
 * @requires js/aw-workarea-title.directive
 * @requires js/aw-command-bar.directive
 */
import app from 'app';
import $ from 'jquery';
import ngModule from 'angular';
import logger from 'js/logger';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/aw-sublocation.directive';
import 'js/selection.service';
import 'soa/kernel/propertyPolicyService';
import 'js/appCtxService';
import 'js/command.service';

/* eslint-disable-next-line valid-jsdoc*/
/**
 * Base sublocation controller.
 *
 * @class BaseSubLocationCtrl
 * @memberOf NgControllers
 */
app.controller( 'BaseSubLocationCtrl', [
    '$scope',
    '$state',
    '$q',
    'appCtxService',
    'selectionService',
    'soa_kernel_propertyPolicyService',
    'commandService',
    function( $scope, $state, $q, appCtxService, selectionService,
        propertyPolicyService, commandService ) {
        var ctrl = this;

        /**
         * {SubscriptionDefeninitionArray} Cached eventBus subscriptions.
         */
        var _eventBusSubDefs = [];

        // This controller can be used within the base sublocation directive
        // Or as controller for a state
        if( !$scope.provider ) {
            $scope.provider = $state.current.data ? $state.current.data : {};
            $scope.provider.name = $state.current.name;
        }

        // Stick the $state parameters into the provider automatically
        $scope.provider.params = ngModule.copy( $state.params );

        // When a state parameter changes
        $scope.$on( '$locationChangeSuccess', function() {
            // Update the provider
            $scope.provider.params = ngModule.copy( $state.params );
            if( $state.params.commandID ) {
                return commandService.executeCommand( $state.params.commandID, $state.params.cmdArg, $scope )
                    // Log error or success message
                    .then(
                        function() {
                            logger.trace( 'Executed command: ' + $state.params.commandID + ' with args ' +
                                $state.params.cmdArg + ' from url' );
                        },
                        function( errorMessage ) {
                            logger.error( errorMessage );
                        } );
            }
        } );

        /**
         * Register contexts specific to this sublocation
         */
        var registerSubLocationContext = function() {
            var contextConstants = {
                location: 'locationContext',
                sublocationInLocation: 'ActiveWorkspace:SubLocation',
                sublocation: 'sublocation',
                taiCmd: 'activeToolsAndInfoCommand',
                navCmd: 'activeNavigationCommand',
                sidenavCmd: 'sidenavCommandId'
            };

            // Update the location context
            var locationContext = appCtxService.getCtx( contextConstants.location ) || {};
            locationContext[ contextConstants.sublocationInLocation ] = $scope.provider.name.replace( /_/g,
                '.' );
            appCtxService.registerCtx( contextConstants.location, locationContext );

            // Update the sublocation context
            var initialContext = {
                clientScopeURI: $scope.provider.clientScopeURI,
                historyNameToken: $scope.provider.name,
                label: $scope.provider.label,
                nameToken: $scope.provider.nameToken
            };
            appCtxService.registerCtx( contextConstants.sublocation, initialContext );

            // Setup some contexts that will be cleared when the sublocation is changed
            var _contextsToClear = [ contextConstants.taiCmd, contextConstants.navCmd, contextConstants.sidenavCmd,
                contextConstants.sublocation
            ];
            $scope.$on( '$destroy', function() {
                _contextsToClear.map( appCtxService.unRegisterCtx );
                // Remove listeners on destroy
                _.forEach( _eventBusSubDefs, function( subDef ) {
                    eventBus.unsubscribe( subDef );
                } );
            } );
        };

        /**
         * Register any predefined context that is in the state data
         */
        var registerStateContext = function() {
            if( $scope.provider.context ) {
                var stateContexts = Object.keys( $scope.provider.context );

                // Register the state contexts
                stateContexts.forEach( function( key ) {
                    appCtxService.registerCtx( key, ngModule.copy( $scope.provider.context[ key ] ) );
                } );

                // And unregister it on destroy
                $scope.$on( '$destroy', function() {
                    stateContexts.map( appCtxService.unRegisterCtx );
                } );
            }
        };

        /**
         * The property policy for this sublocation. Extracted from the state data. The policy can be
         * embedded directly as an object or it can be a string path to the json file. The policy is
         * registered when the location is activated and unregistered when the location is removed.
         *
         * @returns {Promise} Promise resolved after policy is registered
         */
        var registerPropertyPolicy = function() {
            var propertyPolicy = $scope.provider.policy;
            if( propertyPolicy ) {
                return propertyPolicyService.registerPolicyAsync( propertyPolicy ).then(
                    function( propertyPolicyId ) {
                        $scope.$on( '$destroy', function() {
                            propertyPolicyService.unregister( propertyPolicyId );
                        } );
                    } );
            }
            return $q.when();
        };

        /**
         * Create event listeners and remove them on $destroy
         */
        var handleEventListeners = function() {
            // When a panel is done it fires complete event. Need to un register.
            _eventBusSubDefs.push( eventBus.subscribe( 'complete', function( eventData ) {
                var ctxSidenavCommandId = appCtxService.getCtx( 'sidenavCommandId' );

                if( eventData && eventData.source === 'toolAndInfoPanel' ) {
                    var toolsAndInfoCommand = appCtxService.getCtx( 'activeToolsAndInfoCommand' );

                    // This means tools and info panel is open
                    // Removing the check with ctxSidenavCommandId because when the global navigation panel opens, it sets its own commandId and the match fails
                    if( toolsAndInfoCommand ) {
                        eventBus.publish( 'awsidenav.openClose', {
                            id: 'aw_toolsAndInfo',
                            commandId: toolsAndInfoCommand.commandId
                        } );
                    }

                    appCtxService.unRegisterCtx( 'activeToolsAndInfoCommand' );
                } else if( eventData && eventData.source === 'navigationPanel' ) {
                    var navigationCommand = appCtxService.getCtx( 'activeNavigationCommand' );

                    if( navigationCommand ) {
                        eventBus.publish( 'awsidenav.openClose', {
                            id: 'aw_navigation',
                            commandId: navigationCommand.commandId
                        } );
                    }
                    appCtxService.unRegisterCtx( 'activeNavigationCommand' );
                } else {
                    if( ctxSidenavCommandId ) {
                        eventBus.publish( 'awsidenav.openClose', {
                            id: eventData.id,
                            commandId: ctxSidenavCommandId
                        } );
                    }
                }
            } ) );
        };

        /**
         * (Default) Base selection update method. Simple pass through to the selection service when
         * selection comes from primary work area.
         *
         * @function updateSelection
         * @memberOf NgControllers.BaseSubLocationCtrl
         *
         * @param {Object} selection - The new selection
         */
        $scope.updateSelection = $scope.updateSelection ? $scope.updateSelection : function( selection ) {
            if( selection ) {
                if( selection.source === 'primaryWorkArea' ) {
                    selection.selected = selection.selected ? selection.selected : [];
                    if( selection.selected.length > 0 ) {
                        selectionService.updateSelection( selection.selected, $scope.baseSelection,
                            selection.relationContext );
                    } else {
                        selectionService.updateSelection( $scope.baseSelection );
                    }
                }
                if( selection.source === 'base' ) {
                    selectionService.updateSelection( $scope.baseSelection );
                }
            } else {
                selectionService.updateSelection( $scope.baseSelection );
            }
        };

        /**
         * Trigger whatever selection method is currently active when selection changes
         */
        $scope.$on( 'dataProvider.selectionChangeEvent', function( event, data ) {
            $scope.updateSelection( data );
        } );

        var initPromises = [];

        // Ensure that the property policy of the sublocation is registered
        initPromises.push( registerPropertyPolicy() );

        // Ensure that the property policy of the location is registered
        if( $scope.provider.propertyPolicyPromise ) {
            initPromises.push( $scope.provider.propertyPolicyPromise );
        }

        // Normal init methods
        registerSubLocationContext();
        registerStateContext();

        // Keep track of the init methods so child controllers can also depend on them
        ctrl.init = $q.all( initPromises ).then( function() {
            // Clear any existing selection in case previous sublocation did not clean up correctly
            $scope.updateSelection( $scope.getInitialSelection ? $scope.getInitialSelection() : null );
            // Force command context changed event even if selection has not changed
            selectionService.updateCommandContext();

            // Update fullscreen context
            appCtxService.registerCtx( 'fullscreen', false );

            // Setup event listeners
            handleEventListeners();

            // Clear selection when leaving the sublocation
            $scope.$on( '$destroy', function() {
                $scope.updateSelection();
            } );
        } );
    }
] );

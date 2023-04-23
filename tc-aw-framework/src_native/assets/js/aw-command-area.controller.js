// Copyright (c) 2020 Siemens

/**
 * Defines the {@link NgControllers.awCommandAreaController}
 *
 * @module js/aw-command-area.controller
 */
import app from 'app';
import 'js/logger';
import 'js/commandHandlerService';
import 'js/appCtxService';

/* eslint-disable-next-line valid-jsdoc*/
/**
 * aw-command-area controller
 *
 * @class awCommandAreaController
 * @memberOf NgControllers
 */
app.controller( 'awCommandAreaController', [
    '$scope',
    '$timeout',
    'commandHandlerService',
    'commandService',
    'appCtxService',
    function AwCommandAreaController( $scope, $timeout, commandHandlerSvc, commandService, appCtxService ) {
        var self = this;

        // Scope being used by the "background" command for the current panel
        var commandScope = null;

        // Watch the activeNavigationCommand or activeToolsAndInfoCommand
        self._commandContext = $scope.area === 'navigation' ? 'activeNavigationCommand' :
            'activeToolsAndInfoCommand';

        /**
         * Unregister the command context to trigger closing of the current panel
         *
         * Not necessary if all commands that open panels are now using command panel service,
         * but leaving here for backwards compatibility.
         */
        function clearActiveCommand() {
            appCtxService.unRegisterCtx( self._commandContext );
        }

        /**
         * Close the currently opened command panel.
         *
         * @return {Promise} Promise resolved when panel has been closed
         */
        function closeCurrentCommand() {
            return commandHandlerSvc.getPanelLifeCycleClose( $scope.command ).then( function() {
                if( commandScope ) {
                    commandScope.$destroy();
                    commandScope = null;
                }
                if( $scope.command ) {
                    $scope.command = null;
                }
            } );
        }

        /**
         * Open a new command panel.
         *
         * @param {ZeroCompileCommand} command command to open
         * @return {Promise} Promise resolved when the panel is open
         */
        function openCommand( command ) {
            if( command.closeWhenCommandHidden ) {
                // Start evaluating the currently opened command in the background
                // When the command is hidden or disabled the panel will close even if command is not active anywhere else on page
                commandScope = $scope.$new();
                commandScope.ctx = appCtxService.ctx;
                // Note: Command context cannot be handled generically as putting it somewhere this directive can reach it will result in a memory leak
                // Any command that opens a panel and needs command context must set "closeWhenCommandHidden" to true in command panel service action
                // and update their panel to know when to close
                commandScope.commandContext = null;
                commandService.getCommand( command.commandId, commandScope );
            }

            command.declarativeCommandId = command.getDeclarativeCommandId();
            return commandHandlerSvc.setupDeclarativeView( command ).then( function() {
                $scope.command = command;
            } );
        }

        /**
         * Swap out the currently opened panel
         *
         * @param {ZeroCompileCommand} command command to show
         */
        self.updateCommand = function( command ) {
            // When a command makes itself active
            if( command ) {
                if( $scope.command && command.commandId === $scope.command.commandId ) {
                    // If it is already open close it
                    clearActiveCommand();
                } else if( $scope.command ) {
                    // If a different command is active close it then open the new command
                    closeCurrentCommand().then( function() {
                        openCommand( command );
                    } );
                } else {
                    // Just open the new command
                    openCommand( command );
                }
            } else if( $scope.command ) {
                // If the active command was cleared just close the panel
                closeCurrentCommand();
            }
        };
    }
] );

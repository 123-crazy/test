// Copyright (c) 2020 Siemens

/**
 * Directive to show command bar within a cell. Same as aw-command-bar but uses different view.
 *
 * @module js/aw-cell-command-bar.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'lodash';
import 'angular';
import 'js/eventBus';
import 'js/aw-command-bar.controller';
import 'js/aw-command.directive';
import 'js/aw-icon.directive';
import 'js/appCtxService';
import 'js/command.service';
import 'js/localeService';

/**
 * Directive to display a command bar in a cell.
 *
 * Parameters:<br>
 * anchor - The anchor to use when pulling commands from the command service<br>
 * context - Additional context to use in command evaluation<br>
 *
 * @example <aw-cell-command-bar anchor="aw_oneStep"><aw-cell-command-bar>
 *
 * @member aw-cell-command-bar
 * @memberof NgElementDirectives
 */
app.directive( 'awCellCommandBar', [
    'localeService',
    'appCtxService',
    'commandService',
    function( localeService, appCtxService, commandService ) {
        return {
            restrict: 'E',
            templateUrl: app.getBaseUrlPath() + '/html/aw-cell-command-bar.directive.html',
            scope: {
                anchor: '@',
                context: '=?'
            },
            link: function( $scope, $element, $attrs, $controller ) {
                /**
                 * Capture clicks that happen within this element. Click event cannot reach list as it would trigger selection.
                 */
                $element.on( 'click', function( e ) {
                    e.stopPropagation();
                } );

                /**
                 * Don't use any alignment
                 */
                $scope.alignment = '';

                // Create a new isolated scope to evaluate commands in
                var commandScope = null;
                commandScope = $scope.$new( true );
                commandScope.ctx = appCtxService.ctx;
                commandScope.commandContext = $scope.context;

                /**
                 * Load the localized text
                 */
                localeService.getTextPromise().then( function( localTextBundle ) {
                    $scope.expandText = localTextBundle.MORE_LINK_TEXT;
                    $scope.collapseText = localTextBundle.LESS_LINK_TEXT;
                } );

                /**
                 * Load the static commands
                 */
                var loadCommands = function() {
                    if( $scope.anchor ) {
                        commandScope.commandContext = $scope.context; // Get the command overlays
                        // Get the command overlays
                        commandService.getCommands( $scope.anchor, commandScope ).then( $controller.updateStaticCommands );
                    }
                };

                /**
                 * When the anchor or includeGlobal options change reload the static commands
                 */
                $scope.$watchGroup( [ 'anchor', 'context.vmo' ], loadCommands );
                var configChangeSub = eventBus.subscribe( 'configurationChange.commandsViewModel', loadCommands );
                $scope.$on( '$destroy', function() {
                    eventBus.unsubscribe( configChangeSub );
                } );
            },
            controller: 'awCommandBarController'
        };
    }
] );

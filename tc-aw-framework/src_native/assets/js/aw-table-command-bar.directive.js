// Copyright (c) 2020 Siemens

/**
 * Directive to show command bar within a cell. Same as aw-command-bar but uses different view.
 *
 * @module js/aw-table-command-bar.directive
 */
import app from 'app';
import 'js/aw-command-bar.controller';
import 'js/aw-command.directive';
import 'js/aw-icon.directive';
import 'js/localeService';
import 'js/appCtxService';
import 'js/command.service';

// eslint-disable-next-line valid-jsdoc
/**
 * Directive to display a command bar in a cell.
 *
 * Parameters:<br>
 * anchor - The anchor to use when pulling commands from the command service<br>
 * context - Additional context to use in command evaluation<br>
 *
 * @example <aw-table-command-bar anchor="aw_oneStep"><aw-table-command-bar>
 *
 * @member aw-table-command-bar
 * @memberof NgElementDirectives
 */
app.directive( 'awTableCommandBar', [
    'localeService',
    'appCtxService',
    'commandService',
    function( localeService, appCtxService, commandService ) {
        return {
            restrict: 'E',
            templateUrl: app.getBaseUrlPath() + '/html/aw-table-command-bar.directive.html',
            scope: {
                anchor: '@',
                context: '=?'
            },
            link: function( $scope, $element, $attrs, $controller ) {
                /**
                 * Capture clicks that happen within this element. Click event cannot reach table as it would trigger selection.
                 */
                $element.on( 'click', function( e ) {
                    e.stopPropagation();
                } );

                /**
                 * Always use horizontal alignment
                 */
                $scope.alignment = '';

                // Create a new isolated scope to evaluate commands in
                var commandScope = null;
                commandScope = $scope.$new( true );
                commandScope.ctx = appCtxService.ctx;

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
                        commandScope.commandContext = $scope.context;
                        // Get the command overlays
                        commandService.getCommands( $scope.anchor, commandScope ).then( $controller.updateStaticCommands );
                    }
                };

                /**
                 * When the anchor or includeGlobal options change reload the static commands
                 */
                $scope.$watchGroup( [ 'anchor', 'context.vmo' ], loadCommands );
            },
            controller: 'awCommandBarController'
        };
    }
] );

// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Directive used as header property
 *
 * @module js/aw-viewer-header.directive
 * @requires app
 * @requires js/aw-repeat.directive
 * @requires js/aw-widget.directive
 */
import * as app from 'app';
import $ from 'jquery';
import declUtils from 'js/declUtils';
import 'js/command.service';
import 'js/aw-repeat.directive';
import 'js/aw-property-non-edit-val.directive';
import 'js/aw-command-bar.directive';
import 'js/aw-link-with-popup.directive';
import 'js/aw-popup-command-bar.directive';
import 'js/aw-toolbar.directive';

/**
 * Directive used to display the properties in viewer header.
 *
 * <pre>
 * Parameters:
 * data - Array of properties to display at the top of the header. Structure of header properties
 * is as follows:
 * headerProperties: [
 *          {
 *              property: { view model property object }
 *              commands: [
 *                  {
 *                      commandId: 'Awp0ShowObject',                        // illustration
 *                      dependencies: [ 'js/showObjectCommandHandler' ]     // illustration
 *                  },
 *                  {
 *                      commandId: 'Awp0ViewFile',                        // illustration
 *                      dependencies: [ 'js/viewFileCommandHandler' ]     // illustration
 *                  }
 *              ]
 *          },
 *          {
 *              property: { view model property object }
 *          },
 *          {
 *              ........
 *          }
 * ]
 * </pre>
 *
 * @example <aw-viewer-header data="viewdataerHeaderProperties"></aw-viewer-header>
 *
 * @member aw-universal-viewer
 * @memberof NgElementDirectives
 */
app.directive( 'awViewerHeader', function() {
    return {
        restrict: 'E',
        scope: {
            data: '=?'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-viewer-header.directive.html',
        controller: [
            '$scope', '$q', '$window', 'commandService',
            function( $scope, $q, $window, commandService ) {
                $scope.showPopup = false;

                $scope.openPopup = function( event, commands, context ) {
                    if( commands && commands.length === 1 ) {
                        //if single command, then execute it instead of showing popup
                        $scope.itemClicked( event, commands[ 0 ], context );
                    } else {
                        event.stopPropagation();
                        $( window ).on( 'click', $scope.closePopup );
                        $scope.$evalAsync( function() {
                            $scope.showPopup = !$scope.showPopup;
                            var targetElement = event.target;
                            $scope.topPosition = $( targetElement ).offset().top + 'px';
                        } );
                    }
                };

                $scope.closePopup = function() {
                    $( window ).off( 'click', $scope.closePopup );
                    $scope.$evalAsync( function() {
                        $scope.showPopup = false;
                    } );
                };

                $scope.itemClicked = function( event, command, commandContext ) {
                    event.stopPropagation();
                    if( command.dependencies && command.dependencies.length > 0 ) {
                        declUtils.loadImports( command.dependencies, $q ).then( function( handlers ) {
                            return commandService.getCommand( command.commandId ).then( function( commandOverlay ) {
                                if( commandOverlay ) {
                                    if( !commandOverlay.handler ) {
                                        commandOverlay.handler = handlers[ 0 ];
                                    }
                                    commandOverlay.handler.execute( commandContext );
                                }
                            } );
                        } );
                    }
                    $scope.$evalAsync( function() {
                        $scope.showPopup = false;
                    } );
                };
            }
        ]
    };
} );

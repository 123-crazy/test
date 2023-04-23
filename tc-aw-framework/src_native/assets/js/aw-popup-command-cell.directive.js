// Copyright (c) 2020 Siemens

/**
 * Directive to create the command cell which can be shown in a popup container
 *
 * @module js/aw-popup-command-cell.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import analyticsSvc from 'js/analyticsService';
import 'js/appCtxService';
import 'js/aw-command.directive';
import 'js/extended-tooltip.directive';
import 'js/popupService';
import 'js/aw-pic.directive';
import 'js/aw-icon.directive';
import wcagSvc from 'js/wcagService';


/* eslint-disable-next-line valid-jsdoc*/
/**
 * Display for a command within a popup
 *
 * @example <aw-popup-command-cell prop="prop"></aw-popup-command-cell>
 *
 * @member aw-popup-command-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awPopupCommandCell', [ '$compile', 'appCtxService', function( $compile, appCtx ) {
    return {
        restrict: 'E',
        transclude: true,
        scope: true,
        templateUrl: function() {
            return app.getBaseUrlPath() + '/html/aw-popup-command-cell.directive.html';
        },
        controllerAs: 'ctrl',
        controller: [ '$scope', '$element', '$q', 'popupService', function AwPopupCommandCellController( $scope, $element, $q, popupSvc ) {
            var lastExecCmd;

            var revealPopup = function( ) {
                return popupSvc.show( {
                    templateUrl: '/html/aw-command.popup-template.html',
                    context: $scope,
                    options: {
                        whenParentScrolls: 'follow',
                        clickOutsideToClose: true,
                        forceCloseOthers: false,
                        reference: $element[ 0 ],
                        placement: 'right-start',
                        flipBehavior: 'opposite',
                        ignoreReferenceClick: true,
                        ignoreClicksFrom: [ 'div.noty_bar' ],
                        autoFocus: true
                    }
                } );
            };

            var processExecPromise = function( command, event, cmdResult ) {
                lastExecCmd = null;
                eventBus.publish( command.parentGroupId + '.popupCommandExecuteEnd', command.commandId );

                if( cmdResult && cmdResult.showPopup ) {
                    $scope.popupName = cmdResult.view;
                    revealPopup();
                    return;
                }

                if( $scope.closeOnClick !== false ) {
                    // pass hideAllAncestorPopups as true to close popup opened through nested group commands
                    popupSvc.hide( null, event, true );

                    // notify the group child command is executed, in case command overflow can close properly
                    eventBus.publish( 'awPopupCommandCell.commandExecuted', { commandId: command.commandId } );

                    // to support legacy usage of group command, close command popup after child command clicked
                    $scope.$emit( 'awPopupWidget.close' );
                }
            };

            /**
             * if the command is child command in the popup list, then do excuteGroupChildCommand function
             *
             * @param {Event} $event - event object which is passed from angular template
             * @param {Object} command - command to execute
             */
            this.executeGroupChildCommand = function(  $event, command ) {
                if( command.callbackApi ) {
                    // keep the last executed command to avoid run same command twice before the popup closed.
                    if( lastExecCmd !== command ) {
                        lastExecCmd = command;

                        // Trigger command handlers execute method
                        // Emit an event to tell aw-command to prevent close of the popup
                        eventBus.publish( command.parentGroupId + '.popupCommandExecuteStart', command.commandId );
                        $q.resolve( command.callbackApi.execute() ).then( function( cmdResult ) {
                            processExecPromise( command, $event, cmdResult );
                        } ).catch( function() {
                            processExecPromise( command, $event );
                        } );
                    }
                } else {
                    eventBus.publish( 'aw-popup-selectionChange', command );
                }

                // Log the popup command details to Analytics
                var sanPopupCmdLogData = {
                    sanAnalyticsType: 'Popup Commands',
                    sanCommandId: command.commandId,
                    sanCommandTitle: command.title
                };
                eventBus.publish( 'aw-command-logEvent', sanPopupCmdLogData );
                analyticsSvc.logCommands( sanPopupCmdLogData );

                var predictionLogData = {
                    analyticsType: 'Popup Commands',
                    commandAnchor: command.parentGroupId,
                    sanCommandId: command.commandId
                };
                analyticsSvc.logPredictionData( predictionLogData );
            };
        } ],
        link: function( $scope, $element, attr, ctrl ) {
            // copy similar logic in aw-command here to support command template
            if( $scope.command.template ) {
                var childScope = null;
                var childElement = null;
                var templateParent = $element.find( '.aw-commands-cellDecorator' );
                $scope.$watch( 'command.template', function _watchCommandTemplate( childElementHtml ) {
                    // Clear out current contents and destroy child scope
                    templateParent.empty();
                    if( childScope ) {
                        childScope.$destroy();
                    }
                    // Compile the new contents with a new child scope
                    childScope = $scope.$new();
                    childScope.ctx = appCtx.ctx;
                    childElement = $compile( childElementHtml )( childScope );
                    templateParent.append( childElement );
                } );
            }
            $scope.onKeyDown = function( event ) {
                if ( wcagSvc.isValidKeyPress( event ) ) {
                    ctrl.executeGroupChildCommand( event, $scope.command );
                }else {
                    wcagSvc.handleMoveUpOrDown( event, event.currentTarget.parentElement.parentElement );
                }
            };
        }
    };
} ] );

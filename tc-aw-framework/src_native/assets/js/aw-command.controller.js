// Copyright (c) 2020 Siemens

/**
 * Defines controller for <aw-command> directive.
 *
 * @module js/aw-command.controller
 */
import app from 'app';
import _ from 'lodash';
import logger from 'js/logger';
import eventBus from 'js/eventBus';
import analyticsSvc from 'js/analyticsService';
import 'js/appCtxService';
import 'js/popupService';
import 'js/aw-popup-command-list.directive';
import 'js/aw-popup-panel2.directive';

/**
 * Defines awCommand controller
 *
 * @member awCommandController
 * @memberof NgControllers
 */
app.controller( 'awCommandController', [
    '$scope',
    '$element',
    '$timeout',
    '$q',
    'appCtxService',
    'popupService',
    function AwCommandController( $scope, $element, $timeout, $q, appCtxService, popupSvc ) {
        $scope.popupOpen = false;
        $scope.popupRef = null;

        var popupWhenClosed = function() {
            $scope.popupOpen = false;
            if ( !$scope.command.isGroupCommand ) {
                $scope.command.isSelected = false;
            }
        };

        var getPlacement = function() {
            var placement = 'bottom-start';
            if ( $scope.command.alignment === 'VERTICAL' ) {
                placement = 'left-start';
            }
            return placement;
        };

        var revealPopup = function() {
            if ( !$scope.command.isGroupCommand ) {
                $scope.command.isSelected = true;
            }

            return popupSvc.show( {
                templateUrl: '/html/aw-command.popup-template.html',
                context: $scope,
                options: {
                    whenParentScrolls: 'follow',
                    reference: $element[ 0 ],
                    placement: getPlacement(),
                    flipBehavior: 'opposite',
                    ignoreReferenceClick: true,
                    advancePositioning: true,
                    resizeContainer: 'div.aw-layout-popup',
                    closeWhenEsc: true,
                    autoFocus: true,
                    ignoreClicksFrom: [ 'div.noty_bar' ],
                    selectedElementCSS: '.aw-state-selected',
                    forceCloseOthers: false,
                    hooks: {
                        whenClosed: popupWhenClosed
                    }
                }
            } ).then( ( popupRef ) => {
                    $scope.popupRef = popupRef;
                    $scope.popupOpen = true;
                } );
        };

        $scope.$on( 'visibleChildCommandsChanged', function() {
            if ( $scope.popupOpen && $scope.popupRef ) {
                popupSvc.update( $scope.popupRef );
            }
        } );

        var activeCommandExecution = null;

        var getExecutePromise = function( $event ) {
            // get viewport Dimension Offset for icon button from aw-command
            var viewportOffset = $element.find( 'div.aw-commandIcon' )[ 0 ].getBoundingClientRect();
            var commandDimension = {
                popupId: $element.find( 'button.aw-commands-commandIconButton' )[ 0 ].attributes['button-id'].value,
                offsetHeight: viewportOffset.height,
                offsetLeft: viewportOffset.left,
                offsetTop: viewportOffset.top,
                offsetWidth: viewportOffset.width
            };
            // hide all the messages rendered on screen and then load the new noty message
            eventBus.publish( 'removeMessages', {} );
            return $q.resolve( $scope.command.callbackApi.execute( commandDimension ) )
                .then( execResult => {
                    // Emit an event for the command bar
                    $scope.$emit( 'aw-command-executeCommand', $scope.command.commandId );

                    // Logging for Analytics
                    var commandLogData = {
                        sanAnalyticsType: 'Commands',
                        sanCommandId: $scope.command.commandId,
                        sanCommandTitle: $scope.command.title
                    };
                    analyticsSvc.logCommands( commandLogData );
                    eventBus.publish( 'aw-command-logEvent', commandLogData );

                    var predictionLogData = {
                        analyticsType: 'Commands',
                        commandAnchor: $scope.command.parentGroupId,
                        sanCommandId: $scope.command.commandId
                    };
                    analyticsSvc.logPredictionData( predictionLogData );

                    if ( execResult && execResult.showPopup ) {
                        if ( $scope.popupOpen ) {
                            $event.stopPropagation();
                            return popupSvc.hide()
                                .then( () => {
                                    $scope.popupRef = null;
                                } );
                        }

                        if ( execResult.view && $scope.popupName !== execResult.view ) {
                            $scope.popupName = execResult.view;
                            // Necessary to ensure ng-if condition has revealed the popup div
                            return $timeout().then( revealPopup );
                        }

                        return revealPopup();
                    }
                    return false;
                } )
                .catch( () => $q.resolve() );
        };

        /**
         * Execute callback which needs to be triggered back to command handler
         *
         * @param {Object} $event - The click event
         * @returns {Promise<Void>} Promise resolved when command finishes executing
         */
        this.executeCommand = function( $event ) {
            if ( !activeCommandExecution ) {
                activeCommandExecution = getExecutePromise( $event )
                    .then( () => activeCommandExecution = null );
            }
            return activeCommandExecution;
        };
    }
] );

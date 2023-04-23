// Copyright (c) 2020 Siemens

/**
 * Defines controller for <aw-list-command> directive.
 *
 * @module js/aw-list-command.controller
 */
import app from 'app';
import 'js/viewModelService';

/**
 * Defines awListCommand controller
 *
 * @member awListCommandController
 * @memberof NgControllers
 */
app.controller( 'awListCommandController', [
    '$scope', '$element', 'viewModelService',
    function( $scope, $element, viewModelSvc ) {
        var self = this;

        /**
         * Execute callback which needs to be triggered back to command handler
         *
         * @param {Event} $event - event object which is passed from angular template
         */
        $scope.executeCommand = function( $event ) {
            $event.stopPropagation();

            if( $scope.command.handler ) {
                $scope.command.handler.execute( $scope.vmo, $scope );
            } else if( $scope.command.action ) {
                var declViewModel = viewModelSvc.getViewModel( $scope, true );
                declViewModel.selectedCell = $scope.vmo;
                viewModelSvc.executeCommand( declViewModel, $scope.command.action, $scope );
            }
        };

        /**
         * Set command context, position and display option of command once virtualized cell is rendered
         */
        self.setCommandContext = function() {
            $scope.$evalAsync( function() {
                var position = null;
                var displayOption = null;

                if( $scope.command ) {
                    position = $scope.command.position;
                    displayOption = $scope.command.displayOption;

                    if( $scope.vmo && $scope.command.handler ) {
                        $scope.command.handler.setCommandContext( $scope.vmo, $scope );
                    }
                }

                self.setPosition( position );
                self.setDisplayOption( displayOption );
            } );
        };

        /**
         * Set CSS styling of the command based off its position
         *
         * @param {String} position - position of the command which applies different style based off the position
         */
        self.setPosition = function( position ) {
            switch ( position ) {
                case 'topRight':
                    $scope.positionClass = 'aw-commands-cellCommandTopRight';
                    break;

                case 'middleRight':
                    $scope.positionClass = 'aw-commands-cellCommandMiddleRight';
                    break;

                case 'bottomRight':
                    $scope.positionClass = 'aw-commands-cellCommandBottomRight';
                    break;

                case 'topLeft':
                    $scope.positionClass = 'aw-commands-cellCommandTopLeft';
                    break;

                case 'middleLeft':
                    $scope.positionClass = 'aw-commands-cellCommandMiddleLeft';
                    break;

                case 'bottomLeft':
                    $scope.positionClass = 'aw-commands-cellCommandBottomLeft';
                    break;

                default:
                    $scope.positionClass = 'aw-commands-cellCommandTopRight';
                    break;
            }
        };

        /**
         * Set CSS styling of the command based off its display option
         *
         * @param {String} displayOption - display option of the command which defines when the command needs to be
         *            shown.
         */
        self.setDisplayOption = function( displayOption ) {
            var anchorElem = $element.find( '.aw-commands-cellCommandCommon' );
            $scope.cellHoverClass = 'aw-widgets-cellListCellCommandHover';
            if( anchorElem ) {
                switch ( displayOption ) {
                    case 'ON_HOVER':
                        $scope.showOnHover = true;
                        break;
                    case 'ON_HOVER_AND_SELECTION':
                        $scope.showOnHover = true;
                        $scope.showOnSelection = true;
                        break;
                    case 'ON_SELECTION':
                        $scope.showOnSelection = true;
                        break;
                    case 'ALWAYS':
                        $scope.showAlways = true;
                        break;
                    default:
                        $scope.showOnHover = true;
                        $scope.showOnSelection = true;
                        break;
                }
            }
        };
    }
] );

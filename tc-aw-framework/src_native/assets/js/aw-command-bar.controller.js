// Copyright (c) 2020 Siemens

/**
 * Defines the {@link NgControllers.awCommandBarController}
 *
 * @module js/aw-command-bar.controller
 */
import app from 'app';
import _ from 'lodash';
import 'js/popupService';
import 'js/aw-scrollpanel.directive';
import 'js/aw-popup-panel2.directive';
import 'js/aw-popup-command-cell.directive';
import eventBus from 'js/eventBus';
import AwPromiseService from 'js/awPromiseService';
import commandOverflowSvc from 'js/commandOverflow.service';
import resizeObserverSvc from 'js/resizeObserver.service';

/* eslint-disable-next-line valid-jsdoc*/
/**
 * The controller for the aw-command-bar directive
 *
 * @class awCommandBarController
 * @memberof NgControllers
 */
app.controller( 'awCommandBarController', [ '$scope', '$timeout', '$element', '$attrs', 'popupService',
    function AwCommandBarController( $scope, $timeout, $element, $attrs, popupSvc ) {
        /**
         * Controller reference
         */
        var self = this;

        /**
         * Whether a resize is currently active. Used to debounce window resize.
         *
         * @private
         * @member _resizeActive
         * @memberOf NgControllers.awCommandBarController
         */
        var _resizeActive = false;

        /**
         * Whether to reverse the order of the commands. Reverse if directive has "reverse" attribute and it is not
         * explicitly false.
         *
         * @member reverse
         * @memberOf NgControllers.awCommandBarController
         */
        $scope.reverse = $attrs.hasOwnProperty( 'reverse' ) && $scope.reverse !== false;

        /**
         * The alignment to use for all child aw-commands.
         *
         * @member alignment
         * @memberOf NgControllers.awCommandBarController
         */
        $scope.alignment = $scope.alignment ? $scope.alignment : 'VERTICAL';

        /**
         * The full list of commands to display.
         *
         * @member commandsList
         * @memberOf NgControllers.awCommandBarController
         */
        $scope.commandsList = [];

        if( $scope.overflow ) {
            /**
             * The list of overflow commands to display in new overflow popup.
             * This list differ from the overflowCommands, which is the old structure used in aw-command-bar.directive.html.
             *
             * @member overflownCommands
             * @memberOf NgControllers.awCommandBarController
             */
            $scope.overflownCommands = [];
            $scope.overflowBreakIndex = 1;

            self.toggleOverflowPopupHandler = commandOverflowSvc.overflowPopupHandler();

            //We don't want to show/hide the More button if its already driven by aw-toolbar
            if( !$scope.hideMore && resizeObserverSvc.supportsResizeObserver() ) {
                let commandBarObserver = null;

                const initializeObserver = () => {
                    const callback = _.debounce( () => {
                        $scope.hideMore = !commandOverflowSvc.hasOverflow( $element[ 0 ], $scope.alignment );
                        commandOverflowSvc.updateTabIndexOnOverflow( $element[ 0 ], $scope.alignment );
                        $scope.$evalAsync();
                    }, 200, {
                        maxWait: 10000,
                        trailing: true,
                        leading: false
                    } );

                    commandBarObserver = resizeObserverSvc.observe( $element[ 0 ].firstElementChild, callback );
                };

                initializeObserver();

                var updateCommandTabIndex = eventBus.subscribe( 'awPopupCommandCell.commandExecuted', function() {
                    $scope.$applyAsync( function() {
                        commandOverflowSvc.updateTabIndexOnOverflow( $element[ 0 ], $scope.alignment );
                    } );
                } );

                $scope.$on( '$destroy', function() {
                    commandBarObserver();
                    eventBus.unsubscribe( updateCommandTabIndex );
                } );
            }
        }

        /**
         * Whether to show an up or down arrow
         *
         * @member showDownArrow
         * @memberOf NgControllers.awCommandBarController
         */
        $scope.showDownArrow = false;

        /**
         * How many commands can fit within the command bar currently. Initialized to a high value to prevent
         * overflow button flickering.
         *
         * @member commandLimit
         * @memberOf NgControllers.awCommandBarController
         */
        $scope.commandLimit = 999;

        /**
         * Toggle overflow when show overflow button is clicked
         *
         * @method toggleOverflow
         * @memberOf NgControllers.awCommandBarController
         *
         * @param {Event} event - Click event
         */
        $scope.toggleOverflow = function( event ) {
            event.stopPropagation();
            $scope.showDownArrow = !$scope.showDownArrow;
        };

        /**
         * Toggle command overflow popup
         *
         * @method showPopup
         * @memberOf NgControllers.awCommandBarController
         *
         * @param {Event} event - Click event
         */
        $scope.toggleOverflowPopup = function( event ) {
            calculateOverflow();

            var placement = $scope.alignment === 'VERTICAL' ? 'left-end' : 'bottom-start';
            self.toggleOverflowPopupHandler.toggleOverflowPopup( event.currentTarget, placement, $scope );
        };

        /**
         * Show popup
         *
         * @method showPopup
         * @memberOf NgControllers.awCommandBarController
         *
         * @param {Event} event - Click event
         * @param {Object} options - popup options
         *
         * @returns {Promise} promise - promise with the created popupRef element
         */
        $scope.showPopup = function( event, options ) {
            // merge the user options
            options = Object.assign( {
                whenParentScrolls: 'close',
                targetEvent: event
            }, options );
            return popupSvc.show( {
                templateUrl: '/html/aw-popup-command-bar.popup-template.html',
                context: $scope,
                options: options
            } ).then( ( popupRef ) => { $scope.popupRef = popupRef; } );
        };

        /**
         * Hide popup
         * @returns {Promise} promise - promise with the hide result
         */
        $scope.hidePopup = function() {
            if( !$scope.popupRef ) { return AwPromiseService.instance.resolve( false ); }
            return popupSvc.hide( $scope.popupRef ).then( ( res ) => {
                $scope.popupRef = null;
                return res;
            } );
        };

        /**
         * Update the static commands
         *
         * @method updateStaticCommands
         * @memberOf NgControllers.awCommandBarController
         *
         * @param {Object[]} newStaticCommands - New commands
         */
        self.updateStaticCommands = function( newStaticCommands ) {
            newStaticCommands.forEach( function( cmd ) {
                cmd.alignment = $scope.alignment;
            } );

            // And update the static commands
            $scope.commandsList = newStaticCommands;

            // Refresh the command limit
            self.updateCommandLimit();
        };

        /**
         * Recalculate how many commands can fit in the command bar before overflow occurs.
         *
         * @method calculateOverflow
         * @memberOf NgControllers.awCommandBarController
         */
        var calculateOverflow = function() {
            var overflowBreakPointCalculator = commandOverflowSvc.overflowBreakPointCalculator();
            var visibleCmds = $scope.visibleCommands;
            if( visibleCmds.length <= 1 ) {
                return;
            }

            $scope.overflownCommands = [];
            $scope.overflowBreakIndex = visibleCmds.length;

            var breakIndex = overflowBreakPointCalculator( $element[ 0 ], $scope.alignment );

            // has command overflow
            if( breakIndex !== visibleCmds.length ) {
                $scope.overflownCommands = visibleCmds.slice( breakIndex );
            }

            // the break index should not less than 1, to make sure the command bar will occupy all the available conainer space
            $scope.overflowBreakIndex = Math.max( breakIndex, 1 );
        };

        /**
         * Recalculate how many commands can fit in the command bar before overflow occurs.
         *
         * @method updateCommandLimit
         * @memberOf NgControllers.awCommandBarController
         */
        self.updateCommandLimit = function() {
            // new command overflow design doesn't use command limit
            if( $scope.overflow ) {
                return;
            }

            // Overflow is currently limited to vertical command bars
            if( $scope.alignment === 'VERTICAL' ) {
                // Debounce resize events
                if( !_resizeActive ) {
                    _resizeActive = true;
                    // Allow rendering to complete
                    // Timeout needs to be greater than DefaultSubLocationView.EVENT_WAIT_TIME * 2 (to allow it to resize parent div)
                    $timeout( function() {
                        _resizeActive = false;

                        var commandHeight = 32; // Default to 32px if not possible to retrieve correct height from aw-command
                        var overflowButtonHeight = 32; // Default to 32px if not possible to find element
                        var foundOverflowButton = false;

                        // Try to find a visible command (hidden height will be 0)
                        var commandElement = $element.find( 'aw-command > button:visible' )[ 0 ];

                        // Try to find the overflow button
                        var overflowButtonElement = $element.find( '.aw-command-overflowIcon' )[ 0 ];
                        if( overflowButtonElement && overflowButtonElement.offsetHeight > 0 ) {
                            // and retrieve the height
                            overflowButtonHeight = overflowButtonElement.offsetHeight;
                            foundOverflowButton = true;
                        }

                        if( commandElement && commandElement.offsetHeight > 0 ) {
                            // retrieve the height
                            commandHeight = commandElement.offsetHeight;
                        } else if( foundOverflowButton ) {
                            commandHeight = overflowButtonHeight;
                        }

                        // if offsetParent is non-null, label element is visible
                        // we don't have a good way of knowing how many commands have 2 lines of text
                        // add a little buffer assuming some commands may have 2 lines
                        if( commandElement && commandElement.querySelector( '.aw-commands-commandIconButtonText' ) &&
                            commandElement.querySelector( '.aw-commands-commandIconButtonText' ).offsetParent ) {
                            commandHeight += 2;
                        }

                        // Calculate the max number of commands that can fit
                        var extraTopBottomSpace = 16; // to igonre top and bottom spacing of command bar
                        $scope.commandLimit = Math.floor( Math.ceil( $element.parent().height() - extraTopBottomSpace ) / commandHeight );

                        var visibleCmds = $scope.commandsList.filter( function( cmd ) {
                            return cmd.visible;
                        } );

                        if( !visibleCmds.length || $scope.commandLimit < visibleCmds.length ) {
                            $scope.commandLimit = Math.floor( Math.ceil( $element.parent().height() - ( overflowButtonHeight + extraTopBottomSpace ) ) / commandHeight );
                        }
                    }, 500 );
                }
            } else {
                $scope.commandLimit = $scope.commandsList.length;
            }
        };
    }
] );

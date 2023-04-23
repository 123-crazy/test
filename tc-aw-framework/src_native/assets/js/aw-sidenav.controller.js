// Copyright (c) 2020 Siemens

/**
 * @module js/aw-sidenav.controller
 */
import app from 'app';
import $ from 'jquery';
import localStorage from 'js/localStorage';
import 'js/appCtxService';
import 'js/commandHandlerService';
import 'js/command.service';
import browserUtils from 'js/browserUtils';
import AwPromiseService from 'js/awPromiseService';
import wcagSvc from 'js/wcagService';

app.controller( 'awSidenavController', [
    '$scope', '$attrs', 'appCtxService', 'commandHandlerService', 'commandService',
    function( $scope, $attrs, appCtx, commandHandlerSvc, commandService ) {
        var localStorageTopicId = 'wysiwygChannel';
        // Scope being used by the "background" command for the current panel
        var commandScope = null;
        var command = null;

        //Register activeToolsAndInfoCommand and activeNavigationCommand for backward compatibility
        //to support existing consumers in AW
        // Save the two location contexts here
        var currentLocationCtx =  null;
        if( $attrs.id === 'aw_navigation' ) {
            currentLocationCtx = 'activeNavigationCommand';
        }else if( $attrs.id === 'aw_toolsAndInfo'  ) {
            currentLocationCtx =  'activeToolsAndInfoCommand';
        }
        var otherLocationCtx =  null;
        if( $attrs.id === 'aw_navigation' ) {
            otherLocationCtx = 'activeToolsAndInfoCommand';
        }else if( $attrs.id === 'aw_toolsAndInfo'  ) {
            otherLocationCtx =  'activeNavigationCommand';
        }

        var handleCommand = function( eventData ) {
            if( eventData.command ) {
                // If a panel in the other area is open, remove it's ctx value
                if( otherLocationCtx ) {
                    if( appCtx.getCtx( otherLocationCtx ) ) {
                        appCtx.unRegisterCtx( otherLocationCtx );
                    }
                }

                if( currentLocationCtx ) {
                    //Register current location ctx
                    appCtx.registerCtx( currentLocationCtx, eventData.command );
                }

                // We need to evaluate command to catch the hideIfActive event
                if( eventData.command.closeWhenCommandHidden ) {
                    // Start evaluating the currently opened command in the background
                    // When the command is hidden or disabled the panel will close even if command is not active anywhere else on page
                    commandScope = $scope.$new();
                    commandScope.ctx = appCtx.ctx;

                    // Note: Command context cannot be handled generically as putting it somewhere this directive can reach it will result in a memory leak
                    // Any command that opens a panel and needs command context must set "closeWhenCommandHidden" to true in command panel service action
                    // and update their panel to know when to close
                    commandScope.commandContext = null;
                    commandService.getCommand( eventData.commandId, commandScope );
                }

                //Set the panel context
                commandHandlerSvc.setupDeclarativeView( eventData.command ).then( function() {
                    command = eventData.command;
                } );
            }
        };

        /**
         * Close the currently opened command panel.
         *
         * @return {Promise} Promise resolved when panel has been closed
         */
        var removeCommandScope = () => {
            if( command ) {
                return commandHandlerSvc.getPanelLifeCycleClose( command ).then( () => {
                    if( commandScope ) {
                        commandScope.$destroy();
                        commandScope = null;
                    }
                    command = null;
                } );
            }
            return AwPromiseService.instance.resolve();
        };

        var toggleParentClass = function( isAdd ) {
            //The left-side-nav-pushed class is required in sidenav to remove the white dot on the left corner of sidenav
            //When this class is present, we remove the border-radius on top left corner of sidenav
            if( $scope.isLeftToRight && $scope.slide === $scope.configProperties.push ) {
                if( isAdd ) {
                    $( '.aw-layout-mainView' ).addClass( 'left-sidenav-pushed' );
                } else {
                    $( '.aw-layout-mainView' ).removeClass( 'left-sidenav-pushed' );
                }
            }
        };

        var setSlideForPinnablePanel = function( sidenavOpened ) {
            if( sidenavOpened ) {
                //Only required for primary navigation panel that can be pinned
                $scope.slide = $scope.pinned ? $scope.configProperties.push : $scope.configProperties.float;
                if( $scope.pinned ) {
                    $( '.aw-layout-mainView' ).addClass( 'aw-global-navigationPanelPinned' );
                }

                if( browserUtils.isSafari ) {
                    $scope.$applyAsync( function() {
                        reCalculateCss();
                    } );
                }
            } else {
                //Need to make the slide revert to its initial state
                $scope.slide = $scope.configProperties.float;
                if( $scope.pinned ) {
                    $( '.aw-layout-mainView' ).removeClass( 'aw-global-navigationPanelPinned' );
                }
            }
        };

        // Need this specifically for Safari browser. As safari does not repaint css properly.
        var reCalculateCss = function() {
            var sidenavContainer = $( '.aw-sidenav-layoutContainer' );
            sidenavContainer.css( 'display', 'none' );
            sidenavContainer.outerHeight();
            sidenavContainer.css( 'display', 'flex' );
        };

        $scope.doesSideNavRemainOpen = function( eventData ) {
            return $scope.currentCommandId !== eventData.commandId ? true : !$scope.sidenavOpened;
        };

        /**
         * @param {*} status
         * do not update the $scope.sidenavOpened by your own some where else in the code.
         * Use proper API's to update state of a component.
         */
        $scope.updateSideNavStatus = ( status ) => {
            $scope.sidenavOpened = status;
        };

        /**
         *
         * @param {*} viewName
         * do not update the $scope.view by your own some where else in the code.
         * Use proper API's to update state of a component.
         *
         * if $scope.sidenavOpened is evaluated to true, then only we can update the viewname.
         * if it is evaluated to false then sideNav is being closed, hence view can become null.
         */
        let updateView = ( viewName ) => {
            $scope.view = $scope.sidenavOpened ? viewName : null;
        };

        /**
         *
         * @param {*} eventData
         */
        let updateCommandId = ( commandId ) => {
            $scope.currentCommandId = commandId;
        };

        let toggleSidenav = function( shallRemainOpen, eventData ) {
            if( $scope.isPinnable ) {
                setSlideForPinnablePanel( shallRemainOpen );
                $scope.setResizeDragHandle( shallRemainOpen );
            }

            if( eventData.commandId ) {
                if( shallRemainOpen ) {
                    appCtx.registerCtx( 'sidenavCommandId', eventData.commandId );
                } else {
                    appCtx.unRegisterCtx( 'sidenavCommandId' );
                }
            }
            toggleParentClass( shallRemainOpen );
        };

        var updateGlobalSidenavContext = function() {
            appCtx.updatePartialCtx( 'awSidenavConfig.globalSidenavContext.' + $attrs.id, {
                open: $scope.sidenavOpened,
                pinned: $scope.pinned,
                slide: $scope.slide
            } );
        };

        /**
         * This method will Create sidenav of type [ push OR float]
         * @param {object} eventData: Contain Active command Position
         *
         */
        $scope.createSidenav = ( eventData ) => {
            let shallRemainOpen = $scope.doesSideNavRemainOpen( eventData );
            return removeCommandScope().then( () => {
                toggleSidenav( shallRemainOpen, eventData );
                if( eventData.commandId ) {
                    if( shallRemainOpen ) {
                        handleCommand( eventData );
                        // Export env for wysiwyg
                        if( localStorage.get( localStorageTopicId ) ) {
                            localStorage.removeItem( localStorageTopicId );
                        }
                        localStorage.publish( localStorageTopicId, eventData.commandId );
                    } else {
                        if( currentLocationCtx ) {
                            appCtx.unRegisterCtx( currentLocationCtx );
                        }
                    }
                }
                $scope.updateSideNavStatus( shallRemainOpen );
                updateView( eventData.includeView );
                updateGlobalSidenavContext();
                updateCommandId( eventData.commandId );
            } );
        };

        $scope.closeSidenav = ( eventData ) => {
            return removeCommandScope().then( () => {
                if( !( $scope.isPinnable && $scope.pinned ) ) {
                    $scope.updateSideNavStatus( false );
                    updateView( null );
                }
                if( !eventData.commandId ) {
                    if( appCtx.getCtx( 'sidenavCommandId' ) ) {
                        appCtx.unRegisterCtx( 'sidenavCommandId' );
                    }
                }
                updateGlobalSidenavContext();
            } );
        };

        $scope.onKeyDown = function ( event ) {
            if( wcagSvc.isValidKeyPress( event ) ) {
                $scope.togglePinState();
            }
        };
        $scope.togglePinState = function() {
            $scope.pinned = !$scope.pinned;
            $( '.aw-layout-mainView' ).toggleClass( 'aw-global-navigationPanelPinned' );
            $scope.slide = $scope.pinned ? $scope.configProperties.push : $scope.configProperties.float;
            // This is specific to Safari browser. As safari browser does not repaint css properly.
            // Here is stack overflow link which I referred - https://stackoverflow.com/questions/3485365/how-can-i-force-webkit-to-redraw-repaint-to-propagate-style-changes
            if( browserUtils.isSafari ) {
                reCalculateCss();
            }
            updateGlobalSidenavContext();
        };

        $scope.configProperties = {
            large: 'LARGE',
            default: 'DEFAULT',
            full: 'FULL',
            standard: 'STANDARD',
            wide: 'WIDE',
            extra_wide: 'EXTRA_WIDE',
            float: 'FLOAT',
            push: 'PUSH',
            right_to_left: 'RIGHT_TO_LEFT',
            left_to_right: 'LEFT_TO_RIGHT',
            isFloatPanel: function() {
                return $scope.slide === this.float;
            },
            isPushPanel: function() {
                return $scope.slide === this.push;
            },
            isDefaultHeightPanel: function() {
                return $scope.height === this.default;
            },
            isFullHeightPanel: function() {
                return $scope.height === this.full;
            },
            isLargeHeightPanel: function() {
                return $scope.height === this.large;
            },
            isWideWidthPanel: function() {
                return $scope.width === this.wide;
            },
            isExtraWideWidthPanel: function() {
                return $scope.width === this.extra_wide;
            },
            isStandardWidthPanel: function() {
                return $scope.width === this.standard;
            },
            isHeightWidthEqual: function() {
                return $scope.width === $scope.height;
            }
        };
    }
] );

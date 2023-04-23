// Copyright (c) 2020 Siemens

/**
 * Directive to display a sideNav
 *
 * @module js/aw-sidenav.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import $ from 'jquery';
import 'js/aw.narrowMode.service';
import 'js/aw-sidenav.controller';
import 'js/appCtxService';
import 'js/aw-include.directive';
import 'js/aw-property-image.directive';
import 'js/exist-when.directive';
import 'js/visible-when.directive';
import AwPromiseService from 'js/awPromiseService';
import wcagSvc from 'js/wcagService';

/**
 * Directive to display a sidenav
 *
 * @example <aw-sidenav id="sidenavPush" config="data.sideNavData"></aw-sidenav>
 * @attribute config: This will define the configuration attributes of the sidenav, which includes
 * direction, animation, slide, height, width and isPinnable(in case of global navigation)
 * width: STANDARD, WIDE (standard is 360px and wide is 480px in width for normal panels)
 * height: DEFAULT, LARGE, FULL (height can be equal to width by default, 75% or 100% of the container height)
 * direction can be left to right and right to left
 * animation by default is true
 * @member aw-sidenav
 * @memberof NgElementDirectives
 */

app.directive( 'awSidenav', [
    'appCtxService', 'narrowModeService',
    function( appCtx, narrowModeSvc ) {
        return {
            restrict: 'E',
            scope: {
                config: '='
            },
            transclude: true,
            templateUrl: app.getBaseUrlPath() + '/html/aw-sidenav.directive.html',
            controller: 'awSidenavController',
            link: function( $scope, elem, attr ) {
                $scope.pinned = false;
                var hasConfigChanged = false;
                var ctxPath = 'awSidenavConfig.globalSidenavContext.';

                var reCalcPanelPosition = function() {
                    if( $scope.configProperties.isFloatPanel() && $scope.sidenavOpened || $scope.isPinnable && $scope.sidenavOpened ) {
                        if( $scope.configProperties.isFullHeightPanel() ) {
                            elem.css( 'height', elem.parent().height() + 'px' );
                        } else {
                            elem.css( 'height', '' );
                        }
                    }

                    // The isNarrowMode check is required for narrow mode devices, where the panel covers the whole screen
                    // We cannot check isMobileOS as it covers iPad devices also
                    if( !narrowModeSvc.isNarrowMode() ) {
                        if( !$scope.isLeftToRight && $scope.configProperties.isFloatPanel() && $scope.sidenavOpened ) {
                            elem.css( 'right', window.innerWidth - ( elem.parent().width() + elem.parent().offset().left ) );
                        }
                    }

                    // In narrow mode we need to subtract the height of footer(this is dynamic and not fixed due to the command labels) from side nav, in order to avoid overlapping.
                    // Added isNarrowMode that checks the device width and sets to true for narrow mode devices.
                    if( narrowModeSvc.isNarrowMode() && $scope.isPinnable ) {
                        var sidenavHeightWithoutFooter = elem.parent().height() - $( 'aw-footer' ).height();
                        elem.css( 'height', sidenavHeightWithoutFooter + 'px' );
                    }
                };

                var setDefaultConfig = function() {
                    // default placeholder height and width values
                    $scope.width = $scope.config.width || $scope.configProperties.standard;
                    $scope.height = $scope.config.height || $scope.configProperties.full;
                    $scope.isPinnable = $scope.config.isPinnable || false;
                    $scope.direction = $scope.config.direction || $scope.configProperties.left_to_right;
                    $scope.slide = $scope.config.slide;
                    $scope.animation = $scope.config.animation !== false;
                    if( $scope.configProperties.isDefaultHeightPanel() ) {
                        $scope.height = $scope.width;
                    }
                    // push panels will always be full height
                    if( $scope.configProperties.isPushPanel() ) {
                        $scope.height = $scope.configProperties.full;
                    }
                    $scope.isAnimationDisabled = !$scope.animation;
                    $scope.isLeftToRight = $scope.direction === $scope.configProperties.left_to_right;
                };

                // close global-naviagtion when click out side
                var autoCloseAble = function( eventData ) {
                    // On narrow mode device, the global navigation panel should close on click of avatar and not on click of body.
                    // This is how other panels work in narrow mode, so added same use case here.
                    if( $scope.isPinnable && !narrowModeSvc.isNarrowMode() ) {
                        $( 'body' ).on( 'click touchstart', function( event ) {
                            var autoCloseRect = elem[ 0 ].getBoundingClientRect();
                            var mouseXCord = event.pageX;
                            // If the panel is already open and it is not pinned and user clicks outside of panel i.e. not on panel itself, then close the panel
                            if( $scope.sidenavOpened &&
                                !$scope.pinned &&
                                $.contains( document, event.target ) &&
                                $( event.target ).closest( '.autoclose' ).length === 0 &&
                                ( mouseXCord > autoCloseRect.right || mouseXCord < autoCloseRect.left ) ) {
                                $scope.$applyAsync( function() {
                                    let shallRemainOpen = $scope.doesSideNavRemainOpen( eventData );
                                    if( !shallRemainOpen ) {
                                        appCtx.getCtx( 'sidenavCommandId' ) === eventData.commandId ? appCtx.unRegisterCtx( 'sidenavCommandId' ) : false;
                                        $scope.view = null;
                                        $scope.setResizeDragHandle( $scope.sidenavOpened );
                                        appCtx.updatePartialCtx( ctxPath + attr.id, {
                                            open: shallRemainOpen,
                                            pinned: $scope.pinned,
                                            slide: $scope.slide
                                        } );
                                        $scope.updateSideNavStatus( shallRemainOpen );
                                    }
                                } );
                                $( 'body' ).off( 'click touchstart' );
                            }
                        } );
                    }
                };

                setDefaultConfig();
                let _ongoing = {};

                var updateArialabel = function( elem, id ) {
                    if( id === 'aw_navigation' ) {
                        $( elem ).attr( 'aria-label', 'i18n.commandPanel' );
                    } else if( id === 'globalNavigationSideNav' ) {
                        $( elem ).attr( 'aria-label', 'i18n.navigationPanel' );
                    }
                    wcagSvc.updateArialabel( elem, '', 'UIElementsMessages' );
                };

                updateArialabel( elem[ 0 ], attr.id );

                $scope.sideNavOpenCloseCallback = function( eventData ) {
                    // All consumers should be using id and eventData should be passed through
                    if( !attr.id || !eventData ) {
                        logger.error( 'id attribute and eventData are required' );
                        return AwPromiseService.instance.resolve();
                    }
                    if( !_ongoing[ eventData.id ] ) {
                        if( attr.id === eventData.id ) {
                            if( eventData.config ) {
                                $scope.width = eventData.config.width || $scope.config.width || $scope.configProperties.standard;
                                $scope.height = eventData.config.height || $scope.config.height || $scope.configProperties.full;
                                $scope.slide = eventData.config.slide || $scope.config.slide || $scope.configProperties.push;
                                $scope.isPinnable = eventData.config.isPinnable || $scope.config.isPinnable || false;
                                if( $scope.configProperties.isDefaultHeightPanel() ) {
                                    $scope.height = $scope.width;
                                }
                                if( $scope.configProperties.isPushPanel() ) {
                                    $scope.height = $scope.configProperties.full;
                                }
                                hasConfigChanged = true;
                            } else if( hasConfigChanged ) {
                                setDefaultConfig();
                                hasConfigChanged = false;
                            }
                            autoCloseAble( eventData );
                            _ongoing[ eventData.id ] = $scope.createSidenav( eventData, attr.id ).then( () => {
                                reCalcPanelPosition();
                                if ( eventData.includeView !== undefined ) {
                                    wcagSvc.focusFirstDescendantWithDelay( elem[ 0 ] );
                                }
                                delete _ongoing[ eventData.id ];
                            } );
                            return _ongoing[ eventData.id ];
                        } // pass keepOthersOpen to keep the other sidenavs open when the current sidenav is opened
                        else if( !eventData.keepOthersOpen ) {
                            // Need to close all the other open panels not having this id
                            return $scope.closeSidenav( eventData );
                        }
                    }
                    return AwPromiseService.instance.resolve();
                };
                // subscribe event
                var sideNav = eventBus.subscribe( 'awsidenav.openClose', ( eventData ) => {
                    return $scope.sideNavOpenCloseCallback( eventData );
                } );

                var sideNavPinned = eventBus.subscribe( 'awsidenav.pinUnpin', function( eventData ) {
                    if( attr.id === eventData.id ) {
                        $scope.togglePinState();
                    }
                } );

                let removeEventListeners = ( mouseEvent ) => {
                    document.removeEventListener( 'mousemove', onMouseMove );
                    document.removeEventListener( 'mouseup', removeEventListeners );
                    document.removeEventListener( 'touchmove', onMouseMove );
                    document.removeEventListener( 'touchend', removeEventListeners );
                    $scope.$applyAsync( function() {
                        // Reapplying the body click event
                        $( 'body' )[ 0 ].style.pointerEvents = 'auto';

                        if( mouseEvent ) {
                            // Publish an event that the sidenav drag has ended
                            eventBus.publish( 'awsidenav.resizeEnded' );
                        }
                    } );
                };

                let onMouseMove = ( e ) => {
                    var pageX = e.pageX || e.touches[ 0 ].pageX;
                    //Update the sidenav width
                    var x = pageX - elem.offset().left;
                    if( x >= 180 && x <= 280 ) {
                        elem.css( 'width', x );
                        // This is required to update the max width of links,
                        // which was previously done with fixed values in CSS
                        elem.find( 'a' ).each( ( index, element ) => {
                            element.style.maxWidth = x - 44 + 'px';
                        } );
                    }
                };

                let onMouseDown = ( e ) => {
                    e.stopPropagation();
                    e.preventDefault();
                    document.addEventListener( 'mousemove', onMouseMove );
                    document.addEventListener( 'touchmove', onMouseMove );
                    document.addEventListener( 'mouseup', removeEventListeners );
                    document.addEventListener( 'touchend', removeEventListeners );

                    // This is required so that the body click event doesn't get triggered on mouseup
                    $( 'body' )[ 0 ].style.pointerEvents = 'none';
                };

                $scope.setResizeDragHandle = ( isSideNavOpened ) => {
                    let dragHandle = document.getElementById( 'globalNavResize' );

                    if( !isSideNavOpened ) {
                        //Remove all event listeners when sidenav is closed
                        dragHandle.removeEventListener( 'mousedown', onMouseDown );
                        removeEventListeners();
                        return;
                    }

                    if( dragHandle ) {
                        //Add mousedown event
                        dragHandle.addEventListener( 'mousedown', onMouseDown );
                        dragHandle.addEventListener( 'touchstart', onMouseDown );
                    }
                };

                // And remove it when the scope is destroyed
                $scope.$on( '$destroy', function() {
                    eventBus.unsubscribe( sideNav );
                    eventBus.unsubscribe( sideNavPinned );
                    var sidenavCmdId = appCtx.getCtx( 'sidenavCommandId' );
                    if( sidenavCmdId && sidenavCmdId === $scope.currentCommandId ) {
                        appCtx.unRegisterCtx( 'sidenavCommandId' );
                    }

                    appCtx.updatePartialCtx( ctxPath + attr.id, null );
                } );

                // On window resize : Side height should be update according to window size.

                $scope.$on( 'windowResize', function() {
                    reCalcPanelPosition();
                } );
            },
            replace: true
        };
    }
] );

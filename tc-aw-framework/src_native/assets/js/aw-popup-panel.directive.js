// Copyright (c) 2020 Siemens

/**
 * @deprecated afx@4.2.0.
 * @alternative AwPopup
 * @obsoleteIn afx@5.1.0
 *
 * @module js/aw-popup-panel.directive
 * aw-popup-panel directives does not manage height and width,to specify it parent directive needs to handle it through CSS.
 */
import app from 'app';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import resizeDetector from 'js/resizeDetector';
import 'js/popupService';
import wcagSvc from 'js/wcagService';
import domUtils from 'js/domUtils';
import AwTimeoutSvc from 'js/awTimeoutService';
var dom = domUtils.DOMAPIs;

app.directive( 'awPopupPanel', [ function() {
    return {
        restrict: 'E',
        transclude: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-popup-panel.directive.html',
        controller: [
            '$scope',
            '$element',
            '$timeout',
            'popupService',
            function( $scope, $element, $timeout, popupSvc ) {
                $scope.clickOutsideToClose = true;
                $scope.showpopup = false;
                let _removeHandlersOnClose = null;
                let panelRef = {  options : {  api: { } } };

                $scope.getAbsoluteTop = function( elem ) {
                    // Get an object top position from the upper left viewport corner
                    if( elem.length > 0 ) {
                        var objElem = elem[ 0 ];
                        var objElemTop = objElem.offsetTop;
                        var objElemParent;
                        while( objElem.offsetParent !== null ) {
                            objElemParent = objElem.offsetParent; // Get parent object reference
                            objElemTop += objElemParent.offsetTop; // Add parent top position
                            objElem = objElemParent;
                        }
                        return objElemTop;
                    }
                };

                $scope.setMaxHeight = function() {
                    if( $( '.popupContent .aw-base-scrollPanel' ).length > 0 ) {
                        $scope.scrollerElem = $( '.popupContent .aw-base-scrollPanel' );
                        var popupContent = $element.find( '.popupContent' );
                        var clientHight = $( window ).height();
                        // unless space is highly limited, leave a gap for the drop shadow, etc
                        var MAX_SIZE = Math.max( clientHight - $scope.getAbsoluteTop( popupContent ) - 20, 0 );
                        _.forEach( $scope.scrollerElem, function( elem ) {
                            elem.style.maxHeight = MAX_SIZE + 'px';
                        } );
                    }
                };

                let _kcEsc = 27;

                $scope.closePopup = function( event, eventData ) {
                    let parent;
                    if( event && event.originalEvent ) {
                        event.originalEvent.stopPropagation();
                        parent = $( event.target ).closest( '.aw-layout-popup.aw-layout-popupOverlay' )[ 0 ];
                    }

                    // don't close popup when click inside this popup
                    if( !parent && $scope.clickOutsideToClose ) {
                        $scope.$evalAsync( function() {
                            $scope.showpopup = false;
                            $( 'body' ).off( 'click touchstart keydown', $scope.closePopup );
                            $scope.$emit( 'awPopupWidget.closed' );
                            if( event && event.keyCode === _kcEsc && eventData && eventData.activeRef === panelRef.options.reference ) {
                                wcagSvc.skipToFirstFocusableElement( panelRef.options.reference, panelRef.options.checkActiveFocusInContainer );
                                eventBus.publish( 'awPopupWidget.outofFocus' );
                            }
                            } );

                        if( $scope._resizeReg ) {
                            $scope._resizeReg();
                            $scope._resizeReg = null;
                        }
                        $scope.cleanupHandlers();
                    }
                };

                $scope.cleanupHandlers = function() {
                    if( _removeHandlersOnClose !== null ) {
                        _removeHandlersOnClose.forEach( function( removeFn ) {
                            removeFn();
                        } );
                        _removeHandlersOnClose = [];
                    }
                };

                function hidePopup( panelRef, isSkippedFocus ) {
                    if( isSkippedFocus === true ) {
                        $scope.closePopup();
                        wcagSvc.skipToFirstFocusableElement( panelRef.options.reference, panelRef.options.checkActiveFocusInContainer );
                        eventBus.publish( 'awPopupWidget.outofFocus' );
                    }
                }

                function configureAutoFocus( eventData ) {
                    let popupUpLevelElement = eventData.popupUpLevelElement;
                    let panelEl = $( popupUpLevelElement ).find( '.aw-layout-popup.aw-layout-popupOverlay' )[ 0 ];
                    if( panelEl ) {
                        if( panelEl.id === undefined || panelEl.id === '' ) {
                            dom.uniqueId( panelEl );
                        }
                        panelRef.panelEl = panelEl;
                        panelRef.options.reference = popupUpLevelElement[ 0 ];
                        panelRef.options.api.hide = hidePopup;
                        panelRef.options.checkActiveFocusInContainer = false;
                        _removeHandlersOnClose = wcagSvc.configureAutoFocus( panelRef );
                    }
                }

                var resizeReg = false;
                $scope.showPopupWidget = function( eventData, currElement, originalEvent ) {
                        $scope.showpopup = true;

                    if( eventData.clickOutsideToClose !== undefined && typeof eventData.clickOutsideToClose === 'boolean' ) {
                        $scope.clickOutsideToClose = eventData.clickOutsideToClose;
                    }

                    $timeout( function() {
                        configureAutoFocus( eventData );
                        var popupElem = $element.find( '.aw-layout-popup' );
                        wcagSvc.focusFirstDescendantWithDelay( popupElem[ 0 ] );
                        if( !$scope._resizeReg ) {
                            $scope._resizeReg = resizeDetector( popupElem[ 0 ], () => {
                                $scope.$emit( 'awPopupWidget.resized' );
                            } );
                        }

                        if( originalEvent ) {
                            $scope.setPosAtCurrElement( currElement, originalEvent );
                        } else {
                            $scope.repositionPopupWidgetEvent( eventData );
                        }

                        $scope.$on( 'windowResize', function() {
                            eventBus.publish( 'awPopupWidget.close' );
                        } );
                        eventBus.publish( 'awPopupWidget.positionComplete' );
                    } );
                };

                $scope.repositionPopupWidgetEvent = function( eventData ) {
                    if( eventData.popupUpLevelElement ) {
                        var popupWidgetElem = eventData.popupUpLevelElement
                            .find( '.aw-layout-popup.aw-layout-popupOverlay' )[ 0 ];
                        if( popupWidgetElem ) {
                            var offsetWidth = popupWidgetElem.offsetWidth;
                            // the drop down's offset height
                            var offsetHeight = popupWidgetElem.offsetHeight;
                            popupSvc.setPopupPosition( eventData.popupUpLevelElement, popupWidgetElem, offsetWidth,
                                offsetHeight );
                            $scope.$apply();
                        }
                    }
                };

                $scope.setPosAtCurrElement = function( currElement, event ) {
                    $scope.$apply();
                    var popups = $( currElement ).find( '.aw-layout-popup.aw-layout-popupOverlay' );
                    var height = popups[ 0 ].offsetHeight;

                    // Check if context menu would go outside of visible window, and move up if needed
                    var maxYNeeded = event.clientY ? event.clientY + height : event.touches[ 0 ].clientY + height;
                    if( maxYNeeded >= window.innerHeight ) {
                        popups.css( 'top', event.clientY ? event.clientY - height : event.touches[ 0 ].clientY - height );
                    } else {
                        popups.css( 'top', event.clientY ? event.clientY : event.touches[ 0 ].clientY );
                    }
                    popups.css( 'left', event.clientX ? event.clientX : event.touches[ 0 ].clientY );
                };

                $scope.$watch( 'showpopup', function _watchShowPopup( newValue, oldValue ) {
                    if( !( _.isNull( newValue ) || _.isUndefined( newValue ) ) && newValue !== oldValue ) {
                        if( newValue === true ) {
                            $timeout( function() {
                                $( 'body' ).on( 'click touchstart keydown', $scope.closePopup );
                            }, 200 );
                        } else {
                            $timeout( function() {
                                $( 'body' ).off( 'click touchstart keydown', $scope.closePopup );
                            }, 200 );
                            $scope.cleanupHandlers();
                        }
                    }
                }, true );
            }
        ],
        link: function( scope ) {
            // Add listener to show the popup
            scope.$on( 'awPopupWidget.open', function _onPopupOpen( event, eventData, currElement, originalEvent ) {
                scope.showPopupWidget( eventData, currElement, originalEvent );
            } );

            // Add listener to close the popup
            scope.$on( 'awPopupWidget.close', function _onPopupClose(  event, eventData ) {
                scope.closePopup( eventData.originalEvent, eventData.data );
            } );

            // Add listener to readjust the popup
            scope.$on( 'awPopupWidget.reposition', function _onPopupReposition( event, eventData ) {
                scope.showPopupWidget( eventData );
            } );

            // subscribe event
            var closePopupEvent = eventBus.subscribe( 'awPopupWidget.close', function( eventData ) {
                scope.$emit( 'awPopupWidget.close', { originalEvent: event, data: eventData } );
            } );

            // And remove it when the scope is destroyed
            scope.$on( '$destroy', function() {
                eventBus.unsubscribe( closePopupEvent );
                $( 'body' ).off( 'click touchstart keydown', scope.closePopup );
                scope.cleanupHandlers();
                if( scope._resizeReg ) {
                    scope._resizeReg();
                    scope._resizeReg = null;
                }
            } );
        }
    };
} ] );

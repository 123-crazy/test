// Copyright (c) 2020 Siemens

/**
 * @module js/aw.property.error.controller
 */
import app from 'app';
import ngModule from 'angular';
import $ from 'jquery';
import browserUtils from 'js/browserUtils';
import declUtils from 'js/declUtils';
import logger from 'js/logger';
import 'js/uwUtilService';
import 'js/uwValidationService';

/**
 * A controller for aw-property-error directive.
 *
 * @memberof NgControllers
 * @member awPropertyErrorController
 */
app.controller( 'awPropertyErrorController', [
    '$scope',
    '$element',
    '$timeout',
    'uwUtilService',
    'uwValidationService',
    function Controller( $scope, $element, $timeout, uwUtilSvc, uwValidationSvc ) {
        $scope.errorApi = {};

        var api = $scope.errorApi;

        api.errorVerticalAdj = 0;
        api.errorSpan = null;
        api.hideCancelled = false;
        api.showRelative = false;
        api.errorLeft = 0;
        api.errorTop = 0;
        api.showErrorFade = true;
        api.showCustomError = false;

        if( !$scope.prop ) {
            return;
        }

        api.errorMsg = $scope.prop.error;

        if( $scope.prop.validationCriteria ) {
            $scope.$watchCollection( 'prop.validationCriteria', function _watchPropValidationCriteria(
                newValue, oldValue ) {
                if( newValue !== oldValue && $scope.prop ) {
                    var customValidationErrorMsg = $scope.prop.error;
                    if( oldValue && customValidationErrorMsg ) {
                        for( var inx in oldValue ) {
                            if( oldValue[ inx ] ) {
                                customValidationErrorMsg = customValidationErrorMsg.replace(
                                    oldValue[ inx ], '' );
                            }
                        }
                    }
                    $scope.errorApi.showCustomError = true;
                    uwValidationSvc.setErrorMessage( $scope, customValidationErrorMsg );
                    var elems = $element.find( 'input' );
                    if( elems && elems.length > 0 ) {
                        elems[ 0 ].dispatchEvent( declUtils.createCustomEvent( 'validationCheck', $scope.prop.validationCriteria[ 0 ], true, false ) );
                    }
                }
            } );
        }

        api.errorTimer = $timeout( function() {
            var rootNgElem = $element.find( '.aw-widgets-innerWidget' );
            if( rootNgElem && rootNgElem[ 0 ] ) {
                var innerElem = rootNgElem[ 0 ].firstElementChild;
                if( innerElem ) {
                    var innerNgElem;
                    if( innerElem && innerElem.children.length > 0 ) {
                        if( innerElem.tagName === 'SPAN' ) {
                            innerNgElem = ngModule.element( innerElem );
                            innerNgElem.bind( 'click', api.showErrorFunction );
                        }
                        for( var i = 0; i < innerElem.children.length; i++ ) {
                            var childElem = innerElem.children[ i ];
                            if( childElem.tagName !== 'LABEL' ) {
                                var childNgElem = ngModule.element( childElem );
                                childNgElem.bind( 'focus', api.showErrorFunction );
                                childNgElem.bind( 'blur', api.hideErrorFunction );
                            }
                        }
                    } else {
                        if( innerElem.tagName === 'SPAN' ) {
                            innerNgElem = ngModule.element( innerElem );
                            innerNgElem.bind( 'click', api.showErrorFunction );
                        } else {
                            innerNgElem = ngModule.element( innerElem );
                            innerNgElem.bind( 'focus', api.showErrorFunction );
                            innerNgElem.bind( 'blur', api.hideErrorFunction );
                        }
                    }
                } else {
                    logger
                        .warn( 'awPropertyErrorController: Unable to locate 1st child of aw-property-error root. Suspect malformed html.' );
                }
            }

            // this listener is needed for the first time if user is already focused on the element and
            // at that time if the error occurs then it needs to be positioned.
            // It is also used to coordinate the 2 error strings...
            $scope.$watch( function _watchErrorMsg() {
                return api.errorMsg;
            }, function( newValue, oldValue ) {
                if( newValue !== undefined && newValue !== oldValue ) {
                    if( $scope.prop.propApi ) {
                        // Before clearing out the error, check to see if there are other elements with errors
                        if( !newValue ) {
                            var parentElem = $element
                                .parents( '.aw-widgets-propertyLabelTopValueContainer' );
                            var errors = ngModule.element( parentElem ).find( 'aw-property-error' );
                            var existingError = null;
                            errors.each( function() {
                                var error = ngModule.element( this ).scope().errorApi.errorMsg;
                                if( error ) {
                                    existingError = error;
                                }
                            } );

                            // If there's another, old error, instead of clearing, set that
                            if( existingError ) {
                                $scope.prop.error = existingError;
                                return;
                            }
                        }
                        $scope.prop.error = $scope.errorApi.errorMsg;
                    }
                }
                if( newValue && !api.showError ) {
                    api.showErrorFunction( api.eventTarget );
                } else {
                    if( newValue !== oldValue ) {
                        // Reposition when new error message reflects in the DOM.
                        $timeout( function() {
                            api.setRelativeErrorPosition();
                        } );
                    }
                }
            } );
        } );

        /**
         * Called to delegate an 'ng-click' on the (span) holding the error text.
         *
         * @memberof NgControllers.awPropertyErrorController
         */
        api.cancelErrorHide = function() {
            $timeout.cancel( api.errorTimeout );
            if( $scope.prop.mobilecheck && !api.hideCancelled ) {
                api.hideCancelled = true;
                api.showError = true;
            }
            api.cancelErrorHideTimer = $timeout( function() {
                $( 'body' ).on( 'click touchstart', api.hideErrorFunction );
            }, 100 );
        };

        /**
         * Called to delegate a 'blur' on the (span) holding the error text.
         *
         * @memberof NgControllers.awPropertyErrorController
         */
        api.hideErrorFunction = function() {
            $( 'body' ).off( 'click touchstart', api.hideErrorFunction );
            $timeout.cancel( api.errorTimeout );
            api.errorTimeout = $timeout( api.onTimeout, 100 );
        };

        /**
         * @memberof NgControllers.awPropertyErrorController
         * @private
         */
        api.removeErrorFunction = function() {
            api.showErrorFade = false;
            $timeout.cancel( api.errorTimeout );
            $( 'body' ).off( 'click touchstart', api.hideErrorFunction );
        };

        /**
         * @memberof NgControllers.awPropertyErrorController
         * @private
         */
        api.positionError = function() {
            if( browserUtils.isMobileOS ) {
                api.errorPositionTimer = $timeout( function() {
                    $( 'body' ).on( 'click touchstart', api.hideErrorFunction );
                }, 100 );
            } else {
                uwUtilSvc.handleScroll( api, $( api.eventTarget ), 'property_error', function() {
                    $( api.$scrollPanel ).off( 'scroll.property_error' );
                    $element.find( '.aw-widgets-errorHint' ).hide();
                    api.removeErrorFunction();
                } );
            }

            api.setRelativeErrorPosition();

            api.showError = true;
            api.errorTimeout = $timeout( api.onTimeout, 6000 );
        };

        api.setRelativeErrorPosition = function() {
            api.setEventTarget();
            var propertyDimensions = api.eventTarget.getBoundingClientRect();
            var heightOfError = api.errorSpan.offsetHeight;
            var heightOfEditbox = api.eventTarget.offsetHeight;
            var spaceAbove = 0;
            if( api.errorSpan.parentElement !== null &&
                api.errorSpan.parentElement.offsetParent !== null ) {
                spaceAbove = api.errorSpan.parentElement.offsetParent.offsetHeight;
            }
            /**
             * Relative position is not correct in IE versions for the error pop up and hence taking the
             * wrong position No need to take the relative position in case of IE. Taken reference from
             * uwDirectiveDateTimeService for IE specific case
             */
            if( $( api.eventTarget ).parents( 'div.ui-grid-canvas' ).length > 0 &&
                !browserUtils.isIE ) { // ///checks whether the element exists in the DOM
                var propertyDimensionsReference = $( api.eventTarget ).parents(
                    'div.ui-grid-contents-wrapper' )[ 0 ].getBoundingClientRect();
                api.errorLeft = propertyDimensions.left - propertyDimensionsReference.left;
                api.errorTop = window.pageYOffset +
                    ( propertyDimensions.top - propertyDimensionsReference.top );
            } else {
                api.errorLeft = propertyDimensions.left;
                api.errorTop = window.pageYOffset + propertyDimensions.top;
            }
            if( spaceAbove >= heightOfError ) {
                /**
                 * clientHeight is 0 means the error is still not shown, so, set showError to false
                 * This will make sure that the errorHint rendered by angular will not show on the top
                 * left corner of window, showError is reset back to true in api.positionError
                 */
                if( api.errorSpan.clientHeight === 0 ) {
                    api.showError = false;
                } else {
                    api.errorVerticalAdj = 0 - ( api.errorSpan.clientHeight + 1 ) + 'px';
                }
            } else {
                api.errorVerticalAdj = heightOfEditbox + 'px';
            }
        };

        /**
         * @memberof NgControllers.awPropertyErrorController
         * @private
         */
        api.showErrorFunction = function( event ) {
            if( api.errorMsg ) {
                api.showError = true;
                api.hideCancelled = false;
                $( $element.find( '.aw-widgets-errorHint' ) ).show();
                api.showErrorFade = true;
                api.errorSpan = $element.find( '.aw-widgets-errorHint' )[ 0 ];

                if( api.errorSpan !== null ) {
                    api.setEventTarget();
                    var propertyDimensions = api.eventTarget.getBoundingClientRect();
                    api.errorWidth = propertyDimensions.width - 20;

                    /**
                     * calculate the error position before the value function in $scope.$watch triggers errorHint
                     * this error is rendered on top left corner of the window. So, we are just positioning the error
                     * to a consistent position.
                     */
                    api.setRelativeErrorPosition();

                    api.showErrorTimer = $timeout( function() {
                        api.focusListener = $scope.$watch( function _watchWindowHeight() {
                            return window.innerHeight;
                        }, function( newValue, oldValue ) {
                            if( newValue === oldValue ) {
                                api.focusListener();
                                api.positionError( event );
                            }
                        } );
                    }, 300 );
                }
            }
        };

        api.setEventTarget = function() {
            if( $element ) {
                api.errorSpan = $element.find( '.aw-widgets-errorHint' )[ 0 ];

                if( api.errorSpan !== null ) {
                    if( $element.find( 'aw-property-error' ).length > 1 ) {
                        api.eventTarget = $element.find( 'aw-property-error' ).find(
                            '.aw-widgets-innerWidget' )[ 0 ].firstElementChild;
                    } else {
                        api.eventTarget = $( $element.find( '.aw-widgets-innerWidget' ) )[ 0 ].firstElementChild;
                    }
                }
            }
        };

        /**
         * @memberof NgControllers.awPropertyErrorController
         * @private
         */
        $scope.setTarget = function( target ) {
            $scope.eventTarget = target;
        };

        /**
         * @memberof NgControllers.awPropertyErrorController
         * @private
         */
        api.onTimeout = function() {
            api.showError = false;

            if( $scope.$scrollPanel ) {
                $scope.$scrollPanel = null;
            }
            $( 'body' ).off( 'click touchstart', api.hideErrorFunction );
        };

        $scope.$on( '$destroy', function() {
            // Destroying all timeout's
            if( api.errorTimer ) {
                $timeout.cancel( api.errorTimer );
            }
            if( api.cancelErrorHideTimer ) {
                $timeout.cancel( api.cancelErrorHideTimer );
            }
            if( api.errorPositionTimer ) {
                $timeout.cancel( api.errorPositionTimer );
            }
            if( api.showErrorTimer ) {
                $timeout.cancel( api.showErrorTimer );
            }
            if( api.errorTimeout ) {
                $timeout.cancel( api.errorTimeout );
            }
            if( api.$scrollPanel ) {
                api.$scrollPanel = null;
                $( api.$scrollPanel ).off( 'scroll.property_error' );
            }

            // detach event handler
            $( 'body' ).off( 'click touchstart', api.hideErrorFunction );

            // Remove element
            if( $element ) {
                $element.remove();
                $element.empty();
                $element = null;
            }
        } );
    }
] );

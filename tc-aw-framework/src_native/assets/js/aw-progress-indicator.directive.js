// Copyright (c) 2020 Siemens

/**
 * @module js/aw-progress-indicator.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import browserUtils from 'js/browserUtils';

/**
 * Definition for the (aw-progress-indicator) directive.
 *
 * @example TODO
 *
 * @member aw-progress-indicator
 * @memberof NgElementDirectives
 */
app.directive( 'awProgressIndicator', [
    '$timeout',
    function( $timeout ) {
        return {
            restrict: 'E',
            scope: {
                name: '@?'
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-progress-indicator.directive.html',
            link: function( $scope, $element ) {
                /**
                 * state of progress indicator
                 */
                var state = false;

                /**
                 * Ref count of progress event, only stop progress bar if ref count is zero
                 */
                var progressRefCount = 0;

                var api = {};
                $scope.showProgressBar = state;

                api.toggleProgressState = function( show ) {
                    /**
                     * Time to wait before starting the animation
                     */
                    var _animationWaitTime = 1000;

                    if( show ) {
                        api.animationWaitTimer = $timeout( function() {
                            // And then check to make sure there are operations running and
                            // the indicator is not already activated before starting it
                            if( state !== progressRefCount > 0 ) {
                                state = progressRefCount > 0;

                                $scope.$evalAsync( function() {
                                    $scope.showProgressBar = state;
                                } );
                            }
                        }, _animationWaitTime );
                    } else {
                        // Don't toggle showProgressBar if the state is already correct
                        if( state !== progressRefCount > 0 ) {
                            state = progressRefCount > 0;

                            $scope.$evalAsync( function() {
                                $scope.showProgressBar = state;
                            } );
                        }
                    }
                };
                // Show the progress indicator
                var starProgressIndicator = function( eventData ) {
                    addIEAnimationInCSS( eventData );
                    progressRefCount++;
                    api.toggleProgressState( true );
                };

                // hide the progress indicator
                var stopProgressIndicator = function( eventData ) {
                    removeIEAnimationInCSS( eventData );
                    progressRefCount--;

                    if( progressRefCount < 0 ) {
                        progressRefCount = 0;
                    }

                    if( progressRefCount === 0 ) {
                        api.toggleProgressState( false );
                    }
                };

                var addIEAnimationInCSS = function( eventData ) {
                    if( browserUtils.isNonEdgeIE && eventData && typeof eventData.endPoint === 'string' && eventData.endPoint.indexOf( 'fms' ) >= 0 ) {
                        var progressBarElement = $element.find( 'div.aw-layout-progressBarCylon' );
                        if( progressBarElement ) {
                            progressBarElement.css( { 'animation-name': 'loadingieonly, loading-opacity' } );
                            progressBarElement.css( { 'animation-duration': '5s, 5s' } );
                        }
                    }
                };

                var removeIEAnimationInCSS = function( eventData ) {
                    if( browserUtils.isNonEdgeIE && eventData && typeof eventData.endPoint === 'string' && eventData.endPoint.indexOf( 'fms' ) >= 0 ) {
                        var progressBarElement = $element.find( 'div.aw-layout-progressBarCylon' );
                        if( progressBarElement ) {
                            progressBarElement.css( { 'animation-name': 'loading, loading-opacity' } );
                            progressBarElement.css( { 'animation-duration': '2s, 2s' } );
                        }
                    }
                };

                // if progress indicator has name, qualified the listeners with it's name.
                if( $scope.name && $scope.name !== '' ) {
                    api.namedProgressStartListener = eventBus.subscribe( $scope.name + '-progress.start', function() {
                        starProgressIndicator();
                    } );

                    api.namedProgressStopListener = eventBus.subscribe( $scope.name + '-progress.end', function() {
                        stopProgressIndicator();
                    } );
                } else {
                    api.progressStartListener = eventBus.subscribe( 'progress.start', function( eventData ) {
                        starProgressIndicator( eventData );
                    } );

                    api.progressStopListener = eventBus.subscribe( 'progress.end', function( eventData ) {
                        stopProgressIndicator( eventData );
                    } );
                }

                $scope.$on( '$destroy', function() {
                    if( $scope.name && $scope.name !== '' ) {
                        eventBus.unsubscribe( api.namedProgressStartListener );
                        eventBus.unsubscribe( api.namedProgressStopListener );
                    } else {
                        eventBus.unsubscribe( api.progressStartListener );
                        eventBus.unsubscribe( api.progressStopListener );
                    }

                    if( api.animationWaitTimer ) {
                        $timeout.cancel( api.animationWaitTimer );
                    }
                } );
            }
        };
    }
] );

// Copyright (c) 2020 Siemens

/**
 * Defines the {@link NgElementDirectives.aw-global-navigation-panel}
 *
 * @module js/aw-global-navigation-panel.directive
 * @deprecated, use aw-sidenav instead
 */
import app from 'app';
import $ from 'jquery';
import 'js/aw-column.directive';
import 'js/aw-row.directive';
import 'js/aw-include.directive';
import 'js/exist-when.directive';
import 'js/aw-property-image.directive';

/**
 * Directive to display the global navigation toolbar panel.
 * @example <aw-global-navigation-panel></aw-global-navigation-panel>
 *
 * @member aw-global-navigation-panel
 * @memberof NgElementDirectives
 *
 * @deprecated afx@4.2.0
 * @alternative I comes as a part of common frame
 * @obsoleteIn afx@5.1.0
 */

app.directive( 'awGlobalNavigationPanel', [
    '$timeout',
    function( $timeout ) {
        return {
            restrict: 'E',
            replace: false,
            scope: {
                viewName: '=',
                showPanel: '=',
                isPinned: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-global-navigation-panel.directive.html',
            controller: [ '$scope', function( $scope ) {
                $scope.showPanel = String( Boolean( $scope.isPinned ) );
                $scope.togglePinState = function() {
                    $scope.isPinned = !$scope.isPinned;
                    // Specifically done for IE and Edge, since they don't consider width of aw-global-navigation without specifying a specific width to it:
                    // Toggle width of aw-global-navigation between 64px and 246px based on whether panel is pinned or not
                    $( 'aw-global-navigation' ).toggleClass( 'withPanelPinned' );
                    $( '.awRoot .global-navigation-parent' ).toggleClass( 'withPanelPinned' );
                    $( '.aw-layout-mainView' ).toggleClass( 'aw-global-navigationPanelPinned' );
                };
                $scope.hidePanel = function() {
                    $scope.isPinned = false;
                    $scope.showPanel = 'false';
                };
                $scope.$watch( 'showPanel', function( newValue ) {
                    if( newValue === 'true' ) {
                        $timeout( function() {
                            var oldPanelName = $scope.viewName;
                            $( 'body' ).on( 'click touchstart', function( element ) {
                                // If the panel is already open and user clicks outside of panel i.e. not on panel itself, then close the panel
                                if( $scope.showPanel === 'true' && $( element.target ).closest( 'aw-global-navigation-panel' ).length === 0 ) {
                                    $scope.$applyAsync( function() {
                                        // Only differing condition is when user has multiple commands and he/ she clicks that command, then check if panelName has changed
                                        if( oldPanelName === $scope.viewName && !$scope.isPinned ) {
                                            // close the current panel
                                            $scope.showPanel = 'false';
                                        } else {
                                            // do not close panel, as it will load another view. Also, oldPanelName becomes this new name
                                            oldPanelName = $scope.viewName;
                                        }
                                    } );
                                }
                            } );
                        } );
                    } else {
                        $( 'body' ).off( 'click touchstart' );
                        $( 'aw-global-navigation' ).removeClass( 'withPanelPinned' );
                        $( '.awRoot .global-navigation-parent' ).removeClass( 'withPanelPinned' );
                        $( '.aw-layout-mainView' ).removeClass( 'aw-global-navigationPanelPinned' );
                    }
                } );
            } ]
        };
    }
] );

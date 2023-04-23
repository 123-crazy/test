// Copyright (c) 2020 Siemens

/**
 * @module js/aw-tab.directive
 */
import app from 'app';
import analyticsSvc from 'js/analyticsService';
import 'js/aw-tab.controller';
import 'js/aw-pic.directive';
import wcagSvc from 'js/wcagService';
import viewModelSvc from 'js/viewModelService';
import 'js/exist-when.directive';

/**
 * Inner tab directive that builds the tab list.
 *
 * @example <aw-tab tab-model="model"></aw-tab>
 *
 * @member aw-tab
 * @memberof NgElementDirectives
 *
 * @return {Object} Directive's definition object.
 */

app.directive( 'awTab', [ '$timeout', function( $timeout ) {
    return {
        restrict: 'E',
        require: '^?awTabContainer',
        replace: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-tab.directive.html',
        scope: {
            tabModel: '='
        },
        link: function( scope, $element, attrs, tabContainerCtrl ) {
            var declViewModel = viewModelSvc.getViewModel( scope, true );
            $timeout( function() {
                if( scope.tabModel && scope.tabModel.selectedTab === true ) {
                    if( tabContainerCtrl !== null ) {
                        tabContainerCtrl.updateSelectedTab( scope.tabModel );
                        if( tabContainerCtrl.isTabClicked === true ) {
                            wcagSvc.updateFocusStartPoint( $element.find( 'a' )[ 0 ] );
                        }
                    }
                }

                // tabContainerCtrl.checkInitialSelection();
                // Updates the selected tab
                // The change will be picked up by the watch
                scope.selectCurrentTab = function() {
                    scope.tabModel.selectedTab = true;
                    if( tabContainerCtrl !== null ) {
                        tabContainerCtrl.isTabClicked = true;
                        tabContainerCtrl.updateSelectedTab( scope.tabModel );

                        // Publish the Tab Selection event to analytics
                        var sanEventData = {
                            sanAnalyticsType: 'Tab',
                            sanCommandId: scope.tabModel.id,
                            sanCommandTitle: scope.tabModel.name
                        };
                        analyticsSvc.logCommands( sanEventData );
                    }
                };
                //Close tab on Key Press
                scope.closeKeyTab = function( event ) {
                    if( wcagSvc.isValidKeyPress( event ) ) {
                        if( tabContainerCtrl !== null ) {
                            tabContainerCtrl.closeTab( scope.tabModel );
                            declViewModel.removedTab = scope.tabModel;
                            if( scope.tabModel.closeCallback ) {
                                viewModelSvc.executeCommand( declViewModel, scope.tabModel.closeCallback, scope );
                            }
                        }
                    }
                };
                //Close tab
                scope.closeClickTab = function() {
                    if( tabContainerCtrl !== null ) {
                        tabContainerCtrl.closeTab( scope.tabModel );
                        declViewModel.removedTab = scope.tabModel;
                        if( scope.tabModel.closeCallback ) {
                            viewModelSvc.executeCommand( declViewModel, scope.tabModel.closeCallback, scope );
                        }
                    }
                };
            }, 0, false );

            // keypress while tab is focussed
            scope.onKeyTab = function( event ) {
                if( wcagSvc.isValidKeyPress( event ) ) {
                    scope.selectCurrentTab();
                }
            };

            // mouse click on tab
            scope.onClickTab = function( event ) {
                scope.selectCurrentTab();
            };

            scope.$on( '$destroy', function() {
                $element.remove();
            } );
        }
    };
} ] );

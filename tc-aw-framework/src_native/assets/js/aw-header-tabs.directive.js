// Copyright (c) 2020 Siemens

/**
 * Directive to display the header.
 *
 * @module js/aw-header-tabs.directive

 */
import app from 'app';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import ngModule from 'angular';
import 'js/aw-tab-container.directive';
import 'js/aw-tab.directive';

/**
 * @example <aw-header-tabs  tab-container-model="tabsModel"></aw-header-tabs>
 *
 * @member aw-header-tabs
 * @memberof NgElementDirectives
 * @deprecated afx@4.1.0.
 * @alternative aw-tab-set
 * @obsoleteIn afx@5.0.0
 */
app.directive( 'awHeaderTabs', [
    function() {
        return {
            restrict: 'E',
            scope: {
                tabsModel: '=tabContainerModel'
            },
            controller: [ '$scope', '$state', function( $scope, $state ) {
                $scope.api = function( pageId, tabTitle ) {
                    var tabToSelect;
                    if( tabTitle ) {
                        tabToSelect = $scope.tabsModel.filter( function( tab ) {
                            return tab.name === tabTitle;
                        } )[ 0 ];
                    } else {
                        tabToSelect = $scope.tabsModel.filter( function( tab ) {
                            return tab.pageId === pageId;
                        } )[ 0 ];
                    }
                    if( tabToSelect ) {
                        // When the tab widget is forced to update after the state has already changed it will still trigger callback
                        if( tabToSelect.state !== $state.current.name ) {
                            // If there is an active tab
                            if( $scope.activeTab ) {
                                // Save the active parameters
                                $scope.activeTab.params = ngModule.copy( $state.params );
                            }
                            // Switch to the new state
                            if( tabToSelect.params ) {
                                $state.go( tabToSelect.state, tabToSelect.params );
                            } else {
                                $state.go( tabToSelect.state );
                            }
                        }
                        $scope.activeTab = tabToSelect;
                    } else {
                        logger.error( 'Missing tab was selected: ' + tabTitle );
                    }
                };

                // Handler for when sublocation changes without tab widget
                // ex back button is clicked
                $scope.$on( '$stateChangeSuccess', function() {
                    // If the tabs have not been updated but the state has changed
                    if( $scope.activeTab ) {
                        if( $scope.activeTab.state !== $state.current.name ) {
                            // Sync the tab selection
                            $scope.tabsModel.forEach( function( tab ) {
                                if( tab.state === $state.current.name && !tab.selectedTab ) {
                                    // Broadcast that the selected tab needs to be updated
                                    $scope.$broadcast( 'NgTabSelectionUpdate', tab );
                                }
                            } );
                        }
                    }
                } );
            } ],
            templateUrl: app.getBaseUrlPath() + '/html/aw-header-tabs.directive.html'
        };
    }
] );

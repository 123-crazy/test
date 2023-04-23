// Copyright (c) 2020 Siemens

/**
 * @module js/aw-tab-container.controller
 */
import app from 'app';
import $ from 'jquery';
import wcagSvc from 'js/wcagService';

/**
 * Controller of aw-tab-container
 *
 * @memberof NgControllers
 * @member awTabContainerController
 */
app.controller( 'awTabContainerController', [ '$scope', function( $scope ) {
    var self = this;

    $scope.tabs = null;
    if( !$scope.tabsModel ) {
        $scope.tabsModel = [];
    }
    $scope.selectedObject = {};

    if( $scope.$parent && $scope.$parent.visibleTabs ) {
        $scope.tabsModel = $scope.$parent.visibleTabs;
        $scope.selectedObject = $scope.$parent.selectedObject;
    }

    $scope.tabApi = null;

    if( $scope.tabContainerModel ) {
        $scope.tabsModel = $scope.tabContainerModel;
    }

    if( $scope.callback ) {
        $scope.tabApi = $scope.callback;
    }

    if( $scope.$parent && $scope.$parent.tabApi ) {
        $scope.tabApi = $scope.$parent.tabApi;
    }

    $scope.webkitPrefix = '';
    if( navigator.userAgent.toLowerCase().indexOf( 'applewebkit' ) !== -1 ) {
        $scope.webkitPrefix = '-webkit-';
    }

    /**
     * @memberof NgControllers.awTabContainerController
     *
     * @param {Object} tabsModel -
     * @return {Void}
     */
    self.setData = function( tabsModel ) {
        $scope.$apply( function() {
            $scope.tabsModel = tabsModel;
        } );
    };

    /**
     * Method to be called from the TAB container
     *
     * @memberof NgControllers.awTabContainerController
     *
     * @param {NgTabItem} selectedTab -
     * @return {Void}
     */
    self.updateSelectedTab = function( selectedTab ) {
        if( !$scope.selectedObject ) {
            $scope.selectedObject = {};
        }

        if( selectedTab !== $scope.selectedObject.tab ) {
            $scope.selectedObject.tab = selectedTab;
            if( $scope.updateSelectedTabById ) {
                $scope.updateSelectedTabById( parseInt( $scope.selectedObject.tab.pageId, 10 ) );
            } else {
                if( $scope.$parent.updateSelectedTabById ) {
                    $scope.$parent.updateSelectedTabById( parseInt( $scope.selectedObject.tab.pageId, 10 ) );
                }
            }
            $scope.setSelectedTab();
        }
    };
    /**
     * Method to be called from the closing TAB container
     *
     * @memberof NgControllers.awTabContainerController
     *
     * @param {NgTabItem} tabToRemove
     * @return {Void}
     */
    self.closeTab = function( tabToRemove ) {
        const index = $scope.tabsModel.indexOf( tabToRemove );
         $scope.tabsModel.splice( index, 1 );
        if( tabToRemove.selectedTab ) {
            if( index === 0 ) {
                // Select next tab
                $scope.tabsModel[ index].selectedTab = true;
                $scope.$broadcast( 'NgTabSelectionUpdate', $scope.tabsModel[ index ] );
            } else {
                // Select previous tab
                $scope.tabsModel[ index - 1 ].selectedTab = true;
                $scope.$broadcast( 'NgTabSelectionUpdate', $scope.tabsModel[ index - 1 ] );
            }
        }
    };

    /**
     * Method to be called from the TAB container
     *
     * @memberof NgControllers.awTabContainerController
     *
     * @param {NgTabItem} targetTab - Tab to be highlighted
     * @return {Void}
     */
    self.highlightTab = function( targetTab ) {
        const tabModel = $scope.tabsModel.filter( tab => tab.tabKey === targetTab.tabKey )[0];
        if( tabModel && tabModel.displayTab === true ) {
            var tabContainerDomEl = $scope.tabBarContentElement;
            if( tabContainerDomEl.children.length > 0 ) {
                for( var tabNdx = 0; tabNdx < tabContainerDomEl.children.length; tabNdx++ ) {
                    if( tabContainerDomEl.children[tabNdx].innerText === targetTab.name ) {
                        var tabEl =  tabContainerDomEl.children[tabNdx];
                        if( tabEl ) {
                            var tabElFocus = $( tabEl ).find( 'a' );
                            if( tabElFocus[0] ) {
                                wcagSvc.afxFocusElement( tabElFocus );
                            }
                        }
                        break;
                    }
                }
            }
        }
        else if( tabModel && tabModel.displayTab === false ) {
            if( $scope.showArrow ) {
                var arrowChevron = $scope.tabContainer.find( 'div.aw-jswidget-tabContainer .aw-jswidget-controlArrow' );
                if( arrowChevron[0] ) {
                    wcagSvc.afxFocusElement( arrowChevron );
                }
            }
        }
    };

    // Event is fired when tab selection needs to be updated
    $scope.$on( 'NgTabSelectionUpdate', function( event, tab ) {
        self.updateSelectedTab( tab );
        $scope.refreshTabsBar();
    } );
} ] );

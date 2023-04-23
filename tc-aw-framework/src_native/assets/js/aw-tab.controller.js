// Copyright (c) 2020 Siemens

/**
 * @module js/aw-tab.controller
 */
import app from 'app';

/**
 * Controller referenced from the 'div' containing all the tab UI.
 *
 * @member awTabController
 * @memberof NgControllers
 */
app.controller( 'awTabController', [ '$scope', '$element', '$interval', '$filter', '$timeout', //
    function( $scope, $element, $interval, $filter, $timeout ) {
        var self = this;
        $scope.selectedObject = {};
        $scope.$on( '$destroy', function() {
            $element.remove();
        } );

        /**
         * @memberof NgControllers.awTabController
         *
         * @param {Object} tabsModel - Tab model to be set on this controller's scope.
         * @return {Void}
         */
        self.setData = function( tabsModel ) {
            $scope.$evalAsync( function() {
                $scope.tabsModel = tabsModel;
            } );
        };

        /**
         * Set api object for page callback and initialize the tab bar.
         *
         * @memberof NgControllers.awTabController
         *
         * @param {Callback} apiFn - API for call backs from this controller.
         * @return {Void}
         */
        $scope.setCallbackApi = function( apiFn ) {
            $scope.tabApiFn = apiFn;
            $scope.clearTabs();
            $timeout( function() {
                $scope.$apply();
            } );
        };

        /**
         * Add a tab to the Tab Bar
         *
         * @memberof NgControllers.awTabController
         *
         * @param {NgTabItem} tabItem - Tab Object
         * @return {Void}
         */
        $scope.addTab = function( tabItem ) {
            $scope.$evalAsync( function() {
                var addToArray = true;
                for( var i = 0; i < $scope.tabsModel.length; i++ ) {
                    if( $scope.tabsModel[ i ].pageId === tabItem.pageId ) {
                        addToArray = false;
                    }
                }
                if( addToArray ) {
                    $scope.tabsModel.push( tabItem );
                    var orderBy = $filter( 'orderBy' );
                    $scope.order = function( predicate, reverse ) {
                        $scope.tabsModel = orderBy( $scope.tabsModel, predicate, reverse );
                    };
                    $scope.order( 'pageId', false );
                }
                $timeout( function() {
                    $scope.$apply();
                } );
            } );
        };

        /**
         * Remove tabs from the Tab Bar
         *
         * @memberof NgControllers.awTabController
         *
         * @param {Array} pageIds - PageIds to remove
         * @return {Void}
         */
        $scope.removeTabs = function( pageIds ) {
            $scope.$evalAsync( function() {
                for( var i = 0; i < pageIds.length; i++ ) {
                    for( var j = 0; j < $scope.tabsModel.length; j++ ) {
                        if( $scope.tabsModel[ j ].pageId == pageIds[ i ] ) { // eslint-disable-line eqeqeq
                            $scope.tabsModel.splice( j, 1 );
                        }
                    }
                }
                $timeout( function() {
                    $scope.$apply();
                } );
            } );
        };

        /**
         * Clear the current tabs.
         *
         * @memberof NgControllers.awTabController
         * @return {Void}
         */
        $scope.clearTabs = function() {
            $scope.$evalAsync( function() {
                $scope.tabsModel = [];
            } );
        };

        /**
         * Update the currently selected Tab
         *
         * @memberof NgControllers.awTabController
         *
         * @param pageId PageId to set selected.
         * @return {Void}
         */
        $scope.updateSelectedTabById = function( pageId ) {
            $scope.$evalAsync( function() {
                for( var i = 0; i < $scope.tabsModel.length; i++ ) {
                    if( $scope.tabsModel[ i ].pageId === pageId ) {
                        $scope.tabsModel[ i ].selectedTab = true;
                        $scope.selectedObject.tab = $scope.tabsModel[ i ];
                    } else {
                        $scope.tabsModel[ i ].selectedTab = false;
                    }
                }
                $timeout( function() {
                    $scope.$apply();
                } );
            } );
        };
    }
] );

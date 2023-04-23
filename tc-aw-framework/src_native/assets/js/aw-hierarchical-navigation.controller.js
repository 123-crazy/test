// Copyright (c) 2020 Siemens

/**
 * Defines controller for aw-hierarchical-navigation directive.
 *
 * @module js/aw-hierarchical-navigation.controller
 */
import app from 'app';
import 'js/viewModelService';
import 'js/localeService';

/**
 * Defines awHierarchicalNavigation controller
 *
 * @member awHierarchicalNavigationController
 * @memberof NgControllers
 */
app.controller( 'awHierarchicalNavigationController', [
    '$scope', 'viewModelService', 'localeService',
    function( $scope, viewModelSvc, localeSvc ) {
        $scope.selectedNode = null;

        $scope.showMore = false;

        // If parentNodes is not initialized, initialize to empty array
        if( !$scope.parentnodes ) {
            $scope.parentnodes = [];
        }

        localeSvc.getTextPromise().then( function( localTextBundle ) {
            $scope.moreText = localTextBundle.MORE_LINK_TEXT;
            $scope.lessText = localTextBundle.LESS_LINK_TEXT;
        } );

        /**
         * Handles click on a parent node
         *
         * @memberof NgControllers.awHierarchicalNavigationController
         *
         * @param {Object} node - the clicked node.
         * @param {boolean} isLast - boolean flag indicating if the currently selected parent was clicked
         * @param {Number} index - the index of the clicked node.
         *
         * @return {Void}
         */
        $scope.parentClick = function( node, isLast, index ) {
            if( node.callback ) {
                node.callback.parentSelected( node.context, isLast );
                return;
            }

            var declViewModel = viewModelSvc.getViewModel( $scope, true );

            if( $scope.action ) {
                node.isLast = isLast;
                $scope.selectedNode = node;
                node.selected = false;
                viewModelSvc.executeCommand( declViewModel, $scope.action, $scope );
                return;
            }

            if( !isLast ) {
                // We've clicked an intermediate node. Selection stays the same
                $scope.selectedNode = node;
                $scope.parentnodes.length = index + 1;
            } else {
                // We've clicked the currently selected node. Go up one level.
                if( $scope.parentnodes.length <= 1 ) {
                    $scope.selectedNode = null;
                } else {
                    $scope.selectedNode = $scope.parentnodes[ $scope.parentnodes.length - 2 ];
                }
                $scope.parentnodes.pop();
            }
            $scope.childnodes = [];

            viewModelSvc.executeCommand( declViewModel, 'getHierarchy', $scope );
        };

        /**
         * Handles click on a child node
         *
         * @memberof NgControllers.awHierarchicalNavigationController
         *
         * @param {Object} node - the clicked node.
         * @return {Void}
         */
        $scope.childClick = function( node ) {
            if( node.callback ) {
                node.callback.childSelected( node.context );
                return;
            }

            var declViewModel = viewModelSvc.getViewModel( $scope, true );

            if( $scope.action ) {
                $scope.selectedNode = node;
                viewModelSvc.executeCommand( declViewModel, $scope.action, $scope );
                return;
            }

            $scope.parentnodes.push( node );
            $scope.selectedNode = node;
            $scope.childnodes = [];

            viewModelSvc.executeCommand( declViewModel, 'getHierarchy', $scope );
        };

        /**
         * Handles click on the More... link
         *
         * @memberof NgControllers.awHierarchicalNavigationController
         *
         * @return {Void}
         */
        $scope.moreClick = function() {
            $scope.showMore = !$scope.showMore;
        };
    }
] );

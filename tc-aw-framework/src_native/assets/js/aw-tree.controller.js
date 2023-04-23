// Copyright (c) 2020 Siemens

/**
 * Defines controller for '<aw-tree>' directive.
 *
 * @module js/aw-tree.controller
 */
import app from 'app';
import ngModule from 'angular';
import eventBus from 'js/eventBus';

/**
 * Defines awTree controller. Extends the {@link  NgControllers.awTreeController}. Handles 'NodeSelectionEvent' in the tree
 *
 * @member awTreeController
 * @memberof NgControllers
 */
app.controller( 'awTreeController', [ '$scope', '$controller', function( $scope, $controller ) {
    var ctrl = this;

    ngModule.extend( ctrl, $controller( 'awNodeController', {
        $scope: $scope
    } ) );

    $scope.$on( 'TreeNodeSelectionEvent', function( event, data ) {
        var node = data.node;
        event.stopPropagation();

        if( node ) {
            if( $scope.name ) {
                eventBus.publish( $scope.name + '.treeNodeSelected', {
                    node: node
                } );
            }
            if( $scope.selectedNode ) {
                $scope.selectedNode.selected = false;
            }
            $scope.selectedNode = node;
            $scope.selectedNode.selected = true;
        }

        $scope.$emit( 'NodeSelectionEvent', {
            node: node
        } );
    } );
} ] );

// Copyright (c) 2020 Siemens

/**
 * Defines controller for '<aw-node>' directive.
 *
 * @module js/aw-node.controller
 */
import app from 'app';

/**
 * Defines awNode controller
 *
 * @member awNodeController
 * @memberof NgControllers
 * @param {$scope} $scope //for data value
 */
app.controller( 'awNodeController', [ '$scope', function( $scope ) {
    $scope.remove = function( node ) {
        node.children = [];
    };

    $scope.add = function( node ) {
        var post = node.children.length + 1;
        var newName = node.name + '-' + post;
        node.nodes.push( {
            name: newName,
            expanded: true,
            children: []
        } );
    };

    $scope.collapse = function( node ) {
        node.expanded = false;
    };

    $scope.expand = function( node ) {
        node.expanded = true;
    };

    $scope.toggleSelection = function( node ) {
        $scope.$emit( 'TreeNodeSelectionEvent', {
            node: node
        } );
    };
} ] );

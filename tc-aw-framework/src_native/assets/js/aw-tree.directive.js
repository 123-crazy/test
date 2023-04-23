/* eslint-disable require-jsdoc */
// Copyright (c) 2020 Siemens

/**
 * Directive to display tree of nodes
 *
 * @module js/aw-tree.directive
 */
import app from 'app';
import _ from 'lodash';
import 'js/aw-tree.controller';
import 'js/aw-transclude.directive';
import 'js/aw-node.directive';
import 'js/aw-property-image.directive';
import eventBus from 'js/eventBus';

/**
 * Directive to display tree of nodes
 *
 * @example <aw-tree name="name" nodes="myNodes"><div>Sample tree item</div></aw-tree>
 *
 * @member aw-tree
 * @memberof NgElementDirectives
 */
app.directive( 'awTree', [ function() {
    return {
        restrict: 'E',
        controller: 'awTreeController',
        transclude: true,
        scope: {
            tree: '=',
            name: '=?'
        },
        link: function( $scope ) {
            function searchTreeOnEnteredValue( key, regex, node ) {
                var keyStr = _.get( node, key );
                if( regex.test( keyStr ) ) {
                    node.expanded = true;
                    return node;
                } else if( node.children ) {
                    for( var i = 0; i < node.children.length; i++ ) {
                        var outNode = searchTreeOnEnteredValue( key, regex, node.children[ i ] );
                        if( outNode ) {
                            node.expanded = true;
                            return outNode;
                        }
                    }
                }
                return null;
            }
            var treeEventSubscribe = eventBus.subscribe( 'awtree.updateSelection', function( eventData ) {
                if( eventData.name === $scope.name ) {
                    var key = $scope.tree[ 0 ].value ? 'value' : 'label';
                    var val =  '.*' + eventData.selectionValue + '.*';
                    var regex = new RegExp( val, 'i' );
                    var searchedNode;
                    for( var i = 0; i < $scope.tree.length; i++ ) {
                        searchedNode = searchTreeOnEnteredValue( key, regex, $scope.tree[ i ] );
                        if( searchedNode ) {
                            break;
                        }
                    }
                    if( searchedNode ) {
                        if( $scope.selectedNode ) {
                            $scope.selectedNode.selected = false;
                        }
                        $scope.selectedNode = searchedNode;
                        $scope.selectedNode.selected = true;
                    }
                }
            } );

            $scope.$on( '$destroy', function() {
                eventBus.unsubscribe( treeEventSubscribe );
            } );
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-node.directive.html'
    };
} ] );

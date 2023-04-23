// Copyright (c) 2020 Siemens

/* eslint-env es6, jasmine */
/* global angular */

/**
 * Directive to display tree of nodes
 *
 * @module js/wysiwyg-tree.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import $ from 'jquery';
import 'js/aw-tree.controller';
import 'js/aw-transclude.directive';
import 'js/aw-property-image.directive';
import 'js/aw-tree.directive';

/**
 * Directive to display tree of nodes
 *
 * @example <wysiwyg-tree name="'myTree'" nodes="myNodes"><div>Sample tree item</div></wysiwyg-tree>
 *
 * @member wysiwyg-tree
 * @memberof NgElementDirectives
 */
app.directive( 'wysiwygTree', [
    '$timeout',
    function( $timeout ) {
        return {
            restrict: 'E',
            controller: 'awTreeController',
            transclude: true,
            scope: {
                name: '=',
                tree: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-node.directive.html',
            link: function( $scope, $element ) {
                var addEvents = function() {
                    $element.find( 'li.aw-ui-treeNode' ).each( function( index, treeNode ) {
                        var treeNodeScope = angular.element( treeNode ).scope();
                        if( treeNodeScope && treeNodeScope.node ) {
                            var currentNode = treeNodeScope.node;
                            if( currentNode.children.length === 0 ) {
                                $( treeNode ).prop( 'draggable', true );
                                $( treeNode ).on( 'dragstart', function( event ) {
                                    var draggedNode = angular.element( event.target ).scope().node.getNode();
                                    var data = {
                                        template: draggedNode.template,
                                        type: draggedNode.type,
                                        name: draggedNode.name,
                                        titleImage: draggedNode.titleImage,
                                        isEditable: draggedNode.isEditableWidget ? draggedNode.isEditableWidget : false
                                    };
                                    event.originalEvent.dataTransfer.setData( 'text', JSON.stringify( data ) );
                                } );

                                // TODO: Need to fix this logic - Show image on tree node hover.
                                // var titleImage = ( ( angular.element( treeNode ).scope() ).node ).getNode().titleImage;
                                // if( titleImage ) {
                                //     $( treeNode ).on( 'mouseenter', function( event ) {
                                //         var imageTag = '<div style="position:absolute;">' + '<img src="' + titleImage + '" alt="image"/>' + '</div>';
                                //         $( treeNode ).append( imageTag );
                                //     } );

                                //     $( treeNode ).on( 'mouseleave', function( event ) {
                                //         //var widgetNode = ( ( angular.element( treeNode ).scope() ).node ).getNode();
                                //         $( treeNode ).children( 'div' ).remove();
                                //     } );
                                // }
                            }
                        }
                    } );
                };

                $timeout( addEvents, 0 );
                eventBus.subscribe( 'wysiwygJsonLoaded', function() {
                    $timeout( addEvents, 0 );
                } );
            }
        };
    }
] );

// Copyright (c) 2020 Siemens

/**
 * The 'existWhen' directive removes or recreates a portion of the DOM tree based on an {expression}. If the expression
 * assigned to 'existWhen' evaluates to a false value then the element is removed from the DOM, otherwise a clone of the
 * element is reinserted into the DOM. <br>
 * It is different from 'visibleWhen', as 'visibleWhen' changes only the visibility of the DOM element.<br>
 * 'exist-when' is a replacement of angular's 'ng-if' directive.<br>
 *
 *
 * @example <aw-widget prop="data.xxx" exist-when="data.exist"></aw-widget>
 * @module js/exist-when.directive
 */
import app from 'app';
import ngModule from 'angular';
import 'js/wysiwygModeService';

app.directive( 'existWhen', [ '$animate', 'wysModeSvc', function( $animate, wysModeSvc ) {
    return {
        multiElement: true,
        transclude: 'element',
        priority: 600,
        terminal: true,
        restrict: 'A',
        $$tlb: true,
        link: function( $scope, $element, $attr, ctrl, $transclude ) {
            /**
             * Return the DOM siblings between the first and last node in the given array.
             *
             * @param {Array} array
             * @returns {Array} the input object or a collection containing the nodes
             */
            var getBlockNodes = function( nodes ) {
                var node = nodes[ 0 ];
                var endNode = nodes[ nodes.length - 1 ];
                var blockNodes = null;
                var i = 1;
                while( node !== endNode && ( node = node.nextSibling ) ) {
                    if( blockNodes || nodes[ i ] !== node ) {
                        if( !blockNodes ) {
                            blockNodes = ngModule.element( nodes.slice( 0, i ) );
                        }
                        blockNodes.push( node );
                    }
                    i++;
                }
                return blockNodes || nodes;
            };

            var block = null;
            var childScope = null;
            var previousElements = null;
            $scope.$watch( $attr.existWhen, function( newValue ) {
                var isWysiwygMode = wysModeSvc.isWysiwygMode( $scope );
                if( newValue || isWysiwygMode ) {
                    if( !childScope ) {
                        $transclude( function( clone, newScope ) {
                            childScope = newScope;
                            clone[ clone.length++ ] = document.createComment( 'end existWhen', $attr.existWhen );
                            block = clone;
                            // insert new DOM
                            $animate.enter( clone, $element.parent(), $element );
                        } );
                    }
                } else {
                    if( previousElements ) {
                        previousElements.remove();
                        previousElements = null;
                    }
                    if( childScope ) {
                        childScope.$destroy();
                        childScope = null;
                    }
                    if( block ) {
                        previousElements = getBlockNodes( block );
                        // remove inserted DOM
                        $animate.leave( previousElements ).then( function() {
                            previousElements = null;
                        } );
                        block = null;
                    }
                }
            } );
        }
    };
} ] );

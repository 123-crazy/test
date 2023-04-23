// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aw-cls-properties.directive
 */
import app from 'app';
import angular from 'angular';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import 'js/aw-repeat.directive';
import 'js/aw-widget.directive';
import 'js/aw-cls-attribute-annotation.directive';
import 'js/exist-when.directive';
import 'js/aw-panel-section.directive';
import 'js/viewModelService';
import 'js/classifyService';
import 'js/classifyFullViewService';
import 'js/aw-property-image.directive';
import 'js/aw-row.directive';
import 'js/aw-splm-table.directive';
import 'js/aw-command-bar.directive';
import 'js/aw-command-panel-section.directive';
import 'js/aw-include.directive';
import 'js/aw-separator.directive';
import 'js/aw-popup-command-bar.directive';


/**
 * Directive to display the class attributes for view, edit, and add operations
 *
 * @example <aw-cls-properties attributes="theAttributeArray" view="theViewMode"></aw-cls-properties>
 *
 * @member aw-cls-properties
 * @memberof NgElementDirectives
 */
app.directive( 'awClsProperties', [ 'viewModelService', 'classifyService', 'classifyFullViewService', function( viewModelSvc, classifySvc, classifyFullViewSvc ) {
    return {
        restrict: 'E',
        scope: {
            attributes: '=?',
            view: '=',
            showallprop: '=',
            activeview: '=',
            parentlevel: '=?',
            currentlevel: '=?',
            instance: '='
        },
        controller: [ '$scope', function( $scope ) {
            var declViewModel = viewModelSvc.getViewModel( $scope, true );
            if ( $scope.parentlevel === undefined ) {
                $scope.parentlevel = 0;
                $scope.currentlevel = 0;
            } else {
                $scope.currentlevel = $scope.parentlevel;
                if ( $scope.instance === false ) {
                    $scope.parentlevel++;
                }
            }

            //Process Keypress, and if enter key is pressed it proceeds to generate a number of cardinal blocks equal to the cardinalcontrollers value
            $scope.evalKeyup = function( $event, cardinalBlockAttribute ) {
                var _enterKeyCode = 13;
                if( $event.keyCode === _enterKeyCode ) {
                    $scope.cardinalAttr = cardinalBlockAttribute.cardinalController.vmos;
                    $scope.generateCardinalBlocks( cardinalBlockAttribute );
                }
            };
            //Generates a number of cardinal blocks equal to the cardinalcontrollers value
            $scope.generateCardinalBlocks = function( cardinalBlockAttribute ) {
                var cardinalValue = cardinalBlockAttribute.cardinalController.vmos[0].dbValue;
                classifySvc.getCardinalInstances( cardinalValue, cardinalBlockAttribute );

                classifyFullViewSvc.updateCardinalBlocks( declViewModel, cardinalBlockAttribute );
                //Repopulate the Property Group Tree
                viewModelSvc.executeCommand( declViewModel, 'repopulatePropertyGroupTree', $scope );
            };

            $scope.getTableHeight = function( node ) {
                var height;
                var rows;
                if( node.polymorphicTypeProperty ) {
                    rows = node.numRows ? node.numRows + 4 : 5;
                    _.forEach( node.instances, function( instance ) {
                        if( !_.isEmpty( instance.children ) && instance.children.length + 4 > rows ) {
                            rows = instance.children.length + 4;
                        }
                    } );
                } else {
                    rows = node.children.length + 4;
                }
                //adjust the height for each row and avoid vertical scrollbar
                height = rows * 33 + 24;
                if( node.height && node.height !== height ) {
                    eventBus.publish( 'gridView.plTable.containerHeightUpdated', height );
                }
                node.height = height;

                return height;
            };

            $scope.propCollapse = function( node ) {
                node.propExpanded = false;
            };

            $scope.propExpand = function( node ) {
                node.propExpanded = true;
            };

            var selectHover = function( node, event ) {
                var parentBlks = document.getElementsByClassName( 'aw-clspanel-parentHover' );
                for ( var i = 0; i < parentBlks.length; i++ ) {
                    var parentBlk = parentBlks[ i ];
                    parentBlk.className = 'aw-clspanel-block ng-scope';
                }
                var current = document.getElementsByClassName( 'aw-clspanel-childHover' );
                if ( current && current[ 0 ] ) {
                    current[ 0 ].className = current[ 0 ].className.replace( ' aw-clspanel-childHover', '' );
                }
                var elem = $( event.target ).closest( '.aw-ui-tree' );
                if ( elem.length > 0 ) {
                    var parentElem = $( elem ).closest( '.aw-clspanel-block' );
                    if ( parentElem.length > 0 ) {
                        var parentClass = parentElem[ 0 ].className;
                        if ( parentClass.indexOf( 'aw-clspanel-parentHover' ) < 0 ) {
                            parentElem[ 0 ].className += ' aw-clspanel-parentHover';
                        }
                        elem[ 0 ].firstElementChild.className += ' aw-clspanel-childHover';
                    } else {
                        //top level
                        elem[ 0 ].firstElementChild.className += ' aw-clspanel-parentHover';
                    }
                }
            };

            $scope.selectNode = function( node, event ) {
                if ( event.type === 'mouseover' ) {
                    selectHover( node, event );
                }
            };
        } ],
        templateUrl: app.getBaseUrlPath() + '/html/aw-cls-properties.directive.html'
    };
} ] );

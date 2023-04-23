// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * @module js/aw-cls-property-group-tree-section.directive
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/aw-repeat.directive';
import 'js/aw-transclude.directive';
import 'js/aw-property-image.directive';
import 'js/exist-when.directive';
import 'js/viewModelService';
import 'js/classifyFullviewTableService';
import 'js/classifyFullViewService';


/**
 * Directive to display the Property Group Tree in Classification Full View
 *
 * @example <aw-cls-property-group-tree-section nodes="TheTreeNodes"></aw-cls-property-group-tree-section>
 *
 * @member aw-cls-property-group-tree-section
 * @memberof NgElementDirectives
 */
app.directive( 'awClsPropertyGroupTreeSection', [ 'viewModelService', 'classifyFullviewTableService', 'classifyFullViewService', function( viewModelSvc, classifyTblSvc, classifyFullViewSvc ) {
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            nodes: '='
        },
        controller: [ '$scope', function( $scope ) {
            var declViewModel = viewModelSvc.getViewModel( $scope, true );
            $scope.deselectAllNodes = function( groupArray ) {
                _.forEach( groupArray, function( group ) {
                    if( group.type === 'Block' ) {
                        if( group.instances && !_.isEmpty( group.instances ) && group.tableView ) {
                            classifyTblSvc.updateInstanceData( declViewModel, group );
                        }
                        group.selected = false;
                        if( group.children && group.children.length > 0 && group.instances.length < 1 ) {
                            $scope.deselectAllNodes( group.children );
                            //Cardinal Block
                        } else if( group.instances && group.instances.length > 0 ) {
                            $scope.deselectAllNodes( group.instances );
                        }
                        if ( group.polymorphicTypeProperty ) {
                            var vmProp = group.polymorphicTypeProperty.vmos[ 0 ];
                            if ( vmProp.dbValue !== vmProp.newValue && vmProp.newValue && vmProp.newValue.length > 0 ) {
                                vmProp.dbValue = vmProp.dbOriginalValue;
                                vmProp.uiValue = vmProp.uiOriginalValue;
                            }
                        }
                    }
                } );
            };
            $scope.toggleSelection = function( node ) {
                if( node.selected === true ) {
                    $scope.deselectAllNodes( declViewModel.attr_anno );
                    $scope.deselectAttributes( declViewModel.attr_anno );
                    $scope.$emit( 'NodeSelectionEvent', {
                        node: null
                    } );
                    eventBus.publish( 'NodeSelectionEvent', null );
                } else {
                    $scope.deselectAllNodes( declViewModel.attr_anno );
                    $scope.deselectAttributes( declViewModel.attr_anno );
                    node.selected = true;
                    $scope.$emit( 'NodeSelectionEvent', {
                        node: node
                    } );
                    eventBus.publish( 'NodeSelectionEvent', node );
                }
                classifyFullViewSvc.expandAll( node );
            };
            $scope.collapse = function( node ) {
                if( node.tableView ) {
                    classifyTblSvc.updateInstanceData( declViewModel, node );
                }
                node.expanded = false;
            };

            $scope.expand = function( node ) {
                if( node.tableView ) {
                    classifyTblSvc.updateInstanceData( declViewModel, node );
                }
                node.expanded = true;
            };

            $scope.deselectAttributes = function( attrArr ) {
                _.forEach( attrArr, function( group ) {
                    if( group.type === 'Block' ) {

                        if( group.children && group.children.length > 0 ) {
                            $scope.deselectAttributes( group.children );
                            //Cardinal Block
                        } 
                        if ( group.polymorphicTypeProperty ) {
                             group.polymorphicTypeProperty.vmos[ 0 ].selected = false ;
                        }

                    }
                    else{
                        group.vmos[0].selected = false;
                    }
                } );

            };
        } ],
        templateUrl: app.getBaseUrlPath() + '/html/aw-cls-property-group-tree-section.directive.html'
    };
} ] );

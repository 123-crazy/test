// @<COPYRIGHT>@
// ==================================================
// Copyright 2021.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/scheduleNavigationExpandService
 */
import _ from 'lodash';
import eventBus from 'js/eventBus';
import _awTableStateSvc from 'js/awTableStateService';

let exports;

/**
 * Function to publish Expand below event
 */
export let fireExpandBelowEvent = () => {
    eventBus.publish( 'ScheduleNavigationTree.expandBelowEvent' );
};

/**
 * Function to publish Collapse below event
 */
export let fireCollapseBelowEvent = () => {
    eventBus.publish( 'ScheduleNavigationTree.collapseBelowEvent' );
};

/**
 * Function to perform expand operation for selected task which includes nested childrens 
 * @param {Object} treeDataProvider tree data provider
 * @param {Object} declViewModel data object
 */
export let performExpandBelow = ( treeDataProvider, declViewModel ) => {
    let gridId = Object.keys( declViewModel.grids )[ 0 ];
    let selectedObjects = treeDataProvider.getSelectedObjects();
    if( selectedObjects && selectedObjects.length > 0 ) {
        _.forEach( selectedObjects, function( parentVMO ) {
            if( !parentVMO.isLeaf ) {
                parentVMO.isInExpandBelowMode = true;
                // if selected object is not leaf node and its childrens are already loaded
                if( parentVMO.__expandState ) {
                    let childNodeList = [];
                    getChilNodeListToNLevel( parentVMO, childNodeList );
                    eventBus.publish( treeDataProvider.name + '.expandTreeNode', {
                        parentNode: {
                            id: parentVMO.uid
                        }
                    } );
                    if( childNodeList && childNodeList.length > 0 ) {
                        expandFirstLevelChildrens( childNodeList, declViewModel, gridId );
                    }
                } else if( !parentVMO.__expandState ) {
                    // if selected node is already expanded
                    if( parentVMO.isExpanded && parentVMO.children && parentVMO.children.length > 0 ) {
                        eventBus.publish( gridId + '.plTable.toggleTreeNode', parentVMO );
                        expandFirstLevelChildrens( parentVMO, declViewModel, gridId );
                    } else {
                        // if selected object is not leaf node and its childrens are not loaded 
                        eventBus.publish( treeDataProvider.name + '.expandTreeNode', {
                            parentNode: {
                                id: parentVMO.uid
                            }
                        } );
                    }
                }
            }
        } );
    }
};

/**
 * Function to perform collapse operation for selected task
 * @param {Object} treeDataProvider tree data provider
 * @param {Object} declViewModel data object
 */
export let performCollapseBelow = ( treeDataProvider, declViewModel ) => {
    let selectedObjects = treeDataProvider.getSelectedObjects();
    if( selectedObjects && selectedObjects.length > 0 ) {
        _.forEach( selectedObjects, function( parentVMO ) {
            let gridId = Object.keys( declViewModel.grids )[ 0 ];
            let nodesInfo = getApplicableNodesInfoForCollapse( parentVMO.children, treeDataProvider );
            let nodesToCollapse = nodesInfo.nodes;
            while( nodesInfo.children.length ) {
                nodesInfo = getApplicableNodesInfoForCollapse( nodesInfo.children, treeDataProvider );
                nodesToCollapse = nodesToCollapse.concat( nodesInfo.nodes );
            }
            nodesToCollapse.reverse().map( function( vmo ) {
                _awTableStateSvc.saveRowCollapsed( declViewModel, gridId, vmo );
            } );
            delete parentVMO.isExpanded;
            parentVMO.isInExpandBelowMode = false;
            eventBus.publish( gridId + '.plTable.toggleTreeNode', parentVMO );
            delete parentVMO.__expandState;
        } );
    }
};

/**
 * Function to get nested childrens information which is to collapse
 * @param {Array} vmoNodes array of viewModelObjects
 * @param {Object} treeDataProvider data provider object.
 * @returns {Object} nodesInfo
 */
let getApplicableNodesInfoForCollapse = function( vmoNodes, treeDataProvider ) {
    let nodesInfo = {
        nodes: [],
        children: []
    };
    _.forEach( vmoNodes, function( vmoNode ) {
        if( _awTableStateSvc.isNodeExpanded( treeDataProvider.ttState, vmoNode ) ) {
            nodesInfo.nodes.push( vmoNode );
            if( vmoNode.children && vmoNode.children.length ) {
                nodesInfo.children = nodesInfo.children.concat( vmoNode.children );
            }
        }
    } );
    return nodesInfo;
};

/**
 * Get chid node list up to N level
 * @param {Object} parentVMO parent viewModelTree Node 
 * @param {Array} childNodeList list of child objects
 */
let getChilNodeListToNLevel = function( parentVMO, childNodeList ) {
    _.forEach( parentVMO.__expandState.expandedNodes, function( node ) {
        if( !node.isLeaf && !node.__expandState ) {
            childNodeList.push( node );
        } else {
            if( !node.isLeaf && node.__expandState.expandedNodes ) {
                getChilNodeListToNLevel( node, childNodeList );
            }
        }
    } );
};

/**
 * Expand childrens upto first level
 * @param {Object} parentVMO parent viewModelTree Node 
 * @param {Object} declViewModel data object
 * @param {Object} gridId grid ID
 */
let expandFirstLevelChildrens = function( parentVMO, declViewModel, gridId ) {
    _.forEach( parentVMO.children, function( childNode ) {
        if( !childNode.isLeaf ) {
            childNode.isInExpandBelowMode = true;
            _awTableStateSvc.saveRowExpanded( declViewModel, gridId, childNode );
            if( childNode.isExpanded && childNode.children && childNode.children.length > 0 ) {
                eventBus.publish( gridId + '.plTable.toggleTreeNode', childNode );
                expandFirstLevelChildrens( childNode, declViewModel, gridId );
            }
        }
    } );
};

exports = {
    fireExpandBelowEvent,
    fireCollapseBelowEvent,
    performExpandBelow,
    performCollapseBelow
};

export default exports;

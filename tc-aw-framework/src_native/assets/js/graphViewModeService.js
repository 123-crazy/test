// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module provides graph view mode services
 *
 * @module js/graphViewModeService
 */
import app from 'app';
import _ from 'lodash';
import logger from 'js/logger';
import graphConstants from 'js/graphConstants';
import graphFilterService from 'js/graphFilterService';
import performanceUtils from 'js/performanceUtils';

'use strict';

var exports = {};

var updateNodeSize = function( graphModel, node ) {
    var groupedGraph = graphModel.graphControl.groupGraph;

    var minNodeSize = node.getResizeMinimumSize();
    node.setWidthValue( minNodeSize.width );
    node.setHeightValue( minNodeSize.height );

    if( groupedGraph.isGroup( node ) ) {
        graphModel.graphControl.updateHeaderHeight( node, minNodeSize.height );
    }
};

/**
 * Convert the nested view mode ot network view mode.
 *
 * @param graphModel the graph model
 * @param groupRelationsEdgeConvertorFn the function object to convert group relation to graph edge
 * @return The relations between parent and child.
 */
export let convertToNetworkMode = function( graphModel, groupRelationsEdgeConvertorFn ) {
    var graph = graphModel.graphControl.graph;
    var groupGraph = graphModel.graphControl.groupGraph;

    // start performance timer
    var performanceTimer = performanceUtils.createTimer();

    if( graph.isNetworkMode() ) {
        return;
    }

    if( typeof groupRelationsEdgeConvertorFn !== 'function' ) {
        logger.error( 'Invalid group relation edge convertor function' );
        return;
    }

    graph.setNetworkMode( true );

    var groupRelationToSwitch = [];
    var groupRelationCategoryName = graphModel.categoryApi.getGroupRelationCategory();

    // graph data models may not been maintained by GC if application draw graph by calling graph APIs
    if( _.keys( graphModel.dataModel.edgeModels ).length === 0 ) {
        _.forEach( graph.getNodes(), function( node ) {
            if( !groupGraph.isGroup( node ) ) { return; }

            // set node to normal node height and width
            updateNodeSize( graphModel, node );

            _.forEach( groupGraph.getChildNodes( node ), function( childNode ) {
                var edge = groupRelationsEdgeConvertorFn( node, childNode );
                if( edge ) {
                    groupRelationToSwitch.push( edge );
                }
            } );
        } );
    } else {
        var groupRelationModels = _.filter( graphModel.dataModel.edgeModels, function( edgeModel ) { return edgeModel.category === groupRelationCategoryName && !edgeModel.graphItem; } );
        groupRelationModels.forEach( function( edgeModel ) {
            // set node to normal node height and width
            var sourceNode = edgeModel.sourceNode.graphItem;
            var targetNode = edgeModel.targetNode.graphItem;
            updateNodeSize( graphModel, sourceNode );

            // remove the old edge model rendered in group relation
            graphModel.removeEdgeModels( [ edgeModel ] );

            var edge = groupRelationsEdgeConvertorFn( sourceNode, targetNode );
            if( edge ) {
                groupRelationToSwitch.push( edge );
            }
            // attach edge to edge model
            var newEdgeModel = edge.model;
            if( !newEdgeModel ) {
                graphModel.addEdgeModel( edge, edgeModel );
            }
        } );
    }

    groupRelationToSwitch.forEach( function( edge ) {
        if( edge.getSourceNode().isFiltered() || edge.getTargetNode().isFiltered() ) {
            edge.setVisible( false );
        }
    } );

    // log performance time
    performanceTimer.endAndLogTimer( 'Switch View', 'VIEWMODE_NETWORK' );

    return groupRelationToSwitch;
};

/**
 * Convert the network view mode ot  nested view mode.
 *
 * @param graphModel the graph model
 * @param edgesToRemove the structure edges to remove
 * @return The relations between parent and child.
 */
export let convertToNestedMode = function( graphModel ) {
    var graph = graphModel.graphControl.graph;
    var groupedGraph = graphModel.graphControl.groupGraph;

    // start performance timer
    var performanceTimer = performanceUtils.createTimer();

    if( !graph.isNetworkMode() ) {
        return;
    }

    graph.setNetworkMode( false );

    _.forEach( graph.getNodes(), function( node ) {
        updateNodeSize( graphModel, node );
        if( groupedGraph.isGroup( node ) && groupedGraph.isExpanded( node ) ) {
            node.fitToContent();
        }
    } );

    var portsOfEdges = [];
    var groupRelationCategoryName = graphModel.categoryApi.getGroupRelationCategory();
    var edgesToRemove = _.filter( graph.getEdges(), function( edge ) {
        var category = graphModel.categoryApi.getEdgeCategory( edge );
        return category === groupRelationCategoryName;
    } );

    _.forEach( edgesToRemove, function( edge ) {
        portsOfEdges.push( edge.getSourcePort() );
        portsOfEdges.push( edge.getTargetPort() );
    } );

    graph.update( function() {
        graph._diagramView.deleteElements( edgesToRemove.concat( portsOfEdges ) );
    } );

    // detach edge from edge model
    _.forEach( edgesToRemove, function( edge ) {
        var edgeModel = edge.model;
        if( edgeModel ) {
            edgeModel.graphItem = null;
            edgeModel = null;
        }
    } );

    // log performance time
    performanceTimer.endAndLogTimer( 'Switch View', 'VIEWMODE_NESTING' );

    return edgesToRemove;
};

export default exports = {
    convertToNetworkMode,
    convertToNestedMode
};

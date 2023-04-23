//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * 
 * 
 * @module js/NetworkGraphDeleteObjectsService
 */
import app from 'app';
import NetworkUtils from 'js/NetworkUtils';
import 'js/graphLegendService';

var exports = {};

/**
 * Hook to event awGraph.itemsRemoved
 * 
 * when app detects node removal event, should also remove these nodes from network layout to avoid layout
 * crash.
 */
export let itemsRemovedFromNetworkGraph = function( ctx ) {

    var graphModel = ctx.graph.graphModel;
    var layout = graphModel.graphControl.layout;
    var edges;
    var nodeRemoveMap = {};
    var removedNodeId;
    if( ctx.selected.type === "Psi0WorkElementPDI" || ctx.selected.type === "Psi0PredecessorWorkElement" ) {
        edges = graphModel.graphControl.graph.getVisibleEdges();
        var removeEdges = [];
        var removedEdgeId = ctx.mselected[ "0" ].uid;
        for( var i = 0; i < edges.length; i++ ) {
            if( edges[ i ].modelObject.uid === removedEdgeId ) {
                removeEdges.push( edges[ i ] );

                nodeRemoveMap[ edges[ i ].targetNode.appData.id ] = graphModel.nodeMap[ graphModel.nodeMap[ edges[ i ].targetNode.appData.id ] ];
                removedNodeId = graphModel.nodeMap[ edges[ i ].targetNode.appData.id ];

                var countTargentNode = NetworkUtils.getTargetNodeCount( edges[ i ] );

                NetworkUtils.removeNode( ctx, removedNodeId, layout, graphModel, countTargentNode, nodeRemoveMap );
            }
        }
        NetworkUtils.removeEdge( ctx, removeEdges );
    } else if( graphModel.nodeMap[ ctx.selected.uid ] ) {
        nodeRemoveMap[ ctx.selected.uid ] = graphModel.nodeMap[ ctx.selected.uid ];
        graphModel.nodeRemoveMap = nodeRemoveMap;

        removedNodeId = graphModel.nodeMap[ ctx.selected.uid ];
        edges = removedNodeId.getEdges();

        NetworkUtils.removeNode( ctx, removedNodeId, layout, graphModel, 0, nodeRemoveMap );
        NetworkUtils.removeEdge( ctx, edges );
    }

};

export default exports = {
    itemsRemovedFromNetworkGraph
};
app.factory( 'NetworkGraphDeleteObjectsService', () => exports );

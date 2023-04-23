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
 * Branch Utils
 * 
 * @module js/NetworkUtils
 */
import app from 'app';
import _ from 'lodash';
import 'soa/kernel/clientDataModel';

var exports = {};

export let getNodesToBeRemoved = function( graphModel, node, nodesToBeRemoved ) {
    var edges = node.getEdges();
    var graphNodes = [];
    var graphEdges = [];
    if( node.appData.nodeObject.type !== "Prg0Event" ) {
        nodesToBeRemoved.push( node );
    }

    exports.getVisibleGraphItemUids( graphModel, graphNodes, graphEdges );
    _.forEach( edges, function( edge ) {

        var tagertNode = edge.getTargetNode();
        if( nodesToBeRemoved.indexOf( tagertNode ) <= -1 ) {
            if( tagertNode.getEdges().length === 1 ) {
                if( tagertNode.appData.nodeObject.type !== "Prg0Event" ) {
                    nodesToBeRemoved.push( tagertNode );
                }

            } else {
                exports.getNodesToBeRemoved( graphModel, tagertNode, nodesToBeRemoved );
            }
        }
    } );

};

export let getVisibleRelations = function( edges ) {
    var visibleRelations = 0;
    _.forEach( edges, function( edge ) {
        if( edge.isVisible() ) {
            visibleRelations++;
        }
    } );
    return visibleRelations;
};

export let getUnloadedRelations = function( degree, visibleRelations ) {
    var unLoadedRelations = 0;
    if( degree > 0 && degree === visibleRelations ) {
        unLoadedRelations = 0;
    }

    if( degree > visibleRelations ) {
        unLoadedRelations = degree - visibleRelations;
    }

    if( degree > 0 && visibleRelations === 0 ) {
        unLoadedRelations = degree;
    }
    return unLoadedRelations;
};

export let getVisibleGraphItemUids = function( graphModel, graphNodes, graphEdges ) {

    if( graphModel.graphControl && graphModel.graphControl.graph ) {
        var visibleNodes = graphModel.graphControl.graph.getVisibleNodes();
        _.forEach( visibleNodes, function( node ) {
            graphNodes.push( node.appData.nodeObject.uid );
        } );
        graphEdges = graphModel.graphControl.graph.getVisibleEdges();
    }

};

export let applyNetworkGraphLayout = function( graphModel ) {
    //the layout is initialized by GC by default, it's directly available
    var layout = graphModel.graphControl.layout;
    if( layout ) {
        //need apply global layout first for incremental update
        layout.applyLayout();
        layout.activate( true );
    }
};

export let removeEdge = function( ctx, removeEdges ) {

    var graphModel;
    if( ctx.graph === undefined ) {
        graphModel = ctx.graphControl.graph._graphModel;
    } else {
        graphModel = ctx.graph.graphModel;
    }

    _.forEach( removeEdges, function( edge ) {
        _.forEach( graphModel.nodeMap, function( value ) {
            if( edge.sourceNode.appData.id === value.appData.id ) {
                value.appData.outDegrees = value.appData.outDegrees - 1;
            } else if( edge.targetNode.appData.id === value.appData.id ) {
                value.appData.inDegrees = value.appData.inDegrees - 1;
            }
        } );
    } );

    var graph = graphModel.graphControl.graph;
    var layout = graphModel.graphControl.layout;

    layout.removeEdge( removeEdges );
    graph.removeEdges( removeEdges );

};

export let getTargetNodeCount = function( edge ) {
    var targetnode = edge.targetNode;
    var countTargentNode = 0;
    var nodeEdges = targetnode.getEdges();
    for( var j = 0; j < nodeEdges.length; j++ ) {
        if( nodeEdges[ j ].targetNode.appData.id === targetnode.appData.id ) {
            countTargentNode = countTargentNode + 1;
        }
    }
    return countTargentNode;
};

/**
 * Remove objects from layout.
 * 
 */
var removeObjectsFromLayout = function( ctx, layout, collapseDirection, nodeRemoveMap ) {
    if( nodeRemoveMap ) {
        layout.removeNode( nodeRemoveMap[ ctx.selected.uid ], true );
    }
};

export let removeNode = function( ctx, removedNodeId, layout, graphModel, countTargentNode, nodeRemoveMap ) {
    var nodesToBeRemoved = [];
    if( countTargentNode <= 1 ) {
        exports.getNodesToBeRemoved( graphModel, removedNodeId, nodesToBeRemoved );
        nodeRemoveMap.nodesToBeRemoved = nodesToBeRemoved;
        for( var jj = 0; jj < nodesToBeRemoved.length; jj++ ) {
            delete graphModel.nodeMap[ nodesToBeRemoved[ jj ].appData.id ];
        }
        removeObjectsFromLayout( ctx, layout, graphModel.collapseDirection, graphModel.nodeRemoveMap );
        graphModel.graphControl.graph.removeNodes( nodeRemoveMap.nodesToBeRemoved );
    }

};

export default exports = {
    getNodesToBeRemoved,
    getVisibleRelations,
    getUnloadedRelations,
    getVisibleGraphItemUids,
    applyNetworkGraphLayout,
    removeEdge,
    getTargetNodeCount,
    removeNode
};
app.factory( 'NetworkUtils', () => exports );

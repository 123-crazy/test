// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module defines graph paths service
 *
 * @module js/graphPathsService
 */
import app from 'app';
import _ from 'lodash';
import graphUtils from 'js/graphUtils';

'use strict';

var exports = {};

var visitNode = function( node, connectedGraph, callbackFn ) {
    if( _.indexOf( connectedGraph, node ) > -1 ) {
        // node is visited
        return;
    }

    connectedGraph.push( node );
    var nextLevelNodes = null;
    if( callbackFn ) {
        nextLevelNodes = callbackFn( node );
    } else {
        nextLevelNodes = getNextLevelNodes( node );
    }
    _.forEach( nextLevelNodes, function( nextNode ) {
        visitNode( nextNode, connectedGraph, callbackFn );
    } );
};

/**
 * get connected graph which contained all nodes connected to any one of the root nodes.
 *
 * @param rootNodes the source node
 * @param getNextLevelNodesFn the function returned next level nodes
 * @return list of all connected graph nodes
 */
export let getConnectedGraph = function( rootNodes, getNextLevelNodesFn ) {
    var connectedGraph = [];
    if( !rootNodes || rootNodes.length < 1 ) {
        return connectedGraph;
    }
    _.forEach( rootNodes, function( rootNode ) {
        visitNode( rootNode, connectedGraph, getNextLevelNodesFn );
    } );
    return connectedGraph;
};

var getNextLevelNodes = function( node ) {
    var nextLevelNodes = [];
    var edges = node.getEdges();
    var visibleEdges = _.filter( edges, function( edge ) {
        return !edge.isFiltered();
    } );
    _.forEach( visibleEdges, function( edge ) {
        if( edge.getSourceNode() === node ) {
            if( !edge.getTargetNode().isFiltered() ) {
                nextLevelNodes.push( edge.getTargetNode() );
            }
        } else if( edge.getTargetNode() === node ) {
            if( !edge.getSourceNode().isFiltered() ) {
                nextLevelNodes.push( edge.getSourceNode() );
            }
        }
    } );
    nextLevelNodes = _.uniq( nextLevelNodes );
    return nextLevelNodes;
};

/**
 * get all directed paths which from source to destination. Each node is visited only once in each path.
 *
 * @param source the source node
 * @param destination the destination node
 * @param getNextLevelEdgesFn customized function to return next level edges
 * @return list of all paths
 */
export let getPaths = function( source, destination, getNextLevelEdgesFn ) {
    if( !source || !destination || source === destination ) {
        return null;
    }

    var paths = [];
    var path = [];
    findPath( null, source, destination, paths, path, getNextLevelEdgesFn );
    return paths;
};

var getNextLevelEdges = function( node ) {
    var nextLevelEdges = [];
    var edges = node.getEdges();
    var visibleEdges = _.filter( edges, function( edge ) {
        return !edge.isFiltered();
    } );
    _.forEach( visibleEdges, function( edge ) {
        if( edge.getSourceNode() === node ) {
            nextLevelEdges.push( edge );
        }
    } );
    return nextLevelEdges;
};

var findPath = function( edge, current, destination, paths, path, getNextLevelEdgesFn ) {
    if( edge ) {
        path.push( edge );
    }
    if( current ) {
        path.push( current );
    }

    var matches = current === destination;
    if( matches ) {
        // cache all available path in the paths list
        var clonedPath = _.slice( path, 0 );
        paths.push( clonedPath );
        path.pop( current );
        path.pop( edge );
        return;
    }

    var nextLevelEdges = null;
    if( getNextLevelEdgesFn ) {
        nextLevelEdges = getNextLevelEdgesFn( current );
    } else {
        nextLevelEdges = getNextLevelEdges( current );
    }

    var visitedTargetNodes = [];
    _.forEach( nextLevelEdges, function( edge ) {
        var found = false;
        if( _.indexOf( path, edge.getTargetNode() ) > -1 ) {
            found = true;
        }
        if( !found ) {
            // pass edges with same source & target as an array
            var edges = null;
            // sort next level edges
            if( _.indexOf( visitedTargetNodes, edge.getTargetNode() ) > -1 ) {
                return;
            }
            visitedTargetNodes.push( edge.getTargetNode() );
            edges = _.filter( nextLevelEdges, function( nextLevelEdge ) {
                return nextLevelEdge.getTargetNode() === edge.getTargetNode();
            } );
            if( edges && edges.length === 1 ) {
                edges = edge;
            }
            findPath( edges, edge.getTargetNode(), destination, paths, path, getNextLevelEdgesFn );
        }
    } );
    if( current ) {
        path.pop( current );
    }
    if( edge ) {
        path.pop( edge );
    }
};

export default exports = {
    getConnectedGraph,
    getPaths
};

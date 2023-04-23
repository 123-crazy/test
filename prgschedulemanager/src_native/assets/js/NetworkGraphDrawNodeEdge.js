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
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/NetworkGraphDrawNodeEdge
 */
import app from 'app';
import NetworkGraphTemplateService from 'js/NetworkGraphTemplateService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import declUtils from 'js/declUtils';
import logger from 'js/logger';
import graphConstants from 'js/graphConstants';
import graphLegendSvc from 'js/graphLegendService';

var exports = {};

var MIN_NODE_SIZE = [ 300, 135 ];
var BreakException = {};

var getDegreeCount = function( degreeDir, nodeInfoMap ) {
    if( nodeInfoMap ) {
        var degree = nodeInfoMap[ degreeDir ];
        if( degree ) {
            return degree;
        }
        return 0;
    }
};

export let setDegreeToNode = function( networkGraphData ) {

    for( var i = 0; i < networkGraphData.nodes.length; i++ ) {
        var nodeData = networkGraphData.nodes[ i ];
        var inDegree = 0;
        var outDergee = 0;
        for( var ii = 0; ii < networkGraphData.edges.length; ii++ ) {
            var edgeData = networkGraphData.edges[ ii ];
            if( edgeData.leftNodeId === nodeData.nodeId ) {
                outDergee++;
            }
            if( edgeData.rightNodeId === nodeData.nodeId ) {
                inDegree++;
            }
        }
        nodeData.properties[ "in_degree" ] = inDegree;
        nodeData.properties[ "out_degree" ] = outDergee;
    }

};

export let drawNodes = function( networkGraphData, graphModel, graph, activeLegendView, data ) {
    var nodeRect = {
        width: 300,
        height: 135,
        x: 200,
        y: 200
    };

    var addedNodes = [];
    _.forEach( networkGraphData.nodes, function( nodeData ) {
        var nodeObject = null;
        if( nodeData.metaObject ) {
            nodeObject = nodeData.metaObject;
        }

        //Node data to be bind in SVG template
        if( !graphModel.nodeMap[ nodeData.nodeId ] ) {
            var template;
            var bindData;

            var nodeCategory = nodeData.properties.Group;
            var isGroup = true;
            var props = NetworkGraphTemplateService.getBindPropertyNames( nodeObject );
            var flag = false;
            template = NetworkGraphTemplateService.getNodeTemplate( graphModel.nodeTemplates, props, isGroup, flag );

            var outDegreeCount = getDegreeCount( "out_degree", nodeData.properties );
            var inDegreeeCount = getDegreeCount( "in_degree", nodeData.properties );

            if( outDegreeCount === 0 ) {
                outDegreeCount = "0";
            }
            if( inDegreeeCount === 0 ) {
                inDegreeeCount = "0";
            }
            bindData = NetworkGraphTemplateService.getBindProperties( nodeObject, props );
            if( outDegreeCount > 0 ) {
                bindData = NetworkGraphTemplateService.getDegree( outDegreeCount, 0, 0, graphConstants.EdgeDirection.OUT,
                    bindData, data );
            }

            if( inDegreeeCount > 0 ) {
                bindData = NetworkGraphTemplateService.getDegree( inDegreeeCount, 0, 0, graphConstants.EdgeDirection.IN,
                    bindData, data );
            }

            //get node style from graph legend
            var nodeStyle = graphLegendSvc.getStyleFromLegend( 'objects', nodeCategory, activeLegendView );
            if( nodeStyle ) {
                bindData[ 'node_fill_color' ] = nodeStyle.borderColor;
            }

            //fill node command binding data
            if( graphModel.nodeCommandBindData ) {
                declUtils.consolidateObjects( bindData, graphModel.nodeCommandBindData );
            }

            var node = graph.createNodeWithBoundsStyleAndTag( nodeRect, template, bindData );
            node.setMinNodeSize( MIN_NODE_SIZE );
            node.initPosition = nodeRect;
            node.appData = {
                id: nodeData.nodeId,
                nodeObject: nodeObject,
                isGroup: isGroup,
                category: nodeCategory,
                inDegrees: inDegreeeCount,
                outDegrees: outDegreeCount
            };
            node.itemType = "Node";
            // record all added nodes
            addedNodes.push( node );
            //build node map to help create edges
            graphModel.nodeMap[ nodeData.nodeId ] = node;

        }
    } );
};

export let drawEdges = function( edgesToBeDrawn, graphModel, graph, activeLegendView ) {

    _.forEach( edgesToBeDrawn, function( edgeData ) {
        var sourceNode = graphModel.nodeMap[ edgeData.leftNodeId ];
        var targetNode = graphModel.nodeMap[ edgeData.rightNodeId ];

        var edge;
        var edgeCategory = edgeData.relationType;
        var edgeStyle;
        //get edge style from graph legend
        var legendEdgeStyle = graphLegendSvc.getStyleFromLegend( 'relations', edgeCategory, activeLegendView );
        if( legendEdgeStyle ) {
            edgeStyle = legendEdgeStyle;
        }

        if( sourceNode && targetNode ) {
            var matchFound = false;

            // look for existing match
            try {
                var sourceEdges = sourceNode.getEdges();
                var targetEdges = targetNode.getEdges();

                var allEdges = sourceEdges.concat( targetEdges );
                allEdges = _.uniq( allEdges );

                _.forEach( allEdges, function( tmpEdge ) {

                    var edgeSourceNodeObj = tmpEdge.getSourceNode().appData.nodeObject;
                    var edgeTargetNodeObj = tmpEdge.getTargetNode().appData.nodeObject;

                    if( sourceNode.appData.nodeObject === edgeSourceNodeObj &&
                        targetNode.appData.nodeObject === edgeTargetNodeObj &&
                        edgeStyle.relationType === tmpEdge.style.relationType ) {
                        matchFound = true;
                        throw BreakException;
                    }
                } );
            } catch ( e ) {
                if( e !== BreakException ) {
                    logger.error( e );
                }
            }

            // Need to filter out the already drawn edges in diagram( in case of expand remaining)
            if( !matchFound ) {
                edge = graph.createEdgeWithNodesStyleAndTag( sourceNode, targetNode, edgeStyle, null );

                sourceNode.isOutGoingExpanded = true;
                targetNode.isInComingExpanded = true;
                if( edge ) {
                    edge.category = edgeCategory;
                    edge.modelObject = edgeData.metaObject;
                    edge.sourceNode = sourceNode;
                    edge.targetNode = targetNode;
                    edge.itemType = "Edge";
                }
            }
        }
    } );

};

/**
 * NetworkGraphDrawNodeEdge factory
 */

export default exports = {
    setDegreeToNode,
    drawNodes,
    drawEdges
};
app.factory( 'NetworkGraphDrawNodeEdge', () => exports );

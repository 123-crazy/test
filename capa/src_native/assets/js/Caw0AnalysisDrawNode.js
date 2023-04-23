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
 * @module js/Caw0AnalysisDrawNode
 */
import app from 'app';
import clientDataModel from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import declUtils from 'js/declUtils';
import performanceUtils from 'js/performanceUtils';
import logger from 'js/logger';
import graphConstants from 'js/graphConstants';
import graphLegendSvc from 'js/graphLegendService';
import templateService from 'js/Caw0AnalysisTemplateService';
import Rv1RelationBrowserUtils from 'js/Rv1RelationBrowserUtils';
import appCtxService from 'js/appCtxService';

var OUT_DEGREE_PROPERTY = 'out_degree_string';
var IN_DEGREE_PROPERTY = 'in_degree_string';
var MIN_NODE_SIZE = [ 300, 135 ];

var exports = {};

var getDegrees = function( degreeProps ) {
    var degreeList = [];
    if( degreeProps ) {
        var degrees = degreeProps.split( '|' );
        _.forEach( degrees, function( degreePair ) {
            var categories = degreePair.split( ':' );
            if( categories.length !== 2 ) {
                return;
            }

            degreeList.push( categories );
        } );
    }

    return degreeList;
};

export let processNodeData = function( graphModel, graphData, activeLegendView ) {
    var addedNodes = [];

    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;
    var nodes = graphData.nodes;

    var nodeRect;

    _.forEach( nodes, function( nodeData ) {
        var nodeObject = nodeData.metaObject;

        //Node data to be bind in SVG template
        if( !graphModel.nodeMap[ nodeData.id ] ) {
            var nodeCategory = nodeData.props.Group;
            var outDegrees = getDegrees( nodeData.props[ OUT_DEGREE_PROPERTY ] );
            var inDegrees = getDegrees( nodeData.props[ IN_DEGREE_PROPERTY ] );
            var props = templateService.getBindPropertyNames( nodeObject );
            var flag = templateService.useMultiLevelTemplate( nodeObject );
            var nodeType = nodeObject.type;
            var template = templateService.getNodeTemplate( graphModel.nodeTemplates, props, false, flag, nodeType );
            if( !template ) {
                logger.error( 'Failed to get SVG template for node object. Skip drawing the node. Object UID: ' +
                    nodeObject.uid );
                return;
            }

            if( nodeType === 'CauseGroup' ) {
                nodeRect = {
                    width: 200,
                    height: 70,
                    x: 200,
                    y: 200
                };
            } else {
                nodeRect = {
                    width: 275,
                    height: 110,
                    x: 200,
                    y: 200
                };
            }

            var isRoot = nodeObject.uid === graphData.rootIds[ 0 ];
            var bindData = templateService.getBindProperties( nodeObject, isRoot );

            // Get the default node style properties.
            var defaultNodeStyle = graphModel.config.defaults.nodeStyle;

            // Get the node style properties defined by the legend.
            var legendNodeStyle = graphLegendSvc.getStyleFromLegend( 'objects', nodeData.props.Group, activeLegendView );

            // Merge the resulting styles in order of precendent.
            var nodeStyle = _.defaults( {}, legendNodeStyle, defaultNodeStyle );

            if( nodeData.metaObject.modelType && nodeData.metaObject.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && nodeData.metaObject.props.caw0rootCause.dbValues[ 0 ] !== null && nodeData.metaObject.props.caw0rootCause.dbValues[ 0 ] === '1' ) {
                nodeStyle.borderColor = 'red';
            }

            if( nodeStyle ) {
                bindData.node_fill_color = nodeStyle.borderColor;
            }

            //fill node command binding data
            if( graphModel.nodeCommandBindData ) {
                declUtils.consolidateObjects( bindData, graphModel.nodeCommandBindData );
            }

            if( nodeData.position ) {
                nodeRect = nodeData.position;
            }

            var node = graph.createNodeWithBoundsStyleAndTag( nodeRect, template, bindData );
            node.setMinNodeSize( MIN_NODE_SIZE );
            node.appData = {
                id: nodeData.id,
                nodeObject: nodeObject,
                inDegrees: inDegrees,
                outDegrees: outDegrees,
                category: nodeCategory
            };

            // record all added nodes
            addedNodes.push( node );

            //simulate application's root node
            if( node.appData.nodeObject.uid === graphData.rootIds[ 0 ] ) {
                node.isRoot( true );
                graphModel.rootId = node.appData.nodeObject.uid;
            }

            //build node map to help create edges
            graphModel.nodeMap[ nodeData.id ] = node;
        }
    } );

    return addedNodes;
};

/**
 * updateRelationCounts
 */
export let updateRelationCounts = function( graphModel, legend ) {
    try {
        var graphControl = graphModel.graphControl;
        var graph = graphControl.graph;

        var nodes = graph.getNodes();
        var rootNodes = _.filter( nodes, rootNodeFilter );

        var visibleNodes = graph.getVisibleNodes();

        // Check each node and verify counts
        _.forEach( visibleNodes, function( node ) {

            var filteredEdgeCount = Rv1RelationBrowserUtils.getFilteredCounts( legend, rootNodes, node );

            // Update the binding data
            updateNodeBindingData( graph, node, filteredEdgeCount );
        } );
    } catch ( ex ) {
        logger.debug( ex );
    }
};

var rootNodeFilter = function( item ) {
    return item.isRoot();
};

/**
 * updateNodeBindingData
 */
export let updateNodeBindingData = function ( graph, node, filteredEdgeCount ) {

    var bindData = {};

    var filteredInEdgeCount = filteredEdgeCount.inDegrees.length;

    var filteredOutEdgeCount = 0;

    if(filteredEdgeCount.outDegrees.length > 0) {
       var filteredOutEdges = filteredEdgeCount.outDegrees.filter(edge => edge[0] === 'SideWhy');
       filteredOutEdgeCount = filteredOutEdges.length;
    }

    bindData.filtered_in_degree = filteredInEdgeCount.toString();
    bindData.filtered_out_degree = filteredOutEdgeCount.toString();

    var inEdges = node.getEdges( graphConstants.EdgeDirection.IN );
    var visibleInEdges = _.filter( inEdges, function( edge ) {
        return edge.isVisible();
    } );
    var visibleInEdgesCount = visibleInEdges.length;

    var outEdges = node.getEdges( graphConstants.EdgeDirection.OUT );
    var visibleOutEdges = _.filter( outEdges, function( edge ) {
        return edge.isVisible();
    } );
    var visibleOutEdgesCount = visibleOutEdges.length;

    bindData.visible_in_degree = visibleInEdgesCount.toString();
    bindData.visible_out_degree = visibleOutEdgesCount.toString();

    bindData.incoming_all_shown = false;
    bindData.incoming_show_expand_button = false;
    bindData.incoming_show_partial_expand_button = false;

    if( filteredInEdgeCount > 0 ) {
        if( visibleInEdgesCount > 0 ) {
            if( visibleInEdgesCount === filteredInEdgeCount ) {
                bindData.incoming_show_expand_button = true;
                bindData.incoming_all_shown = true;
            } else {
                bindData.incoming_show_partial_expand_button = true;
            }
        } else {
            bindData.incoming_show_expand_button = true;
        }
    }

    if(appCtxService.ctx.graphToggledObject && node.appData.nodeObject.uid === appCtxService.ctx.graphToggledObject.toggledObject.uid) {
        bindData.outgoing_all_shown = appCtxService.ctx.graphToggledObject.toggleDirection === 'Forward'? true : false;}
    else {
        bindData.outgoing_all_shown = node.appData.isExpanded ? true: false;
    }


    bindData.outgoing_show_expand_button = false;
    bindData.outgoing_show_partial_expand_button = false;

    if( filteredOutEdgeCount > 0 ) {
        if( visibleOutEdgesCount > 0 ) {
            if( visibleOutEdgesCount === filteredOutEdgeCount ) {
                bindData.outgoing_show_expand_button = true;
                bindData.outgoing_all_shown = true;
            } else {
                bindData.outgoing_show_partial_expand_button = true;
            }
        } else {
            bindData.outgoing_show_expand_button = true;
        }
    }

    graph.updateNodeBinding( node, bindData );
};

/**
 * Caw0AnalysisDrawNode factory
 */

export default exports = {
    processNodeData,
    updateRelationCounts,
    updateNodeBindingData
};
app.factory( 'Caw0AnalysisDrawNode', () => exports );

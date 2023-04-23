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
 * @module js/Rv1RelationBrowserDrawNode
 */
import app from 'app';
import clientDataModel from 'soa/kernel/clientDataModel';
import graphStyleService from 'js/Rv1RelationBrowserGraphStyles';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import declUtils from 'js/declUtils';
import performanceUtils from 'js/performanceUtils';
import logger from 'js/logger';
import graphConstants from 'js/graphConstants';
import graphLegendSvc from 'js/graphLegendService';
import rbUtils from 'js/Rv1RelationBrowserUtils';
import templateService from 'js/Rv1RelationBrowserTemplateService';

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

    var nodeRect = {
        width: 300,
        height: 135,
        x: 200,
        y: 200
    };

    _.forEach( nodes, function( nodeData ) {
        var nodeObject = clientDataModel.getObject( nodeData.metaObject.uid );

        //Node data to be bind in SVG template
        if( !graphModel.nodeMap[ nodeData.id ] ) {
            var nodeCategory = nodeData.props.Group;
            var outDegrees = getDegrees( nodeData.props[ OUT_DEGREE_PROPERTY ] );
            var inDegrees = getDegrees( nodeData.props[ IN_DEGREE_PROPERTY ] );
            var props = templateService.getBindPropertyNames( nodeObject );
            var flag = templateService.useMultiLevelTemplate( nodeObject );
            var template = templateService.getNodeTemplate( graphModel.nodeTemplates, props, false, flag );
            if( !template ) {
                logger.error( "Failed to get SVG template for node object. Skip drawing the node. Object UID: " +
                    nodeObject.uid );
                return;
            }

            var isRoot = nodeObject.uid === graphData.rootIds[ 0 ];
            var bindData = templateService.getBindProperties( nodeObject, isRoot );

            // Get the default node style properties.
            var defaultNodeStyle = graphModel.config.defaults.nodeStyle;

            // Get the node style properties defined by the legend.
            var legendNodeStyle = graphLegendSvc.getStyleFromLegend( 'objects', nodeData.props.Group, activeLegendView );

            // Get the node style properties from the user's preferences (GraphStyle.xml).
            var preferenceNodeStyle = graphStyleService.getNodeStyle( nodeData.props.StyleTag );

            // Merge the resulting styles in order of precendent.
            var nodeStyle = _.defaults( {}, preferenceNodeStyle, legendNodeStyle, defaultNodeStyle );

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
 * Rv1RelationBrowserDrawNode factory
 */

export default exports = {
    processNodeData
};
app.factory( 'Rv1RelationBrowserDrawNode', () => exports );

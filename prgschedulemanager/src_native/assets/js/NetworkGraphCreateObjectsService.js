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
 * @module js/NetworkGraphCreateObjectsService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import NetworkUtils from 'js/NetworkUtils';
import NetworkGraphDataService from 'js/NetworkGraphDataService';
import NetworkGraphDrawNodeEdge from 'js/NetworkGraphDrawNodeEdge';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import graphLegendSvc from 'js/graphLegendService';
import 'js/NetworkGraphLegendService';

var exports = {};

var _previewEdge = null;
/**
 * Function to reset style of edge in diagram
 * 
 * @param {*} newRelation
 * @param {*} ctx
 * @param {*} data
 * 
 */
export let resetEdgeStyle = function( ctx, data ) {

    if( data !== undefined && data.newEdgeRelationCreated !== undefined && data.newEdgeRelationCreated.length ) {
        var edge = _previewEdge;
        var graph = ctx.graph;
        var graphModel = null;
        var activeLegendView = null;

        if( graph ) {
            if( graph.legendState ) {
                activeLegendView = graph.legendState.activeView;
            }
            graphModel = graph.graphModel;
        }
        var edgeStyle = edge.style;
        var edgeCategory = data.eventMap.networkGraphEdgeCreation.categoryType;
        edge.modelObject = data.newEdgeRelationCreated[ "0" ].relation;
        edge.itemType = "Edge";
        edge.sourceNode = _previewEdge.getSourceNode();
        edge.targetNode = _previewEdge.getTargetNode();
        //get edge style from graph legend
        if( edgeCategory ) {
            edgeStyle = graphLegendSvc.getStyleFromLegend( 'relations', edgeCategory, activeLegendView );
        }

        if( graphModel ) {
            graphModel.graphControl.graph.setEdgeStyle( edge, edgeStyle );
            graphModel.graphControl.fitGraph();
            NetworkUtils.applyNetworkGraphLayout( graphModel );
            graphModel.graphControl.graph.updateOnItemsAdded();
        }
        eventBus.publish( 'networkUpdateDegreeInfoOnNodes' );
    } else {
        var edges = [ _previewEdge ];
        NetworkUtils.removeEdge( ctx, edges );
    }

};

var isValidSourceAndTarget = function( relationType, sourceObject, targetObject ) {

    var isValidLocal = false;
    if( relationType === "Psi0PredecessorWorkElement" &&
        sourceObject.appData.nodeObject.type === "Psi0WorkElementRevision" &&
        targetObject.appData.nodeObject.type === "Psi0WorkElementRevision" ) {
        isValidLocal = true;
    }

    if( relationType === "Psi0WorkElementPDI" ) {
        if( !( sourceObject.appData.nodeObject.type === "Prg0Event" ) &&
            !( sourceObject.appData.nodeObject.type === "Psi0PrgDelRevision" ) &&
            !( sourceObject.appData.nodeObject.type === "Psi0WorkElementRevision" ) &&
            ( targetObject.appData.nodeObject.type === "Psi0WorkElementRevision" ) ) {
            isValidLocal = true;
        }
    }
    return isValidLocal;
};

/**
 * quick create the item from relation legend panel
 * 
 * @param {object} eventData - event data for the element created on graph
 */
export let quickEdgeCreateAction = function( ctx, previewEdge ) {

    _previewEdge = previewEdge;
    var graphContext = appCtxSvc.getCtx( "graph" );
    var categoryType = null;
    var sourceNode = _previewEdge.getSourceNode();
    var targetNode = _previewEdge.getTargetNode();
    var sourceObject;
    var targetObject;

    if( graphContext && graphContext.legendState ) {
        categoryType = graphContext.legendState.creatingSubCategory.internalName;
    }
    if( sourceNode && sourceNode.appData.nodeObject ) {
        sourceObject = sourceNode.appData.nodeObject;
    }

    if( targetNode && targetNode.appData.nodeObject ) {
        targetObject = targetNode.appData.nodeObject;
    }
    var isValid = isValidSourceAndTarget( categoryType, sourceNode, targetNode );

    if( isValid ) {
        var edgeCreationData = {
            "primaryObject": sourceObject,
            "secondaryObject": targetObject,
            "categoryType": categoryType
        };
        eventBus.publish( 'networkGraphEdgeCreation', edgeCreationData );
    } else {
        exports.resetEdgeStyle( ctx );
    }

};

export let addNewWorkElementToDiagram = function( ctx, data ) {

    var networkGraphData = {};

    var graphControl = data.graphModel.graphControl;
    var graph = graphControl.graph;

    var activeLegendView = null;
    if( ctx.graph.legendState ) {
        activeLegendView = ctx.graph.legendState.activeView;
    }
    NetworkGraphDataService.populateNetworkGraphData( ctx, data, networkGraphData );
    NetworkGraphDrawNodeEdge.drawNodes( networkGraphData, data.graphModel, graph, activeLegendView, data );
    NetworkGraphDrawNodeEdge.drawEdges( networkGraphData.edges, data.graphModel, graph, activeLegendView );

    NetworkUtils.applyNetworkGraphLayout( data.graphModel );

    graphControl.fitGraph();
    graph.updateOnItemsAdded();

    eventBus.publish( 'networkUpdateDegreeInfoOnNodes' );
};

export default exports = {
    resetEdgeStyle,
    quickEdgeCreateAction,
    addNewWorkElementToDiagram
};
app.factory( 'NetworkGraphCreateObjectsService', () => exports );

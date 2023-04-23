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
 * This implements the graph edit handler interface APIs defined by aw-graph widget to provide graph authoring
 * functionalities for Network tab
 * 
 * @module js/NetworkGraphEditHandler
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import NetworkGraphCreateObjectsService from 'js/NetworkGraphCreateObjectsService';
import graphLegendSvc from 'js/graphLegendService';

var exports = {};

/**
 * Function to be called to tell if the edge was permitted to reconnect
 * 
 * @param {Object} graphModel - the graph model object
 * @param {Object} updatedEndPoint - the connection end type, could be "source" or "target"
 * @param {Object} edge - the edge to reconnect
 * @return flag whether the edge can be reconnected
 */
export let canReconnectEdge = function( graphModel, updatedEndPoint, edge ) {
    return true;
};

/**
 * Function to be called to tell if the edge was permitted to create from this source
 * 
 * @param {Object} graphModel - the graph model object
 * @param {Object} source - the source whether the edge can be created from
 * @return flag whether the edge can be reconnected
 */
export let canCreateEdgeFrom = function( graphModel, source ) {
    if( source.getItemType() === "Node" ) {
        return true;
    }
};

/**
 * Function to be called to tell if the edge was permitted to create from this source
 * 
 * @param {Object} graphModel - the graph model object
 * @param {Object} source - the source whether the edge can be created from
 * @return flag whether the edge can be reconnected
 */
export let canCreateEdgeTo = function( graphModel, target, edge ) {
    if( target.getItemType() === "Node" ) {
        return true;
    }
};

/**
 * Function to be called to set the default node display properties
 * 
 * @param {Object} graphModel - the graph model object
 * @param {object} legendState - legendState information of selected object from legend panel
 * 
 */
var setDefaultNodeDisplayProperties = function( graphModel, legendState ) {
    var nodeCategory = legendState.creatingCategory.internalName;
    var nodeSubCategoryDisplayName = legendState.creatingSubCategory.displayName;
    var nodeStyle = graphLegendSvc.getStyleFromLegend( 'objects', nodeCategory, legendState.activeView );
    var dummyNodeStyle = graphModel.config.defaults.nodeStyle;
    if( dummyNodeStyle && dummyNodeStyle.templateId ) {
        var templateId = dummyNodeStyle.templateId;
        var registeredTemplate = graphModel.nodeTemplates[ templateId ];
        if( registeredTemplate ) {
            var initialBindData = registeredTemplate.initialBindData;
            if( initialBindData ) {
                initialBindData.node_fill_color = nodeStyle.borderColor;
                initialBindData.Name = nodeSubCategoryDisplayName;
            }
        }
    }
};

/**
 * Function to create edge.
 * 
 * @param {Object} graphModel - the graph model object
 * @param {Object} previewEdge - the preview edge.
 */
export let createEdge = function( graphModel, previewEdge ) {

    NetworkGraphCreateObjectsService.quickEdgeCreateAction( graphModel, previewEdge );

};

export default exports = {
    canReconnectEdge,
    canCreateEdgeFrom,
    canCreateEdgeTo,
    createEdge
};
/**
 * Define graph edit handler
 * 
 * @memberof NgServices
 * @member NetworkGraphEditHandler
 */
app.factory( 'NetworkGraphEditHandler', () => exports );

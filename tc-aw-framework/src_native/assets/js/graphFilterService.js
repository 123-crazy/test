// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module provides graph filter services
 *
 * @module js/graphFilterService
 */
import app from 'app';
import _ from 'lodash';
import internalGraphUtils from 'js/internalGraphUtils';
import performanceUtils from 'js/performanceUtils';

'use strict';

var exports = {};

/**
 * Apply filters to the graph. If connectedGraphResolver configured, it will be invoked to generate connected graph.
 *
 * @param graphModel the graph model object.
 * @param syncGroupDescendantsVisibilityOnFilter, optional
 *        default true or by configuration: graphModel.config.syncGroupDescendantsVisibilityOnFilter
 *        flag to set whether sync Group node and it's Descendants' visibility when apply filter
 * @return the filter results,
 *         results in format:\{ visibleItems: visibleItems, invisibleItems: invisibleItems \}
 */
export let applyFilter = function( graphModel, syncGroupDescendantsVisibilityOnFilter ) {
    if( !graphModel ) {
        return;
    }

    var graph = graphModel.graphControl.graph;
    var filters = graphModel.filters;
    if( !filters || filters.length === 0 ) {
        return;
    }
    // start performance timer
    var performanceTimer = performanceUtils.createTimer();

    // check syncGroupDescendantsVisibilityOnFilter
    var sync = syncGroupDescendantsVisibilityOnFilter;
    if( sync === undefined ) {
        if( graphModel.config.syncGroupDescendantsVisibilityOnFilter !== undefined ) {
            sync = graphModel.config.syncGroupDescendantsVisibilityOnFilter;
        } else {
            sync = true;
        }
    }

    // 1, filter base, for all graph items
    var allNodes = graphModel.graphControl.graph.getNodes();
    var allEdges = graphModel.graphControl.graph.getEdges();
    var allPorts = graphModel.graphControl.graph.getPorts();
    var allBoundaries = graphModel.graphControl.graph.getBoundaries();
    var nextNodes = allNodes;
    var nextEdges = allEdges;
    var nextPorts = allPorts;
    var nextBoundaries = allBoundaries;

    // 2, calculate the hideSet and showSet based on all the filters
    var allItems = [].concat( allNodes, allEdges, allPorts, allBoundaries );
    var itemsToShow = [];
    var itemsToHide = [];

    // 3 apply filters
    _.forEach( filters, function( filter ) {
        var result = filter( nextNodes, nextEdges, nextPorts, nextBoundaries, [] );
        nextNodes = result.nodes;
        nextEdges = result.edges;
        nextPorts = result.ports;
        nextBoundaries = result.boundaries;
        itemsToHide = itemsToHide.concat( result.itemsToHide );
    } );

    // 4, set visibility for the hideSet and showSet
    itemsToHide = _.uniq( itemsToHide );
    itemsToShow = _.difference( allItems, itemsToHide );
    var becomeVisibleItems = graph.setVisible( itemsToShow, true, sync );
    var becomeInvisibleItems = graph.setVisible( itemsToHide, false, sync );

    // 4, final resolve graph, hide any unconnected graph items, based on all visible graph items
    var connectedGraphResolver = null;
    if( graphModel.customFilterApi ) {
        connectedGraphResolver = graphModel.customFilterApi.resolveConnectedGraph;
        if( connectedGraphResolver && typeof connectedGraphResolver === 'function' ) {
            var unconnectedGraphItems = connectedGraphResolver( graphModel );
            var unconnectedInvisibleItems = graph.setVisible( unconnectedGraphItems, false, sync );
            if( unconnectedInvisibleItems ) {
                if( !becomeInvisibleItems ) {
                    becomeInvisibleItems = unconnectedInvisibleItems;
                } else {
                    becomeInvisibleItems.nodes = becomeInvisibleItems.nodes.concat( unconnectedInvisibleItems.nodes );
                    becomeInvisibleItems.edges = becomeInvisibleItems.edges.concat( unconnectedInvisibleItems.edges );
                    becomeInvisibleItems.ports = becomeInvisibleItems.nodes.concat( unconnectedInvisibleItems.ports );
                }
            }
        }
    }

    // need to inform application when filter applied,
    // so that the application have chance to update layout accordingly.
    internalGraphUtils.publishGraphEvent( graphModel, 'awGraph.filterApplied' );

    // log performance time
    performanceTimer.endAndLogTimer( 'Category Filter Changed', 'categoryFilterChanged' );

    return {
        visibleItems: becomeVisibleItems,
        invisibleItems: becomeInvisibleItems
    };
};

export default exports = {
    applyFilter
};

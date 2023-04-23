// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * @module js/Psi0ViewDependenciesService
 */
import $ from 'jquery';
import eventBus from 'js/eventBus';
import _cdm from 'soa/kernel/clientDataModel';
import _appCtxService from 'js/appCtxService';

'use strict';

var exports = {};


/**
 * This function will call at the reveal action of deliverables.
 *
 * @param {Object} ctx - The current context.
 */
export let populateViewDependencies = function() {
    exports.cleanup();
    eventBus.publish( 'awGraph.initialized' );
};

/** -------------------------------------------------------------------
 *  Used to clear current graph
 *
 */
export let cleanup = function() {
    clearGraph( _appCtxService.ctx.graph );

    _appCtxService.unRegisterCtx( 'deliverablesSplit' );
    _appCtxService.unRegisterCtx( 'splitViewModel' );
};

/** -------------------------------------------------------------------
 *  Used to clear current graph
 * @param {Object} ctxGraph - The graph currently in view.
 */
var clearGraph = function( ctxGraph ) {
    if( ctxGraph ) {
        var graphModel = ctxGraph.graphModel;
        graphModel.nodeMap = null;

        //clear the graph
        var graph = graphModel.graphControl.graph;
        graph.update( function() {
            graph.clear();
        } );

        graphModel.graphControl.layout = null;
    }
};

export default exports = {
    populateViewDependencies,
    cleanup
};

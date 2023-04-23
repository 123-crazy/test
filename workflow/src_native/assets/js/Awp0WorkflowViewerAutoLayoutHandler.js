//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*
 global
 define
 */

/**
 * AutoLayout command handler for workflwo viewer
 *
 * @module js/Awp0WorkflowViewerAutoLayoutHandler
 */
import * as app from 'app';

'use strict';
var exports = {};

/*
 * Disable auto layout
 * @param {Object} ctx Context object
 * @param {String} layoutOption Selected Layout string object
 */
export let disableAutoLayout = function( ctx, layoutOption ) {
    //Need to return autoLayoutState to avoid execution of enable and disable auto layout in one flow
    if( !ctx.workflowViewerCtx || !ctx.workflowViewerCtx.diagram ) {
        return;
    }
    var autoLayoutState = ctx.workflowViewerCtx.diagram.isAutoLayoutOn;
    var graphModel = ctx.graph.graphModel;
    var graphControl = graphModel.graphControl;
    var layout = graphControl.layout;

    if( layout ) {
        layout.deactivate();
        if( ctx.workflowViewerCtx && ctx.workflowViewerCtx.diagram ) {
            ctx.workflowViewerCtx.diagram.isAutoLayoutOn = false;
            ctx.workflowViewerCtx.diagram.layoutOption = layoutOption;
            ctx.workflowViewerCtx.diagram.isSwitchingBetweenAutoLayout = false;
        }
    }
    return autoLayoutState;
};

/*
 * Enable auto layout
 * @param {Object} ctx Context object
 * @param {String} layoutOption Selected Layout string object
 */
export let enableAutoLayout = function( ctx, layoutOption ) {
    // Check if not valid then no need to process further
    if( !ctx.graph || !ctx.graph.graphModel ) {
        return;
    }
    var graphControl = ctx.graph.graphModel.graphControl;
    var layout = graphControl.layout;
    if( layout ) {
        layout.activate();
        if( ctx.workflowViewerCtx && ctx.workflowViewerCtx.diagram ) {
            var oldLayoutValue = ctx.workflowViewerCtx.diagram.isAutoLayoutOn;
            ctx.workflowViewerCtx.diagram.isAutoLayoutOn = true;
            ctx.workflowViewerCtx.diagram.layoutOption = layoutOption;
            ctx.workflowViewerCtx.diagram.isSwitchingBetweenAutoLayout = oldLayoutValue;
        }
    }
};

export default exports = {
    disableAutoLayout,
    enableAutoLayout
};

/**
 * Define graph layout handler
 *
 * @memberof NgServices
 * @member Awp0WorkflowViewerAutoLayoutHandler
 */
app.factory( 'Awp0WorkflowViewerAutoLayoutHandler', () => exports );


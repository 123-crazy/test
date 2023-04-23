//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*
 global
 define
 */

/**
 *AutoLayout command handler
 *
 * @module js/Awp0WorkflowDesignerAutoLayoutHandler
 */
import * as app from 'app';
import editService from 'js/Awp0WorkflowAssignmentEditService';

'use strict';
var exports = {};

/*
 * Disable auto layout
 * @param {Object} ctx Context object
 * @param {String} layoutOption Selected Layout string object
 */
export let disableAutoLayout = function( ctx, layoutOption ) {
    //Need to return autoLayoutState to avoid execution of enable and disable auto layout in one flow
    if( !ctx.workflowDgmCtx || !ctx.workflowDgmCtx.diagram ) {
        return;
    }
    // Get the edit handler and if not null then save the edits if any edit is done before applying the layout
    var editHandler = editService.getActiveEditHandler();
    if( editHandler && editHandler.isDirty() ) {
        editHandler.saveEdits();
    }

    var autoLayoutState = ctx.workflowDgmCtx.diagram.isAutoLayoutOn;
    var graphModel = ctx.graph.graphModel;
    var graphControl = graphModel.graphControl;
    var gridPreferences = graphControl.grid.preferences;
    var alignPreferences = graphControl.alignment.preferences;
    var graph = graphControl.graph;
    var layout = graphControl.layout;

    if( layout ) {
        layout.deactivate();
        graph.update( function() {
            //Enable auto alignment on auto layout OFF
            gridPreferences.enableSnapping = true;
            alignPreferences.enabled = true;
        } );
        if( ctx.workflowDgmCtx && ctx.workflowDgmCtx.diagram ) {
            ctx.workflowDgmCtx.diagram.isAutoLayoutOn = false;
            ctx.workflowDgmCtx.diagram.layoutOption = layoutOption;
            ctx.workflowDgmCtx.diagram.isSwitchingBetweenAutoLayout = false;
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
    // Get the edit handler and if not null then save the edits if any edit is done before applying the layout
    var editHandler = editService.getActiveEditHandler();
    if( editHandler ) {
        editHandler.saveEdits();
    }

    var graphControl = ctx.graph.graphModel.graphControl;
    var gridPreferences = graphControl.grid.preferences;
    var alignPreferences = graphControl.alignment.preferences;
    var graph = graphControl.graph;
    var layout = graphControl.layout;
    if( layout ) {
        layout.activate();
        graph.update( function() {
            //Disable auto alignment and snapping on auto layout ON
            gridPreferences.enableSnapping = false;
            alignPreferences.enabled = false;
        } );
        if( ctx.workflowDgmCtx && ctx.workflowDgmCtx.diagram ) {
            var oldLayoutValue = ctx.workflowDgmCtx.diagram.isAutoLayoutOn;
            ctx.workflowDgmCtx.diagram.isAutoLayoutOn = true;
            ctx.workflowDgmCtx.diagram.layoutOption = layoutOption;
            ctx.workflowDgmCtx.diagram.isSwitchingBetweenAutoLayout = oldLayoutValue;
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
 * @member Awp0WorkflowDesignerAutoLayoutHandler
 */
app.factory( 'Awp0WorkflowDesignerAutoLayoutHandler', () => exports );


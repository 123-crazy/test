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
 * This implements the selection handler interface APIs defined by aw-graph widget to provide selection functionalities.
 *
 * @module js/Awp0WorkflowGraphSelectionService
 */
import * as app from 'app';
import selectionService from 'js/selection.service';
import eventBus from 'js/eventBus';
import appCtxSvc from 'js/appCtxService';

var exports = {};

var sourceObj;

/**
 * This function will set the source object to the context.
 * @param {Object} selection - The selected Object
 */
export let setSourceObject = function( selection ) {
    sourceObj = selection;
    selectionService.updateSelection( sourceObj );
};

/**
 * Function to be called when we select items on grpah and will update the context.
 * @param {Object} selected - The selected Object.
 * @param {Object} unselected - The unselected Object.
 */
export let updateContextSelection = function( selected, unselected ) {
    var graph = appCtxSvc.getCtx( 'graph' );

    // Check if graph is not valid then no need to process further and return from here
    if( !graph || !graph.graphModel || !graph.graphModel.graphControl ) {
        return;
    }
    var graphControl = graph.graphModel.graphControl;
    var selectedNodes = graphControl.getSelected( 'Node' );

    // Set the viewer graph selected nodes on context. This is need to enable some commands
    // like create sub process based on graph selection. For finish node this command should not
    // be visible.
    var workflowDgmCtx = appCtxSvc.getCtx( 'workflowViewerCtx' );
    if( workflowDgmCtx ) {
        workflowDgmCtx.selectedNodes = selectedNodes;
    }

    // Check if selected or unselected any one input is null then no need to
    // process further.
    if( !selected || !unselected ) {
        return;
    }

    if( selected.length > 0 && unselected.length > 0 ) {
        if( typeof selected[ '0' ].appData !== typeof undefined ) {
            var selectedModelObject = selected[ '0' ].appData.nodeObject;
            selectionService.updateSelection( selectedModelObject, sourceObj );
        }
        eventBus.publish( 'Workflow.closeOpenedPanel' );
    } else if( selected.length > 0 ) {
        if( typeof selected[ '0' ].appData !== typeof undefined ) {
            selectedModelObject = selected[ '0' ].appData.nodeObject;
            selectionService.updateSelection( selectedModelObject, sourceObj );
        }
        eventBus.publish( 'Workflow.closeOpenedPanel' );
    } else if( unselected.length > 0 ) {
        selectionService.updateSelection( sourceObj );
    }
};

export default exports = {
    setSourceObject,
    updateContextSelection
};
/**
 * Define selection service handler.
 *
 * @memberof NgServices
 * @member Awp0WorkflowGraphSelectionService
 */
app.factory( 'Awp0WorkflowGraphSelectionService', () => exports );

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
 * @module js/Awp0WorkflowDesignerBreadcrumbPanel
 */
import * as app from 'app';
import cdmService from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import Awp0WorkflowDesignerUtils from 'js/Awp0WorkflowDesignerUtils';
import editService from 'js/Awp0WorkflowAssignmentEditService';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * load the data to be shown on chevron popup
 *
 * @param {Object} templateObjectUid Template whose object need to be get
 * @return {Object} the resultObject
 */
export let loadChevronPopup = function( templateObjectUid ) {
    var childObjs = [];
    if( templateObjectUid ) {
        var targetObject = cdmService.getObject( templateObjectUid );
        var subTaskTemplateUids = targetObject.props.subtask_template.dbValues;
        for( var ndx = 0; ndx < subTaskTemplateUids.length; ndx++ ) {
            var object = cdmService.getObject( subTaskTemplateUids[ ndx ] );
            var result = {
                className: object.type,
                type: object.type,
                uid: object.uid
            };
            childObjs.push( result );
        }
    }
    return {
        searchResults: childObjs,
        totalFound: childObjs.length
    };
};

/**
 * Update the graph based on selected object from list
 *
 * @param {Object} selectedObject Selected object from drop down list
 */
export let onChevronDataSelection = function( selectedObject ) {
    if( selectedObject ) {
        appCtxSvc.registerCtx( 'workflowDesignerCrumbSelectionUid', selectedObject.uid );
        var uidToCheck = null;
        // Check if URL is already updated with task which is going to expand then directly fire the event to load the children
        // else update the URL and graph will be updated through update graph URL mechanism.
        if( appCtxSvc.ctx.state && appCtxSvc.ctx.state.params && appCtxSvc.ctx.state.params.sc_uid ) {
             uidToCheck = appCtxSvc.ctx.state.params.sc_uid;
        }
        Awp0WorkflowDesignerUtils.updateURL( { sc_uid: selectedObject.uid } );
        if( uidToCheck === selectedObject.uid ) {
            // Get the edit handler and if not null then save the edits if any edit is done before applying the layout
            var editHandler = editService.getActiveEditHandler();
            if( editHandler ) {
                editHandler.saveEdits();
            }
            eventBus.publish( 'workflowDesigner.updateGraphForSelectedTemplate' );
        }
    }
};

export default exports = {
    loadChevronPopup,
    onChevronDataSelection
};
app.factory( 'Awp0WorkflowDesignerBreadcrumbPanel', () => exports );

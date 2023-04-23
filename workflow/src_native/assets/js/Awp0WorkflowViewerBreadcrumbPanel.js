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
 * @module js/Awp0WorkflowViewerBreadcrumbPanel
 */
import * as app from 'app';
import cdmService from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * load the data to be shown on chevron popup
 *
 * @param {Object} objectUid Object whose object need to be get
 * @return {Object} the resultObject
 */
export let loadChevronPopup = function( objectUid ) {
    var childObjs = [];
    if( objectUid ) {
        var targetObject = cdmService.getObject( objectUid );
        if( targetObject && targetObject.props.child_tasks  ) {
            var childTaskUids = targetObject.props.child_tasks.dbValues;
            for( var ndx = 0; ndx < childTaskUids.length; ndx++ ) {
                var object = cdmService.getObject( childTaskUids[ ndx ] );
                var result = {
                    className: object.type,
                    type: object.type,
                    uid: object.uid
                };
                childObjs.push( result );
            }
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
        appCtxSvc.registerCtx( 'workflowViewerSubTaskSelectionUid', selectedObject.uid );
        eventBus.publish( 'workflowViewer.updateGraphForSelectedTask' );
    }
};

export default exports = {
    loadChevronPopup,
    onChevronDataSelection
};
app.factory( 'Awp0WorkflowViewerBreadcrumbPanel', () => exports );

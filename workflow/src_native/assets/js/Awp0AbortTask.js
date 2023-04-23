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
 * @module js/Awp0AbortTask
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import awp0InboxUtils from 'js/Awp0InboxUtils';

/**
 * Define public API
 */
var exports = {};

/**
 * Populate the properties on the panel and custom condition paths that needs to be displayed.
 *
 * @param {object} data - the data Object
 * @param {object} selection - the current selection object
 *
 */
export let populatePanelData = function( data, selection ) {

    var selectedObject;

    if( selection && selection.uid ) {
        selectedObject = cdm.getObject( selection.uid );

        var taskObject = awp0InboxUtils.getTaskObject( selectedObject );
        if( taskObject ) {
            data.psParentTaskObject = taskObject;

            if( taskObject.props.parent_process ) {
                data.parentJobObject = cdm.getObject( taskObject.props.parent_process.dbValues[ 0 ] );

                data.taskName.uiValue = taskObject.props.parent_process.uiValues[ 0 ];
                data.description.uiValue = data.parentJobObject.props.object_desc.uiValues[ 0 ];
            }
        }
    }
};

/**
 * This factory creates a service and returns exports
 *
 * @member Awp0AbortTask
 */

export default exports = {
    populatePanelData
};
app.factory( 'Awp0AbortTask', () => exports );

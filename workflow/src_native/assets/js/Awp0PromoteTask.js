// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awp0PromoteTask
 */
import app from 'app';
import listBoxSvc from 'js/listBoxService';
import Awp0InboxUtils from 'js/Awp0InboxUtils';
import 'lodash';

var exports = {};

/**
 * get the comments entered on the panel.
 *
 * @param {object} data - the data Object
 * @returns {object} data - the return data Object
 */
export let getComments = function( data ) {
    return Awp0InboxUtils.getComments( data );
};

/**
 * Populate the properties on the panel.
 *
 * @param {object} data - the data Object
 * @param {object} selection - the current selection object
 *
 */
export let populatePanelData = function( data, selection ) {

    if( selection ) {
        var taskToPromote = Awp0InboxUtils.populatePanelData( data, selection );

        if( taskToPromote && taskToPromote.props.has_failure_paths && taskToPromote.props.has_failure_paths.dbValues ) {
            var hasFailurePathsValue = taskToPromote.props.has_failure_paths.dbValues[ 0 ];
            data.hasFailurePaths.dbValue = hasFailurePathsValue === "1";
        }

        data.promoteTask = taskToPromote;
        getPromotePaths( data );
    }
};

/**
 * Get the promote paths value. If user selected the approve / reject path then return the non-locale value
 * otherwise use the input value as return value
 *
 * @param {obejct} taskResult - the selected task result
 * @param {object} data - the data object
 * @return taskResultValue - Task result value
 */

export let getPromotePathValue = function( promotePath, data ) {
    var promotePathValue;
    var validPath = promotePath;

    // Check if input path value is null or undefined then get the input path value from data object.
    // This will be used when path been populated as list and then get the selected value
    // from list it will use this.
    if( !validPath ) {
        validPath = data.promotePath.dbValue;
    }

    // Compare for approve or reject path value so that SOA_EPM_approve and SOA_EPM_reject (correct value) can be pass to server
    if( validPath === data.approvePath.dbValue ) {
        promotePathValue = 'SOA_EPM_approve';
    } else if( validPath === data.rejectPath.dbValue ) {
        promotePathValue = 'SOA_EPM_reject';
    } else {
        promotePathValue = validPath;
    }
    return promotePathValue;
};

/**
 * Get the promote paths and populate on the data object so it can be rendered. This method will localize the
 * approve and reject paths to localize value.
 *
 * @param {data} data - the data object
 */
function getPromotePaths( data ) {

    var displayPaths = [];

    displayPaths.push( data.approvePath.uiValue );

    displayPaths.push( data.rejectPath.uiValue );

    data.promotePaths = listBoxSvc.createListModelObjectsFromStrings( displayPaths );
}

/**
 * This factory creates a service and returns exports
 *
 * @member Awp0PromoteTask
 */

export default exports = {
    getComments,
    populatePanelData,
    getPromotePathValue
};
app.factory( 'Awp0PromoteTask', () => exports );

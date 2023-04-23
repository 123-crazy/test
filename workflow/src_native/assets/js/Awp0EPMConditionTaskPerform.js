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
 * @module js/Awp0EPMConditionTaskPerform
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import soaService from 'soa/kernel/soaService';
import listBoxService from 'js/listBoxService';
import viewModelObjectService from 'js/viewModelObjectService';
import Awp0PerformTask from 'js/Awp0PerformTask';
import awp0InboxUtils from 'js/Awp0InboxUtils';
import _ from 'lodash';

var exports = {};

/**
 * Populate the properties on the panel and custom condition paths that needs to be displayed.
 *
 * @param {object} data - the data Object
 * @param {object} selection - the current selection object
 *
 */
export let populatePanelData = function( data, selection ) {
    var selectedObject = selection;
    if( !selectedObject ) {
        selectedObject = viewModelObjectService.createViewModelObject( appCtxSvc.ctx.task_to_perform.task[ 0 ] );
    }

    // This method is needed to set the correct style for panel when it will be visible in secondary area
    Awp0PerformTask.updateStyleForSecondaryPanel();

    var nameValue = selectedObject.props.object_string.dbValues[ 0 ];
    data.taskName.dbValue = nameValue;
    data.taskName.uiValue = nameValue;

    var commentsValue = selectedObject.props.comments.dbValues[ 0 ];
    data.comments.dbValue = commentsValue;
    data.comments.uiValue = commentsValue;

    Awp0PerformTask.populateDescription( data, selectedObject );
    
    awp0InboxUtils.populateJobDescription( data, selectedObject );

    var secureTaskValue = selectedObject.props.secure_task.dbValues[ 0 ];
    if( secureTaskValue === '1' ) {
        data.isSecureTask.dbValue = true;
    } else {
        data.isSecureTask.dbValue = false;
    }

    var hasFailurePathsValue = selectedObject.props.has_failure_paths.dbValues[ 0 ];
    if( hasFailurePathsValue === '1' ) {
        data.hasFailurePaths.dbValue = true;
    } else {
        data.hasFailurePaths.dbValue = false;
    }

    // Set the default value for DS configured to false
    data.isDSConfigured = false;

    var modelObj = cdm.getObject( selectedObject.props.task_template.dbValues[ 0 ] );
    var taskTemplate = viewModelObjectService.createViewModelObject( modelObj );

    // Get the custom condition paths by calling the SOA
    var request = {
        taskTemplates: [ taskTemplate ]
    };

    soaService.post( 'Internal-AWS2-2012-10-Workflow', 'getTaskResults', request ).then( function( response ) {
        getConditionPaths( response, data );
    } );

    var deferred = AwPromiseService.instance.defer();
    Awp0PerformTask.getDigitalSignatureService().then( function( awDigitalSignatureService ) {
        deferred.resolve( null );

        if( awDigitalSignatureService ) {
            data.isDSConfigured = true;
            var isApplyDS = awDigitalSignatureService.isApplyDS( selectedObject );
            var isAuthenticationRequired = awDigitalSignatureService.isAuthenticationRequired( selectedObject );

            if( isApplyDS || isAuthenticationRequired ) {
                awDigitalSignatureService.addActiveXObjectElement();
            }
        }
    } );
    return deferred.promise;
};

/**
 * Get the custom condition paths and populate on the data object so it can be rendered. This method will localize
 * the true and false path to localize value and other paths will be displayed as defined in the template
 *
 * @param {object} response - the soa response
 * @param {object} data - the data object
 */
function getConditionPaths( response, data ) {
    var paths = response.output[ 0 ].taskResults;
    var displayPaths = [];

    if( paths ) {
        _.forEach( paths, function( pathValue ) {
            if( pathValue.toUpperCase() === 'TRUE' ) {
                displayPaths.push( data.i18n.trueText );
            } else if( pathValue.toUpperCase() === 'FALSE' ) {
                displayPaths.push( data.i18n.falseText );
            } else {
                displayPaths.push( pathValue );
            }
        } );
    }

    data.taskResults = listBoxService.createListModelObjectsFromStrings( displayPaths );
}

/**
 * Get the comments that needs to be saved
 *
 * @param {object} data - the data object
 * @return propertyNameValues - Property name value pair array that contains the comment property
 */
export let getComments = function( data ) {
    return Awp0PerformTask.getComments( data );
};

/**
 * Get the task result value. If user selected the true / false path then return the non-locale value otherwise use
 * the input value as return value
 *
 * @param {obejct} taskResult - the selected task result
 * @param {object} data - the data object
 * @return taskResultValue - Task result value
 */
export let getTaskResultValue = function( taskResult, data ) {
    var taskResultValue;
    var validTaskResult = taskResult;

    // Check if input task result is null or undefined then get the task result value from data object.
    // This will be used when task result been populated as list and then get the selected value
    // from list it will use this.
    if( !validTaskResult ) {
        validTaskResult = data.taskResult.dbValue;
    }

    // Compare for true or false path value so that true and false (correct value) can be pass to server
    if( validTaskResult === data.i18n.trueText ) {
        taskResultValue = 'true';
    } else if( validTaskResult === data.i18n.falseText ) {
        taskResultValue = 'false';
    } else {
        taskResultValue = validTaskResult;
    }
    data.i18n.taskResultValue = taskResultValue;
    return taskResultValue;
};

/**
 * Perform the task using digital signature service
 *
 * @param {object} data - the data Object
 * @param {object} actionableObject - the current selection object
 * @param {object} action - the data Object
 * @param {object} supportingValue - the data Object
 * @param {object} supportingObject - the data Object
 *
 */
export let performTaskDS = function( data, actionableObject, action, supportingValue, supportingObject ) {
    Awp0PerformTask.performTaskDS( data, actionableObject, action, supportingValue, supportingObject );
};

/**
 * Perform the task using performAction3 SOA call
 *
 * @param {object} data - the data Object
 * @param {object} actionableObject - the current selection object
 * @param {object} action - the data Object
 * @param {object} supportingValue - the data Object
 * @param {object} supportingObject - the data Object
 *
 */
export let performTask = function( data, actionableObject, action, supportingValue, supportingObject ) {
    Awp0PerformTask.performTask( data, actionableObject, action, supportingValue, supportingObject );
};

/**
 * Check input error code is to be ignore or not
 *
 * @param {object} errCode - the error code that needs to be check
 * @return {boolean} - True if error code needs to be ignored else false
 */
var _isIgnoreErrorCode = function( errCode ) {
    if( errCode === 33321 ) {
        return true;
    }
    if( errCode === 33086 || errCode === 33083 || errCode === 33084 || errCode === 33085 ) {
        return true;
    }
    return false;
};

/**
 * Populate the error message based on the SOA response output and filters the partial errors and shows the correct
 * errors only to the user.
 *
 * @param {object} response - the response Object of SOA
 * @return {String} message - Error message to be displayed to user
 */
export let populateErrorMessageOnPerformAction = function( response ) {
    var err = null;
    var message = '';

    // Check if input response is not null and contains partial errors then only
    // create the error object
    if( response && ( response.partialErrors || response.PartialErrors ) ) {
        err = soaService.createError( response );
    }

    // Check if error object is not null and has partial errors then iterate for each error code
    // and filter out the errors which we don't want to display to user
    if( err && err.cause && err.cause.partialErrors ) {
        _.forEach( err.cause.partialErrors, function( partErr ) {
            if( partErr.errorValues ) {
                _.forEach( partErr.errorValues, function( errVal ) {
                    if( errVal.code && !_isIgnoreErrorCode( errVal.code ) ) {
                        if( message && message.length > 0 ) {
                            message += '\n' + errVal.message;
                        } else {
                            message += errVal.message + '\n';
                        }
                    }
                } );
            }
        } );
    }

    return message;
};

export default exports = {
    populatePanelData,
    getComments,
    getTaskResultValue,
    performTaskDS,
    performTask,
    populateErrorMessageOnPerformAction
};
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member Awp0EPMTaskPerform
 */
app.factory( 'Awp0EPMConditionTaskPerform', () => exports );

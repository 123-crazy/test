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
 * @module js/Awp0SignoffPerform
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import commandsMapSvc from 'js/commandsMapService';
import viewModelObjectService from 'js/viewModelObjectService';
import Awp0PerformTask from 'js/Awp0PerformTask';
import awp0InboxUtils from 'js/Awp0InboxUtils';

var exports = {};

/**
 * Get the comments that needs to be saved while performing the task
 *
 * @param {object} data - the data Object
 * @return {object} propertyNameValues - Property name value pair
 *
 */
export let getComments = function( data ) {
    return Awp0PerformTask.getComments( data );
};

/**
 * Get the valid selection in case of PS task selected get the associated signfof object and return and if
 * signoff is not associated then return null from here
 *
 * @param {Object} selection Selected obejct from UI
 */
var _getValidSelection = function( selection ) {
    var validSelObject = selection;
    if( commandsMapSvc.isInstanceOf( 'EPMPerformSignoffTask', validSelObject.modelType ) ) {
        var modelObject = Awp0PerformTask.getSignoffObject( validSelObject );
        if( modelObject ) {
            validSelObject = modelObject;
            var isPanelContext = false;
            // Check if activeToolsAndInfoCommand is Awp0PerformTaskPanel
            // that means used has selected PS task and trying to open the panel so in that case we get the
            // correct signoff and open the panel for that signoff. So we need to update the selection
            // with correct signoff info so set this isPanelContext to true.
            if( appCtxSvc.ctx && appCtxSvc.ctx.activeToolsAndInfoCommand
                && appCtxSvc.ctx.activeToolsAndInfoCommand.commandId === 'Awp0PerformTaskPanel' ) {
                isPanelContext = true;
            }
            Awp0PerformTask.updateSelection( modelObject, isPanelContext );
        }
    }

    return validSelObject;
};

/**
 * Populate the properties on the panel and decision labels that needs to be displayed.
 *
 * @param {object} data - the data Object
 * @param {object} selection - the current selection object
 *
 */
export let populatePanelData = function( data, selection ) {
    var selectedObject = _getValidSelection( selection );
    if( !selectedObject ) {
        selectedObject = viewModelObjectService.createViewModelObject( appCtxSvc.ctx.task_to_perform.task[ 0 ] );
    }

    // This method is needed to set the correct style for panel when it will be visible in secondary area
    Awp0PerformTask.updateStyleForSecondaryPanel();

    var nameValue = selectedObject.props.object_name.dbValues[ 0 ];
    data.taskName.dbValue = nameValue;
    data.taskName.uiValue = nameValue;

    var commentsValue = selectedObject.props.comments.dbValues[ 0 ];
    data.comments.dbValue = commentsValue;
    data.comments.uiValue = commentsValue;

    Awp0PerformTask.populateDescription( data, selectedObject );

    awp0InboxUtils.populateJobDescription( data, selectedObject );

    data.decision.dbValue = selectedObject.props.decision.dbValues[ 0 ];
    data.decision.uiValue = selectedObject.props.decision.uiValues[ 0 ];
    data.decisionIntValue = parseInt( data.decision.dbValue );

    var taskObject = exports.getTaskObject();
    data.isSecureTask.dbValue = false;
    data.hasFailurePaths.dbValue = false;

    var isAcknowledge = isAcknowledgeTaskObject();
    data.isAcknowledgeTask = isAcknowledge;

    if( taskObject ) {

        data.psTaskObject = taskObject;

        var secureTaskValue = taskObject.props.secure_task.dbValues[ 0 ];
        if( secureTaskValue === "1" ) {
            data.isSecureTask.dbValue = true;
        } else {
            data.isSecureTask.dbValue = false;
        }

        var hasFailurePathsValue = taskObject.props.has_failure_paths.dbValues[ 0 ];
        if( hasFailurePathsValue === "1" ) {
            data.hasFailurePaths.dbValue = true;
        } else {
            data.hasFailurePaths.dbValue = false;
        }
    }

    populateDecisionLabels( data );

    data.isDSConfigured = false;

    var deferred = AwPromiseService.instance.defer();
    Awp0PerformTask.getDigitalSignatureService().then( function( awDigitalSignatureService ) {
        deferred.resolve( null );

        if( awDigitalSignatureService && taskObject ) {
            data.isDSConfigured = true;
            var isApplyDS = awDigitalSignatureService.isApplyDS( taskObject );
            var isAuthenticationRequired = awDigitalSignatureService.isAuthenticationRequired( taskObject );

            if( isApplyDS || isAuthenticationRequired ) {
                awDigitalSignatureService.addActiveXObjectElement();
            }
        }
    } );
    return deferred.promise;

};

/**
 * Get the perform signoff task object based on the object for action needs to be performed.
 *
 * @param {object} data - the data Object
 * @return {object} taskObject - Perform signoff object
 *
 */
export let getTaskObject = function() {
    var taskObject = null;
    if( commandsMapSvc
        .isInstanceOf( 'EPMPerformSignoffTask', appCtxSvc.ctx.task_to_perform.task[ 0 ].modelType ) ) {
        taskObject = appCtxSvc.ctx.selected;
    } else if( commandsMapSvc.isInstanceOf( 'Signoff', appCtxSvc.ctx.task_to_perform.task[ 0 ].modelType ) ) {

        var modelObj = cdm.getObject( appCtxSvc.ctx.task_to_perform.task[ 0 ].props.fnd0ParentTask.dbValues[ 0 ] );
        taskObject = viewModelObjectService.createViewModelObject( modelObj );
    }

    return taskObject;
};

/**
 * Check for signoff belongs to acknowledge task or not
 *
 * @return {Boolean} isAcknowledgeTask - True/False value
 *
 */
function isAcknowledgeTaskObject() {
    var isAcknowledgeTask = false;

    var taskObject = exports.getTaskObject();
    if( taskObject ) {

        var modelObj = cdm.getObject( taskObject.props.parent_task.dbValue );
        var parentTaskObj = viewModelObjectService.createViewModelObject( modelObj );

        if( parentTaskObj ) {
            if( commandsMapSvc.isInstanceOf( 'EPMAcknowledgeTask', parentTaskObj.modelType ) ) {
                isAcknowledgeTask = true;
            } else if( commandsMapSvc.isInstanceOf( 'EPMReviewTask', parentTaskObj.modelType ) ) {
                isAcknowledgeTask = false;
            }
        }
    }
    return isAcknowledgeTask;
}

/**
 * Get the signoff object based on the object for action needs to be performed. Currently this method return
 * signoff as null for perform signoff task selection. This needs to be implemented
 *
 * @return {object} signOffObject - Signoff object
 *
 */
export let getSignoffObject = function() {
    var signOffObject = null;
    if( commandsMapSvc.isInstanceOf( 'Signoff', appCtxSvc.ctx.task_to_perform.task[ 0 ].modelType ) ) {
        signOffObject = appCtxSvc.ctx.task_to_perform.task[ 0 ];
    } else if( commandsMapSvc.isInstanceOf( 'EPMPerformSignoffTask',
            appCtxSvc.ctx.task_to_perform.task[ 0 ].modelType ) ) {
        signOffObject = null;
    }
    return signOffObject;
};

/**
 * This method will update the Approve or Acknowledge Text.
 */
var updateApproveAcknowledgeAndRejectText = function( data, decisionLabels, acknowledgeText, approveText,
    rejectText ) {

    if( decisionLabels.length <= 0 ) {
        if( isAcknowledgeTaskObject() ) {
            data.approveText = acknowledgeText;
        } else {
            data.approveText = approveText;
        }
        data.rejectText = rejectText;
    } else if( decisionLabels.length === 1 ) {
        data.approveText = decisionLabels[ 0 ];
    } else if( decisionLabels.length === 2 ) {
        data.approveText = decisionLabels[ 0 ];
        data.rejectText = decisionLabels[ 1 ];
    }

};

/**
 * Populate the decision labels
 *
 * @param {object} data - the data Object
 */
function populateDecisionLabels( data ) {
    var approveText = data.i18n.approve;
    var rejectText = data.i18n.reject;
    var acknowledgeText = data.i18n.acknowledge;
    data.undoDecision = data.i18n.undoDecision;

    // Get the signoff object that have the decision label configured if any
    var signoffObject = exports.getSignoffObject();

    var decisionLabels = [];

    // Check for signoff object is not null and it has properties loaded that are needed
    if( signoffObject && signoffObject.props && signoffObject.props.fnd0DecisionSetLOV &&
        signoffObject.props.fnd0DecisionSetLOV.dbValues ) {
        var decisionSetLOVObj = cdm.getObject( signoffObject.props.fnd0DecisionSetLOV.dbValues[ 0 ] );
        if( decisionSetLOVObj ) {
            var lovValues = decisionSetLOVObj.props.lov_values.dbValues;
            var lovDescriptions = decisionSetLOVObj.props.lov_value_descriptions.uiValues;

            if( lovValues && lovDescriptions ) {

                var approveIdx = lovValues.indexOf( "89" );
                var rejectIdx = lovValues.indexOf( "78" );

                //Label for approve path
                decisionLabels.push( lovDescriptions[ approveIdx ] );

                //Label for reject path
                if( rejectIdx !== -1 ) {
                    decisionLabels.push( lovDescriptions[ rejectIdx ] );
                }
            }
        }
    }

    if( decisionLabels ) {
        updateApproveAcknowledgeAndRejectText( data, decisionLabels, acknowledgeText, approveText, rejectText );

    }

}

/**
 * Add that value to localization for confirm message to show correctly.
 *
 * @param {String} taskResult - Slected button from UI
 * @param {object} data - the data Object
 */
export let getSelectedPath = function( taskResult, data ) {
    data.i18n.selectedPath = taskResult;
};

/**
 * Populate the error message based on the SOA response output and filters the partial errors and shows the
 * correct errors only to the user.
 *
 * @param {object} response - the response Object of SOA
 * @return {String} message - Error message to be displayed to user
 */
export let populateErrorMessageOnPerformAction = function( response ) {
    return Awp0PerformTask.populateErrorMessageOnPerformAction( response );
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
 * Perform the task using perfromAction3 SOA
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

export default exports = {
    getComments,
    populatePanelData,
    getTaskObject,
    getSignoffObject,
    getSelectedPath,
    populateErrorMessageOnPerformAction,
    performTaskDS,
    performTask
};
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member Awp0SignoffPerform
 */
app.factory( 'Awp0SignoffPerform', () => exports );

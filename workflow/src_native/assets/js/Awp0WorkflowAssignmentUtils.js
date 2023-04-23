// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Awp0WorkflowAssignmentUtils
 */
import * as app from 'app';
import viewModelObjSvc from 'js/viewModelObjectService';
import uwPropertySvc from 'js/uwPropertyService';
import iconSvc from 'js/iconService';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import soa_kernel_clientDataModel from 'soa/kernel/clientDataModel';
import narrowModeService from 'js/aw.narrowMode.service';
import policySvc from 'soa/kernel/propertyPolicyService';
import soaService from 'soa/kernel/soaService';
import AwPromiseService from 'js/awPromiseService';

var exports = {};


/**
 * Create the key role objects that need to be dispalyed on UI based on input array.
 *
 * @param {String} internalName  Internal name info for key role object
 * @param {String} dispalyName  Dispaly name info for key role object
 *
 * @returns {Object} Key role object that need to be used further
 */
export let createKeyRoleObject = function( internalName, dispalyName ) {
    if( !internalName || !dispalyName ) {
        return null;
    }

    var vmObject = viewModelObjSvc.constructViewModelObjectFromModelObject( null, '' );
    vmObject.type = 'KeyRole';
    vmObject.uid = internalName;
    // If icon present then use that icon else use default icon
    vmObject.typeIconURL = iconSvc.getTypeIconURL( 'Person48' );
    var propInternalValue = internalName;
    var propDisplayName = dispalyName;
    vmObject.cellHeader1 = propDisplayName;

    var vmProp = uwPropertySvc.createViewModelProperty( 'keyRole', 'keyRole',
        'STRING', propInternalValue, [ propDisplayName ] );
    vmProp.dbValues = [ propInternalValue ];
    vmProp.uiValues = [ propDisplayName ];
    vmObject.props.keyRole = vmProp;
    return vmObject;
};

/**
 * This method will get the object for assignment data need to be shown.
 *
 * @param {Object} selection the selection object
 *
 * @returns {Object} Valid object to show the task assignment
 */
export let getValidObjectForTaskAssignment = function( selection ) {
    var validObject = null;
    if( !selection ) {
        return validObject;
    }
    // Check if input object is of type Signoff, EPM task or EPM task template then use it as valid object for task assignment.
    if( selection.modelType.typeHierarchyArray.indexOf( 'Signoff' ) > -1 || selection.modelType.typeHierarchyArray.indexOf( 'EPMTask' ) > -1
        || selection.modelType.typeHierarchyArray.indexOf( 'EPMTaskTemplate' ) > -1 ) {
        validObject = selection;
    }
    // If selected object is of type item revision or nay other workspace object then get hte task information
    // thorugh the latest workflow and use that to get the assignment info
    if( selection.props.fnd0MyWorkflowTasks && selection.props.fnd0MyWorkflowTasks.dbValues &&
        selection.props.fnd0MyWorkflowTasks.dbValues.length > 0 ) {
            validObject = soa_kernel_clientDataModel.getObject( selection.props.fnd0MyWorkflowTasks.dbValues[ 0 ] );
    } else if( selection.props.fnd0AllWorkflows && selection.props.fnd0AllWorkflows.dbValues &&
        selection.props.fnd0AllWorkflows.dbValues.length > 0 ) {
            validObject = soa_kernel_clientDataModel.getObject( selection.props.fnd0AllWorkflows.dbValues[ 0 ] );
    }

    var xrtContext = appCtxSvc.getCtx( 'ActiveWorkspace:xrtContext' );

    // If process information is present that means we are in workflow page and we need to show task assignmetn info
    // for specific process
    if( xrtContext && xrtContext.selectedProcess ) {
        validObject = soa_kernel_clientDataModel.getObject( xrtContext.selectedProcess );
    }
    var ctx = appCtxSvc.ctx;

    // Check if task assignment object information is already set on context then sue that object directly. This will
    // be mainly used right now for submit to workflow panel.
    if( ctx && ctx.taskAssignmentCtx && ctx.taskAssignmentCtx.isInsidePanel &&  ctx.taskAssignmentCtx.validTaskAssignmentObject ) {
        validObject = soa_kernel_clientDataModel.getObject( ctx.taskAssignmentCtx.validTaskAssignmentObject.uid );
    }

    return validObject;
};


/**
 * Check if input object is of type input type. If yes then
 * return true else return false.
 *
 * @param {Object} obj Object to be match
 * @param {String} type Object type to match
 *
 * @return {boolean} True/False
 */
var isOfType = function( obj, type ) {
    if( obj && obj.modelType && obj.modelType.typeHierarchyArray.indexOf( type ) > -1 ) {
        return true;
    }
    return false;
};

/**
 * Check if task state is completed or not and based on that return true or false.
 *
 * @param {Object} taskObject Task Object that need to be checked
 *
 * @returns {boolean} True/False based on task state
 */
export let isTaskCompleted = function( taskObject ) {
    var isCompleted = false;
    if( !isOfType( taskObject, 'EPMTask' ) ) {
        return isCompleted;
    }

    // Check the task state is completed based on task state is 8 then it's completed
    if( taskObject && taskObject.props && taskObject.props.state && taskObject.props.state.dbValues ) {
        var taskState = taskObject.props.state.dbValues[ 0 ];
        if( taskState === '8' ) {
            isCompleted =  true;
        }
    }
    return isCompleted;
};

/**
 * Check if task can be modified or not and based on that erturn true or false.
 *
 * @param {Object} taskObject Task obejct for assignment need to be done
 * @param {Object} taskAssignmentCtx Assignmetn context object
 *
 * @returns {boolean} True/False
 */
export let isTaskAssignmentNonModified = function( taskObject, taskAssignmentCtx  ) {
    var isNonModified = false;
    if( !isOfType( taskObject, 'EPMTask' ) ) {
        return isNonModified;
    }
    isNonModified = exports.isTaskCompleted( taskObject );
    if( isNonModified ) {
        return isNonModified;
    }
    if( taskAssignmentCtx && taskAssignmentCtx.isPrivilegedToAssign && taskAssignmentCtx.isPrivilegedToAssign === 'false' ) {
        isNonModified = true;
    }
    return isNonModified;
};

/**
 * Return the value that we are in narrow mode or not.
 *
 * @returns {boolean} True or false
 */
export let isNarrowMode = function() {
    var isNarrowMode = narrowModeService.isNarrowMode();
    // This check is mainly needed for hosted mode for submit to workflow. If we launch then
    // workflow panel from NX then it should consider it as narrow mode and shows the small panel
    // This is fox for two PR 9897922 and 9858309
    if( !isNarrowMode && appCtxSvc.ctx && appCtxSvc.ctx.workflow_process_candidates
        && appCtxSvc.ctx.workflow_process_candidates.IsEmbeddedComponent ) {
        isNarrowMode = appCtxSvc.ctx.workflow_process_candidates.IsEmbeddedComponent;
    }
    return isNarrowMode;
};

/**
 * Register the context information that need to be saved for opening user
 * picker panel. Right now this is being used for task assignemnt panel.
 *
 * @param {String} selectionMode Selection mode string
 * @param {Object} additionalSearchCriteria Additional search criteria for user picker panel
 * @param {Object} profileObject Profile object selcted from UI
 * @param {boolean} isHideAddButtonOnUserPanel True or false to indicate that add button need to be shown
 *        on user picker panel or not.
 */
export let registerUserPanelContext = function( selectionMode, additionalSearchCriteria, profileObject, isHideAddButtonOnUserPanel ) {
    var workflowCtx = appCtxSvc.getCtx( 'workflow' );
    if( !additionalSearchCriteria ) {
        additionalSearchCriteria = {};
    }
    if( workflowCtx ) {
        workflowCtx.additionalSearchCriteria = additionalSearchCriteria;
        workflowCtx.selectionModelMode = selectionMode;
        workflowCtx.profileObject = profileObject;
        workflowCtx.loadProjectData = true;
        workflowCtx.isHideAddButtonOnUserPanel = isHideAddButtonOnUserPanel;
    } else {
        var context = {
            selectionModelMode: selectionMode,
            additionalSearchCriteria: additionalSearchCriteria,
            profileObject: profileObject,
            isHideAddButtonOnUserPanel : isHideAddButtonOnUserPanel,
            loadProjectData : true
        };
        appCtxSvc.registerCtx( 'workflow', context );
    }
};

/**
 * Create the input stricture that will be pass to server to get the
 * group member from user obejct.
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Array} selection - The selection object array
 *
 * @return {Object} - userInput object that holds the correct values .
 */
var getInputData = function( data, selection ) {
    var userInput = {};
    var input = {};

    // Check if selection is not null and 0th index object is also not null
    // then only add it to the view model
    if( data && selection && selection.length > 0 ) {
        var userId = selection[ 0 ].props.user_id.dbValues[ 0 ];
        var groupName;
        var roleName;

        if( data.additionalSearchCriteria ) {
            if( data.additionalSearchCriteria.group && data.additionalSearchCriteria.role ) {
                groupName = data.additionalSearchCriteria.group;
                roleName = data.additionalSearchCriteria.role;
            } else if( !data.additionalSearchCriteria.group && data.additionalSearchCriteria.role ) {
                groupName = '*';
                roleName = data.additionalSearchCriteria.role;
            } else if( data.additionalSearchCriteria.group && !data.additionalSearchCriteria.role ) {
                groupName = data.additionalSearchCriteria.group;
                roleName = '*';
            } else {
                groupName = selection[ 0 ].props.default_group.uiValue;
            }
        } else {
            groupName = selection[ 0 ].props.default_group.uiValue;
        }

        // Check if object is selected then only create the input structure
        if( selection[ 0 ] ) {
            input = {
                userID: userId,
                userName: userId,
                groupName: groupName,
                roleName: roleName,
                includeInactive: false,
                includeSubGroups: true
            };
        }
    }
    userInput.input = input;
    return userInput;
};

/**
 * Get the valid selected obejct from input selected objects. If input selection
 * has user obejct then it will get group memebr from user otherwise directly return input.
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Array} selection - The selection object array
 *
 * @return {Object} - userInput object that holds the correct values .
 */
export let getValidObjectsToAdd = function( data, selection ) {
    var deferred = AwPromiseService.instance.defer();
    if( selection[ 0 ] && selection[ 0 ].type && selection[ 0 ].type === 'User' ) {
        var input = getInputData( data, selection );
        var policyId = policySvc.register( {
            types: [ {
                    name: 'User',
                    properties: [ {
                        name: 'user_id',
                        modifiers: [ {
                            name: 'withProperties',
                            Value: 'true'
                        } ]
                    } ]
                },
                {
                    name: 'GroupMember',
                    properties: [ {
                        name: 'default_role'
                    } ]
                }
            ]
        } );
        soaService.postUnchecked( 'Internal-Administration-2012-10-OrganizationManagement',
            'getOrganizationGroupMembers', input ).then(
            function( response ) {
                if( policyId ) {
                    policySvc.unregister( policyId );
                }
                var gmObject = null;
                if( response && response.groupElementMap && response.groupElementMap[ 1 ][ '0' ] ) {
                    //check for default_role property on returned groupmembers
                    var groupMembers = response.groupElementMap[ 1 ][ '0' ].members;
                    var foundDefaultRole = false;

                    for( var i = 0; i < groupMembers.length; i++ ) {
                        var propValue = groupMembers[ i ].members[ 0 ].props.default_role;
                        if( propValue.dbValues[ 0 ] === '1' ) {
                            gmObject = groupMembers[ i ].members[ 0 ];
                            foundDefaultRole = true;
                            break;
                        }
                    }
                    if( !foundDefaultRole ) {
                        gmObject = response.groupElementMap[ 1 ][ '0' ].members[ '0' ].members[ '0' ];
                    }
                }

                // If valid group member is not found then return empty array from here
                if( !gmObject ) {
                    return deferred.resolve( [] );
                }

                // Add cellHeaders to GM
                var gmVMObject = viewModelObjSvc.createViewModelObject( gmObject );
                gmVMObject.selected = true;
                gmVMObject.cellHeader1 = selection[ 0 ].cellHeader1;
                var groupMemberObjects = [];
                groupMemberObjects.push( gmVMObject );
                return deferred.resolve( groupMemberObjects );
            } );
    } else {
        var currentSelections = selection;
        if( selection && selection.length > 0  ) {
            currentSelections = [];
            _.forEach( selection, function( selObject ) {
                var vmObject = viewModelObjSvc.createViewModelObject( selObject.uid );
                if( vmObject ) {
                    if( selObject.projectObject ) {
                        vmObject.projectObject = selObject.projectObject;
                    }
                    currentSelections.push( vmObject );
                }
            } );
        }
        deferred.resolve( currentSelections );
    }
    return deferred.promise;
};

/**
 * Get the assignment type string based on input target object.
 *
 * @param {Object} targetObject Target obejct for assignemnt type need to fetch
 *
 * @returns {String} assignment type string
 */
export let getAssignmentTypeBasedOnTarget = function( targetObject ) {
    var assignmentType = 'assignee';

    // Check if input object is not EPMTask or EPMTaskTemplate then use the input object assignment type directly
    if( targetObject && !isOfType( targetObject, 'EPMTask' ) && !isOfType( targetObject, 'EPMTaskTemplate' )  && targetObject.assignmentType ) {
        return targetObject.assignmentType;
    }
    // Check if target is invalid or child object is not present then use assignee as assignment type. This is only for safety
    // and actually shoul dnot happen.
    if( !targetObject || !targetObject._childObj ) {
        return assignmentType;
    }
    var taskObject = targetObject._childObj;
    if( isOfType( taskObject, 'EPMReviewTask' ) || isOfType( taskObject, 'EPMReviewTaskTemplate' )
    || isOfType( taskObject, 'EPMRouteTask' ) || isOfType( taskObject, 'EPMRouteTaskTemplate' ) ) {
        assignmentType = 'reviewers';
    }

    if( isOfType( taskObject, 'EPMAcknowledgeTask' ) || isOfType( taskObject, 'EPMAcknowledgeTaskTemplate' ) ) {
        assignmentType = 'acknowledgers';
    }
    return assignmentType;
};

/**
 * Get the error message string from SOA response that will be displayed to user
 * @param {Object} response - The SOA response object
 *
 * @return {Object} Error message string
 */
export let getErrorMessage = function( response ) {
    var err = null;
    var message = ''; // Check if input response is not null and contains partial errors then only
    // create the error object

    if( response && ( response.ServiceData.partialErrors || response.ServiceData.PartialErrors ) ) {
        err = soaService.createError( response.ServiceData );
    } // Check if error object is not null and has partial errors then iterate for each error code
    // and filter out the errors which we don't want to display to user

    if( err && err.cause && err.cause.partialErrors ) {
        _.forEach( err.cause.partialErrors, function( partErr ) {
            if( partErr.errorValues ) {
                for( var idx = 0; idx < partErr.errorValues.length; idx++ ) {
                    var errVal = partErr.errorValues[ idx ];

                    if( errVal.code ) {
                        // Ignore the duplicate error and related error to that
                        if( errVal.code === 35010 ) {
                            break;
                        } else {
                            if( message && message.length > 0 ) {
                                message += '\n' + errVal.message;
                            } else {
                                message += errVal.message;
                            }
                        }
                    }
                }
            }
        } );
    }

    return message;
};

/**
 * Check if tc server version is TC 13.1 or more then only return true else return false
 * @param {Object} ctx Context object
 * @return {boolean} -  true/false value
 */
export let isTCReleaseAtLeast131 = function( ctx ) {
    // Check if undefined then use it from service
    if( !ctx ) {
        ctx = appCtxSvc.ctx;
    }
    if( ctx && ctx.tcSessionData && ( ctx.tcSessionData.tcMajorVersion === 13 && ctx.tcSessionData.tcMinorVersion > 0 || ctx.tcSessionData.tcMajorVersion > 13 ) ) {
        return true;
    }
    return false;
};

export default exports = {
    createKeyRoleObject,
    getValidObjectForTaskAssignment,
    isTaskCompleted,
    isNarrowMode,
    registerUserPanelContext,
    isTaskAssignmentNonModified,
    getValidObjectsToAdd,
    getAssignmentTypeBasedOnTarget,
    getErrorMessage,
    isTCReleaseAtLeast131
};

/**
 * This factory creates a service and returns exports
 * @member Awp0WorkflowAssignmentUtils
 * @memberof NgServices
 */
app.factory( 'Awp0WorkflowAssignmentUtils', () => exports );

/* eslint-disable max-lines */
// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global define */

/**
 * @module js/Awp0WorkflowAssignmentService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import awp0TasksUtils from 'js/Awp0TasksUtils';
import viewModelService from 'js/viewModelObjectService';
import clientDataModel from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import assignmentEditSvc from 'js/Awp0WorkflowAssignmentEditService';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import localeSvc from 'js/localeService';
import editHandlerService from 'js/editHandlerService';
import workflowAssinmentUtilSvc from 'js/Awp0WorkflowAssignmentUtils';
import notySvc from 'js/NotyModule';
import messagingSvc from 'js/messagingService';
import _ from 'lodash';

/**
 * Define public API
 */
var exports = {};
var _NULL_ID = 'AAAAAAAAAAAAAA';

var parentData = null;
var _multiUserTasks = [ 'EPMReviewTask', 'EPMRouteTask', 'EPMAcknowledgeTask', 'EPMReviewTaskTemplate',
'EPMRouteTaskTemplate', 'EPMAcknowledgeTaskTemplate' ];
var _RELOAD_TABLE = 'taskTreeTable.plTable.reload';

/**
 * gets local text bundle
 * @returns {Object} text bundle
 */
var _getLocalTextBundle = function() {
    var resource = app.getBaseUrlPath() + '/i18n/WorkflowCommandPanelsMessages.json';
    return localeSvc.getLoadedText( resource );
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
 * Create and returns empty task assignment data that hold all assignment information.
 *
 * @returns {Object} Assignemnt data object that hold all assignment information
 */
var _createEmptyTaskDataStructure = function() {
    return {
        internalName : null,
        selectionMode: 'single',
        isRequired : false,
        taskAssignment : null,
        assignmentOrigin: null,
        assignmentType : null,
        signoffProfile : null
    };
};

/**
 * Get the view model object based on input model object if not null id then only
 * create the VMO and return else it will return null.
 * @param {Object} object input object for VMO need to be created
 *
 * @returns {Object} View model object
 */
var _getVMOObject = function( object ) {
    if( _.isObject( object ) && object.uid !== _NULL_ID ) {
        return viewModelService.createViewModelObject( object.uid );
    }
    return null;
};

/**
 *  Populate the assignemnt client data obejct based on input values and return client object.
 *
 * @param {Object} assignmentData Task specific assignment data
 * @param {String} assignmentType Assignemnt type string
 *
 * @returns {Object} Assignemnt data object that hold all assignment information
 */
var _getAssignmentObject = function( assignmentData, assignmentType ) {
    var assignmentObject = null;
    if( assignmentData && assignmentData.member && assignmentData.member.uid ) {
        var object = clientDataModel.getObject( assignmentData.member.uid );
        if( object && object.props && object.props.object_string ) {
            var viewModelObj = viewModelService.createViewModelObject( object.uid );
            if( viewModelObj ) {
                assignmentObject = _createEmptyTaskDataStructure();
                assignmentObject.taskAssignment = viewModelObj;
                assignmentObject.assignmentOrigin = _getVMOObject( assignmentData.origin );
                // Check if origin is not null then in that case we need to persist the origin for any update to that assignment
                if( assignmentObject.assignmentOrigin ) {
                    assignmentObject.isPersistedOrigin = true;
                }
                assignmentObject.assignmentType = assignmentType;
                assignmentObject.signoffProfile = awp0TasksUtils.getSignoffProfileObject( assignmentData.signoffProfile );
                assignmentObject.isRequired = assignmentData.isRequired;

                // Check if additional data is not null and server has return the isRemoveAllowed value so we need
                // to store this value on individual assignment. This is mainly needed when PS task stated then we don't
                // need to show remove command and use additional parameter objectUID in replace case. Fix for defect # LCS-675611
                if( assignmentData.additionalData ) {
                    if( assignmentData.additionalData.isRemoveAllowed && assignmentData.additionalData.isRemoveAllowed[ 0 ] ) {
                        var isRemoveAllowed = assignmentData.additionalData.isRemoveAllowed[ 0 ];
                        assignmentObject.isRemoveAllowed = isRemoveAllowed;
                    }

                    // Store ObjectUID also on individual assignment object
                    if( assignmentData.additionalData.objectUID && assignmentData.additionalData.objectUID[ 0 ] ) {
                        var objectUID = assignmentData.additionalData.objectUID[ 0 ];
                        if( objectUID ) {
                            assignmentObject.objectUID = objectUID;
                        }
                    }
                }
            }
        }
    }
    return assignmentObject;
};

/**
 * Populate the task assignment and DP related assignment data and populate it correctly and
 * put it on task that this task support these DP's.
 *
 * @param {Object} assignementData Task specific assignment data
 * @param {Object} assignementDPData Task DP specific assignment data
 * @param {String} assignmentType Assignemnt type string
 * @param {Array} taskParticipantTypes Task supported DP types
 * @param {Object} participantInfoMap Particiapnt info map object
 *
 * @returns { Object} Object that will have assignees that need to be shown along with DP types that task supports.
 */
var _populateTaskData = function( assignementData, assignementDPData, assignmentType, taskParticipantTypes, participantInfoMap ) {
    var modelObjects = [];
    // Iterate for assignment data array and iterate for each info and create the client task assignment
    // data structure that hold all information
    if( assignementData && assignementData[ assignmentType ] && assignementData[ assignmentType ].length > 0  ) {
        _.forEach( assignementData[ assignmentType ], function( assignment ) {
            var assignmentObject = _getAssignmentObject( assignment, assignmentType );
            if( assignmentObject ) {
                modelObjects.push( assignmentObject );
            }
        } );
    }
    var supportedDPTypes = [];
    // Iterate for assignment DP data array and iterate for each info and create the client task assignment
    // data structure that hold all information and populate the supported types for each property and each task
    // as well as it need to be used while updating the DP from panel what properties will be updated like assignee,
    // reviewers, acknowledgers or notifyers
    if( assignementDPData && assignementDPData[ assignmentType ] && assignementDPData[ assignmentType ].length > 0 ) {
        _.forEach( assignementDPData[ assignmentType ], function( assignmentDP ) {
            // If assignment type is assignee and it comes from DP then set the model objects for that property
            // as it will comes from DP data
            if( assignmentType === 'assignee' ) {
                modelObjects = [];
            }

            supportedDPTypes.push( assignmentDP );

            var taskDPParticipant = _.find( taskParticipantTypes, {
                internalName: assignmentDP
            } );

            // If task participant info is not present then add it to task particiapnt type map
            if( !taskDPParticipant && participantInfoMap[ assignmentDP ] ) {
                var particiapntInfoObject = participantInfoMap[ assignmentDP ];
                taskDPParticipant = {
                    internalName : particiapntInfoObject.internalName,
                    displayName :  particiapntInfoObject.displayName,
                    selectionMode: particiapntInfoObject.selectionMode
                };
                taskParticipantTypes.push( taskDPParticipant );
            }
        } );
    }
    return {
        modelObjects: modelObjects,
        supportedDPTypes : supportedDPTypes
    };
};

/**
 * Get the unassigned VMO  object that will indicate that respective DP or unassigend profile , that is not assigend yet.
 *
 * @param {String} displayName Display value that need to be object string for unstaff VMO object
 *
 * @returns {Object} Unassiged DP object
 */
var _getUnStaffedVMOObject = function( displayName ) {
    var localeTextBundle = _getLocalTextBundle();
    var modelObject = viewModelService.constructViewModelObjectFromModelObject( null, '' );
    modelObject.uid = 'unstaffedUID';
    // Check if display name is not valid then show the empty display name
    if( !displayName ) {
        displayName = localeTextBundle.unAssigned;
    }
    modelObject.props = {
        object_string : {
            uiValues : [ displayName ]
        }
    };
    return modelObject;
};

/**
 * Get the DP primary object from input context
 *
 * @param {Object} dpObject DP object
 * @param {Object} ctx Context object
 *
 * @returns {Object} DP Primary object
 */
var _getDPPrimaryObject = function( dpObject, ctx ) {
    if( !dpObject ) {
        return null;
    }
    if( dpObject.primaryObject && dpObject.primaryObject.uid && dpObject.primaryObject.uid !== _NULL_ID ) {
        return dpObject.primaryObject;
    }
    if( ctx && ctx.taskAssignmentCtx && ctx.taskAssignmentCtx.additionalTargetData
        && ctx.taskAssignmentCtx.additionalTargetData.dp_target_object
        && ctx.taskAssignmentCtx.additionalTargetData.dp_target_object[ 0 ] ) {
        var object = clientDataModel.getObject( ctx.taskAssignmentCtx.additionalTargetData.dp_target_object[ 0 ] );
        if( object ) {
            return object;
        }
    }
    return null;
};

/**
 * Get the participant display name that need to be used as origin
 *
 * @param {Object} participantValue Particiapnt object
 *
 * @returns {String} Display name string
 */
var _getParticipantDisplayName = function( participantValue ) {
    var ctx = appCtxSvc.ctx;

    // Check if input participant object is null then return empty string from here
    if( !participantValue ) {
        return '';
    }

    var dpPrimaryObject = _getDPPrimaryObject( participantValue, ctx );

    // Below change is for PR LCS-234054. For Plant Problem Report the display name of participant should be Implementer and Responsible User
    if( ctx && dpPrimaryObject && dpPrimaryObject.modelType
        && dpPrimaryObject.modelType.typeHierarchyArray.indexOf( 'Pdm1ProblemItemRevision' ) > -1 ) {
        if( participantValue.internalName === 'Analyst' && ctx.parentData && ctx.parentData.i18n
        && ctx.parentData.i18n.implementer ) {
            return ctx.parentData.i18n.implementer;
        } else if( participantValue.internalName === 'ChangeSpecialist1' && ctx.parentData && ctx.parentData.i18n
        && ctx.parentData.i18n.responsibleUser ) {
            return ctx.parentData.i18n.responsibleUser;
        }
    }
    return participantValue.displayName;
};

/**
 * Populate DP data for task and update the participant info map that will store property
 * along with DP assignmetn values.
 *
 * @param {Array} taskDPDataArray Task data rray that will contain all DP values
 * @param {Object} partcipantInfoMap Particiapnt info map object where information will be stored.
 */
var _populateTasksAssignmentsDPData = function( taskDPDataArray, partcipantInfoMap ) {
    if( !taskDPDataArray ) {
        return;
    }
    // Iterate for all particiapnt type and then populate the data for that type
    for ( var participantKey in taskDPDataArray ) {
        var participantValue = taskDPDataArray[ participantKey ];
        var participantObjects = [];
        if( partcipantInfoMap[ participantKey ] ) {
            continue;
        }

        var participantAssignees = participantValue.assigneeList;
        var participant_eligibility = null;
        if( participantValue && participantValue.additionalData && participantValue.additionalData.participant_eligibility
            && participantValue.additionalData.participant_eligibility[ 0 ] ) {
            participant_eligibility = participantValue.additionalData.participant_eligibility[ 0 ];
        }
        // Check if specific participant type assignees is empty then we need to show
        // unassiged in the table
        if( !participantAssignees || participantAssignees.length === 0 ) {
            participantAssignees = [];
            var modelObject = _getUnStaffedVMOObject();
            participantAssignees.push( modelObject );
        }
        var selectionMode = 'single';
        if( participantValue.allowMultipleAssignee ) {
            selectionMode = 'multiple';
        }
        var dpDisplayName = _getParticipantDisplayName( participantValue );
        if( participantAssignees && participantAssignees.length > 0 ) {
            _.forEach( participantAssignees, function( assignee ) {
                var participantObject = _createEmptyTaskDataStructure();
                participantObject.internalName = participantValue.internalName;
                var viewObject = viewModelService.createViewModelObject( assignee.uid );
                if( !viewObject && assignee ) {
                    viewObject = assignee;
                }
                participantObject.taskAssignment = viewObject;
                participantObject.assignmentOrigin = dpDisplayName;
                participantObject.selectionMode = selectionMode;
                participantObjects.push( participantObject );
            } );
        }


        // Create the participant info object that will have all info for specific participant type
        var participantInfoObject = {
            internalName : participantValue.internalName,
            displayName : dpDisplayName,
            primaryObj : participantValue.primaryObject,
            allowMultipleAssignee : participantValue.allowMultipleAssignee,
            selectionMode : selectionMode,
            assignees : participantObjects,
            participant_eligibility : participant_eligibility
        };
        partcipantInfoMap[ participantKey ] = participantInfoObject;
    }
};

/**
 * Populate the task profile VMO object and return all profiles.
 * @param {Array} assignmentData Assignment data object that will store all task specific
 *  profiles present on task.
 *
 * @returns {Array} Task Profile VMO objects
 */
var _populateTaskProfiles = function( assignmentData ) {
    // Check if assignment data is not valid or don't have any profile then return from here
    if( !assignmentData || !assignmentData.profiles || assignmentData.profiles.length <= 0 ) {
        return null;
    }
    var profileObjects = [];
    _.forEach( assignmentData.profiles, function( profileInfo ) {
        var profileObject = awp0TasksUtils.getSignoffProfileObject( profileInfo.signoffProfile );
        if( profileObject ) {
            profileObjects.push( profileObject );
        }
    } );
    return profileObjects;
};

/**
 * Populate the task assignment data based on input values and return the task assignment data object
 * that will have all tasks that need to be shown and their assignment information.
 *
 * @param {Array} taskDataValues Task assignment data array
 * @param {Object} taskAssignmentDataMap Task assignemnt data obejct that will hold task info.
 *
 * @returns {Object} Task assignment data object
 */
export let populateTaskAssignmentData = function( taskDataValues, taskAssignmentDataMap ) {
    if( taskAssignmentDataMap === undefined || !taskAssignmentDataMap ) {
        taskAssignmentDataMap = {
            childTaskObjects : [],
            taskInfoMap : {},
            participantInfoMap : {},
            palInfoMap : {},
            allTasksObjects : []
        };
    }
    var allTasksObjects = taskAssignmentDataMap.allTasksObjects;
    var childTaskObjects = [];
    var taskInfoMap = taskAssignmentDataMap.taskInfoMap;
    var participantInfoMap = taskAssignmentDataMap.participantInfoMap;

    // Populate all DP's data into map
    _populateTasksAssignmentsDPData( taskDataValues.dpData, participantInfoMap );

    // Populate all tasks related assignment data for each property
    _.forEach( taskDataValues.outData, function( taskData ) {
        var taskParticipantTypes = [];

        // Populate all properties that need to be shown on table
        var assigneeData = _populateTaskData( taskData.assigmentData, taskData.additionalData, 'assignee',  taskParticipantTypes, participantInfoMap );
        var reviewersData = _populateTaskData( taskData.assigmentData, taskData.additionalData, 'reviewers',  taskParticipantTypes, participantInfoMap );
        var acknowledgersData = _populateTaskData( taskData.assigmentData, taskData.additionalData, 'acknowledgers',  taskParticipantTypes, participantInfoMap );
        var notifyeesData = _populateTaskData( taskData.assigmentData, taskData.additionalData, 'notifyees', taskParticipantTypes, participantInfoMap );

        // Populate task profiles info
        var taskProfiles = _populateTaskProfiles( taskData.assigmentData );
        var object = {
            props : {
                assignee :  assigneeData,
                reviewers :  reviewersData,
                acknowledgers :  acknowledgersData,
                notifyees :  notifyeesData
            },
            taskDeferredParticipantsTypes : taskParticipantTypes,
            taskProfiles : taskProfiles
        };

        var taskUid = taskData.task.uid;

        taskInfoMap[ taskUid ] = object;

        // Create VMO for task object that need to be shown on table
        var viewObject = viewModelService.createViewModelObject( taskUid );
        if( viewObject  ) {
            var viewModelObjectExist = _.find( allTasksObjects, {
                uid : viewObject.uid
            } );
            if( !viewModelObjectExist ) {
                childTaskObjects.push( viewObject );
                allTasksObjects.push( viewObject );
            }
        }
    } );
    taskAssignmentDataMap.childTaskObjects = childTaskObjects;
    return taskAssignmentDataMap;
};

/**
 * Update the DP map with updated particiapnts from panel.
 *
 * @param {Object} data Data view model object
 * @param {Object} panelContext Panel context that will contain all information when user make changes from panel
 * @param {Object} context Context object where particpant related changes will be stored
 */
var _updateTaskDeferredParticipants = function( data, panelContext, context ) {
    _.forEach( data.processAssignmentParticipantProviderList, function( dataProvider ) {
        var loadedVMOObjects = dataProvider.viewModelCollection.loadedVMObjects;
        var participantType = dataProvider.name;
        var existingParticipants = panelContext.deferredAssignments[ participantType ].assignees;
        var displayName = participantType;
        var selectionMode = panelContext.deferredAssignments[ participantType ].selectionMode;

        // Get the participant display name and use it for display in origin column
        if( panelContext.deferredAssignments[ participantType ] && panelContext.deferredAssignments[ participantType ].displayName ) {
            displayName = panelContext.deferredAssignments[ participantType ].displayName;
        }

        var newDeferredParticipants = [];
        if( loadedVMOObjects && loadedVMOObjects.length === 0 ) {
            var modelObject = _getUnStaffedVMOObject();
            loadedVMOObjects.push( modelObject );
        }
        _.forEach( loadedVMOObjects, function( vmoObject ) {
            var valueUpdated = true;
            var newParticipant = _createEmptyTaskDataStructure();
            newParticipant.internalName = participantType;
            newParticipant.taskAssignment = vmoObject;
            newParticipant.assignmentOrigin = displayName;
            newParticipant.selectionMode = selectionMode;
            newDeferredParticipants.push( newParticipant );

            var index1 = _.findIndex( existingParticipants, function( participant ) {
                return participant.taskAssignment.uid === vmoObject.uid;
            } );
            if( index1 > -1 ) {
                valueUpdated = false;
                // Check if valueUpdated value is present and true then change the value to true as save doesn't happen yet.
                if( existingParticipants[ index1 ].taskAssignment && existingParticipants[ index1 ].taskAssignment.valueUpdated ) {
                    valueUpdated = existingParticipants[ index1 ].taskAssignment.valueUpdated;
                }
            }
            newParticipant.taskAssignment.valueUpdated = valueUpdated;
        } );
        panelContext.deferredAssignments[ participantType ].assignees = newDeferredParticipants;
    } );
    context.taskAssignmentDataObject.participantInfoMap = panelContext.deferredAssignments;
};

/**
 * Update the assignemtn origin if coming from project or resource pool.
 *
 * @param {Object} assignmentObject Object that need be assigned
 * @param {Object} newAssignmentObject new task assignment client object
 */
var _updateTaskAssignmentOrigin = function( assignmentObject, newAssignmentObject ) {
    if( newAssignmentObject && assignmentObject && !newAssignmentObject.assignmentOrigin ) {
        if( assignmentObject.projectObject ) {
            newAssignmentObject.assignmentOrigin = assignmentObject.projectObject;
        } else if( isOfType( assignmentObject, 'ResourcePool' ) ) {
            newAssignmentObject.assignmentOrigin = _.cloneDeep( assignmentObject );
        }
    }
};

/**
 * check if a origin is PAL and it matches with user applied pAL on UI then return true else return false.
 * So if user did not apply PAL and origin is PAL then it need to be added normally on task info map and not on
 * pal info map object.
 *
 * @param {Object} assignmentOrigin Check if origin is not null and its PAL object
 * @param {Object} palInfoMap Map that contains all PAL related info.
 *
 * @returns {boolean} True/False
 */
var _isUserAppliedPAL = function( assignmentOrigin, palInfoMap ) {
    if( assignmentOrigin && isOfType( assignmentOrigin, 'EPMAssignmentList' ) && palInfoMap &&  palInfoMap.hasOwnProperty( assignmentOrigin.uid ) ) {
        return true;
    }
    return false;
};

/**
 * Populate all task assignment for specific input assignemnt type and return the final
 * array that will contain all assignments like old and new ones.
 *
 * @param {Array} modelObjects Present Model objects as current task assignemnt.
 * @param {Object} dataProvider Data provider that will have all assignments
 * @param {String} assignmentType Assignemnt type string value
 * @param {boolean} isReview True or false
 * @param {Object} palTaskAssignment Pal task assignment data object that will store all PAL assignment update info
 * @param {Object} palInfoMap PAL info map object
 *
 * @returns {Array} Task assignement object array
 */
var createTaskAssignmentObjects = function( modelObjects, dataProvider, assignmentType, isReview, palTaskAssignment, palInfoMap ) {
    var taskAssignemnts = [];
    var palAssignments = [];
    var assignmentObjects = dataProvider.viewModelCollection.loadedVMObjects;
    if( assignmentObjects && assignmentObjects.length > 0 ) {
        for( var idx = 0; idx < assignmentObjects.length; idx++ ) {
            // Check if assignment is of profile or key role coming from panel then no need to process and update the assignment maps
            if( isReview && isOfType( assignmentObjects[idx], 'EPMSignoffProfile' ) || assignmentObjects[idx].type === 'KeyRole'
                || assignmentObjects[idx].requiredDispValue ) {
                continue;
            }

            var valueUpdated = true;
            var assignmentObject = assignmentObjects[ idx ].assignmentObject;
            if( assignmentObject && assignmentObject.internalName ) {
                continue;
            }
            if( modelObjects && modelObjects.length > 0 ) {
                var index1 = _.findIndex( modelObjects, function( modelObject ) {
                    return modelObject.taskAssignment.uid === assignmentObjects[idx].uid;
                } );
                if( index1 > -1 && modelObjects[ index1 ] ) {
                    valueUpdated = false;
                    // Check if valueUpdated value is present and true then change the value to true as save doesn't happen yet.
                    if( modelObjects[ index1 ].taskAssignment && modelObjects[ index1 ].taskAssignment.valueUpdated ) {
                        valueUpdated = modelObjects[ index1 ].taskAssignment.valueUpdated;
                    }
                }
            }
            var newAssignment = _createEmptyTaskDataStructure();
            // Check if assignment object is not null then create a copy of that assignment so that
            // it will have correct assignment data
            if( assignmentObject ) {
                newAssignment = _.cloneDeep( assignmentObject );
            }
            newAssignment.taskAssignment = assignmentObjects[idx];
            newAssignment.taskAssignment.valueUpdated = valueUpdated;
            newAssignment.assignmentType = assignmentType;
            newAssignment.signoffProfile = !_.isUndefined( assignmentObjects[idx].signoffProfile ) ? assignmentObjects[idx].signoffProfile : null;

            if( assignmentObject ) {
                newAssignment.assignmentOrigin = assignmentObject.assignmentOrigin;
            }

            if( newAssignment.assignmentOrigin && _isUserAppliedPAL( newAssignment.assignmentOrigin, palInfoMap ) ) {
                // This is needed for when user apply some pal and then open the asignment panel and made some modification
                // and then for PAL assignment this need to be set so that we can use it for remove or replace cases
                newAssignment.isPALAssignment = true;
                palAssignments.push( newAssignment );
                continue;
            }
            // Update the new assignment origin if coming from project or resource pool
            _updateTaskAssignmentOrigin( assignmentObjects[ idx ], newAssignment );
            taskAssignemnts.push( newAssignment );
        }
    }

    // PAL info population
    _.forEach( palAssignments, function( palAssignment ) {
        var palId = palAssignment.assignmentOrigin.uid;
        var palInfoObject = palTaskAssignment[ palId ];
        if( !palInfoObject ) {
            palInfoObject = {};
            var object =  {};
            object[ assignmentType ] = [];
            palInfoObject[ assignmentType ] = [];
        }
        var assignmentObjects =  palInfoObject[ assignmentType ];
        if( !assignmentObjects ) {
            assignmentObjects = [];
            palInfoObject[ assignmentType ] = assignmentObjects;
        }
        assignmentObjects.push( palAssignment );
        palTaskAssignment[ palId ] = palInfoObject;
    } );

    return taskAssignemnts;
};

/**
 * Update the task related assignemnt information that will be like assignee, reviewers, acknowledgers or notifyers
 *
 * @param {Object} data Data view model object
 * @param {Object} panelContext Panel context that will contain all information when user make changes from panel
 * @param {Object} selectedTask Task Object whose information need to be updated
 * @param {Object} context Context object where particpant related changes will be stored
 */
var _updateTaskRelatedAssignments = function( data, panelContext, selectedTask, context ) {
    var palTaskAssignment = {};
    var palInfoMap = context.taskAssignmentDataObject.palInfoMap;
    var taskInfoObject = panelContext.taskInfoObject;
    taskInfoObject.props.assignee.modelObjects = createTaskAssignmentObjects( taskInfoObject.props.assignee.modelObjects, data.dataProviders.assignerDataProvider, 'assignee', false, palTaskAssignment, palInfoMap );
    if( taskInfoObject.props.assignee.supportedDPTypes && taskInfoObject.props.assignee.supportedDPTypes.length > 0 ) {
        taskInfoObject.props.assignee.modelObjects = [];
    }
    var reviewerAssignmentType = 'reviewers';
    var isAcknowledgeTaskSelected = false;
    // Check if task is of type acknowledge task or acknowledge task template then we need to update the properties
    // for acknowledgers but from panel values comes as reviewers or additional reviewers
    if( isOfType( selectedTask, 'EPMAcknowledgeTask' ) || isOfType( selectedTask, 'EPMAcknowledgeTaskTemplate' ) ) {
        reviewerAssignmentType = 'acknowledgers';
        isAcknowledgeTaskSelected = true;
    }
    var reviewers = createTaskAssignmentObjects( taskInfoObject.props[ reviewerAssignmentType ].modelObjects,
        data.dataProviders.reviewersDataProvider, reviewerAssignmentType, true, palTaskAssignment, palInfoMap );
    var additionalReviewers = createTaskAssignmentObjects( taskInfoObject.props[ reviewerAssignmentType ].modelObjects,
        data.dataProviders.adhocReviewersDataProvider, reviewerAssignmentType, true, palTaskAssignment, palInfoMap );
    Array.prototype.push.apply( reviewers, additionalReviewers );
    taskInfoObject.props.reviewers.modelObjects = reviewers;
    if( isAcknowledgeTaskSelected ) {
        taskInfoObject.props.reviewers.modelObjects = [];
        taskInfoObject.props.acknowledgers.modelObjects = reviewers;
    }

    // For route task update acknowledgers and notifyers proeprty coming from panel
    if( isOfType( selectedTask, 'EPMRouteTask' ) || isOfType( selectedTask, 'EPMRouteTaskTemplate' ) ) {
        taskInfoObject.props.acknowledgers.modelObjects = createTaskAssignmentObjects( taskInfoObject.props.acknowledgers.modelObjects, data.dataProviders.acknowledgersDataProvider, 'acknowledgers', false, palTaskAssignment, palInfoMap );
        taskInfoObject.props.notifyees.modelObjects = createTaskAssignmentObjects( taskInfoObject.props.notifyees.modelObjects, data.dataProviders.notifyeesDataProvider, 'notifyees', false, palTaskAssignment, palInfoMap );
    }
    var taskValue = context.taskAssignmentDataObject.taskInfoMap[ selectedTask.uid ];
    if( !taskValue || !taskValue.props ) {
        return;
    }
    taskValue.props.assignee =  taskInfoObject.props.assignee;
    taskValue.props.reviewers =  taskInfoObject.props.reviewers;
    taskValue.props.acknowledgers =  taskInfoObject.props.acknowledgers;
    taskValue.props.notifyees =  taskInfoObject.props.notifyees;

    // Check if pal is applied then only process further else return from here
    if(  !palInfoMap || _.isEmpty( palInfoMap ) ) {
        return;
    }
    for( var palId in palInfoMap ) {
        var palObject = palInfoMap[ palId ];
        // Check if task is present in PAL map then only update the pal map
        if( palObject && palObject.hasOwnProperty( selectedTask.uid ) ) {
            var palAssignmentProps = palObject[ selectedTask.uid ].props;
            var palTaskAssignmentObject = palTaskAssignment[ palId ];

            // Set the individual properties for each task and set the properties correctly so that PAL
            // map will have latest information
            for( var propName in palAssignmentProps ) {
                if( palTaskAssignmentObject && palTaskAssignmentObject[ propName ] ) {
                    palAssignmentProps[ propName ].modelObjects =  palTaskAssignmentObject[ propName ];
                } else {
                    palAssignmentProps[ propName ].modelObjects =  [];
                }
            }
        }
    }
};

/**
 * Update the edit context to store task being edited.
 *
 * @param {Object} context COntext object that store all edit assignemtn information
 * @param {String} taskUid Task uid string that has been edited
 */
var _updateEditContext = function( context, taskUid ) {
    if( !context ) {
        return;
    }
    context.isStartEditEnabled = true;
    context.isModified = true;
    if( context.updatedTaskObjects ) {
        var idx = _.findIndex( context.updatedTaskObjects, function( updatedTaskObject ) {
            return updatedTaskObject === taskUid;
        } );
        if( idx <= -1 ) {
            context.updatedTaskObjects.push( taskUid );
        }
    }
};

/**
 * Create the SOA input structure that will have root task and all applied PALs info and these
 * will be used when there are unloaded tasks in tree and there are some PAL assignment then those
 * assignment need to happen on server.
 *
 * @param {Object} taskAssignmentObject Task assignment obejct that have all tasks and their info
 * @param {Array} inData inData array that will have SOA info
 */
var _createAppliedPALInputData = function( taskAssignmentObject, inData ) {
    // Check if pal is applied then only process further else return from here
    if( !taskAssignmentObject || !taskAssignmentObject.palInfoMap || _.isEmpty( taskAssignmentObject.palInfoMap )
    || !taskAssignmentObject.allTasksObjects || !taskAssignmentObject.allTasksObjects[ 0 ] ) {
        return;
    }

    // Get the first task and that will be used to get the root task and it will
    // be pass to server
    var taskObject = taskAssignmentObject.allTasksObjects[ 0 ];
    var rootTaskObject = null;
    if( taskObject && taskObject.props && taskObject.props.root_task.dbValues
        && taskObject.props.root_task.dbValues[ 0 ] ) {
        rootTaskObject = clientDataModel.getObject( taskObject.props.root_task.dbValues[ 0 ] );
    }
    var palIdArray = [];
    // Add all applied PALs from PAL info map
    for( var palId in taskAssignmentObject.palInfoMap ) {
        palIdArray.push( palId );
    }
    // Add all info to SOA input strucutre and return that structure
    if( rootTaskObject && palIdArray && palIdArray.length > 0 ) {
        var object = {
            taskData : {
                task: rootTaskObject
            },
            clientId : rootTaskObject.uid,
            additionalData : {
                PALs : palIdArray
            }
        };
        inData.push( object );
    }
};

/**
 * Save the task assignments either task specific assignment or task assinment using DP's.
 *
 * @param {Object} ctx Context object
 *
 * @returns {Object} AWPromise object
 */
var saveTaskAssignments = function( ctx ) {
    // Check if context info is invalid then no need to process further and return from here
    if( !ctx.taskAssignmentCtx || !ctx.taskAssignmentCtx.taskAssignmentDataObject ) {
        return;
    }
    var deferred = AwPromiseService.instance.defer();
    var taskAssignmentObject = ctx.taskAssignmentCtx.taskAssignmentDataObject;

    var inData = [];
    var updatedTaskUids = ctx.taskAssignmentCtx.updatedTaskObjects;
    var updatedTaskObjects = [];
    _.forEach( updatedTaskUids, function( taskUid ) {
        var taskObject = clientDataModel.getObject( taskUid );
        if( taskObject ) {
            updatedTaskObjects.push( taskObject );
        }
    } );
    taskAssignmentObject = exports.populateAssignmentTableRowData( taskAssignmentObject, updatedTaskObjects );
    if( !taskAssignmentObject ) {
        return deferred.resolve();
    }
    var taskInfoMap = taskAssignmentObject.taskInfoMap;
    var participantInfoMap = taskAssignmentObject.participantInfoMap;
    var updatedDPTypes = [];
    _updateTaskSOAInputStructure( updatedTaskUids, taskInfoMap, inData, updatedDPTypes );
    _updateDPSOAInputStructure( updatedDPTypes, participantInfoMap, inData );
    _createAppliedPALInputData( taskAssignmentObject, inData );
    var soaInput = {
        inData : inData
    };
    // Check if SOA input is not valid then don't call SOA and return empty result from here
    if( !soaInput || !soaInput.inData || soaInput.inData.length <= 0 ) {
        return deferred.resolve();
    }
    soaSvc.postUnchecked( 'Internal-Workflowaw-2020-12-Workflow', 'updateWorkflowTaskAssignments', soaInput ).then(
        function( response ) {
        //Parse the SOA data to content the correct user or resource pool data
        var message = workflowAssinmentUtilSvc.getErrorMessage( response );

        if( message && message.length > 0 ) {
            notySvc.showError( message );
        }
        deferred.resolve();
    },
    function( error ) {
        deferred.reject( error );
    } );
    return deferred.promise;
};

/**
 * Reset the values from context.
 */
var _resetContextValues = function( ctx ) {
    if( !ctx.taskAssignmentCtx ) {
        return;
    }
    ctx.taskAssignmentCtx.parentChildMap = {};
    ctx.taskAssignmentCtx.isModified = false;
    ctx.taskAssignmentCtx.enableModifyButton = false;
    ctx.taskAssignmentCtx.isStartEditEnabled = false;
};

/**
 * Set the edit context
 * @param {Object} ctx Context object
 *
 */
var _setEditContext = function( ctx ) {
    // Check if table is in panel then no need to set the edit context and return from here
    if( ctx.taskAssignmentCtx && ctx.taskAssignmentCtx.isInsidePanel ) {
        return;
    }

    var _resetEditContext = function() {
        _resetContextValues( ctx );
    };

    var saveEditFunc = function() {
        // function that returns a promise.
        var deferred = AwPromiseService.instance.defer();
        saveTaskAssignments( ctx );
        _resetEditContext();
        deferred.resolve( {} );
        return deferred.promise;
    };

    var cancelEditFunc = function() {
        // function that returns a promise.
        var deferred = AwPromiseService.instance.defer();
        _resetEditContext();
        deferred.resolve( {} );
        return deferred.promise;
    };

    //create Edit Handler
    assignmentEditSvc.createEditHandlerContext( ctx.taskAssignmentCtx.treeTableData, null, saveEditFunc, cancelEditFunc, 'TASK_ROW_EDIT', ctx.taskAssignmentCtx.isModified );
};

/**
 * Update the task related assignemnt information that will be like assignee, reviewers, acknowledgers or notifyers
 * and along with deferred particiapnt information.
 *
 * @param {Object} data Data view model object
 * @param {Object} panelContext Panel context that will contain all information when user make changes from panel
 * @param {Object} selectedTask Task Object whose information need to be updated
 * @param {Object} context Context object where particpant related changes will be stored
 */
export let updateTaskAssignments = function( data, panelContext, selectedTask, context ) {
    _updateEditContext( context, selectedTask.uid );
    _setEditContext( appCtxSvc.ctx );
    _updateTaskRelatedAssignments( data, panelContext, selectedTask, context );
    _updateTaskDeferredParticipants( data, panelContext, context );
};


/**
 * Create the DP SOA input structure for DP's need to be updated.
 *
 * @param {Array} updatedDPTypes DP types that need to be updated
 * @param {Object} participantInfoMap participant map object that will hold all participant information
 * @param {Array} inData SOA input data array
 */
var _updateDPSOAInputStructure = function( updatedDPTypes, participantInfoMap, inData ) {
    if( !updatedDPTypes || updatedDPTypes.length <= 0 || !participantInfoMap || !inData ) {
        return;
    }
    // Update for each DP, get the info from participant map and create the input structure
    // that will be used to create the DP's on target
    _.forEach( updatedDPTypes, function( dpType ) {
        var assigneeObjects = [];
        var participantInfoObject = participantInfoMap[ dpType ];
        var participantObjects = participantInfoObject.assignees;
        var primaryObj = participantInfoObject.primaryObj;
        _.forEach( participantObjects, function( modelObject ) {
            if( modelObject.taskAssignment && modelObject.taskAssignment.type ) {
                assigneeObjects.push( modelObject.taskAssignment );
            }
        } );
        var targetObject = null;

        if( primaryObj ) {
            targetObject = {
                uid: primaryObj.uid,
                type: primaryObj.type
            };
        }
        var dpObject = {
            primaryObject: targetObject,
            internalName : dpType,
            assigneeList : assigneeObjects
        };
        var object = {
            dpData : dpObject,
            clientId: dpType
        };
        inData.push( object );
    } );
};

/**
 * Create the task specific SOA input structure
 * @param {Array} updatedTaskUids Task uids that are updated
 * @param {Object} taskInfoMap Task info amp obejct that hold task information
 * @param {Array} inData SOA input data array
 * @param {Array} updatedDPTypes DP types array that need to be populated that these tasks are using DP's.
 */
var _updateTaskSOAInputStructure = function( updatedTaskUids, taskInfoMap, inData, updatedDPTypes ) {
    _.forEach( updatedTaskUids, function( taskUid ) {
        var taskInfoObject = taskInfoMap[ taskUid ];
        var assignmentData = {};

        if( taskInfoObject ) {
            for( var propName in taskInfoObject.props ) {
                var modelObjects = taskInfoObject.props[ propName ].modelObjects;
                var propModelObjects = [];
                _.forEach( modelObjects, function( modelObject ) {
                    if( modelObject.internalName ) {
                        var index1 = _.findIndex( updatedDPTypes, function( dpType ) {
                            return dpType === modelObject.internalName;
                        } );
                        if( index1 <= -1 ) {
                            updatedDPTypes.push( modelObject.internalName );
                        }
                    } else {
                        if( modelObject.taskAssignment && modelObject.taskAssignment.uid !== 'unstaffedUID' ) {
                            var object = {
                                member : modelObject.taskAssignment,
                                signoffProfile : modelObject.signoffProfile,
                                isRequired : modelObject.isRequired,
                                origin : modelObject.assignmentOrigin,
                                additionalData : {}
                            };
                            // Check if objectUID is prenset on model object then we need to pass it to server
                            // as well so server can figure out that it's replace signoff case or new signoff case
                            if( modelObject.objectUID && !_.isEmpty(  modelObject.objectUID ) ) {
                                object.additionalData.objectUID = [ modelObject.objectUID ];
                            }

                            propModelObjects.push( object );
                        }
                    }
                } );
                if( propModelObjects && propModelObjects.length > 0 ) {
                    assignmentData[ propName ] = propModelObjects;
                }
            }
            var taskObject = clientDataModel.getObject( taskUid );
            if( taskObject ) {
                var object = {
                    taskData : {
                        task: taskObject,
                        assigmentData : assignmentData
                    },
                    clientId : taskUid
                };
                inData.push( object );
            }
        }
    } );
};


/**
 * Remove the object from input array and if input add object is not null then add it as well.
 *
 * @param {Array} presentObjects Present objects where we need to add or remove
 * @param {Object} toRemove Object that need to be removed
 * @param {Object} toAdd Object that need to be added
 */
var _removeObject = function( presentObjects, toRemove, toAdd ) {
    var index = _.findIndex( presentObjects, function( object ) {
        return object.taskAssignment.uid === toRemove.taskAssignment.uid;
    } );
    if( index > -1 ) {
        if( toAdd && !_.isArray( toAdd ) ) {
            presentObjects.splice( index, 1, toAdd );
        } else {
            presentObjects.splice( index, 1 );
        }
        // Check if object that need to be added as array then we need to add the whole array to present
        // object. This change has been done as part of defect # LCS-464547
        if( toAdd && _.isArray( toAdd ) ) {
            Array.prototype.push.apply( presentObjects, toAdd );
        }
    } else if( toAdd && !_.isArray( toAdd ) ) {
        presentObjects.push( toAdd );
    }
};

/**
 * Remove the selected assignment information and update the info in cache.
 *
 * @param {Object} selected Selected Assignment object that need to be removed
 * @param {Object} ctx App context object
 * @param {Object} context Assignment context
 */
export let removeTaskAssignment = function( selected, ctx, context ) {
    if( !selected || !selected.type || !selected.uid || !context || !context.taskAssignmentDataObject ) {
        return;
    }
    _updateEditContext( context, selected.taskUid );
    var taskAssignmentObject = context.taskAssignmentDataObject.taskInfoMap[ selected.taskUid ];
    var removeAssignmentObject = selected.assignmentObject;
    var isPalAssignment = removeAssignmentObject.isPALAssignment;
    var isDPAssignment = removeAssignmentObject.internalName !== null;

    var profileObject = removeAssignmentObject.signoffProfile;

    if( profileObject ) {
        // Check if profile object is not VMO then create the VMO object first and then
        // increment the count.
        if( !viewModelService.isViewModelObject( profileObject ) ) {
            profileObject = viewModelService.createViewModelObject( profileObject );
            profileObject.requiredReviewers = profileObject.props.number_of_signoffs.dbValues[ 0 ] + ' ' + parentData.i18n.required;
        }
        var splitValues = profileObject.requiredReviewers.split( ' ' );
        if( splitValues && splitValues.length === 2 && splitValues[ 0 ] && splitValues[ 1 ] ) {
            var reviewersNeeded = parseInt( splitValues[ 0 ] );
            profileObject.requiredReviewers = reviewersNeeded + 1 + ' ' + splitValues[ 1 ];
        }
    }

    if( isPalAssignment && removeAssignmentObject.assignmentOrigin.hasOwnProperty( 'uid' ) ) {
        var palUid = removeAssignmentObject.assignmentOrigin.uid;
        taskAssignmentObject = context.taskAssignmentDataObject.palInfoMap[ palUid ][ selected.taskUid];
    }
    var presentObjects = taskAssignmentObject.props[removeAssignmentObject.assignmentType].modelObjects;
    _removeObject( presentObjects, removeAssignmentObject );
    taskAssignmentObject.props[removeAssignmentObject.assignmentType].modelObjects = presentObjects;

    var participantInfoMap =  context.taskAssignmentDataObject.participantInfoMap;
    if( isDPAssignment && participantInfoMap[ removeAssignmentObject.internalName ] ) {
        var participantObjects = participantInfoMap[ removeAssignmentObject.internalName ].assignees;
        _removeObject( participantObjects, removeAssignmentObject );
        // If all DP participant is removed then add the unassiged DP.
        if( participantObjects && participantObjects.length === 0 ) {
            var modelObject = _getUnStaffedVMOObject();

            var existingParticipant = _createEmptyTaskDataStructure();

            existingParticipant.internalName = removeAssignmentObject.internalName;
            existingParticipant.taskAssignment = modelObject;
            existingParticipant.assignmentOrigin = removeAssignmentObject.assignmentOrigin;
            existingParticipant.assignmentType = removeAssignmentObject.assignmentType;

            participantObjects.push( existingParticipant );
        }
    }
    _setEditContext( ctx );
    eventBus.publish( _RELOAD_TABLE );
};

/**
 * Get all group member elements present in current data provider and update the
 * input list only.
 *
 * @param {Array} reviewerList Data provider object whose objects need to be checked
 * @param {Array} addedObjects Objects that need to be added
 * @returns {Array} addedObjects array that contains all group memebrs objects present.
 */
var _presentGroupMemberReviewers = function( reviewerList, addedObjects ) {
    if( !reviewerList || reviewerList.length <= 0 ) {
        return addedObjects;
    }

    _.forEach( reviewerList, function( modelObject ) {
        if( modelObject.taskAssignment && isOfType( modelObject.taskAssignment, 'GroupMember' ) && !modelObject.internalname ) {
            addedObjects.push( modelObject );
        }
    } );
    return addedObjects;
};

/**
 * Check if user is trying to add duplicate reviewer or not and based on that return true or false
 *
 * @param {Object} taskAssignmentObject Assignmetn obejct that will contain all properties
 * @param {Object} selectedObject Object that is being repalced
 * @param {String} assignmentType Assignemtn type that need to be checked
 * @param {Object} data Data vie wmodle object
 *
 * @returns {Array} Valid object that need to be added
 */
var _getValidObjectToAdd = function( taskAssignmentObject, selectedObjects, assignmentType, data ) {
    // Check if assignment type is assignee or assignment object is not valid then no need to process further
    // and return the input selected objects as valid objects.
    if( !taskAssignmentObject || !taskAssignmentObject.props || assignmentType === 'assignee' ) {
        return selectedObjects;
    }
    var addedObjects = [];
    // Populate the reviewers, acknowledgers and notifyees were user is trying to add or replace users
    var propNames = [ 'reviewers', 'acknowledgers', 'notifyees' ];
    _.forEach( propNames, function( propName ) {
        if( taskAssignmentObject.props[ propName ] ) {
            _presentGroupMemberReviewers( taskAssignmentObject.props[ propName ].modelObjects, addedObjects );
        }
    } );
    var objectsAlreadyAdded = [];
    var validObjects = [];
    // Get all objects that are new obejct to add and already object list and
    // that list will be used to show the error and other objects will be used for adding.
    _.forEach( selectedObjects, function( selectedObject ) {
        var objectIdx = _.findIndex( addedObjects, function( object ) {
            return object.taskAssignment.uid === selectedObject.uid;
        } );
        if( objectIdx > -1 ) {
            objectsAlreadyAdded.push( selectedObject );
        } else {
            validObjects.push( selectedObject );
        }
    } );
    if( objectsAlreadyAdded && objectsAlreadyAdded.length > 0 && data ) {
        // Set the selected objects on data object and it will be used for duplicate validation
        var dataObject = _.cloneDeep( data );
        dataObject.selectedObjects = selectedObjects;
        var message = awp0TasksUtils.getDuplicateErrorMessage( objectsAlreadyAdded, dataObject );
        messagingSvc.showError( message );
    }
    return validObjects;
};

/**
 * Replace the selected assignment information and update the info in cache.
 *
 * @param {Object} data Data view model object
 * @param {Object} selectedAssignment Selected Assignment object that need to be removed
 * @param {Object} ctx App context object
 * @param {Object} context Assignment context
 */
export let replaceTaskAssignment = function( data, selectedAssignment, ctx, context ) {
    context.isStartEditEnabled = true;
    context.isModified = true;
    _updateEditContext( context, selectedAssignment.taskUid );
    var participantInfoMap = context.taskAssignmentDataObject.participantInfoMap;
    var selectedObject = data.selectedObjects[0];

    var replaceAssignmentObject = selectedAssignment.assignmentObject;
    var isPalAssignment = replaceAssignmentObject.isPALAssignment;
    var isDPAssignment = replaceAssignmentObject.internalName !== null;
    var taskAssignmentObject = context.taskAssignmentDataObject.taskInfoMap[ selectedAssignment.taskUid ];

    var newAssignment = _.cloneDeep( replaceAssignmentObject );
    newAssignment.taskAssignment = selectedObject;
    newAssignment.taskAssignment.valueUpdated = true;

    // Check is user is trying to remove the assignment that came from PAL then get the
    // info from pal info map and new assignment will go as normal assignment and it will not reference
    // to PAL.
    if( isPalAssignment && replaceAssignmentObject.assignmentOrigin.hasOwnProperty( 'uid' ) ) {
        var palUid = replaceAssignmentObject.assignmentOrigin.uid;
        taskAssignmentObject = context.taskAssignmentDataObject.palInfoMap[ palUid ][ selectedAssignment.taskUid ];
        newAssignment.isPALAssignment = false;
    }

    // Check if user is replaing DP particiapnt then DP map need to be updated else task info map
    // need to be updated with repalce assignemnt information.
    if( isDPAssignment && participantInfoMap[ replaceAssignmentObject.internalName ] ) {
        var participantObjects = participantInfoMap[ replaceAssignmentObject.internalName ].assignees;
       var selectionMode = participantInfoMap[ replaceAssignmentObject.internalName ].selectionMode;
       if( selectionMode === 'multiple' ) {
            // Check if new assignment is already added as assignment for this DP then no need to
            // add twice and show the error to user
            var isAlreadyExistIdx = _.findIndex( participantObjects, function( participant ) {
                return participant.taskAssignment.uid === selectedObject.uid;
            } );
            // Check if user assignemnt that we are trying to replace is already exist then show the error
            // and return from here
            if( isAlreadyExistIdx > -1 ) {
                var message = awp0TasksUtils.getDuplicateErrorMessage( [ selectedObject ], data );
                messagingSvc.showError( message );
                return;
            }
        }
        _removeObject( participantObjects, replaceAssignmentObject, newAssignment );

        var index1 = _.findIndex( participantObjects, function( participant ) {
            return participant.taskAssignment.uid === replaceAssignmentObject.taskAssignment.uid;
        } );
        if( index1 > -1 ) {
            participantObjects[index1].taskAssignment = selectedObject;
            participantObjects[index1].taskAssignment.valueUpdated = true;
        }
    } else {
        var assignmentType = replaceAssignmentObject.assignmentType;
        var presentObjects = taskAssignmentObject.props[ assignmentType ].modelObjects;
        if( isPalAssignment ) {
            taskAssignmentObject = context.taskAssignmentDataObject.taskInfoMap[ selectedAssignment.taskUid ];
            presentObjects = taskAssignmentObject.props[ assignmentType ].modelObjects;
        }
        // Check if isPersistedOrigin is undefined or false then we need to reset the origin
        if( newAssignment.assignmentOrigin && !newAssignment.isPersistedOrigin ) {
            newAssignment.assignmentOrigin = null;
        }

        // Check for duplicate reviwer is being repalced if any
        var validObjectToAdd = _getValidObjectToAdd( taskAssignmentObject, [ selectedObject ], assignmentType, data );

        if( validObjectToAdd && validObjectToAdd.length > 0 && validObjectToAdd[ 0 ] ) {
            // Update the new assignment origin if coming from project or resource pool
            _updateTaskAssignmentOrigin( validObjectToAdd[ 0 ], newAssignment );
            _removeObject( presentObjects, replaceAssignmentObject, newAssignment );
            taskAssignmentObject.props[replaceAssignmentObject.assignmentType].modelObjects = presentObjects;
        }
    }

    _setEditContext( ctx );
    eventBus.publish( _RELOAD_TABLE );
};

/**
 * Populate the task PAL related assignment data and return the model objects that hold that information.
 *
 * @param {Object} assignementData Assignment data object for spefiifc task
 * @param {String} assignmentType Assignemnt type string value
 * @param {Object} palObject Selected PAL object from UI
 *
 * @returns {Array} Model objects that holds the task PAL assignment infomation for spefific assignment type
 */
var _populateTaskPALData = function( assignementData, assignmentType, palObject ) {
    var modelObjects = [];
    if( assignementData && assignementData[ assignmentType ] && assignementData[ assignmentType ].length > 0  ) {
        _.forEach( assignementData[ assignmentType ], function( assignment ) {
            var assignmentObject = _getAssignmentObject( assignment, assignmentType );
            if( assignmentObject && assignmentObject.taskAssignment ) {
                assignmentObject.isPALAssignment = true;
                assignmentObject.taskAssignment.valueUpdated = true;
                assignmentObject.assignmentOrigin = palObject;
                modelObjects.push( assignmentObject );
            }
        } );
    }
    return {
        modelObjects: modelObjects
    };
};

/**
 * Based on seelcted PAL's from UI , check if PAL infomation is already loaded or need to load
 * and based on that fire the correct event to load the information.
 *
 * @param {Object} ctx App context object
 * @param {Object} data Data view model object
 * @param {Array} selectedPals Selected pals from UI
 * @param {Object} palInfoMap Pal info map that contain PAL along with its assignment information
 * @param {Object} context Context object to show value that PAL is applied or not
 */
export let getPALAssignmentData = function( ctx, data, selectedPals, palInfoMap, context ) {
    // Check if selected PALs are undefiend then no need to process further
    if ( !_.isArray( selectedPals ) || !selectedPals || !palInfoMap || !data.palList.valueUpdated ) {
        return;
    }
    // Check if selected pals are none then clear the palInfo map and return from here to reload
    // the tree
    if( selectedPals && selectedPals.length <= 0 ) {
        palInfoMap = {};
        context.taskAssignmentDataObject.palInfoMap = {};
        eventBus.publish( _RELOAD_TABLE );
        return;
    }
    var newSelectedPals = [];
    var palUidKeys = Object.keys( palInfoMap );
    var selPalUids = [];
    // If selected pal is not previously selected and it's information need to be loaded then
    // add that PAL to array and it's information will need to get from server
    _.forEach( selectedPals, function( selPal ) {
        if( selPal && !palInfoMap[ selPal.uid] ) {
            newSelectedPals.push( selPal );
        }
        selPalUids.push( selPal.uid );
    } );

    // Check if some PAL is unseelcted then for those PAL information need to be removed
    for( var idx = 0; idx < palUidKeys.length; idx++ ) {
        var palUidObject = palUidKeys[idx];
        var isRemove = selPalUids.indexOf( palUidObject ) <= -1;
        if( isRemove ) {
            delete palInfoMap[ palUidObject ];
        }
    }

    if( !newSelectedPals || newSelectedPals.length <= 0 ) {
        eventBus.publish( _RELOAD_TABLE );
        return;
    }

    data.newSelectedPals = newSelectedPals;
    eventBus.publish( 'workflow.loadPalAssignmentData' );
};

/**
 * Create the input data for PAL obejcts for information need to be loaded.
 *
 * @param {Object} selObject Selected object from UI
 * @param {Array} selectedPals PAL objects for information need to be loaded
 *
 * @returns {Array} Input data array
 */
export let getPALAssignmentInputData = function( selObject, selectedPals ) {
    var inData = [];
    if( selectedPals && selectedPals.length > 0 ) {
        _.forEach( selectedPals, function( selPal ) {
            var object = {
                taskOrTemplate : selObject,
                pal: selPal,
                operationMode : 1,
                clientId : selPal.uid
            };
            inData.push( object );
        } );
    }
    return inData;
};

/**
 * Populate the PAL assignment information and update the PAL data map with all assignment information.
 *
 * @param {Object} ctx App context object
 * @param {Array} palDataArray PAL data array that will have PAL related assignmetn info
 * @param {Object} palInfoMap PAL assignment info map
 * @param {Object} context Context obejct to show PAL info is applied
 */
export let populatePALAssignmentInfo = function( ctx, palDataArray, palInfoMap, context ) {
    // Check if input values are not valid or pal data map is null then no need to process further
    // and return from here
    if( !palDataArray || palDataArray.length <= 0 || !palInfoMap ) {
        return;
    }
    _.forEach( palDataArray, function( taskPalDataObject ) {
        var selPalId = taskPalDataObject.clientId;
        var palDataMap = {};
        var palObject = clientDataModel.getObject( selPalId );

        _.forEach( taskPalDataObject.outData, function( taskPalData ) {
            var taskUid = taskPalData.task.uid;

            var assigneeData = _populateTaskPALData( taskPalData.assigmentData, 'assignee', palObject );
            var reviewersData = _populateTaskPALData( taskPalData.assigmentData, 'reviewers', palObject );
            var acknowledgersData = _populateTaskPALData( taskPalData.assigmentData, 'acknowledgers', palObject );
            var notifyeesData = _populateTaskPALData( taskPalData.assigmentData, 'notifyees', palObject );
            var object = {
                props : {
                    assignee :  assigneeData,
                    reviewers :  reviewersData,
                    acknowledgers :  acknowledgersData,
                    notifyees :  notifyeesData
                }
            };
            palDataMap[ taskUid ] = object;
            _updateEditContext( context, taskUid );
        } );
        palInfoMap[ selPalId ] = palDataMap;
    } );
    _setEditContext( appCtxSvc.ctx );
    eventBus.publish( _RELOAD_TABLE );
};

var _populateUnstaffedProfileRows = function( taskUid, taskProfiles, modelObjects, propName ) {
    if( !taskProfiles || taskProfiles.length <= 0 ) {
        return modelObjects;
    }
    var taskObject = clientDataModel.getObject( taskUid );
    var isValidPropToProcess = false;

    if(  ( isOfType( taskObject, 'EPMReviewTask' ) || isOfType( taskObject, 'EPMRouteTask' )
    || isOfType( taskObject, 'EPMReviewTaskTemplate' ) || isOfType( taskObject, 'EPMRouteTaskTemplate' ) ) && propName === 'reviewers'
    || ( isOfType( taskObject, 'EPMAcknowledgeTask' ) || isOfType( taskObject, 'EPMAcknowledgeTaskTemplate' ) ) && propName === 'acknowledgers' ) {
        isValidPropToProcess = true;
    }

    if( !isValidPropToProcess ) {
        return modelObjects;
    }

    var profileObjects = _.cloneDeep( taskProfiles );
    _.forEach( modelObjects, function( modelObject ) {
        var profileObject = _.find( profileObjects, function( profile ) {
            return modelObject.signoffProfile && modelObject.signoffProfile.uid === profile.uid;
        } );
        // Check if VMO is not null then only get the required number of reviewers
        // and then reduce the count.
        if( profileObject ) {
            var noRequiredReviewers = 0;
            var splitArray = [];
            if( profileObject.requiredReviewers ) {
                splitArray = profileObject.requiredReviewers.split( ' ' );
                if( splitArray && splitArray[ 0 ] && splitArray[ 1 ] ) {
                    noRequiredReviewers = parseInt( splitArray[ 0 ] );
                }
            }

            noRequiredReviewers--;
            if( noRequiredReviewers < 0 ) {
                return null;
            }
            profileObject.requiredReviewers = noRequiredReviewers + ' ' + splitArray[ 1 ];
        }
    } );
    var rowObjects = [];
    var localeTextBundle = _getLocalTextBundle();

    _.forEach( profileObjects, function( profileVMO ) {
        //var displayValue = localeTextBundle.unAssingedFrom;
        // Check if VMO is not null then only get the required number of reviewers
        // and then reduce the count.
        if( profileVMO ) {
            var noRequiredReviewers = 0;
            if( profileVMO.requiredReviewers ) {
                noRequiredReviewers = parseInt( profileVMO.requiredReviewers.split( ' ' ) );
            }
            if( noRequiredReviewers > 0 ) {
                var modelObject = viewModelService.constructViewModelObjectFromModelObject( null, '' );
                modelObject.uid = 'unstaffedUID';
                var displayValue = profileVMO.groupRoleName + '/' + noRequiredReviewers;
                displayValue = messagingSvc.applyMessageParamsWithoutContext( localeTextBundle.unAssingedFrom, [ displayValue ] );
                modelObject.props = {
                    object_string : {
                        uiValues : [ displayValue ]
                    }
                };
                if( modelObject ) {
                    var profileAssignmentObject = _createEmptyTaskDataStructure();
                    profileAssignmentObject.taskAssignment = modelObject;
                    profileAssignmentObject.assignmentOrigin = null;
                    profileAssignmentObject.assignmentType = propName;
                    profileAssignmentObject.signoffProfile = profileVMO;
                    profileAssignmentObject.isRequired = true;
                    profileAssignmentObject.isProfileAssignment = true;
                    rowObjects.push( profileAssignmentObject );
                }
            }
        }
    } );
    Array.prototype.push.apply( rowObjects, modelObjects );
    return rowObjects;
};

/**
 * Merge the proeprty that has normal assignment and PAL assignment and merge it to
 * input main proerpty value.
 *
 * @param {Object} prop Property object that need to be populated
 * @param {Object} palProp Proeprty obejct that contains nformation coming from PAL
 * @param {String} propName Property name
 *
 */
var _mergePropData = function(  prop, palProp, propName ) {
    if( palProp && propName === 'assignee' && palProp.modelObjects && palProp.modelObjects.length > 0 ) {
        prop.modelObjects = palProp.modelObjects;
    } else if( palProp && propName !== 'assignee'  && palProp.modelObjects ) {
        Array.prototype.push.apply( prop.modelObjects, palProp.modelObjects );
    }
};

/**
 * Get task specific DP data and populate the table
 * @param {Object} prop Property object that need to be populated
 * @param {String} propName Property name
 * @param {Object} participantInfoMap Participant info map object that contians all DP's data
 */
var _mergeDPData = function( prop, propName, participantInfoMap ) {
    var suuportedDPTypes = prop.supportedDPTypes;
    if( suuportedDPTypes && suuportedDPTypes.length > 0 ) {
        _.forEach( suuportedDPTypes, function( dpType ) {
            if( participantInfoMap.hasOwnProperty( dpType ) ) {
                var participantObjects = participantInfoMap[ dpType ].assignees;
                if( propName === 'assignee' ) {
                    prop.modelObjects = [];
                }

                _.forEach( participantObjects, function( participantObj ) {
                    var existingParticipant = _.cloneDeep( participantObj );
                    existingParticipant.assignmentType = propName;
                    prop.modelObjects.push( existingParticipant );
                } );
            }
        } );
    }
};

/**
 * This method check if both input objects are resource pool object then only it will return
 * true else it will return false.
 * @param {Object} objectA First input object
 * @param {Object} objectB Second input object
 * @returns {boolean} True/False
 */
var _isDuplicateResourcePoolObjects = function( objectA, objectB ) {
    if( isOfType( objectA, 'ResourcePool' ) && isOfType( objectB, 'ResourcePool' ) ) {
        return true;
    }
    return false;
};

export let getTaskAssignmentData = function( taskUid, taskInfoObject, palInfoMap, participantInfoMap, isTableTaskData ) {
    var taskInfoObject = _.cloneDeep( taskInfoObject );
    if( !taskUid || !taskInfoObject ) {
        return taskInfoObject;
    }
    //taskInfoObject =  taskInfoMap[ taskUid ];
    var taskObject = clientDataModel.getObject( taskUid );
    var isTaskCompleted = workflowAssinmentUtilSvc.isTaskCompleted( taskObject );
    for( var propName in taskInfoObject.props ) {
        if( taskInfoObject.props.hasOwnProperty( propName ) ) {
            var isPalDataExist = false;
            if( !isTaskCompleted ) {
                for( var palKey in palInfoMap ) {
                    var palProp = null;
                    isPalDataExist = true;
                    var map = palInfoMap[ palKey ];

                    var palTaskInfoObject = map[ taskUid ];

                    if( palTaskInfoObject ) {
                        palProp = _.cloneDeep( palTaskInfoObject.props[ propName ] );
                    }
                    _mergePropData(  taskInfoObject.props[ propName ], palProp, propName );
                }
            }

            if( !isPalDataExist ) {
                _mergePropData( taskInfoObject.props[ propName ], null, propName );
            }

            var modelObjects = taskInfoObject.props[ propName ].modelObjects;
            // Remove the duplicates if present in presetObjects list. If duplicate resource pool
            // present then it should not filter it out.
            if( modelObjects && modelObjects.length > 1 ) {
                modelObjects = _.uniqWith( modelObjects, function( objA, objB ) {
                    return objA.taskAssignment.uid === objB.taskAssignment.uid && !_isDuplicateResourcePoolObjects( objA.taskAssignment, objB.taskAssignment );
                } );
                taskInfoObject.props[ propName ].modelObjects = modelObjects;
            }

            if( propName !== 'assignee' && isTableTaskData ) {
                taskInfoObject.props[ propName ].modelObjects = _populateUnstaffedProfileRows( taskUid, taskInfoObject.taskProfiles, taskInfoObject.props[ propName ].modelObjects, propName );
            }
            _mergeDPData( taskInfoObject.props[ propName ],  propName, participantInfoMap );


            if( propName === 'assignee' && isTableTaskData && taskInfoObject.props.assignee.modelObjects
            && taskInfoObject.props.assignee.modelObjects.length <= 0 && taskObject &&  _multiUserTasks.indexOf( taskObject.type ) <= -1  ) {
                var assigneeVMO = _getUnStaffedVMOObject();
                taskInfoObject.props[ propName ].modelObjects = [ assigneeVMO ];
            }
        }
    }
    return taskInfoObject;
};

/**
 * Build all rows that need to be shown in assignment table with input object and return
 * new task assignemtn obejct that will be specific for assignment table for respective changes.
 *
 * @param {Object} taskAssignmentObject Task assignment object that have all task information
 * @param {Array} taskObjects Task objects that need to be shown in assignment table
 *
 * @returns {Object} taskAssignmentObject Task assignment object that have all task information
 */
export let populateAssignmentTableRowData = function( taskAssignmentObject, taskObjects ) {
    if( !taskAssignmentObject || !taskObjects || taskObjects.length <= 0 ) {
        return taskAssignmentObject;
    }
    taskAssignmentObject = _.cloneDeep( taskAssignmentObject );
    var participantMap = taskAssignmentObject.participantInfoMap;
    var palInfoMap = taskAssignmentObject.palInfoMap;
    _.forEach( taskObjects, function( taskObject ) {
        var taskUid = taskObject.uid;
        var taskInfoMap = taskAssignmentObject.taskInfoMap;
        if( taskInfoMap ) {
            taskInfoMap[ taskUid ] = exports.getTaskAssignmentData( taskUid, taskAssignmentObject.taskInfoMap[ taskUid ], palInfoMap, participantMap, true );
        }
    } );
    return taskAssignmentObject;
};

/**
 * Build all rows that need to be shown in assignment table with input object and return
 * new task assignemtn obejct that will be specific for assignment table for respective changes.
 *
 * @param {Object} taskAssignmentObject Task assignment object that have all task information
 * @param {Array} taskObjects Task objects that need to be shown in assignment table
 * @param {boolean} includeHideNodeInfo To indicate that do we need to include hidden node info as well.
 * This is mainly used when we have applied PAL and we need to do PAL assignment on hidden nodes.
 * @returns {Object} taskAssignmentObject Task assignment object that have all task information
 */
export let populateAssignmentFullTableRowData = function( taskAssignmentObject, taskObjects, includeHideNodeInfo ) {
    if( !taskAssignmentObject || !taskObjects || taskObjects.length <= 0 ) {
        return taskAssignmentObject;
    }
    taskAssignmentObject = exports.populateAssignmentTableRowData( taskAssignmentObject, taskObjects );
    // Check if hiddden task info need to be populated then only go further
    if( !includeHideNodeInfo ) {
        return taskAssignmentObject;
    }
    var palInfoMap = taskAssignmentObject.palInfoMap;
    var allTaskObjects = taskAssignmentObject.allTasksObjects;
    // Check if pal is applied then only process further else return from here
    if(  !palInfoMap || _.isEmpty( palInfoMap ) || !allTaskObjects || allTaskObjects.length <= 0 ) {
        return taskAssignmentObject;
    }
    var taskInfoMap = {};
    for( var palId in palInfoMap ) {
        var taskObjects = palInfoMap[ palId ];
        // check if task object info present in PAL map or not.  If not present then no
        // need to contunue further
        if( !taskObjects || taskObjects.length <= 0 ) {
            continue;
        }

        // Iterate for each task info present in PAL map and then get that info
        for( var taskUid  in taskObjects ) {
            var taskInfoObject = taskObjects[ taskUid ];
            if( allTaskObjects.indexOf( taskUid ) > -1 || !taskInfoObject ) {
                continue;
            }

            // Check id information is not present in task info map then directly add it and
            // if present then merge it.
            if( !taskInfoMap[taskUid ] ) {
                taskInfoMap[taskUid ] = _.cloneDeep( taskInfoObject );
            } else {
                var existingTaskInfoObject = taskInfoMap[taskUid ];
                for( var propName in taskInfoObject.props ) {
                    // Merge the existing task info property to new proeprty coming from PAL
                    _mergePropData(  existingTaskInfoObject.props[ propName ], taskInfoObject.props[ propName ], propName );
                    var modelObjects = existingTaskInfoObject.props[ propName ].modelObjects;
                    // Remove the duplicates if present in presetObjects list. If duplicate resource pool
                    // present then it should not filter it out.
                    if( modelObjects && modelObjects.length > 1 ) {
                        modelObjects = _.uniqWith( modelObjects, function( objA, objB ) {
                            return objA.taskAssignment.uid === objB.taskAssignment.uid && !_isDuplicateResourcePoolObjects( objA.taskAssignment, objB.taskAssignment );
                        } );
                        existingTaskInfoObject.props[ propName ].modelObjects = modelObjects;
                    }
                }
            }
        }
    }
    // Iterate for new task info map generate from PAL assignment and then check if this task info
    // is already not present in main map then only add it
    for( var taskUid in taskInfoMap ) {
        if( !taskAssignmentObject.taskInfoMap[ taskUid ] ) {
            taskAssignmentObject.taskInfoMap[ taskUid ] = taskInfoMap[ taskUid ];
        }
    }
    return taskAssignmentObject;
};

/**
 * Cancel the task assignment and reset the PAL value to empty if applied any.
 * @param {Object} context Context object that will be used to reset
 */
export let cancelTaskAssignments = function( context ) {
    var editHandler = editHandlerService.getEditHandler( 'TASK_ROW_EDIT' );

    if( context && context.treeTableData && context.treeTableData.palList ) {
        context.treeTableData.palList.uiValue = [];
        context.treeTableData.palList.dbValue = [];
    }

    // Get the edit handler and if not null then cancel all edits
    if( editHandler ) {
        editHandler.cancelEdits();
        return;
    }
    _resetContextValues( appCtxSvc.ctx );
};

/**
 * Update the task specific DP's that arget is being used.
 * @param {Object} targetObject Target object where assignment need to be added
 * @param {Array} sourceObjects Updated task assignment objects that need to be added
 * @param {String} dpName DP name which need to be updated
 * @param {Object} participantInfoMap Participant info map object
 */
var _updateTaskDPAssignments = function( targetObject, sourceObjects, dpName, participantInfoMap  ) {
    var newDeferredParticipants = [];

    _.forEach( sourceObjects, function( vmoObject ) {
        var valueUpdated = true;
        var newParticipant = _createEmptyTaskDataStructure();
        newParticipant.internalName = dpName;
        newParticipant.taskAssignment = vmoObject;
        var dpDisplayName = dpName;
        // Set the assignment origin as DP display name
        if( participantInfoMap[ dpName ] && participantInfoMap[ dpName ].displayName ) {
            dpDisplayName = participantInfoMap[ dpName ].displayName;
        }
        newParticipant.assignmentOrigin = dpDisplayName;
        newDeferredParticipants.push( newParticipant );
        newParticipant.taskAssignment.valueUpdated = valueUpdated;
    } );

    if( targetObject.assignmentObject && targetObject.assignmentObject.assignmentType === 'assignee' && newDeferredParticipants && newDeferredParticipants[0] ) {
        newDeferredParticipants = [ newDeferredParticipants[ 0 ] ];
    } else {
        var participantObjects = _.cloneDeep( participantInfoMap[ dpName ].assignees );
        _removeObject( participantObjects, targetObject.assignmentObject, newDeferredParticipants );
        newDeferredParticipants = participantObjects;
    }

    participantInfoMap[ dpName ].assignees = newDeferredParticipants;
    eventBus.publish( _RELOAD_TABLE );
};

/**
 * Update the task assignment and reload the assignment table based on input values
 * @param {Object} targetObject Target object where assignment need to be added
 * @param {Array} sourceObjects Objects that need to be added as assignment
 * @param {Object} taskAssignmentObject Task assignment object
 */
export let _updateTaskAssignments = function( targetObject, sourceObjects, taskAssignmentObject ) {
    var replaceAssignmentObject = targetObject.assignmentObject;
    var isPalAssignment = replaceAssignmentObject.isPALAssignment;
    var ctx = appCtxSvc.ctx;
    var newTaskAssignments = [];
    var assignmentType = workflowAssinmentUtilSvc.getAssignmentTypeBasedOnTarget( targetObject );
    _.forEach( sourceObjects, function( vmoObject ) {
        var valueUpdated = true;
        var newAssignment = _createEmptyTaskDataStructure();
        newAssignment.internalName = null;
        newAssignment.taskAssignment = vmoObject;
        newAssignment.assignmentOrigin = null;
        newAssignment.assignmentType = assignmentType;
        if( targetObject.signoffProfile ) {
            newAssignment.assignmentOrigin = newAssignment.signoffProfile;
            newAssignment.assignmentOrigin = null;
        }
        // Update the new assignment origin if coming from project or resource pool
        _updateTaskAssignmentOrigin( vmoObject, newAssignment );
        newTaskAssignments.push( newAssignment );
        newAssignment.taskAssignment.valueUpdated = valueUpdated;
    } );


    // Check is user is trying to remove the assignment that came from PAL then get the
    // info from pal info map and new assignment will go as normal assignment and it will not reference
    // to PAL.
    if( isPalAssignment && replaceAssignmentObject.assignmentOrigin.hasOwnProperty( 'uid' ) ) {
        var palUid = replaceAssignmentObject.assignmentOrigin.uid;
        taskAssignmentObject = ctx.taskAssignmentCtx.taskAssignmentDataObject.palInfoMap[ palUid ][ targetObject.taskUid ];
    }

    var presentObjects = taskAssignmentObject.props[ assignmentType ].modelObjects;
    _removeObject( presentObjects, targetObject.assignmentObject );

    if( isPalAssignment ) {
        taskAssignmentObject = ctx.taskAssignmentCtx.taskAssignmentDataObject.taskInfoMap[ targetObject.taskUid];
        presentObjects = taskAssignmentObject.props[replaceAssignmentObject.assignmentType].modelObjects;
    }
    // Check if assignment type is assignee then use 0th index object and update the table and task info object
    if( assignmentType === 'assignee' && newTaskAssignments && newTaskAssignments[ 0 ] ) {
        presentObjects = [ newTaskAssignments[ 0 ] ];
    } else {
        Array.prototype.push.apply( presentObjects, newTaskAssignments );
    }

    taskAssignmentObject.props[assignmentType].modelObjects = presentObjects;
    eventBus.publish( _RELOAD_TABLE );
};

/**
 * Update the assignment table with the source objects being drop on table directly.
 *
 * @param {Object} targetObject Target object where assignment need to be updated
 * @param {Array} sourceObjects Source objects that need to be updated
 */
export let addTaskAssignmentsOnTable = function( targetObject, sourceObjects ) {
    var ctx = appCtxSvc.ctx;
    // Call this method to get the correct group member based on current context criteria group or role from user if user obejct is
    // being dispalyed on user picker panel then use that to get correct group member and add it to table
    workflowAssinmentUtilSvc.getValidObjectsToAdd(  appCtxSvc.ctx.workflow, sourceObjects ).then( function( validObjects ) {
        // Check if valid objects are not empty then only update the table
        if( validObjects && validObjects.length > 0 ) {
            _setEditContext( appCtxSvc.ctx );
            if( targetObject && targetObject.assignmentObject && targetObject.assignmentObject.internalName ) {
                _updateTaskDPAssignments( targetObject, validObjects, targetObject.assignmentObject.internalName, ctx.taskAssignmentCtx.taskAssignmentDataObject.participantInfoMap );
                return;
            }
            if( targetObject && targetObject.assignmentObject && !targetObject.assignmentObject.internalName ) {
                var taskUid = targetObject._childObj.uid;
                var taskAssignmentObject = ctx.taskAssignmentCtx.taskAssignmentDataObject.taskInfoMap[ taskUid ];
                var validObjectToAdd = _getValidObjectToAdd( taskAssignmentObject, validObjects, targetObject.assignmentObject.assignmentType, ctx.taskAssignmentCtx.treeTableData );
                if( validObjectToAdd && validObjectToAdd.length > 0 ) {
                    _updateTaskAssignments( targetObject,  validObjectToAdd, taskAssignmentObject );
                }
            }
        }
    } );
};

/**
 * Enable the start edit on task assignmetn context object to indicate that start edit
 * has been done and table is in edit mode now.
 * @param {Object} taskAssignmentCtx Task assignment context object
 */
export let enableTaskAssignmentEdits = function( taskAssignmentCtx ) {
    if( taskAssignmentCtx ) {
        taskAssignmentCtx.isStartEditEnabled = true;
    }
};


/**
 * Get the task specifci assignment information and store it on the context so it can be
 * used like showing the panel for spefiic task or task template object.
 *
 * @param {Object} context task assignment context object where information need to be stored
 * @param {Object} selectedObject Selected object for information need to be stored
 *
 * @returns {Object} Panel context object to specify selection specific assignmetn information
 */
export let registerAssignmentPanelContext = function( context, selectedObject ) {
    if( !context || !selectedObject ) {
        return;
    }
    var panelContext = {};
    var taskAssignmentObject = _.cloneDeep( context.taskAssignmentDataObject );
    var participantMap = taskAssignmentObject.participantInfoMap;
    var palInfoMap = taskAssignmentObject.palInfoMap;
    var taskInfoMap = taskAssignmentObject.taskInfoMap;
    var taskUid = selectedObject._childObj.uid;
    var taskObject = clientDataModel.getObject( taskUid );
    // Get the task assignment information
    var taskInfoObject = exports.getTaskAssignmentData( taskUid, taskInfoMap[ taskUid ], palInfoMap, participantMap );
    if( !taskInfoObject ) {
        taskInfoObject = {};
    }
    panelContext.taskInfoObject = taskInfoObject;
    var selectionBasedParticipants = taskInfoObject.taskDeferredParticipantsTypes;
    panelContext.selectionBasedParticipants = selectionBasedParticipants;
    panelContext.deferredAssignments = participantMap;
    panelContext.selectedTaskObject = taskObject;
    context.panelContext = _.cloneDeep( panelContext );
    context.selectedTaskObject = taskObject;
    return panelContext;
};
export let dummySaveTaskAssignment = function( ctx ) {
    saveTaskAssignments( ctx );
};


/**
 * This factory creates a service and returns exports
 *
 * @member Awp0WorkflowAssignmentService
 */

export default exports = {
    populateTaskAssignmentData,
    removeTaskAssignment,
    updateTaskAssignments,
    replaceTaskAssignment,
    populatePALAssignmentInfo,
    populateAssignmentTableRowData,
    populateAssignmentFullTableRowData,
    getPALAssignmentData,
    getPALAssignmentInputData,
    getTaskAssignmentData,
    cancelTaskAssignments,
    addTaskAssignmentsOnTable,
    enableTaskAssignmentEdits,
    registerAssignmentPanelContext,
    dummySaveTaskAssignment
};
app.factory( 'Awp0WorkflowAssignmentService', () => exports );

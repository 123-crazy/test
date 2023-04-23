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
 * @module js/Awp0InboxUtils
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import commandsMapSvc from 'js/commandsMapService';
import viewModelObjectService from 'js/viewModelObjectService';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import dmSvc from 'soa/dataManagementService';
import AwPromiseService from 'js/awPromiseService';
import policySvc from 'soa/kernel/propertyPolicyService';

/**
 * Define public API
 */
var exports = {};

/**
 * Get the input structure to add the selected signoffs
 *
 * @param {object} data - data
 * @param {object} ctx - ctx
 *
 */

export let getsignoffInfo = function( data, ctx ) {
    var signOffInfos = [];
    var signOffInfo;

    if( data && data.selectedObjects ) {
        for( var index = 0; index < data.selectedObjects.length; ++index ) {
            // Check if selected obejct is user then no need to create input structure for user
            // object
            if( data.selectedObjects[ index ].type === 'User' ) {
                continue;
            }

            if( data.eventData ) {
                signOffInfo = {

                    signoffMember: data.selectedObjects[ index ],
                    origin: data.eventData.selectedProfile,
                    signoffAction: data.eventData.signoffAction,
                    originType: data.eventData.originType
                };
            } else {
                if( ctx.panelContext ) {
                    signOffInfo = {

                        signoffMember: data.selectedObjects[ index ],
                        origin: ctx.panelContext.selectedProfile,
                        signoffAction: ctx.panelContext.signoffAction,
                        originType: ctx.panelContext.originType
                    };
                } else {
                    signOffInfo = {

                        signoffMember: data.selectedObjects[ index ],
                        origin: '',
                        signoffAction: 'SOA_EPM_Review',
                        originType: 'SOA_EPM_ORIGIN_UNDEFINED'
                    };
                }
            }
            signOffInfos.push( signOffInfo );
        }
    }
    return signOffInfos;
};

/**
 * Get the perform signoff task object based on the object for action needs to be performed.
 *
 * @param {object} selection - the selected Object
 * @return {object} taskObject - Perform signoff object
 *
 */
export let getTaskObject = function( selection ) {
    var taskObject = null;

    if( !selection ) {
        return taskObject;
    }
    if( commandsMapSvc
        .isInstanceOf( 'EPMTask', selection.modelType ) ) {
        taskObject = selection;
    } else if( commandsMapSvc.isInstanceOf( 'Signoff', selection.modelType ) ) {
        if( selection.props.fnd0ParentTask && selection.props.fnd0ParentTask.dbValues && selection.props.fnd0ParentTask.dbValues[ 0 ] ) {
            var modelObj = cdm.getObject( selection.props.fnd0ParentTask.dbValues[ 0 ] );
            taskObject = viewModelObjectService.createViewModelObject( modelObj );
        }
    }

    return taskObject;
};

/**
 * get the comments entered on the panel.
 *
 * @param {object} data - the data Object
 *
 */

export let getComments = function( data ) {
    var propertyNameValues = {};
    // Check if comment property value is not null then only add it
    // to property name value. It will end when user enter comment as empty string
    // or any value
    if( data.comments && data.comments.dbValue !== null ) {
        propertyNameValues.comments = [ data.comments.dbValue ];
    }
    return propertyNameValues;
};

/**
 * Get the task to be promoted / demoted / suspended / resumed from input review task. If review task has parent task then it will return route task else
 * @param {Object} reviewTask - Review task object whose promote / demote / suspend / resume task to be find
 */

var getActionCommandTaskForReviewTask = function( reviewTask ) {
    //if review task has a parent, then get its parent route task.
    if( reviewTask && reviewTask.props.parent_task !== null ) {
        var routeTaskUID = reviewTask.props.parent_task.dbValues[ 0 ];
        var routeTask = cdm.getObject( routeTaskUID );

        if( routeTask && routeTask.modelType.typeHierarchyArray.indexOf( 'EPMRouteTask' ) > -1 ) {
            return routeTask;
        }
        return reviewTask;
    }
};

/**
 * This function will get the task object that will be promoted / demoted / suspended / resumed
 *
 * @param {object} selection - the current selection object
 *
 * @return {object} - Task to be promoted / demoted / suspended / resumed object
 */
export let getActionableTaskObject = function( selection ) {
    var taskToActionCommand = selection;
    var modelObject = selection;
    if( selection && selection.modelType.typeHierarchyArray.indexOf( 'Signoff' ) > -1 ) {
        //get the perform signoff task
        var pstTaskUID = selection.props.fnd0ParentTask.dbValues[ 0 ];
        if( pstTaskUID ) {
            modelObject = cdm.getObject( pstTaskUID );
        }
    }

    if( modelObject && modelObject.modelType.typeHierarchyArray.indexOf( 'EPMPerformSignoffTask' ) > -1 ) {
        //get the review task
        var reviewTaskUID = modelObject.props.parent_task.dbValues[ 0 ];
        if( reviewTaskUID ) {
            var reviewTask = cdm.getObject( reviewTaskUID );

            // Get the task to be promoted / demoted / suspended / resumed from review task
            taskToActionCommand = getActionCommandTaskForReviewTask( reviewTask );
        }
    }
    return taskToActionCommand;
};

/**
 * Populate the signoff description on the panel.
 *
 * @param {object} data - the data Object
 * @param {object} selectedObject - the current selection object
 *
 */
var _populateSignoffInstructions = function( data, selectedObject ) {
    if( selectedObject && selectedObject.props.fnd0ParentTask && selectedObject.props.fnd0ParentTask.dbValues ) {
        var modelObj = cdm.getObject( selectedObject.props.fnd0ParentTask.dbValues[ 0 ] );
        if( modelObj && modelObj.props.fnd0Instructions ) {
            data.description.propertyDisplayName = modelObj.props.fnd0Instructions.propertyDescriptor.displayName;
            return {
                dbValue : modelObj.props.fnd0Instructions.dbValues[ 0 ],
                uiValue : modelObj.props.fnd0Instructions.uiValues[ 0 ]
            };
        }
    }
    return {
        dbValue : selectedObject.props.object_desc.dbValues[ 0 ],
        uiValue : selectedObject.props.object_desc.uiValues[ 0 ]
    };
};

/**
 * Populate the description on the panel.
 *
 * @param {object} data - the data Object
 * @param {object} selectedObject - the current selection object
 *
 */
export let populateDescription = function( data, selectedObject ) {
    var descriptionDBValue = selectedObject.props.object_desc.dbValues[ 0 ];
    var descriptionUIValue = selectedObject.props.object_desc.uiValues[ 0 ];
    if( selectedObject.props.fnd0Instructions ) {
        descriptionDBValue = selectedObject.props.fnd0Instructions.dbValues[ 0 ];
        descriptionUIValue = selectedObject.props.fnd0Instructions.uiValues[ 0 ];
        data.description.propertyDisplayName = selectedObject.props.fnd0Instructions.propertyDescriptor.displayName;
    } else if( selectedObject.modelType && selectedObject.modelType.typeHierarchyArray.indexOf( 'Signoff' ) > -1 ) {
        var signoffDescObject = _populateSignoffInstructions( data, selectedObject );
        descriptionDBValue = signoffDescObject.dbValue;
        descriptionUIValue = signoffDescObject.uiValue;
    }

    data.description.dbValue = descriptionDBValue;
    data.description.uiValue = descriptionUIValue;
};

/**
 * Populate the workflow description on the panel.
 *
 * @param {object} data - the data Object
 * @param {object} selectedObject - the current selection object
 *
 */
export let populateJobDescription = function( data, selectedObject ) {
    var workflowDescDBValue = '';
    var workflowDescUIValue = '';

    var taskObject = getTaskObject( selectedObject );
    if( taskObject && taskObject.props.parent_process ) {
        var parentJobObject = cdm.getObject( taskObject.props.parent_process.dbValues[ 0 ] );
        if( parentJobObject && parentJobObject.props && parentJobObject.props.object_desc ) {
            workflowDescDBValue = parentJobObject.props.object_desc.dbValues[ 0 ];
            workflowDescUIValue = parentJobObject.props.object_desc.uiValues[ 0 ];
        }
    }
    if( data && data.workflowDescription ) {
        data.workflowDescription.dbValue = workflowDescDBValue;
        data.workflowDescription.uiValue = workflowDescUIValue;
    }
};

/**
 * Populate the properties on the panel.
 *
 * @param {object} data - the data Object
 * @param {object} selection - the current selection object
 *
 */

export let populatePanelData = function( data, selection ) {
    var selectedObject = selection;

    // Check if input selected object is null then return from here
    if( !selectedObject ) {
        return;
    }

    selectedObject = cdm.getObject( selectedObject.uid );

    // Check if selection is not null and not of type ViewModelObject then create the
    // view model object and use further to get the properties on view model object.
    // In case when user selecting the node from viewer input selection is not view model object.
    if( selectedObject && !viewModelObjectService.isViewModelObject( selectedObject ) ) {
        selectedObject = viewModelObjectService.createViewModelObject( selectedObject );
    }

    var nameDBValue;
    var nameUIValue;
    if( selection.modelType.typeHierarchyArray.indexOf( 'Signoff' ) > -1 ) {
        nameDBValue = selectedObject.props.object_name.dbValue;
        nameUIValue = selectedObject.props.object_name.uiValues[0];
    } else {
        nameDBValue = selectedObject.props.object_string.dbValue;
        nameUIValue = selectedObject.props.object_string.uiValues[0];
    }

    data.taskName.dbValue = nameDBValue;
    data.taskName.uiValue = nameUIValue;

    // Populate the description
    exports.populateDescription( data, selectedObject );

    return exports.getActionableTaskObject( selection );
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

/**
 * Check for user selection comes from project selection and if found any then for them create
 * the setProperties SOA input structure.
 *
 * @param {Array} createSignoffUids Created signoff Uid's array
 * @param {Array} selectedObjects Selected user/group member or resource pool object that need to
 *        be added.
 *
 * @returns {Array} Input array that will contain all info for set proeprties SOA call
 */
export let getAssigeeOriginUpdateData = function( createSignoffUids, selectedObjects ) {
    var input = [];
    // Check for if created singoff Uid's or selected objects array i sinvalid then no need to process
    if( !createSignoffUids || createSignoffUids.length <= 0  || !selectedObjects || !selectedObjects.length <= 0 ) {
        var projectSignoffs = _.filter( selectedObjects, function( obejct ) {
            return obejct.projectObject;
        } );
        // Iterate for each signoff uids and check if it has group member or resource pool assignment
        // then we need to get that value and then match it with all selected obejct array and if match
        // found and project info present then sue that project to set fnd0AssigneeOrigin else don't
        // add that info to input array.
        _.forEach( createSignoffUids, function( signoffUid  ) {
            var modelObj = cdm.getObject( signoffUid );
            var assigneeUid = null;
            if( modelObj && modelObj.props && modelObj.props.group_member &&
                modelObj.props.group_member.dbValues && modelObj.props.group_member.dbValues[ 0 ] ) {
                assigneeUid =  modelObj.props.group_member.dbValues[ 0 ];
            } else if( modelObj && modelObj.props && modelObj.props.resource_pool &&
                modelObj.props.resource_pool.dbValues && modelObj.props.resource_pool.dbValues[ 0 ] ) {
                assigneeUid =  modelObj.props.resource_pool.dbValues[ 0 ];
            }

            var assigneeObject = _.find( projectSignoffs, function( selObject ) {
                return selObject.uid === assigneeUid;
            } );
            if( assigneeObject && assigneeObject.projectObject && assigneeObject.projectObject.uid ) {
                var propertyNameValues = {};
                propertyNameValues.fnd0AssigneeOrigin = [ assigneeObject.projectObject.uid ];
                var element = {
                    actionableObject: modelObj,
                    action: 'SOA_EPM_set_task_prop_action',
                    propertyNameValues: propertyNameValues
                };
                input.push( element );
            }
        } );
    }
    return input;
};

/**
 * Based on selected objects, get the root task and return the root task objects that
 * need to be deleted. If input is Signoff then get the fnd0ParentTask on signoff object
 * and then get the parent_process on parent task object.
 *
 * @param {Array} selectedObjects Selected objects that need to be deleted
 *
 * @returns {Array} Get all objects that need to be deleted
 */
export let getTaskObjectsToDelete = function( selectedObjects ) {
    var deferred = AwPromiseService.instance.defer();
    //ensure the required objects are loaded
    var policyId = policySvc.register( {
        types: [
            {
                name: 'Signoff',
                properties: [ {
                    name: 'fnd0ParentTask',
                    modifiers: [ {
                        name: 'withProperties',
                        Value: 'true'
                    } ]
                } ]
            },
            {
                name: 'EPMTask',
                properties: [
                {
                    name: 'parent_process',
                    modifiers:
                    [
                        {
                            name: 'withProperties',
                            Value: 'true'
                        }
                    ]
                } ]
            },
            {
                name: 'Job',
                properties:
                [
                    {
                        name: 'object_string'
                    }

                ]
            }
        ]
    } );
    dmSvc.getPropertiesUnchecked( selectedObjects, [ 'fnd0ParentTask', 'parent_process' ] ).then( function( response ) {
        if( policyId ) {
            policySvc.unregister( policyId );
        }
        var deleteObjects = [];
        _.forEach( selectedObjects, function( selObj ) {
            var modelObject = cdm.getObject( selObj.uid );

            // Get the task object, in case of signoff get the fnd0ParentTask object.
            var taskObject = getTaskObject( modelObject );
            var processObject = null;
            // Now on the task object, get the parent process and use that to delete the task.
            if( taskObject && taskObject.props && taskObject.props.parent_process.dbValues
                && taskObject.props.parent_process.dbValues[ 0 ] ) {
                   processObject = cdm.getObject( taskObject.props.parent_process.dbValues[ 0 ] );
                if( processObject && processObject.uid ) {
                    deleteObjects.push( processObject );
                }
            }
        } );
        // Remove the duplicates if present in deleted object list. We are passing unqiue
        // root task object so that if user selected multiple tasks from same workflow then
        // we need to delete all tasks from same workflow and if we return root_task then it
        // will do the same thing and if we pass multiple tasks directly then it will return error
        // because first task selection, will delete the whole process and for second selction it
        // will throw error as object is already deleted.
        var finalDeletedList = _.uniqWith( deleteObjects, function( objA, objB ) {
            return objA.uid === objB.uid;
        } );
        deferred.resolve( finalDeletedList );
    } );
    return deferred.promise;
};

/**
 * This factory creates a service and returns exports
 *
 * @member Awp0InboxUtils
 */

export default exports = {
    getsignoffInfo,
    getTaskObject,
    getComments,
    getActionableTaskObject,
    populateDescription,
    populateJobDescription,
    populatePanelData,
    isTCReleaseAtLeast131,
    getAssigeeOriginUpdateData,
    getTaskObjectsToDelete
};
app.factory( 'Awp0InboxUtils', () => exports );

// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/Awp0WorkflowAssignmentDragDropService
 */
import * as app from 'app';

import localStrg from 'js/localStorage';
import assignmentPanelSvc from 'js/Awp0WorkflowAssignmentPanelService';
import assignmentSvc from 'js/Awp0WorkflowAssignmentService';
import viewModelService from 'js/viewModelObjectService';
import workflowAssinmentUtilSvc from 'js/Awp0WorkflowAssignmentUtils';
import eventBus from 'js/eventBus';
import _ from 'lodash';

let exports = {};

var _sourceDataProvider = null;
var _projectObject = null;
var _userPanelData = null;

/**
 * Clear the cache after drop option is completed
 */
const clearCachedData = () => {
    localStrg.removeItem( 'userDraggedListData' );
};

/**
 * Delighlight the element once drop action is completed.
 */
const dehighlightElement = () => {
    var allHighlightedTargets = document.body.querySelectorAll( '.aw-theme-dropframe.aw-widgets-dropframe' );
    if( allHighlightedTargets ) {
        _.forEach( allHighlightedTargets, function( target ) {
            eventBus.publish( 'dragDropEvent.highlight', {
                isHighlightFlag: false,
                targetElement: target
            } );
        } );
    }
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
    if( obj && obj.modelType.typeHierarchyArray.indexOf( type ) > -1 ) {
        return true;
    }
    return false;
};

/**
 * This function needs to do the matching for profiles task supports and based on source objects that
 * are being drop. This function need to be enhanced.
 *
 * @param {Array} taskProfiles Task profiles array this task supports.
 * @param {Array} sourceObjects Source objects that are being dropped.
 *
 * @returns {boolean} True or false
 */
var _isProfileGroupRoleMatching = function( taskProfiles, sourceObjects ) {
    var isMatching = false;
    var object = sourceObjects[0];
    var groupObject = _.find( taskProfiles, function( profile ) {
        return profile.props.group.dbValue === object.props.group.dbValue;
    } );
    var roleObject = _.find( taskProfiles, function( profile ) {
        return profile.props.role.dbValue === object.props.role.dbValue;
    } );
    if( groupObject && roleObject ) {
        isMatching = true;
    }
    return isMatching;
};

/**
 * Get all objects that need to be dropped
 * @returns {Array} Source objects that are being dropped.
 */
var _getDropObjects = function( ) {
    let sourceObjects = localStrg.get( 'userDraggedListData' );
    if( sourceObjects !== 'undefined' ) {
        sourceObjects = sourceObjects ? JSON.parse( sourceObjects ) : [];
    }
    return sourceObjects;
};

/**
 * Validate that objects that are being drop are valid objects for specific target and these objects
 * can be dropped.
 *
 * @param {Object} dragAndDropParams Drag and drop param object that conatin all values related to drag and drop
 * @param {Object} taskAssignmentCtx Task assignemnt context object
 *
 * @returns {boolean} True or False
 */
var _isInValidTargetToDrop = function( dragAndDropParams, taskAssignmentCtx ) {
    let targetObject = dragAndDropParams.targetObjects ? dragAndDropParams.targetObjects[ 0 ] : null;
    // If target object is key role that it's invalid. This is mainly for case when we show DP in assignee or
    // column for example and this value can't be replace.
    if( targetObject && targetObject.type === 'KeyRole' ) {
        return true;
    }
    var taskInfoPanelContext = null;
    if( taskAssignmentCtx && taskAssignmentCtx.panelContext && taskAssignmentCtx.panelContext.taskInfoObject ) {
        taskInfoPanelContext = taskAssignmentCtx.panelContext.taskInfoObject;
    }

    // Check if user is trying to drop on assingee data provider which is using DP then it's invalid and return true from here
    if( taskInfoPanelContext && dragAndDropParams.dataProvider.name === 'assignerDataProvider' && taskInfoPanelContext.props.assignee.supportedDPTypes
    && taskInfoPanelContext.props.assignee.supportedDPTypes.length > 0 ) {
        return true;
    }
    // Check if target is view model tree node then check the target task state. If completed then it's invalid to drop
    if( targetObject && targetObject._childObj ) {
        var isTargetTaskCompleted = workflowAssinmentUtilSvc.isTaskCompleted( targetObject._childObj );
        if( isTargetTaskCompleted ) {
            return true;
        }
    }

    // Check if target object is task and it's values can't be modified either due to priviledge or task is completed then
    // it will return true from here
    if( taskAssignmentCtx  && taskAssignmentCtx.panelContext && taskAssignmentCtx.panelContext.selectedTaskObject ) {
        var isNonModified = workflowAssinmentUtilSvc.isTaskAssignmentNonModified( taskAssignmentCtx.panelContext.selectedTaskObject, taskAssignmentCtx );
        if( isNonModified || targetObject && targetObject._childObj && targetObject._childObj.uid === taskAssignmentCtx.panelContext.selectedTaskObject.uid ) {
           return isNonModified;
        } else if( targetObject && targetObject._childObj && targetObject._childObj.uid !== taskAssignmentCtx.panelContext.selectedTaskObject.uid ) {
            return workflowAssinmentUtilSvc.isTaskAssignmentNonModified( targetObject._childObj, taskAssignmentCtx );
        }
    }
};

/**
 * Validate that objects that are being drop are valid objects for specific target and these objects
 * can be dropped. Check if target data provider is null or source object is null or invaid object is being drop
 * then return trye from here.
 *
 * @param {Object} dragAndDropParams Drag and drop param object that conatin all values related to drag and drop
 * @param {Object} taskAssignmentCtx Task assignemnt context object
 *
 * @returns {boolean} True or False
 */
var isInvalidDropObject = function( dragAndDropParams, taskAssignmentCtx ) {
    if( !dragAndDropParams || !dragAndDropParams.dataProvider ) {
        return true;
    }

    let sourceObjects = _getDropObjects();
    if( !sourceObjects || !sourceObjects[ 0 ] ) {
        return true;
    }

    var isInvalidTarget = _isInValidTargetToDrop( dragAndDropParams, taskAssignmentCtx );
    if( isInvalidTarget ) {
        return true;
    }

    // Check if source object being drop is not user or resource pool or group member then it's invalid
    // object and return true from here
    if( !isOfType( sourceObjects[ 0 ], 'User' ) && !isOfType( sourceObjects[ 0 ], 'GroupMember' )
    && !isOfType( sourceObjects[ 0 ], 'ResourcePool' ) ) {
        return true;
    }
    return false;
};

/**
 * If invalid obejct is being drop then it will return drop effect as none else it will
 * return as copy.
 *
 * @param {Object} extraParams context object
 * @param {Object} dragAndDropParams Drag and drop parameters
 *
 * @returns {Object} Drop effect object
 */
export const dragOverAssignmentAction = ( extraParams, dragAndDropParams ) => {
    dehighlightElement();
    if( isInvalidDropObject( dragAndDropParams, extraParams.taskAssignmentCtx ) ) {
        return {
            dropEffect: 'none'
        };
    }
    if( dragAndDropParams.dataProvider ) {
        dragAndDropParams.callbackAPIs.highlightTarget( {
                isHighlightFlag: true,
                targetElement: dragAndDropParams.targetElement
            } );
        return {
            dropEffect: 'copy',
            stopPropagation: true,
            preventDefault : true
        };
   }
    return {
        dropEffect: 'none'
    };
};

/**
 * Clear the highlight and cached source data
 * @param {Object} dragAndDropParams Drag and drop parameters
 */
var _clearDropdata = function( dragAndDropParams ) {
    dragAndDropParams.callbackAPIs.highlightTarget( {
        isHighlightFlag: false,
        targetElement: dragAndDropParams.targetElement
    } );
    // If source data provider is not null then select no object once drop action completed
    if( _sourceDataProvider ) {
        _sourceDataProvider.selectNone();
        _sourceDataProvider = null;
    }
    clearCachedData();
};

/**
 * Do the actual drop action to add the objects on section or assignment table
 * @param {Object} extraParams context object
 * @param {Object} dragAndDropParams Drag and drop parameters
 */
export const dropOnAssignmentAction = ( extraParams, dragAndDropParams ) => {
    dragAndDropParams.event.stopPropagation();
    let targetObject = dragAndDropParams.targetObjects ? dragAndDropParams.targetObjects[ 0 ] : null;
    let sourceObjects = localStrg.get( 'userDraggedListData' );
    sourceObjects = sourceObjects ? JSON.parse( sourceObjects ) : [];
    var dataProvider = dragAndDropParams.dataProvider;
    if( !dataProvider ) {
        _clearDropdata( dragAndDropParams );
        return;
    }
    var sourceVMOs = [];
    _.forEach( sourceObjects, function( sourceObject ) {
        var vmoObject = viewModelService.createViewModelObject( sourceObject );
        if( vmoObject ) {
            // Check if project is set and assignment is coming as part of project
            // then we need to set it to VMO.
            if( sourceObject.projectObject  ) {
                vmoObject.projectObject = sourceObject.projectObject;
            }
            if( _projectObject && !vmoObject.projectObject ) {
                vmoObject.projectObject = _projectObject;
            }
            sourceVMOs.push( vmoObject );
        }
    } );
    // If user is dropping on assignment tree table then update the task assignment directly else if dropping
    // on category panel then update the panel only
    if( dataProvider.name === 'treeTasksTemplateDataProvider' ) {
        assignmentSvc.addTaskAssignmentsOnTable( targetObject, sourceVMOs, dataProvider );
        _clearDropdata( dragAndDropParams );
        //Close opened categories panel if we drop directly to the table and reset User picker as well
        if( extraParams.openCategoriesPanel ) {
            eventBus.publish( 'workflow.closeCategoriesPanel' );
        }
        return;
    }
    assignmentPanelSvc.addUsersOnPanel( sourceVMOs, dataProvider );
    _clearDropdata( dragAndDropParams );
};

/**
 * Get the project obejct based on selcted tab and selection from project field
 * from UI and return that object.
 *
 * @param {data} data - The qualified data of the viewModel
 *
 * @returns {Object} Project obejct if associated for specific selection
 */
var _getProjectObject = function( data ) {
    var projectObject = null;
    var projectProp = null;
    if( data.selectedTab && data.selectedTab.panelId === 'UserTab' ) {
        projectProp = data.userProjectObject;
    } else if( data.selectedTab && data.selectedTab.panelId === 'ResourcePoolTab' ) {
        projectProp = data.projectObject;
    }
    if( projectProp && projectProp.selectedLovEntries && projectProp.selectedLovEntries[ 0 ]
        && projectProp.selectedLovEntries[ 0 ].projectModelObject ) {
        projectObject =  projectProp.selectedLovEntries[ 0 ].projectModelObject;
    }
    return projectObject;
};

/**
 *
 * @param {Object} dnDParams dND obejct that will have all info form wher euser start dragging
 */
export let dragUserListStartAction = ( dnDParams ) => {
    if( dnDParams.dataProvider && dnDParams.declViewModel ) {
        _sourceDataProvider = dnDParams.dataProvider;
        _projectObject = _getProjectObject( dnDParams.declViewModel );
    }
    localStrg.publish( 'userDraggedListData', JSON.stringify( dnDParams.targetObjects ) );
};

export default exports = {
    dropOnAssignmentAction,
    dragOverAssignmentAction,
    dragUserListStartAction
};

/**
 * This factory creates a service and returns exports
 * @member Awp0WorkflowAssignmentDragDropService
 * @memberof NgServices
 */
app.factory( 'Awp0WorkflowAssignmentDragDropService', () => exports );

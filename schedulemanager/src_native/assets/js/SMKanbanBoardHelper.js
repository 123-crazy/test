// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/SMKanbanBoardHelper
 */
import app from 'app';
import smConstants from 'js/ScheduleManagerConstants';
import cdm from 'soa/kernel/clientDataModel';
import dms from 'soa/dataManagementService';
import AwStateService from 'js/awStateService';
import uwPropSvc from 'js/uwPropertyService';
import awIconService from 'js/awIconService';
import 'soa/kernel/clientMetaModel';

var exports = {};

export let prepareLoadAssignTasksContainer = function( data ) {
    var columns = data.kanbanColumnMap;
    var loadTasksInfo = [];
    var maxToLoad = 20;
    var displayLimitPref = data.preferences.AWC_SM_Tasks_Board_Display_Limit;
    if( displayLimitPref && displayLimitPref[ 0 ] ) {
        maxToLoad = parseInt( displayLimitPref[ 0 ] );
    }
    for( var col in columns ) {
        var statusContainer = {
            status: col,
            state: columns[ col ],
            startIndex: 0,
            maxToLoad: maxToLoad,
            loadOptions: {}
        };
        loadTasksInfo.push( statusContainer );
    }
    return loadTasksInfo;
};

/**
 * Returns the localized priority value
 * @param {int} priorityInt The Integer value
 * @param {Object} data The viewModel object
 * @returns {String} The Localized priority value
 */
var getPriorityString = function( priorityInt, data ) {
    var priorityString = smConstants.PRIORITY[ priorityInt ];
    if( priorityString ) {
        return data.i18n[ priorityString ];
    }
};

var constructKanbanTask = function( taskObj, data ) {
    var finishDate = taskObj.props.finish_date.uiValues[ 0 ];
    var status = taskObj.props.fnd0status.dbValues[ 0 ];
    var priorityInt = taskObj.props.priority.dbValues[ 0 ];
    var priority = getPriorityString( priorityInt, data );
    var cssClass = smConstants.BOARD_PRIORITY_COLOR_CLASSES[ priorityInt ] + ' aw-scheduleManager-kanbanBoardCard aw-aria-border';
    var color = smConstants.BOARD_PRIORITY_COLORS[ priorityInt ];
    var scheduleName = '<strong>' + data.i18n.Saw1Schedule + ': </strong>' + taskObj.props.schedule_tag.uiValues[ 0 ];
    var finishDateValue = '<strong>' + data.i18n.Saw1FinishDate + ': </strong>' + finishDate;
    var priorityValue = '<strong>' + data.i18n.Saw1Priority + ': </strong>' + priority;
    var iconURL = awIconService.getTypeIconFileUrl( taskObj );
    var iconTooltip = taskObj.props.object_type.uiValues[0];
    var iconRightURL =  app.getBaseUrlPath() + '/image/cmdOpen24.svg';
    var iconRightTooltip =  data.i18n.Saw1OpenObjectTooltip;
    var iconRightTitle = data.i18n.Saw1ShowScheduleObject;

    return {
        id: taskObj.uid,
        status: status,
        text: taskObj.props.object_name.uiValues[ 0 ],
        tags: [ scheduleName, finishDateValue, priorityValue ],
        $css: cssClass,
        color: color,
        iconURL: iconURL,
        iconTooltip: iconTooltip,
        iconRightURL: iconRightURL,
        showRightIcon: true,
        iconRightTooltip: iconRightTooltip,
        iconRightTitle: iconRightTitle
    };
};

/**
 *  Reads SOA response and prepares data for webix Kanban
 * @param {Object} response SOA response
 * @param {Object} data ViewModel object
 * @returns {Object} The Data in webix format
 */
export let parseKanbanSOAResponse = function( response, data ) {
    var loadedTask = [];
    var assignedTasksArray = response.assignedTasks;
    if( assignedTasksArray ) {
        assignedTasksArray.forEach( function( assignedTasks ) {
            var loadedTasks = assignedTasks.loadedTasks;
            if( loadedTasks ) {
                loadedTasks.forEach( function( task ) {
                    var taskObj = response.ServiceData.modelObjects[ task.uid ];
                    if( taskObj ) {
                        var kanbanTask = constructKanbanTask( taskObj, data );
                        loadedTask.push( kanbanTask );
                    }
                } );
            }
        } );
    }
    return loadedTask;
};

export let populateDisplayLimit = function( data ) {
    var dispLimitValue = 2;
    var displayLimitPref = data.preferences.AWC_SM_Tasks_Board_Display_Limit;
    if( displayLimitPref && displayLimitPref[ 0 ] ) {
        dispLimitValue = parseInt( displayLimitPref[ 0 ] );
    }
    data.displayLimit.dbValues[ 0 ] = dispLimitValue;
    data.displayLimit.dbValue = dispLimitValue;
};

export let updateDisplayLimitPreference = function( data, value ) {
    if( !value ) {
        value = data.SM_TASKS_KANBAN_BOARD_DEFAULT_DISPLAY_LIMIT;
    }
    var valueStr = value.toString();
    data.preferences.AWC_SM_Tasks_Board_Display_Limit[ 0 ] = valueStr;
    return valueStr;
};

/**
 * Prepares the container for saveViewModelEditAndSubmitWorkflow2
 * @param {Object} dragDropContext The context for drag-n-drop
 * @returns {Object} The container for saveViewModelEditAndSubmitWorkflow2
 */
export let prepareDataForSaveEdit = function( dragDropContext ) {
    var draggedObjectUidArray = dragDropContext.dragContext.source;
    var statusToUpdate = dragDropContext.dragContext.to.config.status;
    var stateToUpdate = dragDropContext.columnMapping[ statusToUpdate ];
    var inputs = [];
    draggedObjectUidArray.forEach( function( objUid ) {
        var draggedObject = cdm.getObject( objUid );
        if( draggedObject ) {
            var lsd = draggedObject.props.lsd.dbValues[ 0 ];
            var stateProp = uwPropSvc.createViewModelProperty( 'fnd0state', 'State', 'STRING',
                stateToUpdate, '' );
            stateProp.sourceObjectLastSavedDate = lsd;
            var statusProp = uwPropSvc.createViewModelProperty( 'fnd0status', 'Status', 'STRING',
                statusToUpdate, '' );
            statusProp.sourceObjectLastSavedDate = lsd;
            var editObject = dms.getSaveViewModelEditAndSubmitToWorkflowInput( draggedObject );
            dms.pushViewModelProperty( editObject, stateProp );
            dms.pushViewModelProperty( editObject, statusProp );
            inputs.push( editObject );
        }
    } );
    return inputs;
};

export let updatesubLocation = function() {
    var options = {};
    options.inherit = false;
    options.reload = true;
    AwStateService.instance.go( 'SMTasksKanbanBoard', '', options );
};

export let updateTaskData = function( data ) {
    var updatedCards = [];
    var updatedObjects = data.eventData.updatedObjects;
    updatedObjects.forEach( function( task ) {
        if( task.modelType.typeHierarchyArray.indexOf( 'ScheduleTask' ) > -1 ) {
            var kanbanTask = constructKanbanTask( task, data );
            updatedCards.push( kanbanTask );
        }
    } );
    return updatedCards;
};

export let ShowScheduleTaskObject = function(eventData) {
    var uid = eventData.itemId;
    var path0 = eventData.ev.path[0].className;
    var path1 = eventData.ev.path[1].className;
    if( uid && path0 === 'avatar' && path1 === 'webix_kanban_user_avatarRight') {
        var showObject = 'com_siemens_splm_clientfx_tcui_xrt_showObject';
        var options = {};
        var toParams = {};

        toParams.uid = uid;
        options.inherit = false;

        AwStateService.instance.go( showObject, toParams, options );
    }
};

exports = {
    prepareLoadAssignTasksContainer,
    parseKanbanSOAResponse,
    populateDisplayLimit,
    updateDisplayLimitPreference,
    prepareDataForSaveEdit,
    updatesubLocation,
    updateTaskData,
    ShowScheduleTaskObject
};

export default exports;
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member SMKanbanBoardHelper
 */
app.factory( 'SMKanbanBoardHelper', () => exports );

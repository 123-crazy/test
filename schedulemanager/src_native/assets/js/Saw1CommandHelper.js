//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 */

/**
 * @module js/Saw1CommandHelper
 */
import app from 'app';
import commandPanelService from 'js/commandPanel.service';
import appCtxService from 'js/appCtxService';
import soaService from 'soa/kernel/soaService';
import smConstants from 'js/ScheduleManagerConstants';
import soa_dataManagementService from 'soa/dataManagementService';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';

import 'jquery';

var exports = {};

/**
 * Method for invoking and registering/unregistering data for the Add Deliverable command panel
 *
 * @param {String} commandId - Command Id for the Add Deliverable command
 * @param {String} location - Location of the Add Deliverable command
 */
export let addDeliverablePanel = function( commandId, location ) {
    var scheduleTask = 'scheduleTask';

    var selection = appCtxService.ctx.selected;

    if( selection ) {
        var props = selection.props;
        if( props ) {
            var taskType = props.task_type.dbValues[ '0' ];
            if( taskType !== smConstants.TASK_TYPE.T && taskType !== smConstants.TASK_TYPE.M &&
                taskType !== smConstants.TASK_TYPE.G ) {
                throw 'deliverableTaskTypeError';
            }

            var scheduleObj = {
                selectedObject: selection
            };
            appCtxService.registerCtx( scheduleTask, scheduleObj );
        }
    } else {
        appCtxService.unRegisterCtx( scheduleTask );
    }
    commandPanelService.activateCommandPanel( commandId, location, undefined, undefined, false );
};

/**
 * Check is selected object from same Schedule.
 *
 * @param {Array} selectedTasks - The list of selected task
 * @throw deliverableDiffSchError - if selected object are from different schedule.
 */
var checkScheduleTags = function( selectedTasks ) {
    if( selectedTasks && selectedTasks.length > 0 ) {
        var firstTaskSchUid = selectedTasks[ 0 ].props.schedule_tag.dbValues[ 0 ];
        for( var i = 1; i < selectedTasks.length; i++ ) {
            var schUid = selectedTasks[ i ].props.schedule_tag.dbValues[ 0 ];
            if( firstTaskSchUid !== schUid ) {
                throw 'deliverableDiffSchError';
            }
        }
    }
};

/**
 * Method for invoking and registering/unregistering data for the Add Task Deliverable command panel
 *
 * @param {String} commandId - Command Id for the Add Task Deliverable command
 * @param {String} location - Location of the Add Task Deliverable command
 * @param {boolean} isAllowMultiSchedule - Whether to allow multiple schedules or not
 */
export let addTaskDeliverablePanel = function( commandId, location, isAllowMultiSchedule ) {
    var scheduleToTasksArrayMap = {};
    var selection = appCtxService.ctx.mselected;
    if( isAllowMultiSchedule === undefined || isAllowMultiSchedule === false ) {
        checkScheduleTags( selection );
    }
    if( selection ) {
        for( var i = 0; i < selection.length; i++ ) {
            var selectedObj = selection[ i ];
            if( selectedObj ) {
                var workflowProcess = selectedObj.props.workflow_process.dbValues[ 0 ];
                if( workflowProcess !== null && workflowProcess.length > 0 ) {
                    throw 'deliverableWorkflowError';
                }
                var taskType = selectedObj.props.task_type.dbValues[ 0 ];
                if( taskType !== smConstants.TASK_TYPE.T && taskType !== smConstants.TASK_TYPE.M &&
                    taskType !== smConstants.TASK_TYPE.G ) {
                    throw 'deliverableTaskTypeError';
                }

                var scheduleUid = selectedObj.props.schedule_tag.dbValues[ 0 ];
                var taskArray = scheduleToTasksArrayMap[ scheduleUid ];
                if( !taskArray ) {
                    taskArray = [];
                }
                taskArray.push( selectedObj );
                scheduleToTasksArrayMap[ scheduleUid ] = taskArray;
            }
        }
        var assignTaskDelContainer = {
            scheduleToTasksArrayMap: scheduleToTasksArrayMap
        };
        appCtxService.registerCtx( 'assignTaskDelContainer', assignTaskDelContainer );
    } else {
        appCtxService.unRegisterCtx( 'assignTaskDelContainer' );
    }
    commandPanelService.activateCommandPanel( commandId, location );
};

/**
 * Perform the paste behavior for the IModelObjects from schedulemanager/paste.json onto the given 'target'
 * IModelObject creating the given relationship type between them.
 *
 * @param {Object} targetObject - The 'target' IModelObject for the paste.
 * @param {Array} sourceObjects - Array of 'source' IModelObjects to paste onto the 'target' IModelObject
 * @param {String} relationType - relation type name (object set property name)
 * @returns {Promise} The Promise for createRelations SOA
 *
 */
export let deliverablePasteHandler = function( targetObject, sourceObjects, relationType ) {
    var relationTypeToUse = relationType;

    var inputData = {
        input: [ {
            primaryObject: targetObject,
            secondaryObject: sourceObjects[ 0 ],
            relationType: relationTypeToUse
        } ]
    };

    return soaService.post( 'Core-2006-03-DataManagement', 'createRelations', inputData );
};

/**
 * Check Schedule Deliverable Name of the Deliverable to be added
 *
 * @param {data} data - The qualified data of the viewModel
 * @returns {Promise} The Promise for getProperties SOA
 */
export let checkSchDeliverableName = function( data ) {
    var sch_tag = appCtxService.ctx.selected.props.schedule_tag.dbValues[ '0' ];

    var deferred = AwPromiseService.instance.defer();

    soa_dataManagementService.getProperties( [ sch_tag ], [ 'schedule_deliverable_list' ] ).then( function() {
        var schedule = cdm.getObject( sch_tag );

        var deliverableUiValues = schedule.props.schedule_deliverable_list.uiValues;

        deliverableUiValues.forEach( function( deliverableUiValue ) {
            var computedDelValue = null;
            if( data.SoaToBeCalled === 'dataset' ) {
                computedDelValue = 'sd_' + data.datasetName.dbValue;
            } else if( data.SoaToBeCalled === 'notADataset' ) {
                computedDelValue = 'sd_' + data.vmo.props.object_name.dbValue;
            } else if( data.sourceObjects ) {
                computedDelValue = 'sd_' + data.sourceObjects[ '0' ].props.object_string.dbValue;
            }
            if( computedDelValue && deliverableUiValue === computedDelValue ) {
                deferred.reject( data.i18n.sameInstanceNameErrorMsg );
            }
        } );
        deferred.resolve();
    } );
    return deferred.promise;
};

//check for Schedule Task
export let checkScheduleTask = function( ctx ) {
    for( var index = 0; index < ctx.awClipBoardProvider.length; index++ ) {
        var isScheduleTask = true;
        if( ctx.awClipBoardProvider[ index ].modelType.typeHierarchyArray.indexOf( 'ScheduleTask' ) <= -1 ) { //other than Schedule task then return false
            throw 'errMsgForScheduleTask';
        }
    }
    return isScheduleTask;
};

exports = {
    addDeliverablePanel,
    addTaskDeliverablePanel,
    deliverablePasteHandler,
    checkSchDeliverableName,
    checkScheduleTask
};

export default exports;
/**
 * Service to display Shift Schedule panel.
 *
 * @member Saw1CommandHelper
 * @memberof NgServices
 */
app.factory( 'Saw1CommandHelper', () => exports );

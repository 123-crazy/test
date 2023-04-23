// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/scheduleNavigationTreeSelectionService
 */
import _ from 'lodash';
import ganttManager from 'js/uiGanttManager';
import appCtxSvc from 'js/appCtxService';
import schNavTreeUtils from 'js/scheduleNavigationTreeUtils';
import viewModelService from 'js/viewModelService';
import cdm from 'soa/kernel/clientDataModel';

let exports;

/**
 * @returns true if objects can be selected in gantt; false otherwise.
 */
let canSelectObjectsInGantt = () => {
    return ganttManager.isGanttInstanceExists() &&
        appCtxSvc.ctx.showGanttChart && appCtxSvc.ctx.showGanttChart === true &&
        appCtxSvc.ctx.scheduleNavigationCtx && appCtxSvc.ctx.scheduleNavigationCtx.isGanttInitialized === true;
};

/**
 * Select the objects in Gantt
 *
 * @param {Array} objectUidsToSelect Uids of objects to select in gantt.
 */
export let selectObjectsInGantt = ( objectUidsToSelect ) => {
    if( !canSelectObjectsInGantt() ) {
        return;
    }
    let smGanttCtx = appCtxSvc.getCtx( 'smGanttCtx' );
    // check if event is selected in a gantt and if it is selected
    // this check will ensure selected event will not get deselected
    if ( smGanttCtx && smGanttCtx.isEventActive && objectUidsToSelect.length <= 0 ) {
        smGanttCtx.isEventActive = false;
        appCtxSvc.updateCtx( 'smGanttCtx', smGanttCtx );
        return;
    }
    // Batch process selection in gantt.
    ganttManager.getGanttInstance().batchUpdate( () => {
        if( _.isArray( objectUidsToSelect ) && objectUidsToSelect.length > 0 ) {
            // Remove deselected objects.
            ganttManager.getGanttInstance().eachSelectedTask( ( taskId ) => {
                if( objectUidsToSelect.indexOf( taskId ) === -1 ) {
                    ganttManager.getGanttInstance().unselectTask( taskId );
                }
            } );

            // Update newly selected objects.
            objectUidsToSelect.forEach( ( objectUid ) => {
                if( ganttManager.getGanttInstance().isTaskExists( objectUid ) ) {
                    if( !ganttManager.getGanttInstance().isSelectedTask( objectUid ) ) {
                        ganttManager.getGanttInstance().selectTask( objectUid );
                        const task = ganttManager.getGanttInstance().getTask( objectUid );
                        ganttManager.getGanttInstance().showDate( task.start_date );
                    }
                }
            } );
        } else {
            // Deselect all
            ganttManager.getGanttInstance().eachSelectedTask( ( taskId ) => {
                ganttManager.getGanttInstance().unselectTask( taskId );
            } );
        }
    } );
};

/**
 * Select the objects in the tree
 *
 * @param {Object} data view model data
 * @param {Array} objectUidsToSelect Uids of objects to select in tree.
 */
export let selectObjectsInTree = ( data, objectUidsToSelect ) => {
    if( !appCtxSvc.ctx.scheduleNavigationCtx ) {
        return;
    }

    var provider = data.dataProviders.scheduleNavigationTreeDataProvider;

    if( provider && objectUidsToSelect && Array.isArray( objectUidsToSelect ) ) {
        provider.selectionModel.setSelection( objectUidsToSelect );
    }
};

/**
 * Update schedule object in context on selection of task from tree
 */
export let updateSelectedTaskSchedule = () => {
    let scheduleNavigationCtx = appCtxSvc.getCtx( 'scheduleNavigationCtx' );
    if( !scheduleNavigationCtx ) {
        scheduleNavigationCtx = {};
    }
    let viewModel = viewModelService.getViewModelUsingElement( schNavTreeUtils.getScheduleNavigationTreeTableElement() );
    if( viewModel ) {
        let vmNodes = viewModel.dataProviders.scheduleNavigationTreeDataProvider.getSelectedObjects();
        let schedUid = '';
        if( vmNodes && vmNodes.length > 0 ) {
            let taskObj = cdm.getObject( vmNodes[ 0 ].uid );
            if( taskObj && taskObj.props && taskObj.props.schedule_tag ) {
                schedUid = taskObj.props.schedule_tag.dbValues[ 0 ];
                let schedObj = cdm.getObject( schedUid );
                if( !scheduleNavigationCtx.selectedTaskSchedule || schedObj && scheduleNavigationCtx.selectedTaskSchedule.uid !== schedObj.uid ) {
                    scheduleNavigationCtx.selectedTaskSchedule = schedObj;
                    appCtxSvc.updateCtx( 'scheduleNavigationCtx', scheduleNavigationCtx );
                }
            }
        }
    }
};

exports = {
    selectObjectsInGantt,
    selectObjectsInTree,
    updateSelectedTaskSchedule
};

export default exports;

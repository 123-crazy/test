// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/scheduleNavigationService
 */
import _ from 'lodash';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import ganttIntegrationService from 'js/scheduleNavigationGanttIntegrationService';
import schNavScrollService from 'js/scheduleNavigationTreeScrollService';
import schNavTreeRowService from 'js/scheduleNavigationTreeRowService';
import saw1GanttDependencyUtils from 'js/Saw1GanttDependencyUtils';
import preferenceService from 'soa/preferenceService';

let exports;

/**
 * Set default display view mode
 *
 * @param {Object} data - view model datact
 */
let _setDefaultDisplayMode = ( data ) => {
    let ganttChartPref = appCtxSvc.getCtx( 'preferences.AW_SubLocation_ScheduleNavigationSubLocation_ShowGanttChart' );
    appCtxSvc.registerCtx( 'showGanttChart', !( ganttChartPref && ganttChartPref[ 0 ] === 'false' ) );
};

/**
 * Initializes the data for schedule navigation sublocation
 *
 * @param {Object} data view model data
 */
export let intializeScheduleNavigationSublocation = ( data ) => {
    // Update default display mode from preference.
    _setDefaultDisplayMode( data );

    // Disable synchronization b/w Tree Table and Gantt scroll bars.
    // It should be enabled after the initial data is loaded in Gantt.
    schNavScrollService.enableScrollSync( false );

    let sourceSchedule  = appCtxSvc.getCtx( 'locationContext' ).modelObject;
    let scheduleSummary = cdm.getObject( sourceSchedule.props.fnd0SummaryTask.dbValues[ 0 ] );
    let isStructureEditSupported = appCtxSvc.ctx.state.params.filter === null;

    appCtxSvc.registerCtx( 'scheduleNavigationCtx', {
        isGanttInitialized : false,
        sourceSchedule: sourceSchedule,
        sourceScheduleSummary: scheduleSummary,
        isStructureEditSupported: isStructureEditSupported,
        loadSchCtx: {
            parentTaskUid: '',
            startTaskUid: '',
            endTaskUid: ''
        },
        treeNodeUids : [],
        dependenciesInfo: [],
        baselines : [],
        selectedBaselines : []
    } );

    data.eventSubscriptions = [];

    // Set gantt intialization flag to false, if chart is turned off.
    data.eventSubscriptions.push( eventBus.subscribe( 'appCtx.update', ( event ) => {
        if( event.name === 'showGanttChart' && event.value === false ) {
            appCtxSvc.updatePartialCtx( 'scheduleNavigationCtx.isGanttInitialized', false );

            // Disable synchronization b/w Tree Table and Gantt scroll bars.
            schNavScrollService.enableScrollSync( false );
        }
    } ) );

    // Once the Gantt Chart is initialized, push the data from tree table to the chart.
    data.eventSubscriptions.push( eventBus.subscribe( 'ScheduleGantt.ganttInitialized', ganttIntegrationService.pushInitailDataToGantt ) );

    // Update the gantt chart with tasks from the tree load result.
    data.eventSubscriptions.push( eventBus.subscribe( 'scheduleNavigationTreeDataProvider.treeNodesLoaded', ( eventData ) => {
        if( appCtxSvc.ctx.showGanttChart && appCtxSvc.ctx.scheduleNavigationCtx.isGanttInitialized ) {
            if( !_.isEmpty( eventData.treeLoadResult ) ) {
                var parentNode = eventData.treeLoadResult.parentNode;

                // If it is top node(schedule), use the schedule summary i.e the rootPathNode that matches the 'parentElementUid''
                if( eventData.treeLoadInput.isTopNode ) {
                    parentNode = _.filter( eventData.treeLoadResult.rootPathNodes, { uid: eventData.treeLoadInput.parentElementUid } )[0];
                }

                if( parentNode ) {
                    // Add the child nodes to Gantt
                    ganttIntegrationService.addChildNodesToGantt( parentNode, eventData.treeLoadResult.childNodes );

                    // Load the baseline tasks for the child nodes.
                    ganttIntegrationService.loadBaselineTasksInGantt( eventData.treeLoadResult.childNodes );
                }
            }
        }
    } ) );

    // Update the gantt chart with dependencies
    data.eventSubscriptions.push( eventBus.subscribe( 'scheduleNavigationTree.dependenciesLoaded', ( eventData ) => {
        if( !_.isEmpty( eventData.loadedDependencies ) ) {
            if( appCtxSvc.ctx.showGanttChart && appCtxSvc.ctx.scheduleNavigationCtx.isGanttInitialized ) {
                ganttIntegrationService.addDependenciesToGantt( eventData.loadedDependencies );
            }
            saw1GanttDependencyUtils.regenerateDependencyIds();
        }
    } ) );

    // Subscribe to events for generating row/dependency numbers.
    data.eventSubscriptions = data.eventSubscriptions.concat( schNavTreeRowService.subscribeEvents() );
};

/**
 * Cleanup data while destructing the schedule navigation sublocation
 *
 * @param {Object} data view model data
 */
export let destroyScheduleNavigationSublocation = ( data ) => {
    // Disable synchronization b/w Tree Table and Gantt scroll bars.
    schNavScrollService.enableScrollSync( false );

    appCtxSvc.unRegisterCtx( 'showGanttChart' );
    appCtxSvc.unRegisterCtx( 'scheduleNavigationCtx' );

    for( var i = 0; i < data.eventSubscriptions.length; ++i ) {
        var event =  data.eventSubscriptions[ i ];
        if( event ) {
            eventBus.unsubscribe( event );
        }
    }

    data.eventSubscriptions = [];
};

/**
 * Toggles the value of 'showGanttChart' variable in ctx.
 */
export const toggleGanttChart = () => {
    let isGanttChartOn = appCtxSvc.getCtx( 'showGanttChart' );
    appCtxSvc.updateCtx( 'showGanttChart', !isGanttChartOn );

    let boolStrArray = [ !isGanttChartOn ? 'true' : 'false' ];
    preferenceService.setStringValue( 'AW_SubLocation_ScheduleNavigationSubLocation_ShowGanttChart', boolStrArray );
    appCtxSvc.updatePartialCtx( 'preferences.AW_SubLocation_ScheduleNavigationSubLocation_ShowGanttChart', boolStrArray );
    if( isGanttChartOn ) { eventBus.publish( 'scheduleNavigationTree.updateSWAInfoToSchedule' ); }
};

/**
 * React to location change by updating the required data in schedule navigation ctx.
 */
export const handleScheduleNavigationStateParamsChange = ( eventData ) => {
    if( !appCtxSvc.ctx.scheduleNavigationCtx ) {
        return;
    }
    let columnFilteringApplied = appCtxSvc.getCtx( 'isColumnFilteringApplied' );
    let isStructureEditSupported = appCtxSvc.ctx.scheduleNavigationCtx.isStructureEditSupported;

    if( !isStructureEditSupported && columnFilteringApplied !== true && appCtxSvc.ctx.state.params.filter === null ) {
        appCtxSvc.updatePartialCtx( 'scheduleNavigationCtx.isStructureEditSupported', true );
    }else if ( isStructureEditSupported && ( columnFilteringApplied === true || appCtxSvc.ctx.state.params.filter !== null ) ) {
        appCtxSvc.updatePartialCtx( 'scheduleNavigationCtx.isStructureEditSupported', false );
        // Clear the dependencies info in the ctx and notify the subscribers about the same.
        appCtxSvc.updatePartialCtx( 'scheduleNavigationCtx.dependenciesInfo', [] );
        eventBus.publish( 'scheduleNavigationTree.dependenciesCleared' );
    }
};

exports = {
    intializeScheduleNavigationSublocation,
    destroyScheduleNavigationSublocation,
    toggleGanttChart,
    handleScheduleNavigationStateParamsChange
};

export default exports;

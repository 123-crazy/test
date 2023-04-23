//@<COPYRIGHT>@
//==================================================
//Copyright 2021.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 */
/**
 * @module js/PlanNavigationService
 */
import _ from 'lodash';
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import eventBus from 'js/eventBus';
import planNavTreeService from 'js/planNavigationTreeService';
import planNavTreeSync from 'js/PlanNavigationTimelineSync';
import planNavTreeUtils from 'js/PlanNavigationTreeUtils';


 let exports = {};

/**
 * Initializes the data for plan navigation sublocation
 * @param {Object} data view model data
 */
export let initializePlanNavigationSublocation = function( data ) {
    appCtxSvc.registerCtx( 'planNavigationCtx', {
        isTimelineInitialized : false
    } );
    data.eventSubscriptions = [];
    subscribeToEvents( data );
    appCtxSvc.registerCtx( 'timelineContext', [] );
    // For ProgramBoard
    appCtxSvc.registerCtx( 'timelineProgramBoard', {} );
    appCtxSvc.registerCtx( 'activeProgramBoard', false );
    appCtxSvc.registerCtx( 'isColumnFilteringApplied', false );

    let timelinePref = appCtxSvc.getCtx( 'preferences.AW_SubLocation_PlanNavigationSubLocation_ShowTimeline' );
    appCtxSvc.registerCtx( 'showTimeline', !( timelinePref && timelinePref[ 0 ] === 'false' ) );
    var timelineProgramBoard = appCtxSvc.getCtx( 'timelineProgramBoard' );
    timelineProgramBoard.column = [];
    appCtxSvc.updateCtx( 'timelineContext', timelineProgramBoard );
    planNavTreeUtils.loadEventProperties();
    let selectedObjUid = appCtxSvc.ctx.selected ? appCtxSvc.ctx.selected.uid : appCtxSvc.ctx.locationContext.modelObject.uid;
    return true;
};

/**
 * Subscribe to events for tree and timeline integration
 * @param {Object} data view model
 */
let subscribeToEvents = function( data ) {
    data.eventSubscriptions.push( eventBus.subscribe( 'planNavigationTreeDataProvider.treeNodesLoaded', function( eventData ) {
        if( appCtxSvc.ctx.showTimeline && appCtxSvc.ctx.planNavigationCtx.isTimelineInitialized && !_.isEmpty( eventData.treeLoadResult ) ) {
            planNavTreeSync.addChildNodesToTimelines( eventData.treeLoadResult.childNodes );
        }
    } ) );

    data.eventSubscriptions.push( eventBus.subscribe( 'appCtx.update', ( event ) => {
        if( event.name === 'showTimeline' && event.value === false ) {
            appCtxSvc.updatePartialCtx( 'planNavigationCtx.isTimelineInitialized', false );
            planNavTreeSync.clearAllTasks();
        }
    } ) );

    // Once the Timeline is initialized, push the data from tree table to the chart.
    data.eventSubscriptions.push( eventBus.subscribe( 'PlanTimeline.timelineInitialized', planNavTreeSync.pushInitialDataToTimeline ) );

    data.eventSubscriptions.push( eventBus.subscribe( 'aw-splitter-update', function( eventData ) {
        if( appCtxSvc.ctx.activeProgramBoard ) {
            let programBoard = planNavTreeUtils.getProgramBoardElement();
            if( !_.isEmpty( eventData.area2.children ) && programBoard === eventData.area2.children[ 0 ] ) {
                let kanbanWidth = eventData.area2.clientWidth;
                let kanbanHeight = eventData.area2.clientHeight - 50;
                let resizeOptions = {
                    height: kanbanHeight,
                    width: kanbanWidth
                };
                eventBus.publish( 'ProgramBoard.resizeKanban', resizeOptions );
            }
        }
    } ) );

    data.eventSubscriptions.push( eventBus.subscribe( 'planNavigation.planReordered', function( eventData ) {
        if( eventData && eventData.timelineMovePlanContainer ) {
            let movePlanContainer = eventData.timelineMovePlanContainer;
            planNavTreeSync.reorderPlanOnTimeline( movePlanContainer.planUid, movePlanContainer.index, movePlanContainer.parentUid );
        }
    } ) );
};

/**
 * Cleanup data while destructing the plan navigation sublocation
 * @param {Object} data view model data
 */
export let destroyPlanNavigationSublocation = function( data ) {
    if( data.eventSubscriptions.length > 0 ) {
        for( var i = 0; i < data.eventSubscriptions.length; i++ ) {
            var event = data.eventSubscriptions[ i ];
            if( event ) {
                eventBus.unsubscribe( event );
            }
        }
        data.eventSubscriptions = [];
    }
    planNavTreeUtils.unloadEventProperties();
    // For ProgramBoard
    appCtxSvc.unRegisterCtx( 'timelineProgramBoard' );
    appCtxSvc.unRegisterCtx( 'activeProgramBoard' );
    appCtxSvc.unRegisterCtx( 'isColumnFilteringApplied' );
};

/**
 * PlanNavigationService factory
 */
export default exports = {
    initializePlanNavigationSublocation,
    destroyPlanNavigationSublocation
};
app.factory( 'PlanNavigationService', () => exports );

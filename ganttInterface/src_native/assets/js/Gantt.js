// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global,
 document
 */

/**
 * Module to provide the service for SM Gantt.
 *
 *
 * @module js/Gantt
 */
import app from 'app';
import ganttManager from 'js/uiGanttManager';
import ganttService from 'js/GanttService';
import AwPromiseService from 'js/awPromiseService';
import eventBus from 'js/eventBus';
import 'js/exist-when.directive';

var exports = {};
var deferred;

export let loadGantt = ( data, subPanelContextInfo ) => {
    deferred = AwPromiseService.instance.defer();

    var processorPromise = ganttService.initializeProcessorClass( data, subPanelContextInfo, deferred );
    processorPromise.then( () => {
        var dataProvider = ganttService.readDataProvider( subPanelContextInfo );
        var providerPromise = ganttService.readGanttConfigAndPrepareProvider( data, subPanelContextInfo );

        providerPromise.then( () => {
            ganttManager.getGanttInstance().keep_grid_width = true;
            ganttManager.getGanttInstance().config.columns = data.ganttColumns;
            var ganttTasks = dataProvider.viewModelCollection.loadedVMObjects[ 0 ];
            if( !dataProvider.viewModelCollection || !ganttTasks ) {
                ganttTasks = [];
            }
            let ganttLinks = [];
            if( dataProvider.viewModelCollection.loadedVMObjects[ 1 ] ) {
                ganttLinks = dataProvider.viewModelCollection.loadedVMObjects[ 1 ];
            }
            var ganttData = {
                data: ganttTasks,
                links: ganttLinks
            };

            var height = ganttService.getGanttHeight();
            var ganttWrapper;
            let htmlElems = document.getElementsByClassName( 'aw-ganttInterface-ganttWrapper' );
            if( htmlElems.length > 0 ) {
                ganttWrapper = htmlElems[ 0 ];
            } else {
                ganttWrapper = document.firstElementChild;
            }

            ganttWrapper.style.height = height + 'px';
            data.ganttWrapperHTMLElement = ganttWrapper;

            let isShowGrid = true;
            if( data.ganttOptions.showGrid !== undefined && data.ganttOptions.showGrid === false ) {
                isShowGrid = false;
            }
            ganttService.addResizeListener( data );

            var eventData = ganttService.prepareCalendarForGantt();
            eventData.forEach( ( event ) => {
                ganttManager.getGanttInstance().setWorkTime( event );
            } );
            let dates = ganttService.setupDates( subPanelContextInfo );
            ganttManager.setLocalisedValues( dates );

            var startTime = new Date().getTime();

            let plugins = ganttService.getGanttPlugins();
            ganttManager.getGanttInstance().plugins( plugins );
            ganttManager.getGanttInstance().init( ganttWrapper );
            ganttService.prepareGanttCustomisations( isShowGrid, subPanelContextInfo );

            var endTime = new Date().getTime();
            var delta = endTime - startTime;
            var total = ganttTasks.length;
            ganttManager.debugMessage( '1. Total time for init ' + total + ' objects took ' + delta +
                ' milliseconds' );

            startTime = new Date().getTime();

            ganttManager.getGanttInstance().parse( ganttData, 'json' );
            ganttService.afterRenderCallback( subPanelContextInfo );

            endTime = new Date().getTime();
            delta = endTime - startTime;
            total = ganttTasks.length;
            ganttManager.debugMessage( '2. Total time for parse ' + total + ' objects took ' + delta +
                ' milliseconds' );

            ganttService.registerEventListeners( subPanelContextInfo );

            dataProvider.ganttInitialized = true;
            eventBus.publish( subPanelContextInfo.ganttid + '.ganttInitialized' );
        } );
    } );
};

export let unLoadGantt = () => {
    ganttService.cleanup();
    ganttManager.destroyGanttInstance();
    deferred.resolve();
};

export default exports = {
    loadGantt,
    unLoadGantt
};

app.factory( 'awGantt', () => exports );

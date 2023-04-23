// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/Saw1ResourceChartService
 */

'use strict';

import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import uwPropertySvc from 'js/uwPropertyService';
import awColumnSvc from 'js/awColumnService';
import awTableSvc from 'js/awTableService';
import iconSvc from 'js/iconService';
import 'js/selection.service';
import 'js/appCtxService';
import tcViewModelObjectSvc from 'js/tcViewModelObjectService';
import matrixSelectionService from 'js/awMatrixSelectionService';
import smConstants from 'js/ScheduleManagerConstants';
import AwPromiseService from 'js/awPromiseService';
import dateTimeSvc from 'js/dateTimeService';

var exports = {};
/**
 * Cached static default AwTableColumnInfo.
 */

/**
 * Cached static default ViewModelRows.
 */
var _flatTableRows = null;

var _graphStartDate = null;

/**
 * @param {data} data - The qualified data of the viewModel
 * @return {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 */
function getFlatTableColumnInfos( data ) {
    var _flatTableColumnInfos = null;
    _flatTableColumnInfos = buildFlatTableColumnInfos( data );
    return _flatTableColumnInfos;
}

function initializeMonthFull( data ) {
    var month_full = [];
    month_full.push( data.i18n.saw1Month_Jan );
    month_full.push( data.i18n.saw1Month_Feb );
    month_full.push( data.i18n.saw1Month_Mar );
    month_full.push( data.i18n.saw1Month_Apr );
    month_full.push( data.i18n.saw1Month_May_short );
    month_full.push( data.i18n.saw1Month_Jun );
    month_full.push( data.i18n.saw1Month_Jul );
    month_full.push( data.i18n.saw1Month_Aug );
    month_full.push( data.i18n.saw1Month_Sep );
    month_full.push( data.i18n.saw1Month_Oct );
    month_full.push( data.i18n.saw1Month_Nov );
    month_full.push( data.i18n.saw1Month_Dec );
    return month_full;
}

function initializeDayFull( data ) {
    var days = [];
    days.push( data.i18n.saw1Day_Sun );
    days.push( data.i18n.saw1Day_Mon );
    days.push( data.i18n.saw1Day_Tue );
    days.push( data.i18n.saw1Day_Wed );
    days.push( data.i18n.saw1Day_Thu );
    days.push( data.i18n.saw1Day_Fri );
    days.push( data.i18n.saw1Day_Sat );

    return days;
}


/**
 * @param {date} date - Date to convert into format dd-mmm-yyyy.
 * @param {data} data - The qualified data of the viewModel
 * @returns Returns formated string.
 */
function convertToFormat_DDMMMYYYY( date, data ) {
    var day = date.getDate();
    if( day < 10 ) {
        day = '0' + day;
    }
    var today = date.getDay();
    var weekDays = initializeDayFull( data );

    var weekDay = weekDays[today];
    var month_index = date.getMonth();
    var year = date.getFullYear();

    var months = initializeMonthFull( data );
    return day + '-' + months[month_index] + '-' + year + '\n ' + weekDay;
}
/**
 * Function to create an array for dates within mentioned date range
 * @param {date} startDate - start Date for column array
 * @returns Array of columns string.
 */
function createColumnArray( startDate ) {
    var dateArray = [];
    var day = startDate.getDay();
    var offsets = smConstants.DAY_CONSTANTS[day];
    var nextDaysToShow = offsets[ 1 ];

    // seconds * minutes * hours * milliseconds = 1 day
    var day = 60 * 60 * 24 * 1000;
    if( day !== 0 ) {
        var prevDaysToshow = offsets[0];
        for( var prevCount = prevDaysToshow; prevCount > 0; prevCount-- ) {
            var dateToPush = new Date( startDate.getTime() - day * prevCount );
            dateArray.push( dateToPush );
        }
    }
    dateArray.push( startDate );
    for( var nextCount = 1; nextCount <= nextDaysToShow; nextCount++ ) {
       var dateToPush = new Date( startDate.getTime() + day * nextCount );
       dateArray.push( dateToPush );
    }
    return dateArray;
}

/**
 * @param {data} data - The qualified data of the viewModel
 * @return {AwTableColumnInfoArray} Array of column information objects set with specific information.
 */
function buildFlatTableColumnInfos( data ) {
    var columnInfos = [];

    /**
     * Set 1st column to special 'name' column to support tree-table.
     */
    var propName;
    let propDisplayName;
    var isTableCommand;
    var dateArray = [];

    dateArray = createColumnArray( data.startDate );

    var numOfColumnsIn = 15;

    for( var colNdx = 0; colNdx < numOfColumnsIn; colNdx++ ) {
        var columnNumber = colNdx;
        var columnInfo = awColumnSvc.createColumnInfo();
        var selectionHeader = colNdx - 1;
        if( colNdx === 0 ) {
            propName = 'object_name';
            propDisplayName = data.i18n.resources;
            isTableCommand = true;
            columnInfo.headerCellTemplate = '<aw-matrix-column-header title="' + propDisplayName +
                '" prop="col" _colindex="' + selectionHeader + '"  col-index="renderIndex" ></aw-matrix-column-header>';
            columnInfo.cellTemplate = '<aw-matrix-row-header class="aw-jswidgets-tablecell" ' +
                'prop="row.entity.props[col.field]" row="row"></aw-matrix-row-header>';
            columnInfo.width = 160;
            columnInfo.minWidth = 160;
            columnInfo.height = 25;
            columnInfo.minHeight = 25;
            columnInfo.maxHeight = 25;
        } else {
            propName = 'prop' + columnNumber;
            propDisplayName = convertToFormat_DDMMMYYYY( dateArray[colNdx - 1], data );
            isTableCommand = true;
            // Add if else condition as per capacity
            columnInfo.headerCellTemplate = '<aw-matrix-column-header title="' + propDisplayName +
                '" prop="col" _colindex="' + selectionHeader + '"  col-index="renderIndex" ></aw-matrix-column-header>';
            columnInfo.cellTemplate = '<aw-matrix-cell prop="row.entity.props[col.field]" row="row" _colindex="' +
                colNdx + '" title=""></aw-matrix-cell>';
            columnInfo.width = 110;
            columnInfo.minWidth = 110;
            columnInfo.maxWidth = 110;
            columnInfo.height = 25;
            columnInfo.minHeight = 25;
            columnInfo.maxHeight = 25;
            columnInfo.dbValue = dateTimeSvc.formatUTC( dateArray[colNdx - 1] );
        }
        /**
         * Set values for common properties
         */
        columnInfo.name = propName;
        columnInfo.displayName = propDisplayName;
        columnInfo.enableFiltering = true;
        columnInfo.isTableCommand = isTableCommand;
        columnInfo.position = 'right';

        columnInfo.enablePinning = true;
        /**
          * Set values for un-common properties
        */
        columnInfo.typeName = 'String';
        columnInfo.enablePinning = true;
        columnInfo.enableSorting = false;
        columnInfo.enableColumnMenu = false;
        columnInfo.enableCellEdit = true;
        columnInfos.push( columnInfo );
    }
    return columnInfos;
}


/**
 * get start in UTC format
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {ctx}  ctx  - Context Object
 */
export let getStartDate = function( data, ctx ) {
    if( ctx.twoWeeksDate ) {
        data.startDate = ctx.twoWeeksDate;
        ctx.twoWeeksDate = null;
    } else if( data.eventData && data.eventData.newStartDate ) {
        data.startDate = new Date( dateTimeSvc.formatUTC( data.eventData.newStartDate ) );
    }else if( !data.startDate && ctx.resourceLoadTableData ) {
        data.startDate = ctx.resourceLoadTableData.startDate;
    }else {
        data.startDate = new Date();
    }

    var day = data.startDate.getDay();
    var offsets = smConstants.DAY_CONSTANTS[day];
    var prevDaysToshow = offsets[0];
    data.startDate.setDate( data.startDate.getDate() - prevDaysToshow );

    var startDateString = dateTimeSvc.formatUTC( data.startDate );
    _graphStartDate = data.startDate;
    return startDateString;
};


/**
 * get workload option (All Schedule/Current Schedule)
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {ctx}  ctx  - Context Object
 */
export let getWorkload = function( data, ctx ) {
    if( data.eventData && data.eventData.newStartDate ) {
        ctx.radioSelection = data.eventData.radioSelection;
    }
    var workload = [];
    if( ctx.radioSelection && ctx.radioSelection === true ) {
       workload.push( ctx.xrtSummaryContextObject );
    } else{
        ctx.radioSelection = false;
    }

    ctx.resourceLoadTableData = data;
    return workload;
};

export let isCurrentSchedule = function( ctx, data ) {
    data.workloadRadio.dbValue = JSON.parse( ctx.radioSelection );
};

/**
 * @param {response} response - SOA response
 * @param {data} data - The qualified data of the viewModel
 * @param {ctx}  ctx  - Context Object
 */
export let loadTableData = function( response, data, ctx ) {
    data.resourceLoadResponse = response;
    var searchResults = loadFlatTableData( data, ctx );
    data.dataProviders.resourceChartDataProvider.viewModelCollection.loadedVMObjects = searchResults;

    return searchResults;
};

/**
 * set start date as Next two weeks or Previous Two Weeks
 *
 * @param {bool} isNextWeek - true Next two weeks/ false Previous Two Weeks
 * @param {ctx}  ctx  - Context Object
 */
export let setTwoWeeksDate = function( isNextWeek, ctx ) {
   var day = 60 * 60 * 24 * 1000;
   let updatedStartDate;
   if( isNextWeek ) {
    updatedStartDate = new Date( _graphStartDate.getTime() + day * 14 );
    ctx.twoWeeksDate = updatedStartDate;
   } else {
    updatedStartDate = new Date( _graphStartDate.getTime() - day * 14 );
    ctx.twoWeeksDate = updatedStartDate;
   }
};

/**
 * Function to build rows of Resource Load Graph
 *
 * @param {AwTableColumnInfoArray} columnInfos - Array of column objects to use when building the
 *            table rows.
 * @param {data} data - The qualified data of the viewModel
 * @returns {ViewModelRowArray} Array of row objects in a 'flat' table (no hierarchy)
 */
function buildFlatTableRows( data, columnInfos ) {
    var vmRows = [];
    var load = 0;
    var scheduleMembersObjs = [];

    for( var count = 0; count < data.resourceLoadResponse.resourceChartInfoList.length; count++ ) {
        var obj = tcViewModelObjectSvc.createViewModelObjectById( data.resourceLoadResponse.resourceChartInfoList[ count].resource );
        scheduleMembersObjs.push( obj );
    }

    for( var rowNdx = 0; rowNdx < data.resourceLoadResponse.resourceChartInfoList.length; rowNdx++ ) {
        var rowNumber = rowNdx + 1;

        var vmObject = scheduleMembersObjs[rowNdx];

        var dbValues;
        var displayValues;

        _.forEach( columnInfos, function( columnInfo, columnNdx ) {
            var columnNumber = columnNdx;
            if( columnNumber === 0 ) {
                dbValues = [ rowNumber ];
                displayValues = [ scheduleMembersObjs[rowNumber - 1].cellHeader1 ];
            } else if( columnInfo.isTableCommand ) {
                dbValues = [ rowNumber ];
                //Get Percent load from response
                load = data.resourceLoadResponse.resourceChartInfoList[rowNumber - 1].resourceInfoPerDay[columnNumber - 1].resourceInfo[3].keyValue;
                var isWorkingDay = JSON.parse( data.resourceLoadResponse.resourceChartInfoList[rowNumber - 1].resourceInfoPerDay[columnNumber - 1].resourceInfo[4].keyValue );
                if( load % 1 === 0 ) {
                    load = Math.trunc( load );
                }
                if ( isWorkingDay ) {
                    if ( load <= 25 ) {
                        displayValues = [ '<p class="resourceLoad25 aw-splm-tableCellText gwt-TextBox" STYLE="height: 31px; width: 108.48px;">' + load + '%</p>' ];
                    } else if ( load <= 50 ) {
                        displayValues = [ '<p class="resourceLoad50 aw-splm-tableCellText gwt-TextBox" STYLE="height: 31px; width: 108.48px;">' + load + '%</p>' ];
                    } else if ( load <= 75 ) {
                        displayValues = [ '<p class="resourceLoad75 aw-splm-tableCellText gwt-TextBox" STYLE="height: 31px; width: 108.48px;" >' + load + '%</p>' ];
                    } else if ( load <= 100 ) {
                        displayValues = [ '<p class="resourceLoad100 aw-splm-tableCellText gwt-TextBox" STYLE="height: 31px; width: 108.48px;">' + load + '%</p>' ];
                    } else {
                        displayValues = [ '<p class="resourceLoad101 aw-splm-tableCellText gwt-TextBox" STYLE="height: 31px; width: 108.48px;">' + load + '%</p>' ];
                    }
                } else{
                    displayValues = [ '<p class="resourceLoadWeekend aw-splm-tableCellText gwt-TextBox" STYLE="height: 31px; width: 108.48px;">-</p>' ];
                }
            }


            var vmProp = uwPropertySvc.createViewModelProperty( columnInfo.name, columnInfo.displayName,
                columnInfo.typeName, dbValues, displayValues );
            vmProp.uiValues = [ '<span style="height: 25px;width: 25px;background-color: maroon;border-radius: 50%;display: inline-block;color: maroon;"></span>' + '50' ];

            //vmProp.typeIconURL = iconSvc.getTypeIconURL( obj.type );
            vmProp.propertyDescriptor = {
                displayName: columnInfo.displayName,
                rowIdx: rowNdx
            };

            if( columnInfo.isTableCommand ) {
                vmProp.typeIconURL = iconSvc.getTypeIconURL( vmObject.type );
            }

            vmObject.props[columnInfo.name] = vmProp;
        } );

        vmRows.push( vmObject );
    }

    return vmRows;
}

/**
 * Resolve the 'next' page of row data.
 *
 * @param {Object} data - An Object (usually the DeclViewModel on the $scope) this action function is invoked
 *            from. The r/o 'pageSize' and r/w 'searchIndex' properties on this object are used.
 *
 * <pre>
 * {
 *     pageSize : {Number} (Optional) Maximum number of rows to return. If not set, default is 20.
 *     searchIndex : {Number} Next page index to be returned (or -1 if no more data)
 * }
 * </pre>
 *
 * @param {DeferredResolution} deferred - Deferral to resolve with the requested row data.
 * @param {ViewModelRowArray} vmRows - Array of all rows in the table.
 */
function loadFlatTableRows( data, deferred, vmRows ) {
    var pageSize = vmRows.length;
    var searchIndex = 0;

    if( data.searchIndex ) {
        searchIndex = data.searchIndex;
    }

    if( searchIndex < 0 ) {
        deferred.resolve( awTableSvc.createTableLoadResult( vmRows.length ) );
        return;
    }

    var begNdx = searchIndex * pageSize;

    if( begNdx >= vmRows.length ) {
        deferred.resolve( awTableSvc.createTableLoadResult( vmRows.length ) );
        return;
    }

    var endNdx = begNdx + pageSize;

    if( endNdx > vmRows.length ) {
        endNdx = vmRows.length;
    }

    var nextSearchIndex = searchIndex + 1;

    if( endNdx === vmRows.length ) {
        nextSearchIndex = -1;
    }

    var loadResult = awTableSvc.createTableLoadResult( vmRows.length );

    loadResult.searchResults = vmRows.slice( begNdx, endNdx );
    loadResult.searchIndex = nextSearchIndex;

    deferred.resolve( loadResult );
    return loadResult;
}

var exports = {};

/**
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} uwDataProvider - An Object (usually a UwDataProvider) on the DeclViewModel on the $scope this
 *            action function is invoked from.
 * @return {Promise} A Promise that will be resolved with the requested data when the data is available.
 *
 * <pre>
 * {
 *     columnInfos : {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 * }
 * </pre>
 */
export let loadFlatTableColumns = function( uwDataProvider, data ) {
    var deferred = AwPromiseService.instance.defer();
    if ( data ) {
        uwDataProvider.columnConfig = {
            columns: getFlatTableColumnInfos( data )
        };

        deferred.resolve( {
            columnInfos: getFlatTableColumnInfos( data )
        } );
    }
    return deferred.promise;
};

/**
* selection logic to select the cell in resourseGraph grid
*
* @param {object} eventData event data from the grid cell selection
*/
export let setResourceCellSelection = function( eventData, eventMap, ctx ) {
    if ( eventData && eventData.selectedObjects && eventMap['resourceLoadViewTable.gridCellSelection'] ) {
        let newRowCol = eventData.selectedObjects;
        matrixSelectionService.setCellSelection( eventData );
        if ( newRowCol.row.entity && newRowCol.row.entity.uid && newRowCol.col.colDef && newRowCol.col.colDef.dbValue ) {
            var startDateStr = newRowCol.col.colDef.dbValue;
            var resources = newRowCol.row.entity.uid;
            var assignedObject = ctx.xrtSummaryContextObject.uid;
            if ( startDateStr && resources && assignedObject ) {
                eventData.startDate = startDateStr;
                eventData.resources = resources;
                eventData.assignedObjects = assignedObject;
                let schToInclude = '';
                if( ctx.radioSelection ) {
                    schToInclude = assignedObject;
                }
                eventData.schedulesToInclude = schToInclude;
                eventBus.publish( 'Saw1ResourceChart.cellSelected', eventData );
            }
        }
    }
};

/**
 * Get a page of row data for a 'flat' table.
 *
 * @param {Object} data - An Object (usually the DeclViewModel on the $scope) this action function is invoked
 *            from. The r/o 'pageSize' and r/w 'searchIndex' properties on this object are used.
 * @param {String} decoration - Text to pre-pend to cell displayVals
 *
 * @return {Promise} A Promise that will be resolved with the requested data when the data is available.
 *
 */
function loadFlatTableData( data, ctx, decoration ) {
    if( !decoration ) {
        decoration = '';
    }
    var deferred = AwPromiseService.instance.defer();
    _flatTableRows = buildFlatTableRows( data, getFlatTableColumnInfos( data ) );

    var loadData = loadFlatTableRows( data, deferred, _flatTableRows );
    deferred.promise;
    if( loadData ) {
        return loadData.searchResults;
    }
    return '';
}

/**
 * set command context.
 * @param {data} data - The qualified data of the viewModel
 * @param {ctx}  ctx  - Context Object
 */
export let setCommandContextSearchCriteria = function( data, ctx ) {
    if ( !data.commandContext ) {
        data.commandContext = {};
    }

    data.commandContext.searchCriteria = {
        searchContentType: 'ResourceChartAssignedTasks',
        resources: data.eventMap['Saw1ResourceChart.cellSelected'].resources,
        assignedObjects: data.eventMap['Saw1ResourceChart.cellSelected'].assignedObjects,
        startDate: data.eventMap['Saw1ResourceChart.cellSelected'].startDate,
        endDate: data.eventMap['Saw1ResourceChart.cellSelected'].startDate,
        schedulesToInclude: data.eventMap['Saw1ResourceChart.cellSelected'].schedulesToInclude,
        objectSet: 'Saw1TaskSearchProvider.ScheduleTask',
        parentUid: ctx.xrtSummaryContextObject.uid
    };

    let contextObjectName = ctx.xrtSummaryContextObject.props.object_name.dbValues[0];
    data.commandContext.displayTitle = contextObjectName.replace( /\s/g, '_' ) + '_assignedTasks';
};

export default exports = {
    loadFlatTableColumns,
    setResourceCellSelection,
    loadTableData,
    getStartDate,
    getWorkload,
    setTwoWeeksDate,
    isCurrentSchedule,
    setCommandContextSearchCriteria
};


/**
 * This service creates name value property
 *
 * @memberof NgServices
 * @member Awp0NameValueCreate
 */
app.factory( 'Saw1ResourceChartService', () => exports );

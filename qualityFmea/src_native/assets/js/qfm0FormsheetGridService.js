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
 * This file is used as service file for creating  formsheet for Quality FMEA module
 *
 * @module js/qfm0FormsheetGridService
 */
import eventBus from 'js/eventBus';
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import localeService from 'js/localeService';
import appCtxService from 'js/appCtxService';
import qfm0FormsheetDataService from 'js/qfm0FormsheetDataService';
import tcCommandVisibilityService from 'js/tcCommandVisibilityService';
import _ from 'lodash';
import angular from 'angular';
import $ from 'jquery';

var exports = {};
const LIST_TYPES = {
    ordered: 'ordered',
    unordered: 'unordered'
};

export let createFormsheetRows = function ( formsheetData, modelObjects, totalRowsFound ) {
    var columnRowsData = [];
    var datasource = {};
    datasource.totalCount = totalRowsFound;
    datasource.tasks = [];
    columnRowsData = formsheetData.rows;
    var colkeyData;
    var uid;
    var propertyName;
    var additionalData;
    var displayValue;
    if ( columnRowsData.length > 0 && formsheetData.rows && modelObjects !== undefined && modelObjects !== null && modelObjects !== {} ) {
        for ( var i = 0; i < columnRowsData.length; i++ ) {
            var obj = {};
            for ( var j = 0; j < columnRowsData[i].cell.length; j++ ) {
                let cssClass;
                uid = columnRowsData[i].cell[j].uid;
                propertyName = columnRowsData[i].cell[j].propertyName;
                colkeyData = columnRowsData[i].cell[j].colKey;
                additionalData = columnRowsData[i].cell[j].additionalData;
                displayValue = columnRowsData[i].cell[j].displayValue;
                if (columnRowsData[i].cell[j].class) {
                    cssClass = columnRowsData[i].cell[j].class;
                }
                var cellObj = {};
                if ( uid !== '' ) {
                    cellObj = {
                        displayValue: displayValue,
                        cellObject: modelObjects[uid],
                        mergeStrategy: columnRowsData[i].cell[j].merge,
                        additionalData: additionalData
                    };
                    if (cssClass) {
                        cellObj.cssClass = cssClass;
                        cssClass ="";
                    }
                    if( columnRowsData[i].cell[j].intermediateObjectUid ) {
                        let relationObj = modelObjects[columnRowsData[i].cell[j].intermediateObjectUid];
                    if( relationObj ) {
                        cellObj.relationObjType = relationObj.type;
                        cellObj.primaryFailureObjectId = relationObj.props.primary_object ? relationObj.props.primary_object.dbValues[0] : '';
                        cellObj.primaryFailureObjectType = cellObj.primaryFailureObjectId ? modelObjects[cellObj.primaryFailureObjectId].type : '';
                    }
                    }
                }
                else {
                    cellObj = {
                        cellObject: '',
                        mergeStrategy: columnRowsData[i].cell[j].merge,
                        additionalData: additionalData
                    };
                    if (cssClass) {
                        cellObj.cssClass = cssClass;
                        cssClass ="";
                    }
                }
                obj[colkeyData] = cellObj;
            }
            obj.uniqueID = i;
            datasource.tasks.push( obj );
        }
        return datasource;
    }
    return datasource;
};

export let createFormsheetGrid = function ( datasource, formsheetData, totalRowsFound ) {
    datasource.totalCount = totalRowsFound;
    var columnConfig = [];
    columnConfig = formsheetData.columns;
    var ob = { headerText: 'Unique ID', key: 'uniqueID', dataType: 'number', hidden: true };
    columnConfig.push( ob );
    if ( formsheetData.columns && columnConfig.length > 0 ) {
        _.forEach( columnConfig, function ( config ) {
            if(config.group === null || config.group === undefined) {
                config.mapper = function ( record ) {
                    var key = config.key;
                    if ( record && record[key] ){
                        return record[key];
                    }
                    return '';
                };

                var formatterFunction;
                formatterFunction = function( val ) {
                    if( val.additionalData && val.additionalData.length > 0 ) {
                        return createListWithBullets( val, config );
                    }else if ( val.displayValue ) {
                        return val.displayValue;
                    }
                    return '';
                };
                config.formatter = formatterFunction;
            }
            else {
                _.forEach( config.group, function ( grp ) {
                    grp.mapper = function ( record ) {
                        var key = grp.key;
                        if ( record && record[key] && record[key].displayValue ) {
                            return record[key];
                        }
                        return '';
                    };

                    var formatterFunction;
                    formatterFunction = function( val ) {
                        if( val.additionalData && val.additionalData.length > 0 ) {
                            return createListWithBullets( val, grp );
                        }else if ( val.displayValue ) {
                            return val.displayValue;
                        }
                        return '';
                    };
                    grp.formatter = formatterFunction;
                }
                );
            }
        } );
    }

    var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaFormsheetMessages';
    var localTextBundle = localeService.getLoadedText( resource );

    $( '#grid-mrl' ).igGrid( {
        width: '100%',
        height: '800px',
        dataSource: datasource,
        responseDataKey: 'tasks',
        dataSourceType: 'json',
        defaultColumnWidth: '200px',
        primaryKey: 'uniqueID',
        autoGenerateColumns: true,
        allowScrolling: true,
        columns: columnConfig,
        autoCommit: true,
        enableHoverStyles: false,
        rowsRendered: function (evt, ui) {
            var rowCellData = $('#grid-mrl').data('igGrid').dataSource.dataView();
            let rowsLength = $("#grid-mrl").igGrid("allRows").length;
            for (let i = 0; i <= rowsLength-1; i++) {
                var row = $("#grid-mrl").igGrid("allRows")[i];
                var currentRowcells = row.querySelectorAll('tr > td');
                for (let j = 0; j <= currentRowcells.length-1; j++) {
                    var currrentRowCell = currentRowcells[j];
                    var gridColumndId = currrentRowCell.attributes['aria-describedby'];
                    var gridColumnIdValue = gridColumndId.value;
                    var columnKey = gridColumnIdValue.split("grid-mrl_")[1];
                    var currentRowCellData = rowCellData[i];
                    var cellData = currentRowCellData[columnKey];
                    if (cellData.cssClass !== undefined && cellData.cssClass !== '' && cellData.cssClass !== null) {
                        var classes =[];
                        classes = cellData.cssClass.split(' ');
                        _.forEach(classes, function (childClass) {
                            currrentRowCell.classList.add(childClass);
                        });
                    }
                }
            }
        },
        features: [
            {
                name: 'CellMerging',
                mergeOn: 'always',
                mergeType: 'physical',
                mergeStrategy: function ( prevRec, curRec, columnKey ) {
                    return curRec[columnKey].mergeStrategy;
                }

            },
            {
                name: 'MultiColumnHeaders'
            },
            {
                name: 'Resizing'
            },
            {
                name: 'Selection',
                mode: 'cell',
                persist: true,
                cellSelectionChanging: function ( evt, ui ) {
                    var cellData = $( '#grid-mrl' ).data( 'igGrid' ).dataSource.dataView();
                    if ( ui.cell !== null ) {
                    var value = cellData[ui.cell.rowIndex][ui.cell.columnKey].cellObject;
                    if ( appCtxService.ctx.activeToolsAndInfoCommand && value.uid !== appCtxService.ctx.selected.uid ) {
                        var eventData = {
                            source: 'toolAndInfoPanel'
                        };
                        eventBus.publish( 'complete', eventData );
                    }

                        var fields = $( '#grid-mrl' ).data( 'igGrid' ).dataSource.schema().fields();
                        appCtxService.ctx.formsheetContext.columnKey = '';
                        appCtxService.ctx.formsheetContext.failureCausePrimaryObject = '';
                        var selectedField = fields.find( function ( field ) {
                            return field.name === ui.cell.columnKey;
                        } );
                        if ( appCtxService.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_FormSheet' || appCtxService.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_FormSheet' ) {
                            if ( selectedField.type === 'object' ) {
                                appCtxService.ctx.selected = value;
                                appCtxService.ctx.mselected[0] = value;
                                appCtxService.ctx.formsheetContext.relationObjType = cellData[ui.cell.rowIndex][ui.cell.columnKey].relationObjType;
                                appCtxService.ctx.formsheetContext.failureCausePrimaryObject = {};
                                appCtxService.ctx.formsheetContext.failureCausePrimaryObject.uid = cellData[ui.cell.rowIndex][ui.cell.columnKey].primaryFailureObjectId;
                                appCtxService.ctx.formsheetContext.failureCausePrimaryObject.type = cellData[ui.cell.rowIndex][ui.cell.columnKey].primaryFailureObjectType;

                                //Force getVisibleCommands call
                                var forceRefreshVisibility = function() {
                                    tcCommandVisibilityService.getVisibleCommands( true ).then( function( visibleCommands ) {
                                        appCtxService.updateCtx( 'visibleServerCommands', visibleCommands );
                                    } );
                                };
                                forceRefreshVisibility();
                            } else {
                                appCtxService.ctx.selected = null;
                                appCtxService.ctx.mselected = [];
                                appCtxService.ctx.formsheetContext.relationObjType = '';
                                appCtxService.ctx.formsheetContext.failureCausePrimaryObject = '';
                                appCtxService.ctx.formsheetContext.failureCausePrimaryObject = {};
                            }
                        }
                    }
                }
            },
            {
                name: 'Paging',
                pageSize: 25,
                type: 'remote',
                recordCountKey: 'totalCount',
                locale: {
                    prevPageLabelText: localTextBundle.qfm0Prev,
                    nextPageLabelText: localTextBundle.qfm0Next
                },
                showPageSizeDropDown: false,
                showPagerRecordsLabel: false,
                showFirstLastPages: false,
                pageIndexChanging: function ( ui, args ) {
                    $( '#grid-mrl' ).igGridSelection( 'clearSelection' );
                    var startIndex = args.newPageIndex * args.owner.options.pageSize;
                    getNewPageData( startIndex, args.owner.options.pageSize, args.newPageIndex );
                },
                pageIndexChanged: function ( ui, args ) { }
            }
        ]
    } );


    function getNewPageData( startIndex, pageSize, pageIndex ) {
        var promise = getFormSheetData( startIndex, pageSize, pageIndex );
        if ( promise ) {
            promise.then( function ( dataSource ) {
                $( '#grid-mrl' ).igGrid( 'option', 'dataSource', dataSource );
            } );
        }
    }
};

export let changeFormsheetPage = function ( dataSource, pageIndex ) {
    $( '#grid-mrl' ).data( 'igGridPaging' ).options.currentPageIndex = pageIndex;
    $( '#grid-mrl' ).igGridSelection( 'clearSelection' );
    $( '#grid-mrl' ).igGrid( 'option', 'dataSource', dataSource );
};

var getFormSheetData = function ( startIndex, pageSize ) {
    var deferred = AwPromiseService.instance.defer();
    var promise = qfm0FormsheetDataService.getFormsheetData( startIndex, pageSize );
    if ( promise ) {
        promise.then( function ( response ) {
            var formsheetDataJSON = JSON.parse( response.formSheetViewModel );
            if ( response.formSheetViewModel ) {
                var datasource = exports.createFormsheetRows( formsheetDataJSON, response.ServiceData.modelObjects, formsheetDataJSON.cursor.totalFound );
                deferred.resolve( datasource );
            }
        } );
    }
    return deferred.promise;
};

var createListWithBullets = function( val, grp ) {
    var cellMainText = val.cellObject ? val.cellObject.props[grp.propertyName].uiValues[0] : '';
    var updatedFormat = '<p>' + cellMainText + '</p>';
    val.additionalData.forEach( ( item )=>{
        if(item.listType) {
            var defaultItemMarkerType = (item.listType && item.listType === LIST_TYPES.ordered) ? 'decimal':'disc';
            var listItemMarkerType = item.itemMarker ? item.itemMarker : defaultItemMarkerType;
            var listCssClass = 'class=\'aw-qualityFmea-formsheetBullets\' style=\'--listStyleType:' + listItemMarkerType + '\'>';
            var listStartTag = item.listType === LIST_TYPES.ordered ? '<ol '  : '<ul ';
            var listEndTag = item.listType === LIST_TYPES.ordered ? '</ol>' : '</ul>';
            updatedFormat += listStartTag + listCssClass + '<lh>' + item.title + '</lh>';
            if( item.Data && item.Data.length > 0 ) {
                if(item.cssClass){
                    item.Data.forEach((data) => {
                        updatedFormat += '<li class=' + item.cssClass + '>' + data + '</li>';
                    });
                }
                else{
                    item.Data.forEach( ( data )=>{
                        updatedFormat += '<li>' + data + '</li>';
                    } );
                }                
            }
            updatedFormat += listEndTag;
        }
        else {
            if(item.title){
                updatedFormat += '<p><span style=\'font-weight:bold\'>' + item.title + ': </span>';
            }
            else {
                updatedFormat += '<p>';
            }

            if( item.Data && item.Data.length > 0 ) {
                if(item.cssClass)
                {
                    item.Data.forEach((data) => {
                        updatedFormat += '<span class=' + item.cssClass + '>' + data + '</span><br>';
                    });
                }
                else{
                    item.Data.forEach( ( data )=>{
                        updatedFormat += '<span>' + data + '</span><br>';
                    } );
                }                
            }
            updatedFormat += '</p>';
        }
    } );
    return updatedFormat;
};

export default exports = {
    createFormsheetRows,
    createFormsheetGrid,
    changeFormsheetPage
};
app.factory( 'qfm0FormsheetGridService', () => exports );

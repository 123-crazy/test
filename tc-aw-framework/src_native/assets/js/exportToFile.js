//@<COPYRIGHT>@
//==================================================
//Copyright 2016.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * Module for the Export to Office panel
 *
 * @module js/exportToFile
 */

import app from 'app';
import uwPropertySvc from 'js/uwPropertyService';
import appCtxService from 'js/appCtxService';
import dateTimeService from 'js/dateTimeService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

var allColumns = {};
var selectedColumns = {};

var _MAX_FILENAME_CHARACTERS = 49;

/**
 * Move one down or up from list
 *
 * @param {Object} dataProvider - dataprovider
 * @param {Object} moveTo - Direction to move to
 */
export let moveUpDown = function( dataProvider, moveTo ) {
    var sortColumns = dataProvider.exportColumnList;
    var selectedCount = sortColumns.getSelectedIndexes()[ 0 ];
    if( moveTo === 'Down' ) {
        selectedColumns = move( selectedColumns, selectedCount, selectedCount + 1 );
    }
    if( moveTo === 'Up' ) {
        selectedColumns = move( selectedColumns, selectedCount, selectedCount - 1 );
    }
    // Reapply move up/down command variables
    var excelCntx = appCtxService.getCtx( 'excelListCommands' );
    if ( selectedColumns[ selectedColumns.length - 1 ].selected === true ) {
        excelCntx.enableMoveDown = false;
    } else {
        excelCntx.enableMoveDown = true;
    }
    if ( selectedColumns[ 0 ].selected === true ) {
        excelCntx.enableMoveUp = false;
    } else {
        excelCntx.enableMoveUp = true;
    }

    eventBus.publish( 'exportExcel.updatedColumnList' );
};

var move = function( arr, old_index, new_index ) {
    while( old_index < 0 ) {
        old_index += arr.length;
    }
    while( new_index < 0 ) {
        new_index += arr.length;
    }
    if( new_index >= arr.length ) {
        var k = new_index - arr.length;
        while( k-- + 1 ) {
            arr.push( undefined );
        }
    }
    arr.splice( new_index, 0, arr.splice( old_index, 1 )[ 0 ] );
    return arr;
};
/**
 * Prepares the filename for use by fmsTicket returned.
 * @param {Object} data - viewModel data
 */
var prepareFileName = function( data ) {
    if( !data.exportToExcelFileName ) {
        var fileName = '';
        var panelContext = appCtxService.getCtx( 'panelContext' );
        if( panelContext ) {
            if( panelContext.vmo && panelContext.vmo.props ) {
                var objectName = '';
                if( panelContext.vmo.props.object_name ) {
                    objectName = panelContext.vmo.props.object_name.uiValue;
                }
                if( !objectName && panelContext.vmo.props.object_string ) {
                    objectName = panelContext.vmo.props.object_string.uiValue;
                }

                if( objectName ) {
                    // Add object name, max of 50 characters
                    fileName += objectName.slice( 0, _MAX_FILENAME_CHARACTERS ) + '_';
                }
            }

            if( panelContext.displayTitle ) {
                // Add display title, max of 50 characters
                fileName += panelContext.displayTitle.slice( 0, _MAX_FILENAME_CHARACTERS ) + '_';
            }
        }

        fileName += dateTimeService.formatNonStandardDate( new Date(), 'yyyy-MM-dd_HH-mm-ss' );
        fileName += '.xlsm';
        data.exportToExcelFileName = fileName;
    }
};

/**
 * Refresh export panel Ctx
 */
export let refreshExportCtx = function() {
    // Back button wipes panelContext when navigating from Add subpanel back to main export panel
    // Need to store panelContext before it gets wiped, then retrieve on export
    let panelContext = appCtxService.getCtx( 'panelContext' );

    // Register exportContext
    if( !appCtxService.getCtx( 'exportContext' ) ) {
        appCtxService.registerCtx( 'exportContext', panelContext  );
    } else if( panelContext.columnProvider ) {
        appCtxService.updateCtx( 'exportContext', panelContext );
    }

    let exportContext = appCtxService.getCtx( 'exportContext' );

    if( !panelContext.columnProvider ) {
        appCtxService.updateCtx( 'panelContext', exportContext );
    }
};

/**
 * Prepare column list
 *
 * @param {Object} data - The panel's view model object
 */
export let prepareColumnList = function( data ) {
    refreshExportCtx();

    var columns = appCtxService.getCtx( 'panelContext.dataProvider.columnConfig.columns' ) ||
        appCtxService.getCtx( 'panelContext.columnProvider.columnConfig.columns' ) ||
        appCtxService.getCtx( 'panelContext.columnProvider.columns' );

    if( columns && !data.exportColumns.initialized ) {
        allColumns = [];
        data.exportColumns.dbValue = [];
        data.exportColumns.initialized = true;
        const uniqueColumns = Array.from( new Set( columns.map( a => a.propertyName ) ) )
            .map( propertyName => {
                return columns.find( a => a.propertyName === propertyName );
            } );
        _.forEach( uniqueColumns, function( column ) {
            var displayedLogicalProp = _createViewModelObjectForProperty( column );
            if( !column.hiddenFlag ) {
                data.exportColumns.dbValue.push( displayedLogicalProp );
            }
            allColumns.push( _.clone( displayedLogicalProp, true ) );
        } );

        prepareFileName( data );

        eventBus.publish( 'exportExcel.refreshColumnList' );
        selectedColumns = data.exportColumns.dbValue;
    }
};
/**
 * Create view model property for the property info
 *
 * @param {Object} propInfo - Property info
 * @returns {Object} viewModelObject - view model object for the given property info
 */
var _createViewModelObjectForProperty = function( propInfo ) {
    var dispPropName = propInfo.displayName;
    var viewProp = uwPropertySvc.createViewModelProperty( propInfo.propertyName, dispPropName, 'BOOLEAN', [],
        [] );
    uwPropertySvc.setIsRequired( viewProp, false );
    uwPropertySvc.setIsArray( viewProp, false );
    uwPropertySvc.setIsEditable( viewProp, true );
    uwPropertySvc.setIsNull( viewProp, false );
    uwPropertySvc.setPropertyLabelDisplay( viewProp, 'PROPERTY_LABEL_AT_RIGHT' );
    uwPropertySvc.setValue( viewProp, true );
    return viewProp;
};

/**
 * Remove given column from coulmn list.
 * @param {Object} exportColumns - export columns
 * @param {Object} eventData - eventData with the column to remove
 */
export let removeColumn = function( exportColumns, eventData ) {
    if( eventData && eventData.column ) {
        for( var i = exportColumns.dbValue.length - 1; i >= 0; i-- ) {
            if( exportColumns.dbValue[ i ] === eventData.column ) {
                exportColumns.dbValue.splice( i, 1 );
            }
        }
    }
};

/*
 * Add columns in coulmn list.
 */
export let addColumns = function() {
    selectedColumns = [];
    if( allColumns ) {
        for( var i = 0; i < allColumns.length; i++ ) {
            if( allColumns[ i ].dbValue === true ) {
                selectedColumns.push( allColumns[ i ] );
            }
        }
        var panelContext = appCtxService.getCtx( 'panelContext' );
        var destPanelId = 'Awp0ExportToExcelSub';
        var eventData = {
            destPanelId: destPanelId,
            supportGoBack: true,
            providerName: panelContext.providerName,
            dataProvider: panelContext.dataProvider,
            columnProvider: panelContext.columnProvider,
            searchCriteria: panelContext.searchCriteria
        };
        eventBus.publish( 'awPanel.navigate', eventData );
        eventBus.publish( 'exportExcel.updatedColumnList' );
    }
};
/* Update coulmn list.
 *
 * @param {Object} data - The view model data
 */
export let updateColumnList = function( data ) {
    data.exportColumns.dbValue = selectedColumns;
    eventBus.publish( 'exportExcel.refreshColumnList' );
};
/* Set coulmn list.
 *
 * @param {Object} data - The view model data
 */
export let setColumns = function( data ) {
    // Reset selectedColumns if back was used instead of set columns button
    _.forEach( allColumns, function( column ) {
        uwPropertySvc.setValue( column, true );
    } );
    var selectColumns = _.differenceBy( allColumns, selectedColumns, 'propertyName' );
    _.forEach( selectColumns, function( column ) {
        uwPropertySvc.setValue( column, false );
    } );
    data.allProperties = allColumns;
};
/* Change move up/down command state on selection change
 *
 * @param {Object} data - The view model data
 */
export let columnSelectionChanged = function( data ) {
    var excelCntx = appCtxService.getCtx( 'excelListCommands' );
    var columnListLength = data.exportColumnList.getLength();
    var selectedColumn = data.exportColumnList.selectedObjects[ 0 ];
    if( data.exportColumnList.getItemAtIndex( 0 ) === selectedColumn ) {
        excelCntx.enableMoveUp = false;
    } else {
        excelCntx.enableMoveUp = true;
    }
    if( data.exportColumnList.getItemAtIndex( columnListLength - 1 ) === selectedColumn ) {
        excelCntx.enableMoveDown = false;
    } else {
        excelCntx.enableMoveDown = true;
    }
};
/* Register context to update command state
 */
export let registerCmdContext = function() {
    var jso = {
        enableMoveUp: true,
        enableMoveDown: true
    };
    appCtxService.registerCtx( 'excelListCommands', jso );
};
/* unregister context to update command state
 */
export let unRegisterCmdContext = function() {
    appCtxService.unRegisterCtx( 'excelListCommands' );
};
/* return selected properties
 * @param {Object} data - The view model data
 */
export let getSelectedProperties = function() {
    var properties = [];
    _.forEach( selectedColumns, function( column ) {
        var newProperty = {};
        newProperty.internalName = column.propertyName;
        newProperty.displayName = column.propertyDisplayName;
        properties.push( newProperty );
    } );
    return properties;
};

export let getClientScopeURI = function( columnProvider ) {
    var clientScopeUri = null;
    if( columnProvider && columnProvider.objectSetUri ) {
        clientScopeUri = columnProvider.objectSetUri;
    }

    if( !clientScopeUri ) {
        clientScopeUri = appCtxService.ctx.sublocation.clientScopeURI;
    }

    return clientScopeUri;
};

export default exports = {
    moveUpDown,
    prepareColumnList,
    removeColumn,
    addColumns,
    updateColumnList,
    setColumns,
    columnSelectionChanged,
    registerCmdContext,
    unRegisterCmdContext,
    getSelectedProperties,
    getClientScopeURI,
    refreshExportCtx
};
/**
 * Export to excel panel service utility
 *
 * @memberof NgServices
 * @member exportToFile
 */
app.factory( 'exportToFile', () => exports );

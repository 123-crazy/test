// Copyright (c) 2020 Siemens

/**
 * @module js/mockDataEditorService
 */
import app from 'app';
import _ from 'lodash';
import _t from 'js/splmTableNative';
import arrayTypePropertyParserService from 'js/arrayTypePropertyParserService';
import viewModelObjectService from 'js/viewModelObjectService';
import awSPLMTableCellRendererFactory from 'js/awSPLMTableCellRendererFactory';
import localeService from 'js/localeService';

var exports = {};
var wysTableMockDataColumnConfiguration = [];

var constructMockEditorColumnData = ( columnConfig, addCmdColumn ) => {
    var colData = {
        name: columnConfig.name,
        displayName: columnConfig.displayValue ? localeService.getLoadedTextFromKey( 'propEditorMessages.' + [ columnConfig.displayValue.slice( 7, -2 ) ] ) : columnConfig.name,
        minWidth: 20,
        enableColumnMenu: false,
        enableColumnMoving: false,
        pinnedLeft: true,
        enableSorting: false,
        renderingHint: columnConfig.type === 'string' ? 'textbox' : null,
        width: 150
    };

    if( addCmdColumn ) {
        colData.isTableCommand = true;
        colData.width = 30;
        colData.cellRenderers = [ {
            action: function( column, vmo, tableElem ) {
                var cellContent = _t.Cell.createElement( column, vmo, tableElem );
                // Custom cell template
                cellContent.appendChild( awSPLMTableCellRendererFactory.createCellCommandElement( column, vmo, tableElem ) );
                return cellContent;
            },
            condition: function( column ) {
                return column.isTableCommand === true;
            }
        } ];
    }
    return colData;
};

var getWysTablePropKey = ( property ) => {
    let propKey;
    while( !( property && property.name === 'gridid' ) ) {
        property = property.parentProp;
    }
    property.children.forEach( ( child ) => {
        if( child.name === 'dataProvider' ) {
            propKey = child.refVMLookup + '.' + child.vmProp.dbValue + '.response';
        }
    } );
    return propKey;
};

/*
 * This method creates a structure of data specific to aw-splm-table column structure
 */
export let updateSplmTableDataForNewColumn = function( selectedVmo, wysTableData ) {
    let newAddedColumnUid = selectedVmo.dbValue.viewModelObjects[ selectedVmo.dbValue.viewModelObjects.length - 1 ].uid;
    _.forEach( wysTableData, ( data ) => {
        if( !data.props.hasOwnProperty( newAddedColumnUid ) ) {
            data.props[ newAddedColumnUid ] = {
                type: 'STRING',
                hasLov: false,
                isArray: false,
                uiValue: 'Lorem ipsum',
                displayValue: 'Lorem ipsum',
                value: 'Lorem ipsum',
                isEnabled: true
            };
        }
    } );
};

export let updateDataForWysTable = ( property, data ) => {
    _.set( data.canvasData.viewModel, getWysTablePropKey( property ), data.wysTableData );
};

export let loadMockEditorColumns = function( data ) {
    return data.mockEditorColumns;
};

export let loadMockEditorRows = function( data ) {
    return data.mockEditorData;
};

export let createMockEditorColumnData = ( arrayProperty ) => {
    let columnData = {
        columnInfos: [ constructMockEditorColumnData( {}, true ) ]
    };
    wysTableMockDataColumnConfiguration = arrayProperty.items;
    wysTableMockDataColumnConfiguration.forEach( ( property ) => {
        columnData.columnInfos.push( constructMockEditorColumnData( property, false ) );
    } );
    return columnData;
};

export let deleteSplmTableRowData = function( selectedVmo, wysTableData ) {
    _.forEach( wysTableData, ( data ) => {
        if( data.props.hasOwnProperty( selectedVmo.uid ) ) {
            delete data.props[ selectedVmo.uid ];
        }
    } );
};

export let getWysTableMockData = ( property, viewModel ) => {
    return _.cloneDeep( _.get( viewModel, getWysTablePropKey( property ) ) );
};

export let deleteMockEditorRow = function( selectedVmo, modelObjects ) {
    var indexOfRowtoBeDeleted;
    if( _.isArray( modelObjects ) ) {
        _.forEach( modelObjects, ( modelObject, idx ) => {
            if( modelObject.uid === selectedVmo.uid ) {
                indexOfRowtoBeDeleted = idx;
            }
        } );
        modelObjects.splice( indexOfRowtoBeDeleted, 1 );
    }
};

export let addMockEditorRow = function( modelObjects ) {
    //generate a unique id for each column config
    var id = 'col_' + Math.floor( Math.random() * ( 1000 - 1 ) ) + 1;
    var modelObj = arrayTypePropertyParserService.generateModelObject( id );
    var dummyProperty = {
        value: '',
        displayValue: ''
    };
    wysTableMockDataColumnConfiguration.forEach( ( columnConfig ) => {
        dummyProperty.name = id;
        dummyProperty.type = columnConfig.type;
        modelObj.props[ columnConfig.name ] = arrayTypePropertyParserService.generateModelObjectProps( dummyProperty, false );
    } );

    modelObj = viewModelObjectService.constructViewModelObject( modelObj );
    viewModelObjectService.setEditableStates( modelObj, true, true, true );

    if( !_.isArray( modelObjects ) ) {
        modelObjects = [];
    }
    modelObjects.push( modelObj );
};

exports = {
    updateSplmTableDataForNewColumn,
    updateDataForWysTable,
    loadMockEditorColumns,
    loadMockEditorRows,
    createMockEditorColumnData,
    deleteSplmTableRowData,
    getWysTableMockData,
    deleteMockEditorRow,
    addMockEditorRow
};
export default exports;

app.factory( 'mockDataEditorService', () => exports );

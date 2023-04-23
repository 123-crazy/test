// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * @module js/effectivityGroupTableService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import uwPropertyService from 'js/uwPropertyService';
import localeService from 'js/localeService';
import awMessageService from 'js/messagingService';
import appCtxService from 'js/appCtxService';
import awColumnService from 'js/awColumnService';
import awTableService from 'js/awTableService';
import cdm from 'soa/kernel/clientDataModel';
import dmSvc from 'soa/dataManagementService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

import 'js/editHandlerService';

var _childTypes = [ 'ItemRevision' ];
var _uwDataProvider = null;

var exports = {};
var self = {};

var validateEffectivityGrpData = function() {
    return true;
};

export let clearEffGrpTable = function( data ) {
    var length = _uwDataProvider.viewModelCollection.loadedVMObjects.length;
    for( var rowNdx = length - 1; rowNdx > 0; rowNdx-- ) {
        _uwDataProvider.viewModelCollection.loadedVMObjects.pop();
    }

    // Clear the values from first row
    uwPropertyService.setValue( _uwDataProvider.viewModelCollection.loadedVMObjects[ 0 ].props.endItem, '' );
    uwPropertyService.setValue( _uwDataProvider.viewModelCollection.loadedVMObjects[ 0 ].props.units, '' );
    data.nameBox.dbValue = '';
};

export let getEffectivitiesInfo = function() {
    var effectivitiesInfo = [];

    var effRows = _uwDataProvider.viewModelCollection.loadedVMObjects;
    for( var rowNdx = 0; rowNdx < effRows.length - 1; rowNdx++ ) {
        var endItem = effRows[ rowNdx ].props.endItem;
        var unitRange = effRows[ rowNdx ].props.units;

        if( endItem.dbValue && unitRange.dbValue[ 0 ] !== '' ) {
            var endItemObj = cdm.getObject( endItem.dbValue );
            var effectivityInfo = {};
            effectivityInfo.clientId = 'createEffectivities';
            effectivityInfo.endItemComponent = {
                uid:   endItemObj.uid,
                type: 'Item'
            };
            effectivityInfo.decision = 0;
            effectivityInfo.unitRangeText = unitRange.dbValue;

            effectivitiesInfo.push( effectivityInfo );
        }
    }
    return effectivitiesInfo;
};

export let getEffectivitiesInfoForEdit = function() {
    var effectivitiesInfo = [];

    var effRows = _uwDataProvider.viewModelCollection.loadedVMObjects;
    for( var rowNdx = 0; rowNdx < effRows.length - 1; rowNdx++ ) {
        var endItem = effRows[ rowNdx ].props.endItem;
        var unitRange = effRows[ rowNdx ].props.units;

        var unitRangeText = unitRange.dbValue.constructor === Array ? unitRange.dbValue[ 0 ] : unitRange.dbValue;
        if( endItem.dbValue && unitRangeText !== '' ) {
            var endItemObj = null;
            if( endItem.type === 'OBJECT' ) {
                endItemObj = cdm.getObject( endItem.dbValue );
            }
            var effectivityInfo = {};
            effectivityInfo.clientId = 'editEffectivities';
            effectivityInfo.decision = 0;

            if( effRows[ rowNdx ].id.length > 2 ) {
                effectivityInfo.effectivityComponent = {
                    uid: effRows[ rowNdx ].id,
                    type: 'Effectivity'
                };
                effectivityInfo.decision = 1;
            }

            if( endItemObj !== null ) {
                effectivityInfo.endItemComponent = {
                    uid: endItemObj.uid,
                    type: 'Item'
                };
            }
            effectivityInfo.unitRangeText = unitRange.dbValue;

            effectivitiesInfo.push( effectivityInfo );
        } else if( effRows[ rowNdx ].id.length > 2 && ( endItem.dbValue === '' || unitRange.dbValue === '' ) ) {
            var effectivityInfo = {};
            effectivityInfo.clientId = 'editEffectivities';
            effectivityInfo.effectivityComponent = {
                uid: effRows[ rowNdx ].id,
                type: 'Effectivity'
            };
            effectivityInfo.decision = 2;
            effectivityInfo.unitRangeText = '';
            effectivityInfo.endItemComponent = {
                uid: '',
                type: 'Item'
            };
            effectivitiesInfo.push( effectivityInfo );
        }
    }
    return effectivitiesInfo;
};

export let updateEndItem = function( eventData, action, messages ) {
    if( eventData ) {
        var selectedObject = eventData.selectedObjects[ 0 ];
        var uidsToLoad = [];
        uidsToLoad.push( selectedObject.uid );
        dmSvc.getProperties( uidsToLoad, [ 'items_tag' ] );
        var selectedItem = selectedObject.props && selectedObject.props.items_tag ? cdm.getObject( selectedObject.props.items_tag.dbValues[0] ) : selectedObject;
        var rowLength = _uwDataProvider.viewModelCollection.loadedVMObjects.length;

        if( rowLength > 1 ) {
            var effRows = _uwDataProvider.viewModelCollection.loadedVMObjects;
            for( var rowNdx = 0; rowNdx < effRows.length - 1; rowNdx++ ) {
                var alreadyAddedEndItem = effRows[ rowNdx ].props.endItem;
                var replaceValue = alreadyAddedEndItem.displayValues[0];
                var messageText = messages;
                if( action === 'Author' ) {
                    if( selectedItem.uid === alreadyAddedEndItem.dbValue ) {
                        messageText = messageText.replace( '{0}', replaceValue );
                        awMessageService.showError( messageText );
                        return;
                    }
                } else if( action === 'Edit' ) {
                    if( alreadyAddedEndItem.dbValue[ 0 ] !== null && selectedItem.uid === alreadyAddedEndItem.dbValue[ 0 ] ) {
                        messageText = messageText.replace( '{0}', replaceValue );
                        awMessageService.showError( messageText );
                        return;
                    }
                } else {
                    if( alreadyAddedEndItem.displayValues[ 0 ] !== null && alreadyAddedEndItem.displayValues[ 0 ].includes( selectedItem.cellHeader2 ) ) {
                        return;
                    }
                }
            }
        }

        var vmProp = null;
        if( eventData.property === undefined ) {
            vmProp = eventData.scope.ctx.panelContext.viewModelProperty;
        } else {
            vmProp = eventData.property;
        }
        uwPropertyService.setValue( vmProp, selectedItem.uid );
        uwPropertyService.setDirty( vmProp, true );

        var viewModelObj = _uwDataProvider.viewModelCollection.loadedVMObjects[ rowLength - 1 ];
        var vmProp = viewModelObj.props.endItem;
        if( vmProp.dbValue[ 0 ] ) {
            _addNewRow();
        }
    }
};

var _addNewRow = function() {
    var effGrpColumnInfos = [];
    var rowNumber = _uwDataProvider.viewModelCollection.loadedVMObjects.length + 1;
    effGrpColumnInfos = _uwDataProvider.columnConfig.columns;
    var vmRow = new ViewModelRow( rowNumber, _childTypes[ 0 ] );

    var dbValues;
    var displayValues;
    _.forEach( effGrpColumnInfos, function( columnInfo, columnNdx ) {
        dbValues = [ '' ];
        displayValues = [ '' ];

        var vmProp = uwPropertyService.createViewModelProperty( columnInfo.name, columnInfo.displayName, columnInfo.typeName, dbValues, displayValues );

        var constMap = {
            ReferencedTypeName: 'ItemRevision'
        };
        var propApi = {
            showAddObject: false
        };
        vmProp.propertyDescriptor = {
            displayName: columnInfo.displayName,
            constantsMap: constMap
        };
        vmProp.propApi = propApi;
        vmProp.isEditable = true;
        vmProp.editableInViewModel = true;
        vmRow.props[ columnInfo.name ] = vmProp;
        vmRow.editableInViewModel = true;
        vmRow.isModifiable = true;
        vmRow.editableInViewModel = true;

        uwPropertyService.setEditable( vmRow.props[ columnInfo.name ], true );

        uwPropertyService.setEditState( vmRow, true );
    } );

    _uwDataProvider.viewModelCollection.loadedVMObjects.push( vmRow );
    return vmRow;
};

export let getEffectivityGroupRevision = function( response ) {
    var newObject = response.output[ 0 ].objects[ 0 ];
    var effItem = cdm.getObject( newObject.uid );
    return cdm.getObject( effItem.props.revision_list.dbValues[ 0 ] );
};

export let getEffGroupsToApply = function( data ) {
    var effGrps = [];
    let egos;
    if( appCtxService.ctx.aceActiveContext
        && appCtxService.ctx.aceActiveContext.context.configContext
        && appCtxService.ctx.aceActiveContext.context.configContext.eg_uids ) {
        egos = { dbValues: appCtxService.ctx.aceActiveContext.context.configContext.eg_uids };
    } else{
        let productContextInfoModelObject = data.contextKeyObject.productContextInfo;
        egos = productContextInfoModelObject.props.awb0EffectivityGroups;
    }
    var appliedEffGrps = egos;
    if( appliedEffGrps ) {
        effGrps = appliedEffGrps.dbValues;
    }

    effGrps.push( data.groupRevision.uid );
    return effGrps;
};

export let updatePartialCtx = function( path, value ) {
    appCtxService.updatePartialCtx( path, value );
};

/**
 * Sends event to make it editable
 *
 * @param {Object} data - data
 * @param {Object} dataProvider - data provider
 */
export let setTableEditable = function( data, dataProvider ) {
    // splm table event
    var context = {
        state: 'starting',
        dataSource: dataProvider
    };
    eventBus.publish( 'editHandlerStateChange', context );
};

export let loadEffectivityGroupTableData = function( data ) {
    var effGrpTableColumns = [];
    effGrpTableColumns = data.dataProviders.effGroupDataProvider.columnConfig.columns;
    if( !effGrpTableColumns ) {
        effGrpTableColumns = _buildEffGroupTableColumnInfos();
    }

    var effGrpTableRows = [];
    effGrpTableRows = _buildEffectivityGroupTableRows( data, effGrpTableColumns );

    var loadResult = awTableService.createTableLoadResult( effGrpTableRows.length );

    loadResult.searchResults = effGrpTableRows;
    loadResult.searchIndex = 0;
    loadResult.totalFound = effGrpTableRows.length;

    return loadResult;
};

var _buildEffectivityGroupTableRows = function( data, columnInfos ) {
    var rowLength = 1;
    var vmRows = [];
    for( var rowNdx = 0; rowNdx < rowLength; rowNdx++ ) {
        var rowNumber = rowNdx + 1;
        var dbValues;
        var displayValues;
        var type = _childTypes[ 0 ];
        var vmRow = new ViewModelRow( rowNumber, type );
        _.forEach( columnInfos, function( columnInfo, columnNdx ) {
            dbValues = [ '' ];
            displayValues = [ '' ];

            var vmProp = uwPropertyService.createViewModelProperty( columnInfo.name, columnInfo.displayName,
                columnInfo.typeName, dbValues, displayValues );

            var constMap = {
                ReferencedTypeName: 'ItemRevision'
            };

            var propApi = {
                showAddObject: false
            };

            vmProp.propertyDescriptor = {
                displayName: columnInfo.displayName,
                constantsMap: constMap
            };
            vmProp.propApi = propApi;

            vmProp.isEditable = true;
            vmProp.editableInViewModel = true;
            vmRow.props[ columnInfo.name ] = vmProp;
            vmRow.editableInViewModel = true;
            vmRow.isModifiable = true;
            vmRow.editableInViewModel = true;
            uwPropertyService.setEditable( vmRow.props[ columnInfo.name ], true );
            uwPropertyService.setEditState( vmRow, true );
        } );

        vmRows.push( vmRow );
    }

    return vmRows;
};

export let loadEffectivityGroupTableDataForEdit = function( data ) {
    var effGrpTableColumns = [];
    effGrpTableColumns = data.dataProviders.effGroupDataProvider.columnConfig.columns;
    if( !effGrpTableColumns ) {
        effGrpTableColumns = _buildEffGroupTableColumnInfos( data );
    }

    data.nameBox.dbValue = appCtxService.ctx.editEffectivityContext.selectedCell.cellHeader1;

    var deferred = AwPromiseService.instance.defer();
    _buildEffectivityGroupTableRowsForEdit( data, deferred, effGrpTableColumns );

    return deferred.promise;
};

var _buildEffectivityGroupTableRowsForEdit = function( data, deferred, columnInfos ) {
    var vmRows = [];

    var grpRevs = [];
    grpRevs.push( appCtxService.ctx.editEffectivityContext.selectedCell.uid );
    dmSvc.getProperties( grpRevs, [ 'Fnd0EffectivityList' ] ).then(
        function() {
            var groupRevs = cdm.getObjects( grpRevs );
            var effectivityList = groupRevs[ 0 ].props.Fnd0EffectivityList;
            if( effectivityList.dbValues.length > 0 ) {
                dmSvc.getProperties( effectivityList.dbValues, [ 'unit_range_text', 'end_item' ] ).then(
                    function() {
                        var effectivities = cdm.getObjects( effectivityList.dbValues );
                        var endItems = [];
                        for( var effIndx = 0; effIndx < effectivities.length; effIndx++ ) {
                            endItems.push( effectivities[ effIndx ].props.end_item.dbValues[ 0 ] );
                        }
                        dmSvc.getProperties( endItems, [ 'revision_list' ] ).then(
                            function() {
                                var rowLength = effectivities.length;

                                for( var rowNdx = 0; rowNdx < rowLength; rowNdx++ ) {
                                    var rowId = effectivityList.dbValues[ rowNdx ];
                                    var dbValues;
                                    var displayValues;
                                    var type = _childTypes[ 0 ];
                                    var vmRow = new ViewModelRow( rowId, type );

                                    var uniRangeText = effectivities[ rowNdx ].props.unit_range_text.uiValues[ 0 ];
                                    var endItem = cdm.getObject( effectivities[ rowNdx ].props.end_item.dbValues[ 0 ] );

                                    _.forEach( columnInfos, function( columnInfo, columnNdx ) {
                                        if( columnNdx === 0 ) {
                                            dbValues = uniRangeText;
                                            displayValues = [ uniRangeText ];
                                        } else {
                                            dbValues = [ endItem.uid ]; // Passing end item uid as platform SOA needs item
                                            displayValues = [ endItem.props.object_string.dbValues[ 0 ] ];
                                        }

                                        var vmProp = uwPropertyService.createViewModelProperty( columnInfo.name, columnInfo.displayName,
                                            columnInfo.typeName, dbValues, displayValues );

                                        var constMap = {
                                            ReferencedTypeName: 'ItemRevision'
                                        };

                                        var propApi = {
                                            showAddObject: false
                                        };

                                        vmProp.propertyDescriptor = {
                                            displayName: columnInfo.displayName,
                                            constantsMap: constMap
                                        };
                                        vmProp.propApi = propApi;

                                        vmProp.isEditable = true;
                                        vmProp.editableInViewModel = true;
                                        vmRow.props[ columnInfo.name ] = vmProp;
                                        vmRow.editableInViewModel = true;
                                        vmRow.isModifiable = true;
                                        vmRow.editableInViewModel = true;
                                        uwPropertyService.setEditable( vmRow.props[ columnInfo.name ], true );
                                        uwPropertyService.setEditState( vmRow, true );
                                    } );

                                    vmRows.push( vmRow );
                                }

                                var emptyRow = _addNewRow();
                                vmRows.push( emptyRow );

                                var loadResult = awTableService.createTableLoadResult( vmRows.length );

                                loadResult.searchResults = vmRows;
                                loadResult.searchIndex = 0;
                                loadResult.totalFound = vmRows.length;

                                deferred.resolve( loadResult );
                            }
                        );
                    } );
            } else {
                var emptyRow = _addNewRow();
                vmRows.push( emptyRow );

                var loadResult = awTableService.createTableLoadResult( vmRows.length );

                loadResult.searchResults = vmRows;
                loadResult.searchIndex = 0;
                loadResult.totalFound = vmRows.length;

                deferred.resolve( loadResult );
            }
        }
    );
};

/**
 * Instances of this class represent the properties and status of a single row in a flat table.
 *
 * @class ViewModelRow
 * @param {String} rowId - Unique ID for this row within the table.
 * @param {String} type - The type of model object represented by this tree node (i.e. 'Item'
 *            'DocumentRevision', etc.).
 */
var ViewModelRow = function( rowId, type ) {
    this.id = rowId;
    this.type = type;
    this.props = {};
};

export let loadEffectivityTableColumns = function( uwDataProvider, data ) {
    _uwDataProvider = uwDataProvider;
    var deferred = AwPromiseService.instance.defer();
    var effGrpTableColumns = [];
    effGrpTableColumns = _buildEffGroupTableColumnInfos();
    uwDataProvider.columnConfig = {
        columns: effGrpTableColumns
    };

    deferred.resolve( {
        columnInfos: effGrpTableColumns
    } );

    return deferred.promise;
};

/**
 * Get the localized value from a given key.
 * @param {String} key: The key for which the value needs to be extracted.
 * @return {String} localized string for the input key.
 */
function getLocalizedValueFromKey( key ) {
    var resource = 'OccurrenceManagementConstants';
    var localTextBundle = localeService.getLoadedText( resource );
    return localTextBundle[ key ];
}

/**
 * @return {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 */
var _buildEffGroupTableColumnInfos = function() {
    var columnInfos = [];
    var numOfColumnsIn = 2;
    for( var colNdx = 0; colNdx < numOfColumnsIn; colNdx++ ) {
        var columnInfo = awColumnService.createColumnInfo();
        if( colNdx === 0 ) {
            columnInfo.name = 'units';
            columnInfo.typeName = 'STRING';
            columnInfo.displayName = getLocalizedValueFromKey( 'units' );
            columnInfo.width = 120;
            columnInfo.pinnedLeft = false;
        } else if( colNdx === 1 ) {
            columnInfo.name = 'endItem';
            columnInfo.typeName = 'OBJECT';
            columnInfo.displayName = getLocalizedValueFromKey( 'endItemMessage' );
            columnInfo.width = 206;
            columnInfo.pinnedLeft = false;
        }
        columnInfo.enableCellEdit = true;
        columnInfo.enableColumnMenu = false;
        columnInfos.push( columnInfo );
    }

    return columnInfos;
};

/**
 * Populate initial data
 *
 * @param {data} data The view model data
 */
export let populateInitialData = function( data ) {
    if( data ) {
        var vmoSize = data.dataProviders.effGroupDataProvider.viewModelCollection.loadedVMObjects.length;
        if( vmoSize > 0 ) {
            for( var vmoIndex = 0; vmoIndex < vmoSize; vmoIndex++ ) {
                var viewModelObj = data.dataProviders.effGroupDataProvider.viewModelCollection.loadedVMObjects[ vmoIndex ];
                if( viewModelObj ) {
                    var units = viewModelObj.props.units;
                    if( units ) {
                        units.isEditable = true;
                        units.isModifiable = true;
                        uwPropertyService.setEditState( units, true );
                    }
                    var endItem = viewModelObj.props.endItem;
                    if( endItem ) {
                        endItem.isEditable = true;
                        endItem.isModifiable = true;
                        endItem.finalReferenceType = 'ItemRevision';
                        uwPropertyService.setEditState( endItem, true );
                    }
                }
            }
        }
    }
};

let getFormattedDate = function( date ) {
    date = typeof date === 'number' || typeof date === 'string' ? new Date( date ) : date;

    const monthNames = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    var MMM = date.getMonth();
    MMM = monthNames[MMM];
    var dd = date.getDate();
    dd = dd < 10 ? '0' + dd : dd;
    var hh = date.getHours();
    hh = hh < 10 ? '0' + hh : hh;
    var mm = date.getMinutes();
    mm = mm < 10 ? '0' + mm : mm;
    var ss = date.getSeconds();
    ss = ss < 10 ? '0' + ss : ss;
    return dd + '-' + MMM + '-' + date.getFullYear() + ' ' + hh + ':' + mm;
};

let getFormattedDate_timezoned = function( date ) {
    date = typeof date === 'number' || typeof date === 'string' ? new Date( date ) : date;
    var MM = date.getMonth() + 1;
    MM = MM < 10 ? '0' + MM : MM;
    var dd = date.getDate();
    dd = dd < 10 ? '0' + dd : dd;
    var hh = date.getHours();
    hh = hh < 10 ? '0' + hh : hh;
    var mm = date.getMinutes();
    mm = mm < 10 ? '0' + mm : mm;
    var ss = date.getSeconds();
    ss = ss < 10 ? '0' + ss : ss;
    return date.getFullYear() + '-' + MM + '-' + dd + 'T' + hh + ':' + mm + ':' + ss + date.toString().slice( 28, 33 );
};

export let getDateRange = function( data ) {
    let result = [];
    if( data ) {
        if ( data.endDateOptions.dbValue === 'UP' || data.endDateOptions.dbValue === 'SO' ) {
            result = [ getFormattedDate_timezoned( data.startDateTime.dbValue ) ];
        } else{
            result = [ getFormattedDate_timezoned( data.startDateTime.dbValue ), getFormattedDate_timezoned( data.endDateTime.dbValue ) ];
        }
    }
    return result;
};

export let getOpenEndedStatus = function( data ) {
    if( data ) {
        if ( data.endDateOptions.dbValue === 'UP' ) {
            return 1;
        } else if( data.endDateOptions.dbValue === 'SO' ) {
            return 2;
        }
        return 0;
    }
};

export let getDateRangeExpression = function( data ) {
    let result = '';

    if( data ) {
        result = getFormattedDate( data.startDateTime.dbValue ) + ' to ' + getFormattedDate( data.endDateTime.dbValue ); //01-Aug-2021 to 31-Dec-2021
    }
    return result;
};

export default exports = {
    clearEffGrpTable,
    getEffectivitiesInfo,
    getEffectivitiesInfoForEdit,
    updateEndItem,
    getEffectivityGroupRevision,
    getEffGroupsToApply,
    updatePartialCtx,
    setTableEditable,
    loadEffectivityGroupTableData,
    loadEffectivityGroupTableDataForEdit,
    loadEffectivityTableColumns,
    populateInitialData,
    getDateRangeExpression,
    getDateRange,
    getOpenEndedStatus
};
app.factory( 'effectivityGroupTableService', () => exports );

/**
 * Return this service's name as the 'moduleServiceNameToInject' property.
 */

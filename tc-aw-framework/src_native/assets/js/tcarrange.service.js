// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/tcarrange.service
 */
import * as app from 'app';
import soaSvc from 'soa/kernel/soaService';
import appCtxSvc from 'js/appCtxService';
import columnArrangeService from 'js/columnArrangeService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Toggle operation type
 *
 * @param {viewModelJson} arrangeData - The arrange data
 */
export let showAll = function( arrangeData ) {
    arrangeData.originalOperationType = arrangeData.originalOperationType || arrangeData.operationType;
    if( arrangeData.operationType === 'intersection' ) {
        arrangeData.operationType = 'union';
    } else {
        arrangeData.operationType = 'intersection';
    }

    var typeNames = [];
    var searchResponseInfo = appCtxSvc.getCtx( 'searchResponseInfo' );
    if( searchResponseInfo && searchResponseInfo.columnConfig && searchResponseInfo.columnConfig.typesForArrange &&
        searchResponseInfo.columnConfig.typesForArrange.length > 0 ) {
        for( var i = 0; i < searchResponseInfo.columnConfig.typesForArrange.length; ++i ) {
            typeNames.push( searchResponseInfo.columnConfig.typesForArrange[ i ] );
        }
    } else if( searchResponseInfo && searchResponseInfo.searchFilterMap ) {
        typeNames = columnArrangeService.getTypeNames( searchResponseInfo.searchFilterMap );
    }

    var clientScopeURI = arrangeData.objectSetUri || appCtxSvc.getCtx( 'sublocation.clientScopeURI' );
    var inputData = {
        getOrResetUiConfigsIn: [ {
            clientName: 'AWClient',
            businessObjects: appCtxSvc.ctx.mselected ? appCtxSvc.ctx.mselected : [],
            columnConfigQueryInfos: [ {
                clientScopeURI: clientScopeURI,
                columnsToExclude: [],
                operationType: arrangeData.operationType,
                typeNames: typeNames
            } ],
            hostingClientName: '',
            resetColumnConfig: false,
            scope: 'LoginUser',
            scopeName: ''
        } ]
    };
    soaSvc.postUnchecked( 'Internal-AWS2-2017-06-UiConfig', 'getOrResetUIColumnConfigs2', inputData ).then( function( response ) {
        if( response.columnConfigurations && response.columnConfigurations.length > 0 &&
            response.columnConfigurations[ 0 ].columnConfigurations &&
            response.columnConfigurations[ 0 ].columnConfigurations.length > 0 &&
            response.columnConfigurations[ 0 ].columnConfigurations[ 0 ].columns &&
            response.columnConfigurations[ 0 ].columnConfigurations[ 0 ].columns.length > 0 ) {
            arrangeData.columnDefs = [];
            arrangeData.filteredColumnDefs = [];
            arrangeData.availableColumnDefs = [];
            arrangeData.filteredAvailableColumnDefs = [];

            for( var i = 0; i < response.columnConfigurations[ 0 ].columnConfigurations[ 0 ].columns.length; ++i ) {
                if( arrangeData.useStaticFirstCol && i === 0 ) {
                    continue;
                }

                var column = response.columnConfigurations[ 0 ].columnConfigurations[ 0 ].columns[ i ];
                var columnDef = {
                    name: column.propDescriptor.srcObjectTypeName + '.' + column.propDescriptor.propertyName,
                    displayName: column.propDescriptor.displayName,
                    visible: !column.hiddenFlag,
                    columnOrder: column.columnOrder,
                    hiddenFlag: column.hiddenFlag,
                    pixelWidth: column.pixelWidth,
                    propertyName: column.propDescriptor.propertyName,
                    uid: column.propDescriptor.propertyName,
                    sortDirection: column.colDefSortDirection,
                    typeName: column.columnSrcType,
                    propertyDisplayName: column.propDescriptor.displayName,
                    propertyLabelDisplay: 'PROPERTY_LABEL_AT_RIGHT',
                    propApi: {},
                    type: 'BOOLEAN',
                    dbValue: !column.hiddenFlag,
                    isEditable: true,
                    isEnabled: true
                };

                if( columnDef.visible ) {
                    arrangeData.columnDefs.push( columnDef );
                    arrangeData.filteredColumnDefs.push( columnDef );
                } else {
                    arrangeData.availableColumnDefs.push( columnDef );
                    arrangeData.filteredAvailableColumnDefs.push( columnDef );

                    arrangeData.availableColumnDefs = _.sortBy( arrangeData.availableColumnDefs, function( availableColumn ) {
                        return availableColumn.displayName;
                    } );

                    arrangeData.filteredAvailableColumnDefs = _.sortBy( arrangeData.filteredAvailableColumnDefs, function( filteredAvailableColumn ) {
                        return filteredAvailableColumn.displayName;
                    } );
                }
            }
            eventBus.publish( 'operationTypeChanged' );
            eventBus.publish( 'columnChanged' );
        }
    } );
};

/**
 * This factory creates a service and returns exports
 *
 * @member tcarrange.service
 */

export default exports = {
    showAll
};
app.factory( 'tcarrange.service', () => exports );

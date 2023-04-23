/* @<COPYRIGHT>@
 * ==================================================
 * Copyright 2019.
 * Siemens Product Lifecycle Management Software Inc.
 * All Rights Reserved.
 * ==================================================
 * @<COPYRIGHT>@
 */

/* global
  define
 */

/**
 * Table Property Service is used to duplicate rows for table property items. This service is only applicable for table property items
 *
 * @module js/tablePropertyDuplicateService
 */
import * as app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Sets up the eventData to pass to the table to create a new row with duplicated data
 * @param {Object} tablePropertyEditData - Object containing VMO and gridId of table property in edit
 */
export let duplicateRowOnTable = function( tablePropertyEditData ) {
    if( tablePropertyEditData && tablePropertyEditData.vmo && tablePropertyEditData.gridId ) {
        var selectedRowVMO = tablePropertyEditData.vmo;
        var gridId = tablePropertyEditData.gridId;

        if( selectedRowVMO.props ) {
            var data = [];
            _.forEach( selectedRowVMO.props, function( prop ) {
                var duplicateProp = {
                    name: prop.propertyName,
                    dbValues: !_.isNull( prop.dbValues[ 0 ] ) ? prop.dbValues : [ prop.newValue || null ],
                    uiValues: prop.newDisplayValues || prop.uiValues
                };
                data.push( duplicateProp );
            } );

            var eventData = {
                gridId: gridId,
                tableRowData: {
                    tableRows: [ {
                        tableRowTypeName: selectedRowVMO.type,
                        setPropValueUpdated: true,
                        tableRowData: data
                    } ]
                }
            };

            eventBus.publish( 'TablePropertyInitialRowData.createSuccessful', eventData );
        }
    }
};

export default exports = {
    duplicateRowOnTable
};

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
 * @module js/awXrtEditorDetailsTableService
 */
import * as app from 'app';
import uwPropertySvc from 'js/uwPropertyService';
import _ from 'lodash';
import _t from 'js/splmTableNative';

var exports = {};

export let loadTableData = function( columnInfo, detailsData ) {
    var vmNodes = [];
    if( detailsData ) {
        for( var i = 0; i < detailsData.length; i++ ) {
            var vmo = {};
            vmo.uid = i.toString();
            vmo.props = [];
            if( columnInfo ) {
                var firstColumn = columnInfo[ 0 ];
                var attribute = detailsData[ i ];
                vmo.props[ firstColumn.name ] = uwPropertySvc.createViewModelProperty( firstColumn.name, firstColumn.displayName,
                    firstColumn.typeName, attribute.name, [ attribute.name ] );
                vmo.attribute = attribute;
                vmNodes.push( vmo );
            }
        }
    }

    return {
        results: vmNodes,
        totalFound: vmNodes.length
    };
};

export let loadColumns = function( data, editing ) {
    var columnInfos = [ {
        name: 'name',
        displayName: 'Attribute',
        isTableCommand: false,
        type: 'string'
    }, {
        name: 'value',
        field: 'value',
        displayName: 'Value (editable)',
        type: 'string',
        cellRenderers: [ _valueCellRenderer( data, editing ) ]
    } ];

    return {
        columnInfos: columnInfos
    };
};

var _valueCellRenderer = function( data, editing ) {
    var declViewModel = data;
    return {
        action: function( column, vmo, tableElem ) {
            var attr = vmo.attribute;
            var htmlContent = '<aw-xrt-attr attr="attr" editing="editing"></aw-xrt-attr>';
            var scopeData = {
                attr: attr,
                editing: editing
            };
            return _t.util.createNgElement( htmlContent, null, scopeData, declViewModel );
        },
        condition: function( column, vmo, tableElem ) {
            return true;
        }
    };
};

export default exports = {
    loadTableData,
    loadColumns
};
/**
 * @memberof NgServices
 * @member awXrtEditorDetailsTableService
 */
app.factory( 'awXrtEditorDetailsTableService', () => exports );

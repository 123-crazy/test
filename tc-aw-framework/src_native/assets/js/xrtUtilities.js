// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/xrtUtilities
 */
import * as app from 'app';
import awColumnSvc from 'js/awColumnService';
import _ from 'lodash';

let exports = {};

/**
 * This js function converts JSON to string and returns it
 *
 * @param {Object} JSON data for xrtContext
 *
 * @return{String} convert input xrtContext JSON to string and return if valid else return undefined
 */
export let getActiveWorkspaceXrtContext = function( xrtContext ) {
    if( xrtContext ) {
        return JSON.stringify( xrtContext );
    }

    return undefined;
};

/**
 * Return the new column config only if it is valid.
 *
 * @param {Object} response return of the SOA
 * @param {Object} oldColumnConfig old column config
 * @param {Object} newColumnConfig new column config
 * @returns {Object} return old column config if new one is not valid
 */
export let getValidColumnConfig = function( response, oldColumnConfig ) {
    var newColumnConfig = response && response.columnConfig ? response.columnConfig : null;
    return newColumnConfig && newColumnConfig.columnConfigId ? newColumnConfig : oldColumnConfig;
};

/**
 * Return the columns for XRT object set table.
 * @param {Object} ColumnConfig  column config
 * @returns {Object} return soa column info
 */
export let getObjSetColumns = function( dataProviderColConfig, colProviderColumns ) {
    var soaColumnInfos = [];
    var colProviderCols = {};
    var index = 100;

    _.forEach( colProviderColumns, function( col ) {
        if( col.name === 'icon' ) {
            return;
        }
        var propName = col.propertyName;
        colProviderCols[ propName ] = col;
    } );

    _.forEach( dataProviderColConfig.columns, function( col ) {
        if( col.name === 'icon' ) {
            return;
        }
        var soaColumnInfo = awColumnSvc.createSoaColumnInfo( col, index );
        if( col.titleKey !== undefined ) {
            soaColumnInfo.displayName = col.titleKey;
        } else if( colProviderCols[ col.propertyName ].titleKey !== undefined ) {
            soaColumnInfo.displayName = colProviderCols[ col.propertyName ].titleKey;
        }
        soaColumnInfos.push( soaColumnInfo );
        index += 100;
    } );
    return soaColumnInfos;
};
/**
 * xrtUtilities service
 * @returns {Object} export functions
 *
 */

export default exports = {
    getActiveWorkspaceXrtContext,
    getValidColumnConfig,
    getObjSetColumns
};
app.factory( 'xrtUtilities', () => exports );

/**
 * xrtUtilities returned as moduleServiceNameToInject
 *
 */

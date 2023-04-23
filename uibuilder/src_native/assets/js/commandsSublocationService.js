// Copyright (c) 2020 Siemens

/**
 * This service handles commands sublocation of command builder
 *
 * @module js/commandsSublocationService
 */
import app from 'app';
import AwTimeoutService from 'js/awTimeoutService';
import localeSvc from 'js/localeService';
import awSPLMTableCellRendererFactory from 'js/awSPLMTableCellRendererFactory';
import graphQLModelSvc from 'js/graphQLModelService';
import graphQLSvc from 'js/graphQLService';
import commandSvc from 'js/command.service';
import _ from 'lodash';
import _t from 'js/splmTableNative';

// eslint-disable-next-line valid-jsdoc
/**
 * Setup to map labels to local names.
 */
var _localeMap = {};

var timeoutPromise;

/**
 * This service handles commands sublocation of command builder
 *
 * @member commandsSublocationService
 * @memberof NgService
 */

var exports = {};

export let loadConfiguration = function() {
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.commandTitle', true ).then( result => _localeMap.title = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.commandIcon', true ).then( result => _localeMap.icon = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.commandType', true ).then( result => _localeMap.type = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.id', true ).then( result => _localeMap.id = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.commandId', true ).then( result => _localeMap.commandId = result );
};

/**
 * Convert command definition props to ViewModelProperties
 *
 * @param {GraphQLResult} gqlResult - A result object from a GraphQL query containing {Command}s.
 *
 * @returns {ViewModelObjectArray} A collection of new VMO initialized based on properties in the given
 * input.
 */
export let convertCommandDefsToVMOs = function( gqlResult ) {
    var vmos = [];

    var gqlCommands = _.get( gqlResult, 'data.commands.commands' );

    _.forEach( gqlCommands, function( gqlCommand ) {
        var vmo = graphQLModelSvc.convertGqlItemToVMO( gqlCommand, graphQLModelSvc.TYPE.Command, false );

        /**
         * Setup 'cell' properties
         */
        var title = _.get( gqlCommand, 'title.value' );

        vmo.cellHeader1 = title || gqlCommand.id;

        vmo.cellProperties = [ {
            key: _localeMap.commandId,
            value: gqlCommand.id
        } ];

        vmo.displayName = vmo.cellHeader1;

        vmos.push( vmo );
    } );

    return vmos;
};

/**
 * Convert command props to ViewModelProperties
 *
 * @param {GraphQLResult} gqlResult - A result object from a GraphQL query containing a SINGLE {Command}.
 * @param {GraphQLObject} gqlAltResult - (Optional) A 'alternate' result of {Command} object to use if
 * 'gqlResult' does not have valid data.
 *
 * @returns {ViewModelPropertyArray} A collection of new VMProps initialized based on properties in the
 * given input.
 */
export let convertCommandPropsToVMProps = function( gqlResult, gqlAltResult ) {
    var gqlCommand = _.get( gqlResult, 'data.command' );

    if( !gqlCommand && gqlAltResult ) {
        gqlCommand = gqlAltResult;
    }

    return graphQLModelSvc.convertGqlPropsToVMProps( gqlCommand );
};

/**
 * Return active ViewModelObject where a cell is being edited in a table.
 *
 * @param {ViewModelObject} activeVMO - Object to set as 'active'
 * @param {ViewModelObject} activeGridId - Active Grid where the user is currently editing
 *
 * @returns {ViewModelObject} The current 'active' {ViewModelObject} where a cell is being edited in table.
 */
export let updateActiveObject = function( activeVMO, activeGridId ) {
    return {
        activeVMO: activeVMO,
        activeGridId: activeGridId
    };
};

/**
 * Load placements/handler columns and add cell renderer for last column which shows 'delete
 * placement/delete handler' command
 *
 * @param {Object} columnProvider - column provider
 * @param {Object} dataProvider - data provider
 *
 * @return {Object} column info
 */
export let loadColumnsAndAddCellRenderer = function( columnProvider, dataProvider ) {
    columnProvider.columns[ 0 ].cellRenderers = [ {
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

    dataProvider.columnConfig = {
        columns: columnProvider.columns
    };

    return {
        columnInfos: columnProvider
    };
};

/**
 * Executes appropriate action on click as configured in clickable cell title actions
 *
 * @param {Object} $event - click event
 * @param {Object} context - additional context to execute the command with
 */
var doIt = function( $event, context ) {
    $event.stopPropagation();
    if( timeoutPromise ) {
        AwTimeoutService.instance.cancel( timeoutPromise );
    }

    timeoutPromise = AwTimeoutService.instance( function() {
        timeoutPromise = null;
        commandSvc.executeCommand( 'Awp0ShowObjectCell', null, null, context );
    }, 300 );
};

var addClickableCellTitle = function( vmo, value ) {
    var cellTop = _t.util.createElement( 'div', _t.Const.CLASS_TABLE_CELL_TOP );
    var contentElem = _t.util.createElement( 'div', _t.Const.CLASS_WIDGET_TABLE_CELL_TEXT );
    // make cell text clickable
    var clickableTextDiv = _t.util.createElement( 'div' );
    var clickableText = _t.util.createElement( 'a', 'aw-uiwidgets-clickableTitle' );
    clickableText.onclick = function( event ) {
        var scope = {};
        scope.vmo = vmo;
        doIt( event, scope );
    };

    clickableText.innerHTML = awSPLMTableCellRendererFactory.addHighlights( value );
    clickableTextDiv.appendChild( clickableText );
    contentElem.appendChild( clickableTextDiv );
    cellTop.appendChild( contentElem );

    return cellTop;
};

/**
 * Load placements/handler columns and add cell renderer for last column which shows 'delete
 * placement/delete handler' command
 *
 * @param {Object} columnProvider - column provider
 * @param {Object} dataProvider - data provider
 * @param {Array} columnIndxs - Array of column indexes to use custom cell template
 * @param {String} propName - Property name to retrieve the display value from
 *
 * @return {Object} column info
 */
export let loadCommandsColumnsAndAddCellRenderer = function( columnProvider, dataProvider, columnIndxs, propName ) {
    columnProvider.columns[ columnIndxs[ 0 ] ].cellRenderers = [ {
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

    columnProvider.columns[ columnIndxs[ 1 ] ].cellRenderers = [ {
        action: function( column, vmo ) {
            if( !vmo.props[ propName ] ) {
                return 0;
            }
            // Custom cell template
            return addClickableCellTitle( vmo, vmo.props[ propName ].uiValue );
        },
        condition: function() {
            return true;
        }
    } ];

    dataProvider.columnConfig = {
        columns: columnProvider.columns
    };

    return {
        columnInfos: columnProvider
    };
};

/**
 * Delete a command based on id.
 *
 * @param {String} cmdId - command Id
 * @returns {Promise} promise object
 */
export let deleteCommand = function( cmdId ) {
    var graphQLQuery = {
        endPoint: 'graphql',
        request: {
            query: 'mutation{deleteCommand(input:{id:"' + cmdId + '"}){id}}'
        }
    };

    return graphQLSvc.callGraphQL( graphQLQuery ).then( function( data ) { // eslint-disable-line no-unused-vars
        return data;
    } );
};

exports = {
    loadConfiguration,
    convertCommandDefsToVMOs,
    convertCommandPropsToVMProps,
    updateActiveObject,
    loadColumnsAndAddCellRenderer,
    loadCommandsColumnsAndAddCellRenderer,
    deleteCommand
};
export default exports;

loadConfiguration();

app.factory( 'commandsSublocationService', () => exports );

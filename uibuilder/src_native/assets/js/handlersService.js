// Copyright (c) 2020 Siemens

/**
 * This service handles commandHandlers associated to a command
 *
 * @module js/handlersService
 *
 * @namespace handlersService
 */
import app from 'app';
import graphQLSvc from 'js/graphQLService';
import selectionSvc from 'js/selection.service';
import configurationSvc from 'js/configurationService';
import uwPropertySvc from 'js/uwPropertyService';
import graphQLModelSvc from 'js/graphQLModelService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

// eslint-disable-next-line valid-jsdoc

/**
 * Define public API
 */
var exports = {};

/**
 * Convert the given {GraphQLResult} object into a collaction of {ViewModelObject}.
 *
 * @param {GraphQLObject} gqlResult - An object from a GraphQL query.
 *
 * @param {GraphQLObjectArray} gqlAltResult - (Optional) A 'alternate' result collection of {Handler}
 * objects to use if 'gqlResult' does not have valid data.
 *
 * @param {DeclViewModel} declViewModelIn - (Optional) A {DeclViewModel} to set into the 'up' pointers on
 * each {ViewModelProperty}.
 *
 * @returns {ViewModelObjectArray} A collection of new VMO initialized based on properties in the given
 * input.
 */
export let convertHandlersToVMOs = function( gqlResult, gqlAltResult, declViewModelIn ) {
    var gqlHandlers = _.get( gqlResult, 'data.command.handlers' );

    if( !gqlHandlers && gqlAltResult ) {
        gqlHandlers = gqlAltResult;
    }

    var vmos = [];

    var uidIndex = 0;

    _.forEach( gqlHandlers, function( gqlHandler ) {
        /**
         * Assure an 'id'
         */
        if( !gqlHandler.id ) {
            gqlHandler.id = 'HHHHHHH' + uidIndex;
            uidIndex++;
        }

        var vmo = graphQLModelSvc.convertGqlItemToVMO( gqlHandler, graphQLModelSvc.TYPE.Placement, false );

        _.forEach( vmo.props, function( vmProp, propName ) {
            graphQLModelSvc.assureVMPropType( vmProp );

            if( propName === 'action' ) {
                vmProp.dataProvider = 'getActionsDP';
                vmProp.hasLov = true;
            } else if( propName === 'visibleWhen' ) {
                vmProp.dataProvider = 'getVisibleWhenConditionsDP';
                vmProp.hasLov = true;
            } else if( propName === 'enableWhen' ) {
                vmProp.dataProvider = 'getEnableWhenConditionsDP';
                vmProp.hasLov = true;
            } else if( propName === 'activeWhen' ) {
                vmProp.dataProvider = 'getActiveWhenConditionsDP';
                vmProp.hasLov = true;
            } else if( propName === 'selectWhen' ) {
                vmProp.dataProvider = 'getSelectWhenConditionsDP';
                vmProp.hasLov = true;
            }

            vmProp.anchor = 'aw_editActionCell';

            if( declViewModelIn ) {
                vmProp.getViewModel = function() {
                    return declViewModelIn;
                };
            }

            uwPropertySvc.setIsPropertyModifiable( vmProp, true );
            uwPropertySvc.setEditState( vmProp, true, true );
        } );

        vmos.push( vmo );

        uidIndex++;
    } );

    return vmos;
};

/**
 * Retrieve action objects and parse them in such a way it shows the data correctly in LOVs
 *
 * @param {GraphQLObject} gqlResult - An object from a GraphQL query.
 *
 * @returns {LOVEntryArray} Parsed lov entries array of {Action}.
 */
export let convertActionsToLovEntries = function( gqlResult ) {
    var gqlItems = _.get( gqlResult, 'data.actions.actions' );

    return graphQLModelSvc.convertGqlItemsToLovEntries( gqlItems );
};

/**
 * Retrieve condition objects and parse them in such a way it shows the data correctly in LOVs
 *
 * @param {GraphQLObject} gqlResult - An object from a GraphQL query.
 *
 * @returns {Array} Parsed lov entries array of conditions
 */
export let convertConditionsToLovEntries = function( gqlResult ) {
    var gqlItems = _.get( gqlResult, 'data.conditions' );

    return graphQLModelSvc.convertGqlItemsToLovEntries( gqlItems );
};

/**
 * Add default handler to a command which add a row in handlers table
 *
 * @param {Object} command - command object
 *
 * @returns {Promise} promise object
 */
export let addDefaultHandlerCommand = function( command ) {
    var graphQLQuery = {
        endPoint: 'graphql',
        request: {
            query: 'mutation{addHandler(input:{command:"' + command.uid + '",enableWhen:"true",activeWhen:"true"}){id activeWhen{id}}}'
        }
    };

    return graphQLSvc.callGraphQL( graphQLQuery ).then( function( data ) {
        selectionSvc.updateSelection( command );
        configurationSvc.notifyConfigChange( 'commandsViewModel' );
        var updatedVmos;

        var gqlHandlers = _.get( data, 'data.addHandler.handlers' );

        if( gqlHandlers ) {
            updatedVmos = exports.convertHandlersToVMOs( null, gqlHandlers );
        } else {
            updatedVmos = [];
        }

        eventBus.publish( 'commandSummary.updateHandlers', updatedVmos );
    } );
};

/**
 * Delete a handler associated to a command
 *
 * @param {Object} command - command object
 * @param {Object} handler - handler which needs to be deleted
 *
 * @returns {Promise} promise object
 */
export let deleteCommandHandler = function( command, handler ) {
    var graphQLQuery = {
        endPoint: 'graphql',
        request: {
            query: 'mutation{removeHandler(input:{commandHandlerId:"' + handler.props.id.dbValue + '"}){id}}'
        }
    };

    return graphQLSvc.callGraphQL( graphQLQuery ).then( function( data ) { // eslint-disable-line no-unused-vars
        selectionSvc.updateSelection( command );
        configurationSvc.notifyConfigChange( 'commandsViewModel' );
        eventBus.publish( 'commandSummary.updateHandlers' );
    } );
};

exports = {
    convertHandlersToVMOs,
    convertActionsToLovEntries,
    convertConditionsToLovEntries,
    addDefaultHandlerCommand,
    deleteCommandHandler
};
export default exports;
/**
 * The service to handle handlers associated to a command
 *
 * @member handlersService
 * @memberof NgServices
 */
app.factory( 'handlersService', () => exports );

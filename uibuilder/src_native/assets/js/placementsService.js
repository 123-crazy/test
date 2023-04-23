// Copyright (c) 2020 Siemens

/**
 * This service handles commandPlacements associated to a command
 *
 * @module js/placementsService
 *
 * @namespace placementsService
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
 * Convert {CommandPlacement} objects in the result to a collection {ViewModelObject}.
 *
 * @param {GraphQLObject} gqlResult - An object from a GraphQL query.
 * @param {GraphQLObjectArray} gqlAltResult - (Optional) A 'alternate' result collection of {Placement}
 * objects to use if 'gqlResult' does not have valid data.
 * @param {DeclViewModel} declViewModelIn - (Optional) A {DeclViewModel} to set into the 'up' pointers on
 * each {ViewModelProperty}.
 *
 * @returns {ViewModelObjectArray} Collection of {ViewModelObject} created from the given {GraphQL} Result.
 */
export let convertPlacementsToVMOs = function( gqlResult, gqlAltResult, declViewModelIn ) {
    var gqlPlacements = _.get( gqlResult, 'data.command.placements' );

    if( !gqlPlacements && gqlAltResult ) {
        gqlPlacements = gqlAltResult;
    }

    var vmos = [];

    var uidIndex = 0;

    _.forEach( gqlPlacements, function( gqlPlacement ) {
        /**
         * Assure an 'id'
         */
        if( !gqlPlacement.id ) {
            gqlPlacement.id = 'PPPPPP' + uidIndex;
            uidIndex++;
        }

        var vmo = graphQLModelSvc.convertGqlItemToVMO( gqlPlacement, graphQLModelSvc.TYPE.Placement, false );

        _.forEach( vmo.props, function( vmProp, propName ) {
            graphQLModelSvc.assureVMPropType( vmProp );

            if( propName === 'anchor' ) {
                vmProp.hasLov = true;
                vmProp.dataProvider = 'getAnchorsDP';
                vmProp.anchor = 'aw_editActionCell';
                vmProp.getViewModel = function() {
                    return declViewModelIn;
                };
            } else if( propName === 'relativeTo' ) {
                vmProp.hasLov = true;
                vmProp.dataProvider = 'getRelativeToCommandsDP';
                vmProp.getViewModel = function() {
                    return declViewModelIn;
                };
            } else if( propName === 'parentCommand' ) {
                vmProp.hasLov = true;
                vmProp.dataProvider = 'getParentCommandsDP';
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
 * Retrieve anchor objects and parse them in such a way it shows the data correctly in LOVs
 *
 * @param {GraphQLObject} gqlResult - An object from a GraphQL query.
 *
 * @returns {Array} Parsed lov entries array of anchors
 */
export let convertAnchorsToLovEntries = function( gqlResult ) {
    var gqlItems = _.get( gqlResult, 'data.anchors' );

    return graphQLModelSvc.convertGqlItemsToLovEntries( gqlItems );
};

/**
 * Retrieve command objects and parse them in such a way it shows the data correctly in LOVs
 *
 * @param {GraphQLObject} gqlResult - An object from a GraphQL query.
 *
 * @return {Array} Parsed lov entries array of commands
 */
export let convertCommandsToLovEntries = function( gqlResult ) {
    var gqlItems = _.get( gqlResult, 'data.commands.commands' );

    return graphQLModelSvc.convertGqlItemsToLovEntries( gqlItems );
};

/**
 * Add default placement to a command which add a row in placements table
 *
 * @param {Object} command - command object
 *
 * @returns {Promise} promise object
 */
export let addDefaultCommandPlacement = function( command ) {
    var graphQLQuery = {
        endPoint: 'graphql',
        request: {
            query: 'mutation{addPlacement(input:{command:"' + command.uid + '",anchor:"aw_rightWall",priority:-1}){id placements{id priority anchor{id title{value}} parentCommand{id title{value}}}}}'
        }
    };

    return graphQLSvc.callGraphQL( graphQLQuery ).then( function( gqlResult ) {
        selectionSvc.updateSelection( command );
        configurationSvc.notifyConfigChange( 'commandsViewModel' );
        eventBus.publish( 'commandSummary.updatePlacements', [] );
    } );
};

/**
 * Delete a placement associated to a command
 *
 * @param {String} command - command object
 * @param {String} placementId - placement id which needs to be deleted
 * @param {String} postDeleteEvent - eventBus event to trigger after completion
 * @param {Object} updateSelection - object to select post removal - the obj in the PWA
 *
 * @returns {Promise} promise object
 */
export let deleteCommandPlacement = function( command, placementId, postDeleteEvent, updateSelection ) {
    var graphQLQuery = {
        endPoint: 'graphql',
        request: {
            query: `mutation{removePlacement(input:{command:"${command}",placementId:"${placementId}"}){id placements{id priority anchor{id title{value}} parentCommand{id title{value}}}}}`
        }
    };

    return graphQLSvc.callGraphQL( graphQLQuery ).then( function( data ) { // eslint-disable-line no-unused-vars
        selectionSvc.updateSelection( updateSelection );
        configurationSvc.notifyConfigChange( 'commandsViewModel' );
        eventBus.publish( postDeleteEvent );
    } );
};

exports = {
    convertPlacementsToVMOs,
    convertAnchorsToLovEntries,
    convertCommandsToLovEntries,
    addDefaultCommandPlacement,
    deleteCommandPlacement
};
export default exports;
/**
 * The service to handle placements associated to a command
 *
 * @member graphQLService
 * @memberof NgServices
 */
app.factory( 'placementsService', () => exports );

// Copyright (c) 2020 Siemens

/**
 * This service handles child commands table in command sublocation
 *
 * @module js/childCommandService
 */
import app from 'app';
import graphQLModelSvc from 'js/graphQLModelService';
import graphQLSvc from 'js/graphQLService';
import selectionSvc from 'js/selection.service';
import configurationSvc from 'js/configurationService';
import uwPropertySvc from 'js/uwPropertyService';
import { get, forEach } from 'lodash';
import eventBus from 'js/eventBus';

// eslint-disable-next-line valid-jsdoc
/**
 * This service handles child commands table in command sublocation
 *
 * @member childCommandService
 * @memberof NgService
 */

var exports = {};

/**
 * Retrieve commands table data for child command
 *
 * @param {Object} gqlResult - An result from a GraphQL query.
 * @param {Object} declViewModelIn - declarative view model
 *
 * @returns {Array} array of view model objects
 */
export let convertChildCommandsToVMOs = function( { data: { commandPlacements } }, declViewModelIn ) {
    var vmos = commandPlacements.map( ( placement, idx ) => graphQLModelSvc.convertGqlItemToVMO( {
        cmdId: get( placement, 'command.id' ),
        name: get( placement, 'command.title.value' ),
        priority: get( placement, 'priority' ),
        relativeTo: get( placement, 'relativeTo.title.value' ),
        id: get( placement, 'id' )
    }, graphQLModelSvc.TYPE.Placement, false ) );

    forEach( vmos, function( vmo ) {
        forEach( vmo.props, function( vmProp, propName ) {
            graphQLModelSvc.assureVMPropType( vmProp );

            if( propName === 'priority' ) {
                uwPropertySvc.setIsPropertyModifiable( vmProp, true );
                uwPropertySvc.setEditState( vmProp, true, true );
            } else if( propName === 'relativeTo' ) {
                vmProp.hasLov = true;
                vmProp.dataProvider = 'getRelativeToCommandsDP';
                vmProp.getViewModel = function() {
                    return declViewModelIn;
                };

                uwPropertySvc.setIsPropertyModifiable( vmProp, true );
                uwPropertySvc.setEditState( vmProp, true, true );
            }
        } );
    } );

    return vmos;
};

/**
 * Delete a placement associated to a command
 *
 * @param {String} placementId - placement id
 * @param {String} postDeleteEvent - eventBus event to trigger after completion
 * @param {Object} updateSelection - object to select post removal - the obj in the PWA
 *
 * @returns {Promise} promise object
 */
export let deleteChildCommandPlacement = function( placementId, postDeleteEvent, updateSelection ) {
    var graphQLQuery = {
        endPoint: 'graphql',
        request: {
            query: 'mutation($placementId: ID){removePlacement(input:{command:"",placementId:$placementId}){id placements{id priority anchor{id title{value}} parentCommand{id title{value}}}}}',
            variables: {
                placementId
            }
        }
    };
    return graphQLSvc.callGraphQL( graphQLQuery ).then( function() {
        selectionSvc.updateSelection( updateSelection );
        configurationSvc.notifyConfigChange( 'commandsViewModel' );
        eventBus.publish( postDeleteEvent );
    } );
};

exports = {
    convertChildCommandsToVMOs,
    deleteChildCommandPlacement
};
export default exports;
app.factory( 'childCommandService', () => exports );

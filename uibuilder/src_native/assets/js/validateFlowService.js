// Copyright (c) 2020 Siemens

/**
 * This module provides a way for declarative framework to do outgoing calls like SOA or REST.
 *
 * @module js/validateFlowService
 *
 * @namespace validateFlowService
 */
import _ from 'lodash';
import localeSvc from 'js/localeService';
import messagingSvc from 'js/messagingService';
import nodeDefsSvc from 'js/nodeDefinitionService';

// eslint-disable-next-line valid-jsdoc

/**
 * Define public API
 */
let exports = {};

/**
 * Setup to map labels to local names.
 */
let localeMap = {};

export let loadConfiguration = function() {
    localeSvc.getLocalizedTextFromKey( 'ActionBuilderMessages.invalidConnection' ).then( result => localeMap.invalidConnection = result );
};

let onEvent = 'onEvent';
let messageRegex = /^(showInfoMessage|showWarningMessage|showErrorMessage)$/;

/**
 * Verify whether input parameter is valid action type
 *
 * @param {String} key - key value to verify
 * @returns {String} key value
 */
export let validActionTypes = function( key ) {
    if( !messageRegex.test( key ) ) {
        return key;
    }
};

/**
 * Verify whether input parameter is valid message type
 *
 * @param {String} key - key value to verify
 * @returns {String} key value
 */
export let validMessageTypes = function( key ) {
    if( messageRegex.test( key ) ) {
        return key;
    }
};

/**
 * Validate edge by checking source and target node to determine whether its a valid edge or not
 *
 * @param {Object} srcData - source node data
 * @param {Object} tgtData - target node data
 * @param {Object} nodeDefs - node definitions
 *
 * @returns {Boolean} return true if the edge is valid
 */
export let validateEdge = function( srcData, tgtData, nodeDefs ) {
    var isValid = false;
    var msg = localeMap.invalidConnection;
    msg = msg.replace( '{0}', srcData.category );
    msg = msg.replace( '{1}', tgtData.category );

    var operators = nodeDefs.operators;
    var actionTypes = _.pickBy( nodeDefs.objectActivities, function( value, key ) {
        return exports.validActionTypes( key );
    } );
    var messageTypes = _.pickBy( nodeDefs.objectActivities, function( value, key ) {
        return exports.validMessageTypes( key );
    } );

    // if the source node is one of action types
    if( _.has( actionTypes, srcData.category ) ) {
        if( /^(onEvent|end)$/.test( tgtData.category ) || _.has( messageTypes, tgtData.category ) ) {
            isValid = true;
        } else {
            messagingSvc.showError( msg );
        }
    } else if( _.has( messageTypes, srcData.category ) ) {
        if( !/^(end)$/.test( tgtData.category ) ) {
            messagingSvc.showError( msg );
        } else {
            isValid = true;
        }
    } else if( _.has( operators, srcData.category ) ) {
        if( srcData.category === 'start' && ( _.has( messageTypes, tgtData.category ) || _.has( actionTypes, tgtData.category ) ) ) {
            isValid = true;
        } else if( srcData.category === onEvent &&
            ( _.has( messageTypes, tgtData.category ) ||
                _.has( actionTypes, tgtData.category ) || tgtData.category === 'end' ) ) {
            isValid = true;
        } else if( srcData.category === 'end' ) {
            messagingSvc.showError( msg );
        } else {
            messagingSvc.showError( msg );
        }
    }

    return isValid;
};

/**
 * Validate edge between sourceNode and dropInNode
 *
 * @param {Object} srcData - source node in graph
 * @param {Object} tgtData - target node in graph
 * @param {Object} nodeDefs - node definitions
 *
 * @return {Boolean} isValid boolean flag whether its a valid edge or not
 */
export let validateEdgeForExistingAction = function( srcData, tgtData, nodeDefs ) {
    var isValid = false;

    var operators = nodeDefs.operators;
    var actionTypes = _.pickBy( nodeDefs.objectActivities, function( value, key ) {
        if( !messageRegex.test( key ) ) {
            return key;
        }
        return 0;
    } );

    // if the source node is one of action types
    if( _.has( operators, srcData.category ) ) {
        if( srcData.category === onEvent && !_.has( actionTypes, tgtData.category ) ) {
            isValid = true;
        } else {
            var msg = localeMap.invalidConnection;
            msg = msg.replace( '{0}', srcData.category );
            msg = msg.replace( '{1}', tgtData.category );

            messagingSvc.showError( msg );
        }
    }

    return isValid;
};

/**
 * Validate if the preceding connection supports failure type
 *
 * @param {Object} ctx - application context object
 * @param {Object} data - declarative view model
 */
export let validateEdgeSupportsFailure = function( ctx, data ) {
    if( ctx.graph.selected ) {
        var hasFailure;
        var srcData = ctx.graph.selected.model.graphItem.model.sourceNode;
        var tgtData = ctx.graph.selected.model.graphItem.model.targetNode;
        let nodeDefsResponse = nodeDefsSvc.getNodeDefinitionSync();
        var activities = nodeDefsResponse.objectActivities;
        var actionTypes = _.pickBy( activities, function( value, key ) {
            return exports.validActionTypes( key );
        } );
        // if the source node is one of action types
        if( _.has( actionTypes, srcData.category ) && tgtData.category !== 'end' ) {
            hasFailure = true;
        } else {
            hasFailure = false;
        }
        data.connectionType.isEnabled = hasFailure;
    }
};

loadConfiguration();

exports = {
    loadConfiguration,
    validActionTypes,
    validMessageTypes,
    validateEdge,
    validateEdgeForExistingAction,
    validateEdgeSupportsFailure
};
export default exports;

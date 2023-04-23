// Copyright (c) 2020 Siemens

/**
 * This module provides a way for declarative framework to do outgoing calls like SOA or REST.
 *
 * @module js/nodeDefinitionService
 *
 * @namespace nodeDefinitionService
 */
import app from 'app';
import _ from 'lodash';
import cfgSvc from 'js/configurationService';
import localeSvc from 'js/localeService';
import 'config/nodeDefs';

// eslint-disable-next-line valid-jsdoc

/**
 * Define public API
 */
var exports = {};

/**
 * Convert node title and tooltip to localized values
 *
 * @param {Object} nodeDefs - node definitions object
 */
var _getLocalizedValuesForNodes = function( nodeDefs ) {
    let messagesKey = 'ActionBuilderMessages.';
    let i18nSyn = '{{i18n.';
    _.forEach( nodeDefs, function( obj ) {
        _.forEach( obj, function( innerObj ) {
            if( innerObj.title && innerObj.title.startsWith( i18nSyn ) ) {
                let startIndex = innerObj.title.indexOf( '.' );
                let endIndex = innerObj.title.indexOf( '}}' );
                let i18nKey = innerObj.title.substring( startIndex + 1, endIndex );
                innerObj.title = localeSvc.getLoadedTextFromKey( messagesKey + i18nKey );
            }

            if( innerObj.tooltip && innerObj.tooltip.startsWith( i18nSyn ) ) {
                let startIndex = innerObj.tooltip.indexOf( '.' );
                let endIndex = innerObj.tooltip.indexOf( '}}' );
                let i18nKey = innerObj.tooltip.substring( startIndex + 1, endIndex );
                innerObj.tooltip = localeSvc.getLoadedTextFromKey( messagesKey + i18nKey );
            }
        } );
    } );
};

/**
 * Get node definition information. return the promise object.
 *
 * @param {String} nodeId - return node definition of given nodeId
 * @param {String} type - type i.e. either 'objectActivities' or 'operators'
 *
 * @return {Promise} A promise object resolved with the results of node definition object (or rejected if there is a
 *         problem).
 */
export let getNodeDefinition = function( nodeId, type ) {
    return cfgSvc.getCfg( 'nodeDefs', false, true ).then( function( nodeDefs ) {
        _getLocalizedValuesForNodes( nodeDefs );

        if( type ) {
            var response = nodeDefs[ type ];
            if( nodeId ) {
                response = nodeDefs[ type ][ nodeId ];
            }
            return response;
        }

        if( nodeId ) {
            return nodeDefs.operators[ nodeId ] ? nodeDefs.operators[ nodeId ] : nodeDefs.objectActivities[ nodeId ];
        }

        return nodeDefs;
    } );
};

/**
 * Get node definition information in sync
 *
 * @param {String} nodeId - return node definition of given nodeId
 * @param {String} type - type i.e. either 'objectActivities' or 'operators'
 *
 * @return {Promise} A promise object resolved with the results of node definition object (or rejected if there is a
 *         problem).
 */
export let getNodeDefinitionSync = function( nodeId, type ) {
    let nodeDefs = cfgSvc.getCfgCached( 'nodeDefs' );
    _getLocalizedValuesForNodes( nodeDefs );

    if( type ) {
        var response = nodeDefs[ type ];
        if( nodeId ) {
            response = nodeDefs[ type ][ nodeId ];
        }
        return response;
    }

    if( nodeId ) {
        return nodeDefs.operators[ nodeId ] ? nodeDefs.operators[ nodeId ] : nodeDefs.objectActivities[ nodeId ];
    }

    return nodeDefs;
};

exports = {
    getNodeDefinition,
    getNodeDefinitionSync
};
export default exports;
/**
 * The service to perform GraphQL calls.
 *
 * @member nodeDefinitionService
 * @memberof NgServices
 */
app.factory( 'nodeDefinitionService', () => exports );

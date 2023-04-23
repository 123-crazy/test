// Copyright (c) 2020 Siemens

/**
 * Commands map service
 *
 * @module js/commandsMapService
 */
import app from 'app';
import logger from 'js/logger';

let exports = {};

/**
 * Returns command handler overlay object for a given command id from factory.
 *
 * @param {Object} commandJsonObj - command JSON object which is give in declarative view model
 * @param {String} commandId - command id
 *
 * @return {Object} command handler overlay object for given command id.
 */
export let getCommandOverlay = function() {
    logger.error( 'commandsMapService#getCommandOverlay is not supported, Use commandService.getCommand instead' );
    return {};
};

/**
 * Returns True if this type is child of the give type.
 *
 * TODO: This should be a utility somewhere in CDM - has nothing to do with commands
 *
 * @param {String} typeName - name of class
 * @param {Object} modelType - view model object's model type.
 *
 * @return {Boolean} true if this type is child of the give type.
 */
export let isInstanceOf = function( typeName, modelType ) {
    return modelType &&
        ( typeName === modelType.name || modelType.typeHierarchyArray &&
            modelType.typeHierarchyArray.indexOf( typeName ) > -1 );
};

exports = {
    getCommandOverlay,
    isInstanceOf
};
export default exports;
/**
 * This service performs actions to retrieve data
 *
 * @memberof NgServices
 * @member commandsMapService
 */
app.factory( 'commandsMapService', () => exports );

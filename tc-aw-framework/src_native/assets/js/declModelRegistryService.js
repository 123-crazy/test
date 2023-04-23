// Copyright (c) 2020 Siemens

/**
 * Thue module defines helpful shared APIs and constants used throughout the DeclarativeUI code base.
 * <P>
 * Note: This modules does not create an injectable service.
 *
 * @module js/declModelRegistryService
 */
import app from 'app';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import logger from 'js/logger';

/**
 * {ObjectMap} The current 'active' instances of a certain class.
 */
var _modelRegistry = {};

/**
 * {Boolean} TRUE if create/destroy events for UwDataProviders should be logged.
 */
var _debug_logModelLifeCycle = false;

/**
 */
function _caseInsensitive( a, b ) {
    var nameA = a.toUpperCase(); // ignore upper and lowercase
    var nameB = b.toUpperCase(); // ignore upper and lowercase

    if( nameA < nameB ) {
        return -1;
    }

    if( nameA > nameB ) {
        return 1;
    }

    // names must be equal
    return 0;
}

/**
 * @param {String} operationName -
 *
 * @param {String} modelType - The type of model being registered (e.g. 'DeclViewModel', 'UwDataProvider',
 *            etc.).
 *
 * @param {Object} modelObj - The model object to register and allocate a unique ID for.
 *
 * @param {String} modelIdPath - The property path within the 'modelObj' to use when setting the allocated ID.
 *
 * @return {String}
 */
function _buildStatusString( operationName, modelTypeIn, modelObj ) {
    var msg = '\n';
    msg += operationName;
    msg += ' ';
    msg += modelTypeIn;
    msg += ': ';
    msg += modelObj.toString();
    msg += '\n';
    msg += 'Status:';
    msg += '\n';

    _.forEach( _modelRegistry, function( modelTypeGroup, modelType ) {
        var keys = Object.keys( _modelRegistry[ modelType ] );

        keys.sort( _caseInsensitive );

        var first = true;
        var totalActive = 0;

        _.forEach( keys, function( key ) {
            if( key === 'nextId' ) {
                return;
            }

            var modelStatus = modelTypeGroup[ key ];

            var modelIds = Object.keys( modelStatus.members );

            if( modelIds.length ) {
                if( first ) {
                    msg += modelType;
                    msg += '\n';

                    first = false;
                }

                var currLen = msg.length;

                msg += '    ';
                msg += key;

                if( ( msg.length - currLen ) % 2 === 0 ) {
                    msg += ' ';
                }

                for( var ndx = msg.length; ndx < currLen + 44; ndx += 2 ) {
                    msg += '. ';
                }

                msg += ': ';
                msg += modelIds.length;
                msg += ' ';
                msg += JSON.stringify( modelIds );
                msg += '\n';

                totalActive += modelIds.length;
            }
        } );

        if( totalActive ) {
            msg += 'Total: ';
            msg += totalActive;
            msg += '\n';
        }
    } );

    return msg;
} // _buildStatusString

/**
 * ---------------------------------------------------------------------------<BR>
 * Define the public API for the Service<BR>
 * ---------------------------------------------------------------------------<BR>
 */

var exports = {};

/**
 * @param {String} modelType - The type of model being registered (e.g. 'DeclViewModel', 'UwDataProvider',
 *            etc.).
 *
 * @param {Object} modelObj - The model object to register and allocate a unique ID for.
 *
 * @param {Object} modelNamePath - The property path within the 'modelObj' of the name of the model object to
 *            register.
 *
 * @param {String} modelIdPath - The property path within the 'modelObj' to use when setting the allocated ID.
 */
export let registerModel = function( modelType, modelObj, modelNamePath, modelIdPath ) {
    var modelTypeGroup = _modelRegistry[ modelType ];

    if( !modelTypeGroup ) {
        modelTypeGroup = {
            nextId: 0
        };

        _modelRegistry[ modelType ] = modelTypeGroup;
    }

    var modelName = _.get( modelObj, modelNamePath );

    var modelStatus = modelTypeGroup[ modelName ];

    if( !modelStatus ) {
        modelStatus = {
            members: {}
        };

        modelTypeGroup[ modelName ] = modelStatus;
    }

    var modelId = _.get( modelObj, modelIdPath );

    if( modelId >= 0 ) {
        logger.info( 'registerModel: Attempt to double register: ' + modelObj );
    } else {
        var nextId = modelTypeGroup.nextId++;

        modelStatus.members[ nextId ] = true;

        _.set( modelObj, modelIdPath, nextId );
    }

    if( _debug_logModelLifeCycle ) {
        logger.info( _buildStatusString( 'Created', modelType, modelObj ) );
    }
};

/**
 * @param {String} modelType - The type of model being unregistered (e.g. 'DeclViewModel', 'UwDataProvider',
 *            etc.).
 *
 * @param {Object} modelObj - The model object to unregister.
 *
 * @param {Object} modelNamePath - The property path within the 'modelObj' of the name of the model object to
 *            register.
 */
export let unregisterModel = function( modelType, modelObj, modelNamePath, modelIdPath ) {
    var modelTypeGroup = _modelRegistry[ modelType ];

    if( !modelTypeGroup ) {
        modelTypeGroup = {
            nextId: 0
        };

        _modelRegistry[ modelType ] = modelTypeGroup;
    }

    var modelName = _.get( modelObj, modelNamePath );
    var modelId = _.get( modelObj, modelIdPath );

    var modelStatus = modelTypeGroup[ modelName ];

    if( modelStatus ) {
        if( modelStatus.members[ modelId ] ) {
            delete modelStatus.members[ modelId ];
        } else {
            logger.info( 'unregisterModel: Model not found in the registry: ' + modelObj );
        }
    }

    if( _debug_logModelLifeCycle ) {
        logger.info( _buildStatusString( 'Destroyed', modelType, modelObj ) );
    }
};

/**
 * ---------------------------------------------------------------------------<BR>
 * Property & Function definition complete....Finish initialization. <BR>
 * ---------------------------------------------------------------------------<BR>
 */
var urlAttrs = browserUtils.getUrlAttributes();

_debug_logModelLifeCycle = urlAttrs.logModelLifeCycle !== undefined;

exports = {
    registerModel,
    unregisterModel
};
export default exports;
/**
 * This service allocates ID for verious type of models.
 *
 * @memberof NgServices
 * @member declModelRegistryService
 */
app.factory( 'declModelRegistryService', () => exports );

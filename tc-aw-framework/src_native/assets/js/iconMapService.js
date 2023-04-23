// Copyright (c) 2020 Siemens

/**
 * @module js/iconMapService
 */
import app from 'app';
import _ from 'lodash';
import cfgSvc from 'js/configurationService';

let exports;

let _typeFiles;

let _aliasRegistry;

/**
 * Check if the given iconName is an alias name for the actual icon filename.
 *
 * @param {String} iconName - The name of the icon to any final iconName for.
 * @return {String} Final icon file name.
 */
export let resolveIconName = function( iconName ) {
    var key = iconName;
    if( iconName && _aliasRegistry ) {
        key = _aliasRegistry[ iconName ];
        if( !key ) {
            key = iconName;
        }
    }
    return key;
};

/**
 * Return the name of the (SVG) file associated with the given type name (or NULL if the file is not cached).
 *
 * @param {String} typeName - Name of the type to return an icon filename for.
 * @return {String} The filename that contains the description of the icon defined for the given type.
 */
export let getTypeFileName = function( typeName ) {
    if( _typeFiles ) {
        var key = exports.resolveIconName( 'type' + typeName );
        if( _.indexOf( _typeFiles, key, true ) > -1 ) {
            return key + '.svg';
        }

        // If alias doesn't indicate the number try adding it.
        key += '48';
        if( _.indexOf( _typeFiles, key, true ) > -1 ) {
            return key + '.svg';
        }
    }
    return null;
};

export let loadConfiguration = async function() {
    await cfgSvc.getCfg( 'typeFiles', false, true ).then( ( typeFiles ) => {
        _typeFiles = typeFiles;
    } );

    await cfgSvc.getCfg( 'aliasRegistry', false, true ).then( ( aliasRegistry ) => {
        _aliasRegistry = aliasRegistry;
    } );
};

exports = {
    resolveIconName,
    getTypeFileName,
    loadConfiguration
};
export default exports;

loadConfiguration();

/**
 * This service allows site specific model types (and other icons) to be mapped to actual icon file definitions.
 *
 * @memberof NgServices
 * @member iconMapService
 *
 * @param {configurationService} cfgSvc - Service to use.
 *
 * @returns {iconMapService} Reference to service API Object.
 */
app.factory( 'iconMapService', () => exports );

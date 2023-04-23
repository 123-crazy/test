// Copyright (c) 2020 Siemens

/**
 * @module js/defaultIconProviderService
 */
import app from 'app';
import cmm from 'soa/kernel/clientMetaModel';
import iconMapSvc from 'js/iconMapService';
import iconRepositoryService from 'js/iconRepositoryService';
import cfgSvc from 'js/configurationService';
import _ from 'lodash';
import 'js/iconMapService';
import 'soa/kernel/clientMetaModel';
import 'js/iconRepositoryService';
import AwBaseService from 'js/awBaseService';

// image cache service. I don't think this is needed since cfgSvc itself is a cache
// let us tune it as post action after service conversion
class ImageCacheService extends AwBaseService {
    constructor() {
        super();
        return cfgSvc.getCfgCached( 'images' );
    }
}

/**
 * @private
 */
var _cache = {

    /**
     * Set of '&lt;SVG&gt;' and '&lt;IMG&gt;' HTML tags set with the "aw-base-icon" CSS class once an icon is used.
     */
    use: {}
};

/**
 * @private
 *
 * @param {String} key - key field within use object
 *
 * @return {String} string from use object per key field (or null)
 */
function _getFromUseCache( key ) {
    var result = _cache.use[ key ];
    if( result ) {
        return result;
    }
    return undefined;
}

/**
 * @private
 *
 * @param {String} key - key field within use object
 *
 * @return {String} String from use object per key field (or null).
 */
function _addToUseCache( key ) {
    /**
     * Note: We need to insure a space behind the class define to fix the parse issue of FireFox and IE.
     */
    var iconTag;
    let _images = ImageCacheService.instance;
    if( _images ) {
        iconTag = ImageCacheService.instance[ key ].replace( '<svg ', '<svg class="aw-base-icon" focusable="false" ' );
        _cache.use[ key ] = iconTag;
    }
    return iconTag;
}

/**
 * Returns the &lt;SVG&gt; tag for the given icon name (or NULL if the icon file was not deployed).
 *
 * @private
 *
 * @param {String} name - The name of the icon to return.
 *
 * @return {String} The &lt;SVG&gt; tag for the given icon name (or NULL if the icon file was not deployed).
 */
function _getIcon( name ) {
    /**
     * Check if this is an alias name for the actual icon name.
     */
    var key = iconMapSvc.resolveIconName( name );

    /**
     * Check if we have already prepared a tag for this icon to use.
     */
    var ret = _getFromUseCache( key );

    if( ret ) {
        return ret;
    }

    /**
     * Check if this icon is even defined in the image map.
     */
    let _images = ImageCacheService.instance;
    if( _images && _.isString( _images[ key ] ) ) {
        return _addToUseCache( key );
    }

    return null;
}

var exports = {};

/**
 * Returns the &lt;IMG&gt; tag for the given type name (or one of its parent super types if the given type icon file
 * was not deployed) **with** 'class' attribute already set to 'aw-base-icon' and draggability disabled.
 *
 * @param {String} typeName - The 'type' name (w/o the 'type' prefix) to get an icon for.
 *
 * @return {String} The &lt;IMG&gt; tag for the given type name (or null if the icon name has not been registered as
 *         an alias in a module.json or the SVG file was not found during war the build).
 */
export let getTypeIcon = function( typeName ) {
    /**
     * Check if we have already prepared a tag for this icon to use.
     */
    var ret = _getFromUseCache( typeName );

    if( ret ) {
        return ret;
    }

    var typeIconFileName;

    var modelType = cmm.getType( typeName );

    if( modelType && modelType.constantsMap.typeIconFileName ) {
        // If we already have the meta model cached, use the constant for the type icon filename.
        typeIconFileName = modelType.constantsMap.IconFileName;
    } else {
        /**
         * Check if this is an alias name for the actual icon name.
         */
        typeIconFileName = iconMapSvc.getTypeFileName( typeName );
        if( !typeIconFileName ) {
            return null;
        }
    }

    return exports.getTypeIconFileTag( typeName, typeIconFileName );
};

/**
 * @param {String} typeName - The 'type' name (w/o the 'type' prefix) to get an icon for.
 *
 * @param {String} typeIconFileName - The name of the icon file associated with the typeName.
 *
 * @return {String} The &lt;IMG&gt; tag for the given type name (or null if the icon name has not been registered as
 *         an alias in a module.json or the SVG file was not found during war the build).
 */
export let getTypeIconFileTag = function( typeName, typeIconFileName ) {
    /**
     * Build final tag and put into the 'use' cache to save some work in the future.
     */
    var iconTag = '<img class="aw-base-icon" src="' + exports.getTypeIconFileUrl( typeIconFileName ) +
        '" draggable="false" ondragstart="return false;" alt="" />';

    _cache.use[ typeName ] = iconTag;

    return iconTag;
};

/**
 * @param {String} typeIconFileName - The name of the icon file associated with the typeName.
 *
 * @return {String} The &lt;IMG&gt; tag for the given type name (or null if the icon name has not been registered as
 *         an alias in a module.json or the SVG file was not found during war the build).
 */
export let getTypeIconFileUrl = function( typeIconFileName ) {
    return iconRepositoryService.getIconFileUrl( typeIconFileName );
};

/**
 * Returns the &lt;IMG&gt; tag for the given type name.
 *
 * @param {String} typeName - The 'type' name (w/o the 'type' prefix and no number suffix) to get an icon for.
 *
 * @return {String} The path to the icon image on the web server (or null if no type icon has not been registered as
 *         an alias in a module.json or the SVG file was not found during war the build).
 */
export let getTypeIconURL = function( typeName ) {
    var iconFileName;

    var modelType = cmm.getType( typeName );
    if( modelType && modelType.constantsMap.IconFileName ) {
        iconFileName = modelType.constantsMap.IconFileName;
    }

    if( !iconFileName ) {
        /**
         * Check if this is an alias name for the actual icon name.
         */
        iconFileName = iconMapSvc.getTypeFileName( typeName );
    }

    if( !iconFileName ) {
        return null;
    }

    /**
     * Create the path to the deployed icon file.
     */
    return iconRepositoryService.getIconFileUrl( iconFileName );
};

/**
 * Returns the HTML &lt;SVG&gt; string for the given ('home' + name) icon **with** 'class' attribute already set to
 * 'aw-base-icon'.
 *
 * @param {String} name - The icon name suffix to get an icon definition for.
 *
 * @return {String} SVG definition string for the icon (or null if the icon name has not been registered as an alias
 *         in a module.json or the SVG file was not found during war the build).
 */
export let getTileIcon = function( name ) {
    return _getIcon( 'home' + name );
};

/**
 * Returns the HTML &lt;SVG&gt; string for the given ('misc' + name) icon **with** 'class' attribute already set to
 * 'aw-base-icon'.
 *
 * @param {String} name - The icon name suffix to get an icon definition for.
 *
 * @return {String} SVG definition string for the icon (or null if the icon name has not been registered as an alias
 *         in a module.json or the SVG file was not found during war the build).
 */
export let getMiscIcon = function( name ) {
    return _getIcon( 'misc' + name );
};

/**
 * Returns the HTML &lt;SVG&gt; string for the given ('cmd' + name) icon **with** 'class' attribute already set to
 * 'aw-base-icon'.
 *
 * @param {String} name - The icon name suffix to get an icon definition for.
 *
 * @return {String} SVG definition string for the icon (or null if the icon name has not been registered as an alias
 *         in a module.json or the SVG file was not found during war the build).
 */
export let getCmdIcon = function( name ) {
    return _getIcon( 'cmd' + name );
};

/**
 * Returns the HTML &lt;SVG&gt; string for the given icon name **with** 'class' attribute already set to
 * 'aw-base-icon'.
 *
 * @param {String} iconName - the icon name to get an icon for.
 *
 * @return {String} SVG definition string for the icon (or null if the icon name has not been registered as an alias
 *         in a module.json or the SVG file was not found during war the build).
 */
export let getAwIcon = function( iconName ) {
    return _getIcon( iconName );
};

/**
 * Returns the HTML &lt;SVG&gt; string for the given icon name **without** any 'class' attribute being set.
 *
 * @param {String} iconName - the icon name to get an icon for.
 *
 * @return {String} SVG definition string for the icon (or null if the icon name has not been registered as an alias
 *         in a module.json or the SVG file was not found during war the build).
 */
export let getIcon = function( iconName ) {
    /**
     * Check if this is an alias name for the actual icon name.
     */
    var key = iconMapSvc.resolveIconName( iconName );

    let _images = ImageCacheService.instance;
    return _images && _images[ key ];
};

/**
 * Returns the HTML &lt;SVG&gt; string for the given ('indicator' + name) icon **with** 'class' attribute already
 * set to 'aw-base-icon'.
 *
 * @param {String} iconName - the icon name to get an icon for.
 *
 * @return {String} SVG definition string for the icon (or null if the icon name has not been registered as an alias
 *         in a module.json or the SVG file was not found during war the build).
 */
export let getIndicatorIcon = function( iconName ) {
    return _getIcon( 'indicator' + iconName );
};

exports = {
    getTypeIcon,
    getTypeIconFileTag,
    getTypeIconFileUrl,
    getTypeIconURL,
    getTileIcon,
    getMiscIcon,
    getCmdIcon,
    getAwIcon,
    getIcon,
    getIndicatorIcon
};
export default exports;
/**
 * This service provides access to the definition of SVG icons deployed on the web server.
 *
 * @memberof NgServices
 * @member iconService
 *
 * @param {soa_kernel_clientMetaModel} cmm - Service to use.
 * @param {iconMapService} iconMapSvc - Service to use.
 * @param {iconRepositoryService} iconRepositoryService - Service to use.
 * @param {configurationService} cfgService - Service to use.
 *
 * @returns {defaultIconProviderService} Reference to service API object.
 */
app.factory( 'defaultIconProviderService', () => exports );

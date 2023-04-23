// Copyright (c) 2020 Siemens

/**
 * {@httpIconProviderService} icon provider prepares &lt;img&gt; tag is requires based on configuration provided in
 * solution definition. It uses {@defaultIconProviderService} to use build time prepared cache.
 *
 * @module js/httpIconProviderService
 */
import app from 'app';
import defaultIconProviderService from 'js/defaultIconProviderService';
import iconRepositoryService from 'js/iconRepositoryService';

var exports = {};
/**
 * Returns the &lt;img&gt; tag for the given icon name
 *
 * @private
 *
 * @param {String} name - The name of the icon to return.
 *
 * @return {String} The &lt;img&gt; tag for the given icon name (or NULL if the icon file was not deployed).
 */
function _getIMGTag( name ) {
    if( !name ) {
        return null;
    }
    var iconUrl = iconRepositoryService.getIconFileUrl( name + '.svg' );
    if( iconUrl ) {
        return '<img class="aw-base-icon" src="' + iconUrl +
            '" draggable="false" ondragstart="return false;" alt="' + name + '" />';
    }
    return null;
}

/**
 * Returns the &lt;IMG&gt; tag for the given type name.
 *
 * @param {String} typeName - The 'type' name (w/o the 'type' prefix) to get an icon for.
 *
 * @return {String} The &lt;IMG&gt; tag for the given type name.
 */
export let getTypeIcon = function( typeName ) {
    var icon = defaultIconProviderService.getTypeIcon( typeName );
    if( !icon ) {
        icon = _getIMGTag( typeName );
    }
    return icon;
};

/**
 * @param {String} typeName - The 'type' name (w/o the 'type' prefix) to get an icon for.
 *
 * @param {String} typeIconFileName - The name of the icon file associated with the typeName.
 *
 * @return {String} The &lt;IMG&gt; tag for the given type name
 */
export let getTypeIconFileTag = function( typeName, typeIconFileName ) {
    if( !typeIconFileName ) {
        return null;
    }
    var iconUrl = iconRepositoryService.getIconFileUrl( typeIconFileName );
    if( iconUrl ) {
        return '<img class="aw-base-icon" src="' + iconUrl +
            '" draggable="false" ondragstart="return false;" alt="' + typeName + '" />';
    }
    return null;
};

/**
 * Returns URL.
 *
 * @param {String} typeIconFileName - The name of the icon file associated with the typeName.
 *
 * @return {String} The &lt;IMG&gt; tag for the given type name
 */
export let getTypeIconFileUrl = function( typeIconFileName ) {
    return iconRepositoryService.getIconFileUrl( typeIconFileName );
};

/**
 * Returns URL.
 *
 * @param {String} typeName - The 'type' name (w/o the 'type' prefix and no number suffix) to get an icon for.
 *
 * @return {String} The path to the icon image on the web server
 */
export let getTypeIconURL = function( typeName ) {
    var iconUrl = defaultIconProviderService.getTypeIconURL( typeName );
    if( !iconUrl ) {
        iconUrl = iconRepositoryService.getIconFileUrl( typeName + '.svg' );
    }
    return iconUrl;
};

/**
 * Returns the HTML &lt;SVG&gt;or &lt;img&gt;.
 *
 * @param {String} name - The icon name suffix to get an icon definition for.
 *
 * @return {String} Returns the HTML &lt;SVG&gt;or &lt;img&gt;.
 */
export let getTileIcon = function( name ) {
    var icon = defaultIconProviderService.getTileIcon( name );
    if( !icon ) {
        icon = _getIMGTag( 'home' + name );
    }
    return icon;
};

/**
 * Returns the HTML &lt;SVG&gt;or &lt;img&gt;.
 *
 * @param {String} name - The icon name suffix to get an icon definition for.
 *
 * @return {String} Returns the HTML &lt;SVG&gt;or &lt;img&gt;.
 */
export let getMiscIcon = function( name ) {
    var icon = defaultIconProviderService.getMiscIcon( name );
    if( !icon ) {
        icon = _getIMGTag( 'misc' + name );
    }
    return icon;
};

/**
 * Returns the HTML &lt;SVG&gt; or &lt;img&gt;.
 *
 * @param {String} name - The icon name.
 *
 * @return {String} SVG definition string for the icon
 */
export let getCmdIcon = function( name ) {
    var icon = defaultIconProviderService.getCmdIcon( name );
    if( !icon ) {
        icon = _getIMGTag( 'cmd' + name );
    }
    return icon;
};

/**
 * Returns the HTML &lt;SVG&gt; or &lt;img&gt;.
 *
 * @param {String} iconName - the icon name to get an icon for.
 *
 * @return {String} Returns the HTML &lt;SVG&gt; or &lt;img&gt;
 */
export let getAwIcon = function( iconName ) {
    var icon = defaultIconProviderService.getAwIcon( iconName );
    if( !icon ) {
        icon = _getIMGTag( iconName );
    }
    return icon;
};

/**
 * Returns the HTML &lt;SVG&gt; or &lt;img&gt;
 *
 * @param {String} iconName - the icon name to get an icon for.
 *
 * @return {String}Returns the HTML &lt;SVG&gt; or &lt;img&gt;
 */
export let getIndicatorIcon = function( iconName ) {
    var icon = defaultIconProviderService.getIndicatorIcon( iconName );
    if( !icon ) {
        icon = _getIMGTag( 'indicator' + iconName );
    }
    return icon;
};
/**
 * Returns the HTML &lt;SVG&gt; or &lt;img&gt;
 *
 * @param {String} iconName - the icon name to get an icon for.
 *
 * @return {String} SVG definition string or img tag .
 */
export let getIcon = function( iconName ) {
    var icon = defaultIconProviderService.getIcon( iconName );
    if( !icon ) {
        icon = _getIMGTag( iconName );
    }
    return icon;
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
    getIndicatorIcon,
    getIcon
};
export default exports;
/**
 * This service provides access to the definition of SVG icons deployed on a web server as configured in solution
 * (kit.json).
 *
 * @memberof NgServices
 * @member httpIconProviderService
 *
 * @param {defaultIconProviderService} defaultIconProviderService - Service to use.
 * @param {iconRepositoryService} iconRepositoryService - Service to use.
 *
 * @returns {httpIconProviderService} Reference to service API Object.
 */
app.factory( 'httpIconProviderService', () => exports );

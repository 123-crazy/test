// Copyright (c) 2020 Siemens

/**
 * Please refer {@link https://gitlab.industrysoftware.automation.siemens.com/Apollo/afx/wikis/solution#solution-configuration-for-obtaining-images|Solution configuration for obtaining images}
 *
 * @module js/iconService
 *
 * @publishedApolloService
 *
 */
import app from 'app';
import iconRepositoryService from 'js/iconRepositoryService';
import defaultIconProviderService from 'js/defaultIconProviderService';
import httpIconProviderService from 'js/httpIconProviderService';

var exports = {};

/**
 * Reference IconService
 */
var _iconServiceProvider;

/**
 * Returns the &lt;IMG&gt; tag for the given type name (or one of its parent super types if the given type icon file
 * was not deployed) **with** 'class' attribute already set to 'aw-base-icon' and draggability disabled.
 *
 * @param {String} typeName - The 'type' name (w/o the 'type' prefix) to get an icon for.
 *
 * @return {String} The &lt;IMG&gt; tag for the given type name (or null if the icon name has not been registered as
 *         an alias in a module.json or the SVG file was not found during war the build).
 * @ignore
 */
export let getTypeIcon = function( typeName ) {
    return _iconServiceProvider.getTypeIcon( typeName );
};

/**
 * @param {String} typeName - The 'type' name (w/o the 'type' prefix) to get an icon for.
 *
 * @param {String} typeIconFileName - The name of the icon file associated with the typeName.
 *
 * @return {String} The &lt;IMG&gt; tag for the given type name (or null if the icon name has not been registered as
 *         an alias in a module.json or the SVG file was not found during war the build).
 * @ignore
 */
export let getTypeIconFileTag = function( typeName, typeIconFileName ) {
    return _iconServiceProvider.getTypeIconFileTag( typeName, typeIconFileName );
};

/**
 * @param {String} typeIconFileName - The name of the icon file associated with the typeName.
 *
 * @return {String} The &lt;IMG&gt; tag for the given type name (or null if the icon name has not been registered as
 *         an alias in a module.json or the SVG file was not found during war the build).
 * @ignore
 */
export let getTypeIconFileUrl = function( typeIconFileName ) {
    return _iconServiceProvider.getTypeIconFileUrl( typeIconFileName );
};

/**
 * Returns the &lt;IMG&gt; tag for the given type name.
 *
 * @param {String} typeName - The 'type' name (w/o the 'type' prefix and no number suffix) to get an icon for.
 *
 * @return {String} The path to the icon image on the web server (or null if no type icon has not been registered as
 *         an alias in a module.json or the SVG file was not found during war the build).
 * @ignore
 */
export let getTypeIconURL = function( typeName ) {
    return _iconServiceProvider.getTypeIconURL( typeName );
};

/**
 * Returns the HTML &lt;SVG&gt; string for the given ('home' + name) icon **with** 'class' attribute already set to
 * 'aw-base-icon'.
 *
 * @param {String} name - The icon name suffix to get an icon definition for.
 *
 * @return {String} SVG definition string for the icon (or null if the icon name has not been registered as an alias
 *         in a module.json or the SVG file was not found during war the build).
 * @ignore
 */
export let getTileIcon = function( name ) {
    return _iconServiceProvider.getTileIcon( name );
};

/**
 * Returns the HTML &lt;SVG&gt; string for the given ('misc' + name) icon **with** 'class' attribute already set to
 * 'aw-base-icon'.
 *
 * @param {String} name - The icon name suffix to get an icon definition for.
 *
 * @return {String} SVG definition string for the icon (or null if the icon name has not been registered as an alias
 *         in a module.json or the SVG file was not found during war the build).
 * @ignore
 */
export let getMiscIcon = function( name ) {
    return _iconServiceProvider.getMiscIcon( name );
};

/**
 * Returns the HTML &lt;SVG&gt; string for the given ('cmd' + name) icon **with** 'class' attribute already set to
 * 'aw-base-icon'.
 *
 * @param {String} name - The icon name suffix to get an icon definition for.
 *
 * @return {String} SVG definition string for the icon (or null if the icon name has not been registered as an alias
 *         in a module.json or the SVG file was not found during war the build).
 * @ignore
 */
export let getCmdIcon = function( name ) {
    return _iconServiceProvider.getCmdIcon( name );
};

/**
 * Returns the HTML &lt;SVG&gt; string for the given icon name **with** 'class' attribute already set to
 * 'aw-base-icon'.
 *
 * @param {String} iconName - the icon name to get an icon for.
 *
 * @return {String} SVG definition string for the icon (or null if the icon name has not been registered as an alias
 *         in a module.json or the SVG file was not found during war the build).
 * @ignore
 */
export let getAwIcon = function( iconName ) {
    return _iconServiceProvider.getAwIcon( iconName );
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
    return _iconServiceProvider.getIcon( iconName );
};

/**
 * Returns the HTML &lt;SVG&gt; string for the given ('indicator' + name) icon **with** 'class' attribute already
 * set to 'aw-base-icon'.
 *
 * @param {String} iconName - the icon name to get an icon for.
 *
 * @return {String} SVG definition string for the icon (or null if the icon name has not been registered as an alias
 *         in a module.json or the SVG file was not found during war the build).
 * @ignore
 */
export let getIndicatorIcon = function( iconName ) {
    return _iconServiceProvider.getIndicatorIcon( iconName );
};

/**
 * Initialize icon service provider.
 */
export let initializeIconServiceProvider = function() {
    switch ( iconRepositoryService.getIconFetchMethod() ) {
        case iconRepositoryService.GET:
            _iconServiceProvider = httpIconProviderService;
            break;
        case iconRepositoryService.DEFAULT:
        default:
            _iconServiceProvider = defaultIconProviderService;
    }
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
    getIndicatorIcon,
    initializeIconServiceProvider
};
export default exports;

initializeIconServiceProvider();

/**
 * This service provides access to the definition of SVG icons deployed on the web server.
 *
 * @memberof NgServices
 * @member iconService
 *
 * @param {iconRepositoryService} iconRepositoryService - Service to use.
 * @param {defaultIconProviderService} defaultIconProviderService - Service to use.
 * @param {httpIconProviderService} httpIconProviderService - Service to use.
 *
 * @returns {iconService} Reference to service API Object.
 */
app.factory( 'iconService', () => exports );

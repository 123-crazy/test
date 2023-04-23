// Copyright (c) 2020 Siemens

/**
 * Defines {@link themeService} which manages themes.
 *
 * @module js/theme.service
 */
import app from 'app';
import ngModule from 'angular';
import eventBus from 'js/eventBus';
import appCtxService from 'js/appCtxService';
import configurationService from 'js/configurationService';
import localStorage from 'js/localStorage';

let exports;

/**
 * The theme link element
 */
let themeLink = null;

/**
 * Theme context
 */
let themeContext = 'theme';

/**
 * Initialize the theme service
 */
export function init() {
    if( !themeLink ) {
        themeLink = document.createElement( 'link' );
        themeLink.type = 'text/css';
        themeLink.rel = 'stylesheet';
        themeLink.id = 'theme';
        ngModule.element( 'head' ).append( themeLink );
        localStorage.subscribe( themeContext, function( event ) {
            exports.setTheme( event.newValue );
        } );
    }
    exports.setInitialTheme();
}

/**
 * Get the current theme
 *
 * @return {String} The current theme
 */
export function getTheme() {
    return appCtxService.getCtx( themeContext );
}

/**
 * Set the theme to the theme in local storage or the default theme
 */
export function setInitialTheme() {
    var localTheme = exports.getLocalStorageTheme();
    if( localTheme ) {
        exports.setTheme( localTheme );
    } else {
        exports.getDefaultTheme().then( exports.setTheme );
    }
}

/**
 * Get the current theme from local storage
 *
 * @return {String} The theme in local storage
 */
export function getLocalStorageTheme() {
    return localStorage.get( themeContext );
}

/**
 * Get the default theme defined by the workspace
 *
 * @return {String} The default workspace theme
 */
export function getDefaultTheme() {
    return configurationService.getCfg( 'solutionDef' ).then( function( solutionDef ) {
        return solutionDef.defaultTheme ? solutionDef.defaultTheme : 'ui-lightTheme';
    } );
}

/**
 * Set the current theme
 *
 * @example themeService.setTheme( 'ui-lightTheme' )
 *
 * @param {String} newTheme - The new theme
 */
export function setTheme( newTheme ) {
    if( getTheme() !== newTheme ) {
        themeLink.href = app.getBaseUrlPath() + '/' + newTheme + '.css';
        appCtxService.registerCtx( themeContext, newTheme );
        localStorage.publish( themeContext, newTheme );
        eventBus.publish( 'ThemeChangeEvent', {
            theme: newTheme
        } );
    }
}

/**
 * Since this module can be loaded as a dependent DUI module we need to return an object indicating which service
 * should be injected to provide the API for this module.
 */

exports = {
    init,
    getTheme,
    setInitialTheme,
    getLocalStorageTheme,
    getDefaultTheme,
    setTheme
};
export default exports;

/**
 * @memberof NgServices
 * @member themeService
 *
 * @returns {themeService} Reference to the service API object.
 */
app.factory( 'themeService', () => exports );

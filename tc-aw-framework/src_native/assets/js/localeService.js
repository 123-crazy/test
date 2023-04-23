// Copyright (c) 2020 Siemens

/**
 * @module js/localeService
 *
 * @publishedApolloService
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import browserUtils from 'js/browserUtils';
import cfgSvc from 'js/configurationService';
import localStrg from 'js/localStorage';
import 'config/installedLocales';

/**
 * The country (i.e. region) code of the current locale that will be appended to the textBundle name to resolve the
 * text bundle resource (e.g. '' (English), '_de' (German), '_zh_TW' (Chinese)).
 *
 * @private
 */
var _bundleSuffix = '';

/**
 * Locale value set up-to-date once login is complete.
 * <P>
 * Note: Until login, the default values we be as shown here.
 *
 * @private
 */
var _localeCode;

/**
 * Cache of installed locales
 * @private
 */
var _installedLocales;

/**
 * Local Storage key for last used locale.
 * @private
 */
var getBrowserSessionLocaleKey = 'locale';

/**
 * Default locale if local storage locale is undefined
 * @private
 */
var getDefaultLocaleCode = 'en';

let exports;

/**
 * @return {String[]} array of installed locales
 */
export let getInstalledLocales = function() {
    return _installedLocales;
};

/**
 * @param {String} locale - input locale
 * @return {String|null} resolved locale
 */
function matchInstalledLocales( locale ) {
    locale = locale.replace( /-/g, '_' );
    if( _installedLocales.indexOf( locale ) > -1 ) {
        return locale;
    }

    // search by the 2 character locale
    var localeShort = locale.substring( 0, 2 ).toLowerCase();
    var ndx = _installedLocales.indexOf( localeShort );
    if( ndx > -1 ) {
        return _installedLocales[ ndx ];
    }

    // search by ignoring case
    var resolvedLocale;
    _.forEach( _installedLocales, function( installedLocale ) {
        if( locale.toLowerCase() === installedLocale.toLowerCase() ) {
            resolvedLocale = installedLocale;
            return false; // break
        }
    } );
    if( !resolvedLocale ) {
        // search based upon only the first 2 characters
        _.forEach( _installedLocales, function( installedLocale ) {
            if( localeShort && installedLocale.startsWith( localeShort ) ) {
                resolvedLocale = installedLocale;
                return false; // break
            }
        } );
    }
    return resolvedLocale;
}

/**
 * Return the current locale from the URL or browsers 'userAgent'
 *
 * @return {String} The 'locale' code for the current browser session based on a 'locale=' query in the URL or the
 *         browsers 'userAgent' (e.g. 'en_US', 'zh_CN', etc.).
 */
function resolveLocale() {
    var localeCode;

    /**
     * (1) Look for the 'locale' in the URL and if found extract the value from it.
     */
    var localeFromURL = browserUtils.getUrlAttributes().locale;
    if( localeFromURL ) {
        localeCode = matchInstalledLocales( localeFromURL );
        if( !localeCode ) {
            // Remove invalid locale settings from URL
            browserUtils.removeUrlAttribute( 'locale' );
        }
    }

    if( !localeCode ) {
        /**
         * (2) Check localStorage for a last used locale
         */
        localeCode = localStrg.get( getBrowserSessionLocaleKey );
        if( localeCode ) {
            localeCode = matchInstalledLocales( localeCode );
        }
    }

    if( !localeCode ) {
        /**
         * (3) Check if we should simply assume the browser's current locale setting.
         */
        var navigator = browserUtils.getWindowNavigator();
        if( navigator ) {
            localeCode = matchInstalledLocales( navigator.userLanguage || navigator.language );
        }
    }

    if( !localeCode ) {
        /**
         * (4) Fallback to initial locale in installed array
         */
        localeCode = _installedLocales[ 0 ];
    }

    setLocaleInt( localeCode );

    return localeCode;
}

/**
 * Sets the selected locale in local storage
 *
 * @param {Object} loginPageLocale - selected locale
 * @ignore
 */
export let setLocaleInLocalStorage = function( loginPageLocale ) {
    localStrg.publish( getBrowserSessionLocaleKey, loginPageLocale );
    setLocaleInDOM();
};

/**
 * Sets the selected locale in DOM html tag
 */
function setLocaleInDOM() {
    let localeCode = localStrg.get( getBrowserSessionLocaleKey );
    let element = document.getElementsByTagName( 'HTML' )[ 0 ];
    let attLang = document.createAttribute( 'lang' );
    attLang.value = localeCode ? localeCode.replace( /_/g, '-' ) : getDefaultLocaleCode;
    element.setAttributeNode( attLang );
}

/**
 * @param {String} localeCode - locale code
 */
function setLocaleInt( localeCode ) {
    _localeCode = localeCode;

    /**
     * Create the text bundle suffix.
     */
    if( /^en/.test( localeCode ) ) {
        _bundleSuffix = '';
    } else {
        _bundleSuffix = '_' + localeCode;
    }
}

/**
 * Initializes user language and country code variables for this service.
 * <P>
 * Note: We handle some special cases to where we want just the language code without the region code (a.k.a.
 * country code).
 *
 * @param {String} localeCode - The locale in standard 'language_Country' format e.g. 'en_US'.
 * @return {String} resolved locale
 * @ignore
 */
export let setLocale = function( localeCode ) {
    localeCode = matchInstalledLocales( localeCode );

    // Update localStorage with new value
    exports.setLocaleInLocalStorage( localeCode );

    // Remove from the URL after storing in localStorage
    browserUtils.removeUrlAttribute( 'locale' );

    if( localeCode !== _localeCode ) {
        setLocaleInt( localeCode );

        eventBus.publish( 'locale.changed', _localeCode );
    }

    return localeCode;
};

/**
 * Returns the i18n code for the current user language *with* any country or region code.
 * <P>
 * Note: This value set up-to-date once login is complete. Until then, it will return a default locale code of
 * 'en_US'.
 *
 * @return {String} Current Locale value e.g. 'en_US'
 */
export let getLocale = function() {
    return _localeCode;
};

/**
 * Returns baseName in the path.
 *
 * @param {String} path - path of the resource.
 * @return {String} baseName of the resource.
 */
var baseName = function( path ) {
    if( !path ) {
        return 'BaseMessages';
    }
    var base = path.substring( path.lastIndexOf( '/' ) + 1 );
    if( base.lastIndexOf( '.' ) !== -1 ) {
        base = base.substring( 0, base.lastIndexOf( '.' ) );
    }
    return base;
};

/**
 * Returns a promise that will be 'resolved' with the localized string text bundle object for the given i18n
 * 'resource'.
 *
 * @param {String} resource - Name of the country-neutral (i.e. w/o country-code or extension) i18n resource to load
 *            (or null to return the 'BaseMessages' resource).
 *
 * @param {boolean} useNative - use browser native API to execute. Don't use it in return before beyond angular is done
 *
 * @return {Promise} A promise that will be 'resolved' with the localized string text bundle object for the
 *         given i18n 'resource' (or 'null' if the resource is not found or the 'localeService' has not be injected
 *         correctly.).
 */
export let getTextPromise = function( resource, useNative ) {
    var resourceFinal = baseName( resource );
    return cfgSvc.getCfg( 'i18n' + _bundleSuffix + '.' + resourceFinal, false, useNative );
};

/**
 * Returns localized text from the given resource with the given key
 *
 * @param {String} resource - Name of the country-neutral (i.e. w/o country-code or extension) i18n resource to load
 *            (or null to return the 'BaseMessages' resource).
 * @param {String} key - The text key for the text which need to be localized
 * @param {boolean} useNative - use browser native API to execute. Don't use it in return before beyond angular is done
 * @return {Promise} Promise containing the localized text
 */
export let getLocalizedText = function( resource, key, useNative ) {
    var resourceFinal = baseName( resource );
    return cfgSvc.getCfg( 'i18n' + _bundleSuffix + '.' + resourceFinal + '.' + key, false, useNative );
};

/**
 * Returns localized text from the given resource with the given key
 *
 * @param {String} resource - Name of the country-neutral (i.e. w/o country-code or extension) i18n resource.key to load
 * @param {Boolean} useNative - use browser native API to execute. Don't use it in return before beyond angular is done
 * @return {Promise} Promise containing the localized text
 */
export let getLocalizedTextFromKey = async function( resource, useNative ) {
    return cfgSvc.getCfg( 'i18n' + _bundleSuffix + '.' + resource, false, useNative );
};

/**
 * Returns the country (i.e. region) code of the current locale that will be appended to the textBundle name to
 * resolve the text bundle resource (e.g. '' (English), '_de' (German), '_zh_TW' (Chinese)). *
 *
 * @return {String} i18n code for the current user region *without* any language code.
 * @ignore
 */
export let getBundleSuffix = function() {
    return _bundleSuffix;
};

/**
 * Returns the i18n code for the current user language *without* any country or region code.
 *
 * @return {String} The i18n code for the current user language *without* any country or region code.
 * @ignore
 */
export let getLanguageCode = function() {
    return _localeCode.substring( 0, 2 );
};

/**
 * Returns the cached textBundle resource (or NULL if the bundle has not been cached yet).
 *
 * @param {Object} resource - Name of the textBundle to return.
 *
 * @return {Object} Cached textBundle resource (or NULL if the bundle has not been cached yet).
 */
export let getLoadedText = function( resource ) {
    var resourceFinal = baseName( resource );

    return cfgSvc.getCfgCached( 'i18n' + _bundleSuffix + '.' + resourceFinal );
};

/**
 * Returns the cached textBundle resource (or NULL if the bundle has not been cached yet).
 *
 * @param {Object} resource - Name of the textBundle.key to return.
 *
 * @return {String} Cached localized text from textBundle
 */
export let getLoadedTextFromKey = function( resource ) {
    return cfgSvc.getCfgCached( 'i18n' + _bundleSuffix + '.' + resource );
};

/**
 * Gets the default language based on locale stored in 1) the URL (if 'locale' attributes is defined) or 2) local
 * storage.
 *
 * @param {Object} installedLanguages - default selected locale
 * @param {StringMap} localeTextBundle - (Optional) Text bundle containing a mapping of locale code to locale specific name of the language (eg localeTextBundle.en_US = English).
 * @returns {String} Default language based on locale stored in local storage.
 * @ignore
 */
export let getDefaultLanguage = function( installedLanguages, localeTextBundle ) {
    var defaultLang = {};

    var locale = resolveLocale();

    if( localeTextBundle ) {
        if( locale ) {
            defaultLang.dbValue = locale;
            defaultLang.uiValue = localeTextBundle[ locale ];
            defaultLang.isSelected = true;

            return defaultLang;
        }
    }

    // Override the selected language with local storage locale value
    if( locale ) {
        _.forEach( installedLanguages, function( installedLanguage ) {
            if( installedLanguage.dbValue === locale ) {
                installedLanguage.isSelected = true;
                defaultLang = installedLanguage;
            }
        } );
    }

    if( _.isEmpty( defaultLang ) ) {
        defaultLang.dbValue = 'en_US';
        defaultLang.uiValue = 'English';
        defaultLang.isSelected = true;
        locale = defaultLang.dbValue;
    }

    if( locale && locale !== exports.getLocale() ) {
        exports.setLocale( locale );
    }

    return defaultLang;
};

exports = {
    getInstalledLocales,
    setLocaleInLocalStorage,
    setLocale,
    getLocale,
    getTextPromise,
    getLocalizedText,
    getBundleSuffix,
    getLanguageCode,
    getLoadedText,
    getDefaultLanguage,
    getLocalizedTextFromKey,
    getLoadedTextFromKey
};
export default exports;

_installedLocales = cfgSvc.getCfgCached( 'installedLocales' );

/**
 * Look for the default 'locale' in the URL and if found extract the value from it.
 */
exports.setLocale( resolveLocale() );

/**
 * @memberof NgServices
 * @member localeService
 *
 * @param {configurationService} cfgSvcNg - Service to use.
 * @returns {localeService} Reference to service API Object.
 */
app.factory( 'localeService', () => exports );

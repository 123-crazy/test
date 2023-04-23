// Copyright (c) 2020 Siemens

/**
 * @module js/iconRepositoryService
 */
import app from 'app';
import awConfiguration from 'js/awConfiguration';

/** Exports */
let exports;

/** A place holder */
let BASE_URL = '{{baseUrl}}';

/** Fetch method. */
let _fetchMethod = null;

/** URl */
let _Url = null;

/** constant a possible value of #fetchMethod */
export let GET = 'GET';
export let DEFAULT = 'DEFAULT';

/**
 * Return Url based on configuration.
 *
 * @param {String} filename - Name of the file to base retun value on.
 *
 * @return {String} The IconFile URL
 */
export let getIconFileUrl = function( filename ) {
    if( _Url ) {
        return _Url + filename;
    }
    return undefined;
};

/**
 * @return {Function} Method to be used for Icon.
 */
export let getIconFetchMethod = function() {
    return _fetchMethod;
};

/**
 * Initialize the service.
 */
export let initialize = function() {
    let imageRepositoryConfiguration = awConfiguration.get( 'imageRepositoryConfiguration' );
    if( !( imageRepositoryConfiguration && imageRepositoryConfiguration.actionType && imageRepositoryConfiguration.url ) ) {
        return;
    }
    if( imageRepositoryConfiguration.actionType === exports.GET &&
        imageRepositoryConfiguration.url.indexOf( BASE_URL ) > -1 ) {
        _Url = imageRepositoryConfiguration.url.replace( BASE_URL, awConfiguration.get( 'baseUrl' ) + '/image/' );
        _fetchMethod = exports.DEFAULT;
    } else if( imageRepositoryConfiguration.actionType === exports.GET ) {
        _Url = imageRepositoryConfiguration.url + '/image/';
        _fetchMethod = exports.GET;
    }
};

exports = {
    GET,
    DEFAULT,
    getIconFileUrl,
    getIconFetchMethod,
    initialize
};
export default exports;

/**
 * This service provides access method and url of icons based on configuration in kit.
 *
 * @memberof NgServices
 * @member iconRepositoryService
 *
 * @returns {iconRepositoryService} Reference to service API Object.
 */
app.factory( 'iconRepositoryService', () => exports );

initialize();

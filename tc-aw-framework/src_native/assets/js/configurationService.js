// Copyright (c) 2020 Siemens
/* eslint-env es6 */

/**
 * Please refer {@link https://gitlab.industrysoftware.automation.siemens.com/Apollo/afx/wikis/configuration#adding-new-configuration-point|Adding new configuration point}
 *
 * @module js/configurationService
 * @publishedApolloService
 */
// module
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import localStrgSvc from 'js/localStorage';
import awConfiguration from 'js/awConfiguration';
import { httpGetJsonObject } from 'js/serviceUtils';

// service
import AwPromiseService from 'js/awPromiseService';
import AwHttpService from 'js/awHttpService';

/**
 * Map of base config file to promise for retrieving JSON file.
 *
 * @type {Object}
 * @private
 */
const _ongoing = {};

let exports;

export let config = awConfiguration.config;

// view model routing map, is setting up at site.js, and for now maybe
// overwritten by darsi
export let map = {
    default: {
        // default view model routing in DRAFT=true and darsi, it will be:
        // viewmodel: "*ViewModel"
    },
    bundle: {
        // view model rounting in DRAFT=false mode. Below is on example:
        // viewmodel: {
        //     occMgmtList: "viewmodel_occmgmt"
        // }
    }
};

const searchParams = location.search.slice( 1 ).split( '&' ); // Slice off the ?
let _darsiEnabled = false;
searchParams.forEach( param => {
    if( param.includes( 'dev' ) ) {
        _darsiEnabled = true;
    }
} );

/**
 * @param {Object} configMap - the configuration map
 * @ignore
 */
export let setMap = function( configMap ) {
    Object.assign( exports.map, configMap );
};

/**
 * @param {Path} path - path
 * @param {Object} data - Value to set at the 'path' location in the configuration.
 * @ignore
 */
export let add = awConfiguration.set;

/**
 * Get cached configuration data.
 * This is only intended to be used by the bootstrap prior to NG module initialization.
 *
 * @param {String} path - path
 * @return {Object} request value if already cached
 * @ignore
 */
export let getCfgCached = awConfiguration.get;

//////////////////////////////////////////////////////////////////////////////////////
/**
 * @param {Object} obj1 - base object
 * @param {Object} obj2 - object merge into base object
 */
function merge( obj1, obj2 ) {
    _.forEach( obj2, function( value, key ) {
        if( !obj1[ key ] ) {
            obj1[ key ] = value;
        } else {
            if( value && typeof value === 'object' && !Array.isArray( value ) ) {
                merge( obj1[ key ], value );
            } else {
                obj1[ key ] = value;
            }
        }
    } );
}

/**
 * Notify that a configuration piece has changed and the local cache should be cleared
 *
 * @param {String} path Name of the Configuration (e.g. 'solutionDef')
 * @param {Boolean} updateLocalStorage Whether to update local storage. Defaults to true.
 * @static
 */
export let notifyConfigChange = function( path, updateLocalStorage ) {
    if( updateLocalStorage !== false ) {
        localStrgSvc.publish( 'configurationChange', JSON.stringify( {
            path: path,
            date: Date.now()
        } ) );
    }
    var root = path.split( '.' )[ 0 ];
    delete exports.config[ root ];
    eventBus.publish( 'configurationChange.' + root, {
        path: path
    } );
};

/**
 * Get configuration data for specified configuration path.
 *
 * @param {String} path Name of the Configuration (e.g. 'solutionDef')
 * @param {boolean} noCache Do not use cache
 * @param {boolean} isNative Use native API
 * @return {Promise} promise This would resolve to configuration json
 * @static
 */
export let getCfg = function( path, noCache, isNative ) {
    var ndx = path.indexOf( '.' );
    let PromiseObj = isNative ? Promise : AwPromiseService.instance;
    var basePath = ndx > -1 ? path.substring( 0, ndx ) : path;
    if( !noCache && ( _.has( exports.config, path ) ||
            !( exports.map.bundle[ basePath ] ||
                exports.map.default[ basePath ] ) &&
            _.has( exports.config, basePath ) ) ) {
        return PromiseObj.resolve( exports.getCfgCached( path ) );
    }
    var assetsPath = 'config/' + basePath;
    var mergePath;
    var httpGetPath;
    if( _darsiEnabled && /^(commandsViewModel|images|i18n.*)$/.test( basePath ) ) {
        httpGetPath = 'darsi/static/config/' + basePath + '.json';
        assetsPath = httpGetPath;
    } else if( _darsiEnabled && /^viewmodel$/.test( basePath ) ) {
        var key = path.split( '.' )[ 1 ];
        httpGetPath = 'darsi/views/' + key + '/model';
        assetsPath = httpGetPath;
        mergePath = path;
    } else {
        if( _.has( exports.map.bundle, path ) ) {
            assetsPath = 'config/' + _.get( exports.map.bundle, path );
            mergePath = basePath;
        } else if( exports.map.default[ basePath ] ) {
            mergePath = path;
            assetsPath = exports.map.default[ basePath ].replace( /\*/, path.replace( /\./g, '/' ) );
        }
        httpGetPath = awConfiguration.get( 'baseUrl' ) + '/' + assetsPath + '.json';
    }
    if( !_ongoing[ assetsPath ] ) {
        let http = isNative ? { get: httpGetJsonObject } : AwHttpService.instance;
        _ongoing[ assetsPath ] = http.get( httpGetPath ).then( function( response ) {
            if( response && response.data ) {
                var mergePoint = exports.config;
                if( mergePath ) {
                    mergePath.split( '.' ).forEach( function( elem ) {
                        if( !mergePoint[ elem ] ) { mergePoint[ elem ] = {}; }
                        mergePoint = mergePoint[ elem ];
                    } );
                }
                merge( mergePoint, response.data );
            }
            delete _ongoing[ assetsPath ]; // not needed any more
            return exports.getCfgCached( path );
        }, function() {
            //the entry needs to be deleted from _ongoing if the view/viewmodel is not found
            delete _ongoing[ assetsPath ];
        } );
    }
    return new PromiseObj( function( resolve, reject ) {
        _ongoing[ assetsPath ].then( function() {
            resolve( exports.getCfgCached( path ) );
        }, reject );
    } );
};

export let isDarsiEnabled = function() {
    return _darsiEnabled;
};

localStrgSvc.subscribe( 'configurationChange', function( data ) {
    var eventData = JSON.parse( data.newValue );
    notifyConfigChange( eventData.path, false );
} );

exports = {
    config,
    setMap,
    map,
    add,
    getCfg,
    getCfgCached,
    isDarsiEnabled,
    notifyConfigChange
};
export default exports;

/**
 * @memberof NgServices
 * @member configurationService
 *
 * @returns {configurationService} Reference to the service API object.
 */
app.factory( 'configurationService', () => exports );

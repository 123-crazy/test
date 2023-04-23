// Copyright (c) 2020 Siemens

/**
 * Note: Many of the the functions defined in this module return a {@linkcode module:angujar~Promise|Promise} object.
 * The caller should provide callback function(s) to the 'then' method of this returned object (e.g. successCallback,
 * [errorCallback, [notifyCallback]]). These methods will be invoked when the associated service result is known.
 *
 * @module soa/preferenceService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import _ from 'lodash';
import assert from 'assert';
import eventBus from 'js/eventBus';

import appCtxSvc from 'js/appCtxService';
import messagingService from 'js/messagingService';

var exports = {};

/**
 * @private
 */
var _prefName2preference = {};

// Preference types: 0 = String, 1 = Logical, 2 = Integer, 3 = Double, 4 = Date

/**
 * TRUE if bulk preferences are loaded
 *
 * @private
 */
var _areBulkPreferencesLoaded = false;

/**
 * Stores all the bulk load entries
 *
 * @private
 */
var _bulkLoadPreferences = [];

/**
 * Stores listener to appCtx.update
 *
 * @private
 */
var _onAppCtxUpdateListener = null;

/**
 * @param {Object} context - context return from appCtx.updatePartialCtx
 */
function onCtxPartialUpdateHandler( context ) {
    if( context.name === 'preferences' ) {
        exports.setStringValue( context.target, context.value[ context.name ][ context.target ] );
    }
}

/**
 * This is the method which conditionally calls the server for the preference values.
 *
 * @param {StringArray} names - Array of preference names
 * @param {Boolean} bulkCache - bulk caching call?
 * @return {Promise} promise
 * @private
 */
function getPrefs( names, bulkCache ) {
    names.sort(); // debug help only

    if( bulkCache ) {
        _bulkLoadPreferences = names;
        return soaSvc.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'getPreferences', {
            preferenceNames: names,
            includePreferenceDescriptions: false
        }, {} ).then( function( result ) {
            if( result && result.response ) {
                if( _onAppCtxUpdateListener ) {
                    eventBus.unsubscribe( _onAppCtxUpdateListener );
                }

                var prefCtx = {};

                _.forEach( result.response, function( pref ) {
                    // clean up unused stuff...
                    if( pref.definition ) {
                        delete pref.definition.category;
                        delete pref.definition.protectionScope;
                        delete pref.definition.isOOTBPreference;
                        delete pref.definition.isEnvEnabled;
                        delete pref.definition.isDisabled;
                        delete pref.definition.description;
                    }
                    if( pref.values ) {
                        delete pref.values.valueOrigination;
                    }
                    // Remove the preferences from the list which have been fetched successfully
                    _bulkLoadPreferences.splice( _bulkLoadPreferences.indexOf( pref.definition.name ), 1 );
                    // store
                    _prefName2preference[ pref.definition.name ] = pref;

                    if( pref.values.values ) {
                        prefCtx[ pref.definition.name ] = pref.values.values;
                    }
                } );

                appCtxSvc.updateCtx( 'preferences', prefCtx );

                if( _onAppCtxUpdateListener ) {
                    _onAppCtxUpdateListener = eventBus.subscribe( 'appCtx.update', onCtxPartialUpdateHandler );
                }

                // Fill the remaining preferences(returned from server as part of partial errors) with null values into the cache
                _.forEach( _bulkLoadPreferences, function( pref ) {
                    var defaultPreferenceValJson = {
                        definition: {
                            name: pref
                        },
                        values: {
                            values: [ null ]
                        }
                    };
                    _prefName2preference[ pref ] = defaultPreferenceValJson;
                } );

                _areBulkPreferencesLoaded = true;
                // Empty the list after processing
                _bulkLoadPreferences = [];
                eventBus.publish( 'bulkPreferencesLoaded', {} );
            }

            var timeoutPref = _prefName2preference.AWC_Notification_Timeout;
            if( timeoutPref &&
                timeoutPref.definition.name === 'AWC_Notification_Timeout' &&
                timeoutPref.values && timeoutPref.values.values && timeoutPref.values.values.length > 0 ) {
                var prefTimeout = timeoutPref.values.values[ 0 ];
                if( !isNaN( prefTimeout ) && prefTimeout.trim() !== '' ) {
                    var timeout = 0;
                    if( prefTimeout > 0 ) {
                        timeout = prefTimeout;
                    }
                    // this sets the info to the value from preference and error * 10, which is what used to happen earlier
                    messagingService.setTimeout( 'INFO', timeout );
                }
            }

            const pollingTimeout = _.get( _prefName2preference, 'AWC_Polling_Timeout.values.values[0]' );
            soaSvc.setPollingTimeout( _.toNumber( pollingTimeout ) );

            return _prefName2preference;
        } );
    }

    // using cached value for preferences
    return AwPromiseService.instance.resolve( _prefName2preference );
}

/**
 * This is the method calls the server to set the preference values.
 *
 * @param {Object} prefName2Values - map of preference name to preference values
 * @return {Promise} promise
 * @private
 */
function setPrefs( prefName2Values ) {
    var body = {
        preferenceInput: []
    };

    _.forEach( prefName2Values, function( values, name ) {
        var pref = _prefName2preference[ name ];
        // Remove the null entries from values array if any
        _.forEach( values, function( value ) {
            if( value === null ) {
                values.splice( values.indexOf( value ), 1 );
            }
        } );
        if( !pref || !_.isEqual( pref.values.values, values ) ) {
            body.preferenceInput.push( {
                preferenceName: name,
                values: values
            } );
        }
    } );

    if( body.preferenceInput.length === 0 ) {
        // using cached value for preferences
        // no server call required
        return AwPromiseService.instance.resolve( null );
    }

    return soaSvc.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'setPreferences2', body, {} ).then(
        function() {
            // Update the client side cache for the successfully set preference
            _.forEach( prefName2Values, function( values, name ) {
                var pref = _prefName2preference[ name ];
                if( pref ) {
                    pref.values.values = values;
                }
            } );
            // nothing to return
            return null;
        } );
}

/**
 * @param {String} name - preference name
 * @return {Promise.<String>} promise will resolve to the preference string value
 */
export let getStringValue = function( name ) {
    return getPrefs( [ name ] ).then( function( prefName2preference ) {
        var pref = prefName2preference[ name ];
        if( pref && pref.values && pref.values.values && pref.values.values.length > 0 ) {
            return pref.values.values[ 0 ];
        }
        return null;
    } );
};

/**
 * @param {String} name - preference name
 * @return {Promise.<StringArray>} promise will resolve to the preference string array value
 */
export let getStringValues = function( name ) {
    return getPrefs( [ name ] ).then( function( prefName2preference ) {
        var pref = prefName2preference[ name ];
        if( pref && pref.values && pref.values.values && pref.values.values.length > 0 ) {
            return pref.values.values;
        }
        return null;
    } );
};

/**
 * @param {String} names - array of preference names
 * @param {Boolean} bulkCache - bulk caching call?
 * @return {Promise.<Object>} promise will resolve to the preference string array value
 */
export let getMultiStringValues = function( names, bulkCache ) {
    return getPrefs( names, bulkCache ).then( function( prefName2preference ) {
        var response = {};
        _.forEach( names, function( name ) {
            var pref = prefName2preference[ name ];
            if( pref ) {
                response[ name ] = pref.values.values;
            }
        } );
        return response;
    } );
};

/**
 * @param {String} name - preference name
 * @return {Promise.<String>} promise will resolve to the preference logical value
 */
export let getLogicalValue = function( name ) {
    return getPrefs( [ name ] ).then( function( prefName2preference ) {
        var pref = prefName2preference[ name ];
        if( pref && pref.values && pref.values.values && pref.values.values.length > 0 ) {
            assert( pref.definition.type === 1, 'Querying logical value for a non-string preference' );
            assert( !pref.definition.isArray, 'Querying logical value for array preference' );
            return pref.values.values[ 0 ];
        }
        return null;
    } );
};

/**
 * @param {String} name - preference name
 * @return {Promise.<StringArray>} promise will resolve to the preference logical array value
 */
export let getLogicalValues = function( name ) {
    return getPrefs( [ name ] ).then( function( prefName2preference ) {
        var pref = prefName2preference[ name ];
        if( pref && pref.values && pref.values.values && pref.values.values.length > 0 ) {
            assert( pref.definition.type === 1, 'Querying logical values for a non-string preference' );
            assert( pref.definition.isArray, 'Querying logical values for a non-array preference' );
            return pref.values.values;
        }
        return null;
    } );
};

/**
 * @return {Promise.<StringArray>} promise will resolve to the preference string array value
 */
export let queryAll = function() {
    return getPrefs( [ '*' ] ).then( function( prefName2preference ) {
        return prefName2preference;
    } );
};

/**
 * This is the method which calls the server to get all preference values that can be modified by the current user
 *
 * @return {Promise.<StringArray>} promise will resolve to the preference string array value
 */
export let getExpandedPrefs = function() {
    return soaSvc.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'getPreferences', {
            preferenceNames: [ '*' ],
            includePreferenceDescriptions: true
        }, {} )
        .then(
            function( result ) {
                /**
                 * Checks to see if a preference has a user created version of it that should override it.
                 *
                 * @param {String} name - Name to check.
                 * @param {String} origin - Origin of the preference.
                 *
                 * @returns {Booolean} TRUE if a preference has a user created version of it that should override it.
                 */
                function uniqueUserPref( name, origin ) {
                    if( origin === 'User' ) {
                        return true;
                    }
                    for( var i in result.response ) {
                        if( result.response[ i ].definition.name === name &&
                            result.response[ i ].values.valueOrigination !== origin ) {
                            return false; // we want the user preference to override the other preference
                        }
                    }
                    return true;
                }

                for( var i = 0; i < result.response.length; i++ ) {
                    if( !uniqueUserPref( result.response[ i ].definition.name,
                            result.response[ i ].values.valueOrigination ) ) {
                        result.response.splice( i, 1 );
                        i--;
                    }
                }

                return result.response;
            } );
};

/**
 * @param {String} name - preference name
 * @param {StringArray} value - preference values
 * @return {Promise.<String>} promise will resolve to the preference string value
 */
export let setStringValue = function( name, value ) {
    var input = {};
    input[ name ] = value;
    return setPrefs( input );
};

/**
 * @param {StringArray} names - array of preference name
 * @param {StringArrayArray} values - array of preference values
 * @return {Promise.<StringArray>} promise will resolve to the preference string value
 */
export let setStringValues = function( names, values ) {
    var input = {};
    for( var ii = 0; ii < names.length; ii++ ) {
        input[ names[ ii ] ] = values[ ii ];
    }
    return setPrefs( input );
};

/**
 * @return {boolean} areBulkPreferencesLoaded
 */
export let areBulkPreferencesLoaded = function() {
    return _areBulkPreferencesLoaded;
};

/**
 * Get any preferences that are already loaded. Primarily used for when a sync check of a preference is necessary.
 *
 * @return {Object} The currently loaded preferences. Key is name, value is value list.
 */
export let getLoadedPrefs = function() {
    var loadedPrefs = {};
    for( var i in _prefName2preference ) {
        // TODO: Could use definition to format pref somehow
        // For now just make sure everything is an array
        loadedPrefs[ i ] = _prefName2preference[ i ].values.values ? _prefName2preference[ i ].values.values : [];
    }
    return loadedPrefs;
};

_onAppCtxUpdateListener = eventBus.subscribe( 'appCtx.update', onCtxPartialUpdateHandler );

exports = {
    getStringValue,
    getStringValues,
    getMultiStringValues,
    getLogicalValue,
    getLogicalValues,
    queryAll,
    getExpandedPrefs,
    setStringValue,
    setStringValues,
    areBulkPreferencesLoaded,
    getLoadedPrefs
};
export default exports;
/**
 * @memberof NgServices
 * @member soa_preferenceService
 */
app.factory( 'soa_preferenceService', () => exports );

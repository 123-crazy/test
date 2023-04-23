/* eslint-disable max-lines */
// @<COPYRIGHT>@
// ===========================================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ===========================================================================
// @<COPYRIGHT>@

/* global
 define
 Map
 */

/**
 * A service that manages the preferences and its category.<br>
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/adminPreferencesService
 */

import * as app from 'app';
import adminPreferenceUserUtil from 'js/adminPreferenceUserUtil';
import appCtxSvc from 'js/appCtxService';
import soaService from 'soa/kernel/soaService';
import AwPromiseService from 'js/awPromiseService';
import localeService from 'js/localeService';
import cdm from 'soa/kernel/clientDataModel';
import tcSessionData from 'js/TcSessionData';
import editHandlerService from 'js/editHandlerService';
import commandPanelService from 'js/commandPanel.service';
import messagingService from 'js/messagingService';
import _ from 'lodash';
import assert from 'assert';
import eventBus from 'js/eventBus';

var exports = {};

var _localTextBundle = localeService.getLoadedText( 'preferenceMessages' );

// Array of Preference Protection Scopes
var _protectionScopes = [ 'User', 'Role', 'Group', 'Site', 'System' ];

/**
 * Map of preference objects
 *
 * Structure: {
 *    key: filterName,
 *    value: Map
 *         key: preference name
 *         value: [PreferenceLocationInstance]
 * }
 */
var _preferenceFilters = null;

/**
 * Array of PreferenceLocationInstance
 */
var _preferenceInstances = [];

/**
 * Creates a preference location instance object with a definition and location info with its value
 * Structure: {
 *    definition: {
 *       category: STRING,
 *       description: STRING,
 *       isArray: BOOLEAN,
 *       isDisabled: BOOLEAN,
 *       isEnvEnabled: BOOLEAN,
 *       isOOTBPreference: BOOLEAN,
 *       name: STRING,
 *       protectionScope: STRING,
 *       type: INT
 *    },
 * locationInfo: {
 *      location: PreferenceLocation,
 *      values: STRING
 * }
 *
 * @param  {object} preferenceDefinition the definition for the preference instance
 * @param {object} preferenceValues the value info for the preference instance
 * @param {object} orgObjectMap - Map containing
 *                          Key - Org type name
 *                          Value - Org Model Object.
 *
 */
var PreferenceLocationInstance = function( preferenceDefinition, preferenceValues, orgObjectMap ) {
    this.definition = preferenceDefinition;
    convertType( this.definition );
    var values = preferenceValues.values;

    this.locationInfo = {
        location: new PreferenceLocation( preferenceValues.valueOrigination, orgObjectMap, values ),
        values: !_.isUndefined( values ) ? preferenceDefinition.isArray === true ? values : values[ 0 ] : []
    };
};

/**
 * Creates Location object from valueOrigination in json response.
 * This object is similar to enum which is being created in RAC code.
 * There are 7 type of locations
 * Location 0: User
 * Location 1: Role
 * Location 2: Group
 * Location 3: Overlay
 * Location 4: COTS
 * Location 5: Env
 *
 * @param  {string} valueOrigination the valueOrigination
 * @param {object} orgObjectMap - Map containing
 *                          Key - Org type name
 *                          Value - Org Model Object.
 * @param {object} values Preference values to figure out the None case.
 */
var PreferenceLocation = function( valueOrigination, orgObjectMap, values ) {
    switch ( valueOrigination ) {
        case 'User':
            this.prefLoc = 'User';
            this.strVal = 'User';
            this.index = 0;
            this.orgObject = orgObjectMap.get( this.strVal );
            break;
        case 'Role':
            this.prefLoc = 'Role';
            this.strVal = 'Role';
            this.index = 1;
            this.orgObject = orgObjectMap.get( this.strVal );
            break;
        case 'Group':
            this.prefLoc = 'Group';
            this.strVal = 'Group';
            this.index = 2;
            this.orgObject = orgObjectMap.get( this.strVal );
            break;
        case 'Site':
        case 'Overlay':
            this.prefLoc = 'Overlay';
            this.strVal = getSiteOrNoneBasedOnVal( values );
            this.index = 3;
            break;
        case 'COTS':
            this.prefLoc = 'COTS';
            this.strVal = getSiteOrNoneBasedOnVal( values );
            this.index = 4;
            break;
        case 'Env':
            this.prefLoc = 'Env';
            this.strVal = 'Env';
            this.index = 5;
            break;
        default:
    }
    if( !_.isUndefined( this.orgObject ) ) {
        this.uiVal = exports.generateLocationDisplayName( this.strVal, this.orgObject.orgDisplayName );
    } else {
        this.uiVal = _localTextBundle[ this.strVal ];
    }
};

/**
 * Return Site or None based on values.
 * @param {object} values Preference values to figure out the None case.
 *
 * @returns {string} return Site or None based on values.
 */
var getSiteOrNoneBasedOnVal = function( values ) {
    return _.isUndefined( values ) ? 'None' : 'Site';
};

/**
 * From the protection scope, returns the location where the value search would start.
 * @param  {String} protectionScope - protection scope of preference
 *
 * @returns {int} index for matching location
 */
export let findSearchStartLocation = function( protectionScope ) {
    switch ( protectionScope ) {
        case 'User':
            return 0;
        case 'Role':
            return 1;
        case 'Group':
            return 2;
        case 'Site':
            return 3;
        default:
            assert( false, 'The passed-in protection scope does not have any matching location.' );
    }
};

/**
 * Determines which preference value should be displayed to the user
 * @param  {PreferenceObj} preferenceInstance the PreferenceObj for which we are determining the value to show
 */
/* var computePreferenceFinalValue = function( preferenceInstance ) {
    var protectionScope = preferenceInstance.definition.protectionScope;
    var index = _protectionScopes.indexOf( protectionScope );
    for( var i = index; i < preferenceInstance.values.length; i++ ) {
        if( !_.isUndefined( preferenceInstance.values[ i ] ) ) {
            preferenceInstance.finalValue = preferenceInstance.values[ i ];
            break;
        }
    }
}; */

/**
 * Converts preference type from integer to string.
 * Preference types: 0 = String, 1 = Logical, 2 = Integer, 3 = Double, 4 = Date
 * @param  {Object} definition preference definition
 */
var convertType = function( definition ) {
    var type = definition.type;
    if( type === 0 ) {
        definition.type = 'String';
    } else if( type === 1 ) {
        definition.type = 'Logical';
    } else if( type === 2 ) {
        definition.type = 'Integer';
    } else if( type === 3 ) {
        definition.type = 'Double';
    } else if( type === 4 ) {
        definition.type = 'Date';
    }
};

/**
 * Converts preference type from string to integer.
 * @param  {Object} typeStr - preference type
 *
 * @returns {int} - int index for value type
 */
export let convertValueTypeToInt = function( typeStr ) {
    if( typeStr === 'String' ) {
        return 0;
    } else if( typeStr === 'Logical' ) {
        return 1;
    } else if( typeStr === 'Integer' ) {
        return 2;
    } else if( typeStr === 'Double' ) {
        return 3;
    } else if( typeStr === 'Date' ) {
        return 4;
    }
    assert( false, 'Invalid preference type encounter.' );
};

/**
 * Get the initial Location name and count object.
 *
 * @returns {object} - initial Location name and count object.
 */
var getLocationNameAndCount = function() {
    return [ { displayName: _localTextBundle.Site, count: 0 },
        { displayName: _localTextBundle.None, count: 0 },
        { displayName: _localTextBundle.Group, count: 0 },
        { displayName: _localTextBundle.Role, count: 0 },
        { displayName: _localTextBundle.User, count: 0 },
        { displayName: _localTextBundle.Env, count: 0 }
    ];
};

/**
 * Get the Location Filter object based on active locations and counts.
 * @param  {object} activeLocations an array of active location filters.
 * @param {number} locationNameAndCount Array which stores the location name and count information.
 * @param  {object} locationFilterObjs Array containing current list of Location Filter object based on active locations and counts.
 *
 * @returns {object} - Location Filter object based on active locations and counts.
 */
var getLocationFilterObject = function( activeLocations, locationNameAndCount, locationFilterObjs ) {
    var locations = getLocationNameAndCount();
    for( var i = 0; i < locations.length; i++ ) {
        if( locationNameAndCount[ i ].count > 0 ) {
            var locationFilter = {
                searchFilterType: 'StringFilter',
                stringDisplayValue: locations[ i ].displayName,
                stringValue: locations[ i ].displayName,
                count: locationNameAndCount[ i ].count
            };
            if( activeLocations !== null ) {
                for( var j = 0; j < activeLocations.length; j++ ) {
                    if( activeLocations[ j ].stringValue === locations[ i ].displayName ) {
                        locationFilter.selected = true;
                        break;
                    }
                }
            }
            locationFilterObjs.push( locationFilter );
        }
    }
    return locationFilterObjs;
};

/**
 * Update the count for each location filter.
 * @param  {object} preferenceLocInstances an array of preferences to get the individual location count.
 * @param {number} locationNameAndCount Array which stores the count information.
 */
var updateLocationCount = function( preferenceLocInstances, locationNameAndCount ) {
    for( var i = 0; i < preferenceLocInstances.length; i++ ) {
        var displayLocation = preferenceLocInstances[ i ].locationInfo.location.uiVal;

        switch ( displayLocation ) {
            case locationNameAndCount[ 0 ].displayName:
                locationNameAndCount[ 0 ].count++;
                break;
            case locationNameAndCount[ 1 ].displayName:
                locationNameAndCount[ 1 ].count++;
                break;
            case locationNameAndCount[ 5 ].displayName:
                locationNameAndCount[ 5 ].count++;
                break;
            default:
                var location = preferenceLocInstances[ i ].locationInfo.location.prefLoc;
                switch ( location ) {
                    case 'Group':
                        locationNameAndCount[ 2 ].count++;
                        break;
                    case 'Role':
                        locationNameAndCount[ 3 ].count++;
                        break;
                    case 'User':
                        locationNameAndCount[ 4 ].count++;
                        break;
                    default:
                }
        }
    }
};

/**
 * Get a page of row data for the table.
 * @param {Object} searchCriteria the search string and newPref stored in the ctx
 * @param {Object} tableSortCriteria the sort criteria for the table
 * @param {Object} defaultSortCriteria default sort criteria for table
 * @param {int} startIndex start index for pagination
 * @param {int} pageSize page size.
 *
 * @return {Promise} response returned to the viewModel, response contains the array of preference instances
 */
export let loadTableData = function( searchCriteria, tableSortCriteria, defaultSortCriteria, startIndex, pageSize ) {
    appCtxSvc.updatePartialCtx( 'search.tableLoaded', false );
    var prefEditHandler = editHandlerService.getEditHandler( 'PREF_EDIT_CONTEXT' );
    if( prefEditHandler !== null ) {
        editHandlerService.cancelEdits();
    }

    if( _preferenceInstances.length === 0 || _preferenceFilters === null ) {
        var prm;
        var isInitialized = adminPreferenceUserUtil.isInitialized();
        if( !isInitialized ) {
            exports.setSupportedTCVersionForDeleteProductAreaContext();
            appCtxSvc.updatePartialCtx( 'tcadmconsole.preferences.useDefaultSort', true );
            prm = soaService
                .postUnchecked( 'Administration-2011-05-PreferenceManagement', 'refreshPreferences' );
        } else {
            var deferred1 = AwPromiseService.instance.defer();
            deferred1.resolve();
            prm = deferred1.promise;
        }
        return prm.then( function() {
            // Setting user privileges on reveal of the table was causing issues because generateGetPreferenceAtLocationIn() requires
            // knowing whether the user is a system or group admin. Because setUserPrivilege() is async, it was setting
            // privileges after we get the initial input for the getPreferencesAtLocations. If we move it here, we still only set the privileges once,
            // but we ensure that it finishes executing before initially loading the preferences in the table.
            var prm2;
            if( !isInitialized ) {
                var deferredInput = AwPromiseService.instance.defer();
                deferredInput.resolve( adminPreferenceUserUtil.setUserPrivilege() );
                prm2 = deferredInput.promise;
            } else {
                var deferredInput2 = AwPromiseService.instance.defer();
                deferredInput2.resolve();
                prm2 = deferredInput2.promise;
            }
            return prm2.then( function() {
                var prefLocOrgArray = generatePrefLocOrgArray();
                var preFilterMap = new Map();
                return exports.loadTableDataFromServer( prefLocOrgArray, preFilterMap, 0 ).then( function() {
                    return postProcessTableLoadData( searchCriteria, tableSortCriteria, defaultSortCriteria, startIndex, pageSize );
                } );
            } );
        } );
    }
    var deferred2 = AwPromiseService.instance.defer();
    deferred2.resolve( postProcessTableLoadData( searchCriteria, tableSortCriteria, defaultSortCriteria, startIndex, pageSize ) );
    return deferred2.promise;
};

/**
 * This method recursively calls SOA to get preferences and groups preferences by category. Recursive call is
 * only in the case of sub groups. The SOA API response does not provide preferences per location. To provide
 * preferences per location in case of subgroups, the API will be called recursively.
 * @param {Array} prefLocOrgArray - array of preference location inputs and organization map.
 *                prefLocOrgArray is an array of
 *                      inputData - Location Input to get preferencesByLocation.
 *                      orgObjectMap - Map containing
 *                          Key - Org type name
 *                          Value - Org Model Object.
 * @param {object} preFilterMap with Filter map from previous calls.
 * @param {int} index - index for recursive calls.
 *
 * @return {Promise} Return of promise to control the recursive SOA calls.
 */
export let loadTableDataFromServer = function( prefLocOrgArray, preFilterMap, index ) {
    if( index < prefLocOrgArray.length ) {
        return soaService.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'getPreferencesAtLocations', prefLocOrgArray[ index ].inputData ).then( function( response ) {
            if( index === 0 ) {
                exports.resetService();
            }
            exports.groupPreferencesByFilters( response, prefLocOrgArray[ index ].orgObjectMap, preFilterMap );
            return exports.loadTableDataFromServer( prefLocOrgArray, preFilterMap, ++index );
        } );
    }
    var deferred = AwPromiseService.instance.defer();
    deferred.resolve();
    return deferred.promise;
};

/**
 * Post process after preference data to load is available.
 * @param {Object} searchCriteria the search string and newPref stored in the ctx
 * @param {Object} tableSortCriteria the sort criteria for the table
 * @param {Object} defaultSortCriteria default sort criteria for table
 * @param {int} startIndex start index for pagination
 * @param {int} pageSize page size.
 *
 * @return {Promise} response returned to the viewModel, response contains the array of preference instances
 */
var postProcessTableLoadData = function( searchCriteria, tableSortCriteria, defaultSortCriteria, startIndex, pageSize ) {
    var filteredPreferenceInstances;
    var filteredPreferenceFilters = _preferenceFilters;

    var filteredPreferenceInstancesObj = filterBasedOnActiveFilters();

    filteredPreferenceInstances = filteredPreferenceInstancesObj.filteredPreferenceInstances;
    var hasFilterUpdate = filteredPreferenceInstancesObj.hasFilterUpdate;

    var searchedPreferenceInstances = simpleSearch( searchCriteria, filteredPreferenceInstances );

    var hasSearchUpdate = searchedPreferenceInstances.hasSearchUpdate;
    filteredPreferenceInstances = hasSearchUpdate ? searchedPreferenceInstances.filteredPreferenceInstances : filteredPreferenceInstances;

    if( hasSearchUpdate || hasFilterUpdate ) {
        filteredPreferenceFilters = updateFiltersInFilterMap( filteredPreferenceInstances );
    }

    if( appCtxSvc.getCtx( 'tcadmconsole.preferences.useDefaultSort' ) === true && !_.isUndefined( defaultSortCriteria ) && defaultSortCriteria.length > 0 ) {
        filteredPreferenceInstances = sortPreferenceInstances( filteredPreferenceInstances, defaultSortCriteria );
        appCtxSvc.updatePartialCtx( 'sublocation.sortCriteria', defaultSortCriteria );
    }
    if( !_.isUndefined( tableSortCriteria ) && tableSortCriteria.length > 0 ) {
        filteredPreferenceInstances = sortPreferenceInstances( filteredPreferenceInstances, tableSortCriteria );
        appCtxSvc.updatePartialCtx( 'tcadmconsole.preferences.useDefaultSort', false );
    }
    movePreferenceToTop( filteredPreferenceInstances, searchCriteria );
    loadFilterMapData( filteredPreferenceInstances, filteredPreferenceFilters );

    return {
        matchedPreferences: filteredPreferenceInstances.slice( startIndex, startIndex + pageSize ),
        totalFound: filteredPreferenceInstances.length,
        filteredPreferenceInstances: filteredPreferenceInstances,
        filteredPreferenceFilters: filteredPreferenceFilters
    };
};

/**
 * Filter preferences based on active Filters and return filtered preferences.
 *
 * @returns {Object} - This object will have filtered preferences based on active filter.
 *
 */
var filterBasedOnActiveFilters = function() {
    var hasFilterUpdate = false;
    var filteredPreferenceInstances;
    var afMap = appCtxSvc.getCtx( 'search.activeFilterMap' );
    if( !_.isUndefined( afMap ) ) {
        var activeLocations = [];
        if( afMap.hasOwnProperty( 'Preferences.fnd0Location' ) ) {
            var activeLocationFilters = afMap[ 'Preferences.fnd0Location' ];
            for( var j = 0; j < activeLocationFilters.length; j++ ) {
                activeLocations.push( activeLocationFilters[ j ].stringValue );
            }
        }
        var preferencesToReturn = [];
        if( afMap.hasOwnProperty( 'Preferences.fnd0ProductArea' ) ) {
            var activeProductAreaFilters = afMap[ 'Preferences.fnd0ProductArea' ];
            for( var i = 0; i < activeProductAreaFilters.length; i++ ) {
                var preferencesForProdArea = _preferenceFilters.get( activeProductAreaFilters[ i ].stringValue );
                var instancesForProductArea = [];
                if( !_.isUndefined( preferencesForProdArea ) ) {
                    preferencesForProdArea.forEach( function( prefInstances ) {
                        instancesForProductArea = instancesForProductArea.concat( prefInstances );
                    } );
                }
                preferencesToReturn = getFilteredLocationInstances( instancesForProductArea, activeLocations, preferencesToReturn );
            }
        } else {
            preferencesToReturn = getFilteredLocationInstances( _preferenceInstances, activeLocations, preferencesToReturn );
        }
        filteredPreferenceInstances = preferencesToReturn;
        hasFilterUpdate = true;
    } else {
        filteredPreferenceInstances = _preferenceInstances;
        hasFilterUpdate = false;
    }
    return {
        filteredPreferenceInstances: filteredPreferenceInstances,
        hasFilterUpdate: hasFilterUpdate
    };
};

/**
 * Show usage message.
 */
var _showUsageMessage = function( searchString ) {
    var localTextBundle = localeService.getLoadedText( 'preferenceMessages' );
    var prefMsg = localTextBundle.prefFilterUsage;
    prefMsg = prefMsg.replace( '{0}', 'name' );
    prefMsg = prefMsg.replace( '{1}', 'name, values' );
    prefMsg = prefMsg.replace( '{2}', 'description' );

    var advancedSearchMsg = localTextBundle.advancedSearchMessage;
    advancedSearchMsg = advancedSearchMsg.replace( '{0}', prefMsg );

    var escapeCharsMsg = localTextBundle.prefEscapeChars;
    escapeCharsMsg = escapeCharsMsg.replace( '{0}', advancedSearchMsg );

    var msg = localTextBundle.usageMessage;
    msg = msg.replace( '{0}', searchString );
    msg = msg.replace( '{1}', escapeCharsMsg );

    messagingService.showInfo( msg );
};

var _replaceRegExpChars = function( string, char ) {
    var charExp = new RegExp( char, 'g' );
    return string.replace( charExp, char );
};

var _removeQuotesAddWildcards = function( string ) {
    if( _.isUndefined( string ) ) {
        return {
            string: '*',
            removeTrailingWildcard: false
        };
    }

    var removeTrailingWildcard = false;
    // if there are " " surrounding the string, remove " " and indicate if we should remove the ending *
    if( string.charAt( 0 ) === '"' && string.charAt( string.length - 1 ) === '"' ) {
        string = removeStartEndChar( string, [ '\"' ] );

        if( string.charAt( string.length - 1 ) !== '*' ) {
            string = string.concat( '*' );
            removeTrailingWildcard = true;
        }
    } else {
        if( string.charAt( string.length - 1 ) !== '*' ) {
            string = string.concat( '*' );
        }
    }
    return {
        string: string,
        removeTrailingWildcard: removeTrailingWildcard
    };
};

/**
 * This generates a regular expression that can be used for
 * @param {String} string string that we will be generating the regex for
 * @returns {RegExp} the formatted regular expression
 */
export let generateRegex = function( string ) {
    var parsedData = _removeQuotesAddWildcards( string );
    string = parsedData.string;

    // remove trailing wildcard if the user did not add it themselves (i.e. it was implicitly added)
    if( parsedData.removeTrailingWildcard ) {
        string = string.substring( 0, string.length - 1 );
    }

    // add '\' before any characters special to reg expressions
    var chars = [ '\\\\', '\\(', '\\)', '\\+', '\\[', '\\]', '\\$', '\\^', '\\|', '\\?', '\\.', '\\{', '\\}', '\\!', '\\=', '\\<' ];
    for( var n = 0; n < chars.length; n++ ) {
        string = _replaceRegExpChars( string, chars[ n ] );
    }

    var regExpString = '^(';
    var splitString = string.replace( /^\*|([^\\])\*/g, '$1\u000B' ).split( '\u000B' );
    if( splitString.length > 1 ) {
        for( var i = 0; i < splitString.length; i++ ) {
            regExpString += splitString[ i ].replace( /\\\*/g, '*' ) + '[\\s\\S]*';
        }
        // remove extra .* from end
        regExpString = regExpString.substring( 0, regExpString.lastIndexOf( '[\\s\\S]*' ) );
    } else {
        regExpString += splitString[ 0 ].replace( /\\\*/g, '*' );
    }
    regExpString += ')$';
    var regExp = new RegExp( regExpString, 'i' );
    return regExp;
};

var _getInputFromSearchString = function( searchString, escapeCharacter, unescapedCharacters ) {
    var inputFromSearchString = {};
    var isValidInput = true;
    while( searchString.length > 0 && isValidInput === true ) {
        // MUST start with group:/role:/username:/userid:
        var beginningOfString = /^\s*(name:|values:|description:)/i;
        var validBeginning = beginningOfString.test( searchString );
        if( validBeginning === false ) {
            // invalid input, either name:/value:/description: must be present
            // takes care of case like name: test test value:testing, where quotes are not around
            // string with a space in it
            isValidInput = false;
        }

        // if name:/value:/description: is followed by ", then get anything inside " "
        // else, get everything up until the next space
        var field = searchString.substring( 0, searchString.indexOf( ':' ) ).trim().toLowerCase();
        searchString = searchString.substring( searchString.indexOf( ':' ) + 1 ).trim();
        var value;
        if( searchString.charAt( 0 ) === '"' ) {
            // advanced case with " " case
            value = searchString.match( /\"(.*?)[^\\]\"/ );
            value = !_.isNull( value ) ? value[ 0 ] : '';
            searchString = searchString.substring( value.length + 1 ).trim();
            value = value.replace( escapeCharacter, '"' );
        } else {
            value = searchString.match( /\s*(.*?\s|.*)/ )[ 1 ].trim();

            if( _.includes( value, ':' ) || unescapedCharacters.test( value ) ) {
                // invalid input, string with : must be surrounded by " " and " must be escaped
                isValidInput = false;
            }

            value = value.replace( escapeCharacter, '"' );
            searchString = searchString.substring( searchString.indexOf( ' ' ) !== -1 ? //
                searchString.indexOf( ' ' ) + 1 : searchString.length + 1 ).trim();
        }

        if( value.length === 0 ) {
            // invalid input, can't have an empty value
            isValidInput = false;
        }

        inputFromSearchString[ field ] = value;
    }

    return {
        input: inputFromSearchString,
        isValidInput: isValidInput
    };
};

/**
 * Show message that there are no results found.
 * @param {Object} searchString the search string for the org tree.
 *
 * @return {String} Object containing the parsed input and advanced search flag.
 */
export let parseSearchInput = function( searchString ) {
    searchString = searchString.trim();
    var advancedSearch = false;
    if( _.includes( searchString, ':' ) && !( searchString.charAt( 0 ) === '"' && searchString.charAt( searchString.length - 1 ) === '"' ) ) {
        advancedSearch = true;
    }

    var searchData = {};
    // Dictates the character(s) used to escape " in the middle of filter string
    var escapeCharacter = /\\"/g;

    // RegEx for an unescaped double quote
    var unescapedCharacters = /^\"|.*[^\\]"/;

    // If we are doing an advanced filtering, parse the input using a regex
    if( advancedSearch ) {
        var returnedInput = _getInputFromSearchString( searchString, escapeCharacter, unescapedCharacters );
        var parsedInput = returnedInput.input;
        var isValidInput = returnedInput.isValidInput;
        if( isValidInput === false ) {
            _showUsageMessage( searchString );
            return;
        }

        var keys = Object.keys( parsedInput );
        for( var i = 0; i < keys.length; i++ ) {
            searchData[ keys[ i ] ] = exports.generateRegex( parsedInput[ keys[ i ] ] );
        }
    } else {
        if( unescapedCharacters.test( searchString.charAt( 0 ) === '"' && searchString.charAt( searchString.length - 1 ) === '"' ? searchString.substring( 1, searchString.length - 1 ) : searchString ) ) {
            _showUsageMessage( searchString );
            return;
        }

        searchString = searchString.replace( escapeCharacter, '"' );
        // remove the quotes if they exist, add implicit wildcards to beginning and end
        var regex = exports.generateRegex( searchString );
        searchData = {
            name: regex,
            values: regex,
            description: regex
        };
    }

    return {
        searchData: searchData,
        advancedSearch: advancedSearch
    };
};

export let meetsSearchCriteria = function( name, description, prefValueContainsSearchCriteria, searchData, advancedSearch ) {
    return advancedSearch &&
        ( ( _.isUndefined( searchData.name ) || searchData.name.test( name ) ) &&
            ( _.isUndefined( searchData.description ) || searchData.description.test( description ) ) &&
            prefValueContainsSearchCriteria ) ||
        !advancedSearch &&
        ( _.isUndefined( searchData.name ) || searchData.name.test( name ) ||
            ( _.isUndefined( searchData.description ) || searchData.description.test( description ) ) ||
            prefValueContainsSearchCriteria );
};

/**
 * Return the preferences that fit the search criteria and display them in the table
 * @param  {Object} searchCriteria the criteria object from Input of loadTableData
 * @param {Array} filteredPreferenceInstances filtered array of preferences
 *
 * @return {Promise} a Promise containing the total number of results from the search
 */
var simpleSearch = function( searchCriteria, filteredPreferenceInstances ) {
    if( !_.isUndefined( searchCriteria ) && searchCriteria.searchString !== '' && !_.isUndefined( searchCriteria.searchString ) ) {
        var parsedInput = exports.parseSearchInput( searchCriteria.searchString );
        if( _.isUndefined( parsedInput ) ) {
            var lastSearchString = !_.isUndefined( appCtxSvc.getCtx( 'tcadmconsole.preferences.lastSearchString' ) ) ? appCtxSvc.getCtx( 'tcadmconsole.preferences.lastSearchString' ) : '';
            parsedInput = exports.parseSearchInput( lastSearchString );
        } else {
            appCtxSvc.updatePartialCtx( 'tcadmconsole.preferences.lastSearchString', searchCriteria.searchString );
        }

        var searchData = parsedInput.searchData;

        // get the list of preference objects that we want to sift through

        var foundPreferenceInstances = [];
        for( var i = 0; i < filteredPreferenceInstances.length; i++ ) {
            var preferenceInstance = filteredPreferenceInstances[ i ];
            var prefValueContainsSearchCriteria = exports.hasPreferenceValueSearchCriteria( searchData.values, preferenceInstance.locationInfo.values );

            // if the name, description, or values contains the search string, add the
            // preference to the list of preferences to return
            if( exports.meetsSearchCriteria( preferenceInstance.definition.name, preferenceInstance.definition.description, //
                    prefValueContainsSearchCriteria, searchData, parsedInput.advancedSearch ) ) {
                foundPreferenceInstances.push( preferenceInstance );
            }
        }
        return { filteredPreferenceInstances: foundPreferenceInstances, hasSearchUpdate: true };
    }
    return { hasSearchUpdate: false };
};

/**
 * Returns the map of filters having filtered preferences.
 * @param {Array} filteredPreferenceInstances filtered array of preferences
 *
 * @return {Map} - map of filters having filtered preferences.
 */
var updateFiltersInFilterMap = function( filteredPreferenceInstances ) {
    var filteredFilters = new Map();
    for( var i = 0; i < filteredPreferenceInstances.length; i++ ) {
        var prefInstance = filteredPreferenceInstances[ i ];
        var filterName = prefInstance.definition.category;
        // create a new preference map for the filter if the filter
        // isn't already in the map
        if( !filteredFilters.has( filterName ) ) {
            var new_prefMap = new Map();
            filteredFilters.set( filterName, new_prefMap );
        }
        var prefMap = filteredFilters.get( filterName );
        if( prefMap.has( prefInstance.definition.name ) ) {
            var prefLocs = prefMap.get( prefInstance.definition.name );
            prefLocs = prefLocs.push( prefInstance );
        } else {
            prefMap.set( prefInstance.definition.name, [ prefInstance ] );
        }
        // add the preference object to the filter map
        filteredFilters.set( filterName, prefMap );
    }
    return filteredFilters;
};

/**
 * Sorts the preference instances according to the sort criteria
 * @param {Array} preferenceInstances array of preference instances to sort
 * @param {Array} sortCriteria array of sort criteria for the table
 *
 * @returns {Array} sorted array of preference instances
 */
var sortPreferenceInstances = function( preferenceInstances, sortCriteria ) {
    var primarySortCriteria = getPrefInstPropFromSortCriteria( sortCriteria[ 0 ].fieldName );
    if( sortCriteria[ 0 ].sortDirection === 'ASC' ) {
        preferenceInstances = sortPreferencesOnProperty( primarySortCriteria, preferenceInstances, 'definition.name', [ 'asc', 'asc' ] );
    } else if( sortCriteria[ 0 ].sortDirection === 'DESC' ) {
        preferenceInstances = sortPreferencesOnProperty( primarySortCriteria, preferenceInstances, 'definition.name', [ 'desc', 'asc' ] );
    }
    return preferenceInstances;
};

/**
 * Sorts the preferences instances based on the primary and secondary sort criteria
 * @param {String} primarySortCriteria the first criteria to be sorted on
 * @param {Object} preferenceInstances array of preference instances to sort
 * @param {String} secondarySortCriteria the secondary criteria to be sorted on
 * @param {Array} sortDirections the directions indicated for the two sort criteria
 *
 * @returns {Array} sorted array of preference instances
 */
var sortPreferencesOnProperty = function( primarySortCriteria, preferenceInstances, secondarySortCriteria, sortDirections ) {
    if( primarySortCriteria !== 'locationInfo.values' ) {
        preferenceInstances = _.orderBy( preferenceInstances, [ primarySortCriteria, secondarySortCriteria ], sortDirections );
    } else {
        preferenceInstances = _.orderBy( preferenceInstances, [ function( prefInstance ) {
            return exports.getDisplayValues( prefInstance.locationInfo.values, prefInstance.definition.isArray );
        }, secondarySortCriteria ], sortDirections );
    }
    return preferenceInstances;
};

/**
 * Find the new preference from list of preferences; _preferenceInstances and then
 * Slice the new preference from prefInstancesToShow array and push at the top.
 * @param {Array} prefInstancesToShow the preferences that will be shown in the table
 * @param {Object} searchCriteria contains the new preference information to move it to the top of the list.
 */
var movePreferenceToTop = function( prefInstancesToShow, searchCriteria ) {
    if( !_.isUndefined( searchCriteria ) ) {
        var newPref = searchCriteria.newPref;
        if( !_.isUndefined( newPref ) ) {
            var pref;
            for( var idx = 0; idx < prefInstancesToShow.length; idx++ ) {
                pref = prefInstancesToShow[ idx ];
                if( pref.definition.name === newPref.name && //
                    ( areSiteNonePrefSame( pref.locationInfo.location.uiVal, newPref.location ) || pref.locationInfo.location.uiVal === newPref.location ) ) {
                    prefInstancesToShow.splice( idx, 1 );
                    prefInstancesToShow.unshift( pref );
                    return;
                }
            }
        }
    }
};

/**
 * Loads filter panel data.
 *
 * @param {Array} filteredPreferenceInstances filtered array of preferences
 * @param {Map} filteredPreferenceFilters - Map of filtered preference objects.
 *
 */
export let loadFilterPanelData = function( filteredPreferenceInstances, filteredPreferenceFilters ) {
    var filterCategories = loadFilterMapData( filteredPreferenceInstances, filteredPreferenceFilters );
    appCtxSvc.updatePartialCtx( 'searchResponseInfo.searchFilterCategories', filterCategories );
    appCtxSvc.updatePartialCtx( 'searchResponseInfo.searchCurrentFilterCategories', filterCategories );
    appCtxSvc.updatePartialCtx( 'search.objectsGroupedByProperty', { internalPropertyName: '' } );
    appCtxSvc.updatePartialCtx( 'searchResponseInfo.objectsGroupedByProperty', { internalPropertyName: '' } );
};

/**
 * Load filterMap data.
 *
 * @param {Array} filteredPreferenceInstances filtered array of preferences
 * @param {Map} filteredPreferenceFilters - Map of filtered preference objects. These are the preference objects
 *                                          that have been filtered from performing a search.
 *
 * @return {Object} Returns the filterCategories.
 */
var loadFilterMapData = function( filteredPreferenceInstances, filteredPreferenceFilters ) {
    var filterCategories = [ {
        displayName: _localTextBundle.location,
        internalName: 'Preferences.fnd0Location',
        defaultFilterValueDisplayCount: 6,
        isServerSearch: false
    }, {
        displayName: _localTextBundle.ProductArea,
        internalName: 'Preferences.fnd0ProductArea',
        defaultFilterValueDisplayCount: 5,
        isServerSearch: false
    } ];
    appCtxSvc.updatePartialCtx( 'search.filterCategories', filterCategories );
    var activeProductAreas = null;
    var activeLocations = null;
    var afMap = appCtxSvc.getCtx( 'search.activeFilterMap' );
    if( afMap ) {
        if( afMap.hasOwnProperty( 'Preferences.fnd0ProductArea' ) ) {
            activeProductAreas = afMap[ 'Preferences.fnd0ProductArea' ];
        }
        if( afMap.hasOwnProperty( 'Preferences.fnd0Location' ) ) {
            activeLocations = afMap[ 'Preferences.fnd0Location' ];
        }
    }
    var filterObjects = getInitialFilterObjects( filteredPreferenceInstances );
    var locationNameAndCount = getLocationNameAndCount();
    filteredPreferenceFilters.forEach( function( prefMap, key ) {
        // Calculate preference count for each filter( product area )
        var totalFound = 0;
        prefMap.forEach( function( preferenceLocInstances ) {
            totalFound += preferenceLocInstances.length;
            updateLocationCount( preferenceLocInstances, locationNameAndCount );
        } );

        if( totalFound !== 0 ) {
            var filterDetail = {
                searchFilterType: 'StringFilter',
                stringDisplayValue: key,
                stringValue: key,
                count: totalFound
            };
            if( activeProductAreas !== null && isFilterInActiveFilters( filterDetail, activeProductAreas ) ) {
                filterDetail.selected = true;
            }
            filterObjects.productAreaFilterObjects.push( filterDetail );
        }
    } );
    var formattedSearchFilterMap = {};
    // maps the filter category name to the formatted content for that filter category
    formattedSearchFilterMap[ 'Preferences.fnd0ProductArea' ] = _.sortBy( filterObjects.productAreaFilterObjects, 'stringDisplayValue' );
    formattedSearchFilterMap[ 'Preferences.fnd0Location' ] = getLocationFilterObject( activeLocations, locationNameAndCount, filterObjects.locationFilterObjects );

    appCtxSvc.updatePartialCtx( 'search.filterMap', formattedSearchFilterMap );
    appCtxSvc.updatePartialCtx( 'searchResponseInfo.searchFilterMap', formattedSearchFilterMap );

    appCtxSvc.updatePartialCtx( 'search.totalFound', filteredPreferenceInstances.length );
    appCtxSvc.updatePartialCtx( 'search.tableLoaded', true );
    return filterCategories;
};

/**
 * Returns the old filetrMap data. This is required for the following behavior.
 * When you pick a Filter in a category, it is considered the active category.
 * In Active category the selected filter count is updated and also the rest remain with old filter count.
 * We will update the count and only show the relevant count for other category. This is similar to search. But the similarities end here.
 * The rest remaining with old filter count is not possible for below cases  (Essentially you will lose these unselected filters).
 *      Refresh of the page (We lose the history during reload)
 *      When you do a search (Search might invalidate some of the filters and picking such filters will make them disappear).
 *      Unselecting filter means the previous selection has less data than after selection so it will ignore the previous data.
 * @param {Array} filteredPreferenceInstances filtered array of preferences
 *
 * @return {Object} Returns the old filterMap data.
 */
var getInitialFilterObjects = function( filteredPreferenceInstances ) {
    var productAreaFilterObjs = [];
    var locationFilterObjs = [];
    var afArray = appCtxSvc.getCtx( 'search.activeFilters' );
    if( afArray && afArray.length > 0 ) {
        var fMap = appCtxSvc.getCtx( 'search.filterMap' );
        if( !_.isUndefined( fMap ) ) {
            if( filteredPreferenceInstances.length === 0 ) {
                productAreaFilterObjs = fMap[ 'Preferences.fnd0ProductArea' ];
                locationFilterObjs = fMap[ 'Preferences.fnd0Location' ];
            } else {
                var filterDataWithoutSelected = [];
                var lastPickedFilterType = afArray[ afArray.length - 1 ];
                var selectedFilterData = fMap[ lastPickedFilterType.name ];
                if( !_.isUndefined( selectedFilterData ) ) {
                    for( var i = 0; i < selectedFilterData.length; i++ ) {
                        var found = false;
                        for( var j = 0; j < lastPickedFilterType.values.length; j++ ) {
                            if( selectedFilterData[ i ].stringValue === lastPickedFilterType.values[ j ] ) {
                                found = true;
                                break;
                            }
                        }
                        if( !found ) {
                            selectedFilterData[ i ].selected = false;
                            filterDataWithoutSelected.push( selectedFilterData[ i ] );
                        }
                    }
                }
                if( lastPickedFilterType.name === 'Preferences.fnd0ProductArea' ) {
                    productAreaFilterObjs = filterDataWithoutSelected;
                } else {
                    locationFilterObjs = filterDataWithoutSelected;
                }
            }
        }
    }
    return {
        locationFilterObjects: locationFilterObjs,
        productAreaFilterObjects: productAreaFilterObjs
    };
};

/**
 * Determines if a filter is in the list of active filters
 * @param  {object} filter the filter that we want to know if it's in the active filters or not
 * @param {Array} activeFilters the list of active filter objects
 *
 * @returns {boolean} determines if the filter is in the list of active filters
 */
var isFilterInActiveFilters = function( filter, activeFilters ) {
    var filterInActiveFilters = false;
    var k = 0;
    while( k < activeFilters.length && !filterInActiveFilters ) {
        var compareFilter = activeFilters[ k ];
        if( filter.stringValue === compareFilter.stringValue ) {
            filterInActiveFilters = true;
        } else {
            k++;
        }
    }
    return filterInActiveFilters;
};

/**
 * Filter preferences based on location active Filters.
 * @param {Array} prefInstances Array of preferences to filter.
 * @param {Array} locationNames Array of active locations to filter on.
 * @param {Array} preferencesToReturn Array to store filtered preferences.
 *
 * @return {Array} returns Array of filtered preferences.
 */
var getFilteredLocationInstances = function( prefInstances, locationNames, preferencesToReturn ) {
    if( locationNames.length > 0 ) {
        for( var k = 0; k < prefInstances.length; k++ ) {
            for( var i = 0; i < locationNames.length; i++ ) {
                if( prefInstances[ k ].locationInfo.location.uiVal.startsWith( locationNames[ i ] ) ) {
                    preferencesToReturn.push( prefInstances[ k ] );
                }
            }
        }
    } else {
        preferencesToReturn = preferencesToReturn.concat( prefInstances );
    }
    return preferencesToReturn;
};

/**
 * Determines whether or not the preference value contains the search criteria
 * @param  {String} valueSearchCriteria the string that the user has searched for
 * @param {Object} preferenceValue the final value for the preference
 *
 * @return {Boolean} returns true if the final value contains the search criteria, false otherwise
 */
export let hasPreferenceValueSearchCriteria = function( valueSearchCriteria, preferenceValue ) {
    var prefValueContainsSearchCriteria = false;
    if( _.isUndefined( valueSearchCriteria ) ) {
        prefValueContainsSearchCriteria = true;
    } else if( !_.isUndefined( preferenceValue ) && typeof preferenceValue === 'object' ) {
        preferenceValue = preferenceValue.length > 0 ? preferenceValue : [ '' ];
        for( var j = 0; j < preferenceValue.length; j++ ) {
            if( valueSearchCriteria.test( preferenceValue[ j ] ) ) {
                prefValueContainsSearchCriteria = true;
            }
        }
    } else if( !_.isUndefined( preferenceValue ) ) {
        if( valueSearchCriteria.test( preferenceValue ) ) {
            prefValueContainsSearchCriteria = true;
        }
    }
    return prefValueContainsSearchCriteria;
};

/**
 * In create and edit case, the location of an instance changes between Site or None based on values of preference. This method figures
 * out if these preference instances are the same if they are in Site or None location. The assumption is the preference is same
 * if it is in None or Site.
 * @param {Array} uiLoc1 First location ui value.
 * @param {Object} uiLoc2 Second location ui value.
 *
 * @returns {Boolean} true if the passed in locations are either Site or None and the same. False otherwise.
 */
var areSiteNonePrefSame = function( uiLoc1, uiLoc2 ) {
    if( ( uiLoc1 === _localTextBundle.Site || uiLoc1 === _localTextBundle.None ) && //
        ( uiLoc2 === _localTextBundle.Site || uiLoc2 === _localTextBundle.None ) ) {
        return true;
    }
    return false;
};

/**
 * Returns the index for the selected preference in the table
 * NOTE: We may not need to do this after the selection issue is fixed, we could potentially use updateSelection from selectionService
 * @param {Object} selectedPreference - selected preference
 * @param {Object} matchedPreferences - array of matched preferences
 *
 * @returns {Number} the index of the selected preference in the array (the correct row in the table)
 */
var getIndexOfSelectedPref = function( selectedPreference, matchedPreferences ) {
    for( var i = 0; i < matchedPreferences.length; i++ ) {
        if( selectedPreference.props.fnd0PreferenceName.dbValue === matchedPreferences[ i ].props.fnd0PreferenceName.dbValue //
            &&
            selectedPreference.props.fnd0Location.dbValue === matchedPreferences[ i ].props.fnd0Location.dbValue ) {
            return i;
        }
    }
    return -1;
};

/**
 * Highlights the first row in the table, which corresponds to the newly created preference
 * @param {Object} newPref the information stored at ctx.tcadmconsole.searchCriteria.newPref, which
 *                         indicates that we should highlight the new pref in the table
 * @param {Object} vmData viewModel data
 * @param {Object} selectedPreference the currently selected preference
 *
 */
export let selectNewPrefRow = function( newPref, vmData, selectedPreference ) {
    var selectionModel = vmData.dataProviders.prefTableDataProvider.selectionModel;
    if( !_.isUndefined( newPref ) && vmData.matchedPreferences.length > 0 ) {
        selectionModel.setSelection( vmData.matchedPreferences[ 0 ] );
        appCtxSvc.updatePartialCtx( 'tcadmconsole.searchCriteria.newPref', undefined );
    } else if( !_.isNull( selectedPreference ) && vmData.matchedPreferences.length > 0 ) {
        var index = getIndexOfSelectedPref( selectedPreference, vmData.matchedPreferences );
        if( index > -1 ) {
            selectionModel.setSelection( vmData.matchedPreferences[ index ] );
        }
    }
};

/**
 * Returns the path to the property that will be sorted on
 * @param {String} sortCriteria the field name from the column provider that will be sorted on
 *
 * @returns {String} the corresponding part of the preference instance that we will be sorting on
 */
var getPrefInstPropFromSortCriteria = function( sortCriteria ) {
    switch ( sortCriteria ) {
        case 'fnd0PreferenceName':
            return 'definition.name';
        case 'fnd0Location':
            return 'locationInfo.location.uiVal';
        case 'fnd0PreferenceValues':
            return 'locationInfo.values';
        case 'fnd0ProductArea':
            return 'definition.category';
        case 'fnd0ProtectionScope':
            return 'definition.protectionScope';
        default:
            return 'definition.name';
    }
};

var generateSitePreferenceInput = function() {
    return {
        preferenceNames: [ '*' ],
        location: {
            location: 'Site'
        }
    };
};

var generatePreferenceInput = function( object ) {
    return {
        location: {
            object: object
        },
        preferenceNames: [ '*' ]
    };
};

var generateParentsObject = function( orgObjects ) {
    // We ignore the first object which is site
    var parents = [ {} ];
    for( var i = 0; i < orgObjects.length; i++ ) {
        parents.push( {
            displayName: orgObjects[ i ].uiValues[ 0 ],
            object: {
                uid: orgObjects[ i ].dbValues[ 0 ]
            }
        } );
    }
    // Session Object type does not match the Type mentioned in the Group Member object.
    // This is needed to have consistent types for end user case too.
    parents[ 1 ].object.type = exports.getGroupType();
    parents[ 2 ].object.type = exports.getRoleType();
    parents[ 3 ].object.type = exports.getUserType();
    return parents;
};

/**
 * This method creates an array of location inputs for SOA and mapping of org data. More than one input is created
 * in the case of sub groups.
 * @return {prefLocOrgArray} Returns array of preference location inputs and organization map.
 *                prefLocOrgArray is an array of
 *                      inputData - Location Input to get preferencesByLocation.
 *                      orgObjectMap - Map containing
 *                          Key - Org type name
 *                          Value - Org Model Object.
 */
var generatePrefLocOrgArray = function() {
    var inputDataArray = [];
    var isSystemAdmin = adminPreferenceUserUtil.isSystemAdmin();
    var isGroupAdmin = adminPreferenceUserUtil.isGroupAdmin();

    appCtxSvc.updatePartialCtx( 'tcadmconsole.preferences.isUserSystemAdmin', isSystemAdmin );
    appCtxSvc.updatePartialCtx( 'tcadmconsole.preferences.isUserGroupAdmin', isGroupAdmin );

    var parents = appCtxSvc.getCtx( 'parents' );

    var getPreferenceAtUniqueLocations = [];
    getPreferenceAtUniqueLocations.push( generateSitePreferenceInput() );
    if( !isSystemAdmin && !isGroupAdmin ) {
        var session = cdm.getUserSession();
        if( session ) {
            // Access to any additional parents fields should require update of this method.
            parents = generateParentsObject( [
                session.props.group,
                session.props.role,
                session.props.user
            ] );
        }
    }

    var uniqueOrgObjectMap = new Map();
    if( parents ) {
        for( var i = 1; i < parents.length; i++ ) {
            var orgObject = {
                orgDisplayName: parents[ i ].displayName,
                orgModelObject: parents[ i ].object
            };
            if( !uniqueOrgObjectMap.has( parents[ i ].object.type ) ) {
                getPreferenceAtUniqueLocations.push( generatePreferenceInput( parents[ i ].object ) );
                uniqueOrgObjectMap.set( parents[ i ].object.type, orgObject );
            } else {
                var duplicateOrgObjectMap = new Map();
                duplicateOrgObjectMap.set( parents[ i ].object.type, orgObject );
                inputDataArray.push( {
                    inputData: {
                        getPreferenceAtLocationIn: [ generatePreferenceInput( parents[ i ].object ) ],
                        includePreferenceDescriptions: true
                    },
                    orgObjectMap: duplicateOrgObjectMap
                } );
            }
        }
    }
    inputDataArray.push( {
        inputData: {
            getPreferenceAtLocationIn: getPreferenceAtUniqueLocations,
            includePreferenceDescriptions: true
        },
        orgObjectMap: uniqueOrgObjectMap
    } );
    return inputDataArray;
};

/**
 * Sets the search string to be used for filtering preferences.
 * @param  {Object} searchString search string to be used for filtering preferences.
 *
 * @return {Object} promise
 */
export let setSearchString = function( searchString ) {
    var prefEditHandler = editHandlerService.getEditHandler( 'PREF_EDIT_CONTEXT' );
    if( prefEditHandler !== null ) {
        prefEditHandler.setResetPWA( false );
        editHandlerService.setActiveEditHandlerContext( 'PREF_EDIT_CONTEXT' );
        return editHandlerService.leaveConfirmation().then( function() {
            // Reset Filter Map so that old filter data is not shown in getInitialFilterObjects
            appCtxSvc.updatePartialCtx( 'search.filterMap', undefined );
            appCtxSvc.updatePartialCtx( 'tcadmconsole.searchCriteria.searchString', searchString );
        } );
    }
    // Reset Filter Map so that old filter data is not shown in getInitialFilterObjects
    appCtxSvc.updatePartialCtx( 'search.filterMap', undefined );
    appCtxSvc.updatePartialCtx( 'tcadmconsole.searchCriteria.searchString', searchString );
};

/**
 * Remove passed in characters if the search string starts and ends with it.
 * @param {Object} searchString the search string.
 * @param {Object} charToRemove Characters to remove.
 *
 * @return {String} search String
 */
var removeStartEndChar = function( searchString, charToRemove ) {
    for( var i = 0; i < charToRemove.length; i++ ) {
        if( searchString.charAt( 0 ) === charToRemove[ i ] && searchString.charAt( searchString.length - 1 ) === charToRemove[ i ] ) {
            searchString = searchString.substring( 1, searchString.length - 1 );
        }
    }
    return searchString;
};

/**
 * This method would filter the preference needed to show based on COTS, and protection scope
 * @param  {Array} prefInstances - array of preference instances
 *
 * @return {Array} matchedPreferences - array of preferences to show
 */
/* var getPreferencesToShow = function( prefInstances ) {
    var matchedPreferences = [];
    for( var i = 0; i < prefInstances.length; i++ ) {
        var location = prefInstances[ i ].locationInfo.location;
        var protectionScope = prefInstances[ i ].definition.protectionScope;
        if( location.prefLoc === 'COTS' || location.prefLoc === 'Overlay' ||
            location.prefLoc === 'Env' ||
            location.index >= exports.findSearchStartLocation( protectionScope ) ) {
            matchedPreferences.push( prefInstances[ i ] );
        }
    }
    return matchedPreferences;
}; */

/**
 * @param {Object} uwDataProvider - An Object ( usually a UwDataProvider ) on the DeclViewModel on the $scope this action function is invoked from.
 * @param {number} columnInfo the array of objects containing the column configuration data
 *
 * @return {Promise} A Promise that will be resolved with the requested data when the data is available.
 *
 * <pre>
 * {
 *     columnInfos : {Array} An array containing the column information related to the row data created by this service.
 * }
 * </pre>
 */
export let loadTableColumns = function( uwDataProvider, columnInfo ) {
    var deferred = AwPromiseService.instance.defer();

    // This extra column is placeholder for icon.
    // AW client framework consider this to proper behavior of freeze\unfreeze of columns.
    var iconColumn = {
        name: 'icon1',
        displayName: '',
        width: 40,
        enableColumnMoving: false,
        enableColumnResizing: false,
        enableFiltering: false,
        enableSorting: false,
        enableColumnMenu: false
    };

    // Making 'icon1' column as first column
    columnInfo.unshift( iconColumn );

    uwDataProvider.columnConfig = {
        columns: columnInfo
    };

    deferred.resolve( {
        columnInfos: columnInfo
    } );
    return deferred.promise;
};

/**
 * Generate a map of category objects, each of which contains a map of preference objects
 * Organizes preferences based on their category ( i.e. Product Area )
 * @param  {object} response the response data from the 'getPreferences' SOA call
 * @param {object} orgObjectMap - Map containing
 *                          Key - Org type name
 *                          Value - Org Model Object.
 * @param {object} prefFilters with Filter map from previous calls.
 *
 */
export let groupPreferencesByFilters = function( response, orgObjectMap, prefFilters ) {
    if( !prefFilters ) {
        prefFilters = new Map();
    }
    var allPreferences = response.responses;
    var prefDefinitionMap = new Map();
    for( var i = 0; i < allPreferences.length; i++ ) {
        var preference = allPreferences[ i ];

        var filterName = preference.definition.category;
        var prefName = preference.definition.name;
        var notRealPref = filterName + '_NOTREALPREF';
        var newPrefMap;
        if( _.endsWith( prefName, notRealPref ) ) {
            if( !prefFilters.has( filterName ) ) {
                newPrefMap = new Map();
                prefFilters.set( filterName, newPrefMap );
            }
            continue;
        }
        prefDefinitionMap.set( preference.definition.name, preference.definition );

        var prefLocInstance = new PreferenceLocationInstance( prefDefinitionMap.get( preference.definition.name ), preference.values, orgObjectMap );
        prefLocInstance.uuid = i + 1;
        _preferenceInstances.push( prefLocInstance );

        var prefMap;
        if( prefFilters.has( filterName ) ) {
            prefMap = prefFilters.get( filterName );
            if( prefMap.has( prefName ) ) {
                prefMap.get( prefName ).push( prefLocInstance );
            } else {
                prefMap.set( prefLocInstance.definition.name, [ prefLocInstance ] );
            }
        } else {
            newPrefMap = new Map();
            prefFilters.set( filterName, newPrefMap );
            prefMap = prefFilters.get( filterName );
            prefMap.set( prefLocInstance.definition.name, [ prefLocInstance ] );
        }
    }

    _preferenceFilters = prefFilters;
};

/**
 * @returns {Array} array of all preference instances
 */
export let getAllPreferences = function() {
    return _preferenceInstances;
};

/**
 *  Getter for _preferenceFilters
 *
 * @return {Map} _preferenceFilters
 */
export let getPrefFilters = function() {
    return _preferenceFilters;
};

/**
 * Get display value for 'ProtectionScope' label.
 * @param {boolean} value key of Protection Scope messages
 *
 * @return {String} display value for Protection Scope field
 */
export let getDisplayValueForProtectionScope = function( value ) {
    return localeService.getLoadedText( 'preferenceMessages' )[ value ];
};

/**
 * If preference value is array of string, it should be displayed as comma separated
 * string inside preference table. This method will do this job.
 * @param {Object} values preference value
 * @param {boolean} isArray flag to determine whether preference is array or non-array
 *
 * @return {String} comma separated values if array type otherwise value txt
 */
export let getDisplayValues = function( values, isArray ) {
    if( isArray && !_.isUndefined( values ) && values !== '' ) {
        values = values.join( ', ' );
    }
    return values;
};

/**
 * @param {Object} localizedProtectionScopes localized UI values for protection scopes
 *
 * @returns {Array} an array of protection scope view model objects for the create and edit listboxes
 */
export let getProtectionScopes = function( localizedProtectionScopes ) {
    // build protection scope list
    var protectionScopes = [];
    _protectionScopes.forEach( function( val ) {
        var protectionScopeVM = _getListObject( localizedProtectionScopes[ val ], val );
        protectionScopes.push( protectionScopeVM );
    } );
    return protectionScopes;
};

/**
 * @returns {Array} an array of product area view model objects for the create and edit listboxes
 */
export let getProductAreaList = function() {
    var prodAreas = [];
    _preferenceFilters.forEach( function( prefMap, prodArea ) {
        var prodAreaVM = _getListObject( prodArea, prodArea );
        prodAreas.push( prodAreaVM );
    } );
    prodAreas = _.sortBy( prodAreas, 'propInternalValue' );
    return prodAreas;
};

/**
 * like the listbox service helper methods --- cloned from there.
 *
 * @param {String} uiVal display value
 * @param {String} dbVal internal value
 *
 * @return {Object} model object
 */
var _getListObject = function( uiVal, dbVal ) {
    var listModel = {
        propDisplayValue: uiVal,
        propInternalValue: dbVal,
        propDisplayDescription: '',
        hasChildren: false,
        children: {},
        sel: false
    };
    return listModel;
};

/**
 * This method would reset the static variable of this service
 */
export let resetService = function() {
    _preferenceFilters = null;
    _preferenceInstances = [];
};

/**
 * This method will return the Locations List
 * @param {String} type indicates if the user is importing or exporting
 * @returns {Array} array of localized locations
 */
export let getLocations = function( type ) {
    // Localization and build protection location list
    var locations = [];
    var val = _localTextBundle.User + ': ' + appCtxSvc.ctx.userSession.props.user_id.dbValues[ 0 ];
    locations.push( _getListObject( val, 'USER' ) );

    val = _localTextBundle.Role + ': ' + appCtxSvc.ctx.userSession.props.role_name.dbValues[ 0 ];
    locations.push( _getListObject( val, 'ROLE' ) );

    val = _localTextBundle.Group + ': ' + appCtxSvc.ctx.userSession.props.group_name.dbValues[ 0 ];
    locations.push( _getListObject( val, 'GROUP' ) );

    if( type === 'import' && adminPreferenceUserUtil.isSystemAdmin() ) {
        val = _localTextBundle.Site;
        locations.push( _getListObject( val, 'SITE' ) );
    } else if( type === 'export' ) {
        val = _localTextBundle.Site;
        locations.push( _getListObject( val, 'SITE' ) );
    }

    return locations;
};

/**
 * @returns {Array} an array of product area view model objects for the export preferences
 */
export let getProductAreaListToExport = function() {
    // Build product area list
    var prodAreas = exports.getProductAreaList();

    // Add 'All' option to product area list
    prodAreas = _.sortBy( prodAreas, 'propInternalValue' );
    prodAreas.unshift( _getListObject( _localTextBundle.all, 'all' ) );

    return prodAreas;
};

/**
 * Sets the supported versions for delete product area.
 */
export let setSupportedTCVersionForDeleteProductAreaContext = function() {
    var tcMajor = tcSessionData.getTCMajorVersion();
    var tcMinor = tcSessionData.getTCMinorVersion();
    var qrmNumber = tcSessionData.getTCQRMNumber();
    var isSupported = false;
    // If major version is greater than 12 .e.g TC13x onwards, then set true
    if( tcMajor > 12 ) {
        isSupported = true;
    } else if( tcMajor === 12 && tcMinor >= 1 ) { //For Tc12.1 and newer releases
        isSupported = true;
    } else if( tcMajor === 11 && tcMinor >= 2 && qrmNumber >= 7 ) { //For Tc11.6 and Internal name for Tc11.6 is 11.2.7
        isSupported = true;
    }
    appCtxSvc.registerPartialCtx( 'deleteProductArea.isSupportedVersion', isSupported );
};

/**
 * @param {String} location location
 * @param {String} orgName location org name
 *
 * @return{Object} formated display name
 */
export let generateLocationDisplayName = function( location, orgName ) {
    return _localTextBundle[ location ] + ' (' + orgName + ')';
};

/**
 * @return{String} group type.
 */
export let getGroupType = function() {
    return 'Group';
};

/**
 * @return{String} role type.
 */
export let getRoleType = function() {
    return 'Role';
};

/**
 * @return{String} User type.
 */
export let getUserType = function() {
    return 'User';
};

/**
 * Get the preference instance for the selected show in table.
 * @param {String} prodArea product area for the preference
 * @param {String} prefName name of the preference
 * @param {String} locationForSelectedPref location for the selected preference
 *
 * @return {Object} preference object from adminPreferencesService:_preferenceInstances
 */
export let getSelectedPreferenceInstance = function( prodArea, prefName, locationForSelectedPref ) {
    var filteredPreferenceFilters = appCtxSvc.getCtx( 'tcadmconsole.preferences.filteredPreferenceFilters' );
    var preferencesMap = filteredPreferenceFilters.get( prodArea );

    var preferenceLocationInstances = preferencesMap.get( prefName );
    var selectedPrefInstance;
    preferenceLocationInstances.forEach( function( prefLocationInstance ) {
        if( prefLocationInstance.locationInfo.location.uiVal === locationForSelectedPref ) {
            selectedPrefInstance = prefLocationInstance;
            return;
        }
    } );
    return selectedPrefInstance;
};

/**
 * Open filter panel
 *
 * @param {string} commandId panel id
 * @param {string} commandLocation location where panel will open
 * @param {object} context context to be passed to the panel
 */
export let openFilterPanel = function( commandId, commandLocation, context ) {
    var push = !adminPreferenceUserUtil.isSystemAdmin() && !adminPreferenceUserUtil.isGroupAdmin();
    commandPanelService.activateCommandPanel( commandId, commandLocation, context, push );
};

/**
 * Initialization.
 */
const loadConfiguration = () => {
    eventBus.subscribe( '$locationChangeSuccess', ( { event, newUrl, oldUrl } ) => {
        // if we are navigating away from the preferences page, reset the service
        if( oldUrl.includes( 'showPreferences' ) && !newUrl.includes( 'showPreferences' ) ) {
            exports.resetService();
            appCtxSvc.updatePartialCtx( 'tcadmconsole.searchCriteria', undefined );
            appCtxSvc.updatePartialCtx( 'tcadmconsole.preferences.useDefaultSort', true );
        }
    } );
};

loadConfiguration();

export default exports = {
    findSearchStartLocation,
    convertValueTypeToInt,
    loadTableData,
    loadTableDataFromServer,
    generateRegex,
    parseSearchInput,
    meetsSearchCriteria,
    loadFilterPanelData,
    hasPreferenceValueSearchCriteria,
    selectNewPrefRow,
    setSearchString,
    loadTableColumns,
    groupPreferencesByFilters,
    getAllPreferences,
    getPrefFilters,
    getDisplayValueForProtectionScope,
    getDisplayValues,
    getProtectionScopes,
    getProductAreaList,
    resetService,
    getLocations,
    getProductAreaListToExport,
    setSupportedTCVersionForDeleteProductAreaContext,
    generateLocationDisplayName,
    getGroupType,
    getRoleType,
    getUserType,
    getSelectedPreferenceInstance,
    openFilterPanel
};
/**
 * Register the service
 *
 * @memberof NgServices
 * @member adminPreferencesService
 *
 * @param {Object} adminPreferenceUserUtil admin pref user util functions
 * @param {Object} appCtxSvc app ctx service functions
 * @param {Object} soaService soa service functions
 * @param {Object} $q functions
 * @param {Object} localeService locale service functions
 * @param {Object} cdm Client data model.
 * @param {Object} tcSessionData Client data model.
 * @param {Object} $rootScope root scope
 * @param {Object} editHandlerService edit handler service
 * @param {Object} commandPanelService command panel service
 *
 *
 * @returns {Object} export functions
 */
app.factory( 'adminPreferencesService', () => exports );

// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 *
 * @module js/advancedSearchUtils
 */

import app from 'app';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import soaService from 'soa/kernel/soaService';
import narrowModeService from 'js/aw.narrowMode.service';
import AwStateService from 'js/awStateService';
import dateTimeService from 'js/dateTimeService';

'use strict';

var AWC_UIDS_FOR_QUICK_SEARCHES = 'AWC_UidsForQuickSearch';
var splitByString = '_SearchAttribute=';
var _delimiterForArray = ';';
const INTERNAL_KEYWORD = '__I_N_T_E_R_N_A_L__';

/**
 * this method gets the uids for all the quick searches stored in the preference Quick_Access_Queries
 * @function getUidsForQuickSearch
 */
export let getUidsForQuickSearch = function() {
    soaService.post( 'Administration-2012-09-PreferenceManagement', 'getPreferences', {
        preferenceNames: [ AWC_UIDS_FOR_QUICK_SEARCHES ],
        includePreferenceDescriptions: false
    } ).then( function( result ) {
        if( result && result.response && result.response[ 0 ] && result.response[ 0 ].values &&
            result.response[ 0 ].values.values && result.response[ 0 ].values.values.length > 0 &&
            result.response[ 0 ].values.values[ 0 ] !== 'DefaultUid' ) {
            var uidPreferenceValues = result.response[ 0 ].values.values;
            appCtxService.updatePartialCtx( 'preferences.' + AWC_UIDS_FOR_QUICK_SEARCHES, uidPreferenceValues );
        }
    } );
};

/**
 * this method uses the internalName of the quick access query and then gets the attribute specified for it from
 * the preference Quick_Access_Queries_Attribute
 * @function selectQuickAccessQueryAttribute
 * @param {string}internalName - internalName of the quick access query
 * @param {Object}data - the view model data
 * @returns {string} the quick search attribute
 */
export let selectQuickAccessQueryAttribute = function( internalName, data ) {
    var values = data.preferences.Quick_Access_Queries_Attribute;
    if( values && values.length > 0 ) {
        for( var index = 0; index < values.length; index++ ) {
            var eachPrefValue = values[ index ];
            var internalNameAttributePair = eachPrefValue.split( splitByString );
            var name = internalNameAttributePair[ 0 ];
            var attribute = internalNameAttributePair[ 1 ];
            if( internalName === name ) {
                return attribute;
            }
        }
    }
    return null;
};

/**
 * getQuickSearchAttribute
 * @function getQuickSearchAttribute
 * @param {Object}data - the view model data
 * @param {string}searchUid - the saved query uid of the quick search
 * @param {string}searchName - the display name of the saved query
 * @return {string} quick search attribute name
 */
export let getQuickSearchAttribute = function( data, searchUid, searchName ) {
    var attribute = null;
    var preferenceUidList = appCtxService.getCtx( 'preferences.' + AWC_UIDS_FOR_QUICK_SEARCHES );
    var indexOfUID = _.findIndex( preferenceUidList, function( eachUid ) { return eachUid === searchUid; } );

    if( indexOfUID !== -1 ) {
        var internalName = data.preferences.Quick_Access_Queries[ indexOfUID ];
        attribute = exports.selectQuickAccessQueryAttribute( internalName, data );
    }

    // For user in test group does have Quick_Access_Queries_Attribute, populate search attribute for OOTB quick searches
    if( attribute === null ) {
        var attrMap = {};
        attrMap[ 'Item ID' ] = 'ItemID';
        attrMap[ 'Keyword Search' ] = 'Keyword';
        attrMap[ 'Item Name' ] = 'ItemName';
        attrMap[ 'Dataset Name' ] = 'DatasetName';
        attribute = attrMap[ searchName ];
    }
    return attribute;
};

export let initTriState = function( prop ) {
    // if LOV entries were not provided, create one
    if( !prop.hasLov ) {
        prop.lovApi = {};
        prop.propertyLabelDisplay = 'NO_PROPERTY_LABEL';
        prop.lovApi.getInitialValues = function( filterStr, deferred ) {
            var listModelTrue = {
                propDisplayValue: prop.propertyRadioTrueText,
                propInternalValue: true,
                propDisplayDescription: '',
                hasChildren: false,
                children: {},
                sel: false
            };
            var listModelFalse = {
                propDisplayValue: prop.propertyRadioFalseText,
                propInternalValue: false,
                propDisplayDescription: '',
                hasChildren: false,
                children: {},
                sel: false
            };
            var lovEntries = [];
            lovEntries.push( listModelTrue );
            lovEntries.push( listModelFalse );
            return deferred.resolve( lovEntries );
        };

        prop.lovApi.getNextValues = function( deferred ) {
            deferred.resolve( null );
        };

        prop.lovApi.validateLOVValueSelections = function( lovEntries ) { // eslint-disable-line no-unused-vars
            // Either return a promise or don't return anything. In this case, we don't want to return anything
        };
        prop.hasLov = true;
        prop.isSelectOnly = true;
    }
};

/**
 * check if the TC version is supported
 * @function checkVersionSupported
 * @param {Object}data - the view model data
 * @param {Object}response - search response
 */
export let checkVersionSupported = function( data, response ) {
    data.isAdvancedSearchSupported.dbValue = 'ADVANCED_SEARCH_SUPPORTED';
    if( response.ServiceData && response.ServiceData.partialErrors ) {
        _.forEach( response.ServiceData.partialErrors, function( partialError ) {
            _.forEach( partialError.errorValues, function( errValue ) {
                if( errValue.code === 141170 || errValue.code === 141209 ) {
                    data.isAdvancedSearchSupported.dbValue = 'ADVANCED_SEARCH_NOT_SUPPORTED';
                    return;
                }
            } );
        } );
    }
};

let populateAdvancedSearchCriteria = function( dbValue, prop, uiValue, searchCriteriaMap, propDisplayName, propName, searchCriteriaUiValueMap, data ) {
    if( dbValue !== 'undefined' && dbValue !== null ) {
        if( prop.propertyDescriptor && prop.propertyDescriptor.lovCategory === 1 && Array.isArray( dbValue ) && Array.isArray( uiValue ) ) {
            // when user selects from the dropdown.
            searchCriteriaMap[ propName ] = dbValue.join( _delimiterForArray );
            searchCriteriaUiValueMap[ propName ] = [ prop.propertyName, prop.propertyDisplayName, dbValue.join( _delimiterForArray ), uiValue.join( _delimiterForArray ) ];
            data.searchCriteria.uiValue = data.searchCriteria.uiValue + propDisplayName + '=' + uiValue + ';';
        } else if( prop.propertyDescriptor && prop.propertyDescriptor.lovCategory === 1 && !Array.isArray( dbValue ) && !Array.isArray( uiValue ) ) {
            // when user enters the value into the parent LOV container directly
            searchCriteriaMap[ propName ] = exports.removeTrailingSpecialCharacterFromCriteria( dbValue.toString() );
            searchCriteriaUiValueMap[ propName ] = [ prop.propertyName, prop.propertyDisplayName, String( dbValue ), String( uiValue ) ];
            data.searchCriteria.uiValue = data.searchCriteria.uiValue + propDisplayName + '=' +
                ( uiValue ? uiValue : dbValue ) + ';';
        } else {
            searchCriteriaMap[ propName ] = exports.removeTrailingSpecialCharacterFromCriteria( dbValue.toString() );
            searchCriteriaUiValueMap[ propName ] = [ prop.propertyName, prop.propertyDisplayName, String( prop.dbValue ), String( prop.uiValue ) ];
            data.searchCriteria.uiValue = data.searchCriteria.uiValue + propDisplayName + '=' +
                ( prop.uiValue ? prop.uiValue : prop.dbValue ) + ';';
        }
    }
};

/**
 * setAdvancedSearchCriteria
 *
 * @function setAdvancedSearchCriteria
 * @memberOf NgServices.advancedSearchService
 *
 * @param {Object}data - the view model data
 * @param {Object}searchCriteriaMap - searchCriteriaMap
 * @param {Object}prop - prop
 * @param {Object}searchCriteriaUiValueMap - searchCriteriaMap
 */
export let setAdvancedSearchCriteria = function( data, searchCriteriaMap, prop, searchCriteriaUiValueMap ) {
    var propName = prop.propertyName;
    var propDisplayName = prop.propertyDisplayName;
    if( propName && propDisplayName && !exports.isPropEmpty( prop.uiValue ) ) {
        propName = propName.trim();
        propDisplayName = propDisplayName.trim();
        var pickedValue = {};
        var dbValue = null;
        var uiValue = null;
        if( prop.type === 'DATE' ) {
            if( prop.dateApi && prop.dateApi.dateValue ) {
                var date = new Date( prop.dbValue );
                if( date.getTime() ) {
                    dbValue = dateTimeService.formatSessionDateTime( date );
                }
            }
        } else {
            if( prop.propertyDescriptor && prop.propertyDescriptor.lovCategory === 1 ) {
                exports.pickPropValues( prop, pickedValue );
                dbValue = pickedValue.dbValue;
                uiValue = pickedValue.uiValue;
            } else {
                dbValue = prop.dbValue;
            }
        }

        populateAdvancedSearchCriteria( dbValue, prop, uiValue, searchCriteriaMap, propDisplayName, propName, searchCriteriaUiValueMap, data );
    }
};

let pickPropValuesWhenPropIsEmpty = function( prop, valuesPicked ) {
    if( Array.isArray( prop.uiValue ) ) {
        valuesPicked = prop.uiValue;
    } else {
        valuesPicked.push( prop.uiValue );
    }
    return valuesPicked;
};

let pickPropValuesWhenPropIsNotEmpty = function( prop, valuesPicked ) {
    if( prop.uiValues.join( ',' ) === prop.uiValue ) {
        valuesPicked = prop.uiValues;
    } else {
        if( Array.isArray( prop.uiValue ) ) {
            valuesPicked = prop.uiValue;
        } else {
            valuesPicked.push( prop.uiValue );
        }
    }
    return valuesPicked;
};

export let pickPropValues = function( prop, pickedValue ) {
    pickedValue.dbValue = [];
    pickedValue.uiValue = [];
    if( prop.newDisplayValues && prop.newDisplayValues.length > 0 ) {
        if( prop.dbValue && prop.dbValue.length > 0 && prop.dbValue !== prop.uiValue ) {
            pickedValue.dbValue = prop.dbValue;
        }

        pickedValue.uiValue = prop.newDisplayValues;
    } else {
        var valuesPicked = [];
        if( !exports.isPropEmpty( prop.dbValue ) ) {
            if( exports.isPropEmpty( prop.uiValues ) ) {
                valuesPicked = pickPropValuesWhenPropIsEmpty( prop, valuesPicked );
            } else {
                valuesPicked = pickPropValuesWhenPropIsNotEmpty( prop, valuesPicked );
            }
        } else {
            //only uiValue, this is for type-in value
            valuesPicked = prop.uiValue;
        }
        exports.assignDbValue( pickedValue, valuesPicked );
        pickedValue.uiValue = valuesPicked;
    }
};

export let criteriaToString = function( value ) {
    var delimiter = appCtxService.ctx.preferences.WSOM_find_list_separator;
    delimiter = delimiter ? delimiter : ';';
    return value.join( delimiter );
};

/**
 * setAdvancedSearchCriteriaMap
 * @function setAdvancedSearchCriteriaMap
 * @param {Object}data - the view model data
 * @param {Object}searchCriteriaMap - searchCriteriaMap
 */
export let setAdvancedSearchCriteriaMap = function( data, searchCriteriaMap, skipSavingContext ) {
    if ( !data.searchCriteria ) {
        data.searchCriteria = {
            uiValue: ''
        };
    } else {
        data.searchCriteria.uiValue = '';
    }

    var searchCriteriaUiValueMap = [];
    _.forEach( data.awp0AdvancedQueryAttributes, function( prop ) {
        exports.setAdvancedSearchCriteria( data, searchCriteriaMap, prop, searchCriteriaUiValueMap );
    } );
    if( data.awp0AdvancedQueryName.uiValue === undefined ) {
        data.awp0AdvancedQueryName.uiValue = data.awp0AdvancedQueryName.uiValues[ 0 ];
    }
    if( !skipSavingContext && appCtxService.ctx.advancedSearch ) {
        appCtxService.ctx.advancedSearch.referencingSavedQuery = data.awp0AdvancedQueryName.uiValues[ 0 ];
        appCtxService.ctx.advancedSearch.searchFilters = data.searchCriteria.uiValue;
        appCtxService.ctx.advancedSearch.searchCriteriaMap = searchCriteriaUiValueMap;
    }
    data.searchCriteriaUiValueMap = searchCriteriaUiValueMap;
    data.searchCriteria.uiValue = data.awp0AdvancedQueryName.uiValues[ 0 ] + ' "' + data.searchCriteria.uiValue +
        '"';
};

/**
 * getQuickSearchCriteria
 * @function getQuickSearchCriteria
 * @param {Object}prop - the search attribute property
 * @return {String} search criteria
 */
export let getQuickSearchCriteria = function( prop ) {
    var propName = prop.propertyName;
    var propDisplayName = prop.propertyDisplayName;
    if( propName && propDisplayName && !exports.isPropEmpty( prop.dbValue ) ) {
        propName.trim();
        propDisplayName.trim();
        var value = null;
        if( prop.type === 'DATE' ) {
            if( prop.dateApi && prop.dateApi.dateValue ) {
                var date = new Date( prop.dbValue );
                if( date.getTime() ) {
                    value = dateTimeService.formatSessionDateTime( date );
                }
            }
        } else {
            value = prop.dbValue;
        }

        if( value !== 'undefined' && value !== null ) {
            if( value === _delimiterForArray || value.hasOwnProperty( 'length' ) && value.length === 0 ) {
                return null;
            }

            return value.toString();
        }
        return null;
    }
    return undefined;
};

/**
 * setQuickSearchCriteriaMap
 * @function setQuickSearchCriteriaMap
 * @param {Object}data - the view model data
 * @param {string}criteria - the search criteria
 */
export let setQuickSearchCriteriaMap = function( data, criteria ) {
    if( appCtxService.ctx.advancedSearch ) {
        appCtxService.ctx.advancedSearch.referencingSavedQuery = data.awp0QuickSearchName.uiValues[ 0 ];
        appCtxService.ctx.advancedSearch.searchFilters = criteria.quickSearchAttributeValue;
        delete appCtxService.ctx.advancedSearch.searchCriteriaMap;
    }
    data.searchCriteria.uiValue = data.awp0QuickSearchName.uiValues[ 0 ] + ' "' + criteria.quickSearchAttributeValue + '"';
};

/**
 * removeTrailingSpecialCharacterFromCriteria
 * @function removeTrailingSpecialCharacterFromCriteria
 * @param {String}criteria - criteria
 * @return {String} cleaned criteria
 */
export let removeTrailingSpecialCharacterFromCriteria = function( criteria ) {
    if( criteria && criteria.endsWith( _delimiterForArray ) ) {
        criteria = criteria.substr( 0, criteria.length - 1 );
    }
    return criteria;
};

/**
 * getSearchId
 * @function getSearchId
 * @param {String}queryUID - queryUID
 * @return {String} advanced search Id
 */
export let getSearchId = function( queryUID ) {
    //Unique Search ID: search_object_UID + logged_in_user_UID + current_time
    var userCtx = appCtxService.getCtx( 'user' );
    var loggedInUserUid = userCtx.uid;
    var timeSinceEpoch = new Date().getTime();
    return queryUID + loggedInUserUid + timeSinceEpoch;
};

/**
 * closeAdvancedPanelNarrow
 * @function closeAdvancedPanelNarrow
 * @param {Number}source - source
 */
export let closeAdvancedPanelNarrow = function( source ) {
    if( narrowModeService.isNarrowMode() ) {
        eventBus.publish( 'complete', {
            source: source
        } );
    }
};

/**
 * isPropEmpty
 * @function isPropEmpty
 * @param {Object}prop - prop
 * @returns {BOOLEAN} - true if not empty
 */
export let isPropEmpty = function( prop ) {
    return prop === undefined || prop === null || prop === '' || prop.length === 0 || prop.length === 1 && prop[ 0 ] === '';
};

/**
 * buildURLForAdvancedSavedSearch
 * @function buildURLForAdvancedSavedSearch
 * @param {Object}savedQueryParametersMap - A map containing saved query attributes
 * @returns {String}filterString - A String containing the saved query attributes for the URL
 */
export let buildURLForAdvancedSavedSearch = function( savedQueryParametersMap ) {
    var filterString = '';
    var i = 0;
    _.forEach( savedQueryParametersMap, function( value, key ) {
        i++;
        filterString += key;
        filterString += '=';
        if( Array.isArray( value ) ) {
            filterString += value.join( _delimiterForArray );
        } else {
            filterString += value;
        }
        if( i < Object.keys( savedQueryParametersMap ).length ) {
            filterString += '~';
        }
    } );
    return filterString;
};

/**
 * updateURLForAdvancedSearch
 * @function updateURLForAdvancedSearch
 * @param {Object}data - the view model data
 */
export let updateURLForAdvancedSearch = function( data ) {
    var savedQueryParametersMap = {};
    var savedQueryAttributes = null;
    var queryName = null;
    if( data.searchType === 'Quick' ) {
        savedQueryAttributes = data.awp0QuickQueryAttributes;
        queryName = data.awp0QuickSearchName;
    } else if( data.searchType === 'Advanced' ) {
        savedQueryAttributes = data.awp0AdvancedQueryAttributes;
        queryName = data.awp0AdvancedQueryName;
    }
    if( queryName !== null && !exports.isPropEmpty( queryName.dbValue ) ) {
        savedQueryParametersMap[ queryName.dbValue ] = queryName.uiValues[ 0 ];
        savedQueryParametersMap = exports.populateSavedQueryParametersMap( savedQueryAttributes, savedQueryParametersMap );
        AwStateService.instance.go( '.', {
            searchType: data.searchType,
            savedQueryParameters: exports.buildURLForAdvancedSavedSearch( savedQueryParametersMap ),
            savedQueryName: queryName.uiValues[ 0 ]
        } );
    }
};

let populateQueryAttributesForSavedSearchInContext = function( searchType, queryAttributes, data ) {
    if( searchType === 'Quick' ) {
        data.awp0QuickQueryAttributes = queryAttributes;
        if( appCtxService.ctx.sublocation.clientScopeURI === 'Awp0AdvancedSearch' ) {
            appCtxService.updatePartialCtx( 'advancedSearch.awp0QuickSearchName', data.awp0QuickSearchName );
            appCtxService.updatePartialCtx( 'advancedSearch.awp0QuickQueryAttributes', data.awp0QuickQueryAttributes );
        }
    } else {
        data.awp0AdvancedQueryAttributes = queryAttributes;
        if( appCtxService.ctx.sublocation.clientScopeURI === 'Awp0AdvancedSearch' ) {
            var advancedSearch = appCtxService.ctx.advancedSearch;
            advancedSearch.awp0AdvancedQueryAttributes = data.awp0AdvancedQueryAttributes;
            advancedSearch.awp0AdvancedQueryName = data.awp0AdvancedQueryName;
            appCtxService.registerCtx( 'advancedSearch', advancedSearch );
        } else if( appCtxService.ctx.sublocation.clientScopeURI === 'Awp0SavedSearch' ) {
            var advancedSavedSearch = appCtxService.ctx.advancedSavedSearch;
            advancedSavedSearch.awp0AdvancedQueryAttributes = data.awp0AdvancedQueryAttributes;
            advancedSavedSearch.awp0AdvancedQueryName = data.awp0AdvancedQueryName;
            appCtxService.registerCtx( 'advancedSavedSearch', advancedSavedSearch );
        }
    }
};

/**
 * populateQueryAttributesForLovProperty - populate the viewmodel property with the info from the queryAttributes created from URL
 * @function populateQueryAttributesForLovProperty
 * @param {Object} prop - the view model property for the LOV
 * @param {string} attributeValue - the LOV attribute value from the URL
 * @returns {Object} prop - updated view model property for the LOV
 */
export let populateQueryAttributesForLovProperty = function( prop, attributeValue ) {
    var values = attributeValue.split( _delimiterForArray );
    prop.newDisplayValues = [];
    for( let index = 0; index < values.length; index++ ) {
        let displayAndInternalPair = values[ index ].split( INTERNAL_KEYWORD );
        let internalValue;
        let displayValue;
        if( displayAndInternalPair && displayAndInternalPair.length === 2 ) {
            internalValue = displayAndInternalPair[ 1 ];
            displayValue = displayAndInternalPair[ 0 ];
            prop.dbValue.push( internalValue );
            prop.dbValues.push( internalValue );
        } else {
            displayValue = values[ index ];
            prop.dbValue.push( values[ index ] );
            prop.dbValues.push( values[ index ] );
        }
        prop.uiValues.push( displayValue );
        prop.newDisplayValues.push( displayValue );
        prop.value.push( displayValue );
        prop.displayValsModel.push( {
            displayValue: displayValue,
            selected: false
        } );
        if( index !== values.length - 1 ) {
            prop.uiValue += displayValue;
            prop.uiValue += ', ';
        } else {
            prop.uiValue += displayValue;
        }
    }
    return prop;
};

/**
 * populateQueryAttributesForSavedSearch
 * @function populateQueryAttributesForSavedSearch
 * @param {Object} data - the view model data
 * @param {string} searchType - the search type
 */
export let populateQueryAttributesForSavedSearch = function( data, searchType ) {
    var queryAttributeValues = null;
    var queryAttributes = null;
    if( searchType === 'Quick' ) {
        queryAttributeValues = data.awp0QuickQueryAttributesPopulated;
        queryAttributes = data.awp0QuickQueryAttributes;
    } else {
        queryAttributeValues = data.awp0AdvancedQueryAttributesPopulated;
        queryAttributes = data.awp0AdvancedQueryAttributes;
    }
    _.forEach( queryAttributes, function( prop ) {
        var keepGoing = true;

        _.forEach( queryAttributeValues, function( val, key ) {
            if( keepGoing === true ) {
                if( key === prop.propertyName && prop.type !== 'DATE' ) {
                    if( prop.propertyDescriptor && prop.propertyDescriptor.lovCategory === 1 ) {
                        prop = populateQueryAttributesForLovProperty( prop, val );
                    } else {
                        prop.uiValue = val;
                        exports.assignDbValue( prop, val );
                    }
                    keepGoing = false;
                } else if( prop.type === 'DATE' && key === prop.propertyName ) {
                    prop.dbValue = new Date( val ).getTime();
                    prop.dateApi.dateObject = new Date( val );
                    prop.dateApi.dateValue = dateTimeService.formatDate( prop.dateApi.dateObject, dateTimeService.getSessionDateFormat() );
                    prop.dateApi.timeValue = dateTimeService.formatTime( prop.dateApi.dateObject, dateTimeService.getSessionTimeFormat() );
                    prop.uiValue = val;
                    keepGoing = false;
                }
            }
        } );
    } );

    populateQueryAttributesForSavedSearchInContext( searchType, queryAttributes, data );
};

/**
 * getSavedQueryAttributesFromURL
 * @function getSavedQueryAttributesFromURL
 * @param {String}savedQueryParametersString - the URL string
 * @returns {Object}savedQueryMap - object containing name/value pair for saved query attributes
 */
export let getSavedQueryAttributesFromURL = function( savedQueryParametersString ) {
    var savedQueryAttributes = savedQueryParametersString.split( '~' );
    var savedQueryAttributesMap = {};
    var savedQueryNameMap = {};
    var firstNameValuePairFlag = true;
    _.forEach( savedQueryAttributes, function( nameValuePairString ) {
        if( !firstNameValuePairFlag ) {
            var nameValuePair = nameValuePairString.split( '=' );
            savedQueryAttributesMap[ nameValuePair[ 0 ] ] = nameValuePair[ 1 ];
        } else {
            nameValuePair = nameValuePairString.split( '=' );
            savedQueryNameMap[ 0 ] = nameValuePair[ 0 ];
            savedQueryNameMap[ 1 ] = nameValuePair[ 1 ];
            firstNameValuePairFlag = false;
        }
    } );
    var savedQueryMap = {};
    savedQueryMap.savedQueryNameMap = savedQueryNameMap;
    savedQueryMap.savedQueryAttributesMap = savedQueryAttributesMap;
    return savedQueryMap;
};

/**
 * populateSavedQueryParametersMap
 * @function populateSavedQueryParametersMap
 * @param {Object}savedQueryAttributes - saved query attribute values
 * @param {Object}savedQueryParametersMap - saved query parameters map with saved query dbValue and uiValue pair
 * @returns {Object}savedQueryParametersMap - the saved query parameters populated in a Map
 */
export let populateSavedQueryParametersMap = function( savedQueryAttributes, savedQueryParametersMap ) {
    _.forEach( savedQueryAttributes, function( prop ) {
        if( prop.type !== 'DATE' && !exports.isPropEmpty( prop.dbValue ) ) {
            if( prop.propertyDescriptor && prop.propertyDescriptor.lovCategory === 1 ) {
                let displayAndInternalVals = [];
                for( let index = 0; index < prop.displayValues.length; index++ ) {
                    displayAndInternalVals[ index ] = prop.displayValues[ index ] + INTERNAL_KEYWORD + prop.dbValue[ index ];
                }
                savedQueryParametersMap[ prop.propertyName ] = displayAndInternalVals;
            } else {
                savedQueryParametersMap[ prop.propertyName ] = prop.uiValue;
            }
        } else if( prop.type !== 'DATE' && exports.isPropEmpty( prop.dbValue ) && prop.uiValue !== '' ) {
            if( prop.propertyDescriptor && prop.propertyDescriptor.lovCategory === 1 ) {
                savedQueryParametersMap[ prop.propertyName ] = prop.uiValue + INTERNAL_KEYWORD + prop.uiValue;
            }
        } else if( prop.type === 'DATE' && prop.uiValue !== '' ) {
            savedQueryParametersMap[ prop.propertyName ] = prop.uiValue;
        }
    } );
    return savedQueryParametersMap;
};

/**
 * getAdvancedSearchParametersForURL
 * @function getAdvancedSearchParametersForURL
 * @returns {Object}advancedSearchParam - the advanced search parameters
 */
export let getAdvancedSearchParametersForURL = function() {
    var cachedAdvancedSavedSearch = appCtxService.getCtx( 'advancedSavedSearch' );
    var awp0AdvancedQueryName = cachedAdvancedSavedSearch.awp0AdvancedQueryName;
    var savedQueryAttributes = cachedAdvancedSavedSearch.awp0AdvancedQueryAttributes;
    var savedQueryParametersMap = {};
    savedQueryParametersMap[ awp0AdvancedQueryName.dbValue ] = awp0AdvancedQueryName.uiValues[ 0 ];
    savedQueryParametersMap = exports.populateSavedQueryParametersMap( savedQueryAttributes, savedQueryParametersMap );
    var url = exports.buildURLForAdvancedSavedSearch( savedQueryParametersMap );
    var advancedSearchParam = {};
    advancedSearchParam.savedQueryName = awp0AdvancedQueryName.uiValues[ 0 ];
    advancedSearchParam.searchType = 'Advanced';
    advancedSearchParam.savedQueryParameters = url;
    advancedSearchParam.pinned = 'true';
    return advancedSearchParam;
};

export let assignDbValue = function( prop, val ) {
    if( prop.type === 'BOOLEAN' ) {
        if ( val === true || val === false ) {
            prop.dbValue = val;
        }else{
            let valTemp = val.toUpperCase();
            if ( valTemp === 'YES' || valTemp === 'TRUE' ) {
                prop.dbValue = true;
            } else{
                prop.dbValue = false;
            }
        }
    } else{
        prop.dbValue = val;
    }
};

var loadConfiguration = function() {
    if( appCtxService.ctx.preferences && appCtxService.ctx.preferences.WSOM_find_list_separator && _.isArray( appCtxService.ctx.preferences.WSOM_find_list_separator ) ) {
        _delimiterForArray = appCtxService.ctx.preferences.WSOM_find_list_separator[ 0 ];
    }
};

loadConfiguration();

const exports = {
    _delimiterForArray,
    INTERNAL_KEYWORD,
    getUidsForQuickSearch,
    selectQuickAccessQueryAttribute,
    getQuickSearchAttribute,
    initTriState,
    checkVersionSupported,
    setAdvancedSearchCriteria,
    pickPropValues,
    criteriaToString,
    setAdvancedSearchCriteriaMap,
    getQuickSearchCriteria,
    setQuickSearchCriteriaMap,
    removeTrailingSpecialCharacterFromCriteria,
    getSearchId,
    closeAdvancedPanelNarrow,
    isPropEmpty,
    buildURLForAdvancedSavedSearch,
    updateURLForAdvancedSearch,
    populateQueryAttributesForSavedSearch,
    getSavedQueryAttributesFromURL,
    populateSavedQueryParametersMap,
    getAdvancedSearchParametersForURL,
    assignDbValue,
    populateQueryAttributesForLovProperty
};

export default exports;

/**
 * @memberof NgServices
 * @member advancedSearchUtils
 */
app.factory( 'advancedSearchUtils', () => exports );

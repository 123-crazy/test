// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 *
 * @module js/preferredAdvancedSearchService
*/
import app from 'app';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import 'soa/preferenceService';
import soaSvc from 'soa/kernel/soaService';

'use strict';

/**
 * checkIfTagOptionIsValid
 * @function checkIfTagOptionIsValid
 * @param {Object}data - the advanced search context
 * @returns {boolean} - if tag option is valid
 */
export let checkIfTagOptionIsValid = function( data ) {
    var ctx = appCtxService.getCtx( 'advancedSearch' );
    if( ctx.preferredSearches && ctx.preferredSearches.preferredSearches ) {
        var preferredSearchesList = ctx.preferredSearches.preferredSearches;
        for( var i = 0; i < preferredSearchesList.length; i++ ) {
            if( preferredSearchesList[ i ] === data.awp0AdvancedQueryName.uiValue ) {
                return false;
            }
        }
        return true;
    }
    return true;
};

/**
 * untagSavedQuery
 * @function untagSavedQuery
 * @param {Object}advancedSearchCtx - the advanced search context
 */
export let unTagSavedQuery = function( advancedSearchCtx ) {
    if( advancedSearchCtx && advancedSearchCtx.awp0AdvancedQueryName && advancedSearchCtx.awp0AdvancedQueryName.displayValues
        && advancedSearchCtx.awp0AdvancedQueryName.displayValues[0] && advancedSearchCtx.awp0AdvancedQueryName.displayValues[0].length > 0 ) {
        let displayName = advancedSearchCtx.awp0AdvancedQueryName.displayValues[0];
        appCtxService.updatePartialCtx( 'advancedSearch.showTagUnTag', false );
        soaSvc.post( 'Internal-AWS2-2020-05-FullTextSearch', 'getSearchSettings', {
            searchSettingInput: {
                inputSettings: {
                    UntagSavedQuery: [ displayName ]
                }
            }
        } ).then( function( result ) {
            if( result && result.outputValues && result.outputValues.UntagSavedQuery && result.outputValues.UntagSavedQuery[0] === 'Untagging Successful' ) {
                appCtxService.updatePartialCtx( 'advancedSearch.tagFlagSet', true );
            }
        } ).then( function() {
            appCtxService.updatePartialCtx( 'advancedSearch.showTagUnTag', true );
        } );
    }
};

/**
 * tagSavedQuery
 * @function tagSavedQuery
 * @param {Object}advancedSearchCtx - the advanced search context
 */
export let tagSavedQuery = function( advancedSearchCtx ) {
    if( advancedSearchCtx && advancedSearchCtx.awp0AdvancedQueryName && advancedSearchCtx.awp0AdvancedQueryName.displayValues
        && advancedSearchCtx.awp0AdvancedQueryName.displayValues[0] && advancedSearchCtx.awp0AdvancedQueryName.displayValues[0].length > 0 ) {
        let displayName = advancedSearchCtx.awp0AdvancedQueryName.displayValues[0];
        appCtxService.updatePartialCtx( 'advancedSearch.showTagUnTag', false );
        soaSvc.post( 'Internal-AWS2-2020-05-FullTextSearch', 'getSearchSettings', {
            searchSettingInput: {
                inputSettings: {
                    tagSavedQuery: [ displayName ]
                }
            }
        } ).then( function( result ) {
            if( result && result.outputValues && result.outputValues.tagSavedQuery && result.outputValues.tagSavedQuery[0] === 'Tagging Successful' ) {
                appCtxService.updatePartialCtx( 'advancedSearch.tagFlagSet', false );
            }
        } ).then( function() {
            appCtxService.updatePartialCtx( 'advancedSearch.showTagUnTag', true );
        } );
    }
};

/**
 * push display value of the saved query lov entry into the preferred search ctx
 * @param {Object} lovEntry
 * @param {Array} displayValues
 * @returns {Array} displayValues - updated display values
 */
export let pushDisplayValuesToPreferredCtx = function( lovEntry, displayValues ) {
    var boolVal =  lovEntry && lovEntry.propDisplayValues && lovEntry.propDisplayValues.query_name
        && lovEntry.propDisplayValues.query_name.length > 0 && lovEntry.propDisplayValues.query_name[0] && lovEntry.propDisplayValues.query_name[0].length > 0;
    if( boolVal ) {
        displayValues.push( lovEntry.propDisplayValues.query_name[0] );
    }
    return displayValues;
};

/**
 * filter the preference values of QRYColumnsShownPref by the typed in search criteria
 * @param {String} filterString
 * @param {Object} preferredSearchObject
 * @returns  preferredSearchObject - the preferred search object with the updated count
 */
export let filterPreferredSearchesByCriteria = function( filterString, preferredSearchObject ) {
    var originalValues;
    if( preferredSearchObject && preferredSearchObject.values ) {
        originalValues = preferredSearchObject.values;
        var filteredValues = originalValues.filter( function( eachValue ) {
            return eachValue.indexOf( filterString ) !== -1;
        } );
        preferredSearchObject.count = filteredValues.length;
    }
    return preferredSearchObject;
};

/**
 * push display value of the saved query lov entry into the preferred search ctx when getInitialLOV SOA is called
 * @param {Object} responseData
 * @param {Object} preferredSearchObject
 */
export let addPreferredSearchNamesToCtx = function( filterString, responseData, preferredSearchObject ) {
    var displayValues = [];
    preferredSearchObject = exports.filterPreferredSearchesByCriteria( filterString, preferredSearchObject );
    var lenOfLovValues = Object.keys( responseData.lovValues ).length;
    if( responseData && responseData.lovValues && lenOfLovValues > 0 && preferredSearchObject.count > 0 ) {
        for( var index = 0; index < preferredSearchObject.count; index++ ) {
            var lovEntry = responseData.lovValues[index];
            displayValues = exports.pushDisplayValuesToPreferredCtx( lovEntry, displayValues );
        }
        preferredSearchObject.preferredSearches = displayValues;
        if( preferredSearchObject.count > lenOfLovValues ) {
            preferredSearchObject.moreValuesExist = true;
            preferredSearchObject.remainingCount = preferredSearchObject.count - Object.keys( responseData.lovValues ).length;
        }
        appCtxService.updatePartialCtx( 'advancedSearch.preferredSearches', preferredSearchObject );
    }
};

/**
 * push display value of the saved query lov entry into the preferred search ctx when getNextLOV SOA is called
 * @param {Object} responseData
 * @param {Object} preferredSearchObject
 */
export let addNextLovValuesToPreferredSearchCtx = function( filterString, responseData, preferredSearchObject ) {
    var displayValues;
    preferredSearchObject = exports.filterPreferredSearchesByCriteria( filterString, preferredSearchObject );
    var lenOfLovValues = Object.keys( responseData.lovValues ).length;
    if( preferredSearchObject && preferredSearchObject.preferredSearches && preferredSearchObject.preferredSearches.length > 0 ) {
        displayValues = preferredSearchObject.preferredSearches;
        if( responseData && responseData.lovValues && lenOfLovValues > 0 ) {
            if( preferredSearchObject.remainingCount > lenOfLovValues ) {
                for( var index = 0; index < lenOfLovValues; index++ ) {
                    var lovEntry = responseData.lovValues[index];
                    displayValues = exports.pushDisplayValuesToPreferredCtx( lovEntry, displayValues );
                }
                preferredSearchObject.moreValuesExist = true;
                preferredSearchObject.remainingCount -= lenOfLovValues;
            } else {
                for( var index1 = 0; index1 < preferredSearchObject.remainingCount; index1++ ) {
                    var lovEntry1 = responseData.lovValues[index1];
                    displayValues = exports.pushDisplayValuesToPreferredCtx( lovEntry1, displayValues );
                }
                preferredSearchObject.moreValuesExist = false;
                preferredSearchObject.remainingCount = 0;
            }
            preferredSearchObject.preferredSearches = displayValues;
        }
        appCtxService.updatePartialCtx( 'advancedSearch.preferredSearches', preferredSearchObject );
    }
};

/**
 * determining if to show the preferred search settings command group to the logged in user
 * if true is returned, then set ctx.advancedSearch.showPreferredSearchSettings to te true, else false
 */
export let setPreferredSearchesVisibilityCtx = function() {
    soaSvc.post( 'Internal-AWS2-2020-05-FullTextSearch', 'getSearchSettings', {
        searchSettingInput: {
            inputSettings: {
                preferredSearchCheck: [ 'true' ]
            }
        }
    } ).then( function( result ) {
        if( result && result.outputValues && result.outputValues.preferredSearchCheck && result.outputValues.preferredSearchCheck[0] === 'false' ) {
            appCtxService.updatePartialCtx( 'advancedSearch.showPreferredSearchSettings', false );
        } else if( result && result.outputValues && result.outputValues.preferredSearchCheck && result.outputValues.preferredSearchCheck[0] === 'true' ) {
            appCtxService.updatePartialCtx( 'advancedSearch.showPreferredSearchSettings', true );
        }
    } );
};

/**
 * remove empty value from an array
 * @param {Array} values
 * @return {Array} values - updated array with non-empty values
 */
export let removeEmptyValues = function( values ) {
    var newValues = [];
    _.forEach( values, function( value ) {
        if( value !== '' ) {
            newValues.push( value );
        }
    } );
    return newValues;
};

const exports = {
    checkIfTagOptionIsValid,
    unTagSavedQuery,
    tagSavedQuery,
    addPreferredSearchNamesToCtx,
    addNextLovValuesToPreferredSearchCtx,
    setPreferredSearchesVisibilityCtx,
    removeEmptyValues,
    pushDisplayValuesToPreferredCtx,
    filterPreferredSearchesByCriteria
};

export default exports;

/**
 * @memberof NgServices
 * @member preferredAdvancedSearchService
 */
app.factory( 'preferredAdvancedSearchService', () => exports );

// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 *
 * @module js/searchCommonUtils
 */

import app from 'app';
import appCtxSvc from 'js/appCtxService';
import filterPanelUtils from 'js/filterPanelUtils';
import filterPanelService from 'js/filterPanelService';
import soaService from 'soa/kernel/soaService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import AwStateService from 'js/awStateService';

/**
 * @function updateSearchCriteria
 * @param {Object} data data
 */
export let updateSearchCriteria = function( data ) {
    var searchCtx = appCtxSvc.getCtx( 'search' );
    var searchSearchCtx = appCtxSvc.getCtx( 'searchSearch' );
    var toUpdate = appCtxSvc.ctx.sublocation && appCtxSvc.ctx.sublocation.clientScopeURI === 'Awp0SearchResults';
    toUpdate = toUpdate && searchCtx && searchSearchCtx && data.searchBox;
    if( toUpdate ) {
        var dbValueTemp = searchCtx.criteria ? searchCtx.criteria.searchString : searchCtx.searchString;
        data.searchBox.dbValue = searchSearchCtx.searchStringPrimary ? searchSearchCtx.searchStringPrimary : dbValueTemp;
    }
};

/**
 * @function processSoaResponse
 * @param {ObjectArray} properties properties
 * @returns {ObjectArray} Filters.
 */
export let processSoaResponse = function( properties ) {
    var filters = [];

    if( properties ) {
        _.forEach( properties, function( property ) {
            var filter = {};
            filter.internalName = property.internalName;
            filter.displayName = property.displayName;
            filter.listItems = property.values.map( function( value ) {
                return {
                    staticDisplayValue: value.displayName,
                    staticElementObject: value.internalName
                };
            } );
            filters.push( filter );
        } );
    }

    return filters;
};

export let updateSearchSearchCriteria = function( filterMap ) {
    var ctx = appCtxSvc.getCtx( 'searchSearch' );
    if( ctx === undefined ) {
        ctx = {};
        appCtxSvc.registerCtx( 'searchSearch', ctx );
    }
    var savedSearchContext = appCtxSvc.getCtx( 'savedSearch' );
    if( filterMap && filterMap[ 'UpdatedResults.hidden_filter' ] ) {
        if( filterMap[ 'UpdatedResults.hidden_filter' ][ 0 ].stringValue
            .indexOf( savedSearchContext.savedSearchUid ) < 0 ) {
            ctx.savedSearchUid = savedSearchContext.savedSearchUid + '|' +
                filterMap[ 'UpdatedResults.hidden_filter' ][ 0 ].stringValue;
        } else {
            ctx.savedSearchUid = filterMap[ 'UpdatedResults.hidden_filter' ][ 0 ].stringValue;
        }
        appCtxSvc.updateCtx( 'searchSearch', ctx );
    }
};

/**
 * @function setListOfExpandedCategories - set the list of categories expanded by the user and put it in search criteria
 * @returns {String} list of expanded categories as a string
 */

export let setListOfExpandedCategories = function( filterPanelLocation ) {
    var searchFilterPanelCtx = appCtxSvc.getCtx( filterPanelLocation );
    var listOfExpandedCategoriesAsString = '';
    if( searchFilterPanelCtx && searchFilterPanelCtx.listOfExpandedCategories && searchFilterPanelCtx.listOfExpandedCategories.length > 0 ) {
        for( var index = 0; index < searchFilterPanelCtx.listOfExpandedCategories.length; index++ ) {
            if( index === searchFilterPanelCtx.listOfExpandedCategories.length - 1 ) {
                listOfExpandedCategoriesAsString += searchFilterPanelCtx.listOfExpandedCategories[ index ];
            } else {
                listOfExpandedCategoriesAsString += searchFilterPanelCtx.listOfExpandedCategories[ index ] + ',';
            }
        }
    }
    return listOfExpandedCategoriesAsString;
};

export let setThresholdValue = function( ctx ) {
    var forceThreshold = 'false';
    if( ctx.searchInfo.incontextSearchNew ) {
        forceThreshold = ctx.searchInfo.incontextSearchNew;
        delete ctx.searchInfo.incontextSearchNew;
    }
    return forceThreshold;
};

/**
 * @function getLimitedFilterCategoriesEnabled - this function checks if AWC_LIMITED_FILTER_CATEGORIES_ENABLED is true
 * @returns { String } 'true'/'false'
 */

export let getLimitedFilterCategoriesEnabled = function() {
    var isLimitedFilterCategoriesEnabled = filterPanelUtils.isLimitedCategoriesFeatureEnabled();
    if( isLimitedFilterCategoriesEnabled ) {
        return 'true';
    }
    return 'false';
};

/**
 * Function to call getCategories2 in filterPanelService.
 * The function getCategories cannot be used here as it parses response of performSearch soa that has different response structures.
 * @param {*} response The soa response
 * @returns{*} categories The filters in response are constructed into categories.
 */
export let callGetCategories = function( response, contextVal = true ) {
    var categories = response.searchFilterCategories;
    var categoryValues = response.searchFilterMap6;
    if( response.searchFilterCategoriesUnpopulated ) {
        var searchIncontextInfoCtx = appCtxSvc.getCtx( 'searchIncontextInfo' );
        if( searchIncontextInfoCtx ) {
            searchIncontextInfoCtx.unpopulatedSearchFilterCategories = response.searchFilterCategoriesUnpopulated;
            appCtxSvc.updateCtx( 'searchIncontextInfo', searchIncontextInfoCtx );
        }
    }
    if( categoryValues && ( categories === undefined || categories.length === 0 ) ) {
        //Build filter recipe values to display.
        var searchResultFilters = [];
        var ctx = appCtxSvc.getCtx( 'searchIncontextInfo' );
        if( ctx ) {
            var currentCategories = ctx.searchIncontextCategories;
            _.forEach( currentCategories, function( category ) {
                if( category && category.internalName in categoryValues ) {
                    if( category.daterange && category.daterange.startDate ) {
                        category.daterange.dateRangeSelected = true;
                    } else if( category.numericrange && category.numericrange.startValue ) {
                        category.numericrange.numericRangeSelected = true;
                    } else {
                        var values = categoryValues[ category.internalName ];
                        _.forEach( values, function( value ) {
                            value.selected = true;
                        } );
                        category.filterValues = values;
                    }
                    searchResultFilters = filterPanelService.getSearchResultFilters( searchResultFilters, category );
                }
            } );
        } else {
            ctx = {};
        }

        ctx.searchResultFilters = searchResultFilters;
        appCtxSvc.updateCtx( 'searchIncontextInfo', ctx );

        return;
    }
    var groupByProperty = response.objectsGroupedByProperty.internalPropertyName;
    filterPanelUtils.setIncontext( true );
    var categoriesWithoutExpansionRetention = filterPanelService.getCategories2( categories, categoryValues, groupByProperty, false, true, contextVal );
    var incontextCtx = appCtxSvc.getCtx( 'incontextSearchFilterPanelInfo' );
    var currentFilterCategories;
    if( incontextCtx && incontextCtx.searchCurrentFilterCategories && incontextCtx.searchCurrentFilterCategories.length > 0 ) {
        currentFilterCategories = incontextCtx.searchCurrentFilterCategories;
    }
    var categoriesWithExpansionRetention = filterPanelService.retainExpansionStateOfCategory( categoriesWithoutExpansionRetention, currentFilterCategories );
    return filterPanelService.updateCurrentCategoriesResults( categoriesWithExpansionRetention, currentFilterCategories );
};

/**
 * @function getThresholdState - gets the threshold value from additionalSearchInfoMap in SOA response.
 * @returns {String} 'true'/'false'
 */

export let getThresholdState = function( data ) {
    if( data.additionalSearchInfoMap !== undefined ) {
        //Check search exceeded threshold
        if( data.additionalSearchInfoMap.searchExceededThreshold ) {
            return data.additionalSearchInfoMap.searchExceededThreshold[ 0 ];
        }
    }
    return 'false';
};

/**
 * @function setFullTextSearchProviderCtxAndGetProviderName - gets the Data Provider Name and sets it in the context for the client to use
 * @returns {String} providerName - returns the Data Provider Name as a string
 */

export let setFullTextSearchProviderCtxAndGetProviderName = function() {
    var providerName = 'Awp0FullTextSearchProvider';
    var searchDataProviderCtx = appCtxSvc.getCtx( 'SearchDataProvider' );
    if( !searchDataProviderCtx ) {
        searchDataProviderCtx = {};
    }
    searchDataProviderCtx.providerName = providerName;
    appCtxSvc.updatePartialCtx( 'SearchDataProvider', searchDataProviderCtx );
    return providerName;
};

/**
 * Get the default page size used for max to load/return.
 * @param {Array|Object} defaultPageSizePreference - default page size from server preferences
 * @returns {Number} The amount of objects to return from a server SOA response.
 */
export let getDefaultPageSize = function( defaultPageSizePreference ) {
    var defaultPageSize = 50;

    if( defaultPageSizePreference ) {
        if( _.isArray( defaultPageSizePreference ) ) {
            defaultPageSize = exports.getDefaultPageSize( defaultPageSizePreference[ 0 ] );
        } else if( _.isString( defaultPageSizePreference ) ) {
            defaultPageSize = parseInt( defaultPageSizePreference );
        } else if( _.isNumber( defaultPageSizePreference ) && defaultPageSizePreference > 0 ) {
            defaultPageSize = defaultPageSizePreference;
        }
    }

    return defaultPageSize;
};

/**
 * Get the search threshold state value based on the count of the first filter value of 'TYPE' category from context.
 * @param {Array|Object} filterMap - search Filter Map stored in context
 * @returns {Boolean} is threshold state true or false.
 */
export let checkFilterMapForThreshold = function( filterMap ) {
    //Go through filter map to find type category
    //check the count against the first filter in type category
    //If the category and the filter exist but the count is 0 then we know threshold was applied
    var count;
    if( filterMap ) {
        for( var index = 0; index < filterMap.length; index++ ) {
            var category = filterMap[ index ];
            if( category.internalName === 'WorkspaceObject.object_type' ) {
                count = category.filterValues[ 0 ].count;
                return count === 0;
            }
        }
    }
    return false;
};

/**
 * Converts the date range search into UTC time so that property specific search for date properties is done properly.
 * @param {*} searchCriteria - the search criteria for global search/ add panel search
 * @returns {String} searchCriteria - modified search criteria if it is non range date criteria
 */
var processSingleDateSearch = function( searchCriteria ) {
    var result;
    //Now handling the remaining individual date strings in the format ": yyyy-mm-dd"
    var datePattern = /[^:|^\s]+:\s*[\[|\{]{0,1}\s*((\d{4})-(\d{1,2})-(\d{1,2}))\s*[\]|\}]{0,1}$/gi;
    while( ( result = datePattern.exec( searchCriteria ) ) !== null ) {
        var fromDateUTC1 = new Date( result[ 2 ], result[ 3 ] - 1, result[ 4 ], 0, 0, 0 )
            .toISOString().split( '.' )[ 0 ] + 'Z';
        var toDateUTC1 = new Date( result[ 2 ], result[ 3 ] - 1, result[ 4 ], 23, 59, 59 )
            .toISOString().split( '.' )[ 0 ] + 'Z';

        if( result[ 0 ].indexOf( '{' ) === -1 && result[ 0 ].indexOf( '[' ) === -1 ) {
            fromDateUTC1 = '[' + fromDateUTC1;
        }
        if( result[ 0 ].indexOf( '}' ) === -1 && result[ 0 ].indexOf( ']' ) === -1 ) {
            toDateUTC1 += ']';
        }

        var result1 = result[ 0 ].replace( result[ 1 ], fromDateUTC1 + ' TO ' + toDateUTC1 );
        searchCriteria = searchCriteria.replace( result[ 0 ], result1 );
    }
    return searchCriteria;
};

/**
 * Converts the date range search into UTC time so that property specific search is done properly.
 * Fixes the part where the date is not correctly converted into UTC time
 * @param {String} searchCriteria - the search criteria for global search/ add panel search
 * @returns {String} searchCriteria - modified search criteria if it is date criteria
 */
export let processDateSearchCriteria = function( searchCriteria ) {
    //Regex for date range pattern to handle "prop:[|{NOW|*|yyyy-mm-dd to NOW|*|yyyy-mm-dd}|]" format
    var dateRangePattern = /([^:|^\s]+:)(\s*[\[|\{]{0,1})\s*(\*|NOW|(\d{4})-(\d{1,2})-(\d{1,2}))\s+TO\s+((\d{4})-(\d{1,2})-(\d{1,2})|NOW|\*)([\]|\}]{0,1})/gi;

    //Example of regex matching and groups
    //Date:{2016-01-01 TO 2016-01-03}
    //Breakdown:
    // Group 0 :  Entire String
    // Group 1 :  Date:
    // Group 2 :  {
    // Group 3 :  2016-01-01
    // Group 4 :  2016
    // Group 5 :  01
    // Group 6 :  01
    // Group 7 :  2016-01-03
    // Group 8 :  2016
    // Group 9 :  01
    // Group 10:  03
    // Group 11:  }

    var result;
    while( ( result = dateRangePattern.exec( searchCriteria ) ) !== null ) {
        var fromDate;
        var fromDateUTC;
        if( result[ 2 ] && result[ 2 ].indexOf( ' ' ) !== -1 && ( result[ 2 ].indexOf( '[' ) !== -1 || result[ 2 ].indexOf( '{' ) !== -1 ) ) {
            result[ 2 ] = result[ 2 ].trim();
        }

        //Check if the first part of the date range is actual date or * or NOW
        if( result[ 3 ] !== '*' && result[ 3 ] !== 'NOW' ) {
            fromDate = new Date( result[ 4 ], result[ 5 ] - 1, result[ 6 ], 0, 0, 0 );
            //If the date expression starts with {, then move the date forward by 1 day
            if( result[ 2 ] === '{' ) {
                fromDate.setDate( fromDate.getDate() + 1 );
            }
            fromDateUTC = fromDate.toISOString().split( '.' )[ 0 ] + 'Z';
        } else {
            fromDate = result[ 3 ];
            fromDateUTC = fromDate;
        }

        var toDate;
        var toDateUTC;
        //Check if the second part of date range is * or NOW
        if( result[ 7 ] !== '*' && result[ 7 ] !== 'NOW' ) {
            toDate = new Date( result[ 8 ], result[ 9 ] - 1, result[ 10 ], 23, 59, 59 );
            //If the date expression ends with }, we will have to move the day back by 1
            if( result[ 11 ] === '}' ) {
                toDate.setDate( toDate.getDate() - 1 );
            }
            toDateUTC = toDate.toISOString().split( '.' )[ 0 ] + 'Z';
        } else {
            toDate = result[ 7 ];
            toDateUTC = toDate;
        }

        //Reconstruct range query: exp: bracket(?) + fromDate + TO + toDate + bracket(?)
        if( !result[ 2 ] || !result[ 11 ] ) {
            result[ 2 ] = '[';
            result[ 11 ] = ']';
        }
        var modifiedRange;
        if( result[ 11 ] === ']' && result[ 7 ] !== '*' ) {
            modifiedRange = result[ 1 ] + result[ 2 ] + fromDateUTC + ' TO ' + toDateUTC + '-1SECOND' + result[ 11 ];
        } else {
            modifiedRange = result[ 1 ] + result[ 2 ] + fromDateUTC + ' TO ' + toDateUTC + result[ 11 ];
        }
        searchCriteria = searchCriteria.replace( result[ 0 ], modifiedRange );
    }

    searchCriteria = processSingleDateSearch( searchCriteria );

    return searchCriteria;
};

/**
 * Fire event on deselection of all objects in search PWA
 * @param {Object} currentSelection - search Filter Map stored in context
 */
export let showChart = function( currentSelection ) {
    if( !currentSelection || currentSelection.length < 1 ) {
        eventBus.publish( 'targetFilterCategoryUpdated' );
        appCtxSvc.updateCtx( 'searchChart.forceChart', true );
    }
};

/**
 * gets the translated search criteria from server with the current locale's display value of the property in case of property specific search
 * @function getTranslatedSearchCriteria
 * @param {Array} searchCriteriaWithInternalNames - search criteria with internal names of the property
 * @param {String} searchCriteria - original search criteria
 */
export let getTranslatedSearchCriteria = function( searchCriteriaWithInternalNames, searchCriteria ) {
    let translatedSearchCriteria = searchCriteriaWithInternalNames;
    soaService.post( 'Internal-AWS2-2020-05-FullTextSearch', 'getSearchSettings', {
        searchSettingInput: {
            inputSettings: {
                getTranslatedSearchCriteriaForCurrentLocale: searchCriteriaWithInternalNames
            }
        }
    } ).then( function( result ) {
        if( result && result.outputValues && result.outputValues.getTranslatedSearchCriteriaForCurrentLocale
            && result.outputValues.getTranslatedSearchCriteriaForCurrentLocale.length === 1 && result.outputValues.getTranslatedSearchCriteriaForCurrentLocale[ 0 ].length > 0 ) {
            translatedSearchCriteria = result.outputValues.getTranslatedSearchCriteriaForCurrentLocale[ 0 ];
        }
        if( translatedSearchCriteria && translatedSearchCriteria.length > 0 && translatedSearchCriteria.indexOf( 'V_A_L' ) === -1 ) {
            searchCriteria.searchString = translatedSearchCriteria;
        }
    } );
};

/**
 * scans the report definition to get all the information related to translated report definition criteria
 * @function scanReportDefinitionForTranslatedSearchCriteria
 * @param {Array} params - rd_params in ReportDefinition object
 * @param {Array} paramValues - rd_param_values in ReportDefinition object
 * @returns {Array} values - array containing the translated report definition criteria
 */
export let scanReportDefinitionForTranslatedSearchCriteria = function( params, paramValues ) {
    let index = 0;
    let values = [];
    while( index < paramValues.length ) {
        let param = params[ index ];
        if( param === 'ReportTranslatedSearchCriteria' ) {
            values.push( paramValues[ index ] );
        }
        index++;
    }
    return values;
};

/**
 * checks if the property name is of type DCP ( Dynamic Compound Property )
 * @function checkIfDCPProperty
 * @param {String} propertyName - name of the property
 * @returns {Boolean} - returns whether the property is a dynamic compound property or not.
 */
export let checkIfDCPProperty = function( propertyName ) {
    if( propertyName.indexOf( '.' ) !== -1 &&
        propertyName.indexOf( '(' ) !== -1 &&
        ( propertyName.indexOf( 'GRM' ) !== -1 ||
            propertyName.indexOf( 'GRMS2P' ) !== -1 ||
            propertyName.indexOf( 'REF' ) !== -1 ||
            propertyName.indexOf( 'REFBY' ) !== -1 ||
            propertyName.indexOf( 'GRMREL' ) !== -1 ||
            propertyName.indexOf( 'GRMS2PREL' ) !== -1 )
        )
    {
        return true;
    }
    return false;
};

/**
 * sets the translatedSearchString from the getSearchSettings SOA response in the view model data
 * @function setTranslatedSearchString
 * @param {Object} response - getSearchSettings SOA response
 * @param {ViewModelProperty} translatedSearchString - view model property
 * @returns {ViewModelProperty} translatedSearchString - updated view model property.
 */
export let setTranslatedSearchString = function( response, translatedSearchString ) {
    if( response && response.outputValues && response.outputValues.getSearchCriteriaWithCurrentLocalePropNames
        && response.outputValues.getSearchCriteriaWithCurrentLocalePropNames[0] && response.outputValues.getSearchCriteriaWithCurrentLocalePropNames[0].length > 0 ) {
        translatedSearchString.dbValue = response.outputValues.getSearchCriteriaWithCurrentLocalePropNames[0];
    }
    return translatedSearchString;
};

/**
 * gets the search string from URL and updates the value of searchStringFromURL view model property
 * @function getSearchStringFromURL
 * @param {ViewModelProperty} searchStringFromURL - view model property containing the search string from URL
 * @returns {ViewModelProperty} searchStringFromURL - updated view model property.
 */
export let getSearchStringFromURL = function( searchStringFromURL ) {
    searchStringFromURL.dbValue = AwStateService.instance.params.searchCriteria;
    return searchStringFromURL;
};

/**
 * gets the saved search locale from URL and updates the value of savedSearchLocaleFromURL view model property
 * @function getSavedSearchLocaleFromURL
 * @param {ViewModelProperty} savedSearchLocaleFromURL - view model property containing the saved search locale from URL
 * @returns {ViewModelProperty} savedSearchLocaleFromURL - updated view model property.
 */
export let getSavedSearchLocaleFromURL = function( savedSearchLocaleFromURL ) {
    savedSearchLocaleFromURL.dbValue = AwStateService.instance.params.savedSearchLocale;
    return savedSearchLocaleFromURL;
};

/* eslint-disable-next-line valid-jsdoc*/

const exports = {
    updateSearchCriteria,
    processSoaResponse,
    updateSearchSearchCriteria,
    setListOfExpandedCategories,
    setThresholdValue,
    getLimitedFilterCategoriesEnabled,
    callGetCategories,
    getThresholdState,
    checkFilterMapForThreshold,
    setFullTextSearchProviderCtxAndGetProviderName,
    getDefaultPageSize,
    processDateSearchCriteria,
    showChart,
    getTranslatedSearchCriteria,
    scanReportDefinitionForTranslatedSearchCriteria,
    checkIfDCPProperty,
    setTranslatedSearchString,
    getSearchStringFromURL,
    getSavedSearchLocaleFromURL
};

export default exports;

/**
 *
 * @memberof NgServices
 * @member searchCommonUtils
 */
app.factory( 'searchCommonUtils', () => exports );

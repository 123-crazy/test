// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 *
 * @module js/awSearchService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import searchFilterSvc from 'js/aw.searchFilter.service';
import commandService from 'js/command.service';
import soaService from 'soa/kernel/soaService';
import viewModelObjectService from 'js/viewModelObjectService';
import globalSearchService from 'js/globalSearchService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import navigationUtils from 'js/navigationUtils';
import shapeSearchService from 'js/Awp0ShapeSearchService';
import searchHighlightingService from 'js/Awp0SearchHighlightingService';
import searchSnippetsService from 'js/searchSnippetsService';
import advancedSearchLocationUtilsService from 'js/advancedSearchUtils';
import searchCommonUtils from 'js/searchCommonUtils';
import localeService from 'js/localeService';
import analyticsSvc from 'js/analyticsService';
import searchFolderService from 'js/searchFolderService';
import searchFolderFilterService from 'js/searchFolderFilterService';

/**
 * wrapper function to call Awp0SearchHighlighting.getHighlightKeywords
 * @param { Object }  data
 */

export let getHighlightKeywords = function( data ) {
    return searchHighlightingService.getHighlightKeywords( data );
};

export let getSearchSnippets = function( data ) {
    return searchSnippetsService.getSearchSnippets( data );
};


export let setOriginalInputCategories = function( data ) {
    var context = null;
    if( data.searchFilterCategories && data.searchFilterCategories.length > 0 ) {
        // Update the provider
        context = appCtxService.getCtx( 'searchSearch' );
        if( context ) {
            context.originalInputCategories = _.clone( data.searchFilterCategories );
            appCtxService.updateCtx( 'searchSearch', context );
        }
    } else if( appCtxService && appCtxService.ctx && appCtxService.ctx.searchResponseInfo ) {
        if( appCtxService.ctx.searchResponseInfo.searchCurrentFilterCategories && appCtxService.ctx.searchResponseInfo.searchCurrentFilterCategories.length > 0 ) {
            context = appCtxService.getCtx( 'searchSearch' );
            if( context ) {
                context.originalInputCategories = _.union( context.originalInputCategories, appCtxService.ctx.searchResponseInfo.searchCurrentFilterCategories );
                appCtxService.updateCtx( 'searchSearch', context );
            }
        }
    }
    return true;
};

/**
 * Validate the revision rule change in the header
 *
 * @function validateLOV
 * @param {Object} data - declViewModel for the validateLOV
 */
export let validateLOV = _.debounce( function( data ) {
    var eventData = {
        revisionRuleName: data.eventData.property.dbValue.propDisplayValue,
        revisionRuleUID: data.eventData.property.dbValue.propInternalValue
    };
    var validatedLOV = [];
    validatedLOV.push( data.eventData.property.dbValue );
    var promise = data.dataProviders.revisionLink.validateLOV( validatedLOV, data.eventData.propScope );
    if( promise ) {
        promise.then( function() {
            eventBus.publish( 'aw.revisionRuleChangeEvent', eventData );
        }, function() {
            data.eventData.propScope.prop = data.eventData.propScope.prevSelectedProp;
        } );
    }

    var analyticsEvtData = globalSearchService.instance.populateAnalyticsParams( 'Awp0RevRule', 'Revision Rule' );
    analyticsSvc.logNonDeclarativeCommands( analyticsEvtData );
}, 300 );

/**
 * get Data Provider name for the search( Full Text Search/ Shape Search/ Advanced Search )
 * @function getDataProvider
 * @param {Object}filterMap - filterMap
 *
 * @return {Object} data provider
 */
export let getDataProvider = function( filterMap ) {
    var dataProviderName = 'Awp0FullTextSearchProvider';
    if( filterMap && filterMap.searchStringInContent && filterMap.searchStringInContent.length > 0 ) {
        dataProviderName = 'SS1ShapeSearchDataProvider';
        return dataProviderName;
    } else if( appCtxService.ctx.sublocation.clientScopeURI === 'Awp0SearchResults' ) {
        searchCommonUtils.setFullTextSearchProviderCtxAndGetProviderName();
    } else if( appCtxService.ctx.sublocation.clientScopeURI === 'Awp0AdvancedSearch' ) {
        dataProviderName = 'Awp0SavedQuerySearchProvider';
    }

    return exports.processRequiredFilters( dataProviderName, filterMap );
};

/**
 * this function determines if there are any required filters which
 * need to be added to context. Required filters are filters which should not be cleared from breadcrumb.
 * Following are examples of required filters: OwningSite.owning_site, ShapeSearchProvider Geolus Criteria.
 * When "clear" on breadcrumb is executed, the logic does not remove required filters.
 * @function processRequiredFilters
 * @param {String}dataProviderName - dataProviderName
 * @param {Object}filterMap - filterMap
 * @returns dataProviderName
 * */

export let processRequiredFilters = function( dataProviderName, filterMap ) {
    var requiredFilterMap = {};
    var prop = {};
    prop = filterMap ? filterMap : prop;

    var dataProviderNameAndRequiredFilterMapObject = exports.setRequiredFiltersMap( dataProviderName, prop, requiredFilterMap );
    var searchContext = appCtxService.getCtx( 'search' );

    searchContext = exports.setRequiredFiltersInSearchContext( searchContext, dataProviderNameAndRequiredFilterMapObject.requiredFilterMap );

    if( searchContext.dataProviderName !== dataProviderNameAndRequiredFilterMapObject.dataProviderName ) {
        searchContext.dataProviderName = dataProviderNameAndRequiredFilterMapObject.dataProviderName;
        searchContext.provider = dataProviderNameAndRequiredFilterMapObject.dataProviderName;
    }

    return dataProviderNameAndRequiredFilterMapObject.dataProviderName;
};

/**
 * this function determines if there are any required filters which
 * need to be added to context. Required filters are filters which should not be cleared from breadcrumb.
 * Following are examples of required filters: OwningSite.owning_site, ShapeSearchProvider Geolus Criteria.
 * When "clear" on breadcrumb is executed, the logic does not remove required filters.
 * @function setRequiredFiltersMap
 * @param {String}dataProviderName - dataProviderName
 * @param {Object}filterMap - filterMap
 * @param {Object}requiredFilterMap - requiredFilterMap ( empty when passed )
 * @returns { Object } contains dataProviderName and requiredFilterMap
 * */

export let setRequiredFiltersMap = function( dataProviderName, filterMap, requiredFilterMap ) {
    var objectToReturn = {};

    if( Object.keys( filterMap ).length > 0 ) {
        var filterPropArray;
        for( var filterVarName in filterMap ) {
            if( filterVarName === 'ShapeSearchProvider' ) {
                filterPropArray = filterMap[ filterVarName ];
                if( filterPropArray ) {
                    var filterPropValue = filterPropArray[ 0 ].stringValue;
                    if( filterPropValue === 'true' ) {
                        dataProviderName = 'SS1ShapeSearchDataProvider';
                    }
                }
            } else if( filterVarName === 'OwningSite.owning_site' ) {
                filterPropArray = filterMap[ filterVarName ];
                if( filterPropArray && filterPropArray.length > 0 ) {
                    filterPropValue = filterPropArray[ 0 ].stringValue;
                    requiredFilterMap[ filterVarName ] = [ filterPropValue ];
                }
            }
        }
    }

    if( dataProviderName === 'SS1ShapeSearchDataProvider' ) {
        requiredFilterMap.ShapeSearchProvider = [ filterMap.ShapeSearchProvider[ 0 ].stringValue ];
        if( filterMap[ 'Geolus Criteria' ] ) {
            requiredFilterMap[ 'Geolus Criteria' ] = [ filterMap[ 'Geolus Criteria' ][ 0 ].stringValue ];
        } else if( filterMap[ 'Geolus XML Criteria' ] ) {
            requiredFilterMap[ 'Geolus XML Criteria' ] = [ filterMap[ 'Geolus XML Criteria' ][ 0 ].stringValue ];
        }
    }

    objectToReturn.dataProviderName = dataProviderName;
    objectToReturn.requiredFilterMap = requiredFilterMap;

    return objectToReturn;
};

/**
 * this function determines if there are any required filters which
 * need to be added to context. Required filters are filters which should not be cleared from breadcrumb.
 * Following are examples of required filters: OwningSite.owning_site, ShapeSearchProvider Geolus Criteria.
 * When "clear" on breadcrumb is executed, the logic does not remove required filters.
 * @function setRequiredFiltersInSearchContext
 * @param {Object}searchContext - filterMap
 * @param {Object}requiredFilterMap - requiredFilterMap ( empty when passed )
 * @returns {Object} searchContext
 * */

export let setRequiredFiltersInSearchContext = function( searchContext, requiredFilterMap ) {
    if( searchContext.reqFilters !== undefined ) {
        // if context already has required filters
        if( !_.isEmpty( requiredFilterMap ) ) {
            // Add multisite/shape search related required context
            searchContext.reqFilters = requiredFilterMap;
            appCtxService.updateCtx( 'search', searchContext );
        } else {
            // if nothing ot be added, then unregister required filters context
            delete searchContext.reqFilters;
            appCtxService.updateCtx( 'reqFilters' );
        }
    } else if( !_.isEmpty( requiredFilterMap ) ) {
        // if required filter context does not exist but we have required filters, then create the context.
        searchContext.reqFilters = requiredFilterMap;
        appCtxService.updateCtx( 'search', searchContext );
    }

    return searchContext;
};

/**
 * Update filter map
 *
 * @function updateFilterMap
 * @param {Object}filterMap - filterMap
 *
 * @return {Object} Updated Filter Map
 */
export let updateFilterMap = function( filterMap ) {
    var cloneOfFilterMap = JSON.parse( JSON.stringify( filterMap ) );
    var prop = {};
    prop = cloneOfFilterMap ? cloneOfFilterMap : prop;

    if( exports.getDataProvider( filterMap ) === 'SS1ShapeSearchDataProvider' ) {
        prop = shapeSearchService.updateFilterMapForShapeSearch( prop );
    }
    exports.updateColorToggleCtx();
    return prop;
};

/**
 * @function updateColorToggleCtx - if AWC_ColorFiltering preference is true, then set the colorToggle context
 */

export let updateColorToggleCtx = function() {
    var colorContext = appCtxService.getCtx( 'preferences.AWC_ColorFiltering' );
    if( colorContext ) {
        var toggleColorContext = appCtxService.getCtx( 'filterColorToggleCtx' );
        if( toggleColorContext ) {
            appCtxService.updateCtx( 'filterColorToggleCtx', colorContext );
        } else {
            appCtxService.registerCtx( 'filterColorToggleCtx', colorContext );
        }
    }
};

export let getSearchCriteriaForFullTextSearch = function( searchContext, searchInfoCtx, searchSearchCtx ) {
    if( searchContext && searchContext.criteria ) {
        searchContext.criteria.limitedFilterCategoriesEnabled = searchCommonUtils.getLimitedFilterCategoriesEnabled();
        searchContext.criteria.listOfExpandedCategories = searchCommonUtils.setListOfExpandedCategories( 'searchFilterPanel' );
        searchContext.criteria.forceThreshold = 'false';
        if( searchContext.criteria.searchString ) {
            searchContext.criteria.searchString = searchCommonUtils.processDateSearchCriteria( searchContext.criteria.searchString );
        }
    }

    //Check that search is not from saved search
    if( searchInfoCtx && !searchInfoCtx.savedSearch ) {
        var forceThresholdMap = false;
        var isThreshold = searchInfoCtx.thresholdExceeded && searchInfoCtx.thresholdExceeded === 'true';
        //Check filter map if navigated away to figure out if they were in threshold when they left
        if( !searchContext.filterMap && searchSearchCtx || isThreshold && searchContext.activeFilters.length === 0 ) {
            forceThresholdMap = searchCommonUtils.checkFilterMapForThreshold( searchSearchCtx.originalInputCategories );
        }
        //If search was performed in global search or returning to results after already in threshold state
        if( searchInfoCtx.globalSearch && searchInfoCtx.globalSearch === true || forceThresholdMap ) {
            searchContext.criteria.forceThreshold = 'true';
        }
    }

    return searchContext.criteria;
};

/**
 * Get Search Criteria for saved search
 * @function getSearchCriteriaForSavedSearch
 * @param {Object}savedSearchContext - savedSearchContext
 * @return {Object} search criteria
 */

export let getSearchCriteriaForSavedSearch = function( searchContext, savedSearchContext, searchSearchCtx ) {
    if( searchContext && searchContext.criteria ) {
        if( savedSearchContext && savedSearchContext.savedSearchUid ) {
            if( searchSearchCtx && searchSearchCtx.savedSearchUid ) {
                searchContext.criteria.savedSearchUid = searchSearchCtx.savedSearchUid;
            } else {
                searchContext.criteria.savedSearchUid = savedSearchContext.savedSearchUid;
            }
            return searchContext.criteria;
        }
        return searchContext.criteria;
    }
    return null;
};

/**
 * get Data Provider name for the search( Full Text Search/ Shape Search/ Advanced Search )
 * @function getSearchFolderDataProvider
 * @param {Object}selectedFolders - selectedFolders
 *
 * @return {Object} data provider
 */
export let getSearchFolderDataProvider = function( selectedFolders ) {
    return searchFolderService.getSearchFolderDataProvider( selectedFolders );
};

/**
 * Get Search Folder Criteria
 * @function getSearchDefinitionCriteria
 *
 * @param {Object}selectedFolders - selectedFolder
 * @param {Number}startIndex - startIndex
 * @return {Object} search criteria
 */
export let getSearchDefinitionCriteria = function( selectedFolders, startIndex ) {
    return searchFolderService.getSearchDefinitionCriteria( selectedFolders, startIndex );
};
/**
 * Get Search Folder filter map
 * @function getSearchDefinitionFilterMap
 *
 * @param {Object}selectedFolders - selectedFolder
 * @return {Object} search criteria
 */
export let getSearchDefinitionFilterMap = function( selectedFolders ) {
    return searchFolderService.getSearchDefinitionFilterMap( selectedFolders );
};

/**
 * Sets the search folder sort criteria
 *
 * @function getSearchFolderSortCriteria
 * @param {Object}selectedFolders - selectedFolder
 * @param {Object} sortCriteria - the sort criteria
 * @return {Object} the sort criteria
 */
export let getSearchFolderSortCriteria = function( selectedFolders, sortCriteria ) {
    let useProperyNameOnly = false;
    let searchFolderProvider = searchFolderService.getSearchFolderDataProvider( selectedFolders );
    if( searchFolderProvider === 'Awp0SavedQuerySearchProvider' ) {
        useProperyNameOnly = true;
    }
    return exports.getSearchSortCriteria( sortCriteria, useProperyNameOnly );
};

/**
 * Get Search Criteria
 * @function getSearchCriteria
 *
 * @param {Object}filterMap - filterMap
 * @param {String}translatedSearchString - translatedSearchString
 * @return {Object} search criteria
 */
export let getSearchCriteria = function( filterMap, translatedSearchString ) {
    var prop = {};
    prop = filterMap ? filterMap : prop;
    var savedSearchContext;
    var searchContext = appCtxService.getCtx( 'search' );
    var dataProviderName = exports.getDataProvider( filterMap );
    if( dataProviderName === 'SS1ShapeSearchDataProvider' ) {
        return shapeSearchService.getSearchCriteriaForShapeSearch( prop, searchContext );
    } else if( dataProviderName === 'Awp0SavedQuerySearchProvider' ) {
        return appCtxService.getCtx( 'advancedSearch' ).criteria;
    }

    var searchInfoCtx = appCtxService.getCtx( 'searchInfo' );
    var searchSearchCtx = appCtxService.getCtx( 'searchSearch' );
    savedSearchContext = appCtxService.getCtx( 'savedSearch' );
    if( searchContext ) {
        // get criteria for full text search
        searchContext.criteria = exports.getSearchCriteriaForFullTextSearch( searchContext, searchInfoCtx, searchSearchCtx );
        // get additional saved search criteria
        searchContext.criteria = exports.getSearchCriteriaForSavedSearch( searchContext, savedSearchContext, searchSearchCtx );
        if( searchContext.criteria && searchContext.criteria.searchString ) {
            searchContext.criteria.searchFromLocation = 'global';
            if( translatedSearchString && translatedSearchString.length > 0 ) {
                searchContext.criteria.searchString = translatedSearchString;
                appCtxService.updatePartialCtx( 'search', searchContext );
            }
        }
        searchContext.criteria.dcpSortByDataProvider = 'true';
        return searchContext.criteria;
    }
    return null;
};

/**
 * showData
 *
 * @function showData
 * @param {String} searchCriteria the search criteria
 */
export let showData = function( searchCriteria ) {
    if( searchCriteria !== undefined && searchCriteria !== '' && searchCriteria.searchString !== undefined &&
        searchCriteria.searchString !== '' ) {
        eventBus.publish( 'search.doSearch' );
    }
};
/**
 * Sets the search sort criteria for table
 *
 * @function getSearchSortCriteria_table
 * @param {Object} clientScopeUI - clientScopeUI
 * @return {BOOLEAN} usePropertyNameOnly
 */
export let getSearchSortCriteria_table = function( clientScopeUI, usePropertyNameOnly ) {
    clientScopeUI.sortCriteria = exports.getSearchSortCriteria( clientScopeUI.sortCriteria, usePropertyNameOnly );
    return clientScopeUI.sortCriteria;
};

/**
 * Sets the search sort criteria
 *
 * @function getSearchSortCriteria
 * @param {Object} sortCriteria - the sort criteria
 * @return {BOOLEAN} usePropertyNameOnly
 */
export let getSearchSortCriteria = function( sortCriteria, usePropertyNameOnly ) {
    var searchRespInfoContext = appCtxService.getCtx( 'searchResponseInfo' );
    var awp0SearchResultsContext = appCtxService.getCtx( 'Awp0SearchResults' );

    if( !sortCriteria ) {
        // sort criteria is undefined, usually in the case of List or Image view
        // pull criteria from ctx if set from previous table sorting
        if( searchRespInfoContext &&
            searchRespInfoContext.currentSortCriteria ) {
            sortCriteria = searchRespInfoContext.currentSortCriteria;
        }
    } else if( sortCriteria.length === 0 ) {
        // sort criteria is empty, usually this is table view without any sorting applied
        // check if this is the first time or if we are returning to the search location
        // after leaving

        if( awp0SearchResultsContext &&
            awp0SearchResultsContext.sortCriteria &&
            awp0SearchResultsContext.sortCriteria.length !== 0 ) {
            if( searchRespInfoContext &&
                searchRespInfoContext.currentSortCriteria ) {
                // we are returning to the search location after leaving
                // but not with a new search
                sortCriteria = awp0SearchResultsContext.sortCriteria;
            }
        }
    } else {
        if( searchRespInfoContext &&
            !searchRespInfoContext.currentSortCriteria &&
            awp0SearchResultsContext &&
            !awp0SearchResultsContext.sortCriteria ) {
            // This is a new search
            sortCriteria = [];
            var sublocationContext = appCtxService.getCtx( 'sublocation' );
            sublocationContext.sortCriteria = [];
            appCtxService.updateCtx( 'sublocation', sublocationContext );
        }
    }

    // Determine the correct search name for this sort criteria
    // table sort action only gives us the property name search requires
    // the full ObjectType.PropertyName for sorting
    if( sortCriteria && !usePropertyNameOnly ) {
        var sortCriteriaAndSearchResponseInfoCtx = exports.setFieldNameForSortCriteria( sortCriteria, searchRespInfoContext );
        if( sortCriteriaAndSearchResponseInfoCtx ) {
            sortCriteria = sortCriteriaAndSearchResponseInfoCtx.sortCriteria;
        }
    }

    if( !sortCriteria ) {
        sortCriteria = appCtxService.ctx.sublocation.sortCriteria;
    }

    return sortCriteria;
};

export let setFieldNameForSortCriteria = function( sortCriteria, searchResponseInfoContext ) {
    var objToReturnToCaller = {};
    if( searchResponseInfoContext ) {
        searchResponseInfoContext.currentSortCriteria = sortCriteria;
        if( sortCriteria.length > 0 && searchResponseInfoContext.columnConfig ) {
            var index = _.findIndex( searchResponseInfoContext.columnConfig.columns, function( o ) {
                return o.propertyName === sortCriteria[ 0 ].fieldName;
            } );
            if( index > -1 && !searchCommonUtils.checkIfDCPProperty( searchResponseInfoContext.columnConfig.columns[ index ].propertyName ) ) {
                // retain state
                sortCriteria[ 0 ].fieldName = searchResponseInfoContext.columnConfig.columns[ index ].typeName + '.' +
                    searchResponseInfoContext.columnConfig.columns[ index ].propertyName;
            }
        }
        objToReturnToCaller.sortCriteria = sortCriteria;
        objToReturnToCaller.searchResponseInfoContext = searchResponseInfoContext;
        return objToReturnToCaller;
    }
    return null;
};

/**
 * getActiveFilterString - This method generates a user readable string from the currently active filter map.
 * Filters that are not to be displayed to the user can be removed here.
 *
 * @function getActiveFilterString

 *
 * @return {String} active filter String
 */
export let getActiveFilterString = function() {
    var searchContext = appCtxService.getCtx( 'search' );
    if( searchContext.activeFilterMap ) {
        var searchActiveFilterMap = {};
        _.assign( searchActiveFilterMap, searchContext.activeFilterMap );
        delete searchActiveFilterMap[ 'UpdatedResults.updated_results' ];
        if( searchActiveFilterMap[ 'Geolus Criteria' ] ) {
            delete searchActiveFilterMap[ 'Geolus Criteria' ];
        } else if( searchActiveFilterMap[ 'Geolus XML Criteria' ] ) {
            delete searchActiveFilterMap[ 'Geolus XML Criteria' ];
        }

        delete searchActiveFilterMap.ShapeSearchProvider;
        delete searchActiveFilterMap.SS1partShapeFilter;
        delete searchActiveFilterMap.SS1shapeBeginFilter;
        delete searchActiveFilterMap.SS1shapeEndFilter;
        return searchFilterSvc.getFilterStringFromActiveFilterMap( searchActiveFilterMap );
    }
    return '';
};

/**
 * getSaveSearchFilterMap
 *
 * @function getSaveSearchFilterMap

 *
 * @return {Object} saveSearchFilterMap
 */
export let getSaveSearchFilterMap = function() {
    return searchFilterSvc.convertFilterMapToSavedSearchFilterMap();
};

/**
 * getEmptyString
 *
 * @function getEmptyString

 *
 * @return {String} Empty string ""
 */
export let getEmptyString = function() {
    return '';
};

/**
 * Returns the internal property name of charted on category if search was executed from saved search Otherwise
 * returns empty string and defaults to existing logic for charting
 *
 * @function getInternalPropertyName

 *
 * @return {String} InternalPropertyName
 */
export let getInternalPropertyName = function() {
    var emptyCategory = '';
    var searchChartContext = appCtxService.getCtx( 'searchChart' );

    // check to see if the saved search or user has overridden the property to highlight
    if( searchChartContext ) {
        if( searchChartContext.categoryToChartOn ) {
            return searchChartContext.categoryToChartOn;
        } else if( searchChartContext.userOverrideOfCurrentHighlightedCategory ) {
            return searchChartContext.userOverrideOfCurrentHighlightedCategory;
        }
    }

    return emptyCategory;
};

export let loadData = function( columnConfigInput, saveColumnConfigData, searchInput ) {
    let soaPath = 'Internal-AWS2-2019-06-Finder';
    let soaName = 'performSearchViewModel4';
    return soaService
        .postUnchecked( soaPath, soaName, {
            columnConfigInput: columnConfigInput,
            saveColumnConfigData: saveColumnConfigData,
            searchInput: searchInput,
            inflateProperties: true,
            noServiceData: false
        } )
        .then(
            function( response ) {
                if( response.searchResultsJSON ) {
                    response.searchResults = JSON.parse( response.searchResultsJSON );
                    delete response.searchResultsJSON;
                }

                // Create view model objects
                response.searchResults = response.searchResults && response.searchResults.objects ? response.searchResults.objects
                    .map( function( vmo ) {
                        return viewModelObjectService.createViewModelObject( vmo.uid, 'EDIT', null, vmo );
                    } ) : [];
                // Collect all the prop Descriptors
                var propDescriptors = [];
                _.forEach( response.searchResults, function( vmo ) {
                    if ( vmo ) {
                        _.forOwn( vmo.propertyDescriptors, function( value ) {
                            propDescriptors.push( value );
                        } );
                    }
                } );

                // Weed out the duplicate ones from prop descriptors
                response.propDescriptors = _.uniqBy( propDescriptors, 'name' );
                return response;
            } );
};

/**
 * Determines if search panel is visible
 * @function isSearchPanelVisible
 *
 * @return {Boolean} true if search panel is visible
 */
export let isSearchPanelVisible = function() {
    return appCtxService.ctx.activeNavigationCommand &&
        appCtxService.ctx.activeNavigationCommand.commandId === 'Awp0Search';
};

/**
 * Open search panel as needed
 *
 * @function openSearchPanelAsNeeded
 * @param {$scope} $scope $scope
 */
export let openSearchPanelAsNeeded = function( $scope ) {
    if( window.matchMedia( '(min-width: 63.76em)' ).matches ) {
        if( exports.isSearchPanelVisible() ) {
            exports.openNarrowModeSearchPanel( $scope );
        }
    } else {
        var context = appCtxService.getCtx( 'searchSearch' );
        var sublocationName = appCtxService.ctx.sublocation ? appCtxService.ctx.sublocation.nameToken : null;
        // in search location, if no search has been done, the search panel should auto-open when window size enters near narrow mode.
        if( !context && !exports.isSearchPanelVisible() &&
            sublocationName === 'com.siemens.splm.client.search:SearchResultsSubLocation' ) {
            exports.openNarrowModeSearchPanel( $scope );
        }
    }
};

/**
 * Toggle narrow mode search panel
 * @param {*} $scope $scope
 */
export let openNarrowModeSearchPanel = function( $scope ) {
    commandService.executeCommand( 'Awp0Search', null, $scope );
};

/**
 * Returns the actual totalFound, as the raw count may included the inaccessible objects.
 * This function will be revisited for a generic case. For now we just take care of the 0 totalLoaded case.
 *
 * @function getActualTotalFound

 * @param {ViewModel} data data
 * @return {Integer} actual totalFound
 */
export let getActualTotalFound = function( data ) {
    if( data.totalLoaded === 0 ) {
        data.totalFound = 0;
    }
    return data.totalFound;
};
/**
 * Returns the actual searchFilterCategories, as the raw filter categories may included those from inaccessible objects.
 * This function will be revisited for a generic case. For now we just take care of the 0 totalLoaded case.
 *
 * @function getActualSearchFilterCategories

 * @param {ViewModel} data data
 * @return {ObjectArray} actual searchFilterCategories
 */
export let getActualSearchFilterCategories = function( data ) {
    var thresholdExceeded = appCtxService.getCtx( 'thresholdExceeded' );
    if( data.totalLoaded === 0 && thresholdExceeded === 'false' ) {
        delete data.searchFilterCategories;
    }
    return data.searchFilterCategories;
};

export let setVNCThreshold = function( preferenceNames, includePreferenceDescriptions, ctx ) {
    soaService.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'getPreferences', {
        preferenceNames: preferenceNames,
        includePreferenceDescriptions: includePreferenceDescriptions
    }, {} ).then( function( result ) {
        if( result && result.response && result.response[ 0 ] && result.response[ 0 ].values && result.response[ 0 ].values.values[ 0 ] ) {
            ctx.vncThreshold = result.response[ 0 ].values.values[ 0 ];
        }
    } );
};

/**
 * getSelectedUids
 *
 * @function getSelectedUids

 * @param {Object} ctx - The application context object
 * @return {array} objectUids - array of object UIDs
 */
export let getSelectedUids = function( ctx ) {
    return _.map( ctx.mselected, 'uid' );
};

/**
 * escapeSearchParams
 *
 * @function escapeSearchParams

 * @param {Object} data - The application data object
 * @param {Object} selectedObject - The selected object
 * @returns {String} encodedParamString - encoded parameter string
 */
export let escapeSearchParams = function( data, selectedObject ) {
    // Reset template ID
    data.templateId = '';
    var encodedParamString = '';
    if( selectedObject.type === 'Awp0FullTextSavedSearch' ) {
        // handle search parameters for global search
        var searchParams = globalSearchService.instance.getGlobalSearchParametersForURL( selectedObject );
        encodedParamString = navigationUtils.buildEncodedParamString( 'teamcenter.search.search', searchParams );
    } else if( selectedObject.type === 'SavedSearch' ) {
        // handle search parameters for advanced search
        var advancedSearchParams = advancedSearchLocationUtilsService.getAdvancedSearchParametersForURL();
        data.templateId = 'Awp0ClassicPinnedSavedSearchTemplate';
        encodedParamString = navigationUtils.buildEncodedParamString( 'teamcenter.search.advancedSearch', advancedSearchParams );
    }
    return encodedParamString;
};

/**
 * Get the default page size used for max to load/return.
 *
 * @param {Array|Object} defaultPageSizePreference - default page size from server preferences
 * @returns {Number} The amount of objects to return from a server SOA response.
 */
export let getDefaultPageSize = function( defaultPageSizePreference ) {
    var defaultPageSize = searchCommonUtils.getDefaultPageSize( defaultPageSizePreference );
    var context = appCtxService.getCtx( 'search' );
    if ( context ) {
        context.defaultPageSize = defaultPageSize;
        appCtxService.updatePartialCtx( 'search', context );
    }
    return defaultPageSize;
};

export let getThresholdState = function( data ) {
    var searchInfoCtx = appCtxService.getCtx( 'searchInfo' );
    if( searchInfoCtx && searchInfoCtx.globalSearch ) {
        delete searchInfoCtx.globalSearch;
        delete searchInfoCtx.savedSearch;
        appCtxService.updateCtx( 'searchInfo', searchInfoCtx );
    }
    if( data.additionalSearchInfoMap !== undefined ) {
        //Check search exceeded threshold
        if( data.additionalSearchInfoMap.searchExceededThreshold ) {
            var thresholdExceeded = data.additionalSearchInfoMap.searchExceededThreshold[ 0 ];
            if( thresholdExceeded ) {
                return thresholdExceeded;
            }
        }
    }

    return 'false';
};

/**
 * checkIfNotFirstSearch
 *
 * @function checkIfNotFirstSearch
 *
 * @return {Boolean} true if this is not the first search, else false
 */
export let checkIfNotFirstSearch = function() {
    var search = appCtxService.getCtx( 'search' );
    if( search.endIndex === search.defaultPageSize ) {
        return false;
    }
    return true;
};

/**
 * wrapper function to call searchFolderFilterService.setOwningSiteFilterInSearchFolderCtx
 * @param {Object}  data - performSearchViewModel SOA response
 * @returns {Object} searchFolderCtx.searchFilterMap - filter map to set for search folder context.
 */
export let setOwningSiteFilterInSearchFolderCtx = function( data ) {
    return searchFolderFilterService.setOwningSiteFilterInSearchFolderCtx( data );
};


/**
 * Returns a single clubbed message with newline as a delimiter provided an array of string messages
 *
 * @function getInfoMessages
 *
 * @return {String} Concatenated string representing multiple info messages separated by newline character
 */
export let getInfoMessages = function( data ) {
    let listOfMessages = '';
    if( data.additionalSearchInfoMap && data.additionalSearchInfoMap.additionalInfoMessages ) {
        listOfMessages = data.additionalSearchInfoMap.additionalInfoMessages;
        if( Array.isArray( listOfMessages ) ) {
            return listOfMessages.join( '\n' );
        }
    }
    return listOfMessages;
};

var loadConfiguration = function() {
    localeService.getTextPromise( 'SearchMessages', true ).then(
        function( localTextBundle2_ ) {
            if( appCtxService.ctx.preferences && appCtxService.ctx.preferences.AW_Search_Results_Export_Max_Rows && appCtxService.ctx.preferences.AW_Search_Results_Export_Max_Rows.length > 0 ) {
                appCtxService.ctx.exportSearchResultsMaxRowText = localTextBundle2_.allResults.format(
                    appCtxService.ctx.preferences.AW_Search_Results_Export_Max_Rows[ 0 ] );
            } else {
                appCtxService.ctx.exportSearchResultsMaxRowText = localTextBundle2_.allResults.format( 1000 );
                console.error( 'The preference \'AW_Search_Results_Export_Max_Rows\' is not set in this environment. The display value is the default value.' );
            }
        } );
};
/**
 * Return the cursor end index value
 * @param {Object} data Data
 * @returns {Integer} end index value
 */
 export let getCursorStartIndexValue = function( data ) {
    if( data.cursorObject ) {
        var endValue = data.cursorObject.endIndex;
        if( endValue ) {
            return ++endValue;
        }
    }
    return 0;
};
loadConfiguration();

/* eslint-disable-next-line valid-jsdoc*/

const exports = {
    setOriginalInputCategories,
    validateLOV,
    getSearchFolderDataProvider,
    getDataProvider,
    updateFilterMap,
    updateColorToggleCtx,
    getSearchCriteriaForSavedSearch,
    getSearchCriteriaForFullTextSearch,
    getSearchCriteria,
    getSearchDefinitionCriteria,
    getSearchDefinitionFilterMap,
    getSearchFolderSortCriteria,
    showData,
    getSearchSortCriteria_table,
    getSearchSortCriteria,
    getActiveFilterString,
    getSaveSearchFilterMap,
    getEmptyString,
    getInternalPropertyName,
    loadData,
    isSearchPanelVisible,
    openSearchPanelAsNeeded,
    openNarrowModeSearchPanel,
    getActualTotalFound,
    getActualSearchFilterCategories,
    setVNCThreshold,
    getSelectedUids,
    escapeSearchParams,
    getDefaultPageSize,
    getThresholdState,
    getHighlightKeywords,
    getSearchSnippets,
    setRequiredFiltersMap,
    setRequiredFiltersInSearchContext,
    processRequiredFilters,
    setFieldNameForSortCriteria,
    checkIfNotFirstSearch,
    setOwningSiteFilterInSearchFolderCtx,
    getInfoMessages,
    getCursorStartIndexValue
};

export default exports;

/**
 *
 * @memberof NgServices
 * @member awSearchService
 */
app.factory( 'awSearchService', () => exports );

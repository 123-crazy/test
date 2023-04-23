// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/navigateSearchService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import soaService from 'soa/kernel/soaService';
import viewModelObjectService from 'js/viewModelObjectService';
import parsingUtils from 'js/parsingUtils';
import clientDataModel from 'soa/kernel/clientDataModel';
import filterPanelService from 'js/filterPanelService';
import filterPanelUtils from 'js/filterPanelUtils';
import aceFilterService from 'js/aceFilterService';
import awSearchFilterService from 'js/awSearchFilterService';
import evaluateExpressionInGivenContext from 'js/evaluateExpressionInGivenContext';
import toggleIndexConfigurationService from 'js/toggleIndexConfigurationService';
import commandPanelService from 'js/commandPanel.service';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import messagingService from 'js/messagingService';

var exports = {};

var _productContextChanged = null;

var setSearchScopeUid = function( data ) {
    data.searchScopeUid = data.searchScope.dbValue ? appCtxSvc.ctx[ data.navigateContext.dbValue ].selectedModelObjects[ 0 ].uid : '';
};

var hasMoreResults = function( data ) {
    return data.totalFound === 40 || data.endReached === false;
};

var updateResultLabelForSingleSelect = function( data ) {
    var resultSelected = data.dataProviders.icsPerformSearch.getSelectedIndexes()[ 0 ] + 1;
    var many = data.i18n.many;
    var resultCountLabel = data.i18n.countLabel;
    var vmc = data.dataProviders.icsPerformSearch.viewModelCollection;

    resultCountLabel = resultCountLabel.replace( '{0}', resultSelected );
    resultCountLabel = hasMoreResults( data ) ? resultCountLabel.replace( '{1}', many ) :
        resultCountLabel.replace( '{1}', vmc.totalFound );

    data.resultLabelSingleSelect.propertyDisplayName = resultCountLabel;
    data.resultLabelSingleSelect.uiValue = data.resultLabelSingleSelect.propertyDisplayName;
};

var updateResultLabelForMultiSelect = function( data ) {
    var resultCountLabel = data.i18n.selectionCountLabel;
    var many = data.i18n.many;
    var numberOfSelectedObjects = data.dataProviders.icsPerformSearch.selectedObjects.length;
    var vmc = data.dataProviders.icsPerformSearch.viewModelCollection;

    resultCountLabel = resultCountLabel.replace( '{0}', numberOfSelectedObjects );
    resultCountLabel = hasMoreResults( data ) ? resultCountLabel.replace( '{1}', many ) :
        resultCountLabel.replace( '{1}', vmc.totalFound );

    data.resultLabelMultiSelect.propertyDisplayName = resultCountLabel;
    data.resultLabelMultiSelect.uiValue = data.resultLabelMultiSelect.propertyDisplayName;
};

var getKeywordLabel = function( data ) {
    var keywordsString = '';
    if( data.keyword ) {
        keywordsString = data.i18n.keywordValue;
        var many = data.i18n.many;
        var vmc = data.dataProviders.icsPerformSearch.viewModelCollection;
        keywordsString = keywordsString.replace( '{0}', data.keyword );
        keywordsString = hasMoreResults( data ) ? keywordsString.replace( '{1}', many ) :
            keywordsString.replace( '{1}', vmc.totalFound );
    }
    return keywordsString;
};

var clearSelectedFilters = function() {
    // Initialize ctx.searchIncontextInfo, needed to render applied filters
    appCtxSvc.registerCtx( 'searchIncontextInfo', {} );
};

var resetFilterDataForPerformSearch = function( data ) {
    data.showSearchFilter = true;
    data.selectedSearchFilters = [];
    data.searchFilterMap = {};
    filterPanelUtils.setHasTypeFilter( false );
    filterPanelUtils.setPresetFilters( true );
    clearSelectedFilters();
};

export let initializeFilterPanel = function( data ) {
    exports.updateFiltersKeywordLabel( data );
};

/**
 * Function to subscribe to product context change event on reset command execution
 */
export let resetContent = function() {
    if( !_productContextChanged ) {
        _productContextChanged = eventBus.subscribe( 'productContextChangedEvent', function() {
            if( _productContextChanged ) {
                eventBus.unsubscribe( _productContextChanged );
                _productContextChanged = null;
                eventBus.publish( 'navigate.resetStructure' );
            }
        } );
    }
};

export let redirectCommandEvent = function( eventName, eventData ) {
    eventBus.publish( eventName, eventData );
};

export let initializeResultsPanel = function() {
    clearSelectedFilters();
};

export let updateSearchKeywordLabel = function( data ) {
    data.searchKeywordLabel.uiValue = getKeywordLabel( data );
};

export let updateResultsTabLabelsInfo = function( data ) {
    data.searchKeywordLabel.propertyDisplayName = data.i18n.keywords;
    data.scopeLabel.propertyDisplayName = data.i18n.scopeLabel;
};

export let updateFiltersKeywordLabel = function( data ) {
    data.filterKeywordLabel.uiValue = data.searchKeywordLabel.uiValue;
};

export let preSearchProcessing = function( data ) {
    resetFilterDataForPerformSearch( data );
    updateResultsTabLabelsInfo( data );
    setSearchScopeUid( data );
};

export let getLiveSearchResult = function( data ) {
    appCtxSvc.ctx[ data.navigateContext.dbValue ].showLiveSearchResultCommand = false;
    eventBus.publish( 'navigate.getLiveSearchResult' );
};

/**
 * Open the Navigation Panel.
 */
export let openNavigationPanel = function( commandId, location, commandLocation ) {
    commandPanelService.activateCommandPanel( commandId, location, commandLocation );
};

export let updateSearchInputAndDoSearch = function( data ) {
    data.keyword = data.eventData && data.eventData.keyword ? data.eventData.keyword : data.keyword;
    data.showKeywordLabel = data.eventData && typeof data.eventData.showKeywordLabel !== 'undefined' ? data.eventData.showKeywordLabel :
        data.showKeywordLabel;
    data.populateDataProvider = data.eventData && typeof data.eventData.populateDataProvider !== 'undefined' ? data.eventData.populateDataProvider :
        data.populateDataProvider;
    data.searchString = data.eventData && data.eventData.searchString ? data.eventData.searchString :
        data.searchString;
    data.savedQueryUID = data.eventData && data.eventData.savedQueryUID ? data.eventData.savedQueryUID :
        data.savedQueryUID;
    data.useAlternateConfig = data.eventData && data.eventData.useAlternateConfig ? data.eventData.useAlternateConfig :
        'true';
    if( data.eventData && data.eventData.showLiveSearchResultCommand ) {
        appCtxSvc.ctx[ data.navigateContext.dbValue ].showLiveSearchResultCommand = true;
    } else {
        appCtxSvc.ctx[ data.navigateContext.dbValue ].showLiveSearchResultCommand = false;
    }
    data.tabsModel.dbValues[ 2 ].visibleWhen = data.eventData && data.eventData.hideFilterTab ? 'false' : data.hideFilterTab;

    if( data.populateDataProvider ) {
        eventBus.publish( 'navigate.icsPerformSearchDp' );
        if( data.selectedTab.panelId !== 'InContextSearchResultsTab' ) {
            var context = {
                tabKey: 'Results'
            };
            eventBus.publish( 'awTab.setSelected', context );
        }
    } else {
        eventBus.publish( 'navigate.getSearchResultsAction' );
    }
};

export let updateScopeLabelAndSelectFirstResultOnNewSearch = function( data ) {
    var scopedSearchElementUid = data.searchScopeUid ? data.searchScopeUid :
        appCtxSvc.ctx[ data.navigateContext.dbValue ].currentState.t_uid;
    var scopedSearchObj = clientDataModel.getObject( scopedSearchElementUid );
    data.scopeLabel.uiValue = scopedSearchObj.props.object_string.dbValues[ 0 ];
    if( data.dataProviders.icsPerformSearch.viewModelCollection.totalObjectsLoaded > 0 ) {
        data.dataProviders.icsPerformSearch.changeObjectsSelection( 0, 0, true );
    }
};

export let getCategories = function( response ) {
    var groupByProperty = response.objectsGroupedByProperty.internalPropertyName;
    filterPanelUtils.setIncontext( true );
    var processedCategories = filterPanelService.getCategories2( response.searchFilterCategories,
        response.searchFilterMap6, groupByProperty, false, true, true );

    if( response.additionalSearchInfoMap ) {
        var categoriesWithMoreFacetValues = response.additionalSearchInfoMap.categoryHasMoreFacetValuesList;

        _.forEach( processedCategories, function( category, index ) {
            processedCategories[ index ].hasMoreFacetValues = false;
            if( categoriesWithMoreFacetValues ) {
                _.forEach( categoriesWithMoreFacetValues, function( entry ) {
                    if( category.internalName === entry ) {
                        processedCategories[ index ].hasMoreFacetValues = true;
                    }
                } );
            }
            processedCategories[ index ].startIndexForFacetSearch = category.filterValues.length;
        } );
    }
    aceFilterService.suppressDateRangeFilterForDateFilters( processedCategories );
    exports.setDataProviderContext();
    return processedCategories;
};

export let handleSelectionModelChange = function( data ) {
    data.dataProviders.icsPerformSearch.selectedObjects.length > 1 || data.dataProviders.icsPerformSearch.selectionModel.multiSelectEnabled ? updateResultLabelForMultiSelect( data ) :
        updateResultLabelForSingleSelect( data );
};

export let parseExpression = function( data, ctx, conditions, expression, type ) {
    return evaluateExpressionInGivenContext.parseExpression( data, ctx, conditions, expression, type );
};

export let getIndexOffProductListInLocalStorage = function() {
    return toggleIndexConfigurationService.getIndexOffProductListInLocalStorage().join( '|' );
};

export let getProductContextUids = function( data ) {
    var elementToPCIMap = appCtxSvc.ctx[ data.navigateContext.dbValue ].elementToPCIMap;
    var pCtx = appCtxSvc.ctx[ data.navigateContext.dbValue ].productContextInfo;
    return elementToPCIMap ? Object.values( elementToPCIMap ).join( '|' ) : pCtx.uid;
};

export let updateSearchScopeLabel = function( data ) {
    data.searchScope.propertyDisplayName = data.i18n.searchScopeText.replace( '{0}',
        appCtxSvc.ctx[ data.navigateContext.dbValue ].selectedModelObjects[ 0 ].props.object_string.dbValues[ 0 ] );
    if( appCtxSvc.ctx[ data.navigateContext.dbValue ].structureSearchConfig && appCtxSvc.ctx[ data.navigateContext.dbValue ].structureSearchConfig.selectSearchScopeCheckbox ) {
        data.searchScope.dbValue = appCtxSvc.ctx[ data.navigateContext.dbValue ].structureSearchConfig.selectSearchScopeCheckbox;
    }
};

/**
 * Move one down from current selected search result
 *
 * @param {Object} icsPerformSearchDP - icsPerformSearch dataprovider
 * @param {Object} moveTo - Direction to move to
 */
export let moveUpDown = function( data, moveTo ) {
    var icsPerformSearchDP = data.dataProviders.icsPerformSearch;
    var selectedCount = icsPerformSearchDP.getSelectedIndexes()[ 0 ];
    //De-select current selection
    icsPerformSearchDP.changeObjectsSelection( selectedCount, selectedCount, false );
    //Select required selection
    if( moveTo === 'Down' ) {
        icsPerformSearchDP.changeObjectsSelection( selectedCount + 1, selectedCount + 1, true );
    }
    if( moveTo === 'Up' ) {
        icsPerformSearchDP.changeObjectsSelection( selectedCount - 1, selectedCount - 1, true );
    }
};

/**
 * SelectAll/ClearAll currently loaded objects
 *
 * @param {Object} icsPerformSearchDP - icsPerformSearch dataprovider
 */
export let toggleSelectAllResults = function( data ) {
    var icsPerformSearchDP = data.dataProviders.icsPerformSearch;
    var areAllResultsSelected = icsPerformSearchDP.getSelectedObjects().length === icsPerformSearchDP.viewModelCollection.totalObjectsLoaded;
    areAllResultsSelected ? icsPerformSearchDP.selectNone() : icsPerformSearchDP.selectAll();
};

export let getSearchResultsJS = function( data ) {
    var aceSearchPolicyOverride =  appCtxSvc.ctx.aceSearchPolicyOverride;

    var columnConfigInput = {
        clientName: 'AWClient',
        clientScopeURI: '',
        columnsToExclude: [],
        hostingClientName: '',
        operationType: 'intersection'
    };

    var saveColumnConfigData = {
        columnConfigId: '',
        clientScopeURI: '',
        columns: [],
        scope: '',
        scopeName: ''
    };

    var searchContext = exports.parseExpression(
        '',
        appCtxSvc.ctx[ data.navigateContext.dbValue ],
        '',
        'ctx && ctx.productContextInfo && !ctx.isOpenedUnderAContext && ctx.productContextInfo.uid || ctx.workingContextObj.uid'
    );

    var getIncludeConnections = exports.parseExpression(
        '',
        appCtxSvc.ctx[ data.navigateContext.dbValue ],
        '',
        'ctx.persistentRequestPref && ctx.persistentRequestPref.includeConnections && \'True\' || \'\''
    );

    var productContextsToBeExcludedFromSearch = exports.getIndexOffProductListInLocalStorage();
    var productContextUids = exports.getProductContextUids( data );

    var deferred = AwPromiseService.instance.defer();

    var searchInput = {
        attributesToInflate: [],
        internalPropertyName: '',
        maxToLoad: 40,
        maxToReturn: 40,
        providerName: 'Awb0FullTextSearchProvider',
        searchCriteria: {
            searchContext: searchContext,
            searchString: data.searchString,
            savedQueryUID: data.savedQueryUID,
            includeConnections: getIncludeConnections,
            useAlternateConfig: data.useAlternateConfig,
            productContextsToBeExcludedFromSearch: productContextsToBeExcludedFromSearch,
            searchScope: data.searchScopeUid,
            productContextUids: productContextUids,
            selectedLine: appCtxSvc.ctx.selected.uid
        },
        searchFilterFieldSortType: 'Priority',
        searchFilterMap6: data.searchFilterMap,
        searchSortCriteria: [],
        cursor: {
            startIndex: data.dataProviders.icsPerformSearch.startIndex
        }
    };

    for( var searchParam in data.searchInputMap ) {
        searchInput.searchCriteria[ searchParam ] = data.searchInputMap[ searchParam ];
    }
    if( appCtxSvc.ctx.xrtPageContext && appCtxSvc.ctx.xrtPageContext.secondaryXrtPageID === 'Awb0ViewerFeature' ) {
        soaService.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', {
            columnConfigInput: columnConfigInput,
            saveColumnConfigData: saveColumnConfigData,
            searchInput: searchInput
        } ).then( function( response ) {
            data.totalLoaded = response.totalLoaded,
                data.totalFound = response.totalFound,
                data.searchResults = processSearchResultsJSON( response.searchResultsJSON ),
                data.sourceSearchFilterMap = response.searchFilterMap6,
                data.searchFilterCategories = response.searchFilterCategories,
                data.categories = exports.getCategories( response ),
                data.endIndex = response.cursor.endIndex,
                data.endReached = response.cursor.endReached,
                data.searchScope.dbValue = false,
                data.objectsGroupedByProperty = response.objectsGroupedByProperty,

                deferred.resolve( data );
        } );
    } else {
        soaService.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', {
            columnConfigInput: columnConfigInput,
            saveColumnConfigData: saveColumnConfigData,
            searchInput: searchInput
        }, aceSearchPolicyOverride ).then( function( response ) {
            data.totalLoaded = response.totalLoaded,
                data.totalFound = response.totalFound,
                data.searchResults = processSearchResultsJSON( response.searchResultsJSON ),
                data.sourceSearchFilterMap = response.searchFilterMap6,
                data.searchFilterCategories = response.searchFilterCategories,
                data.categories = exports.getCategories( response ),
                data.endIndex = response.cursor.endIndex,
                data.endReached = response.cursor.endReached,
                data.searchScope.dbValue =  appCtxSvc.ctx[ data.navigateContext.dbValue ].structureSearchConfig && appCtxSvc.ctx[ data.navigateContext.dbValue ].structureSearchConfig
                    .selectSearchScopeCheckbox  ? appCtxSvc.ctx[ data.navigateContext.dbValue ].structureSearchConfig.selectSearchScopeCheckbox : false,
                data.objectsGroupedByProperty = response.objectsGroupedByProperty,

                deferred.resolve( data );
                if( response.partialErrors || response.ServiceData && response.ServiceData.partialErrors ) {
                    processPartialErrors( response );
                    //Set the endReached to true on partial errors. This is due to performSearchViewModel4
                    //not setting to true in case of exception. This flag is used to render the result label.
                    //If endReached is not true then label will be shown as Many results.
                    data.endReached = true;
                }
        } );
    }
    return deferred.promise;
};

var getMessageString = function( messages, msgObj ) {
    _.forEach( messages, function( object ) {
        if( msgObj.msg.length > 0 ) {
            msgObj.msg += '<br>';
        }
        msgObj.msg += object.message;
        msgObj.level = _.max( [ msgObj.level, object.level ] );
    } );
};

let processPartialErrors = function( response ) {
    var msgObj = {
        msg: '',
        level: 0
    };
    if( response.ServiceData.partialErrors ) {
        _.forEach( response.ServiceData.partialErrors, function( partialError ) {
            getMessageString( partialError.errorValues, msgObj );
        } );
    } else if( response.ServiceData.PartialErrors ) {
        _.forEach( response.ServiceData.PartialErrors, function( partialError ) {
            getMessageString( partialError.errorValues, msgObj );
        } );
    }

    if( msgObj.level <= 1 ) {
        messagingService.showInfo( msgObj.msg );
    } else {
        messagingService.showError( msgObj.msg );
    }
};

/**
 * setDataProviderContext - sets the Data provider in SearchDataProvider context
 */
export let setDataProviderContext = function() {
    var ctx = appCtxSvc.getCtx( 'SearchDataProvider' );
    if( ctx ) {
        ctx.providerName = 'Awb0FullTextSearchProvider';
        appCtxSvc.updatePartialCtx( 'SearchDataProvider', ctx );
    } else {
        appCtxSvc.registerCtx( 'SearchDataProvider', {
            providerName: 'Awb0FullTextSearchProvider'
        } );
    }
};

/**
 * persistCategoryFilterToUpdateState
 * @param {Object} context event data object
 * @param {filterMap} filterMap original filter map
 */
export let persistCategoryFilterToUpdateState = function( context, filterMap ) {
    // Persist the values on the search context. This will be used later to merge the filter values
    // This function is called when More... is clicked and before the SOA call is made.
    // Update the category(activeFilter) and the current filter values for that category (searchFilterMap
    // on the search context. These values are used while processing the SOA response to append the response
    // filter values with the exising filter values.
    var contextSearchCtx = appCtxSvc.getCtx( 'search' );
    contextSearchCtx.activeFilter = context.category;
    contextSearchCtx.searchFilterMap = {};

    for ( var filter in filterMap ) {
        if ( filter === context.category.internalName ) {
            contextSearchCtx.searchFilterMap[filter] = filterMap[filter];
            break;
        }
    }
};

/**
 * getSearchCriteriaForFacetSearch
 * @param {Object} category category for facet search
 * @returns {Object} data provider for facet search
 */
export let getSearchCriteriaForFacetSearch = function( category ) {
    var searchCriteria = {};

    searchCriteria.categoryForFacetSearch = category.internalName;
    searchCriteria.facetSearchString = category.filterBy;

    searchCriteria.forceThreshold = false;
    searchCriteria.searchString = '$DefaultSearchProvider_STD$*';
    searchCriteria.productContextUids = appCtxSvc.ctx.aceActiveContext.context.productContextInfo.uid;

    return searchCriteria;
};

/**
 * getStartIndexForFacetSearch
 * @param {Object} category category for facet search
 * @returns {Object} start index for the facet search
 */
export let getStartIndexForFacetSearch = function( category ) {
    return awSearchFilterService.getStartIndexForFilterValueSearch( category );
};

/**
 * updateFilterMapForFacet
 * @param {Object} data filter map from facet search response
 * @returns {Object} updated filters in the category(facet)
 */
export let updateFilterMapForFacet = function( data ) {
    // This function is call to process the performFacetSearch SOA response.
    // This is called when More... is clicked and search within the facet.
    // The current category(activeFilter) need to be set on search context so that
    // awSearchFilterService.setMapForFilterValueSearch can compute the filtermap values correctly
    var contextSearchCtx = appCtxSvc.getCtx( 'search' );
    contextSearchCtx.activeFilter = contextSearchCtx.valueCategory;

    // Get the updated merged filter map values
    var newSearchFilterMap = contextSearchCtx.facetSearchFilterMap;
    var updatedFilterMap = awSearchFilterService.setMapForFilterValueSearch( newSearchFilterMap, contextSearchCtx );

    // Update the data with updated merged filter values
    var updatedCatName;
    var updateFilterValues;
    for( var updateFilter in updatedFilterMap ) {
        updatedCatName = updateFilter;
        updateFilterValues = updatedFilterMap[ updatedCatName ];
    }

    var rawCategories = data.searchFilterCategories;
    var rawCategoryValues = data.sourceSearchFilterMap;

    for ( var rawCategoryValue in rawCategoryValues ) {
        if ( rawCategoryValue === updatedCatName ) {
            rawCategoryValues[rawCategoryValue] = updateFilterValues;
            break;
        }
    }

    var processedCategories = filterPanelService.getCategories2( rawCategories,
        rawCategoryValues, data.objectsGroupedByProperty.internalPropertyName, false, true, true );

    _.forEach( processedCategories, function( category, index ) {
        processedCategories[ index ].startIndexForFacetSearch = category.filterValues.length;
    } );
    aceFilterService.suppressDateRangeFilterForDateFilters( processedCategories );

    data.categories = processedCategories;

    return updatedFilterMap;
};

let processSearchResultsJSON = function( searchResultsJSON ) {
    var searchResults;
    if( searchResultsJSON ) {
        searchResults = parsingUtils.parseJsonString( searchResultsJSON );
        if( searchResults && searchResults.objects.length > 0 ) {
            // "createViewModelObject" populates model object properties on VMO object.
            searchResults.objects = searchResults.objects.map( function( vmo ) {
                return viewModelObjectService.createViewModelObject( vmo.uid, 'EDIT', null, vmo );
            } );
        }
    }
    return searchResults;
};

/**
 * navigateSearchService service utility
 */

export default exports = {
    initializeFilterPanel,
    resetContent,
    redirectCommandEvent,
    initializeResultsPanel,
    updateSearchKeywordLabel,
    updateFiltersKeywordLabel,
    preSearchProcessing,
    getLiveSearchResult,
    openNavigationPanel,
    updateSearchInputAndDoSearch,
    updateScopeLabelAndSelectFirstResultOnNewSearch,
    getCategories,
    handleSelectionModelChange,
    parseExpression,
    getIndexOffProductListInLocalStorage,
    getProductContextUids,
    updateSearchScopeLabel,
    moveUpDown,
    toggleSelectAllResults,
    getSearchResultsJS,
    setDataProviderContext,
    persistCategoryFilterToUpdateState,
    getSearchCriteriaForFacetSearch,
    getStartIndexForFacetSearch,
    updateFilterMapForFacet
};
app.factory( 'navigateSearchService', () => exports );

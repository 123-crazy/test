//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/structureFilterService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import soaSvc from 'soa/kernel/soaService';
import filterPanelService from 'js/filterPanelService';
import aceFilterService from 'js/aceFilterService';
import searchColorDecoratorService from 'js/searchColorDecoratorService';
import contextStateMgmtService from 'js/contextStateMgmtService';
import filterPanelUtils from 'js/filterPanelUtils';
import proximityFilterService from 'js/proximityFilterService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import awSearchFilterService from 'js/awSearchFilterService';

var exports = {};

var pciToFilterDataMap = [];
var _TRUE = [ 'true' ];
var ACE_CONTEXT_KEY = 'aceActiveContext';

var structureFilterEventSubscritpions = [];
var jitterFreeContextState =  'aceActiveContext.context.retainTreeExpansionStateInJitterFreeWay';
var jitterFreePropLoad =  'aceActiveContext.context.transientRequestPref.jitterFreePropLoad';

var gatherAllFilterValuesAcrossCategories = function( categories ) {
    var filterValues = [];
    _.forEach( categories, function( category ) {
        _.forEach( category.filterValues, function( filterValue ) {
            filterValues.push( filterValue );
        } );
    } );
    return filterValues;
};

var isFilterSelected = function( filterValue ) {
     //LCS-454632 Get the filter separator value from the preference AW_FacetValue_Separator
     var filterSeparator = appCtxSvc.ctx.preferences.AW_FacetValue_Separator ? appCtxSvc.ctx.preferences.AW_FacetValue_Separator[0] : '^';
    if( appCtxSvc.ctx.state.params.filter ) {
        var isSelected = false;
        var appliedFilters = appCtxSvc.ctx.state.params.filter.split( '~' );
        for( var filterId = 0; filterId < appliedFilters.length; filterId++ ) {
            var categories = appliedFilters[ filterId ].split( '==' );
            if( categories.length === 2 && categories[ 0 ] === 'StringFilter' + '^^' + filterValue.categoryName ) {
                isSelected = categories[ 1 ].split( filterSeparator ).includes( filterValue.internalName );
                break;
            }
        }
        return isSelected;
    }
};

var isFilterValueSameAsInputFilterString = function( filterValue, inputFilterString ) {
    return filterValue.categoryName + '^^' + filterValue.internalName === inputFilterString;
};

var removeFromFilterValuesIfItDoesNotContain = function( filterValues, filterValue, whatToCheck ) {
    var entry = filterValues.filter( function( x ) {
        return x.categoryName === whatToCheck;
    } );
    if( !entry || !entry[ 0 ] ) {
        filterValues.splice( filterValues.indexOf( filterValue ), 1 );
    }
};

var removeOrphanDateEntries = function( filterValues ) {
    var isDateFilter = filterValues.filter( function( filter ) {
        return filter.type === filterPanelUtils.DATE_FILTER ||
            filter.type === filterPanelUtils.DATE_DRILLDOWN_FILTER;
    } );
    if( isDateFilter ) {
        for( var i = 0; i < isDateFilter.length; i++ ) {
            var tmpCategoryName = isDateFilter[ i ].categoryName.substring( 0, isDateFilter[ i ].categoryName
                .indexOf( '_0Z0_' ) );
            if( isDateFilter[ i ].categoryName.lastIndexOf( '_0Z0_year_month' ) > 0 ) {
                removeFromFilterValuesIfItDoesNotContain( filterValues, isDateFilter[ i ], tmpCategoryName +
                    '_0Z0_year' );
            } else if( isDateFilter[ i ].categoryName.lastIndexOf( '_0Z0_week' ) > 0 ) {
                removeFromFilterValuesIfItDoesNotContain( filterValues, isDateFilter[ i ], tmpCategoryName +
                    '_0Z0_year_month' );
            } else if( isDateFilter[ i ].categoryName.lastIndexOf( '_0Z0_year_month_day' ) > 0 ) {
                removeFromFilterValuesIfItDoesNotContain( filterValues, isDateFilter[ i ], tmpCategoryName +
                    '_0Z0_week' );
            }
        }
    }
};

var buildEffectiveFilterString = function( filterValues ) {
    removeOrphanDateEntries( filterValues );
    return getFilterString( filterValues );
};

var getFilterString = function( filterValues ) {
    var filterStringToReturn = '';
    var previousFilterValue;
    //LCS-454632 Get the filter separator value from the preference AW_FacetValue_Separator
    var filterSeparator = appCtxSvc.ctx.preferences.AW_FacetValue_Separator ? appCtxSvc.ctx.preferences.AW_FacetValue_Separator[0] : '^';

    _.forEach( filterValues, function( filterValue ) {
        if( previousFilterValue && previousFilterValue.categoryName === filterValue.categoryName ) {
            filterStringToReturn = filterStringToReturn + filterSeparator + filterValue.internalName;
        } else {
            if( filterStringToReturn === '' ) {
                filterStringToReturn = filterStringToReturn + 'StringFilter' + '^^' + filterValue.categoryName +
                    '==' + filterValue.internalName;
            } else {
                filterStringToReturn = insertFilterString( filterStringToReturn, filterValue );
            }
        }
        previousFilterValue = filterValue;
    } );
    return filterStringToReturn;
};

var insertFilterString = function( filterStringToReturn, filterValue ) {
   //LCS-454632 Get the filter separator value from the preference AW_FacetValue_Separator
   var filterSeparator = appCtxSvc.ctx.preferences.AW_FacetValue_Separator ? appCtxSvc.ctx.preferences.AW_FacetValue_Separator[0] : '^';
    var appliedFilters = filterStringToReturn.split( '~' );
    var updatedFilterStringToReturn = '';
    for( var filterId = 0; filterId < appliedFilters.length; filterId++ ) {
        var foundCategory = false;
        var categories = appliedFilters[ filterId ].split( '==' );
        if( categories.length === 2 && categories[ 0 ] === 'StringFilter' + '^^' + filterValue.categoryName ) {
            foundCategory = true;
            appliedFilters[ filterId ] = appliedFilters[ filterId ] + filterSeparator + filterValue.internalName;
            break;
        }
    }
    if ( foundCategory === true ) {
        for( var indx = 0; indx < appliedFilters.length; indx++ ) {
            if ( _.isEmpty( updatedFilterStringToReturn ) ) {
                updatedFilterStringToReturn += appliedFilters[ indx ];
            } else {
                updatedFilterStringToReturn = updatedFilterStringToReturn + '~' + appliedFilters[ indx ];
            }
        }
    } else {
        filterStringToReturn = filterStringToReturn + '~StringFilter' + '^^' + filterValue.categoryName + '==' + filterValue.internalName;
        updatedFilterStringToReturn = filterStringToReturn;
    }
    return updatedFilterStringToReturn;
};

var lookupCategoriesInfoInCache = function( productContextInfoUID ) {
    var filterData;
    var categories;
    if( pciToFilterDataMap && pciToFilterDataMap.length > 0 ) {
        filterData = pciToFilterDataMap.filter( function( x ) {
            return x.pciUid === productContextInfoUID;
        } );
    }
    if( filterData && filterData[ 0 ] ) {
        categories = filterData[ 0 ].categories;
    }
    return categories;
};

var getEffectiveFilterString = function( category, filter ) {
    var occMgmtCtx = appCtxSvc.getCtx( 'aceActiveContext.context' );
    var productContextInfoUID = occMgmtCtx.productContextInfo.uid;
    var categories = lookupCategoriesInfoInCache( productContextInfoUID );
    var filterValues = gatherAllFilterValuesAcrossCategories( categories );
    var effectiveFilterValuesToConsider = [];
    var effectiveFilterString = '';

    var filterString;
    if( !filter ) {
         //The value is entered in the text field of the category with no initial filter value list.
         filterString = category.internalName + '^^' + category.filterValues[ 0 ].prop.dbValue;
    } else {
         //The filter value is selected/deselection from the filter value list in the category.
         filterString = filter.categoryName + '^^' + filter.internalName;
    }

    _.forEach( filterValues, function( filterValue ) {
        if( isFilterSelected( filterValue ) && !isFilterValueSameAsInputFilterString( filterValue,
            filterString ) ||
            !isFilterSelected( filterValue ) && isFilterValueSameAsInputFilterString( filterValue,
                filterString ) ) {
            effectiveFilterValuesToConsider.push( filterValue );
        }
    } );
    effectiveFilterString = buildEffectiveFilterString( effectiveFilterValuesToConsider );
    if( !filter ) {
        //The value is entered in the text field of the category.
        if( effectiveFilterString === '' ) {
            effectiveFilterString = effectiveFilterString + 'StringFilter' + '^^' + category.internalName +
                '==' + category.filterValues[ 0 ].prop.dbValue;
        } else {
            effectiveFilterString = effectiveFilterString + '~StringFilter' + '^^' +
                category.internalName + '==' + category.filterValues[ 0 ].prop.dbValue;
        }
    }

    return effectiveFilterString;
};

var updateCategoriesInfoCacheForCurrentPCI = function( categories, rawCategories, rawCategoryValues ) {
    var occMgmtCtx = appCtxSvc.getCtx( 'aceActiveContext.context' );
    var pciUID = occMgmtCtx.productContextInfo.uid;
    var pciVsFilterInfoEntry = {};
    if( pciToFilterDataMap && pciToFilterDataMap.length > 0 ) {
        var filterData = pciToFilterDataMap.filter( function( x ) {
            return x.pciUid === pciUID;
        } );
        if( filterData && filterData[ 0 ] ) {
            filterData[ 0 ].categories = categories;
            filterData[ 0 ].rawCategories = rawCategories;
            filterData[ 0 ].rawCategoryValues = rawCategoryValues;
        } else {
            pciVsFilterInfoEntry = {
                pciUid: pciUID,
                categories: categories,
                rawCategories: rawCategories,
                rawCategoryValues: rawCategoryValues
            };
            pciToFilterDataMap.push( pciVsFilterInfoEntry );
        }
    } else {
        pciVsFilterInfoEntry = { // eslint-disable-line no-redeclare
            pciUid: pciUID,
            categories: categories,
            rawCategories: rawCategories,
            rawCategoryValues: rawCategoryValues
        };
        pciToFilterDataMap.push( pciVsFilterInfoEntry );
    }
};

var gatherSelectedFilterValues = function( filterValues ) {
    var selectedFilterValue = [];
    _.forEach( filterValues, function( filterValue ) {
        if( filterValue.selected ) {
            selectedFilterValue.push( filterValue );
        }
    } );
    return selectedFilterValue;
};

var computeFilterStringForCategories = function( categories ) {
    var filterValues = gatherAllFilterValuesAcrossCategories( categories );
    var selectedFilterValues = gatherSelectedFilterValues( filterValues );
    return buildEffectiveFilterString( selectedFilterValues );
};

export let computeFilterStringForNewProductContextInfo = function( newProductContextInfoUID ) {
    var filterString = '';
    var categories = lookupCategoriesInfoInCache( newProductContextInfoUID );
    if( categories ) {
        filterString = computeFilterStringForCategories( categories );
    }
    return filterString;
};

var updateURLAsPerCurrentProductBeingOpened = function( eventData ) {
    var newProductContextInfoUID = eventData.newProductContextUID;
    var newState = {};
    var computedFilterString = exports.computeFilterStringForNewProductContextInfo( newProductContextInfoUID );
    newState.filter = _.isEmpty( computedFilterString ) ? null : computedFilterString;
    contextStateMgmtService.syncContextState( appCtxSvc.ctx.aceActiveContext.key, newState );
};

var clearCache = function() {
    pciToFilterDataMap = [];
};

var clearFilterInfoFromURL = function() {
    contextStateMgmtService.syncContextState( appCtxSvc.ctx.aceActiveContext.key, {
        filter: null
    } );
    clearCache();
};

var processRawFilterInfo = function( rawCategoriesInfo, rawFilterValues, data, processEmptyCategories ) {
    var processedCategories = filterPanelService.getCategories2( rawCategoriesInfo, rawFilterValues,
        undefined, searchColorDecoratorService.getColorPrefValue(), true, false );
    _.forEach( processedCategories, function( category, index ) {
        processedCategories[ index ].hasMoreFacetValues = !rawCategoriesInfo[index].endReached;
        processedCategories[index].startIndexForFacetSearch = rawCategoriesInfo[index].endIndex;
    } );
    aceFilterService.suppressDateRangeFilterForDateFilters( processedCategories );
    // Special processing for the Filter Categories for which no filter values were returned.
    // In such cases we plan to keep the category collapsed. For performance reasons, the server
    // does not return filter values for Filter categories based on Occurrence Properties, as part
    // of getSubsetInfo SOA service call.
    if( processEmptyCategories ) {
        updateEmptyAttributeFilterData( processedCategories );
    }
    updateCategoriesInfoCacheForCurrentPCI( processedCategories, rawCategoriesInfo, rawFilterValues );

    return processedCategories;
};

var getRawCategoriesAndCategoryValues = function( pci ) {
    var filterData;
    if( pciToFilterDataMap && pciToFilterDataMap.length > 0 ) {
        filterData = pciToFilterDataMap.filter( function( x ) {
            return x.pciUid === pci;
        } );
    }
    if( filterData && filterData[ 0 ] ) {
        return {
            rawCategories: filterData[ 0 ].rawCategories,
            rawCategoryValues: filterData[ 0 ].rawCategoryValues
        };
    }
};

var fetchCategoriesInfoAndSelectApplicableCategory = function( productContextInfoUID, data ) {
    var input = {
        subsetInputs: [ {
            productInfo: {
                type: 'Awb0ProductContextInfo',
                uid: productContextInfoUID
            },
            requestPref: {},
            searchFilterFieldSortType: '',
            searchSortCriteria: []
        } ]
    };
    if( appCtxSvc.ctx.aceActiveContext.context.isShowConnection === true ) {
        input.subsetInputs[ 0 ].requestPref.includeConnections = _TRUE;
    }
    soaSvc.postUnchecked( 'Internal-ActiveWorkspaceBom-2019-12-OccurrenceManagement', 'getSubsetInfo3', input )
        .then(
            function( response ) {
                if( response && response.filterOut ) {
                    var processedCategories = processRawFilterInfo(
                        response.filterOut[ 0 ].searchFilterCategories, response.filterOut[ 0 ].searchFilterMap, data, true /*prcoess Empty Filter Categories*/ );
                    exports.updateCategories( processedCategories, data, true );
                }
            } );
};

/**
 * Select the filter
 * @param {Object} category selected category
 * @param {Object} filter selected filter value
 */
export let selectACEFilter = function( category, filter ) {
    appCtxSvc.ctx.aceActiveContext.context.requestPref.calculateFilters = true;

    // Clear selections when filters are being applied or modified in both single select and multiselect scenario
    //TODO - just check if selections needs to be cleared when Spatial filter is applied.
    appCtxSvc.ctx.aceActiveContext.context.clearExistingSelections = true;

    // First clear the incontext state when applying attribute filter.
    if( appCtxSvc.ctx.aceActiveContext.context.currentState !== undefined ) {
        appCtxSvc.ctx.aceActiveContext.context.currentState.incontext_uid = null;
    }

    //Process Attribute filter category value update
    var effectiveFilterString = getEffectiveFilterString( category, filter );
    var newState = {};
    newState.filter = _.isEmpty( effectiveFilterString ) ? null : effectiveFilterString;

    var categoriesInfo = aceFilterService.extractFilterCategoriesAndFilterMap( effectiveFilterString );
    appCtxSvc.updatePartialCtx( 'aceActiveContext.context.appliedFilters', categoriesInfo );
    appCtxSvc.updatePartialCtx( jitterFreeContextState, true );
    appCtxSvc.updatePartialCtx( jitterFreePropLoad, true );

    contextStateMgmtService.updateContextState( appCtxSvc.ctx.aceActiveContext.key, newState, true );
};

/**
 * Fetch the filter data
 *
 * @param {Object} data data object
 */
export let getFilterData = function( data ) {
    var categories = lookupCategoriesInfoInCache( appCtxSvc.ctx.aceActiveContext.context.productContextInfo.uid );
    if( categories ) {
        exports.updateCategories( categories, data, true );
    } else {
        fetchCategoriesInfoAndSelectApplicableCategory( appCtxSvc.ctx.aceActiveContext.context.productContextInfo.uid, data );
    }
};

/**
 * Update the categories information
 *
 * @param {Object} categories list of categories
 * @param {Object} data data object
 * @param {boolean} processEmptyCategories Set this to true if you want to render the filter categories with no filter
 *                                         values returned by getSubsetInfo call as collapsed. False, otherwise.
 */
export let updateCategories = function( categories, data, processEmptyCategories ) {
    var rawCategories = getRawCategoriesAndCategoryValues( appCtxSvc.ctx.aceActiveContext.context.productContextInfo.uid );
    var category = aceFilterService.getApplicableCategory( categories );
    aceFilterService.selectGivenCategory( category, 'aceActiveContext.context.categoriesToRender',
        rawCategories, ACE_CONTEXT_KEY );
    if( processEmptyCategories ) {
        updateEmptyAttributeFilterData( categories );
    }
};

/**
 * This method is to do post processing after getOcc* SOA call is done. This includes populating Subset panel's
 * Viewmodel data, clearing temp variables in ctx and resetting panel.
 * @param {Object} data viewmodel data object
 */
export let performPostProcessingOnLoad = function() {
    if( appCtxSvc.ctx.aceActiveContext.context.appliedFilters ||
        appCtxSvc.ctx.aceActiveContext.context.contentRemoved === true ) {
        //Publish the event so that any views that are interested when the PWA contents are updated
        //due to filter change update as necessary. Currently, this will be used by 3D Viewer.
        eventBus.publish( 'primaryWorkArea.contentsReloaded', {
            viewToReact: appCtxSvc.ctx.aceActiveContext.key
        } );
    }
    // applied filters
    _removeTempRecipeObjFromAppCtx();
};

/**
 * This method is to post process the occgmmtContext object and remove appliedFilters
 * objects from there. These are temp variables created only to hold the changes for creating the SOA input.
 */
function _removeTempRecipeObjFromAppCtx() {
    if( appCtxSvc.ctx.aceActiveContext.context.appliedFilters ) {
        delete appCtxSvc.ctx.aceActiveContext.context.appliedFilters;
    }
}

var updateFilterInfo = function( data ) {
    var processedCategories;
    if( appCtxSvc.ctx.aceActiveContext.context.searchFilterCategories &&
        appCtxSvc.ctx.aceActiveContext.context.searchFilterCategories.length > 0 ) {
        processedCategories = processRawFilterInfo(
            appCtxSvc.ctx.aceActiveContext.context.searchFilterCategories,
            appCtxSvc.ctx.aceActiveContext.context.searchFilterMap, data, true );
    }

    /**
     * There is at least one known case where the filter params are cleared from the URL when those should not
     * be because of lack of control over sequence of events. The following block will keep the URL consistent
     * in such cases.
     */
    if( !appCtxSvc.ctx.aceActiveContext.context.currentState.filter ) {
        var productContextChangeData = {
            newProductContextUID: appCtxSvc.ctx.aceActiveContext.context.currentState.pci_uid
        };
        updateURLAsPerCurrentProductBeingOpened( productContextChangeData );
    }

    exports.updateCategories( processedCategories, data, true );
};

/**
 * Select the given ACE filter category
 *
 * @param {Object} category given category to select
 */
export let selectCategory = function( category ) {
    if( category.filterValues.length > 0 ) {
        var rawCategories = getRawCategoriesAndCategoryValues( appCtxSvc.ctx.aceActiveContext.context.productContextInfo.uid );
        aceFilterService.selectGivenCategory( category, 'aceActiveContext.context.categoriesToRender',
            rawCategories, ACE_CONTEXT_KEY );
    }
};

/**
 * This function will process Filter Categories for which no filter values were sent by the server.
 * The aim of this function is to render such categories as Collapsed by default.
 * @param {object} categories existing categories
 */
var updateEmptyAttributeFilterData = function( categories ) {
    _.forEach( categories, function( category ) {
        if( category.categoryType === 'Attribute' && category.filterValues.length === 0 ) {
            // Show the expansion twisty on the filter category widget.
            category.showExpand = true;

            //The Text Search widget within filter categories relies on this variable to make
            // to decide whether to make a performFacetSearch or not. Setting this to true
            // allows the widget to performFacetSearch if a textsearch box is present in he UI.
            category.isServerSearch = true;

            // This flag will set the filter category to be rendered as collapsed.
            category.expand = false;
        }
    } );
};

/**
 * Check  if product is structure indexed.
 *
 * @returns {boolean} : Returns true if structure indexed
 */
var isStructureIndexed = function() {
    var isStructure = false;
    if (  appCtxSvc.ctx.aceActiveContext.context.productContextInfo.props.awb0AlternateConfiguration
           && appCtxSvc.ctx.aceActiveContext.context.productContextInfo.props.awb0AlternateConfiguration !== undefined
           && appCtxSvc.ctx.aceActiveContext.context.productContextInfo.props.awb0AlternateConfiguration.dbValues[0] !== ''

          || appCtxSvc.ctx.aceActiveContext.context.supportedFeatures.Awb0EnableSmartDiscoveryFeature === undefined ) {
            isStructure = true;
        }
        return isStructure;
};

export let updateRecipeAndFilterInfoForReplay = function() {
    // Update the active context by clearing the recipe and filter info
    appCtxSvc.updatePartialCtx( 'aceActiveContext.context.recipe', [] );
    appCtxSvc.updatePartialCtx( 'aceActiveContext.context.searchFilterCategories', {} );
    appCtxSvc.updatePartialCtx( 'aceActiveContext.context.searchFilterMap', {} );
    appCtxSvc.updatePartialCtx( 'aceActiveContext.context.currentState.filter', '' );
};

/**
 * Initialize
 * @param {Object} data data object
 */
export let initialize = function( data ) {
    if( structureFilterEventSubscritpions.length === 0 ) {
        structureFilterEventSubscritpions.push( eventBus.subscribe( 'ace.resetStructureStarted', function() {
            if( isStructureIndexed() ) {
                clearFilterInfoFromURL();
            }
        } ) );

        // We need to update URL when active product changes. This event is fired when a change in selection results in change in active product.
        structureFilterEventSubscritpions.push( eventBus.subscribe( 'ace.productChangedEvent', function(
            eventData ) {
            if( isStructureIndexed() ) {
                updateURLAsPerCurrentProductBeingOpened( eventData );
            }
        } ) );

        // Subcribe to productContextChangedEvent This event is fired when a change in revision rule results in change in either structure or discovery filter panel.
        structureFilterEventSubscritpions.push( eventBus.subscribe( 'productContextChangedEvent', function( eventData ) {
            if( isStructureIndexed() && eventData && eventData.dataProviderActionType &&
                ( eventData.dataProviderActionType === 'initializeAction' || eventData.dataProviderActionType === 'productChangedOnSelectionChange' ) ) {
                    getFilterData( data );
                }
        } ) );

        structureFilterEventSubscritpions.push( eventBus.subscribe( 'aw.ColorFilteringToggleEvent', function() {
            if( isStructureIndexed() ) {
                getFilterData( data );
            }
        } ) );

        // Subcribe to occDataLoadedEvent to update PWA
        structureFilterEventSubscritpions.push( eventBus.subscribe( 'occDataLoadedEvent', function() {
            if( isStructureIndexed() ) {
                performPostProcessingOnLoad();
            }
        } ) );

        structureFilterEventSubscritpions.push( eventBus.subscribe( 'appCtx.update', function( context ) {
            if( isStructureIndexed() ) {
                if( context && context.name === 'aceActiveContext' && context.target === 'context.configContext' &&
                    Object.keys( context.value.aceActiveContext.context.configContext ).length > 0 ) {
                    clearFilterInfoFromURL();
                }

                if( context && appCtxSvc.ctx.aceActiveContext && context.name === appCtxSvc.ctx.aceActiveContext.key &&
                    context.target === 'searchFilterMap' ) {
                    var activeContext = appCtxSvc.getCtx( 'aceActiveContext.context' );
                    if( activeContext.searchFilterMap ) {
                        updateFilterInfo( data );
                    }
                }
            }
        } ) );
        eventBus.subscribe( 'ace.updateFilterPanel', function() {
            if( isStructureIndexed() ) {
                var context = appCtxSvc.getCtx( 'aceActiveContext.context' );
                if( context && context.requestPref ) {
                    context.requestPref.calculateFilters = true;
                }
            }
        } );
        if( appCtxSvc.ctx.aceActiveContext.context.searchFilterCategories && appCtxSvc.ctx.aceActiveContext.context.searchFilterMap ) {
            if( isStructureIndexed() ) {
                updateFilterInfo( data );
            }
        }
    }
    proximityFilterService.initialize();
};

/**
 * persistCategoryFilterToUpdateState
 * @param {Object} context event data object
 */
export let persistCategoryFilterToUpdateState = function( context ) {
    // Persist the values on the search context. This will be used later to merge the filter values
    // This function is called when More... is clicked and before the SOA call is made.
    // Update the category(activeFilter) and the current filter values for that category (searchFilterMap
    // on the search context. These values are used while processing the SOA response to append the response
    // filter values with the exising filter values.
    var contextSearchCtx = appCtxSvc.getCtx( 'search' );
    contextSearchCtx.activeFilter = context.category;
    contextSearchCtx.searchFilterMap = {};

    var rawCategories = getRawCategoriesAndCategoryValues( appCtxSvc.ctx.aceActiveContext.context.productContextInfo.uid );
    var filterValues = rawCategories.rawCategoryValues;
    for ( var filter in filterValues ) {
        if ( filter === context.category.internalName ) {
            contextSearchCtx.searchFilterMap[filter] = filterValues[filter];
            break;
        }
    }
};

/**
 * getDataProvider
 * @returns {Object} data provider for facet search
 */
export let getFacetSearchDataProvider = function() {
    return 'Awb0FullTextSearchProvider';
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
    var updatedFilterMap = awSearchFilterService.setMapForFilterValueSearch( data.searchFilterMap, contextSearchCtx );

    // Update the local cache with updated merged filter values
    var updatedCatName;
    var updateFilterValues;
    for ( var updateFilter in updatedFilterMap ) {
        updatedCatName =  updateFilter;
        updateFilterValues = updatedFilterMap[ updatedCatName ];
    }

    var rawCategoriesInfo = getRawCategoriesAndCategoryValues( appCtxSvc.ctx.aceActiveContext.context.productContextInfo.uid );
    var rawCategoryValues = rawCategoriesInfo.rawCategoryValues;
    for ( var rawCategoryValue in rawCategoryValues ) {
        if ( rawCategoryValue === updatedCatName ) {
            rawCategoryValues[rawCategoryValue] = updateFilterValues;
            break;
        }
    }

    var processedCategories = processRawFilterInfo( rawCategoriesInfo.rawCategories, rawCategoriesInfo.rawCategoryValues, data, false /*DO NOT PRCESS EMPTY FACETS*/ );
    exports.updateCategories( processedCategories, data, false /*DO NOT PRCESS EMPTY FACETS*/ );

    return updatedFilterMap;
};

/**
 * Destroy
 */
export let destroy = function() {
    clearCache();
    _.forEach( structureFilterEventSubscritpions, function( subDef ) {
        eventBus.unsubscribe( subDef );
        structureFilterEventSubscritpions = [];
    } );
    //structureFilterEventSubscritpions = [];
};

export default exports = {
    computeFilterStringForNewProductContextInfo,
    selectACEFilter,
    getFilterData,
    updateCategories,
    performPostProcessingOnLoad,
    selectCategory,
    persistCategoryFilterToUpdateState,
    getFacetSearchDataProvider,
    getSearchCriteriaForFacetSearch,
    getStartIndexForFacetSearch,
    updateFilterMapForFacet,
    updateRecipeAndFilterInfoForReplay,
    initialize,
    destroy
};
app.factory( 'structureFilterService', () => exports );

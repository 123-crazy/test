/* eslint-disable max-lines */
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
 * @module js/discoveryFilterService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import soaSvc from 'soa/kernel/soaService';
import filterPanelService from 'js/filterPanelService';
import aceFilterService from 'js/aceFilterService';
import searchColorDecoratorService from 'js/searchColorDecoratorService';
import contextStateMgmtService from 'js/contextStateMgmtService';
import filterPanelUtils from 'js/filterPanelUtils';
import occmgmtSubsetUtils from 'js/occmgmtSubsetUtils';
import proximityFilterService from 'js/proximityFilterService';
import createWorksetService from 'js/createWorksetService';
import localeSvc from 'js/localeService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import tcSessionData from 'js/TcSessionData';
import awSearchFilterService from 'js/awSearchFilterService';
import notyService from 'js/NotyModule';

var exports = {};

var pciToFilterDataMap = [];
var pciToTransientRecipesMap = [];
var pciToCategoryLogicMap = [];
var _TRUE = [ 'true' ];
var applicableCategoryTypes = [ 'Attribute', 'Partition' ];

var discoveryFilterEventSubscriptions = [];
var jitterFreeContextState = '.context.retainTreeExpansionStateInJitterFreeWay';
var jitterFreePropLoad = '.context.transientRequestPref.jitterFreePropLoad';

var _onDiscoveryFilterPanelCloseListener = null;
var _productContextChangeEventListener = null;

var ACE_CONTEXT_KEY = 'aceActiveContext';
var _contextKey;

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
    var filterSeparator = appCtxSvc.ctx.preferences.AW_FacetValue_Separator ? appCtxSvc.ctx.preferences.AW_FacetValue_Separator[ 0 ] : '^';
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

var removeFromFilterValuesIfItDoesNotContain = function( filterValues, filterValue, whatToCheck, orphanDateEntries ) {
    var entry = filterValues.filter( function( x ) {
        return x.categoryName === whatToCheck;
    } );
    if( !entry || !entry[ 0 ] ) {
        filterValues.splice( filterValues.indexOf( filterValue ), 1 );
        orphanDateEntries.push( filterValue );
    }
};

var removeOrphanDateEntries = function( filterValues ) {
    var orphanDateEntries = [];
    var isDateFilter = filterValues.filter( function( filter ) {
        return filter.type === filterPanelUtils.DATE_FILTER ||
            filter.type === filterPanelUtils.DATE_DRILLDOWN_FILTER;
    } );
    if( isDateFilter ) {
        for( var i = 0; i < isDateFilter.length; i++ ) {
            var tmpCategoryName = isDateFilter[ i ].categoryName.substring( 0, isDateFilter[ i ].categoryName
                .indexOf( '_0Z0_' ) );
            if( isDateFilter[ i ].categoryName.lastIndexOf( '_0Z0_year_month_day' ) > 0 ) {
                removeFromFilterValuesIfItDoesNotContain( filterValues, isDateFilter[ i ], tmpCategoryName +
                    '_0Z0_week', orphanDateEntries );
            } else if( isDateFilter[ i ].categoryName.lastIndexOf( '_0Z0_year_month' ) > 0 ) {
                removeFromFilterValuesIfItDoesNotContain( filterValues, isDateFilter[ i ], tmpCategoryName +
                    '_0Z0_year', orphanDateEntries );
            } else if( isDateFilter[ i ].categoryName.lastIndexOf( '_0Z0_week' ) > 0 ) {
                removeFromFilterValuesIfItDoesNotContain( filterValues, isDateFilter[ i ], tmpCategoryName +
                    '_0Z0_year_month', orphanDateEntries );
            }
        }
    }
    return orphanDateEntries;
};

var getRecipesIfItContains = function( updatedRecipes, deletedRecipe, whatToCheck, orphanDateEntries ) {
    for( var recipe in updatedRecipes ) {
        var tmpCategoryName = updatedRecipes[ recipe ].criteriaValues[ 0 ].substring( 0, updatedRecipes[ recipe ].criteriaValues[ 0 ].indexOf( '_0Z0_' ) );
        if( tmpCategoryName ) {
            for( var i = 0; i < whatToCheck.length; i++ ) {
                var orphanDate = tmpCategoryName + whatToCheck[ i ];
                if( updatedRecipes[ recipe ].criteriaValues[ 0 ].includes( orphanDate ) ) {
                    orphanDateEntries.push( updatedRecipes[ recipe ] );
                    break;
                }
            }
        }
    }
};

var getOrphanDateRecipesOnDelete = function( deletedRecipe, updatedRecipes ) {
    var orphanDateEntries = [];
    var tmpCategoryName = deletedRecipe.criteriaValues[ 0 ].substring( 0, deletedRecipe.criteriaValues[ 0 ].indexOf( '_0Z0_' ) );
    if( tmpCategoryName ) {
        var orphanDatesForYear = [ '_0Z0_year_month', '_0Z0_week', '_0Z0_year_month_day' ];
        var orphanDatesForMonth = [ '_0Z0_week', '_0Z0_year_month_day' ];
        var orphanDatesForWeek = [ '_0Z0_year_month_day' ];
        // No orphans return empty array
        if( deletedRecipe.criteriaValues[ 0 ].lastIndexOf( '_0Z0_year_month_day' ) > 0 ) {
            return orphanDateEntries;
        }
        if( deletedRecipe.criteriaValues[ 0 ].lastIndexOf( '_0Z0_year_month' ) > 0 ) {
            getRecipesIfItContains( updatedRecipes, deletedRecipe, orphanDatesForMonth, orphanDateEntries );
        } else if( deletedRecipe.criteriaValues[ 0 ].lastIndexOf( '_0Z0_year' ) > 0 ) {
            getRecipesIfItContains( updatedRecipes, deletedRecipe, orphanDatesForYear, orphanDateEntries );
        } else if( deletedRecipe.criteriaValues[ 0 ].lastIndexOf( '_0Z0_week' ) > 0 ) {
            getRecipesIfItContains( updatedRecipes, deletedRecipe, orphanDatesForWeek, orphanDateEntries );
        }
    }
    return orphanDateEntries;
};

var buildEffectiveFilterString = function( filterValues ) {
    removeOrphanDateEntries( filterValues );
    return getFilterString( filterValues );
};

var getFilterString = function( filterValues ) {
    var filterStringToReturn = '';
    var previousFilterValue;
    //LCS-454632 Get the filter separator value from the preference AW_FacetValue_Separator
    var filterSeparator = appCtxSvc.ctx.preferences.AW_FacetValue_Separator ? appCtxSvc.ctx.preferences.AW_FacetValue_Separator[ 0 ] : '^';

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
    var filterSeparator = appCtxSvc.ctx.preferences.AW_FacetValue_Separator ? appCtxSvc.ctx.preferences.AW_FacetValue_Separator[ 0 ] : '^';
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
    if( foundCategory === true ) {
        for( var indx = 0; indx < appliedFilters.length; indx++ ) {
            if( _.isEmpty( updatedFilterStringToReturn ) ) {
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

var updateCtxRecipeInfoFromCache = function( productContextInfoUID ) {
    var filterData;
    var recipe;
    if( pciToFilterDataMap && pciToFilterDataMap.length > 0 ) {
        filterData = pciToFilterDataMap.filter( function( x ) {
            return x.pciUid === productContextInfoUID;
        } );
    }
    if( filterData && filterData[ 0 ] ) {
        recipe = filterData[ 0 ].recipe;
        if( recipe ) {
            appCtxSvc.updatePartialCtx(  _contextKey + '.context.recipe', recipe );
        }
    }
};

var getEffectiveFilterStringFromRecipe = function( updatedRecipe ) {
    var effectiveFilterValuesToConsider = getFilterMapFromRecipes( updatedRecipe, false );
    return buildEffectiveFilterString( effectiveFilterValuesToConsider );
};

var getFilterMapFromRecipes = function( recipes, validateToIncludeInputFilter, filterString ) {
    var occMgmtCtx = appCtxSvc.getCtx( _contextKey ).context;
    var productContextInfoUID = occMgmtCtx.productContextInfo.uid;
    var categories = lookupCategoriesInfoInCache( productContextInfoUID );
    var filterValues = gatherAllFilterValuesAcrossCategories( categories );
    var effectiveFilterValuesToConsider = [];

    _.forEach( recipes, function( recipe ) {
        if( applicableCategoryTypes.includes( recipe.criteriaType ) && recipe.criteriaOperatorType !== 'Clear' ) {
            var recipeFoundInMap = false;
            var recipeCategory = recipe.criteriaValues[ 0 ];
            var recipeFilterValue = recipe.criteriaValues[ 1 ];
            _.forEach( filterValues, function( filterValue ) {
                var filterCategory = filterValue.categoryName;
                var value = filterValue.internalName;
                if( recipeCategory === filterCategory && recipeFilterValue === value && isFilterSelected( filterValue ) ) {
                    recipeFoundInMap = true;
                    if( validateToIncludeInputFilter ) {
                        if( !isFilterValueSameAsInputFilterString( filterValue, filterString ) ) {
                            effectiveFilterValuesToConsider.push( filterValue );
                        }
                    } else {
                        effectiveFilterValuesToConsider.push( filterValue );
                    }
                }
            } );
            if( !recipeFoundInMap ) {
                var filterValue = {};
                filterValue.categoryName = recipe.criteriaValues[ 0 ];
                filterValue.internalName = recipe.criteriaValues[ 1 ];
                filterValue.name = recipe.criteriaValues[ 1 ];
                filterValue.type = 'StringFilter';
                filterValue.selected = true;
                effectiveFilterValuesToConsider.push( filterValue );
            }
        }
    } );

    return effectiveFilterValuesToConsider;
};

var updateCategoriesInfoCacheForCurrentPCI = function( categories, rawCategories, rawCategoryValues, recipe ) {
    var occMgmtCtx = appCtxSvc.getCtx( _contextKey ).context;
    var pciUID = occMgmtCtx.productContextInfo.uid;
    var pciVsFilterInfoEntry = {};
    if( pciToFilterDataMap && pciToFilterDataMap.length > 0 ) {
        var filterData = pciToFilterDataMap.filter( function( x ) {
            return x.pciUid === pciUID;
        } );
        if( filterData && filterData[ 0 ] ) {
            filterData[ 0 ].recipe = recipe;
            filterData[ 0 ].categories = categories;
            filterData[ 0 ].rawCategories = rawCategories;
            filterData[ 0 ].rawCategoryValues = rawCategoryValues;
        } else {
            pciVsFilterInfoEntry = {
                pciUid: pciUID,
                recipe: recipe,
                categories: categories,
                rawCategories: rawCategories,
                rawCategoryValues: rawCategoryValues
            };
            pciToFilterDataMap.push( pciVsFilterInfoEntry );
        }
    } else {
        pciVsFilterInfoEntry = { // eslint-disable-line no-redeclare
            pciUid: pciUID,
            recipe: recipe,
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

export let computeFilterStringForNewProductContextInfo = function( newProductContextInfoUID ) {
    var filterString = '';
    var categories = lookupCategoriesInfoInCache( newProductContextInfoUID );
    if( categories ) {
        var filterValues = gatherAllFilterValuesAcrossCategories( categories );
        var selectedFilterValues = gatherSelectedFilterValues( filterValues );
        filterString = buildEffectiveFilterString( selectedFilterValues );
    }
    return filterString;
};

var clearCache = function() {
    pciToFilterDataMap = [];
};

var clearRecipeCache = function( data, clearAll ) {
    if( clearAll ) {
        pciToTransientRecipesMap = [];
    } else {
        // Get the current PCI and only clear the cache for that
        var activePCI = appCtxSvc.ctx[ _contextKey ].context.currentState.pci_uid;
        var pciIndex = pciToTransientRecipesMap.indexOf( activePCI );
        if( pciIndex > -1 ) {
            pciToTransientRecipesMap.splice( pciIndex, 1 );
        }
    }

    if( data ) {
        data.enableApply = false;
    }
};

var clearFilterInfoFromURL = function() {
    contextStateMgmtService.syncContextState( appCtxSvc.ctx[_contextKey].key, {
        filter: null
    } );
};

var clearRecipeFromContext = function() {
    var aceActiveContext = appCtxSvc.getCtx( _contextKey ).context;
    if( aceActiveContext ) {
        aceActiveContext.recipe = [];
    }
};

var processRawFilterInfo = function( rawCategoriesInfo, rawFilterValues, recipe, processCategories ) {
    var processedCategories = filterPanelService.getCategories2( rawCategoriesInfo, rawFilterValues,
        undefined, searchColorDecoratorService.getColorPrefValue(), true, false );
    _.forEach( processedCategories, function( category, index ) {
        processedCategories[ index ].hasMoreFacetValues = !rawCategoriesInfo[ index ].endReached;
        processedCategories[ index ].startIndexForFacetSearch = rawCategoriesInfo[ index ].endIndex;
    } );
    aceFilterService.suppressDateRangeFilterForDateFilters( processedCategories );
    // Special processing for the Filter Categories for which no filter values were returned.
    // In such cases we plan to keep the category collapsed. For performance reasons, the server
    // does not return filter values for Filter categories based on Occurrence Properties, as part
    // of getSubsetInfo SOA service call.
    if( processCategories ) {
        updateCollapsedCategoryFilterData( processedCategories );
    }
    updateCategoriesInfoCacheForCurrentPCI( processedCategories, rawCategoriesInfo, rawFilterValues, recipe );

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
            recipe: filterData[ 0 ].recipe,
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
    if( appCtxSvc.ctx[ _contextKey ].context.isShowConnection === true ) {
        input.subsetInputs[ 0 ].requestPref.includeConnections = _TRUE;
    }
    soaSvc.postUnchecked( 'Internal-ActiveWorkspaceBom-2019-12-OccurrenceManagement', 'getSubsetInfo3', input )
        .then(
            function( response ) {
                if( response && response.filterOut ) {
                    var resFilterCategoryMap = _.cloneDeep( response.filterOut[ 0 ].searchFilterCategories );
                    var resFilterMap = _.cloneDeep( response.filterOut[ 0 ].searchFilterMap );
                    updateFilterInfo( resFilterCategoryMap,
                        resFilterMap, response.filterOut[ 0 ].recipe, true /*prcoess Empty Filter Categories*/ );
                    processRecipeFromSubsetResponse( response.filterOut[ 0 ].recipe, data );
                    initializeCategoryLogicCache( resFilterCategoryMap, response.filterOut[ 0 ].recipe, data );
                    clearContext();
                    var panelContext = appCtxSvc.getCtx( 'panelContext' );
                    if( panelContext && panelContext.operation && ( panelContext.operation === 'Include' || panelContext.operation === 'Exclude' ) ) {
                        // Fire event to add selected element when recipe is present in cache
                        eventBus.publish( 'discoveryFilter.includeExcludeSelectedElement' );
                    }
                }
        } );
};

var initializeCategoryLogicCache = function( categories, recipe, data ) {
    if( !isTCVersion132OrLater() ) {
        return;
    }
    var aceActiveContext = appCtxSvc.getCtx( _contextKey ).context;
    var pciUID = aceActiveContext.productContextInfo.uid;
    var newCategoryLogicMap = {};
    if( recipe && recipe.length > 0 ) {
        // Case:  There is recipe applied then we need to iterate over recipe terms
        // and look for NOT logic on in recipes for categories and update the category logic map
        _.forEach( categories, function( category ) {
            var categoryLogic = true;
            if( category.categoryType !== 'Spatial' ) {
                var recipeTermList = getRecipeForCategory( recipe, category );
                if( recipeTermList && recipeTermList.length > 0 ) {
                    _.forEach( recipeTermList, function( recipeTerm ) {
                        if( recipeTerm.criteriaOperatorType === 'Exclude' ) {
                            categoryLogic = false; //  logic is false implying 'Exclude'
                            return;
                        }
                    } );
                }
            }
            newCategoryLogicMap[ category.displayName ] = categoryLogic;
        } );
    } else {
        // Case: No filter/recipe applied, we initialize logic to false (i.e. Filter)
        _.forEach( categories, function( category ) {
            newCategoryLogicMap[ category.displayName ] = true; // default logic is true implying 'Filter'
        } );
    }

    // Update the cache with appropriate entry for category logic
    var pciToCategoryLogicEntry;
    if( pciToCategoryLogicMap && pciToCategoryLogicMap.length > 0 ) {
        var categoryLogicEntry = pciToCategoryLogicMap.filter( function( x ) {
            return x.pciUid === pciUID;
        } );

        if( categoryLogicEntry && categoryLogicEntry.length > 0 && categoryLogicEntry[ 0 ].categoryLogicMap ) {
            // Update existing entry for category logic cache
            categoryLogicEntry[ 0 ].categoryLogicMap = newCategoryLogicMap;
        } else {
            pciToCategoryLogicEntry = {
                pciUid: pciUID,
                categoryLogicMap: newCategoryLogicMap
            };
            // Add new entry for the active PCI to cache
            pciToCategoryLogicMap.push( pciToCategoryLogicEntry );
        }
    } else {
        pciToCategoryLogicEntry = {
            pciUid: pciUID,
            categoryLogicMap: newCategoryLogicMap
        };
        pciToCategoryLogicMap.push( pciToCategoryLogicEntry );
    }

    data.categoryLogicMap = newCategoryLogicMap;
};

export let toggleCategoryLogic = function( toggleCategory, data ) {
    // Create transient recipe if there are no recipes in transient map
    cloneCurrentRecipesIfNeeded();

    if( data && data.categoryLogicMap ) {
        data.categoryLogicMap[ toggleCategory.displayName ] = !data.categoryLogicMap[ toggleCategory.displayName ];

        var aceActiveContext = appCtxSvc.getCtx( _contextKey ).context;
        var pciUID = aceActiveContext.productContextInfo.uid;
        var categoryLogicEntry = pciToCategoryLogicMap.filter( function( x ) {
            return x.pciUid === pciUID;
        } );

        if( categoryLogicEntry && categoryLogicEntry.length > 0 && categoryLogicEntry[ 0 ].categoryLogicMap ) {
            // Update existing entry for category logic cache
            categoryLogicEntry[ 0 ].categoryLogicMap = data.categoryLogicMap;
        }

        if( toggleCategory.categoryType === 'Spatial' ) {
            // Do not update existing recipe term for Spatial category
            return;
        }

        // Update recipe operator and recipes cache
        var recipesData = pciToTransientRecipesMap.filter( function( x ) {
            return x.pciUid === pciUID;
        } );

        if( recipesData && recipesData[ 0 ] ) {
            var recipeTermInTransientList = getRecipeForCategory( recipesData[ 0 ].transientRecipes, toggleCategory );
            var displayRecipeTermList = getRecipeForCategory( data.recipe, toggleCategory );
            if( recipeTermInTransientList && recipeTermInTransientList.length > 0 ) {
                if( data.categoryLogicMap[ toggleCategory.displayName ] ) {
                    _.forEach( recipeTermInTransientList, function( recipeTermInTransient ) {
                        // Update Transient list recipe term
                        recipeTermInTransient.criteriaOperatorType = 'Filter';
                    } );

                    _.forEach( displayRecipeTermList, function( displayRecipeTerm ) {
                        // Update recipe list used to display in view
                        displayRecipeTerm.criteriaOperatorType = 'Filter';
                    } );
                } else {
                    _.forEach( recipeTermInTransientList, function( recipeTermInTransient ) {
                        // Update Transient list recipe term
                        recipeTermInTransient.criteriaOperatorType = 'Exclude';
                    } );

                    _.forEach( displayRecipeTermList, function( displayRecipeTerm ) {
                        // Update recipe list used to display in view
                        displayRecipeTerm.criteriaOperatorType = 'Exclude';
                    } );
                }

                // Enable Filter button if recipe has changed
                var currentRecipes = _.clone( aceActiveContext.recipe );
                currentRecipes = omitUnwantedProperties( currentRecipes, [ '$$hashKey' ] );
                data.enableApply = areRecipesChanged( currentRecipes, recipesData[ 0 ].transientRecipes );

                // Update recipe on context
                updateRecipeOnContext( recipesData[ 0 ].transientRecipes );

                if( !data.delayedApply ) {
                    applyFilter( data );
                }
            }
        }
    }
};

/**
 * Update recipe on context
 * @param {Object} recipe list to update
 */
var updateRecipeOnContext = function( transientRecipe ) {
    var newRecipe = [];
    _.forEach( transientRecipe, function( recipeTerm ) {
        newRecipe.push( recipeTerm );
    } );
    appCtxSvc.updatePartialCtx( _contextKey + '.context.effectiveRecipe', newRecipe );
    var effectiveFilterString = getEffectiveFilterStringFromRecipe( newRecipe );
    var aceActiveContext = appCtxSvc.getCtx( _contextKey ).context;
    aceActiveContext.effectiveFilterString = effectiveFilterString;
};

/**
 * Find recipe for given category
 * @param {Object} category selected category
 * @param {Object} filter selected filter value
 * @param {Object} data data object
 */
var getRecipeForCategory = function( recipe, category ) {
    var existingRecipeTermList = [];
    _.forEach( recipe, function( recipeTerm ) {
        if( recipeTerm.criteriaValues[ 0 ] === category.internalName ) {
            existingRecipeTermList.push( recipeTerm );
        } else if( category.type === 'DateFilter' ) {
            _.forEach( category.filterValues, function( filterValue ) {
                if( recipeTerm.criteriaValues[ 0 ] === filterValue.categoryName ) {
                    existingRecipeTermList.push( recipeTerm );
                }
            } );
        }
    } );
    return existingRecipeTermList;
};

/**
 * Select the filter
 * @param {Object} category selected category
 * @param {Object} filter selected filter value
 * @param {Object} data data object
 */
export let selectACEFilter = function( category, filter, data ) {
    //  Reset selection and return if previous operation is not completed
    if (  appCtxSvc.ctx[ _contextKey ].context.updatedRecipe ) {
        resetSelection();
        return;
    }

    if( category.categoryType === 'Spatial' ) {
        var panelName = filter.internalName + 'SubPanel';
        var resource = app.getBaseUrlPath() + '/i18n/OccurrenceManagementSubsetConstants';
        var localTextBundle = localeSvc.getLoadedText( resource );
        var panelTitle = localTextBundle[ panelName ];
        var categoryLogic = null;
        if( data && data.categoryLogicMap ) {
            if( !data.categoryLogicMap[ category.displayName ] ) {
                categoryLogic = 'Exclude';
            }
        }

        //Open the subpanel to set the recipe input
        var eventData = {
            destPanelId: panelName,
            title: panelTitle,
            recreatePanel: true,
            isolateMode: false, //IsolateMode is set to false so as to access the subPanel's viewModel data. Have to check for the repurcussions.
            supportGoBack: true,
            recipeOperator: categoryLogic
        };
        eventBus.publish( 'awPanel.navigate', eventData );
    } else {
        if( !validForFilterChange( data, filter ) ) {
            return;
        }

        // add or delete attribute criteria in cache for the filter selected/deselected
        updateRecipeToCacheForCurrentPCI( category, filter, data );

        // sync filters to update the cache and view model
        if( data.delayedApply ) {
            syncFiltersInCacheOnFilterChange( category, filter );
        }

        // sync recipes in cache to update the view model
        syncRecipesInCache( data );

        if( !data.delayedApply ) {
            applyFilter( data );
        }
    }
};

/**
 * Fetch the filter data
 *
 * @param {Object} data data object
 */
export let getFilterData = function( data ) {
    var iscategoryLogicMapPopulated = false;
    var categories = lookupCategoriesInfoInCache( appCtxSvc.ctx[ _contextKey ].context.productContextInfo.uid );
    if( categories ) {
        updateCategories( categories, false );
        //sync the recipe
        if( data ) {
            data.recipe = syncRecipesInCache( data );
            data.showMore.propertyDisplayName = getMoreLinkText( data.recipe );
        }
        if( pciToCategoryLogicMap ) {
            var categoryLogicEntry = pciToCategoryLogicMap.filter( function( x ) {
                return x.pciUid === appCtxSvc.ctx[ _contextKey ].context.productContextInfo.uid;
            } );
            if( categoryLogicEntry && categoryLogicEntry.length > 0 ) {
                data.categoryLogicMap = categoryLogicEntry[ 0 ].categoryLogicMap;
                iscategoryLogicMapPopulated = true;
            }
        }
        // Create new category logic cache if it does not exist for given PCI
        if ( !iscategoryLogicMapPopulated ) {
            initializeCategoryLogicCache( categories, data.recipe, data );
        }
        var panelContext = appCtxSvc.getCtx( 'panelContext' );
        if( panelContext && panelContext.operation && ( panelContext.operation === 'Include' || panelContext.operation === 'Exclude' ) ) {
            // Fire event to add selected element when recipe is present in cache
            eventBus.publish( 'discoveryFilter.includeExcludeSelectedElement' );
        }
    } else {
        fetchCategoriesInfoAndSelectApplicableCategory( appCtxSvc.ctx[ _contextKey ].context.productContextInfo.uid, data );
    }
    return data.recipe;
};

/**
 * Reset the filter selection
 */
 var resetSelection = function( ) {
    var rawCategoriesInfo = getRawCategoriesAndCategoryValues( appCtxSvc.ctx[ _contextKey ].context.productContextInfo.uid );
    updateFilterInfo( rawCategoriesInfo.rawCategories, rawCategoriesInfo.rawCategoryValues, rawCategoriesInfo.recipe, false /*prcoess Empty Filter Categories*/ );
};

/**
 * Update the categories information
 *
 * @param {Object} categories list of categories
 * @param {boolean} processCategories Set this to true if you want to process filter categories. False, otherwise.
 */
var updateCategories = function( categories, processCategories ) {
    var rawCategories = getRawCategoriesAndCategoryValues( appCtxSvc.ctx[ _contextKey ].context.productContextInfo.uid );
    var category = aceFilterService.getApplicableCategory( categories );
    aceFilterService.selectGivenCategory( category, _contextKey + '.context.categoriesToRender',
        rawCategories, _contextKey );
    if( processCategories ) {
        updateCollapsedCategoryFilterData( categories );
    }
    updateSpatialFilterData( categories );
    updatePartitionFilterData( categories, rawCategories, processCategories );
};

/**
 * This method populates suffixIcon details on category values if it has children
 * @param {Object} categories Categories
 */
let updatePartitionFilterData = ( categories, rawCategories, processCategories ) => {
    categories.map( function( categoryObj ) {
        updatePartitionCategory( categoryObj, rawCategories, processCategories );
    } );
};

/*
TODO-updatePartitionCategory [skpnw0]: hasChildren attribute is missing in performFacetSearch SOA output structure.
For now, considering time crunch we can use alternate attribute like ‘startEndRange’ to populate child Icon.
We agreed this is stop gap solution and we should have Story to change SOA output structure and delete this stop gap solution
*/
let updatePartitionCategory = ( category, rawCategories, processCategories ) => {
    if( category.categoryType === 'Partition' ) {
        var rawFilterValues = rawCategories.rawCategoryValues[ category.internalName ];
        let updatedFilterValues = rawFilterValues.map( function( rawFilterValue ) {
            return category.filterValues.filter( function( filterValue ) {
                if( rawFilterValue.stringValue === filterValue.internalName ) {
                    if( rawFilterValue.hasChildren || rawFilterValue.startEndRange === 'true' ) {
                        filterValue.suffixIconId = 'indicatorChildren';
                        filterValue.showSuffixIcon = true;
                    }
                    return filterValue;
                }
            } )[ 0 ];
        } );
        category.filterValues = updatedFilterValues;
        category.results = _.slice( updatedFilterValues, 0, category.numberOfFiltersShown );
        category.showFilterText = true;
        category.isServerSearch = true;
        var isMembersSelected = category.filterValues.filter( function( filterValue ) {
            return filterValue.selected === true;
        } ).length > 0;
        category.expand = isMembersSelected ? category.expand : processCategories ? false : category.expand;
    }
};

/**
 * This method is to do post processing after getOcc* SOA call is done. This includes populating Subset panel's
 * Viewmodel data, clearing temp variables in ctx and resetting panel.
 * @param {Object} data viewmodel data object
 */
export let performPostProcessingOnLoad = function( data ) {
    //process recipe only when recipe is updated( via filters apply or recipe term change )
    if( appCtxSvc.ctx[ _contextKey ].context.updatedRecipe ||
        appCtxSvc.ctx[ _contextKey ].context.appliedFilters ||
        appCtxSvc.ctx[ _contextKey ].context.contentRemoved === true ) {
        if( data ) {
            data.recipe = _.cloneDeep( appCtxSvc.ctx[ _contextKey ].context.recipe );
        }

        //Publish the event so that any views that are interested when the PWA contents are updated
        //due to filter/recipe change update as necessary. Currently, this will be used by 3D Viewer.
        eventBus.publish( 'primaryWorkArea.contentsReloaded', {
            viewToReact: appCtxSvc.ctx[ _contextKey ].key
        } );
        _removeTempRecipeObjFromAppCtx();
    }
};

/**
 * This method is to post process the occgmmtContext object and remove the updatedRecipe and appliedFilters
 * objects from there. These are temp variables created only to hold the changes for creating the SOA input.
 */
function _removeTempRecipeObjFromAppCtx() {
    if( appCtxSvc.ctx[ _contextKey ].context.updatedRecipe ) {
        delete appCtxSvc.ctx[ _contextKey ].context.updatedRecipe;
    }
    if( appCtxSvc.ctx[ _contextKey ].context.appliedFilters ) {
        delete appCtxSvc.ctx[ _contextKey ].context.appliedFilters;
    }
    if( appCtxSvc.ctx[ _contextKey ].context.effectiveFilterString ) {
        delete appCtxSvc.ctx[ _contextKey ].context.effectiveFilterString;
    }
    if( appCtxSvc.ctx[ _contextKey ].context.effectiveRecipe ) {
        delete appCtxSvc.ctx[ _contextKey ].context.effectiveRecipe;
    }
}

var updateFilterInfo = function( filterCategories, filterValues, recipe, processCategories ) {
    var processedCategories;
    if( filterCategories && filterCategories.length > 0 ) {
        processedCategories = processRawFilterInfo( filterCategories, filterValues, recipe, processCategories );
    }
    /**
     * The filter params are not cleared from the URL when those should be because of lack of control over sequence of events.
     * The following block will keep the URL consistent in such cases.
     */
    clearFilterInfoFromURL();
    updateCategories( processedCategories, processCategories );
};

/**
 * Select the given ACE filter category
 *
 * @param {Object} category given category to select
 */
export let selectCategory = function( category ) {
    if( category.categoryType !== 'Proximity' && category.filterValues.length > 0 ) {
        var rawCategories = getRawCategoriesAndCategoryValues( appCtxSvc.ctx[ _contextKey ].context.productContextInfo.uid );
        aceFilterService.selectGivenCategory( category, _contextKey + '.context.categoriesToRender',
            rawCategories, _contextKey );
        updateSpatialFilterData( appCtxSvc.ctx[ _contextKey ].context.categoriesToRender );
        updatePartitionCategory( category, rawCategories );
    }
};

var omitUnwantedProperties = function( recipe, propertiesToOmit ) {
    var outRecipe = [];
    if( recipe ) {
        recipe.forEach( function( term ) {
            var outTerm = _.omit( term, propertiesToOmit );
            if( outTerm.subCriteria && outTerm.subCriteria.length > 0 ) {
                outTerm.subCriteria = omitUnwantedProperties( outTerm.subCriteria, propertiesToOmit );
            }
            outRecipe.push( outTerm );
        } );
    }
    return outRecipe;
};

/**
 * This method is to do post processing of recipes after getSubsetInfo3 SOA call is done.
 * This includes populating Subset panel's Viewmodel data
 * @param {Object} recipes list of recipes
 * @param {Object} data viewmodel data object
 */
var processRecipeFromSubsetResponse = function( recipes, data ) {
    var aceActiveContext = appCtxSvc.getCtx( _contextKey ).context;
    if( aceActiveContext ) {
        aceActiveContext.recipe = recipes;
        if( data ) {
            data.recipe = _.cloneDeep( appCtxSvc.ctx[ _contextKey ].context.recipe );
            data.showMore.propertyDisplayName = getMoreLinkText( data.recipe );
            if( !_.isEmpty( data.recipe ) && !appCtxSvc.ctx[ _contextKey ].context.currentState.filter ) {
                var productContextChangeData = {
                    newProductContextUID: appCtxSvc.ctx[ _contextKey ].context.currentState.pci_uid
                };
            }
            clearRecipeCache( data, false );
        }
    }
};

/**
 * This function will process Filter Categories for which no filter values were sent by the server.
 * The aim of this function is to render such categories as Collapsed by default.
 * @param {object} categories existing categories
 */
var updateCollapsedCategoryFilterData = function( categories ) {
    _.forEach( categories, function( category ) {
        if( applicableCategoryTypes.includes( category.categoryType ) && category.filterValues.length === 0 ) {
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
 * Update the Filter data of all category when we switch to discovery indexed
 * This is for the use case when we are switching from ace indexed to discovery indexed
 * @param {object} categories existing categories
 */
var updateSpatialFilterData = function( categories ) {
    var aceActiveContext = appCtxSvc.getCtx( _contextKey ).context;

    if( aceActiveContext.supportedFeatures.Awb0EnableSmartDiscoveryFeature ) {
        _.forEach( categories, function( category ) {
            for( var i = 0; i < category.filterValues.length; i++ ) {
                category.filterValues[ i ].showColor = false;
            }
        } );
    }
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

    var rawCategories = getRawCategoriesAndCategoryValues( appCtxSvc.ctx[ _contextKey ].context.productContextInfo.uid );
    var filterValues = rawCategories.rawCategoryValues;
    for( var filter in filterValues ) {
        if( filter === context.category.internalName ) {
            contextSearchCtx.searchFilterMap[ filter ] = filterValues[ filter ];
            break;
        }
    }
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
 * @param {Object} result filter map from facet search response
 * @param {Object} data viewmodel data object
 * @returns {Object} updated filters in the category(facet)
 */
export let updateFilterMapForFacet = function( result, data ) {
    // This function is call to process the performFacetSearch SOA response.
    // This is called when More... is clicked and search within the facet.
    // The current category(activeFilter) need to be set on search context so that
    // awSearchFilterService.setMapForFilterValueSearch can compute the filtermap values correctly
    var contextSearchCtx = appCtxSvc.getCtx( 'search' );
    contextSearchCtx.activeFilter = contextSearchCtx.valueCategory;

    // Get the updated merged filter map values
    var updatedFilterMap = awSearchFilterService.setMapForFilterValueSearch( result.searchFilterMap, contextSearchCtx );

    // Retrieve the category and filter values for the category that the perform facet search was done
    var updatedCatName;
    var updatedFilterValues;
    for( var updatedFilter in updatedFilterMap ) {
       if ( contextSearchCtx.valueCategory && updatedFilter === contextSearchCtx.valueCategory.internalName ) {
           updatedCatName = updatedFilter;
           updatedFilterValues = updatedFilterMap[ updatedCatName ];
           break;
       }
    }

    // Update the local cache with updated merged filter values
    var rawCategoriesInfo = getRawCategoriesAndCategoryValues( appCtxSvc.ctx[ _contextKey ].context.productContextInfo.uid );
    var rawCategoryValues = rawCategoriesInfo.rawCategoryValues;
    for( var rawCategoryValue in rawCategoryValues ) {
        if( rawCategoryValue === updatedCatName ) {
            if( data.delayedApply ) {
                syncFiltersInCacheOnFacetSearch( updatedFilterValues, updatedCatName, contextSearchCtx.valueCategory.filterBy );
            }
            rawCategoryValues[ rawCategoryValue ] = updatedFilterValues;
            break;
        }
    }
    var rawCategories = rawCategoriesInfo.rawCategories;
    for( var rawCategory in rawCategories ) {
        if( rawCategories[ rawCategory ].internalName === updatedCatName ) {
            rawCategories[ rawCategory ].hasMoreFacetValues = result.hasMoreFacetValues;
            rawCategories[ rawCategory ].endReached = !result.hasMoreFacetValues;
            rawCategories[ rawCategory ].startIndexForFacetSearch = result.endIndex;
            rawCategories[ rawCategory ].endIndex = result.endIndex;
        }
    }

    updateFilterInfo( rawCategoriesInfo.rawCategories, rawCategoriesInfo.rawCategoryValues, rawCategoriesInfo.recipe, false /*prcoess Empty Filter Categories*/ );

    if( data.delayedApply ) {
        clearFilterSearchStringOnCtx();
    }

    return updatedFilterMap;
};

export let applyFilter = function( data ) {
    appCtxSvc.ctx[ _contextKey ].context.requestPref.filterOrRecipeChange = true;
    appCtxSvc.ctx[ _contextKey ].context.requestPref.calculateFilters = true;

    // First clear the incontext state when applying attribute filter.
    if( appCtxSvc.ctx[ _contextKey ].context.currentState !== undefined ) {
        appCtxSvc.ctx[ _contextKey ].context.currentState.incontext_uid = null;
    }

    appCtxSvc.updatePartialCtx( _contextKey + jitterFreeContextState, true );
    appCtxSvc.updatePartialCtx( _contextKey + jitterFreePropLoad, true );

    // Clear selections when filters are being applied or modified in both single select and multiselect scenario
    //TODO - just check if selections needs to be cleared when Spatial filter is applied.
    appCtxSvc.ctx[ _contextKey ].context.clearExistingSelections = true;
    /**
     * TODO:Shanthala:This was in proximity filter service...what to do?
     */
    if( appCtxSvc.getCtx( _contextKey + '.context.pwaSelectionModel.multiSelectEnabled' ) ) {
        appCtxSvc.updatePartialCtx( _contextKey + '.context.clearExistingSelections', true );
    }

    // Update context with any applied recipes. This is up to date recipe passed in SOA input
    var effectiveRecipe = appCtxSvc.ctx[ _contextKey ].context.effectiveRecipe;
    if( effectiveRecipe ) {
        effectiveRecipe = omitUnwantedProperties( effectiveRecipe, [ '$$hashKey' ] );
        appCtxSvc.updatePartialCtx( _contextKey + '.context.updatedRecipe', effectiveRecipe );
    }

    clearRecipeCacheOnApplyFilter( data );

    // Trigger reload
    eventBus.publish( 'acePwa.reset' );
};

export let clearRecipeCacheOnApplyFilter = function( data ) {
    //TODO:Shanthala: Ideally this should be done after the apply of filter is complete. But that is not working.
    // Clear recipe cache and category logic map once transient filters are applied
    clearRecipeCache( data, true );
    pciToCategoryLogicMap = [];
};

/**
 * Create an Recipe for a selected filter value
 * @param {Object} category - Filter category object of the selected filter value.
 * @param {object} filter - Selected filter value.
 * @param {object} recipes - The existing recipes.
 * @return {object} Criteria recipe
 */
var createRecipeForGivenCategory = function( category, filter, recipes ) {
    var criteriaVal = [];
    var recipeOperator = appCtxSvc.ctx[ _contextKey ].context.recipeOperator;
    var recipeExists;
    // TODO : in AW5.2 Partitions are shown as Psuedo Hierachy by appending "- " in front
    // To Populate Recipe We need Only its display name, so replacing "- " pattern from start of filter name to ''
    // This needs to be cleaned up once Partitions are showned using aw-tree widget.
    var displayFilterValue = filter.name.replace( new RegExp( '^(\- )*', 'g' ), '' );
    if( isTCVersion132OrLater() ) {
        var aceActiveContext = appCtxSvc.getCtx( _contextKey ).context;
        var pciUID = aceActiveContext.productContextInfo.uid;
        var categoryLogicEntry = pciToCategoryLogicMap.filter( function( x ) {
            return x.pciUid === pciUID;
        } );
        if( categoryLogicEntry && categoryLogicEntry.length > 0 ) {
            if( !categoryLogicEntry[ 0 ].categoryLogicMap[ category.displayName ] ) {
                recipeOperator = 'Exclude';
            }
        }
        recipeExists = getRecipeForExistingCategory( recipes, filter );

        if( recipeExists ) {
            var recipe = _.cloneDeep( recipeExists );
            // Get the filter separator value from the preference AW_FacetValue_Separator
            var filterSeparator = appCtxSvc.ctx.preferences.AW_FacetValue_Separator ? appCtxSvc.ctx.preferences.AW_FacetValue_Separator[ 0 ] : '^';
            recipe.criteriaValues.push( filter.internalName );
            recipe.criteriaDisplayValue += filterSeparator + displayFilterValue;

            return recipe;
        }
    }
    if( !recipeExists ) {
        criteriaVal.push( filter.categoryName );
        criteriaVal.push( filter.internalName );
        return {
            criteriaDisplayValue: category.displayName + '_$CAT_' + displayFilterValue,
            criteriaOperatorType: recipeOperator,
            criteriaType: category.categoryType,
            criteriaValues: criteriaVal,
            subCriteria: []
        };
    }
};

/**
 * Get the recipe for the category in the selected filter value
 * @param {object} recipes - List of recipes.
 * @param {object} filter - Selected filter value.
 * @return {object} Criteria recipe
 */
var getRecipeForExistingCategory = function( recipes, filter ) {
    var recipeForCategory;
    _.forEach( recipes, function( recipe ) {
        if( applicableCategoryTypes.includes( recipe.criteriaType ) && recipe.criteriaValues[ 0 ] === filter.categoryName ) {
            recipeForCategory = recipe;
        }
    } );
    return recipeForCategory;
};

var spatialRecipeExists = function( recipes, spatialType ) {
    var spatialExists = false;
    if ( recipes.length === 1 && recipes[0].criteriaOperatorType === 'Clear' && recipes[0].criteriaType === spatialType ) {
        return false;
    }
    for( var index = 0; index < recipes.length; index++ ) {
        if( recipes[index].criteriaType === spatialType ) {
            spatialExists = true;
            break;
        }
    }
    return spatialExists;
};

var isSpatialRecipe = function( recipe ) {
    var isSpatial = false;
    if( recipe.criteriaType === 'Proximity' || recipe.criteriaType === 'BoxZone' || recipe.criteriaType === 'PlaneZone' ) {
        isSpatial = true;
    }
    return isSpatial;
};

var syncSpatialWithRecipeOnNavigateBack = function( currentRecipes, spatialType ) {
    if ( !spatialRecipeExists( currentRecipes, spatialType ) ) {
        syncFilterInfo( 'SpatialSearch', spatialType, false, false );
    } else  if ( spatialRecipeExists( currentRecipes, spatialType ) ) {
        syncFilterInfo( 'SpatialSearch', spatialType, true, false );
    }
};

/**
 * Update  recipe  with updated  values  for  same  category
 * @param {object} recipes - List of recipes.
 * @param {object} newRecipe - recipe to be updated if category exists.

 * @return {boolean} true if recipe  is  updated
 */
var replaceRecipeForExistingCategory = function( recipes, newRecipe ) {
    var replaceRecipe = false;
    if( applicableCategoryTypes.includes( newRecipe.criteriaType ) ) {
        for( var index = 0; index < recipes.length; index++ ) {
            if( recipes[ index ].criteriaValues[ 0 ] === newRecipe.criteriaValues[ 0 ] ) {
                recipes[ index ] = newRecipe;
                replaceRecipe = true;
                break;
            }
        }
    } else if( newRecipe.criteriaType === 'SelectedElement' ) {
        for( var index = 0; index < recipes.length; index++ ) {
            if( recipes[ index ].criteriaType === newRecipe.criteriaType &&
                recipes[ index ].criteriaOperatorType === newRecipe.criteriaOperatorType ) {
                updateSelectedElementRecipeTerm( recipes[ index ], newRecipe );
                replaceRecipe = true;
                break;
            }
        }
    }
    return replaceRecipe;
};

/**
 * This function will update selected recipe term display values and criteria values
 * them as an array.
 *
 * @param {Object} matchedRecipe : Existing Selected Element recipe
 * @param {String} newRecipe : Selected Element to be added
 */
var updateSelectedElementRecipeTerm = function( matchedRecipe, newRecipe ) {
    // Get the filter separator value from the preference AW_FacetValue_Separator
    var filterSeparator = appCtxSvc.ctx.preferences.AW_FacetValue_Separator ? appCtxSvc.ctx.preferences.AW_FacetValue_Separator[ 0 ] : '^';
    var selectedElementsDisplay = selectedTerms( newRecipe.criteriaDisplayValue, filterSeparator );
    // Add selected element if not already present in recipe and update the display value
    for( var index = 0; index < newRecipe.criteriaValues.length; index++ ) {
        if( !matchedRecipe.criteriaValues.includes( newRecipe.criteriaValues[ index ] ) ) {
            matchedRecipe.criteriaDisplayValue += filterSeparator + selectedElementsDisplay[ index ];
            matchedRecipe.criteriaValues.push( newRecipe.criteriaValues[ index ] );
        }
    }
};

/**
  * Update  recipe  with updated  values  for  same  category
  * @param {object} recipes - List of recipes.
  * @param {object} newRecipe - recipe to be updated if category exists.

  * @return {boolean} true if recipe  is  updated
  */
var removeElementFromSelectedTerm = function( recipes, newRecipe ) {
    var filterSeparator = appCtxSvc.ctx.preferences.AW_FacetValue_Separator ? appCtxSvc.ctx.preferences.AW_FacetValue_Separator[ 0 ] : '^';

    for( var index = 0; index < recipes.length; index++ ) {
        if( recipes[ index ].criteriaType === newRecipe.criteriaType &&
            recipes[ index ].criteriaOperatorType === newRecipe.criteriaOperatorType ) {
            var matchedRecipe = recipes[ index ];
            var selectedElementsDisplay = selectedTerms( matchedRecipe.criteriaDisplayValue, filterSeparator );

            // Add selected element if not already present in recipe
            // Concat the display value
            for( var i in selectedElementsDisplay ) {
                if( !newRecipe.criteriaDisplayValue.includes( selectedElementsDisplay[ i ] ) ) {
                    // Update criteria display value
                    var caretBeforeDisplayValue = filterSeparator + selectedElementsDisplay[ i ];
                    var caretAfterDisplayValue = selectedElementsDisplay[ i ] + filterSeparator;
                    if( matchedRecipe.criteriaDisplayValue.includes( caretBeforeDisplayValue ) ) {
                        matchedRecipe.criteriaDisplayValue = matchedRecipe.criteriaDisplayValue.replace( caretBeforeDisplayValue, '' );
                    } else {
                        matchedRecipe.criteriaDisplayValue = matchedRecipe.criteriaDisplayValue.replace( caretAfterDisplayValue, '' );
                    }
                }
            }
            // Update the criteria values
            var indexToRemove = -1;
            for( var j in matchedRecipe.criteriaValues ) {
                if( !newRecipe.criteriaValues.includes( matchedRecipe.criteriaValues[ j ] ) ) {
                    indexToRemove = j;
                    break;
                }
            }
            matchedRecipe.criteriaValues.splice( indexToRemove, 1 );
            break;
        }
    }
};

/**
 * This function will extract all selected terms in the input recipe criteria and return
 * them as an array.
 *
 * @param {String} recipeDisplayName : Recipe Criteria Display Name
 * @param {String} filterSeparator : Filter Separator between the selected terms
 * @return {String[]} : An array of all selected terms in the input recipe criteria.
 */
var selectedTerms = function( recipeDisplayName, filterSeparator ) {
    var recipeValuesString = recipeDisplayName.split( '_$CAT_' )[ 1 ];
    var allSelectedTerms = {};
    if( recipeValuesString ) {
        allSelectedTerms = recipeValuesString.split( filterSeparator );
    }
    return allSelectedTerms;
};

/*
 * Get the supported TC version for multi valued attribute
 */
var isTCVersion132OrLater = function() {
    var isVersionSupported = false;
    var tcMajor = tcSessionData.getTCMajorVersion();
    var tcMinor = tcSessionData.getTCMinorVersion();
    // If platform  is 13.2 or greater then return true
    if( tcMajor >= 13 && tcMinor >= 2 || tcMajor >= 14 ) {
        isVersionSupported = true;
    }
    return isVersionSupported;
};

/*
 * Remove attribute criteria value for same category
 */
var removeCriteriaValueFromCategory = function( recipe, filter ) {
    if( applicableCategoryTypes.includes( recipe.criteriaType ) && isTCVersion132OrLater() ) {
        // Get the filter separator value from the preference AW_FacetValue_Separator
        var filterSeparator = appCtxSvc.ctx.preferences.AW_FacetValue_Separator ? appCtxSvc.ctx.preferences.AW_FacetValue_Separator[ 0 ] : '^';
        recipe.criteriaValues.splice( recipe.criteriaValues.indexOf( filter.internalName ), 1 );
        var caretInFrontDisplayValue = filterSeparator + filter.name;
        var caretInBacktDisplayValue = filter.name + filterSeparator;
        if( recipe.criteriaDisplayValue.includes( caretInFrontDisplayValue ) ) {
            recipe.criteriaDisplayValue = recipe.criteriaDisplayValue.replace( caretInFrontDisplayValue, '' );
        } else {
            recipe.criteriaDisplayValue = recipe.criteriaDisplayValue.replace( caretInBacktDisplayValue, '' );
        }
    }
};

/*
 * Find the given filter in the transient recipe list
 */
var findFilterInTransientRecipeList = function( recipes, filter ) {
    var recipeFound;
    for( var entry in recipes ) {
        if( applicableCategoryTypes.includes( recipes[ entry ].criteriaType ) && recipes[ entry ].criteriaValues[ 0 ] === filter.categoryName ) {
            for( var index = 1; index < recipes[ entry ].criteriaValues.length; index++ ) {
                if( recipes[ entry ].criteriaValues[ index ] === filter.internalName ) {
                    recipeFound = recipes[ entry ];
                    break;
                }
            }
        }
    }
    return recipeFound;
};

/*
 * Add or update an attribute criteria in transient recipe list when filter is selected or deselected
 */
var updateRecipeToCacheForCurrentPCI = function( category, filter, data ) {
    // Clone the current recipe if needed.
    cloneCurrentRecipesIfNeeded();

    var occMgmtCtx = appCtxSvc.getCtx( _contextKey ).context;
    var productContextInfoUID = occMgmtCtx.productContextInfo.uid;
    var transientRecipes = lookupRecipesInfoInCache( productContextInfoUID );
    var foundInTransientRecipe = findFilterInTransientRecipeList( transientRecipes, filter );

    // filter.selected gives the current state of the filter that is before the user selection/deselection
    if( !filter.selected ) {
        // User is selecting the filter.
        // Create a new criteria and update the cache if it is already not in current recipe list

        var recipeToAdd = createRecipeForGivenCategory( category, filter, data.recipe );

        addRecipeToCacheForCurrentPCI( data, recipeToAdd );
    } else {
        // User is deselecting the filter. Remove it from transient recipe list
        if( foundInTransientRecipe ) {
            var recipesToDelete = [];
            recipesToDelete.push( foundInTransientRecipe );
            if( transientRecipes.length > 1 && category.type === filterPanelUtils.DATE_FILTER ) {
                // Remove the orphan dates from the transient recipe for the deselected date
                var clonedFilterValues = _.cloneDeep( category.filterValues );
                var dateFilterValues = getOrphanDateEntries( clonedFilterValues, filter );
                var orphanRecipes = removeOrphanDatesFromRecipes( transientRecipes, dateFilterValues );
                if( orphanRecipes && orphanRecipes.length > 0 ) {
                    for( var i = 0; i < orphanRecipes.length; i++ ) {
                        recipesToDelete.push( orphanRecipes[ i ] );
                    }
                }
                updateSingleValueRecipeTermToDisplay( data, recipesToDelete );
            }
            if( transientRecipes.length === 1 && transientRecipes[ 0 ].criteriaValues.length === 2 ) {
                // The last recipe is being deselected
                transientRecipes[ 0 ].criteriaOperatorType = 'Clear';
                // Update view model recipe
                data.recipe = [];
            } else {
                if( foundInTransientRecipe.criteriaValues.length > 2 ) {
                    // Attribute recipe with multiple values
                    removeCriteriaValueFromCategory( foundInTransientRecipe, filter );
                    updateMultiValueRecipeTermToDisplay( data, recipesToDelete, true );
                } else {
                    transientRecipes.splice( transientRecipes.indexOf( foundInTransientRecipe ), 1 );
                    updateSingleValueRecipeTermToDisplay( data, recipesToDelete );
                }
            }

            replaceRecipesToCacheForCurrentPCI( transientRecipes );
        }
    }
};

/*
 * Removes the orphan date filters from the recipe
 */
var removeOrphanDatesFromRecipes = function( recipes, orphanDateFilters ) {
    var orphanRecipes = [];
    for( var i = 0; i < orphanDateFilters.length; i++ ) {
        var foundOrphanRecipe = findFilterInTransientRecipeList( recipes, orphanDateFilters[ i ] );
        if( foundOrphanRecipe ) {
            orphanRecipes.push( foundOrphanRecipe );
            recipes.splice( recipes.indexOf( foundOrphanRecipe ), 1 );
        }
    }
    return orphanRecipes;
};

/*
 * Removes the filter if present from the filterValues and returns the orphan date entries in the filterValues.
 */
var getOrphanDateEntries = function( filterValues, filter ) {
    var dateFilters = [];
    if( filter === null || filter.internalName === undefined ) {
        dateFilters = filterValues;
    } else {
        for( var value in filterValues ) {
            if( filterValues[ value ].internalName !== filter.internalName ) {
                dateFilters.push( filterValues[ value ] );
            }
        }
    }
    return removeOrphanDateEntries( dateFilters );
};

/*
 * Add a spatial/selected element recipe
 */
export let addRecipe = function( data ) {
    // Clone the current recipe if needed.
    cloneCurrentRecipesIfNeeded();

    // add the new recipe to transient recipes map
    addRecipeToCacheForCurrentPCI( data, data.eventData.addedRecipe );

    // sync recipes in cache to update the view model
    syncRecipesInCache( data );

    if( !data.delayedApply ) {
        applyFilter( data );
    }
};

/**
 * Process the recipe update - delete of recipe, operator change on recipe, proximity value change on
 * proximity recipe
 * @param {Object} data - data.
 */
export let processRecipeOnUpdate = function( data ) {
    // Clone the current recipe if needed.
    cloneCurrentRecipesIfNeeded();

    // Update the transient recipes map
    var updatedRecipes = data.eventData.updatedRecipes;
    var deletedRecipe = data.eventData.deletedRecipe;
    updatedRecipes = omitUnwantedProperties( updatedRecipes, [ '$$hashKey' ] );

    // Remove orphan date recipes on delete
    var orphanDateRecipes = [];
    if( data.eventData.syncFilter && deletedRecipe ) {
        orphanDateRecipes = getOrphanDateRecipesOnDelete( deletedRecipe, updatedRecipes );
        for( var i = 0; i < orphanDateRecipes.length; i++ ) {
            updatedRecipes.splice( updatedRecipes.indexOf( orphanDateRecipes[ i ] ), 1 );
        }
        // The last recipe is being deleted after orphan date recipes are removed
        if( updatedRecipes.length === 0 ) {
            updatedRecipes.push( deletedRecipe );
            updatedRecipes[ 0 ].criteriaOperatorType = 'Clear';
        }
    }

    // updatedRecipes is view model recipes. Make a copy of this before updating this in transient recipe map
    var clonedUpdatedRecipes = _.cloneDeep( updatedRecipes );
    replaceRecipesToCacheForCurrentPCI( clonedUpdatedRecipes );

    var isMultiValueTermUpdated = [ false, false ];
    // Sync filter map to update the view model
    if( data.eventData.syncFilter && data.delayedApply && deletedRecipe && ( applicableCategoryTypes.includes( deletedRecipe.criteriaType ) || isSpatialRecipe( deletedRecipe ) ) ) {
        isMultiValueTermUpdated = syncFiltersInCacheOnDelete( deletedRecipe, updatedRecipes );
    } else if( data.delayedApply && deletedRecipe && deletedRecipe.criteriaType === 'SelectedElement' ) {
        isMultiValueTermUpdated = isMultiValueTermDeletedOrUpdated( deletedRecipe, updatedRecipes );
    }

    if( deletedRecipe && data.delayedApply ) {
        // Update N selected recipe to display
        if( !isMultiValueTermUpdated[ 0 ] && isMultiValueTermUpdated[ 1 ] ) {
            var eventData = {
                categoryName: deletedRecipe.criteriaValues[ 0 ],
                criteriaType: deletedRecipe.criteriaType,
                criteriaOperatorType: deletedRecipe.criteriaOperatorType
            };

            // Notify recipe term view model to update the display value
            eventBus.publish( 'awFilter.recipeTermChanged', eventData );
        } else if( updatedRecipes.length === 1 && updatedRecipes[ 0 ].criteriaOperatorType === 'Clear' ) {
            // Delete of last term so we set display as empty array
            data.recipe = [];
        } else if( deletedRecipe ) {
            var deletedRecipes = [];
            deletedRecipes.push( deletedRecipe );
            if( orphanDateRecipes && orphanDateRecipes.length > 0 ) {
                for( var i = 0; i < orphanDateRecipes.length; i++ ) {
                    deletedRecipes.push( orphanDateRecipes[ i ] );
                }
            }
            updateSingleValueRecipeTermToDisplay( data, deletedRecipes );
        }
    } else if( !deletedRecipe && data.delayedApply && data.eventData.updatedIndex && data.eventData.updatedIndex < updatedRecipes.length ) {
        // Update of Proximity term
        var recipeToUpdate = data.recipe[ data.eventData.updatedIndex ];
        data.recipe[ data.eventData.updatedIndex ] = updatedRecipes[ data.eventData.updatedIndex ];
        var eventData = {
            categoryName: recipeToUpdate.criteriaValues[ 0 ],
            criteriaType: recipeToUpdate.criteriaType,
            criteriaOperatorType: recipeToUpdate.criteriaOperatorType,
            updatedIndex: data.eventData.updatedIndex
        };

        // Notify recipe term view model to update the display value
        eventBus.publish( 'awFilter.recipeTermChanged', eventData );
    }

    // sync recipes in cache to update the view model
    syncRecipesInCache( data );

    // Populate category search criteria in requestpref
    if( appCtxSvc.getCtx( _contextKey + '.context.categorysearchcriteria' ) ) {
        appCtxSvc.ctx[ _contextKey ].context.requestPref.categorysearchcriteria = appCtxSvc
            .getCtx( _contextKey + '.context.categorysearchcriteria' );
    }

    if( !data.delayedApply ) {
        applyFilter( data );
    }
};

export let processOnNavigateBack = function( data ) {
    if ( data.delayedApply ) {
        var currentRecipes = data.recipe;
        if ( _.isEmpty( currentRecipes ) ) {
            syncFilterInfo( 'SpatialSearch', 'Proximity', false, false );
            syncFilterInfo( 'SpatialSearch', 'BoxZone', false, false );
            syncFilterInfo( 'SpatialSearch', 'PlaneZone', false, false );
        } else {
            syncSpatialWithRecipeOnNavigateBack( currentRecipes, 'Proximity' );
            syncSpatialWithRecipeOnNavigateBack( currentRecipes, 'BoxZone' );
            syncSpatialWithRecipeOnNavigateBack( currentRecipes, 'PlaneZone' );
        }

        var rawCategoriesInfo = getRawCategoriesAndCategoryValues( appCtxSvc.ctx[ _contextKey ].context.productContextInfo.uid );
        updateFilterInfo( rawCategoriesInfo.rawCategories, rawCategoriesInfo.rawCategoryValues, rawCategoriesInfo.recipe, false /*prcoess Empty Filter Categories*/ );
    }
};

/*
 * Add a given criteria(attribute/spatial) to transient recipe cache.
 */
var addRecipeToCacheForCurrentPCI = function( data, criteria ) {
    var occMgmtCtx = appCtxSvc.getCtx( _contextKey ).context;
    var pciUID = occMgmtCtx.productContextInfo.uid;
    var pciVsRecipeInfoEntry = {};

    var newRecipe = criteria;
    var newRecipes = [];
    var isRecipeReplaced = false;
    var addRecipeBeforeSelectedTerm = false;
    if( pciToTransientRecipesMap && pciToTransientRecipesMap.length > 0 ) {
        var recipesData = pciToTransientRecipesMap.filter( function( x ) {
            return x.pciUid === pciUID;
        } );

        if( recipesData && recipesData[ 0 ] ) {
            if( recipesData[ 0 ].transientRecipes.length === 1 && recipesData[ 0 ].transientRecipes[ 0 ].criteriaOperatorType === 'Clear' ) {
                recipesData[ 0 ].transientRecipes = [];
            }
            // If TC Version is 132 or greater and the new recipe category exists in transient list
            // It replaces the new updated recipe in the transient list and returns true
            if( isTCVersion132OrLater() ) {
                isRecipeReplaced = replaceRecipeForExistingCategory( recipesData[ 0 ].transientRecipes, newRecipe );
            }
            // Add the new recipe to transient list
            // If the TC Version is less that 132
            // Or if the new recipe  category is not present in transient list
            if( !isRecipeReplaced ) {
                // Include of Selected Element should be the last term in the recipe list
                var recipesLength = recipesData[ 0 ].transientRecipes.length;
                if( recipesLength > 0 &&
                    recipesData[ 0 ].transientRecipes[ recipesLength - 1 ].criteriaType === 'SelectedElement' &&
                    recipesData[ 0 ].transientRecipes[ recipesLength - 1 ].criteriaOperatorType === 'Include' ) {
                    recipesData[ 0 ].transientRecipes.splice( recipesLength - 1, 0, newRecipe );
                    addRecipeBeforeSelectedTerm = true;
                } else {
                    recipesData[ 0 ].transientRecipes.push( newRecipe );
                }
            }
        } else {
            newRecipes.push( newRecipe );
            pciVsRecipeInfoEntry = {
                pciUid: pciUID,
                transientRecipes: newRecipes
            };
            pciToTransientRecipesMap.push( pciVsRecipeInfoEntry );
        }
    } else {
        newRecipes.push( newRecipe );
        pciVsRecipeInfoEntry = { // eslint-disable-line no-redeclare
            pciUid: pciUID,
            transientRecipes: newRecipes
        };
        pciToTransientRecipesMap.push( pciVsRecipeInfoEntry );
    }

    // Clone recipe to add and update view model
    var recipeTermToAdd = _.cloneDeep( newRecipe );
    if( !isRecipeReplaced ) {
        if( !data.recipe ) {
            data.recipe = [];
        }
        if( addRecipeBeforeSelectedTerm ) {
            var includeTerm = data.recipe.pop();
            data.recipe.push( recipeTermToAdd );
            data.recipe.push( includeTerm );
        } else {
            data.recipe.push( recipeTermToAdd );
        }
    } else {
        var recipesToAdd = [];
        recipesToAdd.push( recipeTermToAdd );
        updateMultiValueRecipeTermToDisplay( data, recipesToAdd, false );
    }
};

/**
 * Replace the given recipes in the transient recipe map for the current pciuid
 * @param {Object} updatedRecipes updated list of recipes
 */
var replaceRecipesToCacheForCurrentPCI = function( updatedRecipes ) {
    var occMgmtCtx = appCtxSvc.getCtx( _contextKey ).context;
    var productContextInfoUID = occMgmtCtx.productContextInfo.uid;

    var recipesData;
    if( pciToTransientRecipesMap && pciToTransientRecipesMap.length > 0 ) {
        recipesData = pciToTransientRecipesMap.filter( function( x ) {
            return x.pciUid === productContextInfoUID;
        } );
    }
    if( recipesData && recipesData[ 0 ] ) {
        recipesData[ 0 ].transientRecipes = updatedRecipes;
    }
};

/*
 * Create an initial list of transient recipes from the existing persistent recipes.
 * The cloned list is created on the first edit before the apply.
 */
var cloneCurrentRecipesIfNeeded = function() {
    var occMgmtCtx = appCtxSvc.getCtx( _contextKey ).context;
    var productContextInfoUID = occMgmtCtx.productContextInfo.uid;
    var clonedRecipes = _.cloneDeep( occMgmtCtx.recipe );
    clonedRecipes = omitUnwantedProperties( clonedRecipes, [ '$$hashKey' ] );

    if( clonedRecipes.length > 0 ) {
        var transientRecipes = lookupRecipesInfoInCache( productContextInfoUID );
        if( transientRecipes === undefined ) {
            // There is no entry in pciToRecipeMap for the current pciuid yet.
            // Create an entry and add the cloned recipes
            var newRecipes = [];
            _.forEach( clonedRecipes, function( currentRecipe ) {
                newRecipes.push( currentRecipe );
            } );
            var pciVsRecipeInfoEntry = { // eslint-disable-line no-redeclare
                pciUid: productContextInfoUID,
                transientRecipes: newRecipes
            };
            pciToTransientRecipesMap.push( pciVsRecipeInfoEntry );
        } else if( transientRecipes.length === 0 ) {
            _.forEach( clonedRecipes, function( currentRecipe ) {
                transientRecipes.push( currentRecipe );
            } );
            replaceRecipesToCacheForCurrentPCI( transientRecipes );
        }
    }
};

/*
 * Lookup and return the transient recipes for the given product context info uid
 */
var lookupRecipesInfoInCache = function( productContextInfoUID ) {
    var transientRecipes;
    var recipesData;
    if( pciToTransientRecipesMap && pciToTransientRecipesMap.length > 0 ) {
        recipesData = pciToTransientRecipesMap.filter( function( x ) {
            return x.pciUid === productContextInfoUID;
        } );
    }
    if( recipesData && recipesData[ 0 ] ) {
        return omitUnwantedProperties( recipesData[ 0 ].transientRecipes, [ '$$hashKey' ] );
    }
    return transientRecipes;
};

var updateMultiValueRecipeTermToDisplay = function( data, recipesToRemove, isDelete ) {
    if( data && data.recipe && recipesToRemove ) {
        _.forEach( recipesToRemove, function( recipeTerm ) {
            // This is the multi value scenario where one of the values is removed
            // so we replace the recipe in the list

            // Change term from N selected to M selected
            if( recipeTerm.criteriaType === 'SelectedElement' ) {
                if( !isDelete ) {
                    replaceRecipeForExistingCategory( data.recipe, recipeTerm );
                } else {
                    removeElementFromSelectedTerm( data.recipe, recipeTerm );
                }
                var eventData = {
                    categoryName: recipeTerm.criteriaValues[ 0 ],
                    criteriaType: recipeTerm.criteriaType,
                    criteriaOperatorType: recipeTerm.criteriaOperatorType
                };

                // Notify recipe term view model to update the display value
                eventBus.publish( 'awFilter.recipeTermChanged', eventData );
            } else {
                var criteriaValuesInUpdatedRecipe = recipeTerm.criteriaValues;
                for( var recipe in data.recipe ) {
                    var recipeTermToUpdate = data.recipe[ recipe ];
                    var isRemoveOfCriteriaValue = false;
                    if( recipeTermToUpdate.criteriaValues[ 0 ] === criteriaValuesInUpdatedRecipe[ 0 ] ) {
                        var filterSeparator = appCtxSvc.ctx.preferences.AW_FacetValue_Separator ? appCtxSvc.ctx.preferences.AW_FacetValue_Separator[ 0 ] : '^';

                        for( var idx = 1; idx < recipeTermToUpdate.criteriaValues.length; idx++ ) {
                            // Remove of criteria values
                            if( !criteriaValuesInUpdatedRecipe.includes( recipeTermToUpdate.criteriaValues[ idx ] ) ) {
                                isRemoveOfCriteriaValue = true;
                                // Update criteria display value

                                var selectedTermsDisplayValues = selectedTerms( recipeTermToUpdate.criteriaDisplayValue, filterSeparator );

                                var caretBeforeDisplayValue = filterSeparator + selectedTermsDisplayValues[ idx - 1 ];
                                var caretAfterDisplayValue = selectedTermsDisplayValues[ idx - 1 ] + filterSeparator;
                                if( recipeTermToUpdate.criteriaDisplayValue.includes( caretBeforeDisplayValue ) ) {
                                    recipeTermToUpdate.criteriaDisplayValue = recipeTermToUpdate.criteriaDisplayValue.replace( caretBeforeDisplayValue, '' );
                                } else {
                                    recipeTermToUpdate.criteriaDisplayValue = recipeTermToUpdate.criteriaDisplayValue.replace( caretAfterDisplayValue, '' );
                                }

                                recipeTermToUpdate.criteriaValues.splice( idx, 1 );
                                break;
                            }
                        }

                        if( !isRemoveOfCriteriaValue && !recipeTermToUpdate.criteriaValues.includes( criteriaValuesInUpdatedRecipe ) ) {
                            //Add of criteria values
                            recipeTermToUpdate.criteriaValues = criteriaValuesInUpdatedRecipe;
                            recipeTermToUpdate.criteriaDisplayValue = recipeTerm.criteriaDisplayValue;
                        }

                        var eventData = {
                            categoryName: recipeTermToUpdate.criteriaValues[ 0 ],
                            criteriaType: recipeTermToUpdate.criteriaType,
                            criteriaOperatorType: recipeTermToUpdate.criteriaOperatorType
                        };
                        // Notify recipe term view model to update the display value
                        eventBus.publish( 'awFilter.recipeTermChanged', eventData );
                    }
                }
            }
        } );
    }
};

var updateSingleValueRecipeTermToDisplay = function( data, recipesToRemove ) {
    if( data && data.recipe && recipesToRemove ) {
        var indicesToRemove = [];
        _.forEach( recipesToRemove, function( recipeTerm ) {
            for( var i = 0; i < data.recipe.length; i++ ) {
                if( data.recipe[ i ].criteriaValues[ 0 ] === recipeTerm.criteriaValues[ 0 ] &&
                    data.recipe[ i ].criteriaValues.length === recipeTerm.criteriaValues.length &&
                    data.recipe[ i ].criteriaDisplayValue === recipeTerm.criteriaDisplayValue ) {
                    indicesToRemove.push( i );
                }
            }
        } );

        while( indicesToRemove.length ) {
            data.recipe.splice( indicesToRemove.pop(), 1 );
        }
    }
};

/*
 * Process the transient recipes(attribute/spatial) in cache to update the view model.
 * Also persist the effective recipes and effective filter string applied on the context
 * to be accessed on apply.
 */
var syncRecipesInCache = function( data ) {
    var occMgmtCtx = appCtxSvc.getCtx( _contextKey ).context;

    // Retrieve all the transient recipe list
    var productContextInfoUID = occMgmtCtx.productContextInfo.uid;
    var transientRecipes = lookupRecipesInfoInCache( productContextInfoUID );

    // Add all the selected transient recipes to the new recipe list.
    // Remove all the deselected transient recipes from the
    // new recipe(which includes current recipe) list.
    var recipesToDisplay = [];
    if( transientRecipes ) {
        // This is persisted recipe list
        var currentRecipes = _.cloneDeep( occMgmtCtx.recipe );
        currentRecipes = omitUnwantedProperties( currentRecipes, [ '$$hashKey' ] );

        if( data.delayedApply ) {
            var transientRecipesToDisplay = [];
            _.forEach( transientRecipes, function( transientRecipe ) {
                if( transientRecipe.criteriaOperatorType !== 'Clear' ) {
                    transientRecipesToDisplay.push( transientRecipe );
                }
            } );
            data.enableApply = areRecipesChanged( currentRecipes, transientRecipesToDisplay );
            recipesToDisplay = transientRecipesToDisplay;
        }
        updateRecipeOnContext( transientRecipes );
    } else {
        data.enableApply = false;
        updateCtxRecipeInfoFromCache( productContextInfoUID );
        data.recipe = _.cloneDeep( occMgmtCtx.recipe );
        recipesToDisplay = data.recipe;
    }
    if( data.recipe && data.recipe.length === 1 ) {
        // Re-evaluate validity of Include/Exclude commands
        // when first recipe term is added
        var validSelectedObjects = occmgmtSubsetUtils.validateSelectionsToBeInSingleProduct();
        validateTermsToIncludeOrExclude( validSelectedObjects );
    } else if( data.recipe && data.recipe.length === 0 ) {
        _.set( appCtxSvc, 'ctx.filter.validSelectionsToIncludeOrExclude', false );
    }
    data.showMore.propertyDisplayName = getMoreLinkText( data.recipe );
    return recipesToDisplay;
};

/*
 * Check if the list of current recipes are different from the list of transient recipes.
 */
var areRecipesChanged = function( currentRecipes, newRecipes ) {
    if( currentRecipes.length !== newRecipes.length ) {
        // recipe is added or deleted
        return true;
    }
    if( currentRecipes.length === 0 && newRecipes.length === 0 ) {
        // No change
        return false;
    }
    for( var i = 0; i < newRecipes.length; i++ ) {
        if( newRecipes[ i ].criteriaType !== currentRecipes[ i ].criteriaType ||
            newRecipes[ i ].criteriaOperatorType !== currentRecipes[ i ].criteriaOperatorType ||
            newRecipes[ i ].criteriaValues.length !== currentRecipes[ i ].criteriaValues.length ) {
            return true;
        }
        for( var j = 0; j < newRecipes[ i ].criteriaValues.length; j++ ) {
            if( newRecipes[ i ].criteriaValues[ j ] !== currentRecipes[ i ].criteriaValues[ j ] ) {
                return true;
            }
        }
    }
    return false;
};

/*
 * Update the local pci to filter values cache and update the view model given selected/deselected filter
 */
var syncFiltersInCacheOnFilterChange = function( category, filter ) {
    // filter.selected gives the current state of the filter that is before the user selection/deselection
    if( applicableCategoryTypes.includes( category.categoryType ) ) {
        syncFilterInfo( filter.categoryName, filter.internalName, !filter.selected, true );
        clearFilterSearchStringOnCtx();
    }

    // Sync for orphan dates
    if( category.type === filterPanelUtils.DATE_FILTER ) {
        var filterValues = _.cloneDeep( category.filterValues );
        var dateRemovedEntries = getOrphanDateEntries( filterValues, filter );
        for( var index = 0; index < dateRemovedEntries.length; index++ ) {
            syncFilterInfo( dateRemovedEntries[ index ].categoryName, dateRemovedEntries[ index ].internalName, false, true );
        }
    }
};

var isMultiValueTermDeletedOrUpdated = function( deletedRecipe, updatedRecipe ) {
    var criteriaValuesInDelete = deletedRecipe.criteriaValues;
    var clearAllValues = false;
    var recipeFound = false;
    for( var index in updatedRecipe ) {
        if( updatedRecipe[ index ].criteriaType === 'SelectedElement' &&
            updatedRecipe[ index ].criteriaOperatorType === deletedRecipe.criteriaOperatorType ) {
            recipeFound = true;
        } else if( updatedRecipe[ index ].criteriaValues[ 0 ] === criteriaValuesInDelete[ 0 ] ) {
            recipeFound = true;
        }
        if( updatedRecipe[ index ].criteriaOperatorType === 'Clear' ) {
            clearAllValues = true;
        }
        if( recipeFound ) {
            break;
        }
    }
    return [ clearAllValues, recipeFound ];
};

/*
 * Update the local pci to filter values cache and update the view model given deleted recipe
 */
var syncFiltersInCacheOnDelete = function( deletedRecipe, updatedRecipe ) {
    var needUpdate = false;
    var multiValueTermDeletedOrUpdated = [ false, false ];
    if( applicableCategoryTypes.includes( deletedRecipe.criteriaType ) ) {
        multiValueTermDeletedOrUpdated = isMultiValueTermDeletedOrUpdated( deletedRecipe, updatedRecipe );
        var criteriaValuesInDelete = deletedRecipe.criteriaValues;

        if( multiValueTermDeletedOrUpdated[ 0 ] || !multiValueTermDeletedOrUpdated[ 1 ] ) {
            // Entire recipe term is deleted
            for( var inx = 1; inx < criteriaValuesInDelete.length; inx++ ) {
                syncFilterInfo( criteriaValuesInDelete[ 0 ], criteriaValuesInDelete[ inx ], false, false );
                needUpdate = true;
            }
        } else {
            // Value in recipe term is deleted, sync filter value
            for( var recipe in updatedRecipe ) {
                if( updatedRecipe[ recipe ].criteriaValues[ 0 ] === criteriaValuesInDelete[ 0 ] ) {
                    for( var idx = 1; idx < criteriaValuesInDelete.length; idx++ ) {
                        if( !updatedRecipe[ recipe ].criteriaValues.includes( criteriaValuesInDelete[ idx ] ) ) {
                            syncFilterInfo( criteriaValuesInDelete[ 0 ], criteriaValuesInDelete[ idx ], false, true );
                            break;
                        }
                    }
                }
            }
        }
        clearFilterSearchStringOnCtx();
    }
    if ( isSpatialRecipe( deletedRecipe ) && !spatialRecipeExists( updatedRecipe, deletedRecipe.criteriaType ) ) {
       syncFilterInfo( 'SpatialSearch', deletedRecipe.criteriaType, false, false );
       needUpdate = true;
    }
    if ( needUpdate ) {
        var rawCategoriesInfo = getRawCategoriesAndCategoryValues( appCtxSvc.ctx[ _contextKey ].context.productContextInfo.uid );
        updateFilterInfo( rawCategoriesInfo.rawCategories, rawCategoriesInfo.rawCategoryValues, rawCategoriesInfo.recipe, false /*prcoess Empty Filter Categories*/ );
    }
    return multiValueTermDeletedOrUpdated;
};

/*
 * Sync facet selections in updateFilterValues from performFacetSearch from transient recipe cache the in delay mode
 */
var syncFiltersInCacheOnFacetSearch = function( updatedFilterValues, updatedCatName, filterBy ) {
    // Retrieve all the transient recipe list
    var productContextInfoUID = appCtxSvc.getCtx( _contextKey + '.context.productContextInfo.uid' );
    var transientRecipes = lookupRecipesInfoInCache( productContextInfoUID );

    if( transientRecipes === undefined || transientRecipes.length === 0 ) {
        return;
    }

    // Sync facet selections for updateFilterValues for transientRecipe is one and deleted
    if( transientRecipes.length === 1 && transientRecipes[ 0 ].criteriaOperatorType === 'Clear' &&
        transientRecipes[ 0 ].criteriaValues[ 0 ] === updatedCatName ) {
        _.forEach( updatedFilterValues, function( filterValue ) {
            if( transientRecipes[ 0 ].criteriaValues.includes( filterValue.stringValue ) &&
                filterValue.selected ) {
                filterValue.selected = false;
            }
        } );
        return;
    }

    // Find transient recipe matching the category name
    var recipeFound;
    for( var recipe in transientRecipes ) {
        if( transientRecipes[ recipe ].criteriaValues[ 0 ] === updatedCatName ) {
            recipeFound = transientRecipes[ recipe ];
            break;
        }
    }

    if( recipeFound ) {
        // Sync facet selections for updateFilterValues for transient recipe term
        // If any filterValues that are found in the recipe is not selected, then set the selected as true.
        // If any filterValues that are NOT found in the recipe is selected then set the selected as false.
        _.forEach( updatedFilterValues, function( filterValue ) {
            if( recipeFound.criteriaValues.includes( filterValue.stringValue ) ) {
                if( !filterValue.selected ) {
                    filterValue.selected = true;
                }
            } else if( filterValue.selected ) {
                filterValue.selected = false;
            }
        } );
        // If any recipe is not found in the filterValues then create a filter value entry to be in sync with recipe.
        // This is for the case when selected transient recipe value is not returned in the filterValues since it is not
        // in the current page returned. try this
        if ( applicableCategoryTypes.includes( recipeFound.criteriaType ) ) {
            var updatedFilterStringValues = [];
            _.forEach( updatedFilterValues, function( filterValue ) {
                updatedFilterStringValues.push( filterValue.stringValue );
            } );

            for( var index = 1; index < recipeFound.criteriaValues.length; index++ ) {
                if( !updatedFilterStringValues.includes( recipeFound.criteriaValues[index] ) &&
                    (  filterBy.length > 0 && recipeFound.criteriaValues[index].indexOf( filterBy ) !== -1  || filterBy.length === 0 ) ) {
                    //Create a filter value entry
                    var missingFilter = {};
                    missingFilter.selected = true;
                    missingFilter.stringValue = recipeFound.criteriaValues[index];
                    missingFilter.stringDisplayValue = recipeFound.criteriaValues[index];
                    missingFilter.searchFilterType = 'StringFilter';
                    updatedFilterValues.push( missingFilter );
                }
            }
        }
    } else {
        // Set facet selections for updateFilterValues to false if persisted recipe term is deleted in transient mode
        _.forEach( updatedFilterValues, function( filterValue ) {
            if( filterValue.selected ) {
                filterValue.selected = false;
            }
        } );
    }
};

/**
 * This function clears the filterBy(search string within category) on any category which does not do
 * performFacetSearch SOA. On these categories, isServerSearch is set to false based on hasMoreFacetValues.
 * On these categories, we cannot udpate the processedCategories list on string search within categry
 * since we will loose the original list and there is no soa call to populate it back.
 * This function is called on select/deselect, delete, performfacetsearch and clearAll to clear the filter text value since
 * categories are rendered from cache and it is not a filtered list.
 */
var clearFilterSearchStringOnCtx = function() {
    if( appCtxSvc.ctx.search ) {
        var categories = lookupCategoriesInfoInCache( appCtxSvc.ctx[ _contextKey ].context.productContextInfo.uid );
        var performSearchCategory = appCtxSvc.ctx.search.valueCategory;
        if( performSearchCategory ) {
            _.forEach( categories, function( processedCategory ) {
                if( processedCategory.internalName &&
                    !processedCategory.isServerSearch ) {
                    processedCategory.filterBy = '';
                }
            } );
        }
    }
};

var clearFilterInfo = function() {
    var rawCategoriesInfo = getRawCategoriesAndCategoryValues( appCtxSvc.ctx[ _contextKey ].context.productContextInfo.uid );
    var rawFilterMapValues = rawCategoriesInfo.rawCategoryValues;
    for( var rawFilterMapKey in rawFilterMapValues ) {
        var filterValues = rawFilterMapValues[ rawFilterMapKey ];
        for( var i = 0; i < filterValues.length; i++ ) {
            filterValues[ i ].selected = false;
        }
    }
    updateFilterInfo( rawCategoriesInfo.rawCategories, rawCategoriesInfo.rawCategoryValues, rawCategoriesInfo.recipe, false /*prcoess Empty Filter Categories*/ );
    clearFilterSearchStringOnCtx();
};

/*
 * Update the local pci to filter values cache and update the view model
 */
var syncFilterInfo = function( categoryName, filterValue, selected, update ) {
    var rawCategoriesInfo = getRawCategoriesAndCategoryValues( appCtxSvc.ctx[ _contextKey ].context.productContextInfo.uid );
    var rawFilterMapValues = rawCategoriesInfo.rawCategoryValues;
    for( var rawFilterMapKey in rawFilterMapValues ) {
        if( rawFilterMapKey === categoryName ) {
            var filterValues = rawFilterMapValues[ rawFilterMapKey ];
            for( var i = 0; i < filterValues.length; i++ ) {
                if( filterValues[ i ].stringValue === filterValue ) {
                    filterValues[ i ].selected = selected;
                    break;
                }
            }
            break;
        }
    }
    if( update ) {
        updateFilterInfo( rawCategoriesInfo.rawCategories, rawCategoriesInfo.rawCategoryValues, rawCategoriesInfo.recipe, false /*prcoess Empty Filter Categories*/ );
    }
};

/**
 * Check if the filter selection/deselection is valid to continue.
 *
 * @param {Object} data data object
 * @param {Object} filter selected filter value
 * @returns {boolean} : Returns true if discovery indexed
 */
var validForFilterChange = function( data, filter ) {
    var canDeselect = true;
    // Deselection of a filter value is not allowed when
    // a. its category is the first recipe in the list of recipes
    // b. there are more than one recipe
    // c. recipe corresponding to the deselected filter is a single valued recipe
    if( filter.selected && data.recipe && data.recipe.length > 1 ) {
        if( filter.categoryName === data.recipe[ 0 ].criteriaValues[ 0 ] &&
            data.recipe[ 0 ].criteriaValues.length === 2 ) {
            canDeselect = false;
        }
        if( !canDeselect ) {
            var resource = app.getBaseUrlPath() + '/i18n/OccurrenceManagementSubsetConstants';
            var localTextBundle = localeSvc.getLoadedText( resource );
            var validationMsg = 'deselectValidationMsg';
            var okButtonText = 'okButtonText';
            var buttons = [ {
                addClass: 'btn btn-notify',
                text: localTextBundle[ okButtonText ],
                onClick: function( $noty ) {
                    $noty.close();
                }
            } ];
            notyService.showWarning( localTextBundle[ validationMsg ], buttons );
            resetSelection();
            return canDeselect;
        }
    }
    return canDeselect;
};

/**
 * Check  if product is discovery indexed.
 *
 * @returns {boolean} : Returns true if discovery indexed
 */
export let isDiscoveryIndexed = function() {
    var isDiscovery = false;
    if( appCtxSvc.ctx[ _contextKey ] && appCtxSvc.ctx[ _contextKey ].context &&
        appCtxSvc.ctx[ _contextKey ].context.supportedFeatures &&
        appCtxSvc.ctx[ _contextKey ].context.supportedFeatures.Awb0EnableSmartDiscoveryFeature ) {
        isDiscovery = true;
    }
    return isDiscovery;
};

export let toggleDelayedApply = function( data, toggle ) {
    if( data ) {
        //User preference is for delayed apply whereas the Settings panel for filter panel has option Auto-update
        // so we need to negate the value
        data.delayedApply = !toggle;
    }
};

var registerListeners = function( data ) {
    // Subcribe to productContextChangedEvent This event is fired when a change in revision rule results in change in discovery filter panel.
    if( !_productContextChangeEventListener ) {
    _productContextChangeEventListener = eventBus.subscribe( 'productContextChangedEvent', function( eventData ) {
        if( isDiscoveryIndexed() && eventData && eventData.dataProviderActionType &&
            ( eventData.dataProviderActionType === 'initializeAction' || eventData.dataProviderActionType === 'productChangedOnSelectionChange' ) ) {
            getFilterData( data );
        }
    } );
}
    if( !_onDiscoveryFilterPanelCloseListener ) {
        _onDiscoveryFilterPanelCloseListener = eventBus.subscribe( 'appCtx.register', function( eventData ) {
            if( eventData && eventData.name === 'activeNavigationCommand' && _onDiscoveryFilterPanelCloseListener ) {
                // Unregister all listeners when panel is closed.
                unregisterListeners();
            }
        }, 'discoveryFilterService' );
    }
};

var unregisterListeners = function() {
    if( appCtxSvc.ctx[ _contextKey ]  && appCtxSvc.ctx[ _contextKey ].context ) {
    appCtxSvc.ctx[ _contextKey ].context.requestPref.calculateFilters = false;
    }
    if( _productContextChangeEventListener ) {
        eventBus.unsubscribe( _productContextChangeEventListener );
        _productContextChangeEventListener = null;
    }
    if( _onDiscoveryFilterPanelCloseListener ) {
        eventBus.unsubscribe( _onDiscoveryFilterPanelCloseListener );
        _onDiscoveryFilterPanelCloseListener = null;
    }
    if( discoveryFilterEventSubscriptions ) {
        _.forEach( discoveryFilterEventSubscriptions, function( subDef ) {
            eventBus.unsubscribe( subDef );
        } );
        discoveryFilterEventSubscriptions = [];
    }
};

export let processInitialDelayedApplyPreference = function( result, data ) {
    if( result && result.response.length > 0 ) {
        var prefValue = result.response[ 0 ].values.values[ 0 ];
        if( prefValue.toUpperCase() === 'TRUE' ) {
            data.delayedApply = true;
        } else {
            data.delayedApply = false;
        }
    }
};

/**
 * Function to  get the more link Text
 *@param {Object[]} recipes valid recipes
 * @returns{String} formatted Label
 */
var getMoreLinkText = function( recipes ) {
    if( recipes ) {
        var resource = app.getBaseUrlPath() + '/i18n/OccurrenceManagementSubsetConstants';
        var localTextBundle = localeSvc.getLoadedText( resource );
        var more_link_text = 'number_more_link_text';
        var moreLinkText = localTextBundle[ more_link_text ];
        return moreLinkText.replace( '{0}', recipes.length - 3 );
    }
};

/**
 * Evaluate if the selected elements are valid for adding to include/exclude recipe terms
 *
 */
export let validateTermsToIncludeOrExclude = function( validSelectedObjects ) {
    if( isTCVersion132OrLater() && isDiscoveryIndexed() && _contextKey === ACE_CONTEXT_KEY ) {
        if( validSelectedObjects && validSelectedObjects.length >= 1 && validSelectedObjects.length === appCtxSvc.ctx.mselected.length ) {
            var occMgmtCtx = appCtxSvc.getCtx( _contextKey ).context;
            var productContextInfoUID = occMgmtCtx.productContextInfo.uid;
            var transientRecipes = lookupRecipesInfoInCache( productContextInfoUID );
            if( transientRecipes && transientRecipes.length > 0 && transientRecipes[ 0 ].criteriaOperatorType !== 'Clear' ) {
                _.set( appCtxSvc, 'ctx.filter.validSelectionsToIncludeOrExclude', true );
            } else if( occMgmtCtx.productContextInfo && occMgmtCtx.productContextInfo.props.awb0FilterCount &&
                       occMgmtCtx.productContextInfo.props.awb0FilterCount.dbValues[0] > 0 ) {
                _.set( appCtxSvc, 'ctx.filter.validSelectionsToIncludeOrExclude', true );
            } else {
                _.set( appCtxSvc, 'ctx.filter.validSelectionsToIncludeOrExclude', false );
            }
        } else {
            _.set( appCtxSvc, 'ctx.filter.validSelectionsToIncludeOrExclude', false );
        }
    }
};

/**
 * Clear all the cache in this service. This function is called on Reset
 *
 */
 export let clearAllCacheOnReset = function() {
    clearCache();
    clearRecipeFromContext();
    clearRecipeCache( undefined, true );
    pciToCategoryLogicMap = [];
};

var clearContext = function() {
    appCtxSvc.ctx[ _contextKey ].context.searchFilterCategories = [];
    appCtxSvc.ctx[ _contextKey ].context.searchFilterMap = {};
};

/**
 * Initialize
 * @param {Object} data data object
 */
export let initialize = function( data ) {
    appCtxSvc.ctx[ _contextKey ].context.requestPref.calculateFilters = true;
    if( discoveryFilterEventSubscriptions.length === 0 ) {
        discoveryFilterEventSubscriptions.push( eventBus.subscribe( 'ace.resetStructureStarted', function() {
            if( isDiscoveryIndexed() || createWorksetService.isWorkset( appCtxSvc.ctx.mselected[0] ) ) {
                if( data ) {
                    data.enableApply = false;
                }
            }
        } ) );

        // Subcribe to occDataLoadedEvent to update PWA
        discoveryFilterEventSubscriptions.push( eventBus.subscribe( 'occDataLoadedEvent', function() {
            if( isDiscoveryIndexed() ) {
                appCtxSvc.ctx[ _contextKey ].context.requestPref.calculateFilters = true;
                performPostProcessingOnLoad( data );
                clearContext();
            }
        } ) );

        discoveryFilterEventSubscriptions.push( eventBus.subscribe( 'appCtx.update', function( context ) {
            if( isDiscoveryIndexed() ) {
                if( context && context.name === _contextKey && context.target === 'context.configContext' &&
                    Object.keys( context.value[_contextKey].context.configContext ).length > 0 ) {
                    clearFilterInfoFromURL();
                    clearCache();
                }
                var activeContext = appCtxSvc.getCtx( _contextKey ).context;
                if( context && appCtxSvc.ctx[_contextKey] && context.name === appCtxSvc.ctx[_contextKey].key &&
                    context.target === 'searchFilterMap' ) {
                    if( activeContext.searchFilterMap ) {
                        var resFilterCategoryMap = _.cloneDeep( appCtxSvc.ctx[ _contextKey ].context.searchFilterCategories );
                        var resFilterMap = _.cloneDeep( appCtxSvc.ctx[ _contextKey ].context.searchFilterMap );
                        updateFilterInfo( resFilterCategoryMap,
                            resFilterMap, appCtxSvc.ctx[ _contextKey ].context.recipe, true );
                    }
                }
            }
        } ) );
        eventBus.subscribe( 'ace.updateFilterPanel', function() {
            if( isDiscoveryIndexed() ) {
                var context = appCtxSvc.getCtx( _contextKey ).context;
                if( context && context.requestPref ) {
                    context.requestPref.calculateFilters = true;
                }
            }
        } );
        // Set recipe operator as filter when subset panel is opened initially.
        if( appCtxSvc.ctx[ _contextKey ].context !== undefined &&
            !appCtxSvc.ctx[ _contextKey ].context.recipeOperator ) {
            appCtxSvc.ctx[ _contextKey ].context.recipeOperator = 'Filter';
        }
    }
    proximityFilterService.initialize();
    registerListeners( data );
    if( isTCVersion132OrLater() ) {
        if( data && pciToCategoryLogicMap && pciToCategoryLogicMap.length > 0 ) {
            // If category logic cache exists
            var categoryLogicEntry = pciToCategoryLogicMap.filter( function( x ) {
                return x.pciUid === appCtxSvc.ctx[ _contextKey ].context.productContextInfo.uid;
            } );
            if( categoryLogicEntry && categoryLogicEntry.length > 0 ) {
                data.categoryLogicMap = categoryLogicEntry[ 0 ].categoryLogicMap;
            }
        }
        addCategoryLogicCommand( data );
    }
};

var addCategoryLogicCommand = function( data ) {
    if( data && !data.toggleCategoryLogicCommand ) {
        data.toggleCategoryLogicCommand = function( category ) {
            toggleCategoryLogic( category, data );
        };
    }
};

export let clearRecipe = function( data ) {
    if( data ) {
        var updatedRecipeOnClear = [];
        // Create dummy recipe first term with operator clear
        if( appCtxSvc.ctx[ _contextKey ].context.recipe && appCtxSvc.ctx[ _contextKey ].context.recipe.length > 0 ) {
            // If persisted recipe has non zero recipe term
            // Create recipe with one term and 'Clear' operator so that when user applies
            // the recipe, server understands it as clearing the recipe
            var recipeToClear = _.cloneDeep( appCtxSvc.ctx[ _contextKey ].context.recipe[ 0 ] );
            recipeToClear.criteriaOperatorType = 'Clear';
            updatedRecipeOnClear.push( recipeToClear );
        }

        var pciUID = appCtxSvc.ctx[ _contextKey ].context.productContextInfo.uid;
        var pciToRecipeInfo;
        // Clear transient map
        if( pciToTransientRecipesMap && pciToTransientRecipesMap.length > 0 ) {
            var recipesData = pciToTransientRecipesMap.filter( function( x ) {
                return x.pciUid === pciUID;
            } );
            if( recipesData && recipesData[ 0 ] ) {
                recipesData[ 0 ].transientRecipes = updatedRecipeOnClear;
            } else {
                pciToRecipeInfo = {
                    pciUid: pciUID,
                    transientRecipes: updatedRecipeOnClear
                };
                pciToTransientRecipesMap.push( pciToRecipeInfo );
            }
        } else {
            pciToRecipeInfo = {
                pciUid: pciUID,
                transientRecipes: updatedRecipeOnClear
            };
            pciToTransientRecipesMap.push( pciToRecipeInfo );
        }

        // Clear displayed recipe array - this will update the UI and update empty recipe on context
        data.recipe = [];
        updateRecipeOnContext( updatedRecipeOnClear );

        if( data.categoryLogicMap && pciToCategoryLogicMap ) {
            // Reset category logic map used to display in client
            var keys = Object.keys( data.categoryLogicMap );
            _.forEach( keys, function( key ) {
                data.categoryLogicMap[ key ] = true; // default logic is true implying 'Filter'
            } );

            var categoryLogicEntry = pciToCategoryLogicMap.filter( function( x ) {
                return x.pciUid === pciUID;
            } );

            if( categoryLogicEntry && categoryLogicEntry.length > 0 && categoryLogicEntry[ 0 ].categoryLogicMap ) {
                // Update existing entry for category logic cache
                categoryLogicEntry[ 0 ].categoryLogicMap = data.categoryLogicMap;
            }
        }

        if( data.delayedApply ) {
            // Clear filters in cache
            clearFilterInfo();
            // Enable Filter button
            var currentRecipes = _.cloneDeep( appCtxSvc.ctx[ _contextKey ].context.recipe );
            data.enableApply = areRecipesChanged( currentRecipes, updatedRecipeOnClear );
        } else {
            // Apply filter if in auto-update mode
            applyFilter( data );
        }
    }
};

/**
 * Function to set Context key.
 * Context key from panel context will be used if provided, else aceActiveContext will be the default.
 *
 * @param {Object} data - View model object
 * @return {Object} context key
 */
 export let setContext = function() {
    _contextKey = ACE_CONTEXT_KEY;
    if( appCtxSvc.ctx.panelContext && appCtxSvc.ctx.panelContext.contextKey ) {
        _contextKey = appCtxSvc.ctx.panelContext.contextKey;
    }
    return _contextKey;
};

export let getProductContextInfoUid = function( data ) {
    return appCtxSvc.ctx[data.contextKey].context.productContextInfo.uid;
};

/**
 * Destroy
 */
export let destroy = function() {
    clearCache();
    clearRecipeCache( undefined, true );
    pciToCategoryLogicMap = [];
    unregisterListeners();
};

export default exports = {
    validateTermsToIncludeOrExclude,
    computeFilterStringForNewProductContextInfo,
    selectACEFilter,
    getFilterData,
    performPostProcessingOnLoad,
    selectCategory,
    persistCategoryFilterToUpdateState,
    getStartIndexForFacetSearch,
    updateFilterMapForFacet,
    applyFilter,
    clearRecipeCacheOnApplyFilter,
    addRecipe,
    processRecipeOnUpdate,
    processOnNavigateBack,
    toggleDelayedApply,
    processInitialDelayedApplyPreference,
    isDiscoveryIndexed,
    clearRecipe,
    clearAllCacheOnReset,
    initialize,
    destroy,
    setContext,
    getProductContextInfoUid
};
app.factory( 'discoveryFilterService', () => exports );

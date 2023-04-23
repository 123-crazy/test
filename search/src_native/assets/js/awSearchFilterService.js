// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global */

/**
 * @module js/awSearchFilterService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import awSearchService from 'js/awSearchService';
import filterPanelEvents from 'js/filterPanelEvents';
import shapeSearchService from 'js/Awp0ShapeSearchService';

import _ from 'lodash';
import 'js/eventBus';


export let getDataProvider = function( filterMap ) {
    return awSearchService.getDataProvider( filterMap );
};

export let getSearchCriteria = function( filterMap ) {
    return awSearchService.getSearchCriteria( filterMap );
};

/**
 * Function to return startIndex for filter value search
 * @param {*} category The filter for which the start index must be returned
 * @returns{*} The start index
 */
export let getStartIndexForFilterValueSearch = function( category ) {
    if( category.startIndexForFacetSearch === undefined ) {
        category.startIndexForFacetSearch = 0;
    }
    return category.startIndexForFacetSearch;
};

/**
 * Function to construct filter map as required for soa input.
 * @param {*} filterMap The current filter map that contains filters applied so far.
 * @param {*} category The category that must be added to the filter map
 * @returns {*} The filter map
 */
export let getMapForFilterValueSearch = function( filterMap, category ) {
    var cloneOfFilterMap = JSON.parse( JSON.stringify( filterMap ) );
    var prop = cloneOfFilterMap ? cloneOfFilterMap : {};
    if( awSearchService.getDataProvider( filterMap ) === 'SS1ShapeSearchDataProvider' ) {
        prop  = shapeSearchService.updateFilterMapForShapeSearch( prop );
        awSearchService.updateColorToggleCtx();
    }

    var searchCtx = appCtxSvc.getCtx( 'search' );
    if( !searchCtx ) {
        appCtxSvc.updatePartialCtx( 'search', {} );
        searchCtx = {};
    }
    // this part of code is to sent the count of the selected filters
    // so that a empty search should return the count back from the server correctly
    var selectedFiltersInfoCtx = appCtxSvc.getCtx( 'search.selectedFiltersInfo' );
    if( selectedFiltersInfoCtx ) {
        _.forEach( prop[ category.internalName ], function( eachSelectedFacet ) {
            _.forEach( selectedFiltersInfoCtx[ category.internalName ],
                function( eachFilterValue ) {
                    if( eachFilterValue && eachFilterValue.internalName && eachSelectedFacet.stringValue === eachFilterValue.internalName ) {
                        eachSelectedFacet.count = eachFilterValue.count;
                        eachSelectedFacet.selected = true;
                        eachSelectedFacet.stringDisplayValue = eachFilterValue.name ? eachFilterValue.name : eachSelectedFacet.stringValue;
                    }
                } );
        } );
    }

    // Store the empty category that must be populated
    searchCtx.activeFilter = category;
    appCtxSvc.updatePartialCtx( 'search.activeFilter', searchCtx.activeFilter );
    return prop;
};

/**
 * Function to construct filter map as required for soa input.
 * @param {*} filterMap The current filter map that contains filters applied so far.
 * @param {*} category The category that must be added to the filter map
 * @returns {*} The filter map
 */
export let getIncontextMapForFilterValueSearch = function( filterMap, category ) {
    var cloneOfFilterMap = JSON.parse( JSON.stringify( filterMap ) );
    var prop = cloneOfFilterMap ? cloneOfFilterMap : {};

    var searchCtx = appCtxSvc.getCtx( 'search' );
    if( !searchCtx ) {
        appCtxSvc.updatePartialCtx( 'search', {} );
        searchCtx = {};
    }
    // this part of code is to sent the count of the selected filters
    // so that a empty search should return the count back from the server correctly
    var searchIncontextInfoCtx = appCtxSvc.getCtx( 'searchIncontextInfo' );
    if( searchIncontextInfoCtx ) {
        var selectedFilters = appCtxSvc.getCtx( 'searchIncontextInfo.searchResultFilters' );
        exports.processIncontextMapForFilterValueSearch( category, prop, selectedFilters );
    } else {
        appCtxSvc.updatePartialCtx( 'searchIncontextInfo', {} );
        searchCtx = {};
    }

    // Store the empty category that must be populated
    searchCtx.activeFilter = category;
    appCtxSvc.updatePartialCtx( 'search.activeFilter', searchCtx.activeFilter );
    return prop;
};

/**
 * processIncontextMapForFilterValueSearch
 * @function processIncontextMapForFilterValueSearch
 * @param {*} category - The category that must be added to the filter map
 * @param {Object} prop - The parsed value from the filter map
 * @param {Object} selectedFilters - The selected filters
 */
export let processIncontextMapForFilterValueSearch = function( category, prop, selectedFilters ) {
    if( selectedFilters && selectedFilters.length > 0 ) {
        _.forEach( prop[ category.internalName ], function( eachSelectedFacet ) {
            _.forEach( selectedFilters, function( eachFilterValue ) {
                if( eachFilterValue.filterValues && eachFilterValue.filterValues.length > 0 ) {
                    _.forEach( eachFilterValue.filterValues, function( selectedFilterForCategory ) {
                        if( eachSelectedFacet.stringValue === selectedFilterForCategory.internalName && selectedFilterForCategory.categoryName === category.internalName ) {
                            eachSelectedFacet.count = selectedFilterForCategory.count;
                            eachSelectedFacet.selected = selectedFilterForCategory.selected;
                            eachSelectedFacet.stringDisplayValue = selectedFilterForCategory.name ? selectedFilterForCategory.name : eachSelectedFacet.stringValue;
                        }
                    } );
                }
            } );
        } );
    }
};

/**
 * Add the filter map from soa response to the existing filter map
 * @param {*} filterMap The soa response
 * @param {*} context The soa response
 * @returns{*} The search filter map
 */
export let setMapForFilterValueSearch = function( filterMap, context ) {
    var searchCtx = appCtxSvc.getCtx( 'search' );
    var category = searchCtx.activeFilter;

    if( filterMap !== undefined ) {
        if ( context.unpopulatedSearchFilterCategories ) {
            for( var i = 0; i < context.unpopulatedSearchFilterCategories.length; i++ ) {
                if( context.unpopulatedSearchFilterCategories[ i ].internalName === category.internalName ) {
                    context.searchFilterCategories.push( context.unpopulatedSearchFilterCategories[ i ] );
                    break;
                }
            }
        }

        context.searchFilterMap = Object.assign( {}, context.searchFilterMap );
        if( filterMap[ category.internalName ] !== undefined ) {
            if( filterMap[ category.internalName ][ 0 ] && filterMap[ category.internalName ][ 0 ].searchFilterType === 'DateFilter' ) {
                var dateCategories = Object.keys( filterMap );
                for( var cat in dateCategories ) {
                    context.searchFilterMap[ dateCategories[ cat ] ] = filterMap[ dateCategories[ cat ] ];
                }
            }
        }

        // If more is clicked append the values else replace the values
        if( category.startIndexForFacetSearch > 0 ) {
            var isDuplicateFilterValue;
            _.forEach( filterMap[ category.internalName ], function( filterValue ) {
                isDuplicateFilterValue = exports.removeDuplicateSelectedFilters( context, category, filterValue );
                if( isDuplicateFilterValue === false ) {
                    context.searchFilterMap[ category.internalName ].push( filterValue );
                }
            } );
        } else {
            context.searchFilterMap[ category.internalName ] = filterMap[ category.internalName ];
        }

        //put the selected filter values at the top so that when the user clicks on the Less... link, they don't get lost
        context.searchFilterMap[ category.internalName ] = exports.arrangeFilterMap( context, category );
    } else {
        context.searchFilterMap[ category.internalName ] = [];
    }
    return context.searchFilterMap;
};

/**
 * function to remove duplicate selected filters from the search response info if any after perFormFacetSearch SOA call
 * @param {Object} context - the search response info context
 * @param {Object} category - the active filter category
 * @param {Object} filterValue - each filter value in the searchFilterMap
 * @returns {boolean} - whether the filter value is duplicate or not
 */
export let removeDuplicateSelectedFilters = function( context, category, filterValue ) {
    var isDuplicateFilterValue = false;
    _.forEach( context.searchFilterMap[ category.internalName ], function( eachFilterValue ) {
        if( isDuplicateFilterValue === false ) {
            if( eachFilterValue.stringValue === filterValue.stringValue || filterValue.stringValue === '$ME' ) {
                isDuplicateFilterValue = true;
            }
        }
    } );
    return isDuplicateFilterValue;
};

/**
 * function to arrange search response filter map after performFacetSearch to put selected filters at the top
 * of the list so that less... call does not lose them
 * @param {Object} context - the search response info context
 * @param {Object} category - the active filter category
 * @returns {Array} updatedFilterMap - the search response info filter map with selected filters at the top
 */
export let arrangeFilterMap = function( context, category ) {
    var selectedFilters = {};
    var nonSelectedFilters = {};
    var selectedFiltersIndex = 0;
    var nonSelectedFiltersIndex = 0;
    _.forEach( context.searchFilterMap[ category.internalName ], function( filterValue ) {
        if( filterValue.selected === true ) {
            selectedFilters[ selectedFiltersIndex ] = filterValue;
            selectedFiltersIndex++;
        } else {
            nonSelectedFilters[ nonSelectedFiltersIndex ] = filterValue;
            nonSelectedFiltersIndex++;
        }
    } );
    var updatedFilterMap = [];
    for( var index1 = 0; index1 < Object.keys( selectedFilters ).length; index1++ ) {
        updatedFilterMap.push( selectedFilters[ index1 ] );
    }
    for( var index2 = 0; index2 < Object.keys( nonSelectedFilters ).length; index2++ ) {
        updatedFilterMap.push( nonSelectedFilters[ index2 ] );
    }
    return updatedFilterMap;
};

/**
 * Function to parse response for incontext filter search
 * @param {*} data The soa response
 * @returns{*} The filter map containing category populated with values
 */
export let setIncontextFilterMap = function( data ) {
    var context = appCtxSvc.ctx;
    if( context.searchCriteria && context.search && context.search.criteria ) {
        context.search.criteria.searchString = context.searchCriteria;
        appCtxSvc.updatePartialCtx( 'search.criteria.searchString', context.search.criteria.searchString );
    }
    var filterMap = exports.setMapForFilterValueSearch( data.searchFilterMap, context.searchIncontextInfo );
    appCtxSvc.updatePartialCtx( 'searchIncontextInfo.searchFilterMap', filterMap );
    return filterMap;
};

/**
 * Function to parse response for filter search
 * @param {*} data The soa response
 * @returns{*} The filter map containing category populated with values
 */
export let setFilterMap = function( data ) {
    var context = appCtxSvc.getCtx( 'searchResponseInfo' );
    var filterMap = exports.setMapForFilterValueSearch( data.searchFilterMap, context );
    appCtxSvc.updatePartialCtx( 'search.searchFilterMap', filterMap );
    return filterMap;
};

/**
 * Event to select category header
 *
 * @function selectCategory
 * @memberOf awSearchFilterService
 *
 * @param {Object}category - filter category
 *
 */
export let selectCategory = function( category ) {
    var subLocation = appCtxSvc.getCtx( 'sublocation' );
    var searchInfoCtx = appCtxSvc.getCtx( 'searchInfo' );
    if( subLocation.clientScopeURI === 'Awp0SavedSearch' ) {
        return;
    } else if( category.filterValues && ( category.filterValues.length === 0 || searchInfoCtx.thresholdExceeded && searchInfoCtx.thresholdExceeded === 'true' ) ) {
        return;
    }
    filterPanelEvents.selectCategory( category );
};

/**
 * @function constructSearchStringForFacetSearch - method to construct the searchCriteria object for facet search
 * @param searchCriteria - the searchCriteria object passed in
 * @param searchContext - the searchContext object passed in
 * @param useSearchFolderCtx - if searchFolder ctx needs to be used or search ctx.
 * @returns searchCriteria - updated searchCriteria object with the searchString included.
 */

export let constructSearchStringForFacetSearch = function( searchCriteria, searchContext, useSearchFolderCtx ) {
    if( useSearchFolderCtx === 'true' ) {
        searchContext = appCtxSvc.getCtx( 'searchFolder' );
        if( searchContext && searchContext.searchCriteria && searchContext.searchCriteria.searchString ) {
            searchCriteria.searchString = searchContext.searchCriteria.searchString;
        }
    } else {
        searchContext = appCtxSvc.getCtx( 'search' );
        if( searchContext && searchContext.criteria && searchContext.criteria.searchString ) {
            searchCriteria.searchString = searchContext.criteria.searchString;
        }
    }
    return searchCriteria;
};

/**
 * @function getSearchCriteriaForFacetSearch - get the search criteria for global search filter panel/search folder filter panel facet search
 * @param category - the category for which facet search is being executed
 * @param filterMap - The Filter Map
 */

export let getSearchCriteriaForFacetSearch = function( category, filterMap, useSearchFolderCtx ) {
    var searchContext = {};
    var searchCriteria = {};

    searchCriteria = exports.constructSearchStringForFacetSearch( searchCriteria, searchContext, useSearchFolderCtx );

    if( awSearchService.getDataProvider( filterMap ) === 'SS1ShapeSearchDataProvider' ) {
        let ssCriteria = awSearchService.getSearchCriteria( filterMap );
        searchCriteria.searchString = ssCriteria && ssCriteria.searchString ? ssCriteria.searchString : '';
    }

    searchCriteria.forceThreshold = appCtxSvc.getCtx( 'searchInfo.thresholdExceeded' );
    if( !searchCriteria.forceThreshold ) {
        delete searchCriteria.forceThreshold;
    }
    searchCriteria.categoryForFacetSearch = category.internalName;
    searchCriteria.facetSearchString = category.filterBy;
    return searchCriteria;
};

/**
 * @function getIncontextSearchCriteriaForFacetSearch - get the search criteria for incontext facet search
 * @param category - the category for which facet search is being executed
 */

export let getIncontextSearchCriteriaForFacetSearch = function( category ) {
    var searchContext = appCtxSvc.getCtx( 'searchCriteria' );
    var searchCriteria = {};
    searchCriteria.searchString = searchContext;
    searchCriteria.categoryForFacetSearch = category.internalName;
    searchCriteria.forceThreshold = appCtxSvc.getCtx( 'searchIncontextInfo.thresholdExceeded' );
    if( !searchCriteria.forceThreshold ) {
        delete searchCriteria.forceThreshold;
    }
    searchCriteria.facetSearchString = category.filterBy;
    return searchCriteria;
};

/**
 * @function updateSearchCtxForSelectedFilters - selected filters are added to this context ( used by facet search to send selected filters info correctly )
 */

export let updateSearchCtxForSelectedFilters = function( selectedFilter ) {
    var selectedFiltersInfoCtx = appCtxSvc.getCtx( 'search.selectedFiltersInfo' );
    if( !selectedFiltersInfoCtx ) {
        selectedFiltersInfoCtx = {};
    }
    if( selectedFilter.categoryName ) {
        var category = selectedFilter.categoryName;
        if( selectedFiltersInfoCtx[ category ] ) {
            var isDuplicate = exports.isDuplicateFilterValue( selectedFiltersInfoCtx[ category ], selectedFilter );
            if( !isDuplicate ) {
                selectedFiltersInfoCtx[ category ].push( selectedFilter );
            }
        } else {
            selectedFiltersInfoCtx[ category ] = [];
            selectedFiltersInfoCtx[ category ].push( selectedFilter );
        }
    }
    appCtxSvc.updatePartialCtx( 'search.selectedFiltersInfo', selectedFiltersInfoCtx );
};

/**
 * @function isDuplicateFilterValue - looks at search.selectedFiltersInfo context and verifies that the selected filter value is not already in it
 * @returns {Boolean } isDuplicate - flag to say if it is a duplicate or not
 */

export let isDuplicateFilterValue = function( selectedFiltersForCategory, selectedFilter ) {
    var isDuplicate = false;
    _.forEach( selectedFiltersForCategory, function( eachSelectedFilter ) {
        if( !isDuplicate ) {
            if( eachSelectedFilter.internalName && selectedFilter.internalName && eachSelectedFilter.type && selectedFilter.type ) {
                if( eachSelectedFilter.internalName === selectedFilter.internalName && eachSelectedFilter.type === selectedFilter.type ) {
                    isDuplicate = true;
                }
            }
        }
    } );
    return isDuplicate;
};

const exports = {
    getDataProvider,
    getSearchCriteria,
    getStartIndexForFilterValueSearch,
    getMapForFilterValueSearch,
    getIncontextMapForFilterValueSearch,
    setMapForFilterValueSearch,
    removeDuplicateSelectedFilters,
    arrangeFilterMap,
    setIncontextFilterMap,
    setFilterMap,
    selectCategory,
    getSearchCriteriaForFacetSearch,
    getIncontextSearchCriteriaForFacetSearch,
    updateSearchCtxForSelectedFilters,
    isDuplicateFilterValue,
    processIncontextMapForFilterValueSearch,
    constructSearchStringForFacetSearch
};

export default exports;
/**
 * Update filter map
 *
 * @function getDataProvider
 * @memberOf NgServices.awSearchFilterService
 *
 * @param {Object}filterMap - filterMap
 *
 * @return {Object} data provider
 */
app.factory( 'awSearchFilterService', () => exports );

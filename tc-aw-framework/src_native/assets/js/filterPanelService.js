// Copyright (c) 2020 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/filterPanelService
 * @requires js/filterPanelCommonUtils
 */
import app from 'app';
import AwStateService from 'js/awStateService';
import appCtxService from 'js/appCtxService';
import localeSvc from 'js/localeService';
import filterPanelUtils from 'js/filterPanelUtils';
import filterPanelCommonUtils from 'js/filterPanelCommonUtils';
import $ from 'jquery';
import _ from 'lodash';
import logger from 'js/logger';
import eventBus from 'js/eventBus';
import 'js/messagingService';

var exports = {};

export let DATA_RANGE_FILTER = 'DateRangeFilter';
var YEAR_SUFFIX = '_0Z0_year';
var YEAR_MONTH_SUFFIX = '_0Z0_year_month';
var WEEK_SUFFIX = '_0Z0_week';
var YEAR_MONTH_DAY_SUFFIX = '_0Z0_year_month_day';
var _noFilterValue = '';
var _fromTextValue = '';
var _toTextValue = '';
var _defaultFilterLimit = 50;

/**
 * Returns categories from search response
 *
 * @param {Object} response the response from the search SOA
 *
 * @returns {ObjectArray} The array of child node objects to be displayed.
 */
export let getCategories = function( response ) {
    var categories = response.searchFilterCategories;
    var categoryValues = response.searchFilterMap;
    if( categoryValues && ( categories === undefined || categories.length === 0 ) ) {
        // Build filter recipe values to display.
        var searchResultFilters = [];
        var ctx = appCtxService.getCtx( 'searchIncontextInfo' );
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
                    searchResultFilters = exports.getSearchResultFilters( searchResultFilters, category );
                }
            } );
        }

        ctx.searchResultFilters = searchResultFilters;
        appCtxService.updateCtx( 'searchIncontextInfo', ctx );

        return undefined;
    }
    var groupByProperty = response.objectsGroupedByProperty.internalPropertyName;
    filterPanelUtils.setIncontext( true );
    return exports.getCategories2( categories, categoryValues, groupByProperty, false, true, true );
};

/**
 * Returns categories from "performSearchViewModel4"
 *
 * @param {Object} response The response from the search SOA
 *
 * @returns {ObjectArray} The array of child node objects to be displayed
 */
export let getSearchFilterCategories = function( response ) {
    response.searchFilterMap = response.searchFilterMap5;
    return exports.getCategories( response );
};

/**
 * Parses boolean
 *
 * @param {String} value to evaluated
 *
 * @returns {Boolean} true or false.
 */
export let parseBoolean = function( value ) {
    if( value === undefined || value === null ) {
        return false;
    }
    return ( /^true$/i ).test( value );
};

/**
 * Returns categories from search response
 *
 * @param {ObjectArray} categories categories
 * @param {ObjectArray} categoryValues category values
 * @param {String} groupProperty property to be grouped on
 * @param {Boolean} colorToggle true if to toggle color
 * @param {ObjectArray} currentCategories current categories
 * @param {Boolean} showRange true if to show range
 * @param {Boolean} incontext true if it's for in context search
 * @param {Boolean} skipUnpopulated true if unpopulated categories should NOT be appended to the list of populated categories
 * @returns {ObjectArray} The array of child node objects to be displayed.
 */
export let updateCategories = function( categories, categoryValues, groupProperty, colorToggle, currentCategories,
    showRange, incontext, skipUnpopulated ) {
    filterPanelUtils.setIncontext( incontext );
    exports.getCategories2( categories, categoryValues, groupProperty, colorToggle, showRange, incontext, skipUnpopulated );
    categories = exports.retainExpansionStateOfCategory( categories, currentCategories );
    categories = exports.updateCurrentCategoriesResults( categories, currentCategories );
    return categories;
};

/**
 *  @function updateCurrentCategoriesResults - update 'results' parameter for categories
 *  @param {ObjectArray} categories - the list of categories
 *  @param {ObjectArray} currentCategories - the list of categories currently worked on
 *  @returns {ObjectArray} categories - the list of current categories updated with results parameter
 */

export let updateCurrentCategoriesResults = function( categories, currentCategories ) {
    if( categories ) {
        for( var index = 0; index < categories.length; index++ ) {
            var isCurrentCategory = false;
            if( currentCategories ) {
                for( var currCatIndex = 0; currCatIndex < currentCategories.length; currCatIndex++ ) {
                    if( currentCategories[ currCatIndex ] && categories[ index ] &&
                        currentCategories[ currCatIndex ].internalName === categories[ index ].internalName ) {
                        isCurrentCategory = true;
                        break;
                    }
                }
                if( isCurrentCategory ) {
                    exports.updateCategoryResults( categories[ index ], true );
                }
            }
        }
    }
    return categories;
};

/**
 * @function retainExpansionStateOfCategories - if AWC_LIMITED_FILTER_CATEGORIES is false, then retain expansion of categories
 * @param { Object } categories - the list of categories
 * @param { Array } categories - the previous context of categories
 */

export let retainExpansionStateOfCategory = function( categories, currentCategories ) {
    var isLimitedCategoriesEnabled = filterPanelUtils.isLimitedCategoriesFeatureEnabled();
    _.forEach( categories, function( category ) {
        var index = _.findIndex( currentCategories, function( cat ) {
            return cat.internalName === category.internalName;
        } );
        if( index > -1 ) {
            var currentCategory = currentCategories[ index ];
            if( !isLimitedCategoriesEnabled ) {
                //retain category expand state
                category.showExpand = currentCategory.showExpand;
                category.expand = currentCategory.expand;
                if( currentCategory.showMoreFilter !== undefined ) {
                    category.showMoreFilter = currentCategory.showMoreFilter;
                }
            } else {
                // retain just  showMoreFilter
                if( currentCategory.showMoreFilter !== undefined ) {
                    category.showMoreFilter = currentCategory.showMoreFilter;
                }
            }
        }
    } );
    return categories;
};

/**
 * @function decideExpansionStateOfCategory - if AWC_LIMITED_FILTER_CATEGORIES is true, then if filterValues has length > 0, expand the category
 * @param { Object } category - the current category
 * @param { Integer } defaultFilterFieldDisplayCount - the default number of filters
 */

export let decideExpansionStateOfCategory = function( category, defaultFilterFieldDisplayCount ) {
    var isLimitedCategoriesEnabled = filterPanelUtils.isLimitedCategoriesFeatureEnabled();
    var isCategoryTypeCls = filterPanelUtils.isClsCategory( category );
    var isFilterSelectedForCls = filterPanelUtils.ifFilterSelectedForCls( category );
    if( isLimitedCategoriesEnabled && filterPanelUtils.isSearchDataProvider() ) {
        if( category.filterValues && ( isCategoryTypeCls && isFilterSelectedForCls || category.filterValues.length > 0 ) && category.expand === undefined ) {
            category.expand = true;
        }
    } else if( category.index < defaultFilterFieldDisplayCount && category.expand === undefined ) {
        category.expand = true;
    }
    return category;
};

/**
 * Utility function of getCategories2
 * @function getCategories2_procCategoryType
 * @param {OBJECT} category category
 * @param {ObjectArray} categoryValues category values
 */
export let getCategories2_procCategoryType = function( category, categoryValues ) {
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
};

/**
 * process the case of empty categories
 * Utility function of getCategories2
 * @function getCategories2_procEmptyCategories
 * @param {ObjectArray} categories categories
 * @param {ObjectArray} categoryValues category values
 * @param {OBJECT} contextObject context object
 * @param {ObjectArray} searchResultFilters breadcrumb items.
 */
export let getCategories2_procEmptyCategories = function( categories, categoryValues, contextObject, searchResultFilters ) {
    if( categoryValues && ( categories === undefined || categories.length === 0 ) ) {
        //Build filter recipe values to display.
        if( contextObject ) {
            var currentCategories = contextObject.searchIncontextCategories;
            _.forEach( currentCategories, function( category ) {
                if( category && category.internalName in categoryValues ) {
                    exports.getCategories2_procCategoryType( category, categoryValues );
                    exports.getSearchResultFilters( searchResultFilters, category );
                }
            } );
            contextObject.searchResultFilters = searchResultFilters;
        }
    }
};

/**
 * Returns categories from search response
 *
 * @param {ObjectArray} category categories
 * @param {INTEGER} index index
 * @param {ObjectArray} categories categories
 * @param {ObjectArray} categoryValues category values
 * @param {String} groupProperty property to be grouped on
 * @param {Boolean} colorToggle true if to toggle color
 * @param {Boolean} showRange true if to show range
 * @param {Boolean} incontext true if it's for in context search
 * @param {Object} contextObject context object
 * @param {ObjectArray} searchResultFilters breadcrumb items.
 */
export let getCategories2Int = function( category, index, categories, categoryValues, groupProperty, colorToggle, showRange, incontext, contextObject, searchResultFilters ) {
    category.index = index;
    category.showExpand = true;
    category.currentCategory = '';
    category.showEnabled = false;
    var _colorToggle = exports.parseBoolean( colorToggle );
    category.showColor = _colorToggle;

    var defaultFilterFieldDisplayCount = 10;
    var searchResponseInfo = appCtxService.getCtx( 'searchResponseInfo' );
    if( searchResponseInfo !== undefined && searchResponseInfo.defaultFilterFieldDisplayCount !== undefined ) {
        defaultFilterFieldDisplayCount = searchResponseInfo.defaultFilterFieldDisplayCount;
    }

    var isLimitedCategoriesEnabled = filterPanelUtils.isLimitedCategoriesFeatureEnabled();

    var catName = category.internalName;
    if( groupProperty.hasOwnProperty( 'internalPropertyName' ) ) {
        groupProperty = groupProperty.internalPropertyName;
    }
    var i = groupProperty.indexOf( '.' );
    if( i === -1 ) {
        i = category.internalName.indexOf( '.' );
        catName = category.internalName.substring( i + 1, category.internalName.length );
    }

    category = filterPanelCommonUtils.processCatGroupProperty( catName, groupProperty, category );

    category.filterValues = exports.getFiltersForCategory( category, categoryValues, groupProperty, _colorToggle );
    category = exports.decideExpansionStateOfCategory( category, defaultFilterFieldDisplayCount );

    category = filterPanelCommonUtils.processCategoryHasMoreFacetValues( category, incontext );

    if( catName === filterPanelUtils.PRESET_CATEGORY && incontext === true ) {
        var selectedFilters = _.filter( category.filterValues, function( key ) {
            return key.selected;
        } );
        if( selectedFilters.length > category.defaultFilterValueDisplayCount * 2 || category.hasMoreFacetValues ) {
            category.showFilterText = true;
        }
    } else if( category.filterValues.length > category.defaultFilterValueDisplayCount * 2 || category.hasMoreFacetValues ) {
        category.showFilterText = true;
    }

    category.filterLimitForCategory = exports.getFilterLimitForCategory( category );

    if( category.filterValues.length > category.defaultFilterValueDisplayCount &&
        category.showMoreFilter === undefined && category.filterLimitForCategory > category.defaultFilterValueDisplayCount ) {
        category.showMoreFilter = true;
    }

    category = filterPanelCommonUtils.processFilterCategories( showRange, category, categoryValues );

    exports.updateCategoryResults( category, true );
    if( contextObject ) {
        exports.getSearchResultFilters( searchResultFilters, category );
    }

    // Set category parameters required to differentiate a populated category from an unpopulated one.
    category = exports.setParametersForPopulatedCategory( category );

    categories = filterPanelCommonUtils.processSelectedPopulatedCategories( isLimitedCategoriesEnabled, category, categories );
};
/**
 * Returns categories from search response
 *
 * @param {ObjectArray} categories categories
 * @param {ObjectArray} categoryValues category values
 * @param {String} groupProperty property to be grouped on
 * @param {Boolean} colorToggle true if to toggle color
 * @param {Boolean} showRange true if to show range
 * @param {Boolean} incontext true if it's for in context search
 * @param {Boolean} skipUnpopulated true if unpopulated categories should NOT be appended to the list of populated categories
 * @param {Object} contextObject context object
 * @returns {ObjectArray} The array of child node objects to be displayed.
 */
export let getCategories2 = function( categories, categoryValues, groupProperty, colorToggle, showRange, incontext, skipUnpopulated, contextObject ) {
    if( categories === undefined ) {
        return undefined;
    }
    if( incontext === true && !contextObject ) {
        contextObject = appCtxService.getCtx( 'searchIncontextInfo' );
    }
    //This function reads the “AWC_CustomPropValueColor” preference value.
    //This is used to overide filter color in filter panel.
    filterPanelUtils.getPreferenceValue();

    var searchResultFilters = [];

    categories.refineCategories = [];
    categories.navigateCategories = [];
    // Currently, shape search does not provide group property in performsearch call. It calls groupByProperties separately.
    // So default groupProperty to the first category
    if( groupProperty === undefined && categories.length > 0 ) {
        groupProperty = categories[ 0 ].internalName;
    }

    exports.getCategories2_procEmptyCategories( categories, categoryValues, contextObject, searchResultFilters );
    _.forEach( categories, function( category, index ) {
        exports.getCategories2Int( category, index, categories, categoryValues, groupProperty, colorToggle, showRange, incontext, contextObject, searchResultFilters );
    } );
    if( !skipUnpopulated ) {
        exports.appendUnpopulatedCategories( categories, incontext );
    }

    filterPanelCommonUtils.processInContext( contextObject, searchResultFilters, categories );
    return categories;
};

/**
 * Set category parameters required to differentiate a populated category from unpopulated ones.
 * @param {Object} category The input category
 * @returns {Object} category
 */
export let setParametersForPopulatedCategory = function( category ) {
    // isSelected is used to identify an empty category that has just been populated.
    if( category.isSelected === undefined ) {
        category.isSelected = false;
    }

    // isPopulated will differentiate empty categories from populated categories
    if( category.isPopulated === undefined ) {
        category.isPopulated = category.filterValues !== undefined && category.filterValues.length !== 0;
    }

    // isServerSearch will determine whether to route a filter-in-values search within a category to server
    if( category.isServerSearch === undefined ) {
        category.isServerSearch = category.hasMoreFacetValues;

        // Ensure category with different internal and display names are always filtered on client
        if( category.isServerSearch && category.internalName === 'Categorization.category' ) {
            category.isServerSearch = false;
        }
    }

    return category;
};

/**
 * Appends unpopulated/empty categories to the list of populated categories.
 *
 * @param {ObjectArray} categories categories
 * @param {Boolean}     incontext true if it's for in context search
 * @returns {ObjectArray} The array of categories to be displayed.
 */
export let appendUnpopulatedCategories = function( categories, incontext ) {
    if( categories === undefined ) {
        categories = [];
    }
    if( categories.refineCategories === undefined ) {
        categories.refineCategories = [];
    }

    var searchResponseCtx = incontext ? appCtxService.getCtx( 'searchIncontextInfo' ) : appCtxService.getCtx( 'searchResponseInfo' );
    if( searchResponseCtx === undefined || searchResponseCtx.unpopulatedSearchFilterCategories === undefined ) {
        return undefined;
    }

    // Temporary container to hold classification categories for sorting later on
    var classificationCategories = [];
    _.forEach( searchResponseCtx.unpopulatedSearchFilterCategories, function( emptyCategory ) {
        emptyCategory = filterPanelCommonUtils.processEmptyCategory( emptyCategory );
        if( emptyCategory && emptyCategory.internalName && emptyCategory.internalName.substr( 0, 4 ) === 'CLS.' ) {
            classificationCategories.push( emptyCategory );
        } else {
            categories.refineCategories.push( emptyCategory );
        }
    } );

    // Sort classification categories alphabetically
    classificationCategories.sort( function( a, b ) {
        if( a.displayName && b.displayName ) {
            return a.displayName.toUpperCase().localeCompare( b.displayName.toUpperCase() );
        }
    } );

    Array.prototype.push.apply( categories.refineCategories, classificationCategories );

    return categories;
};

/**
 * Returns current maximum number of filters to be shown on the given category
 *
 * @param {Object} category category
 * @returns {INTEGER} current maximum number of filters to be shown on the given category.
 */
export let numberOfFiltersShown = function( category, isMore ) {
    var numToReturn = category.filterValues.length;
    if( ( category.showMoreFilter || category.showMoreFilter === undefined ) && category.filterLimitForCategory > category.defaultFilterValueDisplayCount ) {
        if ( isMore ) {
            numToReturn = category.results.length === category.defaultFilterValueDisplayCount ? category.filterLimitForCategory : category.results.length + category.filterLimitForCategory;
        } else{
            numToReturn = category.defaultFilterValueDisplayCount;
        }
    }
    return numToReturn;
};

/**
 * Worker function for expanding or collapsing Filters for the given category
 *
 * @param {Object} category category
 */
export let toggleFilters = function( category, isMore ) {
    var context = {
        category: category
    };
    exports.updateCategoryResults( category, undefined, isMore );
    eventBus.publish( 'toggleFilters', context );
};

/**
 * Expanding or collapsing Filters for the given category
 *
 * @param {BOOLEAN} isMore true if it's "More..." link was clicked. false if "Less..."
 * @param {Object} category category
 */
export let toggleFiltersSoa = function( isMore, category ) {
    var ctxSearch = appCtxService.getCtx( 'search' );
    if( !ctxSearch ) {
        ctxSearch = {};
    }
    ctxSearch.valueCategory = category;
    category.morelessClicked = true;
    // handle 3 cases
    // if clicked on client 'More...' when not using filtering within filters
    if( isMore && ( category.showMoreFilter || !category.hasMoreFacetValues ) ) {
        if( category.filterValues.length <= category.results.length + category.filterLimitForCategory ) {
            category.showMoreFilter = false;
        }
        toggleFilters( category, true );
    } else if( isMore && !category.showMoreFilter && category.hasMoreFacetValues ) {
        category.showMoreFilter = false;
        category.startIndexForFacetSearch = category.filterValues.length;
        // if clicked on server 'More...'
        var context = {
            source: 'filterPanel',
            category: category,
            expand: category.expand
        };
        eventBus.publish( 'toggleExpansionUnpopulated', context );
    } else if( !isMore ) {
        // if clicked on 'Less'
        category.showMoreFilter = true;
        toggleFilters( category );
        var numOfFacets = category.filterValues.length;
        if( numOfFacets > category.filterLimitForCategory && category.isServerSearch ) {
            var ctxSearchResponseInfo = appCtxService.getCtx( 'searchResponseInfo' );
            if( ctxSearchResponseInfo ) {
                filterPanelUtils.arrangeFilterMap( ctxSearchResponseInfo.searchFilterMap, category, category.filterLimitForCategory );
            }
            category.hasMoreFacetValues = true;
            category.endIndex = category.filterLimitForCategory;
            eventBus.publish( 'updateFilterPanel', {} );
        }
    }
};

/**
 * Returns the search wildcard setting
 *
 * @returns {INTEGER} the search wildcard setting.
 */
export let getSearchFilterWildcard = function() {
    var searchFilterWildcardNumer = 3;
    try {
        var preferences = appCtxService.getCtx( 'preferences' );
        if( preferences ) {
            searchFilterWildcardNumer = _.toInteger( preferences.AWC_search_filter_wildcard );
            if( searchFilterWildcardNumer !== 0 && searchFilterWildcardNumer !== 1 && searchFilterWildcardNumer !== 2 && searchFilterWildcardNumer !== 3 ) {
                searchFilterWildcardNumer = preferences.AWC_search_automatic_wildcard ? preferences.AWC_search_automatic_wildcard : 3;
            }
        }
    } catch ( e ) {
        logger.error( 'Error in retrieving the preference of AWC_search_filter_wildcard. Please ensure the preference is defined correctly.' );
        logger.error( e );
    }
    return searchFilterWildcardNumer;
};

/**
 * Returns filters for the given category filtered by the input in the searchbox
 *
 * @param {ObjectArray} items raw set of filters
 * @param {STRING} text input in the searchbox
 * @returns {ObjectArray} filtered set of filters
 */
export let getFilteredFilterValues = function( items, text ) {
    if( text === undefined || !text || text.length === 0 ) {
        return items;
    }
    var _text = text;
    if( _text.indexOf( '*' ) > -1 ) {
        _text = _text.replace( /[*]/gi, ' ' );
    }
    // split search text on space
    var searchTerms = _text.split( ' ' );
    searchTerms.forEach( function( term ) {
        if( term && term.length ) {
            items = _.filter( items, function( o ) {
                //default to *string*, i.e., searchFilterWildcardNumer === 3
                return o.name.toLowerCase().indexOf( term.toLowerCase() ) > -1;
            } );
        }
    } );

    return items;
};
export let isMoreLinkVisible = function( category ) {
    var isVisible = false;
    if( category.results && category.results.length >= category.defaultFilterValueDisplayCount && category.showMoreFilter || category.hasMoreFacetValues ) {
        isVisible = true;
    }
    return isVisible;
};

export let isLessLinkVisible = function( category ) {
    var isVisible = false;
    if( category.results && category.results.length > category.defaultFilterValueDisplayCount ) {
        isVisible = true;
    }
    return isVisible;
};

// eslint-disable-next-line valid-jsdoc
/**
 * Updates the given category with the final set of filters
 *
 * @param {Object} category category
 * @param {BOOLEAN} skipClientFiltering true if skip client side filtering
 */
export let updateCategoryResults = function( category, skipClientFiltering, isMore ) {
    if( category ) {
        var results = category.filterValues;
        if( !skipClientFiltering ) {
            results = exports.getFilteredFilterValues( category.filterValues, category.filterBy );
        }
        category.numberOfFiltersShown = exports.numberOfFiltersShown( category, isMore );
        category.results = _.slice( results, 0, category.numberOfFiltersShown );
        return category.results;
    }
    return null;
};

/**
 * Returns the filterLimitForCategory value for a given category.
 *
 * @param {Object} category the given category
 *
 * @returns {INTEGER} the filter show count for the given category
 */
export let getFilterLimitForCategory = function( category ) {
    var filterLimitForCategory = _defaultFilterLimit;
    var preferences = appCtxService.getCtx( 'preferences' );
    if( preferences !== undefined ) {
        var filterLimits = preferences.AWC_Category_Filter_Show_Count;
        if( filterLimits && _.isArray( filterLimits ) ) {
            _.forEach( filterLimits, function( filterLimit ) {
                var filterCount = _.split( filterLimit, '=' );
                if( _.startsWith( filterLimit, category.internalName + '=' ) ) {
                    filterLimitForCategory = _.toInteger( filterCount[ 1 ] );
                    if( filterCount[ 1 ] === 'ALL' ) {
                        filterLimitForCategory = Number.MAX_SAFE_INTEGER;
                    } else if( filterCount[ 1 ] === 'HIDDEN' ) {
                        filterLimitForCategory = 0;
                    } else if( _.toInteger( filterCount[ 1 ] ) < category.defaultFilterValueDisplayCount ) {
                        filterLimitForCategory = category.defaultFilterValueDisplayCount;
                    }
                    return filterLimitForCategory;
                } else if( _.startsWith( filterLimit, 'Default=' ) ) {
                    var defaultCount = _.split( filterLimit, '=' );
                    if( _.toInteger( defaultCount[ 1 ] ) > 0 ) {
                        _defaultFilterLimit = _.toInteger( defaultCount[ 1 ] );
                        filterLimitForCategory = _defaultFilterLimit;
                    } else {
                        filterLimitForCategory = _defaultFilterLimit;
                    }
                }
            } );
        } else {
            filterLimitForCategory = _defaultFilterLimit;
        }
    } else {
        return filterLimitForCategory;
    }
    return filterLimitForCategory;
};

/**
 * Returns search result filters for preset filters
 *
 * @param {Object} category - category
 * @returns {Object} search result filters
 */
function getPresetResultFilters( category ) {
    var selectedFilterVals = [];
    if( !filterPanelUtils.getHasTypeFilter() ) {
        return selectedFilterVals;
    }
    // remove filtervalues which are not in source map
    var ctx = appCtxService.getCtx( 'searchIncontextInfo' );
    if( ctx ) {
        category.filterValues = _.filter( category.filterValues, function( filter ) {
            var filters = ctx.inContextMap[ filterPanelUtils.PRESET_CATEGORY ];

            var index = _.findIndex( filters, function( value ) {
                return value.stringValue === filter.internalName;
            } );
            if( index > -1 ) {
                return filter;
            }
        } );
        category.results = category.filterValues;
    }

    // remove all initial unselected preset filters
    if( filterPanelUtils.isPresetFilters() ) {
        category.filterValues = _.filter( category.filterValues, function( filter ) {
            return filter.selected;
        } );
    }

    for( var i in category.filterValues ) {
        var filterVal = category.filterValues[ i ];

        // if all filters are selected which happens for preset-category, reset the selected flag
        if( filterPanelUtils.isPresetFilters() ) {
            filterVal.selected = false;
        }
        if( filterVal.selected ) {
            selectedFilterVals.push( filterVal );
        }
    }
    return selectedFilterVals;
}

/**
 * Returns search result filters for object filters
 *
 * @param {Object} category - category
 * @returns {Object} search result filters
 */
function getSearchResultObjectFilters( category ) {
    var selectedFilterVals = [];
    for( var ii in category.filterValues.parentnodes ) {
        var filterVal = category.filterValues.parentnodes[ ii ];
        if( filterVal.selected ) {
            filterVal.name = filterVal.stringDisplayValue;
            filterVal.internalName = filterVal.stringValue;
            selectedFilterVals.push( filterVal );
        }
    }

    return selectedFilterVals;
}

/**
 * Returns search result filters for date filters
 *
 * @param {Object} category - category
 * @returns {Object} search result filters
 */
function getSearchResultDateFilters( category ) {
    var selectedFilterVals = [];
    var startDate = category.daterange.startDate.dbValue;
    var endDate = category.daterange.endDate.dbValue;
    var filter = {};
    var dateRangeFilter = filterPanelUtils.getDateRangeDisplayString( startDate, endDate );
    filter.name = dateRangeFilter.displayName;
    filter.categoryType = dateRangeFilter.categoryType;
    filter.type = category.type;
    selectedFilterVals.push( filter );

    return selectedFilterVals;
}

/**
 * Returns search result filters for numeric filters
 *
 * @param {Object} category - category
 * @returns {Object} search result filters
 */
function getSearchResultNumericFilters( category ) {
    var selectedFilterVals = [];
    var startRange = category.numericrange.startValue.dbValue;
    var endRange = category.numericrange.endValue.dbValue;
    var filter = {};
    var numericRangeFilter = filterPanelUtils.getNumericRangeDisplayString( startRange, endRange );
    filter.name = numericRangeFilter.displayName;
    filter.categoryType = numericRangeFilter.categoryType;
    filter.type = category.type;
    selectedFilterVals.push( filter );
    return selectedFilterVals;
}

/**
 * @param {Object} searchResultFilters - search result filters
 * @param {Object} category - category
 * @returns {Object} search result filters
 */
export let getSearchResultFilters = function( searchResultFilters, category ) {
    var selectedFilterVals = [];

    if( filterPanelUtils.getHasTypeFilter() && category.internalName === filterPanelUtils.PRESET_CATEGORY ) {
        selectedFilterVals = getPresetResultFilters( category );
    } else {
        if( category.type === 'ObjectFilter' ) {
            selectedFilterVals = getSearchResultObjectFilters( category );
        } else {
            if( category.type === 'DateFilter' && category.daterange.dateRangeSelected ) {
                selectedFilterVals = getSearchResultDateFilters( category );
            } else if( category.type === 'NumericFilter' && category.numericrange.numericRangeSelected ) {
                selectedFilterVals = getSearchResultNumericFilters( category );
            }
            selectedFilterVals = filterPanelCommonUtils.processCategoryFilterValues( category, selectedFilterVals );
        }
    }
    if( selectedFilterVals.length > 0 ) {
        var searchResultFilter = {
            searchResultCategory: category.displayName,
            searchResultCategoryInternalName: category.internalName,
            filterValues: selectedFilterVals
        };
        searchResultFilters.push( searchResultFilter );
    }
    return searchResultFilters;
};

/**
 * Returns the filter values for a category based on the type.
 *
 * @param {Object} category from the getCategoryValues
 * @param {Object} categoryValues from the getCategoryValues
 * @param {Object} groupProperty category grouped by
 * @param {Object} colorToggle true if color bar is shown
 *
 * @returns {ObjectArray} The array of filters for category
 */
export let getFiltersForCategory = function( category, categoryValues, groupProperty, colorToggle ) {
    var filterValues = [];

    var internalName = category.internalName;
    var values = categoryValues[ internalName ];
    if( values && values.length > 0 ) {
        category.type = values[ 0 ].searchFilterType;
        if( category.type === 'StringFilter' || category.type === 'NumericFilter' ) {
            filterValues = getTypeFiltersForCategory( category, values, groupProperty, colorToggle );
        } else if( category.type === 'DateFilter' ) {
            filterValues = getDateFiltersForCategory( category, categoryValues, groupProperty, colorToggle );
            if( _.isEmpty( filterValues ) ) {
                // could be date range
                var filterValue = {};
                filterValues[ 0 ] = filterValue;
            }
        } else if( category.type === 'RadioFilter' ) {
            filterValues = getToggleFiltersForCategory( category, values );
        } else if( category.type === 'ObjectFilter' ) {
            filterValues = getObjectFilters( values );
        } else {
            throw 'Unsupported filter type ' + category.type + ' found for category ' + category.displayName;
        }
    }
    category.filterCount = filterValues.length;
    return filterValues;
};

/**
 * Returns filter values for a date category. List contains all years or selected year and months under it
 *
 * @param {Object} category from the getCategoryValues *
 * @param {ObjectArray} categoryValues from the getCategoryValues
 * @param {Object} groupProperty category grouped by
 * @param {Object} colorToggle true if color bar is shown
 *
 * @returns {ObjectArray} The array of filters for category
 */
function getTypeFiltersForCategory( category, categoryValues, groupProperty, colorToggle ) {
    var internalName = category.internalName;
    var catName = category.internalName;
    var i = groupProperty.indexOf( '.' );
    if( i === -1 ) {
        i = internalName.indexOf( '.' );
        catName = internalName.substring( i + 1, category.internalName.length );
    }

    var color = colorToggle && catName === groupProperty;

    // Set the color on the first "defaultFilterValueDisplayCount" values and any values that are selected (in that order)
    // Skip numeric range filters for coloring. The filter display count needs to be adjusted accordingly
    var filterDisplayCount = category.defaultFilterValueDisplayCount;
    var tmpValsToSetColor = categoryValues.filter( function( categoryValue, index ) {
        if( categoryValue.startEndRange === 'NumericRange' ) {
            filterDisplayCount++;
        }
        return ( index < filterDisplayCount || categoryValue.selected ) &&
            categoryValue.startEndRange !== 'NumericRange';
    } );

    var valsToSetColor;
    // Colors can only be shown on first 9. Remove items as necessary
    if( tmpValsToSetColor.length < 9 ) {
        valsToSetColor = tmpValsToSetColor;
    } else {
        valsToSetColor = tmpValsToSetColor.filter( function( categoryValue, index ) {
            return index < 9;
        } );
    }

    // Create a filter value for each category value
    var filterValues = categoryValues.map( function( categoryValue ) {
        // Pass -1 as index of category should not have a color
        var filterValue = getFilterValue( internalName, categoryValue, color, valsToSetColor
            .indexOf( categoryValue ) );
        if( category.type === 'NumericFilter' ) {
            filterValue.startNumericValue = categoryValue.startNumericValue;
            filterValue.endNumericValue = categoryValue.endNumericValue;
            filterValue.startEndRange = categoryValue.startEndRange;
        }
        return filterValue;
    } );
    // Put the selected filters first
    return filterValues.filter( function( val ) {
        return val.selected;
    } ).concat( filterValues.filter( function( val ) {
        return !val.selected;
    } ) );
}
/**
 * @param {Object} categoryValue - category value
 * @return {String} filter display value
 */
function getFilterDisplayName( categoryValue ) {
    if( categoryValue.stringValue === '$NONE' && categoryValue.stringDisplayValue === '' ) {
        return _noFilterValue;
    }
    return categoryValue.stringDisplayValue;
}

/**
 * Parses & formats the object filters for display in the UI.
 *
 * @param {ObjectArray} values the filter values.
 * @returns {Object} the filter values formatted with parent and child nodes
 */
function getObjectFilters( values ) {
    var filterValue = {
        parentnodes: [],
        childnodes: []
    };

    _.forEach( values, function( value ) {
        value.showCount = value.count;
        if( value.selected ) {
            filterValue.parentnodes.push( value );
        } else {
            filterValue.childnodes.push( value );
        }
    } );

    return filterValue;
}

/**
 * Returns filter values for a date category. List contains all years or selected year and months under it
 *
 * @param {Object} category category
 * @param {ObjectArray} categoryValues category values
 * @param {String} groupProperty property to be grouped on
 * @param {Boolean} colorToggle true if to toggle color
 * @returns {ObjectArray} The array of child node objects to be displayed.
 */
function getDateFiltersForCategory( category, categoryValues, groupProperty, colorToggle ) {
    var filterValues = [];

    var internalName = category.internalName + YEAR_SUFFIX;
    var color = colorToggle && internalName.indexOf( groupProperty ) !== -1;

    var values = categoryValues[ internalName ];
    if( !values ) {
        internalName = category.internalName + YEAR_MONTH_SUFFIX;
        values = categoryValues[ internalName ];
        if( !values ) {
            internalName = category.internalName + WEEK_SUFFIX;
            values = categoryValues[ internalName ];
        }
        if( !values ) {
            internalName = category.internalName + YEAR_MONTH_DAY_SUFFIX;
            values = categoryValues[ internalName ];
        }
        if( values ) {
            filterValues = addAllDates( category, internalName, values, color, 0 );
        }
        return filterValues;
    }
    var selectedYear = isDateFilterSelected( values );
    if( selectedYear === null ) {
        // add all years
        filterValues = addAllDates( category, internalName, values, color, 0 );
    } else {
        // add selected year and months for the year
        filterValues.push( getDateFilterValue( category, internalName, selectedYear, color, 0, 0 ) );
        var monthValues = getDateFiltersForYear( category, categoryValues, groupProperty, colorToggle, selectedYear );
        for( var i = 0; i < monthValues.length; i++ ) {
            filterValues.push( monthValues[ i ] );
        }
    }

    return filterValues;
}

/**
 * Returns filter values for a date year category. List contains all months or selected month and weeks under it
 *
 * @param {Object} category category
 * @param {ObjectArray} categoryValues category values
 * @param {String} groupProperty property to be grouped on
 * @param {Boolean} colorToggle true if to toggle color
 * @param {Object} selectedYear Year currently selected
 * @returns {ObjectArray} The array of filters for category
 */
function getDateFiltersForYear( category, categoryValues, groupProperty, colorToggle, selectedYear ) {
    var filterValues = [];
    var internalName = category.internalName + YEAR_MONTH_SUFFIX;
    var color = colorToggle && internalName.indexOf( groupProperty ) !== -1;

    var values = categoryValues[ internalName ];
    if( !values ) {
        values = [];
    }
    var selectedMonth = isDateFilterSelected( values );
    if( selectedMonth === null ) {
        // add all months
        filterValues = addAllDates( category, internalName, values, color, 1, selectedYear );
    } else {
        // add selected month and weeks for the month
        filterValues.push( getDateFilterValue( category, internalName, selectedMonth, color, 0, 1 ) );
        var weekValues = getDateFiltersForYearMonth( category, categoryValues, groupProperty, colorToggle, selectedMonth );
        for( var i = 0; i < weekValues.length; i++ ) {
            filterValues.push( weekValues[ i ] );
        }
    }

    return filterValues;
}

/**
 * Returns filter values for a category. List contains all weeks or selected week and days under it
 *
 * @param {Object} category category
 * @param {ObjectArray} categoryValues category values
 * @param {String} groupProperty property to be grouped on
 * @param {Boolean} colorToggle true if to toggle color
 * @param {Object} selectedMonth Year-Month currently selected
 * @returns {ObjectArray} The array of filters for category
 */
function getDateFiltersForYearMonth( category, categoryValues, groupProperty, colorToggle, selectedMonth ) {
    var filterValues = [];
    var internalName = category.internalName + WEEK_SUFFIX;
    var color = colorToggle && internalName.indexOf( groupProperty ) !== -1;

    var values = categoryValues[ internalName ];
    if( !values ) {
        values = [];
    }
    var selectedWeek = isDateFilterSelected( values );
    if( selectedWeek === null ) {
        // add all months
        filterValues = addAllDates( category, internalName, values, color, 2, selectedMonth );
    } else {
        // add selected week and days for the week
        filterValues.push( getDateFilterValue( category, internalName, selectedWeek, color, 0, 2 ) );
        var dayValues = getDateFiltersForYearMonthDay( category, categoryValues, groupProperty, colorToggle, selectedWeek );
        for( var i = 0; i < dayValues.length; i++ ) {
            filterValues.push( dayValues[ i ] );
        }
    }

    return filterValues;
}

/**
 * Returns filter values for a category. List contains all days under the week
 *
 * @param {Object} category category
 * @param {ObjectArray} categoryValues category values
 * @param {String} groupProperty property to be grouped on
 * @param {Boolean} colorToggle true if to toggle color
 * @param {Object} selectedWeek Week currently selected
 * @returns {ObjectArray} The array of filters for category
 */
function getDateFiltersForYearMonthDay( category, categoryValues, groupProperty, colorToggle, selectedWeek ) {
    var filterValues = [];
    var internalName = category.internalName + YEAR_MONTH_DAY_SUFFIX;
    var color = colorToggle && internalName.indexOf( groupProperty ) !== -1;

    var values = categoryValues[ internalName ];
    if( values ) {
        if( typeof selectedWeek !== 'undefined' ) {
            var startTime = new Date( selectedWeek.startDateValue ).getTime();
            var endTime = new Date( selectedWeek.endDateValue ).getTime();
            values = values.filter( function( filterItem ) {
                var startTimeForDay = new Date( filterItem.startDateValue ).getTime();
                var endTimeForDay = new Date( filterItem.endDateValue ).getTime();
                if( startTimeForDay >= startTime && endTimeForDay <= endTime ) {
                    return true;
                }
                return false;
            } );
        }
        for( var i = 0; i < values.length; i++ ) {
            filterValues.push( getDateFilterValue( category, internalName, values[ i ], color, i, 3 ) );
        }
    }

    return filterValues;
}

/**
 * Returns all dates for a given year, month or week.
 *
 * @param {Object} category - category
 * @param {String} internalName - internal name
 * @param {Array} values - set of dates
 * @param {String} color - color
 * @param {Object} drilldown - drill down
 * @param {Object} selectedDate - Currently selected year/month/week
 * @return {Object} filter
 */
function addAllDates( category, internalName, values, color, drilldown, selectedDate ) {
    var filterValuesToAdd = values;
    if( typeof selectedDate !== 'undefined' ) {
        var startTime = new Date( selectedDate.startDateValue ).getTime();
        var endTime = new Date( selectedDate.endDateValue ).getTime();
        filterValuesToAdd = filterValuesToAdd.filter( function( filterItem ) {
            if( new Date( filterItem.startDateValue ).getTime() >= startTime && new Date( filterItem.endDateValue ).getTime() <= endTime ) {
                return true;
            }
            return false;
        } );
    }
    // Create a filter value for each category value
    return filterValuesToAdd.map( function( value, index ) {
            // Pass -1 as index of category should not have a color
            return getDateFilterValue( category, internalName, value, color, index, drilldown );
        } )

        // Remove color from filters that should not have a filter
        .map( function( filter, index ) {
            // dirty map, modifies data
            filter.color = index < category.defaultFilterValueDisplayCount ? filter.color : '';
            return filter;
        } );
}

/**
 * Returns true if a a date is selected in the given list
 *
 * @param {ObjectArray} values set of dates.
 * @returns {Boolean} true if filter is selected.
 */
function isDateFilterSelected( values ) {
    return isFilterSelected( values, false );
}

/**
 * Returns true if a a date is selected in the given list
 *
 * @param {ObjectArray} values set of dates.
 * @param {Boolean} flag flag.
 * @returns {Boolean} true if filter is selected.
 */
function isFilterSelected( values, flag ) {
    var selectedValue = null;
    for( var i = 0; i < values.length; i++ ) {
        if( values[ i ].selected === true ) {
            selectedValue = values[ i ];
            if( flag ) {
                selectedValue.index = i;
            }
            break;
        }
    }
    return selectedValue;
}

/**
 * Returns a given date filter's value
 * @param {Object} category category
 * @param {String} categoryName category name
 * @param {Object} categoryValue category value
 * @param {String} color color
 * @param {Integer} index index
 * @param {Bollean} drilldown true if to drill down
 * @returns {Object} filter value
 */
function getDateFilterValue( category, categoryName, categoryValue, color, index, drilldown ) {
    var filterValue = {};
    var filterIndex = drilldown + index;
    filterValue = getFilterValue( categoryName, categoryValue, color, filterIndex );
    if( filterIndex >= category.defaultFilterValueDisplayCount + drilldown || filterIndex >= 9 ) {
        filterValue.colorIndex = -1;
    }

    filterValue.startDateValue = categoryValue.startDateValue;
    filterValue.endDateValue = categoryValue.endDateValue;
    filterValue.drilldown = drilldown;
    if( drilldown > 0 ) {
        filterValue.type = 'DrilldownDateFilter';
        filterValue.showDrilldown = true;
    } else {
        filterValue.type = 'DateFilter';
    }
    return filterValue;
}

/**
 * Returns a given filter's value
 * @param {String} categoryName category name
 * @param {Object} categoryValue category value
 * @param {String} color color
 * @param {Integer} index index
 * @returns {Object} filter value
 */
function getFilterValue( categoryName, categoryValue, color, index ) {
    var filterValue = {};
    filterValue.categoryName = categoryName;
    filterValue.internalName = categoryValue.stringValue;
    filterValue.name = getFilterDisplayName( categoryValue );
    filterValue.count = categoryValue.count;
    filterValue.selected = categoryValue.selected;
    filterValue.type = categoryValue.searchFilterType;
    filterValue.showCount = filterValue.count;
    filterValue.showSuffixIcon = false;
    filterValue.drilldown = 0;

    filterPanelUtils.applyCustomColor( categoryName, categoryValue, filterValue );

    // if current category, set colors for first 5 items
    if( color ) {
        filterValue.showColor = true;
        if( index > -1 && !filterValue.color ) {
            filterValue.color = filterPanelUtils.getFilterColorValue( index );
        }
    }
    filterValue.colorIndex = index;

    return filterValue;
}

/**
 * Returns filter values for a radio category. List contains all years or selected year and months under it
 *
 * @param {Object} category the category
 * @param {ObjectArray} categoryValues the category values
 *
 * @returns {ObjectArray} The array of radio filters for category
 */
function getToggleFiltersForCategory( category, categoryValues ) {
    var internalName = category.internalName;

    // Create a filter value for each category value
    return categoryValues.map( function( categoryValue ) {
        return getFilterValue( internalName, categoryValue, null, null );
    } );
}

/**
 * Simple wrapper around $state.go with new searchCriteria
 *
 * @param {String} searchCriteria search criteria
 * @param {String} searchState search state
 * @returns {Object} routing return.
 */
export let simpleSearch = function( searchCriteria, searchState ) {
    return AwStateService.instance.go( searchState ? searchState : '.', {
        searchCriteria: searchCriteria
    } );
};

/**
 * Sets scroll info into context
 *
 */
export let setScrollPosition = function() {
    var scrollBar = $( '.aw-layout-panelBody' )[ 0 ];
    $( scrollBar ).scrollTop( 0 );
};

/**
 * Sets scroll info into context
 *
 * @param {Object} selectedNodeOffset selected Node Offset
 *
 */
export let updateScrollInfo = function( selectedNodeOffset ) {
    var scrollBarOffset = $( '.aw-layout-panelBody' )[ 0 ].offsetTop;

    var scrollInfo = {};
    scrollInfo.nodeOffset = selectedNodeOffset - scrollBarOffset;

    var ctx = appCtxService.getCtx( 'searchResponseInfo' );
    if( ctx ) {
        ctx.scrollInfo = scrollInfo;
        appCtxService.updateCtx( 'searchResponseInfo', ctx );
    }
};

/**
 * updateMostRecentSearchFilter
 *
 * @param {STRING} categoryDisplayName categoryDisplayName
 * @param {STRING} filterName filterName
 */
export let updateMostRecentSearchFilter = function( categoryDisplayName, filterName ) {
    var ctxSearch = appCtxService.getCtx( 'search' );
    if( !ctxSearch ) {
        ctxSearch = {};
    }
    ctxSearch.mostRecentSearchFilter = categoryDisplayName + '-' + filterName;
    appCtxService.updateCtx( 'search', ctxSearch );
};

export let loadConfiguration = function() {
    localeSvc.getLocalizedTextFromKey( 'UIMessages.noFilterValue', true ).then( result => _noFilterValue = result );
    localeSvc.getLocalizedTextFromKey( 'UIMessages.fromText', true ).then( result => _fromTextValue = result );
    localeSvc.getLocalizedTextFromKey( 'UIMessages.toText', true ).then( result => _toTextValue = result );
};

export let clearMostRecentSearchFilter = function() {
    var ctxSearch = appCtxService.getCtx( 'search' );
    if( !ctxSearch ) {
        ctxSearch = {};
    }
    delete ctxSearch.mostRecentSearchFilter;
    appCtxService.updateCtx( 'search', ctxSearch );
 };

loadConfiguration();

exports = {
    DATA_RANGE_FILTER,
    getCategories,
    getSearchFilterCategories,
    parseBoolean,
    updateCategories,
    updateCurrentCategoriesResults,
    retainExpansionStateOfCategory,
    decideExpansionStateOfCategory,
    getCategories2_procCategoryType,
    getCategories2_procEmptyCategories,
    getCategories2Int,
    getCategories2,
    numberOfFiltersShown,
    toggleFilters,
    toggleFiltersSoa,
    getSearchFilterWildcard,
    getFilteredFilterValues,
    isMoreLinkVisible,
    isLessLinkVisible,
    updateCategoryResults,
    getFiltersForCategory,
    getFilterLimitForCategory,
    simpleSearch,
    setScrollPosition,
    updateScrollInfo,
    getSearchResultFilters,
    loadConfiguration,
    setParametersForPopulatedCategory,
    appendUnpopulatedCategories,
    updateMostRecentSearchFilter,
    clearMostRecentSearchFilter
};
export default exports;
/**
 *
 * @memberof NgServices
 * @member filterPanelService
 * @param {$state} $state - Service to use.
 * @param {appCtxService} appCtxService - Service to use.
 * @param {dateTimeService} dateTimeService - Service to use.
 * @param {uwPropertyService} uwPropertyService - Service to use.
 * @param {localeService} localeSvc - Service to use.
 * @param {filterPanelUtils} filterPanelUtils - Service to use.
 * @returns {exports} Instance of this service.
 */
app.factory( 'filterPanelService', () => exports );

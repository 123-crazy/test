// Copyright (c) 2020 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/filterPanelCommonUtils
 * @requires js/filterPanelUtils
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import dateTimeService from 'js/dateTimeService';
import uwPropertyService from 'js/uwPropertyService';
import filterPanelUtils from 'js/filterPanelUtils';
import _ from 'lodash';
import localeService from 'js/localeService';

var YEAR_SUFFIX = '_0Z0_year';
var _fromTextValue = '';
var _toTextValue = '';

var exports = {};

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
 * Returns filter values for a date range category.
 *
 * @param {Object} category from the getCategoryValues *
 * @param {Object} categoryValues from the getCategoryValues
 *
 * @returns {ObjectArray} The date range for category
 */
function getDateRangeForCategory( category, categoryValues ) {
    var internalName = category.internalName;
    var values = categoryValues[ internalName ];
    var selectedDateRange = isDateFilterSelected( values );

    var daterange = {};
    daterange.dateRangeSelected = false;
    var sDate = dateTimeService.getNullDate();
    var eDate = dateTimeService.getNullDate();

    if( selectedDateRange !== null ) {
        daterange.dateRangeSelected = true;
        sDate = filterPanelUtils.getDate( selectedDateRange.startDateValue );
        eDate = filterPanelUtils.getDate( selectedDateRange.endDateValue );
    }
    var sDateStr = dateTimeService.formatDate( sDate );
    var eDateStr = dateTimeService.formatDate( eDate );

    // add start date property
    var startDateProperty = uwPropertyService.createViewModelProperty( '', '', 'DATE', sDate.getTime(), '' );
    startDateProperty.isEditable = true;
    startDateProperty.dateApi.isTimeEnabled = false;
    if( sDateStr.length === 0 ) {
        startDateProperty.dateApi.dateFormatPlaceholder = dateTimeService.getDateFormatPlaceholder();
    } else {
        startDateProperty.dateApi.dateValue = sDateStr;
        startDateProperty.dateApi.dateObject = sDate;
    }


    localeService.getLocalizedTextFromKey( 'SearchCoreMessages.startDate' ).then( function( result ) {
        startDateProperty.propertyDisplayName = category.displayName + ' - ' + result;
    } ).catch( () => {} );
    startDateProperty.propertyLabelDisplay = 'NO_PROPERTY_LABEL';

    // add end date property
    var endDateProperty = uwPropertyService.createViewModelProperty( '', '', 'DATE', eDate.getTime(), '' );
    endDateProperty.isEditable = true;
    endDateProperty.dateApi.isTimeEnabled = false;
    if( eDateStr.length === 0 ) {
        endDateProperty.dateApi.dateFormatPlaceholder = dateTimeService.getDateFormatPlaceholder();
    } else {
        endDateProperty.dateApi.dateValue = eDateStr;
        endDateProperty.dateApi.dateObject = eDate;
    }

    localeService.getLocalizedTextFromKey( 'SearchCoreMessages.endDate' ).then( function( result ) {
        endDateProperty.propertyDisplayName = category.displayName + ' - ' + result;
    } ).catch( () => {} );
    endDateProperty.propertyLabelDisplay = 'NO_PROPERTY_LABEL';

    daterange.startDate = startDateProperty;
    daterange.endDate = endDateProperty;

    return daterange;
}

/**
 * @param {Object} category - category
 * @returns {Object} filter
 */
function getDrilldownFilter( category ) {
    var tmpValue = category.filterValues[ 0 ];
    var count = category.defaultFilterValueDisplayCount;
    // drill down to see what is the last filter selected
    if( tmpValue.selected && tmpValue.internalName !== '$NONE' &&
        _.endsWith( tmpValue.categoryName, YEAR_SUFFIX ) ) { // year selected
        count++;
        if( category.filterValues[ 1 ] ) {
            tmpValue = category.filterValues[ 1 ];
            if( tmpValue.selected ) { // month selected
                count++;
                if( category.filterValues[ 2 ] ) {
                    tmpValue = category.filterValues[ 2 ];
                    if( tmpValue && tmpValue.selected ) { // week selected
                        count++;
                        if( category.filterValues[ 3 ] ) {
                            tmpValue = category.filterValues[ 3 ];
                        }
                    }
                }
            }
        }
    }
    if( tmpValue ) {
        tmpValue.drilldownCount = count;
    }
    return tmpValue;
}

/**
 * Returns filter values for a date range category.
 * @function getNumericRangeForCategory
 * @param {Object} category from the getCategoryValues
 * @returns {Object} numericRange
 */
function getNumericRangeForCategory( category ) {
    var values = category.filterValues;
    // Find numeric range
    var numericRangeFilter = null;
    var index = _.findIndex( values, function( value ) {
        return _.startsWith( value.startEndRange, filterPanelUtils.NUMERIC_RANGE );
    } );

    if( index > -1 ) {
        numericRangeFilter = values[ index ];

        // Remove range from list of values
        values.splice( index, 1 );
        category.filterValues = values;
    }
    var numericRange = {};
    numericRange.selected = false;
    var sRange;
    var eRange;

    if( numericRangeFilter !== null && numericRangeFilter.selected !== null ) {
        numericRange.numericRangeSelected = true;
        numericRange.selected = true;
        sRange = numericRangeFilter.startNumericValue;

        if( numericRangeFilter.startEndRange === filterPanelUtils.NumericRangeBlankStart ) {
            sRange = null;
        }

        eRange = numericRangeFilter.endNumericValue;
        if( numericRangeFilter.startEndRange === filterPanelUtils.NumericRangeBlankEnd ) {
            eRange = null;
        }
    }

    var startRangeProperty = uwPropertyService.createViewModelProperty( '', '', 'DOUBLE', sRange, '' );
    startRangeProperty.isEditable = true;
    uwPropertyService.setPlaceHolderText( startRangeProperty, _fromTextValue );

    // add end range property
    var endRangeProperty = uwPropertyService.createViewModelProperty( '', '', 'DOUBLE', eRange, '' );
    endRangeProperty.isEditable = true;
    uwPropertyService.setPlaceHolderText( endRangeProperty, _toTextValue );

    numericRange.startValue = startRangeProperty;
    numericRange.endValue = endRangeProperty;

    // save current values
    numericRange.filter = numericRangeFilter;

    return numericRange;
}

/**
 * Process filter cateogories - String, Date, Numeric and Radio.
 * @function processFilterCategories
 * @param {Boolean} showRange Boolean if it shows the range
 * @param {Object} category The input category
 * @param {ObjectArray} categoryValues categories
 * @returns {Object} category
 */
export let processFilterCategories = function( showRange, category, categoryValues ) {
    if( category.filterValues.length > 0 ) {
        if( category.type === 'StringFilter' ) {
            category.showStringFilter = true;
        } else if( category.type === 'DateFilter' ) {
            category.showDateFilter = true;
            category.showDateRangeFilter = showRange; // default
            if( showRange ) {
                category.daterange = getDateRangeForCategory( category, categoryValues );
            }

            // get last drilldown filter and adjust count accordingly
            var drillDownValue = getDrilldownFilter( category );
            category.drilldown = drillDownValue.drilldown;
            category.startDate = '';
            category.endDate = '';
        } else if( category.type === 'NumericFilter' ) {
            category.showNumericFilter = true;
            category.showNumericRangeFilter = showRange; // default
            if( showRange ) {
                category.numericrange = {};
                category.numericrange = getNumericRangeForCategory( category );
            }
        } else if( category.type === 'RadioFilter' ) {
            category.showRadioFilter = true;
        }
    }

    return category;
};

/**
 * @function processCatGroupProperty
 * @param {String} catName true if it's for in context search
 * @param {String} groupProperty property to be grouped on
 * @param {Object} category The category name
 * @returns {Object} category
 */
export let processCatGroupProperty = function( catName, groupProperty, category ) {
    if( catName === groupProperty ) {
        category.currentCategory = groupProperty;
        category.showEnabled = true;
    }

    return category;
};

/**
 * Returns true if the hasMoreFacetValues is true for the given category.
 *
 * @param {Object} category the given category
 * @param {BOOLEAN} incontext true if in context search
 * @returns {BOOLEAN} true if the hasMoreFacetValues is true for the given category
 */
export let getHasMoreFacetValues = function( category, incontext ) {
    var hasMoreFacetValuesForCategory = undefined;
    var hasMoreFacetValues = null;
    if( incontext ) {
        hasMoreFacetValues = appCtxService.getCtx( 'searchIncontextInfo.hasMoreFacetValues' );
    } else {
        hasMoreFacetValues = appCtxService.getCtx( 'searchResponseInfo.hasMoreFacetValues' );
    }
    if( hasMoreFacetValues && _.isArray( hasMoreFacetValues ) && _.indexOf( hasMoreFacetValues, category.internalName ) > -1 ) {
        hasMoreFacetValuesForCategory = true;
    }
    return hasMoreFacetValuesForCategory;
};

/**
 * @function processCategoryHasMoreFacetValues
 * @param {Object} category The category name
 * @param {Boolean} incontext true if it's for in context search
 * @returns {Object} category
 */
export let processCategoryHasMoreFacetValues = function( category, incontext ) {
    if( category.hasMoreFacetValues === undefined ) {
        category.hasMoreFacetValues = exports.getHasMoreFacetValues( category, incontext );
    }

    return category;
};

/**
 * @function processInContext
 * @param {OBJECT} contextObject context object
 * @param {ObjectArray} searchResultFilters The category name
 * @param {ObjectArray} categories Categories
 */
export let processInContext = function( contextObject, searchResultFilters, categories ) {
    if( contextObject ) {
        contextObject.searchResultFilters = searchResultFilters;
        contextObject.searchIncontextCategories = categories;
    }
};

/**
 * Process the categories.
 * @function processSelectedPopulatedCategories
 * @param {Object} isLimitedCategoriesEnabled variable to check if limited categories are enabled
 * @param {Object} category The input category
 * @param {ObjectArray} categories categories
 * @returns {ObjectArray} categories
 */
export let processSelectedPopulatedCategories = function( isLimitedCategoriesEnabled, category, categories ) {
    if( category.type === 'ObjectFilter' ) {
        categories.navigateCategories.push( category );
    } else if( category.isPopulated && !category.isSelected ) {
        // To maintain the order of empty categories, add the category to final list only if category is populated but not selected.
        categories.refineCategories.push( category );
    } else if( !category.isPopulated && isLimitedCategoriesEnabled ) {
        // With limited filters, we want even the non object filters to be visible on the client, even if they are sent as empty from the server.
        categories.refineCategories.push( category );
    }

    return categories;
};

/**
 * processEmptyCategory
 * @function processEmptyCategory
 * @param {Object} emptyCategory The category Object
 * @returns {Object} emptyCategory The category Object
 */
export let processEmptyCategory = function( emptyCategory ) {
    if( emptyCategory.showExpand === undefined ) {
        emptyCategory.showExpand = true;
    }
    if( emptyCategory.currentCategory === undefined ) {
        emptyCategory.currentCategory = '';
    }
    if( emptyCategory.showEnabled === undefined ) {
        emptyCategory.showEnabled = false;
    }
    if( emptyCategory.showColor === undefined ) {
        emptyCategory.showColor = false;
    }
    if( emptyCategory.filterValues !== undefined && emptyCategory.filterValues.length > 0 ) {
        emptyCategory.isPopulated = true;
    } else {
        emptyCategory.isPopulated = false;
    }
    if( emptyCategory.isSelected === undefined ) {
        emptyCategory.isSelected = false;
    }

    return emptyCategory;
};

/**
 * processCategoryFilterValues
 * @function processCategoryFilterValues
 * @param {Object} category - category
 * @param {ObjectArray} selectedFilterVals - selected search result filters
 * @returns {ObjectArray} selectedFilterVals - selected search result filters
 */
export let processCategoryFilterValues = function( category, selectedFilterVals ) {
    for( var ii2 in category.filterValues ) {
        var filterVal12 = category.filterValues[ ii2 ];
        if( filterVal12.selected ) {
            if( !filterVal12.name ) {
                filterVal12.name = filterVal12.stringDisplayValue ? filterVal12.stringDisplayValue : filterVal12.internalName;
            }
            selectedFilterVals.push( filterVal12 );
        }
    }

    return selectedFilterVals;
};

exports = {
    processCatGroupProperty,
    processCategoryHasMoreFacetValues,
    processFilterCategories,
    processInContext,
    processSelectedPopulatedCategories,
    processEmptyCategory,
    processCategoryFilterValues,
    getHasMoreFacetValues
};
export default exports;

//
/**
 * @memberof NgServices
 * @member filterPanelCommonUtils
 * @param {appCtxService} appCtxService - Service to use.
 * @param {dateTimeService} dateTimeService - Service to use.
 * @param {uwPropertyService} uwPropertyService - Service to use.
 * @param {filterPanelUtils} filterPanelUtils - Service to use.
 * @returns {exports} Instance of this service.
 */
app.factory( 'filterPanelCommonUtils', () => exports );

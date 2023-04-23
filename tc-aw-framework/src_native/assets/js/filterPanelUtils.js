// Copyright (c) 2020 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/filterPanelUtils
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import dateTimeService from 'js/dateTimeService';
import messagingService from 'js/messagingService';
import localeSvc from 'js/localeService';
import uwDirectiveDateTimeSvc from 'js/uwDirectiveDateTimeService';
import $ from 'jquery';
import logger from 'js/logger';
import _ from 'lodash';

var exports = {};

var _invalidDateText = '';
var _invalidRangeText = '';
var _invalidPrefilter = '';
var AWC_LIMITED_FILTER_CATEGORIES_ENABLED = 'AWC_Limited_Filter_Categories_Enabled';

export let HIERARCHICAL_FACET_SEPARATOR = '/';
export let PRESET_CATEGORY = 'WorkspaceObject.object_type';
export let DATE_FILTER = 'DateFilter';
export let INTERNAL_DATE_FILTER = '_DateFilter_';
export let DATE_RANGE_FILTER = 'DateRangeFilter';
export let DATE_DRILLDOWN_FILTER = 'DrilldownDateFilter';
export let NUMERIC_RANGE_FILTER = 'NumericRangeFilter';
export let INTERNAL_NUMERIC_FILTER = '_NumericFilter_';
export let INTERNAL_OBJECT_FILTER = '_ObjectFilter_';
export let INTERNAL_NUMERIC_RANGE = '_NumericRange_';
export let NUMERIC_FILTER = 'NumericFilter';
export let NUMERIC_RANGE = 'NumericRange';
export let NumericRangeBlankStart = 'NumericRangeBlankStart';
export let NumericRangeBlankEnd = 'NumericRangeBlankEnd';
var INTERNAL_TO = '_TO_';
export let INTERNAL_KEYWORD = '_I_N_T_E_R_N_A_L__N_A_M_E_';
export let NO_STARTDATE = '*';
export let NO_ENDDATE = '2100-12-31';
export let NO_STARTRANGE = '';
export let NO_ENDRANGE = '';
export let BEGINNING_OF_TIME = '0001-01-01T00:00:00';
export let ENDING_OF_TIME = '2100-12-31T23:59:59';
var START_OF_DAY = '00:00:00';
var _presetFilters = true;
var _hasTypeFilter = false;
var _incontextFlag = false;
var _colorValue = false;
var customPropValueColorMap = {};

/**
 * Returns a date object.
 *
 * @function getDate
 * @memberOf filterPanelUtils
 *
 * @param {String}dateString - date string to be converted to date object
 *
 * @return {JsDate} a date object.
 */
export let getDate = function( dateString ) {
    var dateStr = dateString.substring( 0, 10 );
    var date;
    // change open start/end date to null dates
    if( _.startsWith( dateStr, '0001-01-0' ) || _.startsWith( dateStr, '2100-12-3' ) ) {
        date = dateTimeService.getNullDate();
    } else {
        var timeStr = dateString.substring( 11, dateString.length - 6 );
        if( timeStr.indexOf( '59' ) !== -1 ) {
            dateStr = dateString.replace( timeStr, START_OF_DAY );
        } else {
            dateStr = dateString;
        }
        date = new Date( dateStr );
    }

    return date;
};

/**
 * Returns a UTC date object.
 *
 * @function convertToUTC
 * @memberOf filterPanelUtils
 *
 * @param {Object}date - date object
 *
 * @return {JsDate} a UTC date object.
 */
function convertToUTC( date ) {
    var gmtTime = date.getTime();
    var offset = date.getTimezoneOffset();
    var jsDate = new Date( gmtTime + offset * 60 * 1000 );
    return new Date( jsDate.getTime() );
}
/**
 * Check if a date is null. The dateTimeService.isNullDate is not adequate, as the blank date from date widget can
 * sometimes be 0-0-0 0:0:0, or 0-0-0 23:59:XX, or 0-0-1 0:0:0, etc, only the first case is evaluated to true by the
 * dateTimeService.isNullDate.
 *
 * @function isNullDate
 * @memberOf filterPanelUtils
 *
 * @param {Object} dateToTest - a Date object.
 * @returns {Boolean} - true if it's a null date.
 */
export let isNullDate = function( dateToTest ) {
    if( !dateToTest ) {
        return true;
    }
    return dateToTest.getFullYear() <= 1;
};

/**
 * Validate dates for category date range.
 *
 * @function validateDates
 * @memberOf filterPanelUtils
 *
 * @param {Object}category - category. This object is modified in this function.
 * @param {Object}startDate - startDate
 * @param {Object}origStartDate - origStartDate
 * @param {Object}endDate - endDate
 * @param {Object}origEndDate - origEndDate
 */
export let validateDates = function( category, startDate, origStartDate, endDate, origEndDate ) {
    category.showSearch = true;

    var cStartDate = category.daterange.startDate;
    var eEndDate = category.daterange.endDate;
    if( category.daterange.dateRangeSelected && !cStartDate.valueUpdated && !eEndDate.valueUpdated ) {
        category.showSearch = false;
        return;
    }
    // The blank date in date range widget sometimes show up as 0-0-0 23:59:58 which is the end of the day,
    // which makes the isNullDate return false. Need to move to start of day then do the isNullDate check.
    var tmpStartDate = moveDateToStartOfDay( startDate );
    var tmpEndDate = moveDateToStartOfDay( endDate );
    var noStartDate = dateTimeService.isNullDate( tmpStartDate );
    var noEndDate = dateTimeService.isNullDate( tmpEndDate );

    // if both dates are not set, disable search button
    if( noStartDate && noEndDate ) {
        category.showSearch = false;
        return;
    }
    var temp1 = dateTimeService.compare( startDate, endDate );
    // if start date is later than end date, disable search button
    if( !noStartDate && !noEndDate && startDate !== null && temp1 === 1 ) {
        messagingService.showError( _invalidDateText );
        category.showSearch = false;
        return;
    }

    var disable;
    // check if dates vary from previous search to avoid enabling search
    var tmpOrigEndDate = moveDateToStartOfDay( origEndDate );

    if( noStartDate ) {
        // check if there is no startdate and if end date is same, disable search button
        disable = category.daterange.startDate === null &&
            dateTimeService.compare( tmpEndDate, tmpOrigEndDate ) === 0;
    } else if( noEndDate ) {
        // check if there is no enddate and  start date is same, disable search button
        disable = category.daterange.endDate === null &&
            dateTimeService.compare( startDate, category.daterange.startDate.dateApi.dateObject ) === 0;
    } else {
        // if the dates are same as previous search, disable search button
        var compare1 = dateTimeService.compare( startDate, origStartDate ) === 0;
        var compare2 = dateTimeService.compare( endDate, tmpOrigEndDate ) === 0;
        disable = compare1 && compare2;
    }
    category.showSearch = !disable;
};

/**
 * get date range filter.
 *
 * @function getDateRangeString
 * @memberOf filterPanelUtils
 *
 * @param {Object}startDate - startDate
 * @param {Object}endDate - endDate
 *
 * @return {String} a string that represents the date range.
 */
export let getDateRangeString = function( startDate, endDate ) {
    var noStartDate = exports.isNullDate( startDate );
    var noEndDate = exports.isNullDate( endDate );
    var fromDateString = noStartDate ? exports.NO_STARTDATE : dateTimeService.formatUTC( startDate );
    if( noEndDate ) {
        endDate = new Date( exports.NO_ENDDATE );
    }
    var toDateString = dateTimeService.formatUTC( moveDateToEndOfDay( endDate ) );
    return exports.INTERNAL_DATE_FILTER + fromDateString + INTERNAL_TO + toDateString;
};

/**
 * get filter of date range.
 *
 * @function getDateRangeString
 * @memberOf filterPanelUtils
 *
 * @param {String}filter - filter
 *
 * @return {Object} a filter object of date range for the filter string.
 */
export let getDateRangeFilter = function( filter ) {
    var searchFilter = {};
    var sArr = filter.split( INTERNAL_TO );
    searchFilter.searchFilterType = 'DateFilter';
    sArr[ 0 ] = sArr[ 0 ] === exports.NO_STARTDATE ? dateTimeService.NULLDATE : dateTimeService.formatUTC( sArr[ 0 ] );
    searchFilter.startDateValue = sArr[ 0 ];
    searchFilter.endDateValue = sArr[ 1 ];
    return searchFilter;
};

/**
 * get a date range filter with display name and category type.
 *
 * @function getDateRangeDisplayString
 * @memberOf filterPanelUtils
 *
 * @param {String}startDate - startDate
 * @param {String}endDate - endDate
 *
 * @return {Object} a date range filter with display name and category type.
 */
export let getDateRangeDisplayString = function( startDate, endDate ) {
    var dateRangeFilter = {};
    var noStartDate = dateTimeService.isNullDate( startDate );
    var noEndDate = dateTimeService.isNullDate( endDate );
    var dateRangeString;
    if( noStartDate ) {
        dateRangeString = 'To ' + uwDirectiveDateTimeSvc.formatDate( new Date( endDate ) ).substring( 0, 11 );
    } else if( noEndDate ) {
        dateRangeString = 'From ' +
            uwDirectiveDateTimeSvc.formatDate( new Date( startDate ) ).substring( 0, 11 );
    } else {
        dateRangeString = uwDirectiveDateTimeSvc.formatDate( new Date( startDate ) ).substring( 0, 11 ) +
            ' - ' + uwDirectiveDateTimeSvc.formatDate( new Date( endDate ) ).substring( 0, 11 );
    }
    dateRangeFilter.displayName = dateRangeString;
    dateRangeFilter.categoryType = exports.DATE_RANGE_FILTER;
    return dateRangeFilter;
};

/**
 * Simple check to validate the given category numeric range.
 *
 * @function checkIfValidRange
 * @memberOf filterPanelUtils
 *
 * @param {String}category - category
 * @param {Number}startRange - startRange
 * @param {Number}endRange - endRange
 *
 * @return {Boolean} true if valid range.
 */
export let checkIfValidRange = function( category, startRange, endRange ) {
    category.showSearch = true;

    if( startRange !== null && endRange !== null && startRange > endRange ) {
        var errorValue = startRange + '-' + endRange;
        var msg = _invalidRangeText.replace( '{0}', errorValue );
        messagingService.showError( msg );
        category.showSearch = false;
        return false;
    }

    return true;
};

/**
 * Validate the given category numeric range if the range is selected.
 *
 * @function validateNumericRangeSelected
 * @memberOf filterPanelUtils
 *
 * @param {String}category - category
 * @param {Number}startRange - startRange
 * @param {Number}endRange - endRange
 * @param {Number}cStartRange - current startRange
 * @param {Number}cEndRange - current endRange
 * @return {Boolean} true if valid range.
 */
export let validateNumericRangeSelected = function( category, startRange, endRange, cStartRange, cEndRange ) {
    var hasValidated = false;

    var oStartRange = category.numericrange.filter.startNumericValue;
    var oEndRange = category.numericrange.filter.endNumericValue;

    var pStartRange = parseFloat( cStartRange );
    var pEndRange = parseFloat( cEndRange );

    var invalidStart = cStartRange === oStartRange || pStartRange === oStartRange ||
        isNaN( pStartRange ) && oStartRange === exports.NO_STARTRANGE;
    // when the start range goes from blank to 0, it's a real change, so the search button should be enabled.
    if( category.numericrange.filter.startEndRange === exports.NumericRangeBlankStart ) {
        invalidStart = isNaN( pStartRange );
    }
    var invalidEnd = cEndRange === oEndRange || pEndRange === oEndRange || isNaN( pEndRange ) && oEndRange === exports.NO_ENDRANGE;
    if( category.numericrange.filter.startEndRange === exports.NumericRangeBlankEnd ) {
        invalidEnd = isNaN( pEndRange );
    }
    // when the end range goes from blank to 0, it's a real change, so the search button should be enabled.
    if( invalidStart && invalidEnd ) {
        category.showSearch = false;
        hasValidated = true;
    }
    return hasValidated;
};
/**
 * Validate ranges for category numeric range.
 *
 * @function validateNumericRange
 * @memberOf filterPanelUtils
 *
 * @param {String} category - category
 * @param {String} startRange - startRange
 * @param {String} endRange - endRange
 *
 */
export let validateNumericRange = function( category, startRange, endRange ) {
    category.showSearch = true;

    // Validate values to be numbers
    var cStartRange = category.numericrange.startValue.dbValue;
    var cEndRange = category.numericrange.endValue.dbValue;
    var oStartRange = null;
    var oEndRange = null;

    if( category.numericrange.numericRangeSelected && exports.validateNumericRangeSelected( category, startRange, endRange, cStartRange, cEndRange ) ) {
        return;
    }

    var noStartRange = cStartRange === undefined || cStartRange === null || cStartRange === '';
    var noEndRange = cEndRange === undefined || cEndRange === null || cEndRange === '';

    // if both numbers are not set, disable search button
    if( noStartRange && noEndRange ) {
        category.showSearch = false;
        return;
    }

    var disable = false;
    if( noStartRange ) {
        disable = endRange === oEndRange || isNaN( endRange );
    } else if( noEndRange ) {
        // check if there is no endRange and  start number is same, disable search button
        disable = startRange === oStartRange || isNaN( startRange );
    } else {
        disable = !isFinite( startRange ) || isNaN( startRange ) || !isFinite( endRange ) || isNaN( endRange );
    }
    category.showSearch = !disable;
};

/**
 * get numeric range filter string.
 *
 * @function getNumericRangeString
 * @memberOf filterPanelUtils
 *
 * @param {String}startRange - startRange
 * @param {String}endRange - endRange
 *
 * @return {String} a numeric range string.
 */
export let getNumericRangeString = function( startRange, endRange ) {
    var fromValue = startRange && startRange.toString();
    if( fromValue === undefined || fromValue === null || fromValue.length === 0 || isNaN( fromValue ) ) {
        fromValue = exports.NO_STARTRANGE;
    }
    var toValue = endRange && endRange.toString();
    if( toValue === undefined || toValue === null || toValue.length === 0 || isNaN( toValue ) ) {
        toValue = exports.NO_ENDRANGE;
    }
    return exports.INTERNAL_NUMERIC_RANGE + fromValue + INTERNAL_TO + toValue;
};

/**
 * get numeric range filter from a filter string.
 *
 * @function getDateRangeDisplayString
 * @memberOf filterPanelUtils
 *
 * @param {String}filter - filter
 *
 * @return {Object} a numeric range filter.
 */
export let getNumericRangeFilter = function( filter ) {
    var searchFilter = {};
    var sArr = filter.split( INTERNAL_TO );
    searchFilter.searchFilterType = exports.NUMERIC_FILTER;
    searchFilter.startNumericValue = parseFloat( sArr[ 0 ] );
    searchFilter.endNumericValue = parseFloat( sArr[ 1 ] );
    if( isNaN( searchFilter.startNumericValue ) ) {
        searchFilter.startEndRange = exports.NumericRangeBlankStart;
    } else if( isNaN( searchFilter.endNumericValue ) ) {
        searchFilter.startEndRange = exports.NumericRangeBlankEnd;
    } else {
        searchFilter.startEndRange = exports.NUMERIC_RANGE;
    }
    return searchFilter;
};

/**
 * get a numeric range filter.
 *
 * @function getNumericRangeDisplayString
 * @memberOf filterPanelUtils
 *
 * @param {Number}startRange - startRange
 * @param {Number}endRange - endRange
 * @param {String}startEndRange - startEndRange
 *
 * @return {Object} a numeric range filter with display name and category type.
 */
export let getNumericRangeDisplayString = function( startRange, endRange, startEndRange ) {
    var numericRangeFilter = {};
    var noStartRange = startEndRange === exports.NumericRangeBlankStart || startRange !== 0 && !startRange;
    var noEndRange = startEndRange === exports.NumericRangeBlankEnd || endRange !== 0 && !endRange;

    var numericRangeString;
    if( noStartRange ) {
        numericRangeString = 'To ' + endRange.toString();
    } else if( noEndRange ) {
        numericRangeString = 'From ' + startRange.toString();
    } else {
        numericRangeString = startRange.toString() + ' - ' + endRange.toString();
    }
    numericRangeFilter.displayName = numericRangeString;
    numericRangeFilter.categoryType = exports.NUMERIC_RANGE_FILTER;
    return numericRangeFilter;
};

/**
 * get a real filter.
 *
 * @function getRealFilterWithNoFilterType
 * @memberOf filterPanelUtils
 *
 * @param {String}filter - filter
 *
 * @return {Object} the real filter stripped off the identifiers.
 */
export let getRealFilterWithNoFilterType = function( filter ) {
    var realFilter = filter;
    if( !filter.hasOwnProperty( 'property' ) ) {
        realFilter = filter.replace( exports.INTERNAL_NUMERIC_FILTER, '' ).replace( exports.INTERNAL_OBJECT_FILTER, '' );
    }
    return realFilter;
};

/**
 * get filter type from filter value.
 *
 * @function getFilterTypeFromFilterValue
 * @memberOf filterPanelUtils
 *
 * @param {String}filter - filter
 *
 * @return {String} filter type, if it can be derived.
 */
export let getFilterTypeFromFilterValue = function( filter ) {
    var filterType;
    if( !filter.hasOwnProperty( 'property' ) ) {
        if( _.startsWith( filter, exports.INTERNAL_OBJECT_FILTER ) ) {
            filterType = 'ObjectFilter';
        } else if( _.startsWith( filter, exports.INTERNAL_NUMERIC_FILTER ) ) {
            filterType = 'NumericFilter';
        } else if( filter.indexOf( exports.INTERNAL_KEYWORD ) !== -1 ) {
            filterType = 'StringFilter';
        }
    } else {
        filterType = 'DateFilter';
    }
    return filterType;
};

/**
 * Get the selection for toggle command
 *
 * @return the selection state for command
 */
/**
 * Get the selection for toggle command.
 *
 * @function getDateRangeDisplayString
 * @memberOf filterPanelUtils
 *
 * @param {Object}prefVals - preferences
 *
 * @return {Boolean} the selection state for command.
 */
export let getToggleCommandSelection = function( prefVals ) {
    var prefVal = prefVals.AWC_ColorFiltering[ 0 ];
    _colorValue = false;
    var isCommandfHighlighted = 'false';
    if( prefVal === 'false' ) {
        isCommandfHighlighted = 'true';
        _colorValue = true;
    }
    appCtxService.updatePartialCtx( 'decoratorToggle', _colorValue );

    // update data section with latest value
    prefVals.AWC_ColorFiltering[ 0 ] = isCommandfHighlighted;
    return isCommandfHighlighted;
};

/**
 * Get the value of color toggle
 *
 * @return {String} the color toggle
 */
export let getColorToggleVal = function() {
    return _colorValue;
};

/**
 * /** Return date to start of the day
 *
 * @param {Date} date a given date
 * @return {Date} date
 */
function moveDateToStartOfDay( date ) {
    if( !dateTimeService.isNullDate( date ) ) {
        date.setHours( 0, 0, 0 );
        return date;
    }
    return date;
}

/**
 * Return date to start of the day
 *
 * @param {Date} date a given date
 * @return {Date} date
 */
function moveDateToEndOfDay( date ) {
    if( !dateTimeService.isNullDate( date ) ) {
        date.setHours( 23, 59, 59 );
        return date;
    }
    return date;
}

/**
 * Returns true if preset filters are hidden
 *
 * @returns {Object} preset filter flag
 */
export let isPresetFilters = function() {
    return _presetFilters;
};

/**
 * Sets preset filters flag
 *
 * @param {Object} flag flag
 */
export let setPresetFilters = function( flag ) {
    _presetFilters = flag;
};

/**
 * Returns true if preset filters are hidden
 *
 * @returns {Object} preset filter flag
 */
export let getHasTypeFilter = function() {
    return _hasTypeFilter;
};

/**
 * Sets preset filters flag
 *
 * @param {Object} flag preset filter flag
 */
export let setHasTypeFilter = function( flag ) {
    _hasTypeFilter = flag;
};

/**
 * Sets incontext flag
 *
 * @param {Object} flag incontext flag
 */
export let setIncontext = function( flag ) {
    _incontextFlag = flag;
};

/**
 * Gets incontext flag
 *
 * @returns {Object} incontext flag
 */
export let getIncontext = function() {
    return _incontextFlag;
};

/**
 * Save source filter map in appcontext for incontext
 *
 * @param {Object} data data
 */
export let saveIncontextFilterMap = function( data ) {
    appCtxService.unRegisterCtx( 'searchIncontextInfo' );
    var searchCtx = {};

    if( exports.getHasTypeFilter() ) {
        // Create a filter value for each category value
        var tmpValues = data.searchFilterMap[ exports.PRESET_CATEGORY ];
        var inContextMap = {};
        inContextMap[ exports.PRESET_CATEGORY ] = tmpValues;
        searchCtx.inContextMap = inContextMap;
    }
    appCtxService.registerCtx( 'searchIncontextInfo', searchCtx );
};

/**
 * Returns category internal name
 * @param {Object} category category
 * @returns {Object} The category internal name
 */
export let getCategoryInternalName = function( category ) {
    return category.internalName;
};

/**
 * Returns current category
 *
 * @param {Object} response the response from the search SOA
 * @returns {Object} The current category
 */
export let getCurrentCategory = function( response ) {
    return response.groupedObjectsList[ 0 ].internalPropertyName;
};

/**
 * Returns filter values for a category to be shown in panel
 *
 * @param {Object} category the category to get values for
 *
 * @returns {ObjectArray} The array of filters to show in panel
 */
export let getPropGroupValues = function( category ) {
    exports.getPreferenceValue();

    var values = [];
    for( var i = 0; i < category.filterValues.length; i++ ) {
        var categoryValue = category.filterValues[ i ];
        if( categoryValue !== undefined && ( i < 9 || categoryValue.color !== undefined ) ) {
            values.push( exports.getPropGroupValue( category.type, category.drilldown, categoryValue ) );
        }
    }

    return values;
};

/**
 * Returns filter values for a category to be shown in panel
 * @param {String} categoryType categoryType
 * @param {Integer} categoryDrillDown category Drill Down
 * @param {String} categoryValue categoryValue
 * @returns {Object} filter value
 */
export let getPropGroupValue = function( categoryType, categoryDrillDown, categoryValue ) {
    var pos = categoryValue.categoryName.indexOf( '.' );
    var propertyName;

    if( pos ) {
        propertyName = categoryValue.categoryName.slice( pos + 1 );
    } else {
        propertyName = categoryValue.categoryName;
    }
    var mapKey = propertyName + '.' + categoryValue.name;

    var filterValue = {};
    if( categoryValue.color && customPropValueColorMap[ mapKey ] ) {
        filterValue.propertyGroupID = categoryValue.color;
        var rgbColorValue = exports.getFilterColorRGBValue( categoryValue.color );
        filterValue.colorValue = rgbColorValue;
    } else {
        filterValue.propertyGroupID = exports.getFilterColorValue( categoryValue.colorIndex );
        filterValue.colorValue = exports.getFilterColorRGBValue( 'aw-charts-chartColor' + ( categoryValue.colorIndex % 9 + 1 ) );
    }

    if( categoryType === 'DateFilter' ) {
        if( categoryValue.colorIndex >= categoryDrillDown ) {
            if( categoryValue.internalName !== '$NONE' ) {
                filterValue.startValue = categoryValue.startDateValue;
                filterValue.endValue = categoryValue.endDateValue;
            } else {
                filterValue.startValue = '$NONE';
            }
        }
    } else {
        filterValue.startValue = categoryValue.internalName;
        filterValue.endValue = '';
    }

    return filterValue;
};

/**
 * Returns filter RGB values for a category to be shown in viewer
 * @param {STRING} color color
 * @returns {Object} filter Color RGB value
 */
export let getFilterColorRGBValue = function( color ) {
    var colorBlock = '.aw-ui-filterNameColorBlock';
    var colorBlockElement = $( colorBlock );
    var elementExists = colorBlockElement && colorBlockElement.length > 0;
    if( !elementExists ) {
        //in the case of ACE filter panel, the rendering of the panel is delayed
        colorBlock = '.aw-layout-globalToolbarPanel';
        colorBlockElement = $( colorBlock );
        elementExists = colorBlockElement && colorBlockElement.length > 0;
    }
    if( elementExists ) {
        var p = colorBlockElement[ 0 ];
        var replacedClassName = p.className;
        p.className = 'aw-ui-filterNameColorBlock ' + color;
        var style2 = window.getComputedStyle( p, null ).getPropertyValue(
            'background-color' );
        p.className = replacedClassName;
        return style2;
    }
    return '';
};

/**
 * Returns filter values for a category to be shown in panel
 * @param {Integer} index index
 * @returns {Object} filter value
 */
export let getFilterColorValue = function( index ) {
    return index > -1 ? 'aw-charts-chartColor' + ( index % 9 + 1 ) : '';
};
/**
 * publish event to select category header
 * @param {Object} category category
 * @param {Object} filter filter
 */
export let updateFiltersInContextInt1 = function( searchResultFilters, category, filter ) {
    searchResultFilters.forEach( function( ctxFilter ) {
        if( ctxFilter.searchResultCategoryInternalName === filter.categoryName ) {
            _.pull( ctxFilter.filterValues, filter );
        }
        // If no more filters left in this category, then remove category itself
        if( ctxFilter.filterValues.length === 0 ) {
            _.pull( searchResultFilters, ctxFilter );
        }
    } );
};
/**
 * publish event to select category header
 * @param {Object} category category
 * @param {Object} filter filter
 */
export let updateFiltersInContextInt2 = function( searchResultFilters, category, filter ) {
    var found = false;
    searchResultFilters.forEach( function( ctxFilter ) {
        if( ctxFilter.searchResultCategoryInternalName === filter.categoryName ) {
            if( ctxFilter.filterValues.indexOf( filter ) === -1 ) {
                ctxFilter.filterValues.push( filter );
            }
            found = true;
        }
    } );

    if( !found ) {
        var selectedFilterVals = [];
        selectedFilterVals.push( filter );
        var searchResultFilter = {
            searchResultCategory: filter.categoryName,
            searchResultCategoryInternalName: filter.categoryName,
            filterValues: selectedFilterVals
        };
        searchResultFilters.push( searchResultFilter );
    }
};

/**
 * publish event to select category header
 * @param {Object} category category
 * @param {Object} filter filter
 */
export let updateFiltersInContext = function( category, filter ) {
    var searchResponseInfo = appCtxService.getCtx( 'searchIncontextInfo' );
    if( searchResponseInfo ) {
        var searchResultFilters = searchResponseInfo.searchResultFilters;
        if( searchResultFilters === undefined ) {
            searchResultFilters = [];
        }

        // Remove the filter from application context if it is unselected
        if( !filter.selected ) {
            exports.updateFiltersInContextInt1( searchResultFilters, category, filter );
        } else {
            exports.updateFiltersInContextInt2( searchResultFilters, category, filter );
        }
    }
};
/**
 * Get property name from filter name.
 *
 * @param {String} filterName - The filter name
 * @return {propName} property name
 */
export let getPropertyFromFilter = function( filterName ) {
    var propName = filterName;

    var YEAR_SUFFIX = '_0Z0_year';
    var YEAR_MONTH_SUFFIX = '_0Z0_year_month';
    var WEEK_SUFFIX = '_0Z0_week';
    var YEAR_MONTH_DAY_SUFFIX = '_0Z0_year_month_day';

    if( _.endsWith( filterName, YEAR_MONTH_DAY_SUFFIX ) === true ) {
        propName = filterName.replace( YEAR_MONTH_DAY_SUFFIX, '' );
    }
    if( _.endsWith( filterName, WEEK_SUFFIX ) === true ) {
        propName = filterName.replace( WEEK_SUFFIX, '' );
    }
    if( _.endsWith( filterName, YEAR_MONTH_SUFFIX ) === true ) {
        propName = filterName.replace( YEAR_MONTH_SUFFIX, '' );
    }
    if( _.endsWith( filterName, YEAR_SUFFIX ) === true ) {
        propName = filterName.replace( YEAR_SUFFIX, '' );
    }
    return propName;
};

/**
 * Get formatted date.
 *
 * @param {String} dateString - input date
 *
 * @param {Boolean} isDateRangeToDate - indicate if it's an end date in a date range
 *
 * @return {formattedDate} formatted date
 */
export let getFormattedFilterDate = function( dateString, isDateRangeToDate ) {
    var formattedDate;
    if( dateString === '*' ) {
        if( isDateRangeToDate ) {
            formattedDate = exports.ENDING_OF_TIME;
        } else {
            formattedDate = exports.BEGINNING_OF_TIME;
        }
    } else {
        try {
            var date = convertToUTC( new Date( dateString ) );
            formattedDate = dateTimeService.formatUTC( date );
        } catch ( e ) {
            logger.error( 'The specified date is invalid and will be ignored for the search:', dateString );
            return null;
        }
    }
    return formattedDate;
};

/**
 * Get formatted numeric range filter.
 *
 * @param {String} filterValue - filterValue
 *
 * @return {formattedNumber} formatted filter
 */
export let getFormattedFilterNumber = function( filterValue ) {
    var formattedFilter = {};
    var startToEnd = filterValue.split( ' TO ' );
    var startNumber = parseFloat( startToEnd[ 0 ] );
    var endNumber = parseFloat( startToEnd[ 1 ] );
    if( isNaN( startNumber ) && isNaN( endNumber ) ) {
        logger.error( 'The specified range is invalid and will be ignored for the search:', filterValue );
        return null;
    } else if( startToEnd[ 0 ] === '*' ) {
        formattedFilter = {
            searchFilterType: 'NumericFilter',
            startNumericValue: 0,
            endNumericValue: endNumber,
            startEndRange: exports.NumericRangeBlankStart
        };
    } else if( startToEnd[ 1 ] === '*' ) {
        formattedFilter = {
            searchFilterType: 'NumericFilter',
            startNumericValue: startNumber,
            endNumericValue: 0,
            startEndRange: exports.NumericRangeBlankEnd
        };
    } else {
        if( isNaN( startNumber ) || isNaN( endNumber ) ) {
            logger.error( 'The specified range is invalid and will be ignored for the search:', filterValue );
            return null;
        }
        formattedFilter = {
            searchFilterType: 'NumericFilter',
            startNumericValue: startNumber,
            endNumericValue: endNumber,
            startEndRange: exports.NUMERIC_RANGE
        };
    }
    return formattedFilter;
};

/**
 * Get Range Filter.
 *
 * @param {String} filterType - filter type
 *
 * @param {String} filterValue - filter value
 *
 * @return {searchFilter} Search Filter
 */
export let getRangeSearchFilter = function( filterType, filterValue ) {
    // range search.
    var searchFilter;
    var startToEnd = filterValue.split( ' TO ' );

    if( filterType === 'NumericFilter' ) {
        searchFilter = exports.getFormattedFilterNumber( filterValue );
    } else if( filterType === 'DateFilter' ) {
        var startDate = exports.getFormattedFilterDate( startToEnd[ 0 ].trim(), false );
        var endDate = exports.getFormattedFilterDate( startToEnd[ 1 ].trim(), true );
        if( startDate && endDate ) {
            searchFilter = {
                searchFilterType: filterType,
                startDateValue: startDate,
                endDateValue: endDate
            };
        }
    } else {
        // String type, but string type should not support range search,
        // so treat the " TO " as just part of the filter value
        searchFilter = {
            searchFilterType: filterType,
            stringValue: filterValue
        };
    }
    return searchFilter;
};

/**
 * Get Single Filter.
 *
 * @param {String} filterType - filter type
 *
 * @param {String} filterValue - filter value
 *
 * @return {searchFilter} Search Filter
 */
export let getSingleSearchFilter = function( filterType, filterValue ) {
    // range search.
    var searchFilter;

    if( filterType === 'NumericFilter' ) {
        try {
            var formattedNumber = parseFloat( filterValue );
            if( isNaN( formattedNumber ) ) {
                logger.error( 'The specified number is invalid and will be ignored for the search:',
                    filterValue );
            } else {
                searchFilter = {
                    searchFilterType: filterType,
                    startNumericValue: formattedNumber,
                    endNumericValue: formattedNumber,
                    stringValue: filterValue
                };
            }
        } catch ( e ) {
            logger.error( 'The specified number is invalid and will be ignored for the search:', filterValue );
        }
    } else {
        // Date type is also treated as String, if it's not date range.
        searchFilter = {
            searchFilterType: 'StringFilter',
            stringValue: filterValue
        };
    }

    return searchFilter;
};

/**
 * Get filter type based on the value type.
 *
 * @param {Integer} valueType - The valueType for this property
 *
 * @return {filterType} filter type based off the integer value of valueType (String/Double/char etc.)
 */
export let getFilterType = function( valueType ) {
    var filterType;
    switch ( valueType ) {
        case 2:
            filterType = 'DateFilter';
            break;
        case 3:
        case 4:
        case 5:
        case 7:
            filterType = 'NumericFilter';
            break;
        case 9:
        case 10:
        case 11:
        case 12:
        case 13:
        case 14:
            // filterType = 'ObjectFilter';
            // ObjectFilter will be treated as StringFilter for the searchInput of performSearch SOA.
            filterType = 'StringFilter';
            break;
        default:
            filterType = 'StringFilter';
            break;
    }
    return filterType;
};

/**
 * Display search prefilter error
 *
 * @param {String} prefilter - The search prefilter
 *
 */
export let displayPrefilterError = function( prefilter ) {
    var msg = _invalidPrefilter.replace( '{0}', prefilter );
    messagingService.showError( msg );
};

/**
 * This function reads the “AWC_CustomPropValueColor” preference value and populates the customPropValueColorMap.
 * This is used to overide filter color in filter panel.
 * Preference value is in formate <propertyname>.<value>:<colorValue>
 */
export let getPreferenceValue = function() {
    if( appCtxService.ctx.preferences && appCtxService.ctx.preferences.AWC_CustomPropValueColor ) {
        var values = appCtxService.ctx.preferences.AWC_CustomPropValueColor;
        if( values && values[ 0 ] !== null ) {
            for( var i = 0; i < values.length; i++ ) {
                var prefVal = values[ i ];
                var pos = prefVal.indexOf( ':' );
                var color = prefVal.slice( pos + 1 );
                var property = prefVal.slice( 0, pos );
                customPropValueColorMap[ property ] = color;
            }
        }
    }
};

/**
 * get filter color
 *
 * @param propertyName filter name
 *
 * @returns color color code need to be applied for filter
 */
export let getCustomPropValueColorMap = function( propertyName ) {
    return customPropValueColorMap[ propertyName ];
};

/**
 * set filter color
 *
 * @param propertyName filter name
 *
 * @param color color code need to be applied for filter
 */
export let setCustomPropValueColorMap = function( propertyName, color ) {
    customPropValueColorMap[ propertyName ] = color;
};

/**
 * This function reads the “AWC_CustomPropValueColor” preference value and applies the color to the filter.
 */
export let applyCustomColor = function( categoryName, categoryValue, filterValue ) {
    var pos = categoryName.indexOf( '.' );
    var propertyName;

    if( pos ) {
        propertyName = categoryName.slice( pos + 1 );
    } else {
        propertyName = categoryName;
    }
    var mapKey = propertyName + '.' + categoryValue.stringValue;

    //Overriding the filter color based on preference AWC_CustomPropValueColor value if this property's color is defined in this preference
    if( customPropValueColorMap[ mapKey ] ) {
        if( categoryValue.colorValue ) {
            //This scenario will be hit in the cases where color value is being populated by server response - searchFilter3 or later
            filterValue.color = categoryValue.colorValue;
        } else {
            //This scenario will be hit in the cases where color value is not being populated by server response
            filterValue.color = customPropValueColorMap[ mapKey ];
        }
    }
};

/**
 * This function arranges the searchFilterMap to show the selected ones at the top ( but only shows the top 100 )
 * @param {Object} searchFilterMap - the search response info filter map
 * @param {Object} category - the current category
 * @param {INTEGER} filterLimitForCategory - the max fetch size of the current category
 */
export let arrangeFilterMap = function( searchFilterMap, category, filterLimitForCategory ) {
    var selectedFilters = {};
    var nonSelectedFilters = {};
    var selectedFiltersIndex = 0;
    var nonSelectedFiltersIndex = 0;
    var filterLimit = filterLimitForCategory > 0 ? filterLimitForCategory : 50;
    _.forEach( searchFilterMap[ category.internalName ], function( eachFilterValue ) {
        if( eachFilterValue && eachFilterValue.selected === true ) {
            selectedFilters[ selectedFiltersIndex ] = eachFilterValue;
            ++selectedFiltersIndex;
        } else {
            nonSelectedFilters[ nonSelectedFiltersIndex ] = eachFilterValue;
            ++nonSelectedFiltersIndex;
        }
    } );
    var updatedFilterMap = [];
    for( var index1 = 0; index1 < Object.keys( selectedFilters ).length; index1++ ) {
        updatedFilterMap.push( selectedFilters[ index1 ] );
    }
    var numberOfUnselectedFiltersToShow = filterLimit - selectedFiltersIndex;
    for( var index2 = 0; index2 < numberOfUnselectedFiltersToShow; index2++ ) {
        updatedFilterMap.push( nonSelectedFilters[ index2 ] );
    }
    var searchResponseInfoCtx = appCtxService.getCtx( 'searchResponseInfo' );
    if( searchResponseInfoCtx ) {
        searchResponseInfoCtx.searchFilterMap[ category.internalName ] = updatedFilterMap;
        appCtxService.updatePartialCtx( 'searchResponseInfo.searchFilterMap', searchResponseInfoCtx.searchFilterMap );
    }
};

/**
 * @function checkIfSearchCtxExists - this function checks if search ctx exists, if it does not, create it
 */

export let checkIfSearchCtxExists = function() {
    var searchCtx = appCtxService.getCtx( 'search' );
    if( !searchCtx ) {
        searchCtx = {};
        appCtxService.updateCtx( 'search', searchCtx );
    }
};

/**
 * @function checkIfFilterValuesExist - this function checks if the category has filtervalues or not
 * @param { Object } category - the current category
 * @returns { Boolean } true/false
 */

export let checkIfFilterValuesExist = function( category ) {
    if( category.filterValues && category.filterValues.length > 0 ) {
        return true;
    }
    return false;
};

/**
 * @function isGlobalSearchFilterPanel - this function checks if the location is Results Location and Search Filter Panel and the active navigation command is Search Filter
 * @returns { Boolean } true/false
 */

export let isGlobalSearchFilterPanel = function() {
    var activeNavigationCommandCtx = appCtxService.getCtx( 'activeNavigationCommand' );
    if( activeNavigationCommandCtx && activeNavigationCommandCtx.commandId && activeNavigationCommandCtx.commandId === 'Awp0SearchFilter' ) {
        return true;
    }
    return false;
};

/**
 * @function isGlobalSearchFilterPanel - this function checks if the Data Provider is Search Data Provider
 * @returns { Boolean } true/false
 */

export let isSearchDataProvider = function() {
    var searchDataProviderCtx = appCtxService.getCtx( 'SearchDataProvider' );
    if( searchDataProviderCtx && searchDataProviderCtx.providerName === 'Awp0FullTextSearchProvider' ) {
        return true;
    }
    return false;
};

/**
 * @function ifLimitedCategoriesEnabledThenProcessList - this function checks if AWC_LIMITED_FILTER_CATEGORIES_ENABLED is true and if Data Provider is Awp0FullTextSearchProvider
 * returns the AND operation of both the results
 * @returns { Boolean } true/false
 */

export let ifLimitedCategoriesEnabledThenProcessList = function( category ) {
    var isLimitedCategoriesEnabled = exports.isLimitedCategoriesFeatureEnabled();
    var isSearchDataProvider = exports.isSearchDataProvider();
    if( isLimitedCategoriesEnabled && isSearchDataProvider ) {
        exports.processListOfExpandedCategories( category );
    }
};

/**
 * @function isLimitedCategoriesFeatureEnabled - this function checks if AWC_LIMITED_FILTER_CATEGORIES_ENABLED is true
 * @returns { Boolean } true/false
 */

export let isLimitedCategoriesFeatureEnabled = function() {
    var preferenceValue = appCtxService.getCtx( 'preferences.' + AWC_LIMITED_FILTER_CATEGORIES_ENABLED );
    if( preferenceValue && preferenceValue[ 0 ].toLowerCase() === 'true' ) {
        return true;
    }
    return false;
};

/**
 * @function addToListOfExpandedCategories - this function adds the category specified to the list of Expanded Categories
 * @param { Object } category the current category
 * @param { String } filterPanelName - the name of the filter panel ( Search/ Incontext ( Add Panel ))
 */

export let addToListOfExpandedCategories = function( category, filterPanelName ) {
    var filterPanelLocationCtx = appCtxService.getCtx( filterPanelName );
    var categoryInternalName;
    if( category.internalName ) {
        categoryInternalName = category.internalName;
        if( filterPanelLocationCtx && filterPanelLocationCtx.listOfExpandedCategories && _.indexOf( filterPanelLocationCtx.listOfExpandedCategories, categoryInternalName, 0 ) === -1 ) {
            var expandedCategoriesList = filterPanelLocationCtx.listOfExpandedCategories;
            expandedCategoriesList.push( categoryInternalName );
            filterPanelLocationCtx.listOfExpandedCategories = expandedCategoriesList;
        } else {
            if( !filterPanelLocationCtx ) {
                filterPanelLocationCtx = {};
            }
            filterPanelLocationCtx.listOfExpandedCategories = [ categoryInternalName ];
        }
        appCtxService.registerCtx( filterPanelName, filterPanelLocationCtx );
    }
};

/**
 * @function removeFromListOfExpandedCategories - this function removes the category specified from the list of Expanded Categories
 * @param { Object } category the current category
 * @param { String } filterPanelName - the name of the filter panel ( Search/ Incontext ( Add Panel ))
 */

export let removeFromListOfExpandedCategories = function( category, filterPanelName ) {
    var filterPanelLocationCtx = appCtxService.getCtx( filterPanelName );
    var categoryInternalName;
    if( category.internalName ) {
        var isFilterSelected = exports.ifFilterSelectedForCategory( category );
        if( !isFilterSelected ) {
            categoryInternalName = category.internalName;
            if( filterPanelLocationCtx && filterPanelLocationCtx.listOfExpandedCategories ) {
                _.remove( filterPanelLocationCtx.listOfExpandedCategories, function( category ) {
                    return category === categoryInternalName;
                } );
                appCtxService.updateCtx( filterPanelName, filterPanelLocationCtx );
            }
        }
    }
};

/**
 * ifFilterSelectedForCategory - check if the current category has some filter as selected
 * @param { Object } category the current category
 * @returns { Boolean } true/false
 */
export let ifFilterSelectedForCategory = function( category ) {
    var filterValuesExist = exports.checkIfFilterValuesExist( category );
    if( filterValuesExist ) {
        for( var index = 0; index < category.filterValues.length; index++ ) {
            if( category.filterValues[ index ].selected ) {
                return true;
            }
        }
    }
    return false;
};

/**
 * isClsCategory - check if the current category is a classification tour
 * @param { Object } category the current category
 * @returns { Boolean } true/false
 */
export let isClsCategory = function ( category ) {
    if ( category.filterValues && ( category.filterValues.parentnodes &&
        category.filterValues.parentnodes.length > 0 || category.filterValues.childnodes && category.filterValues.childnodes.length > 0 ) ) {
            return true;
    }
    return false;
};

/**
 * ifFilterSelectedForCls - check if the current category is a classification category with a filter selected
 * @param { Object } category the current category
 * @returns { Boolean } true/false
 */
export let ifFilterSelectedForCls = function( category ) {
    var filterValuesExist = isClsCategory( category );
    if( filterValuesExist ) {
        for( var index = 0; index < category.filterValues.parentnodes.length; index++ ) {
            if( category.filterValues.parentnodes[ index ].selected ) {
                return true;
            }
        }
    }
    return false;
};

/**
 * @function processListOfExpandedCategories - this function processes the list of expanded categories according to category expansion state
 * @param { Object } category the current category
 */

export let processListOfExpandedCategories = function( category ) {
    if( category.expand === true ) {
        if( exports.isGlobalSearchFilterPanel() ) {
            exports.addToListOfExpandedCategories( category, 'searchFilterPanel' );
        } else {
            exports.addToListOfExpandedCategories( category, 'incontextSearchFilterPanel' );
        }
    } else if( category.expand === false ) {
        if( exports.isGlobalSearchFilterPanel() ) {
            exports.removeFromListOfExpandedCategories( category, 'searchFilterPanel' );
        } else {
            exports.removeFromListOfExpandedCategories( category, 'incontextSearchFilterPanel' );
        }
    }
};

export let loadConfiguration = function() {
    localeSvc.getLocalizedTextFromKey( 'UIMessages.invalidDate', true ).then( result => _invalidDateText = result );
    localeSvc.getLocalizedTextFromKey( 'UIMessages.invalidRange', true ).then( result => _invalidRangeText = result );
    localeSvc.getLocalizedTextFromKey( 'UIMessages.invalidPrefilter', true ).then( result => _invalidPrefilter = result );
};

exports = {
    HIERARCHICAL_FACET_SEPARATOR,
    PRESET_CATEGORY,
    DATE_FILTER,
    INTERNAL_DATE_FILTER,
    DATE_RANGE_FILTER,
    DATE_DRILLDOWN_FILTER,
    NUMERIC_RANGE_FILTER,
    INTERNAL_NUMERIC_FILTER,
    INTERNAL_OBJECT_FILTER,
    INTERNAL_NUMERIC_RANGE,
    NUMERIC_FILTER,
    NUMERIC_RANGE,
    NumericRangeBlankStart,
    NumericRangeBlankEnd,
    NO_STARTDATE,
    NO_ENDDATE,
    NO_STARTRANGE,
    NO_ENDRANGE,
    BEGINNING_OF_TIME,
    ENDING_OF_TIME,
    INTERNAL_KEYWORD,
    getDate,
    isNullDate,
    validateDates,
    getDateRangeString,
    getDateRangeFilter,
    getDateRangeDisplayString,
    checkIfValidRange,
    validateNumericRangeSelected,
    validateNumericRange,
    getNumericRangeString,
    getNumericRangeFilter,
    getNumericRangeDisplayString,
    getRealFilterWithNoFilterType,
    getFilterTypeFromFilterValue,
    getToggleCommandSelection,
    getColorToggleVal,
    isPresetFilters,
    setPresetFilters,
    getHasTypeFilter,
    setHasTypeFilter,
    setIncontext,
    getIncontext,
    saveIncontextFilterMap,
    getCategoryInternalName,
    getCurrentCategory,
    getPropGroupValues,
    getPropGroupValue,
    getFilterColorRGBValue,
    getFilterColorValue,
    updateFiltersInContextInt1,
    updateFiltersInContextInt2,
    updateFiltersInContext,
    getPropertyFromFilter,
    getFormattedFilterDate,
    getFormattedFilterNumber,
    getRangeSearchFilter,
    getSingleSearchFilter,
    getFilterType,
    displayPrefilterError,
    getPreferenceValue,
    getCustomPropValueColorMap,
    setCustomPropValueColorMap,
    applyCustomColor,
    arrangeFilterMap,
    checkIfSearchCtxExists,
    checkIfFilterValuesExist,
    isGlobalSearchFilterPanel,
    isSearchDataProvider,
    ifLimitedCategoriesEnabledThenProcessList,
    isLimitedCategoriesFeatureEnabled,
    addToListOfExpandedCategories,
    removeFromListOfExpandedCategories,
    ifFilterSelectedForCategory,
    isClsCategory,
    ifFilterSelectedForCls,
    processListOfExpandedCategories
};
export default exports;

loadConfiguration();

/**
 * @memberof NgServices
 * @member filterPanelUtils
 * @param {appCtxService} appCtxService - Service to use.
 * @param {dateTimeService} dateTimeService - Service to use.
 * @param {messagingService} messagingService - Service to use.
 * @param {localeService} localeSvc - Service to use.
 * @param {uwDirectiveDateTimeService} uwDirectiveDateTimeSvc - Service to use.
 * @returns {exports} Instance of this service.
 */
app.factory( 'filterPanelUtils', () => exports );

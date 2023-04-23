// Copyright (c) 2020 Siemens

/**
 * This service is used for simpletabe as Column Filter Utility
 *
 * @module js/awColumnFilterUtility
 *
 */
import _ from 'lodash';

var exports = {};

export let OPERATION_TYPE = {
    RANGE: 'range',
    GREATER: 'gt',
    GREATER_EQUALS: 'gte',
    LESS: 'lt',
    LESS_EQUALS: 'lte',
    EQUALS: 'equals',
    CASE_SENSITIVE_EQUALS: 'caseSensitiveEquals',
    NOT_EQUALS: 'notEquals',
    CASE_SENSITIVE_NOT_EQUALS: 'caseSensitiveNotEquals',
    CONTAINS: 'contains',
    NOT_CONTAINS: 'notContains',
    STARTS_WITH: 'startsWith',
    ENDS_WITH: 'endsWith'
};

export let FILTER_VIEW = {
    NUMERIC: 'numericFilter',
    DATE: 'dateFilter',
    TEXT: 'textFilter'
};

/**
 * Adds the new column filter tot he columnFilters input.
 *
 * @param {Array} columnFilters - Collection of all the column filters
 * @param {Object} newColumnFilters - The new column filter to apply
 * @returns {Array} columnFilters
 */
export let addOrReplaceColumnFilter = function( columnFilters, newColumnFilters ) {
    columnFilters = columnFilters || [];

    if( _.isArray( newColumnFilters ) && newColumnFilters.length ) {
        exports.removeColumnFilter( columnFilters, newColumnFilters[ 0 ].columnName );
        columnFilters = columnFilters.concat( newColumnFilters );
    }

    return columnFilters;
};

/**
 * Removes the column filters that are applied to the column by name.
 *
 * @param {Array} columnFilters - Collection of all the column filters
 * @param {String} columnName - The name of the column
 * @returns {Boolean} whether a filter was removed or not
 */
export let removeColumnFilter = function( columnFilters, columnName ) {
    var isFilterRemoved = false;
    if( columnFilters && columnFilters.length && columnName ) {
        _.remove( columnFilters, function( currentFilter ) {
            if( currentFilter.columnName === columnName ) {
                isFilterRemoved = true;
                return true;
            }
            return false;
        } );
    }
    return isFilterRemoved;
};

/**
 * Builds a basic column filter used for all filter types.
 *
 * @param {String} columnName - Column name the filter is applied to
 * @param {Array} values - Filter values
 *
 * @returns {Object} filter object
 */
export let createBasicColumnFilter = function( columnName, values ) {
    var returnFilter = {
        columnName: columnName
    };

    var filterValues = [];
    _.forEach( values, function( currentValue ) {
        var stringValue = _( currentValue ).toString();
        filterValues.push( stringValue );
    } );
    returnFilter.values = filterValues;

    return returnFilter;
};

/**
 * Create a filter based on the operation and values.
 *
 * @param {String} operation - operation name of the filter
 * @param {String} columnName - column name of the grid
 * @param {Array} values - values of filter input
 *
 * @returns {Object} Filter object
 */
export let createFilter = function( operation, columnName, values ) {
    var columnFilter = exports.createBasicColumnFilter( columnName, values );
    columnFilter.operation = operation;
    return columnFilter;
};

/**
 * Create a 'Contains' filter object.
 *
 * @param {String} columnName - column name of the grid
 * @param {Array} values - values of filter input
 *
 * @returns {Object} Filter object
 */
export let createContainsFilter = function( columnName, values ) {
    var operation = exports.OPERATION_TYPE.CONTAINS;
    return exports.createFilter( operation, columnName, values );
};

/**
 * Create a 'Does not contain' filter object.
 *
 * @param {String} columnName - column name of the grid
 * @param {Array} values - values of filter input
 *
 * @returns {Object} Filter object
 */
export let createNotContainsFilter = function( columnName, values ) {
    var operation = exports.OPERATION_TYPE.NOT_CONTAINS;
    return exports.createFilter( operation, columnName, values );
};

/**
 * Create a 'Range' filter object.
 *
 * @param {String} columnName - column name of the grid
 * @param {Array} values - values of filter input
 *
 * @returns {Object} Filter object
 */
export let createRangeFilter = function( columnName, values ) {
    var operation = exports.OPERATION_TYPE.RANGE;
    return exports.createFilter( operation, columnName, values );
};

/**
 * Create a 'Less Than or Equals' filter object.
 *
 * @param {String} columnName - column name of the grid
 * @param {Array} values - values of filter input
 *
 * @returns {Object} Filter object
 */
export let createLessThanEqualsFilter = function( columnName, values ) {
    var operation = exports.OPERATION_TYPE.LESS_EQUALS;
    return exports.createFilter( operation, columnName, values );
};

/**
 * Create a 'Less Than' filter object.
 *
 * @param {String} columnName - column name of the grid
 * @param {Array} values - values of filter input
 *
 * @returns {Object} Filter object
 */
export let createLessThanFilter = function( columnName, values ) {
    var operation = exports.OPERATION_TYPE.LESS;
    return exports.createFilter( operation, columnName, values );
};

/**
 * Create a 'Greater Than Equals' filter object.
 *
 * @param {String} columnName - column name of the grid
 * @param {Array} values - values of filter input
 *
 * @returns {Object} Filter object
 */
export let createGreaterThanEqualsFilter = function( columnName, values ) {
    var operation = exports.OPERATION_TYPE.GREATER_EQUALS;
    return exports.createFilter( operation, columnName, values );
};

/**
 * Create a 'Greater Than' filter object.
 *
 * @param {String} columnName - column name of the grid
 * @param {Array} values - values of filter input
 *
 * @returns {Object} Filter object
 */
export let createGreaterThanFilter = function( columnName, values ) {
    var operation = exports.OPERATION_TYPE.GREATER;
    return exports.createFilter( operation, columnName, values );
};

/**
 * Create a 'Equals' filter object.
 *
 * @param {String} columnName - column name of the grid
 * @param {Array} values - values of filter input
 *
 * @returns {Object} Filter object
 */
export let createEqualsFilter = function( columnName, values ) {
    var operation = exports.OPERATION_TYPE.EQUALS;
    return exports.createFilter( operation, columnName, values );
};

/**
 * Create a case sensitive 'Equals' filter object.
 *
 * @param {String} columnName - column name of the grid
 * @param {Array} values - values of filter input
 *
 * @returns {Object} Filter object
 */
export let createCaseSensitiveEqualsFilter = function( columnName, values ) {
    var operation = exports.OPERATION_TYPE.CASE_SENSITIVE_EQUALS;
    return exports.createFilter( operation, columnName, values );
};

/**
 * Create a 'Not Equals' filter object.
 *
 * @param {String} columnName - column name of the grid
 * @param {Array} values - values of filter input
 *
 * @returns {Object} Filter object
 */
export let createNotEqualsFilter = function( columnName, values ) {
    var operation = exports.OPERATION_TYPE.NOT_EQUALS;
    return exports.createFilter( operation, columnName, values );
};

/**
 * Create a case sensitive 'Not Equals' filter object.
 *
 * @param {String} columnName - column name of the grid
 * @param {Array} values - values of filter input
 *
 * @returns {Object} Filter object
 */
export let createCaseSensitiveNotEqualsFilter = function( columnName, values ) {
    var operation = exports.OPERATION_TYPE.CASE_SENSITIVE_NOT_EQUALS;
    return exports.createFilter( operation, columnName, values );
};

/**
 * Create a 'Starts With' filter object.
 *
 * @param {String} columnName - column name of the grid
 * @param {Array} values - values of filter input
 *
 * @returns {Object} Filter object
 */
export let createStartsWithFilter = function( columnName, values ) {
    var operation = exports.OPERATION_TYPE.STARTS_WITH;
    return exports.createFilter( operation, columnName, values );
};

/**
 * Create a 'Starts With' filter object.
 *
 * @param {String} columnName - column name of the grid
 * @param {Array} values - values of filter input
 *
 * @returns {Object} Filter object
 */
export let createEndsWithFilter = function( columnName, values ) {
    var operation = exports.OPERATION_TYPE.ENDS_WITH;
    return exports.createFilter( operation, columnName, values );
};

/**
 * Test the column filter object to make sure it has the valid information for 'Range'.
 *
 * @param {Object} columnFilter - Column filter information being tested
 *
 * @returns {Boolean} true is input filter object is valid
 */
export let isValidRangeColumnFilter = function( columnFilter ) {
    return columnFilter &&
        columnFilter.values &&
        columnFilter.values.length === 2 &&
        columnFilter.operation === exports.OPERATION_TYPE.RANGE;
};

/**
 * Test the column filter object to make sure it has the valid information for 'Contains'.
 *
 * @param {Object} columnFilter - Column filter information being tested
 *
 * @returns {Boolean} true is input filter object is valid
 */
export let isValidContainsColumnFilter = function( columnFilter ) {
    return columnFilter &&
        columnFilter.values &&
        columnFilter.values.length === 1 &&
        columnFilter.operation === exports.OPERATION_TYPE.CONTAINS;
};

/**
 * Test the column filter object to make sure it has the valid information for 'Does not contain'.
 *
 * @param {Object} columnFilter - Column filter information being tested
 *
 * @returns {Boolean} true is input filter object is valid
 */
export let isValidNotContainsColumnFilter = function( columnFilter ) {
    return columnFilter &&
        columnFilter.values &&
        columnFilter.values.length === 1 &&
        columnFilter.operation === exports.OPERATION_TYPE.NOT_CONTAINS;
};

/**
 * Test the column filter object to make sure it has the valid information for 'Equals'.
 *
 * @param {Object} columnFilter - Column filter information being tested
 *
 * @returns {Boolean} true is input filter object is valid
 */
export let isValidEqualsColumnFilter = function( columnFilter ) {
    return columnFilter &&
        columnFilter.values &&
        columnFilter.values.length === 1 &&
        columnFilter.operation === exports.OPERATION_TYPE.EQUALS;
};

/**
 * Test the column filter object to make sure it has the valid information for case sensitive 'Equals'.
 *
 * @param {Object} columnFilter - Column filter information being tested
 *
 * @returns {Boolean} true is input filter object is valid
 */
export let isValidCaseSensitiveEqualsColumnFilter = function( columnFilter ) {
    return columnFilter &&
        columnFilter.values &&
        columnFilter.values.length >= 1 &&
        columnFilter.operation === exports.OPERATION_TYPE.CASE_SENSITIVE_EQUALS;
};

/**
 * Test the column filter object to make sure it has the valid information for 'Not Equals'.
 *
 * @param {Object} columnFilter - Column filter information being tested
 *
 * @returns {Boolean} true is input filter object is valid
 */
export let isValidNotEqualsColumnFilter = function( columnFilter ) {
    return columnFilter &&
        columnFilter.values &&
        columnFilter.values.length === 1 &&
        columnFilter.operation === exports.OPERATION_TYPE.NOT_EQUALS;
};

/**
 * Test the column filter object to make sure it has the valid information for case sensitive 'Not Equals'.
 *
 * @param {Object} columnFilter - Column filter information being tested
 *
 * @returns {Boolean} true is input filter object is valid
 */
export let isValidCaseSensitiveNotEqualsColumnFilter = function( columnFilter ) {
    return columnFilter &&
        columnFilter.values &&
        columnFilter.values.length >= 1 &&
        columnFilter.operation === exports.OPERATION_TYPE.CASE_SENSITIVE_NOT_EQUALS;
};

/**
 * Test the column filter object to make sure it has the valid information for 'Less Than'.
 *
 * @param {Object} columnFilter - Column filter information being tested
 *
 * @returns {Boolean} true is input filter object is valid
 */
export let isValidLessThanColumnFilter = function( columnFilter ) {
    return columnFilter &&
        columnFilter.values &&
        columnFilter.values.length === 1 &&
        columnFilter.operation === exports.OPERATION_TYPE.LESS;
};

/**
 * Test the column filter object to make sure it has the valid information for 'Less Than or Equals'.
 *
 * @param {Object} columnFilter - Column filter information being tested
 *
 * @returns {Boolean} true is input filter object is valid
 */
export let isValidLessThanEqualsColumnFilter = function( columnFilter ) {
    return columnFilter &&
        columnFilter.values &&
        columnFilter.values.length === 1 &&
        columnFilter.operation === exports.OPERATION_TYPE.LESS_EQUALS;
};

/**
 * Test the column filter object to make sure it has the valid information for 'Greater Than'.
 *
 * @param {Object} columnFilter - Column filter information being tested
 *
 * @returns {Boolean} true is input filter object is valid
 */
export let isValidGreaterThanColumnFilter = function( columnFilter ) {
    return columnFilter &&
        columnFilter.values &&
        columnFilter.values.length === 1 && columnFilter.operation === exports.OPERATION_TYPE.GREATER;
};

/**
 * Test the column filter object to make sure it has the valid information for 'Greater Than or Equals'.
 *
 * @param {Object} columnFilter - Column filter information being tested
 *
 * @returns {Boolean} true is input filter object is valid
 */
export let isValidGreaterThanEqualsColumnFilter = function( columnFilter ) {
    return columnFilter &&
        columnFilter.values &&
        columnFilter.values.length === 1 &&
        columnFilter.operation === exports.OPERATION_TYPE.GREATER_EQUALS;
};

/**
 * Test the column filter object to make sure it has the valid information for 'Begins with'.
 *
 * @param {Object} columnFilter - Column filter information being tested
 *
 * @returns {Boolean} true is input filter object is valid
 */
export let isValidStartsWithColumnFilter = function( columnFilter ) {
    return columnFilter &&
        columnFilter.values &&
        columnFilter.values.length === 1 &&
        columnFilter.operation === exports.OPERATION_TYPE.STARTS_WITH;
};

/**
 * Test the column filter object to make sure it has the valid information for 'Ends with'.
 *
 * @param {Object} columnFilter - Column filter information being tested
 *
 * @returns {Boolean} true is input filter object is valid
 */
export let isValidEndsWithColumnFilter = function( columnFilter ) {
    return columnFilter &&
        columnFilter.values &&
        columnFilter.values.length === 1 &&
        columnFilter.operation === exports.OPERATION_TYPE.ENDS_WITH;
};

exports = {
    OPERATION_TYPE,
    FILTER_VIEW,
    addOrReplaceColumnFilter,
    removeColumnFilter,
    createBasicColumnFilter,
    createFilter,
    createContainsFilter,
    createNotContainsFilter,
    createRangeFilter,
    createLessThanEqualsFilter,
    createLessThanFilter,
    createGreaterThanEqualsFilter,
    createGreaterThanFilter,
    createEqualsFilter,
    createCaseSensitiveEqualsFilter,
    createNotEqualsFilter,
    createCaseSensitiveNotEqualsFilter,
    createStartsWithFilter,
    createEndsWithFilter,
    isValidRangeColumnFilter,
    isValidContainsColumnFilter,
    isValidNotContainsColumnFilter,
    isValidEqualsColumnFilter,
    isValidCaseSensitiveEqualsColumnFilter,
    isValidNotEqualsColumnFilter,
    isValidCaseSensitiveNotEqualsColumnFilter,
    isValidLessThanColumnFilter,
    isValidLessThanEqualsColumnFilter,
    isValidGreaterThanColumnFilter,
    isValidGreaterThanEqualsColumnFilter,
    isValidStartsWithColumnFilter,
    isValidEndsWithColumnFilter
};
export default exports;

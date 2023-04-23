/* eslint-disable max-lines */
// Copyright (c) 2020 Siemens

/**
 * This service is used for PLTable as Column Filter Service
 *
 * @module js/awColumnFilterService
 *
 */
import app from 'app';
import messagingService from 'js/messagingService';
import dateTimeService from 'js/dateTimeService';
import localeService from 'js/localeService';
import appContextService from 'js/appCtxService';
import AwTimeoutService from 'js/awTimeoutService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import columnFilterUtility from 'js/awColumnFilterUtility';

var _localeTextBundle = {};

var exports = {};

/*********************************
 * Temporary Constants for Facet *
 ********************************/
const numberFacetsToShow = 10;
const facetCheckboxHeight = 33;

/**
 * Determines if value is valid number to process.
 *
 * @param {Number|String} value - Number value
 *
 * @returns {Boolean} true if valid number
 */
var isValidNumber = function( value ) {
    return isFinite( value ) && value !== null && value !== '';
};

/**
 * Sets the filter information on the column filter and the column provider filters used for SOA.
 *
 * @param {Object} columnProvider column provider for the data
 * @param {Object} dataProvider data provider for the data
 * @param {Array} newProviderFilters new column provider filters to set
 * @param {Object} columnFilter filter attached to the column
 */
var setFilters = function( columnProvider, dataProvider, newProviderFilters, columnFilter ) {
    columnProvider.columnFilters = columnFilterUtility.addOrReplaceColumnFilter( columnProvider.columnFilters, newProviderFilters );
    columnFilter.isFilterApplied = true;
    columnFilter.summaryText = exports.createFilterSummary( newProviderFilters, columnFilter.view );

    // Set all filters as stale except for column in newProviderFilters
    _.forEach( dataProvider.cols, function( col ) {
        if( col.filter && newProviderFilters[ 0 ]
            && col.field !== newProviderFilters[ 0 ].columnName && col.propertyName !== newProviderFilters[ 0 ].columnName ) {
            col.filter.isStale = true;
        }
    } );
};

/**
 * Check if text filter inputs are default values.
 *
 * @param {Object} column column definition object
 * @returns {Boolean} whether input values are all original values
 */
var isTextFilterInputDefault = function( column ) {
    var isInputDefault = false;
    if( !column.filter.isFilterApplied && column.filter.textValue && !column.filter.textValue.dbValue ) {
        isInputDefault = true;
    }
    return isInputDefault;
};

/**
 * Check if date filter inputs are default values.
 *
 * @param {Object} column column definition object
 * @returns {Boolean} whether input values are all original values
 */
var isDateFilterInputDefault = function( column ) {
    var isInputDefault = false;
    if( !column.filter.isFilterApplied && column.filter.startDate &&
        dateTimeService.isNullDate( column.filter.startDate.dbValue ) &&
        column.filter.endDate &&
        dateTimeService.isNullDate( column.filter.endDate.dbValue ) &&
        column.filter.startDate.dateApi && !column.filter.startDate.dateApi.dateValue &&
        column.filter.endDate.dateApi && !column.filter.endDate.dateApi.dateValue ) {
        isInputDefault = true;
    }
    return isInputDefault;
};

/**
 * Check if numeric filter inputs are default values.
 *
 * @param {Object} column column definition object
 * @returns {Boolean} whether input values are all original values
 */
var isNumericFilterInputDefault = function( column ) {
    var isInputDefault = false;
    if( !column.filter.isFilterApplied ) {
        switch ( column.filter.operation.dbValue ) {
            case columnFilterUtility.OPERATION_TYPE.RANGE:
                isInputDefault = column.filter.startNumber  && _.isNil( column.filter.startNumber.dbValue )  && column.filter.endNumber && _.isNil( column.filter.numberValue.dbValue );
                break;
            case columnFilterUtility.OPERATION_TYPE.GREATER:
                isInputDefault =   column.filter.numberValue && _.isNil( column.filter.numberValue.dbValue );
                break;
            case columnFilterUtility.OPERATION_TYPE.LESS:
                isInputDefault =  column.filter.numberValue &&  _.isNil( column.filter.numberValue.dbValue );
                break;
            case columnFilterUtility.OPERATION_TYPE.EQUALS:
                isInputDefault =  column.filter.numberValue &&  _.isNil( column.filter.numberValue.dbValue );
                break;
        }
    }
    return isInputDefault;
};

/**
 * Check if all facets are checked
 *
 * @param {Object} column column definition object
 * @returns {Boolean} true if all facets are selected
 */
var isFacetInputDefault = function( column ) {
    var isInputDefault = true;
    if( column.filter.columnValues ) {
        _.forEach( column.filter.columnValues, function( currentValue ) {
            if( !currentValue.dbValue ) {
                isInputDefault = false;
                return false;
            }
            return true;
        } );
    }
    return isInputDefault;
};

/**
 * Check if all facets are unchecked
 *
 * @param {Object} column column definition object
 * @returns {Boolean} true if all facets are deselected
 */
var areAllFacetsUnchecked = function( column ) {
    var allFacetsUnchecked;
    if( column.filter.columnValues && !isFacetInputDefault( column ) ) {
        allFacetsUnchecked = true;
        _.forEach( column.filter.columnValues, function( currentValue ) {
            if( currentValue.dbValue ) {
                allFacetsUnchecked = false;
                return false;
            }
            return true;
        } );
    }
    return allFacetsUnchecked;
};

/**
 * The first time filter input is changed
 * set set filter to dirty
 *
 * @param {Object} column column definition object
 */
var setFilterToDirty = function( column ) {
    if( !column.filter.isDirty ) {
        column.filter.isDirty = true;
    }
};

/**
 * Disable filtering in menu.
 *
 * @param {String} gridId table/tree id
 * @param {Object} column column definition object
 */
var disableFiltering = function( gridId, column ) {
    column.filter.isDisabled = true;
    var eventData = {
        gridId: gridId,
        isFilterDisabled: true
    };
    eventBus.publish( gridId + '.plTable.setFilterDisability', eventData );
};

/**
 * Enable filtering in menu.
 *
 * @param {String} gridId table/tree id
 * @param {Object} column column definition object
 */
var enableFiltering = function( gridId, column ) {
    column.filter.isDisabled = false;
    var eventData = {
        gridId: gridId,
        isFilterDisabled: false
    };
    eventBus.publish( gridId + '.plTable.setFilterDisability', eventData );
};

var clearContextAttributes = function( context ) {
    if( context.filterError ) {
        delete context.filterError; // remove error if exists
    }
    if( context.filterNoAction ) {
        delete context.filterNoAction;
    }
};

let isDateFilterInErrorState = function( column ) {
    return column && column.filter && column.filter.startDate && column.filter.endDate && ( column.filter.startDate.error || column.filter.endDate.error );
};

let isNumericFilterInErrorState = function( column ) {
    let isErrorState = false;

    switch ( column.filter.operation.dbValue ) {
        case columnFilterUtility.OPERATION_TYPE.RANGE:
            isErrorState = column.filter.startNumber && column.filter.endNumber && ( column.filter.startNumber.error || column.filter.endNumber.error );
            break;
        case columnFilterUtility.OPERATION_TYPE.GREATER:
        case columnFilterUtility.OPERATION_TYPE.LESS:
        case columnFilterUtility.OPERATION_TYPE.EQUALS:
            isErrorState = column.filter.numberValue && column.filter.numberValue.error;
            break;
    }

    return isErrorState;
};

let isTextFilterInErrorState = function( column ) {
    return column && column.filter && column.filter.textValue && column.filter.textValue.error;
};

let clearViewModelDataContext = function( viewModelData ) {
    if( viewModelData && viewModelData.context ) {
        clearContextAttributes( viewModelData.context );

        /*
         * Have some validation condition
         * If it fails, set viewModelData.context.filterError = true;
         * call exports.showErrorMessage
          with some i18n message
         * return false
         */
    }
};

/**
 * Validate the text information coming from the filter column menu UI.
 *
 * @param {Object} textValue - The text value coming from the filter menu
 * @param {Object} viewModelData - The viewModel data used for validation
 *
 * @returns {Boolean} true if textValue is valid
 */
export let doTextValidation = function( textValue, viewModelData ) {
    clearViewModelDataContext( viewModelData );
    return true;
};

/**
 * Validate the numeric information coming from the filter column menu UI.
 *
 * @param {Object} eventData - The event data coming from the filter menu
 * @param {Object} viewModelData - The viewModel data used for validation
 *
 * @returns {Boolean} true if numeric information is valid
 */
export let doNumericValidation = function( eventData, viewModelData ) {
    if( viewModelData && viewModelData.context ) {
        clearContextAttributes( viewModelData.context );

        if( _.isNumber( eventData.startNumber ) && _.isNumber( eventData.endNumber ) && eventData.startNumber > eventData.endNumber ) {
            viewModelData.context.filterError = true;
            messagingService.showError( _localeTextBundle.invalidNumberRange );
        }
        return !viewModelData.context.filterError;
    }
    return true;
};

/**
 * Create a column filter from the facet values in column.
 *
 * @param {Object} column - column definition object
 * @returns {Object} filter object created from facet values
 */
export let processFacetValuesInFilter = function( column ) {
    var facetFilter = null;
    if( column.filter.columnValues ) {
        var facetUiValues = [];
        _.forEach( column.filter.columnValues, function( currentValue ) {
            if( column.filter.isSelectedFacetValues && currentValue.dbValue === true ) {
                facetUiValues.push( currentValue.serverValue );
            } else if( !column.filter.isSelectedFacetValues && currentValue.dbValue === false ) {
                facetUiValues.push( currentValue.serverValue );
            }
        } );

        if( column.filter.isSelectedFacetValues ) {
            facetFilter = columnFilterUtility.createCaseSensitiveEqualsFilter( column.field, facetUiValues );
        } else {
            facetFilter = columnFilterUtility.createCaseSensitiveNotEqualsFilter( column.field, facetUiValues );
        }
    }
    return facetFilter;
};

/**
 * Creates a text filter based on column filter information
 *
 * @param {Object} eventData - Event Data for filter
 * @returns {Object} filter object
 */
var createTextFilter = function( eventData ) {
    var filter = null;
    // Set columnProvider.columnFilters so dataProvider/actions can use the information
    if( eventData.operation === columnFilterUtility.OPERATION_TYPE.CONTAINS ) {
        filter = columnFilterUtility.createContainsFilter( eventData.columnName, [ eventData.textValue ] );
    } else if( eventData.operation === columnFilterUtility.OPERATION_TYPE.NOT_CONTAINS ) {
        filter = columnFilterUtility.createNotContainsFilter( eventData.columnName, [ eventData.textValue ] );
    } else if( eventData.operation === columnFilterUtility.OPERATION_TYPE.STARTS_WITH ) {
        filter = columnFilterUtility.createStartsWithFilter( eventData.columnName, [ eventData.textValue ] );
    } else if( eventData.operation === columnFilterUtility.OPERATION_TYPE.ENDS_WITH ) {
        filter = columnFilterUtility.createEndsWithFilter( eventData.columnName, [ eventData.textValue ] );
    } else if( eventData.operation === columnFilterUtility.OPERATION_TYPE.NOT_EQUALS ) {
        filter = columnFilterUtility.createNotEqualsFilter( eventData.columnName, [ eventData.textValue ] );
    } else { // equals
        filter = columnFilterUtility.createEqualsFilter( eventData.columnName, [ eventData.textValue ] );
    }

    return filter;
};

/**
 * Add/remove the text filter information to the column provider.
 *
 * @param {Object} column - Column object
 * @param {Object} columnProvider - Column provider used to store the filters
 * @param {Object} dataProvider data provider for the data
 * @param {Object} eventData - The event data coming from the filter menu
 * @param {Object} viewModelData - The viewModel data used for validation
 */
export let doTextFiltering = function( column, columnProvider, dataProvider, eventData, viewModelData ) {
    // client side validation
    if( exports.doTextValidation( eventData.textValue, viewModelData ) ) {
        // Set columnProvider.columnFilters so dataProvider/actions can use the information
        var newFilters = [];
        var facetFilter = null;
        if( eventData.textValue || !isFacetInputDefault( column ) ) {
            if( eventData.textValue ) {
                var textColumnFilter = createTextFilter( eventData );
                newFilters.push( textColumnFilter );
            }
            facetFilter = exports.processFacetValuesInFilter( column );
            if( facetFilter && facetFilter.values && facetFilter.values.length ) {
                newFilters.push( facetFilter );
            }
            setFilters( columnProvider, dataProvider, newFilters, column.filter );
        } else {
            exports.removeFilter( column, columnProvider, dataProvider, viewModelData );
        }
    }
};

/**
 * Validate the date information coming from the filter column menu UI.
 *
 * @param {Object} eventData - The event data coming from the filter menu
 * @param {Object} viewModelData - The viewModel data used for validation
 *
 * @returns {Boolean} true if date is valid
 */
export let doDateValidation = function( eventData, viewModelData ) {
    if( viewModelData && viewModelData.context ) {
        clearContextAttributes( viewModelData.context );

        if( !dateTimeService.isNullDate( eventData.startDate ) && !dateTimeService.isNullDate( eventData.endDate ) ) {
            var startDateTime = _.isNumber( eventData.startDate ) ? eventData.startDate : new Date( eventData.startDate ).getTime();
            var endDateTime = _.isNumber( eventData.endDate ) ? eventData.endDate : new Date( eventData.endDate ).getTime();
            if( startDateTime > endDateTime ) {
                viewModelData.context.filterError = true;
                messagingService.showError( _localeTextBundle.invalidDate );
            }
        }
        return !viewModelData.context.filterError;
    }
    return true;
};

/**
 * Creates a date filter based on column filter information
 *
 * @param {Object} eventData - Event Data for filter
 * @returns {Object} filter object
 */
var createDateFilter = function( eventData ) {
    var filter = null;
    // Set columnProvider.columnFilters so dataProvider/actions can use the information
    if( !dateTimeService.isNullDate( eventData.startDate ) && !dateTimeService.isNullDate( eventData.endDate ) ) {
        var startDateUtc = dateTimeService.formatUTC( new Date( eventData.startDate ) );
        var endDate = new Date( eventData.endDate );
        var endDateUtc = dateTimeService.formatUTC( endDate.setHours( 23, 59, 59, 999 ) );
        filter = columnFilterUtility.createRangeFilter( eventData.columnName, [ startDateUtc, endDateUtc ] );
    } else if( !dateTimeService.isNullDate( eventData.startDate ) ) {
        startDateUtc = dateTimeService.formatUTC( new Date( eventData.startDate ) );
        filter = columnFilterUtility.createGreaterThanEqualsFilter( eventData.columnName, [ startDateUtc ] );
    } else if( !dateTimeService.isNullDate( eventData.endDate ) ) {
        endDate = new Date( eventData.endDate );
        endDateUtc = dateTimeService.formatUTC( endDate.setHours( 23, 59, 59, 999 ) );
        filter = columnFilterUtility.createLessThanEqualsFilter( eventData.columnName, [ endDateUtc ] );
    }
    return filter;
};

/**
 * Add/remove the date filter information to the column provider.
 *
 * @param {Object} column - Column object
 * @param {Object} columnProvider - Column provider used to store the filters
 * @param {Object} dataProvider data provider for the data
 * @param {Object} eventData - The event data coming from the filter menu
 * @param {Object} viewModelData - The viewModel data used for validation
 */
export let doDateFiltering = function( column, columnProvider, dataProvider, eventData, viewModelData ) {
    var newFilters = [];
    // Client validation
    if( exports.doDateValidation( eventData, viewModelData ) || !isFacetInputDefault( column ) ) {
        var filter = createDateFilter( eventData );
        if( filter ) {
            newFilters.push( filter );
        }
        var facetFilter = exports.processFacetValuesInFilter( column );
        if( facetFilter && facetFilter.values && facetFilter.values.length ) {
            newFilters.push( facetFilter );
        }
        if( newFilters.length > 0 ) {
            setFilters( columnProvider, dataProvider, newFilters, column.filter );
        } else {
            exports.removeFilter( column, columnProvider, dataProvider, viewModelData );
        }
    }
};

/**
 * Creates a numeric filter based on column filter information
 *
 * @param {Object} eventData - Event Data for filter
 * @returns {Object} filter object
 */
var createNumericFilter = function( eventData ) {
    var filter = null;
    // Set columnProvider.columnFilters so dataProvider/actions can use the information
    if( eventData.operation === columnFilterUtility.OPERATION_TYPE.RANGE &&
        isValidNumber( eventData.startNumber ) && isValidNumber( eventData.endNumber ) ) {
        filter = columnFilterUtility.createRangeFilter( eventData.columnName, [ eventData.startNumber, eventData.endNumber ] );
    } else if( eventData.operation === columnFilterUtility.OPERATION_TYPE.RANGE && isValidNumber( eventData.startNumber ) ) {
        filter = columnFilterUtility.createGreaterThanEqualsFilter( eventData.columnName, [ eventData.startNumber ] );
    } else if( eventData.operation === columnFilterUtility.OPERATION_TYPE.RANGE && isValidNumber( eventData.endNumber ) ) {
        filter = columnFilterUtility.createLessThanEqualsFilter( eventData.columnName, [ eventData.endNumber ] );
    } else if( eventData.operation === columnFilterUtility.OPERATION_TYPE.GREATER && isValidNumber( eventData.numberValue ) ) {
        filter = columnFilterUtility.createGreaterThanFilter( eventData.columnName, [ eventData.numberValue ] );
    } else if( eventData.operation === columnFilterUtility.OPERATION_TYPE.LESS && isValidNumber( eventData.numberValue ) ) {
        filter = columnFilterUtility.createLessThanFilter( eventData.columnName, [ eventData.numberValue ] );
    } else if( eventData.operation === columnFilterUtility.OPERATION_TYPE.EQUALS && isValidNumber( eventData.numberValue ) ) {
        filter = columnFilterUtility.createEqualsFilter( eventData.columnName, [ eventData.numberValue ] );
    }
    return filter;
};

/**
 * Add/remove the numeric filter information to the column provider.
 *
 * @param {Object} column - Column object
 * @param {Object} columnProvider - Column provider used to store the filters
 * @param {Object} dataProvider data provider for the data
 * @param {Object} eventData - The event data coming from the filter menu
 * @param {Object} viewModelData - The viewModel data used for validation
 */
export let doNumericFiltering = function( column, columnProvider, dataProvider, eventData, viewModelData ) {
    var newFilters = [];
    if( exports.doNumericValidation( eventData, viewModelData ) || !isFacetInputDefault( column ) ) {
        var filter = createNumericFilter( eventData );
        if( filter ) {
            newFilters.push( filter );
        }
        var facetFilter = exports.processFacetValuesInFilter( column );
        if( facetFilter && facetFilter.values && facetFilter.values.length ) {
            newFilters.push( facetFilter );
        }
        if( newFilters.length > 0 ) {
            setFilters( columnProvider, dataProvider, newFilters, column.filter );
        } else {
            exports.removeFilter( column, columnProvider, dataProvider, viewModelData );
        }
    }
};

/**
 * Find the type of filter to use by the column type.
 *
 * @param {String} columnType - Repersents the data type of the column
 *
 * @returns {String} The type of filter to use in the column menu
 */
export let getFilterTypeByColumnType = function( columnType ) {
    var returnFilterType = columnFilterUtility.FILTER_VIEW.TEXT;

    if( columnType ) {
        if( _.isString( columnType ) ) {
            columnType = columnType.toUpperCase();
        }

        var columnTypeString = columnType.toString();

        switch ( columnTypeString ) {
            case 'DOUBLE':
            case 'INTEGER':
            case 'FLOAT':
            case '3': // Client Property Type
            case '4': // Client Property Type Double
            case '5': // Client Property Type Integer
            case '7': // Client Property Type Short
                returnFilterType = columnFilterUtility.FILTER_VIEW.NUMERIC;
                break;
            case 'DATE':
            case '2': // Client Property Type Date
                returnFilterType = columnFilterUtility.FILTER_VIEW.DATE;
                break;
            case 'STRING':
            default:
                returnFilterType = columnFilterUtility.FILTER_VIEW.TEXT;
        }
    }

    return returnFilterType;
};

/**
 * Add filter information to the column object.
 *
 * @param {Object} column - Column to add filter information to
 * @param {String} currentFilterView - Filter view
 * @param {Array} existingFilters - Existing filter view to reference
 */
export let addFilterValue = function( column, currentFilterView, existingFilters ) {
    existingFilters = existingFilters || [];

    switch ( currentFilterView ) {
        case columnFilterUtility.FILTER_VIEW.NUMERIC:
            column.filter = {
                isFilterApplied: false,
                isDirty: false,
                view: currentFilterView,
                summaryText: '',
                operation: {
                    dbValue: 'equals',
                    uiValue: _localeTextBundle.equalsOperation,
                    hasLov: true,
                    isEditable: true,
                    isEnabled: true,
                    propApi: {},
                    propertyLabelDisplay: 'NO_PROPERTY_LABEL',
                    propertyName: 'operation',
                    type: 'STRING',
                    operationType: 'childcommand'
                },
                numberValue: {
                    dbValue: '',
                    isEnabled: true,
                    type: 'DOUBLE',
                    isRequired: false,
                    isEditable: true,
                    propertyLabelDisplay: 'NO_PROPERTY_LABEL'
                },
                startNumber: {
                    dbValue: '',
                    isEnabled: true,
                    type: 'DOUBLE',
                    isRequired: false,
                    isEditable: true,
                    propertyLabelDisplay: 'NO_PROPERTY_LABEL'
                },
                endNumber: {
                    dbValue: '',
                    isEnabled: true,
                    type: 'DOUBLE',
                    isRequired: false,
                    isEditable: true,
                    propertyLabelDisplay: 'NO_PROPERTY_LABEL'
                }
            };
            exports.setExistingNumericFilter( column.filter, existingFilters );
            break;
        case columnFilterUtility.FILTER_VIEW.DATE:
            column.filter = {
                isFilterApplied: false,
                view: currentFilterView,
                summaryText: '',
                startDate: {
                    dbValue: '',
                    dateApi: {},
                    isEnabled: true,
                    type: 'DATE'
                },
                endDate: {
                    dbValue: '',
                    dateApi: {},
                    isEnabled: true,
                    type: 'DATE'
                }
            };
            exports.setExistingDateFilter( column.filter, existingFilters );
            break;
        case columnFilterUtility.FILTER_VIEW.TEXT:
        default:
            column.filter = {
                isFilterApplied: false,
                isDirty: false,
                view: currentFilterView,
                summaryText: '',
                operation: {
                    dbValue: 'contains',
                    uiValue: _localeTextBundle.containsOperation,
                    hasLov: true,
                    isEditable: true,
                    isEnabled: true,
                    propApi: {},
                    propertyLabelDisplay: 'NO_PROPERTY_LABEL',
                    propertyName: 'operation',
                    type: 'STRING',
                    operationType: 'childcommand'
                },
                textValue: {
                    dbValue: '',
                    isEnabled: true,
                    inputType: 'text'
                }
            };
            exports.setExistingTextFilter( column.filter, existingFilters );
    }

    // Set values common to all types
    column.filter.isSelectedFacetValues = false;
    column.filter.selectAllProp = {
        propertyDisplayName: _localeTextBundle.selectAll,
        type: 'BOOLEAN',
        isRequired: false,
        isEditable: true,
        isEnabled: true,
        dbValue: true,
        propertyLabelDisplay: 'PROPERTY_LABEL_AT_RIGHT',
        propApi: {}
    };
    column.filter.blanksI18n = _localeTextBundle.blanks;
    column.filter.noMatchesFoundI18n = _localeTextBundle.noMatchesFound;

    exports.checkExistingFacetFilter( column.filter, existingFilters );

    if( column.filter.isFilterApplied ) {
        column.filter.summaryText = exports.createFilterSummary( existingFilters, column.filter.view );
    }
};

/**
 * Sets the existing filters on to the new numeric filter.
 *
 * @param {Object} newFilter The new filter that was created.
 * @param {Array} existingFilters All the existing filters from column provider.
 */
export let setExistingNumericFilter = function( newFilter, existingFilters ) {
    _.forEach( existingFilters, function( currentFilter ) {
        if( columnFilterUtility.isValidRangeColumnFilter( currentFilter ) ) {
            newFilter.operation.dbValue = columnFilterUtility.OPERATION_TYPE.RANGE;
            newFilter.operation.uiValue = _localeTextBundle.rangeOperation;
            newFilter.startNumber.dbValue = currentFilter.values[ 0 ];
            newFilter.endNumber.dbValue = currentFilter.values[ 1 ];
            newFilter.isFilterApplied = true;
            return false;
        } else if( columnFilterUtility.isValidGreaterThanEqualsColumnFilter( currentFilter ) ) {
            newFilter.operation.dbValue = columnFilterUtility.OPERATION_TYPE.RANGE;
            newFilter.operation.uiValue = _localeTextBundle.rangeOperation;
            newFilter.startNumber.dbValue = currentFilter.values[ 0 ];
            newFilter.isFilterApplied = true;
            return false;
        } else if( columnFilterUtility.isValidLessThanEqualsColumnFilter( currentFilter ) ) {
            newFilter.operation.dbValue = columnFilterUtility.OPERATION_TYPE.RANGE;
            newFilter.operation.uiValue = _localeTextBundle.rangeOperation;
            newFilter.endNumber.dbValue = currentFilter.values[ 0 ];
            newFilter.isFilterApplied = true;
            return false;
        } else if( columnFilterUtility.isValidGreaterThanColumnFilter( currentFilter ) ) {
            newFilter.operation.dbValue = columnFilterUtility.OPERATION_TYPE.GREATER;
            newFilter.operation.uiValue = _localeTextBundle.greaterThanOperation;
            newFilter.numberValue.dbValue = currentFilter.values[ 0 ];
            newFilter.isFilterApplied = true;
            return false;
        } else if( columnFilterUtility.isValidLessThanColumnFilter( currentFilter ) ) {
            newFilter.operation.dbValue = columnFilterUtility.OPERATION_TYPE.LESS;
            newFilter.operation.uiValue = _localeTextBundle.lessThanOperation;
            newFilter.numberValue.dbValue = currentFilter.values[ 0 ];
            newFilter.isFilterApplied = true;
            return false;
        } else if( columnFilterUtility.isValidEqualsColumnFilter( currentFilter ) ) {
            newFilter.operation.dbValue = columnFilterUtility.OPERATION_TYPE.EQUALS;
            newFilter.operation.uiValue = _localeTextBundle.equalsOperation;
            newFilter.numberValue.dbValue = currentFilter.values[ 0 ];
            newFilter.isFilterApplied = true;
        }
    } );
};

/**
 * Sets the existing filters on to the new date filter.
 *
 * @param {Object} newFilter The new filter that was created.
 * @param {Array} existingFilters All the existing filters from column provider.
 */
export let setExistingDateFilter = function( newFilter, existingFilters ) {
    _.forEach( existingFilters, function( currentFilter ) {
        if( columnFilterUtility.isValidRangeColumnFilter( currentFilter ) ) {
            var startDate = new Date( currentFilter.values[ 0 ] );
            var endDate = new Date( currentFilter.values[ 1 ] );
            newFilter.startDate.dbValue = startDate.getTime();
            newFilter.endDate.dbValue = endDate.getTime();
            newFilter.isFilterApplied = true;
        } else if( columnFilterUtility.isValidGreaterThanEqualsColumnFilter( currentFilter ) ) {
            startDate = new Date( currentFilter.values[ 0 ] );
            newFilter.startDate.dbValue = startDate.getTime();
            newFilter.isFilterApplied = true;
        } else if( columnFilterUtility.isValidLessThanEqualsColumnFilter( currentFilter ) ) {
            endDate = new Date( currentFilter.values[ 0 ] );
            newFilter.endDate.dbValue = endDate.getTime();
            newFilter.isFilterApplied = true;
        }
    } );
};

/**
 * Sets the existing filters on to the new text filter.
 *
 * @param {Object} newFilter The new filter that was created.
 * @param {Array} existingFilters All the existing filters from column provider.
 */
export let setExistingTextFilter = function( newFilter, existingFilters ) {
    _.forEach( existingFilters, function( currentFilter ) {
        if( columnFilterUtility.isValidContainsColumnFilter( currentFilter ) ) {
            newFilter.operation.dbValue = columnFilterUtility.OPERATION_TYPE.CONTAINS;
            newFilter.operation.uiValue = _localeTextBundle.containsOperation;
            newFilter.textValue.dbValue = currentFilter.values[ 0 ];
            newFilter.isFilterApplied = true;
            return false;
        } else if( columnFilterUtility.isValidNotContainsColumnFilter( currentFilter ) ) {
            newFilter.operation.dbValue = columnFilterUtility.OPERATION_TYPE.NOT_CONTAINS;
            newFilter.operation.uiValue = _localeTextBundle.notContainsOperation;
            newFilter.textValue.dbValue = currentFilter.values[ 0 ];
            newFilter.isFilterApplied = true;
            return false;
        } else if( columnFilterUtility.isValidStartsWithColumnFilter( currentFilter ) ) {
            newFilter.operation.dbValue = columnFilterUtility.OPERATION_TYPE.STARTS_WITH;
            newFilter.operation.uiValue = _localeTextBundle.startsWithOperation;
            newFilter.textValue.dbValue = currentFilter.values[ 0 ];
            newFilter.isFilterApplied = true;
            return false;
        } else if( columnFilterUtility.isValidEndsWithColumnFilter( currentFilter ) ) {
            newFilter.operation.dbValue = columnFilterUtility.OPERATION_TYPE.ENDS_WITH;
            newFilter.operation.uiValue = _localeTextBundle.endsWithOperation;
            newFilter.textValue.dbValue = currentFilter.values[ 0 ];
            newFilter.isFilterApplied = true;
            return false;
        } else if( columnFilterUtility.isValidEqualsColumnFilter( currentFilter ) ) {
            newFilter.operation.dbValue = columnFilterUtility.OPERATION_TYPE.EQUALS;
            newFilter.operation.uiValue = _localeTextBundle.equalsOperation;
            newFilter.textValue.dbValue = currentFilter.values[ 0 ];
            newFilter.isFilterApplied = true;
        } else if( columnFilterUtility.isValidNotEqualsColumnFilter( currentFilter ) ) {
            newFilter.operation.dbValue = columnFilterUtility.OPERATION_TYPE.NOT_EQUALS;
            newFilter.operation.uiValue = _localeTextBundle.notEqualsOperation;
            newFilter.textValue.dbValue = currentFilter.values[ 0 ];
            newFilter.isFilterApplied = true;
        } else if( !columnFilterUtility.isValidCaseSensitiveEqualsColumnFilter( currentFilter ) && !columnFilterUtility.isValidCaseSensitiveNotEqualsColumnFilter( currentFilter ) ) {
            newFilter.operation.dbValue = currentFilter.operation;
            if ( currentFilter.values && currentFilter.values.length === 1 ) {
                newFilter.textValue.dbValue = currentFilter.values[ 0 ];
            }
            newFilter.isFilterApplied = true;
            return false;
        }
    } );
};

/**
 * Sets if filter is Applied for facets based on existing filters
 * @param {Object} newFilter - the new filter object that was created
 * @param {Object} existingFilters - The existing filters
 */
export let checkExistingFacetFilter = function( newFilter, existingFilters ) {
    _.forEach( existingFilters, function( filter ) {
        if( ( filter.operation === columnFilterUtility.OPERATION_TYPE.CASE_SENSITIVE_EQUALS || filter.operation === columnFilterUtility.OPERATION_TYPE.CASE_SENSITIVE_NOT_EQUALS ) &&
            filter.values && filter.values.length > 0 ) {
            newFilter.isFilterApplied = true;
        }
    } );
};

/**
 * Update the column with filter information.
 *
 * @param {Object} column columnInfo
 * @param {Array} existingFilters existing column filter
 */
export let updateColumnFilter = function( column, existingFilters ) {
    var currentFilterView = column.filterDefinition;

    if( !currentFilterView ) {
        currentFilterView = exports.getFilterTypeByColumnType( column.dataType );
    }

    exports.addFilterValue( column, currentFilterView, existingFilters );
};

/**
 * Reset the column with default filter information.
 *
 * @param {Object} column columnInfo
 */
export let resetColumnFilter = function( column ) {
    exports.updateColumnFilter( column, [] );
};

/**
 * Removes column filters that no longer apply to the table.
 *
 * @param {Object} columnProvider - Column provider used to store the filters
 * @param {Array} columns - columns in the table
 */
export let removeStaleFilters = function( columnProvider, columns ) {
    if( columnProvider && columns && columns.length ) {
        var columnFilters = columnProvider.getColumnFilters();
        if( columnFilters && columnFilters.length ) {
            var newColumnFilters = _.filter( columnFilters, function( currentFilter ) {
                var isValidFilter = false;
                _.forEach( columns, function( currentColumn ) {
                    if( ( currentFilter.columnName === currentColumn.propertyName || currentFilter.columnName === currentColumn.field )
                        && !currentColumn.hiddenFlag ) {
                        isValidFilter = true;
                        return false;
                    }
                    return true;
                } );
                return isValidFilter;
            } );
            columnProvider.setColumnFilters( newColumnFilters );
        }
    }
};

/**
 * Create a filter summary text of the applied filter.
 *
 * @param {Array} columnFilters - Column filter objects that contains operation and values
 * @param {String} filterView - filter view in use
 *
 * @returns {String} returns the text summary of the applied filter
 */
export let createFilterSummary = function( columnFilters, filterView ) {
    var filterSummary = '';
    var filterCount = columnFilters.length;
    if( !columnFilters || filterCount < 1 ) {
        return filterSummary;
    }

    for( var i = 0; i < filterCount; i++ ) {
        var columnFilter = columnFilters[ i ];
        var firstValue = columnFilter.values[ 0 ];
        var secondValue = columnFilter.values.length > 1 ? columnFilter.values[ 1 ] : '';

        // Convert date values to readable strings
        if( filterView === columnFilterUtility.FILTER_VIEW.DATE ) {
            var firstValueDateTime = Date.parse( firstValue );
            if( firstValueDateTime ) {
                var firstValueDate = new Date( firstValueDateTime );
                firstValue = firstValueDate.toLocaleDateString();
            }
            if( secondValue ) {
                var secondValueDateTime = Date.parse( secondValue );
                if( secondValueDateTime ) {
                    var secondValueDate = new Date( secondValueDateTime );
                    secondValue = secondValueDate.toLocaleDateString();
                }
            }
        }

        var arrayAsString = '';
        for( var j = 0; j < columnFilter.values.length; j++ ) {
            if( j > 0 && j < columnFilter.values.length ) {
                arrayAsString += ',';
            }

            var value = columnFilter.values[ j ];
            if( value === '' ) {
                arrayAsString += _localeTextBundle.blanks;
            } else {
                arrayAsString += value;
            }
        }

        // Set the filter summary text based on the operation type
        switch ( columnFilter.operation ) {
            case columnFilterUtility.OPERATION_TYPE.RANGE:
                filterSummary += _localeTextBundle.greaterThanEqualsFilterTooltip;
                filterSummary += ' "' + firstValue + '" ';
                filterSummary += _localeTextBundle.andFilterTooltip + ' ';
                filterSummary += _localeTextBundle.lessThanEqualsFilterTooltip;
                filterSummary += ' "' + secondValue + '"';
                break;
            case columnFilterUtility.OPERATION_TYPE.GREATER:
                filterSummary += _localeTextBundle.greaterThanFilterTooltip;
                filterSummary += ' "' + firstValue + '"';
                break;
            case columnFilterUtility.OPERATION_TYPE.GREATER_EQUALS:
                filterSummary += _localeTextBundle.greaterThanEqualsFilterTooltip;
                filterSummary += ' "' + firstValue + '"';
                break;
            case columnFilterUtility.OPERATION_TYPE.LESS:
                filterSummary += _localeTextBundle.lessThanFilterTooltip;
                filterSummary += ' "' + firstValue + '"';
                break;
            case columnFilterUtility.OPERATION_TYPE.LESS_EQUALS:
                filterSummary += _localeTextBundle.lessThanEqualsFilterTooltip;
                filterSummary += ' "' + firstValue + '"';
                break;
            case columnFilterUtility.OPERATION_TYPE.EQUALS:
            case columnFilterUtility.OPERATION_TYPE.CASE_SENSITIVE_EQUALS:
                filterSummary += _localeTextBundle.equalsFilterTooltip;
                filterSummary += ' "' + arrayAsString + '"';
                break;
            case columnFilterUtility.OPERATION_TYPE.NOT_EQUALS:
            case columnFilterUtility.OPERATION_TYPE.CASE_SENSITIVE_NOT_EQUALS:
                filterSummary += _localeTextBundle.notEqualsFilterTooltip;
                filterSummary += ' "' + arrayAsString + '"';
                break;
            case columnFilterUtility.OPERATION_TYPE.CONTAINS:
                filterSummary += _localeTextBundle.containsFilterTooltip;
                filterSummary += ' "' + firstValue + '"';
                break;
            case columnFilterUtility.OPERATION_TYPE.NOT_CONTAINS:
                filterSummary += _localeTextBundle.notContainsFilterTooltip;
                filterSummary += ' "' + firstValue + '"';
                break;
            case columnFilterUtility.OPERATION_TYPE.STARTS_WITH:
                filterSummary += _localeTextBundle.startsWithFilterTooltip;
                filterSummary += ' "' + firstValue + '"';
                break;
            case columnFilterUtility.OPERATION_TYPE.ENDS_WITH:
                filterSummary += _localeTextBundle.endWithFilterTooltip;
                filterSummary += ' "' + firstValue + '"';
                break;
            default:
                filterSummary += filterView;
        }

        if( filterCount > 1 && i === 0 ) {
            filterSummary += ', ';
        }
    }
    return filterSummary;
};

/**
 * Remove all the filters from the column provider, reset the dataProvider column filters.
 *
 * @param {Object} dataProvider data provider that contains the columns
 * @param {Object} columnProvider column provider that contains the column filters
 * @param {String} gridId gridId used for publish event
 */
export let removeAllFilters = function( dataProvider, columnProvider, gridId ) {
    var columns = dataProvider.cols;
    for( var i = 0; i < columns.length; i++ ) {
        exports.resetColumnFilter( columns[ i ] );
    }
    columnProvider.setColumnFilters( [] );
    eventBus.publish( 'pltable.columnFilterApplied', { gridId: gridId } );
};

/**
 * Check if any of the columns have a filter applied.
 *
 * @param {Object} dataProvider data provider containing all the columns
 * @returns {Boolean} true/false based on if any column has a filter applied
 */
export let isColumnFilterApplied = function( dataProvider ) {
    var columns = dataProvider.cols;
    for( var i = 0; i < columns.length; i++ ) {
        if( columns[ i ].filter && columns[ i ].filter.isFilterApplied ) {
            return true;
        }
    }
    return false;
};

/**
 * Call the 'getFacets' function from the dataProvider if available.
 *
 * @param {String} gridId - identifier for the table
 * @param {Object} column - column definition object
 * @param {Object} dataProvider - data provider
 * @param {Object} columnProvider - column provider
 * @param {Object} viewModel - view model of the table
 * @param {Boolean} reload - if reloading facets
 */
export let loadFacetValues = function( gridId, column, dataProvider, columnProvider, viewModel, reload ) {
    if( dataProvider.getFilterFacets && column.filter.showFilterFacets ) {
        var filters = [];
        var typeFilter = null;
        var eventData = null;
        if( column.filter.view === 'textFilter' && column.filter.textValue && column.filter.textValue.dbValue ) {
            eventData = {
                columnName: column.field,
                operation: column.filter.operation.dbValue,
                textValue: column.filter.textValue.dbValue
            };
            typeFilter = createTextFilter( eventData );
        } else if( column.filter.view === 'numericFilter' ) {
            eventData = {
                columnName: column.field,
                operation: column.filter.operation.dbValue,
                numberValue: column.filter.numberValue.dbValue,
                startNumber: column.filter.startNumber.dbValue,
                endNumber: column.filter.endNumber.dbValue
            };
            if( exports.doNumericValidation( eventData, viewModel ) ) {
                typeFilter = createNumericFilter( eventData );
            }
        } else if( column.filter.view === 'dateFilter' ) {
            eventData = {
                columnName: column.field,
                startDate: column.filter.startDate.dbValue,
                endDate: column.filter.endDate.dbValue
            };
            if( exports.doDateValidation( eventData, viewModel ) ) {
                typeFilter = createDateFilter( eventData );
            }
        }

        if( typeFilter ) {
            filters.push( typeFilter );
        }

        _.forEach( columnProvider.columnFilters, function( existingFilter ) {
            if( existingFilter.columnName !== column.propertyName && existingFilter.columnName !== column.field ) {
                filters.push( existingFilter );
            }
        } );

        var startIndex = 0;
        if( !reload && column.filter.columnValues ) {
            startIndex = column.filter.columnValues.length;
        } else if( column.filter.selectAllProp ) {
            // reset show all since data is being reloaded
            column.filter.selectAllProp.dbValue = true;
        }

        var filterFacetInput = {
            column: column,
            columnFilters: filters,
            maxToReturn: 50,
            startIndex: startIndex
        };

        eventBus.publish( gridId + '.plTable.loadFilterFacets', filterFacetInput );
    } else {
        exports.setColumnFilterStale( column );
    }
};

/**
 * Update the facet values, waiting for user entry.
 */
export let updateFacetValuesDebounce = _.debounce( loadFacetValues, 500, {
    maxWait: 10000,
    trailing: true,
    leading: false
} );

/**
 * Basic filtering function, call more specific filtering based on filter view.
 *
 * @param {Object} column column def object
 * @param {Object} columnProvider column provider for the data
 * @param {Object} dataProvider data provider for the data
 * @param {Object} viewModel view model of the filter
 */
export let doFiltering = function( column, columnProvider, dataProvider, viewModel ) {
    switch ( column.filter.view ) {
        case columnFilterUtility.FILTER_VIEW.NUMERIC:
            eventData = {
                columnName: column.field,
                operation: column.filter.operation.dbValue,
                numberValue: column.filter.numberValue.dbValue,
                startNumber: column.filter.startNumber.dbValue,
                endNumber: column.filter.endNumber.dbValue
            };
            exports.doNumericFiltering( column, columnProvider, dataProvider, eventData, viewModel );
            break;
        case columnFilterUtility.FILTER_VIEW.DATE:
            eventData = {
                columnName: column.field,
                startDate: column.filter.startDate.dbValue,
                endDate: column.filter.endDate.dbValue
            };
            exports.doDateFiltering( column, columnProvider, dataProvider, eventData, viewModel );
            break;
        case columnFilterUtility.FILTER_VIEW.TEXT:
        default:
            var eventData = {
                columnName: column.field,
                operation: column.filter.operation.dbValue,
                textValue: column.filter.textValue.dbValue
            };
            exports.doTextFiltering( column, columnProvider, dataProvider, eventData, viewModel );
            break;
    }
};

/**
 * Remove a filter from the columnProvider and reset the column's filter.
 *
 * @param {Object} column column def object
 * @param {Object} columnProvider column provider for the data
 * @param {Object} dataProvider data provider for the data
 * @param {Object} viewModel view model of the filter
 */
export let removeFilter = function( column, columnProvider, dataProvider, viewModel ) {
    clearContextAttributes( viewModel.context );
    var isFilterRemoved = columnFilterUtility.removeColumnFilter( columnProvider.columnFilters, column.field );
    if( !isFilterRemoved ) {
        viewModel.context.filterNoAction = true;
    }

    // Set all filters as stale
    _.forEach( dataProvider.cols, function( col ) {
        if( col.filter ) {
            col.filter.isStale = true;
        }
    } );

    exports.resetColumnFilter( column );
};

/**
 * Validate filter enable/disable based on text filter.
 *
 * @param {String} gridId - table/tree id
 * @param {Object} column - column definition object
 */
export let textEnableFilterToggle = function( gridId, column, isBulkEditing ) {
    if( isTextFilterInputDefault( column ) || isBulkEditing || isTextFilterInErrorState( column ) ) {
        disableFiltering( gridId, column );
    } else {
        setFilterToDirty( column );
        enableFiltering( gridId, column );
    }
};

/**
 * Text value changes, revalidate filtering state.
 *
 * @param {String} gridId - table/tree id
 * @param {Object} column - column definition object
 * @param {Object} dataProvider - data provider
 * @param {Object} columnProvider - column provider
 * @param {Object} viewModel - view model
 */
export let textFilterInputChanged = function( gridId, column, dataProvider, columnProvider, viewModel ) {
    setFilterToDirty( column );
    exports.textEnableFilterToggle( gridId, column, viewModel.context.isBulkEditing );
    exports.updateFacetValuesDebounce( gridId, column, dataProvider, columnProvider, viewModel, true );
};

/**
 * Validate filter enable/disable based on date filter.
 *
 * @param {String} gridId - table/tree id
 * @param {Object} column - column definition object
 */
export let dateEnableFilterToggle = function( gridId, column, isBulkEditing ) {
    if( isDateFilterInputDefault( column ) || isBulkEditing || isDateFilterInErrorState( column ) ) {
        disableFiltering( gridId, column );
    } else {
        setFilterToDirty( column );
        enableFiltering( gridId, column );
    }
};

/**
 * Date value changes, revalidate filtering state.
 *
 * @param {String} gridId - table/tree id
 * @param {Object} column - column definition object
 * @param {Object} dataProvider - data provider
 * @param {Object} columnProvider - column provider
 * @param {Object} viewModel - view model
 */
export let dateFilterInputChanged = function( gridId, column, dataProvider, columnProvider, viewModel ) {
    setFilterToDirty( column );
    exports.dateEnableFilterToggle( gridId, column, viewModel.context.isBulkEditing );
    exports.updateFacetValuesDebounce( gridId, column, dataProvider, columnProvider, viewModel, true );
};

/**
 * Validate filter enable/disable based on numeric filter.
 *
 * @param {String} gridId - table/tree id
 * @param {Object} column - column definition object
 */
export let numericEnableFilterToggle = function( gridId, column, isBulkEditing ) {
    if( isNumericFilterInputDefault( column ) || isBulkEditing || isNumericFilterInErrorState( column ) ) {
        disableFiltering( gridId, column );
    } else {
        setFilterToDirty( column );
        enableFiltering( gridId, column );
    }
};

/**
 * Numeric value changes, revalidate filtering state.
 *
 * @param {String} gridId - table/tree id
 * @param {Object} column - column definition object
 * @param {Object} dataProvider - data provider
 * @param {Object} columnProvider - column provider
 * @param {Object} viewModel - view model
 */
export let numericFilterInputChanged = function( gridId, column, dataProvider, columnProvider, viewModel ) {
    setFilterToDirty( column );
    exports.numericEnableFilterToggle( gridId, column, viewModel.context.isBulkEditing );
    exports.updateFacetValuesDebounce( gridId, column, dataProvider, columnProvider, viewModel, true );
};

/**
 * Check if column filter menu inputs are default values
 *
 * @param {Object} column - column definition object
 * @return {Boolean} true if filter inputs are default values
 */
var isMenuInDefaultState = function( column ) {
    var isMenuDefault;
    switch ( column.filter.view ) {
        case columnFilterUtility.FILTER_VIEW.NUMERIC:
            isMenuDefault = isNumericFilterInputDefault( column );
            break;
        case columnFilterUtility.FILTER_VIEW.DATE:
            isMenuDefault = isDateFilterInputDefault( column );
            break;
        case columnFilterUtility.FILTER_VIEW.TEXT:
            isMenuDefault = isTextFilterInputDefault( column );
            break;
        default:
            isMenuDefault = false;
    }
    return isMenuDefault;
};

/**
 * Check is filter view is custom.
 *
 * @param {String} filterView - current filter view for column
 */
var isCustomFilterView = function( filterView ) {
    switch ( filterView ) {
        case columnFilterUtility.FILTER_VIEW.NUMERIC:
        case columnFilterUtility.FILTER_VIEW.DATE:
        case columnFilterUtility.FILTER_VIEW.TEXT:
            return false;
        default:
            return true;
    }
};

/**
 * Facet value changes, revalidate filtering state.
 *
 * @param {String} gridId - table/tree id
 * @param {Object} column - column definition object
 */
export let filterFacetInputChanged = function( gridId, column, isBulkEditing ) {
    if( isBulkEditing || isMenuInDefaultState( column ) && ( isFacetInputDefault( column ) || areAllFacetsUnchecked( column ) ) ) {
        disableFiltering( gridId, column );
    } else {
        enableFiltering( gridId, column );
    }
};

/**
 * Check for filter disability state based on the filter view.
 *
 * @param {String} gridId - table/tree id
 * @param {Object} column - column definition object
 */
export let checkForFilterDisability = function( gridId, column, isBulkEditing ) {
    switch ( column.filter.view ) {
        case columnFilterUtility.FILTER_VIEW.NUMERIC:
            exports.numericEnableFilterToggle( gridId, column, isBulkEditing );
            break;
        case columnFilterUtility.FILTER_VIEW.DATE:
            exports.dateEnableFilterToggle( gridId, column, isBulkEditing );
            break;
        case columnFilterUtility.FILTER_VIEW.TEXT:
            exports.textEnableFilterToggle( gridId, column, isBulkEditing );
            break;
        default: // enable filtering button by default when custom filter
            enableFiltering( gridId, column );
    }
};

/**
 * Show Facet Filters Toggle button changed function
 * Saves the toggle state for that column and calls dataprovider for
 * facets if needed
 *
 * @param {Object} gridId - Table's gridId
 * @param {Object} column - column definition object
 * @param {Boolean} toggleState - the toggle button state
 * @param {Object} dataProvider - data provider
 * @param {Object} columnProvider - column provider
 * @param {Object} viewModel - view model
 */
export let showFiltersToggleChanged = function( gridId, column, toggleState, dataProvider, columnProvider, viewModel ) {
    // Store toggle state in column.filter.showFilterFacets
    // Store different facet values
    if( column.filter ) {
        if( column.filter.showFilterFacets === toggleState ) {
            return;
        }
        column.filter.showFilterFacets = toggleState;

        // Call dataprovider if toggle state === true
        if( toggleState === true && ( column.filter.isStale || !column.filter.columnValues || column.filter.columnValues.length === 0 ) ) {
            column.filter.isStale = false;
            exports.loadFacetValues( gridId, column, dataProvider, columnProvider, viewModel, true );
        }

        const facetToggleElement = document.querySelector( '.facet-toggle .aw-jswidgets-checkboxButton' );
        facetToggleElement && facetToggleElement.focus();
    }
    eventBus.publish( 'pltable.columnMenuSizeChange' );
};

/**
 * Sets the facet toggle button state
 *
 * @param {String} gridId - The gridID
 * @param {Object} column - column definition object
 * @param {Object} toggleProp - toggle button property
 * @param {Object} dataProvider - the data provider
 * @param {Object} columnProvider - the column provider
 * @param {Object} viewModel - the viewmodel
 */
export let setFacetToggleState = function( gridId, column, toggleProp, dataProvider, columnProvider, viewModel ) {
    if( column.filter && !_.isNull( column.filter.showFilterFacets ) ) {
        toggleProp.dbValue = column.filter.showFilterFacets;
        exports.setupFacetScrollListener( gridId, column, dataProvider, columnProvider, viewModel );
    } else {
        toggleProp.dbValue = false;
    }
};

/**
 * Refreshes the facets in a column menu if it is stale
 *
 * @param {Object} gridId - Table's gridId
 * @param {Object} column - column definition object
 * @param {Object} dataProvider - data provider
 * @param {Object} columnProvider - column provider
 * @param {Object} eventData - event data from the filter menu
 */
export let reloadStaleFacets = function( gridId, column, dataProvider, columnProvider, eventData ) {
    column.filter.isStale = false;
    column.filter.selectAllProp.dbValue = true;
    exports.loadFacetValues( gridId, column, dataProvider, columnProvider, eventData, true );
};

let facetScrollEvent = function( element, gridId, column, dataProvider, columnProvider, viewModel ) {
    let valueCount = column.filter.columnValues ? column.filter.columnValues.length : element.childElementCount - 1;
    if( element && element.scrollTop >= ( valueCount - numberFacetsToShow - 2 ) * facetCheckboxHeight && valueCount < column.filter.facetTotalFound ) {
        exports.loadFacetValues( gridId, column, dataProvider, columnProvider, viewModel, false );
    }
};

let debouncedFacetScroll = _.debounce( facetScrollEvent, 500, {
    maxWait: 10000,
    trailing: true,
    leading: false
} );

/**
 * Sets up the facet scroll listener
 *
 * @param {String} gridId - The gridID
 * @param {Object} column - column definition object
 * @param {Object} dataProvider - the data provider
 * @param {Object} columnProvider - the column provider
 * @param {Object} viewModel - the viewmodel
 */
export let setupFacetScrollListener = function( gridId, column, dataProvider, columnProvider, viewModel ) {
    AwTimeoutService.instance( function() {
        let facetScroll = document.getElementById( 'filter-facet-scroll' );
        if( facetScroll ) {
            facetScroll.addEventListener( 'scroll', function() { debouncedFacetScroll( facetScroll, gridId, column, dataProvider, columnProvider, viewModel ); } );
        }
    }, 0 );
};

/**
 * Sets the column's filter as stale
 *
 * @param {Object} column - column definition object
 */
export let setColumnFilterStale = function( column ) {
    if( column.filter ) {
        column.filter.isStale = true;
    }
};

/**
 * Copies over filter data from old column to new one
 * and sets the filter as stale on hidden
 *
 * @param {Object} newColumn - new column info
 * @param {Object} oldColumn - old column info
 * @param {String} gridId - the Table grid id
 */
export let updateNewColumnFilter = function( newColumn, oldColumn, gridId ) {
    if( newColumn.field === oldColumn.field && newColumn.filter && oldColumn.filter ) {
        newColumn.filter.showFilterFacets = oldColumn.filter.showFilterFacets;
        newColumn.filter.isSelectedFacetValues = oldColumn.filter.isSelectedFacetValues;
        newColumn.filter.isStale = newColumn.hiddenFlag || oldColumn.filter.isStale;
        newColumn.filter.selectAllProp = oldColumn.filter.selectAllProp;
        // Set custom filter UI for existing filter applied
        if ( isCustomFilterView( newColumn.filter.view ) && oldColumn.filter.isFilterApplied ) {
            if ( oldColumn.filter.operation.uiValue ) {
                newColumn.filter.operation.uiValue = oldColumn.filter.operation.uiValue;
                newColumn.filter.summaryText = oldColumn.filter.operation.uiValue;
            }
            if ( oldColumn.filter.textValue.dbValue ) {
                if ( newColumn.filter.summaryText ) {
                    newColumn.filter.summaryText += ': ';
                }
                newColumn.filter.summaryText += '"' + oldColumn.filter.textValue.dbValue + '"';
            }
        }

        // update selectAll prop
        if( newColumn.filter.selectAllProp ) {
            exports.updateSelectAllProp( newColumn, gridId, false );
        }

        // Update props to point to latest column
        let newValues = [];
        _.forEach( oldColumn.filter.columnValues, function( value ) {
            let prop = exports.createFacetProp( value.propertyDisplayName, gridId, newColumn, value.dbValue, false );
            newValues.push( prop );
        } );

        newColumn.filter.columnValues = newValues;
    }
};

/**
 * Updates the select all prop change value fire event
 * to reference current column
 *
 * @param {Object} column - column definition object
 * @param {String} gridId - table grid id
 */
export let updateSelectAllProp = function( column, gridId, isBulkEditing ) {
    var current = column.filter.selectAllProp;
    current.propApi = {};
    current.propApi.fireValueChangeEvent = function() {
        // Set select All mode
        if( column.filter.selectAllProp.dbValue === false ) {
            column.filter.isSelectedFacetValues = true;
            _.forEach( column.filter.columnValues, function( value ) {
                if( value.dbValue ) {
                    value.dbValue = false;
                }
            } );
        } else {
            column.filter.isSelectedFacetValues = false;
            _.forEach( column.filter.columnValues, function( value ) {
                if( !value.dbValue ) {
                    value.dbValue = true;
                }
            } );
        }
        exports.filterFacetInputChanged( gridId, column, isBulkEditing );
    };
    column.filter.selectAllProp = current;
};

/**
 * Creates a prop for facet values
 *
 * @param {String} name - name of prop
 * @param {String} gridId - table grid id
 * @param {Object} column - column definition object
 * @param {Boolean} dbValue - initial dbValue of the prop
 * @returns {Object} The created prop
 */
export let createFacetProp = function( name, gridId, column, dbValue, isBulkEditing ) {
    var key;
    var value;
    if( name === '(blanks)' ) {
        key = column.filter.blanksI18n;
        value = '';
    } else {
        key = name;
        if( column.filter.view === 'dateFilter' ) {
            value = dateTimeService.formatUTC( new Date( name ) );
        } else {
            value = key;
        }
    }

    var prop = {
        propertyDisplayName: key,
        type: 'BOOLEAN',
        isRequired: false,
        isEditable: true,
        isEnabled: true,
        dbValue: dbValue,
        propertyLabelDisplay: 'PROPERTY_LABEL_AT_RIGHT',
        propApi: {},
        serverValue: value
    };

    prop.propApi.fireValueChangeEvent = function() {
        if( !prop.dbValue && column.filter.selectAllProp.dbValue ) {
            column.filter.selectAllProp.dbValue = false;
        } else if( prop.dbValue && !column.filter.selectAllProp.dbValue ) {
            // check if every element but first is selected
            var uncheckedCount = 0;
            _.forEach( column.filter.columnValues, function( value ) {
                if( !value.dbValue ) {
                    uncheckedCount++;
                    return false;
                }
                return true;
            } );
            if( uncheckedCount === 0 ) {
                column.filter.selectAllProp.dbValue = true;
            }
        }
        exports.filterFacetInputChanged( gridId, column, isBulkEditing );
    };

    return prop;
};

export let loadConfiguration = function() {
    localeService.getLocalizedTextFromKey( 'UIMessages.invalidNumberRange', true ).then( result => _localeTextBundle.invalidNumberRange = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.invalidDate', true ).then( result => _localeTextBundle.invalidDate = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.equalsOperation', true ).then( result => _localeTextBundle.equalsOperation = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.containsOperation', true ).then( result => _localeTextBundle.containsOperation = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.selectAll', true ).then( result => _localeTextBundle.selectAll = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.blanks', true ).then( result => _localeTextBundle.blanks  = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.noMatchesFound', true ).then( result => _localeTextBundle.noMatchesFound = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.rangeOperation', true ).then( result => _localeTextBundle.rangeOperation = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.greaterThanOperation', true ).then( result => _localeTextBundle.greaterThanOperation = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.lessThanOperation', true ).then( result => _localeTextBundle.lessThanOperation = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.notContainsOperation', true ).then( result => _localeTextBundle.notContainsOperation = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.startsWithOperation', true ).then( result => _localeTextBundle.startsWithOperation = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.endsWithOperation', true ).then( result => _localeTextBundle.endsWithOperation  = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.notEqualsOperation', true ).then( result => _localeTextBundle.notEqualsOperation = result );

    localeService.getLocalizedTextFromKey( 'UIMessages.andFilterTooltip', true ).then( result => _localeTextBundle.andFilterTooltip = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.greaterThanFilterTooltip', true ).then( result => _localeTextBundle.greaterThanFilterTooltip = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.greaterThanEqualsFilterTooltip', true ).then( result => _localeTextBundle.greaterThanEqualsFilterTooltip = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.lessThanFilterTooltip', true ).then( result => _localeTextBundle.lessThanFilterTooltip = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.lessThanEqualsFilterTooltip', true ).then( result => _localeTextBundle.lessThanEqualsFilterTooltip = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.equalsFilterTooltip', true ).then( result => _localeTextBundle.equalsFilterTooltip = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.notEqualsFilterTooltip', true ).then( result => _localeTextBundle.notEqualsFilterTooltip = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.containsFilterTooltip', true ).then( result =>  _localeTextBundle.containsFilterTooltip = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.notContainsFilterTooltip', true ).then( result => _localeTextBundle.notContainsFilterTooltip = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.startsWithFilterTooltip', true ).then( result => _localeTextBundle.startsWithFilterTooltip = result );
    localeService.getLocalizedTextFromKey( 'UIMessages.endWithFilterTooltip', true ).then( result => _localeTextBundle.endWithFilterTooltip = result );
};

/**
 * Setup to listen to changes in locale.
 *
 * @param {String} locale - String with the updated locale value.
 */
eventBus.subscribe( 'locale.changed', function() {
    loadConfiguration();
}, 'awColumnFilterService' );

exports = {
    loadConfiguration,
    doTextValidation,
    doNumericValidation,
    processFacetValuesInFilter,
    doTextFiltering,
    doDateValidation,
    doDateFiltering,
    doNumericFiltering,
    getFilterTypeByColumnType,
    addFilterValue,
    setExistingNumericFilter,
    setExistingDateFilter,
    setExistingTextFilter,
    checkExistingFacetFilter,
    updateColumnFilter,
    resetColumnFilter,
    removeStaleFilters,
    createFilterSummary,
    removeAllFilters,
    isColumnFilterApplied,
    loadFacetValues,
    updateFacetValuesDebounce,
    doFiltering,
    removeFilter,
    textEnableFilterToggle,
    textFilterInputChanged,
    dateEnableFilterToggle,
    dateFilterInputChanged,
    numericEnableFilterToggle,
    numericFilterInputChanged,
    filterFacetInputChanged,
    checkForFilterDisability,
    showFiltersToggleChanged,
    setFacetToggleState,
    reloadStaleFacets,
    setupFacetScrollListener,
    setColumnFilterStale,
    updateNewColumnFilter,
    updateSelectAllProp,
    createFacetProp
};
export default exports;

loadConfiguration();

app.factory( 'awColumnFilterService', () => exports );

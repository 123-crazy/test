// Copyright (c) 2020 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/searchFolderFilterService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import filterPanelUtils from 'js/filterPanelUtils';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/uwDirectiveDateTimeService';

var exports = {};

/**
 * publish event to select category header
 *
 * @function selectCategory
 * @memberOf searchFolderFilterService
 *
 * @param {Object}category - filter category
 *
 */
export let selectCategory = function( category ) {
    //no op
};

/**
 * publish event to select hierarchy category
 *
 * @function selectHierarchyCategory
 * @memberOf searchFolderFilterService
 *
 * @param {Object}category - filter category
 *
 */
export let selectHierarchyCategory = function( category ) {
    // if there is a hierarchy filter selected, clear it. Otherwise do the default category selection
    if( !_.isUndefined( category.filterValues.parentnodes[ 0 ] ) && category.filterValues.parentnodes[ 0 ].selected ) {
        exports.addOrRemoveObjectFilter( category.internalName, category.filterValues.parentnodes[ 0 ].stringValue, undefined, category.filterValues.parentnodes[ 0 ].stringDisplayValue );
    } else {
        // Nothing selected, trigger the default category selection logic.
        exports.selectCategory( category );
    }
};

/**
 * publish event to select Hierarhcy filter
 *
 * @function selectHierarchyFilter
 * @memberOf searchFolderFilterService
 *
 * @param {Object} category - the category of the selected filter
 * @param {Object} node - the selected hierarhcy node (same structure as search filter)
 */
export let selectHierarchyFilter = function( category, node ) {
    if( node.isLast || node.selected ) {
        exports.addOrRemoveObjectFilter( category.internalName, node.stringValue, undefined, node.stringDisplayValue );
    } else {
        exports.addOrRemoveObjectFilter( category.internalName, node.stringValue, true, node.stringDisplayValue );
    }
};

/**
 * set a new object filter
 * @function setNewObjectFilter
 * @param {Object} newParams - filter map
 * @param {Object} category - the category of the selected filter
 * @param {STRING} stringValue - stringValue of the selected filter
 * @param {STRING} stringDisplayValue - stringDisplayValue of the selected filter
 */
export let setNewObjectFilter = function( newParams, category, stringValue, stringDisplayValue ) {
    let newFilter = {};
    newFilter.stringValue = stringValue;
    newFilter.searchFilterType = 'StringFilter';
    newFilter.stringDisplayValue = stringDisplayValue;
    newParams[ category ] = [ newFilter ];
};
/**
 * Utility function of addOrRemoveObjectFilter
 * @function addOrRemoveObjectFilterInt
 * @param {Object} newParams - new filters
 * @param {Object} category - the category of the selected filter
 * @param {STRING} stringValue - stringValue of the selected filter
 * @param {STRING} stringDisplayValue - stringDisplayValue of the selected filter
 */
export let addOrRemoveObjectFilterInt = function( newParams, category, stringValue, stringDisplayValue ) {
    delete newParams[ category ];
    var nodes = stringValue.split( '/' );

    // If we are removing the root node, the length will be 2. Otherwise we are removing an intermediate node.
    if( nodes.length > 2 ) {
        var level;
        level = ( nodes[ 0 ] - 1 ).toString();
        for( var i = 1; i < nodes.length - 1; i++ ) {
            level += '/';
            level += nodes[ i ];
        }
        exports.setNewObjectFilter( newParams, category, level, stringDisplayValue );
    }
};

/**
 * addOrRemoveObjectFilter
 * @function addOrRemoveObjectFilter
 * @param {Object} category - the category of the selected filter
 * @param {STRING} stringValue - stringValue of the selected filter
 * @param {BOOLEAN} addRemoveOnly - addRemoveOnly
 * @param {STRING} stringDisplayValue - stringDisplayValue of the selected filter
 */
export let addOrRemoveObjectFilter = function( category, stringValue, addRemoveOnly, stringDisplayValue ) {
    let searchFolderCtx = appCtxService.getCtx( 'searchFolder' );
    var newParams = searchFolderCtx.searchFilterMap;
    if( addRemoveOnly ) {
        delete newParams[ category ];
        // If the category does not exist in the parameters create it and add the filter
        // Unless told to only remove parameters
        exports.setNewObjectFilter( newParams, category, stringValue, stringDisplayValue );
    } else {
        exports.addOrRemoveObjectFilterInt( newParams, category, stringValue, stringDisplayValue );
    }
    searchFolderCtx.isDirty = true;
    eventBus.publish( 'searchFolder.ruleChanged' );
};


/**
 * Utility function of selectFilterDateInt
 * @function selectFilterDateInt_getFound
 * @param {OBJECT} filter - filter
 * @param {OBJECT} existingFilter - filter
 * @returns {BOOLEAN} found true/false
 */
export let selectFilterDateInt_getFound = function( filter, existingFilter ) {
let found1 = filter.categoryType === 'DateRangeFilter' && existingFilter.searchFilterType === 'DateFilter';
let found2 = existingFilter.startDateValue === filter.startDateValue && existingFilter.endDateValue === filter.endDateValue;
return found1 || found2;
};

/**
 * selectFilterDateInt
 * @function selectFilterDateInt
 * @param {Object} newParams - filter map
 * @param {STRING} categoryName - the category name of the selected filter
 * @param {OBJECT} filter - filter
 * @returns {OBJECT} newFilter - new Filter
 */
export let selectFilterDateInt = function( newParams, categoryName, filter ) {
    let found = false;
    let newFilter = null;
    for( var i = 0; i < newParams[ categoryName ].length; i++ ) {
        let existingFilter = newParams[ categoryName ][ i ];
        let found1 = exports.selectFilterDateInt_getFound( filter, existingFilter );
        if( found1 ) {
            newParams[ categoryName ].splice( i, 1 );
            found = true;
            break;
        }
    }
    if( !found ) {
        newFilter = {
            searchFilterType: 'DateFilter',
            startDateValue: filter.startDateValue,
            endDateValue: filter.endDateValue
        };
    }
    return newFilter;
};

/**
 * selectFilterNumericInt
 * @function selectFilterNumericInt
 * @param {Object} newParams - filter map
 * @param {STRING} categoryName - the category name of the selected filter
 * @param {OBJECT} filter - filter
 * @returns {OBJECT} newFilter - new Filter
 */
export let selectFilterNumericInt = function( newParams, categoryName, filter ) {
    let found = false;
    let newFilter = null;
    for( var i = 0; i < newParams[ categoryName ].length; i++ ) {
        let existingFilter = newParams[ categoryName ][ i ];
        if( existingFilter.startNumericValue === filter.startNumericValue && existingFilter.endNumericValue === filter.endNumericValue ) {
            newParams[ categoryName ].splice( i, 1 );
            found = true;
            break;
        }
    }
    if( !found ) {
        newFilter = {
            searchFilterType: 'NumericFilter',
            startNumericValue: filter.startNumericValue,
            endNumericValue: filter.endNumericValue

        };
        if( filter.startEndRange === 'NumericRange' ) {
            newFilter.startEndRange = 'NumericRange';
        } else {
            newFilter.stringValue = filter.internalName;
        }
    }
    return newFilter;
};

/**
 * selectFilterStringInt
 * @function selectFilterStringInt
 * @param {Object} newParams - filter map
 * @param {STRING} categoryName - the category name of the selected filter
 * @param {OBJECT} filter - filter
 * @returns {OBJECT} newFilter - new Filter
 */
export let selectFilterStringInt = function( newParams, categoryName, filter ) {
    let found = false;
    let newFilter = null;
    for( var i = 0; i < newParams[ categoryName ].length; i++ ) {
        let existingFilter = newParams[ categoryName ][ i ];
        if( existingFilter.stringValue === filter.internalName ) {
            newParams[ categoryName ].splice( i, 1 );
            found = true;
            break;
        }
    }
    if( !found ) {
        newFilter = {
            searchFilterType: 'StringFilter',
            stringDisplayValue: filter.name ? filter.name : '',
            stringValue: filter.internalName ? filter.internalName : ''
        };
    }
    return newFilter;
};

/**
 * selectFilterInt
 * @function selectFilterInt
 * @param {Object} newParams - filter map
 * @param {STRING} categoryName - the category name of the selected filter
 * @param {OBJECT} filter - filter
 */
export let selectFilterInt = function( newParams, categoryName, filter ) {
    let newFilter = null;
    if( filter.type === 'DateFilter' && categoryName.indexOf( '_0Z0_' ) < 0 ) {
        newFilter = exports.selectFilterDateInt( newParams, categoryName, filter );
    } else if( filter.type === 'NumericFilter' ) {
        newFilter = exports.selectFilterNumericInt( newParams, categoryName, filter );
    } else {
        newFilter = exports.selectFilterStringInt( newParams, categoryName, filter );
    }
    if( newFilter ) {
        newParams[ categoryName ].push( newFilter );
    }
};

/**
 * deleteDateCategory
 * @function deleteDateCategory
 * @param {STRING} categoryName - the category name of the selected filter
 * @param {Object} newParams - filter map
 * @param {STRING} uniqueId - uniqueId
 */
export let deleteDateCategory = function( categoryName, newParams, uniqueId ) {
    let stemName = categoryName.substring( 0, uniqueId );
    delete newParams[ stemName + '_0Z0_year_month_day' ];
    delete newParams[ stemName + '_0Z0_week' ];
    delete newParams[ stemName + '_0Z0_year_month' ];
    delete newParams[ stemName + '_0Z0_year' ];
    delete newParams[ stemName ];
};

/**
 * deleteDateCategoryPartial
 * @function deleteDateCategoryPartial
 * @param {STRING} categoryName - the category name of the selected filter
 * @param {Object} newParams - filter map
 * @param {STRING} uniqueId - uniqueId
 */
export let deleteDateCategoryPartial = function( categoryName, newParams, uniqueId ) {
    uniqueId = categoryName.indexOf( '_0Z0_week' );
    if( uniqueId > 0 ) {
        let stemName = categoryName.substring( 0, uniqueId );
        delete newParams[ stemName + '_0Z0_year_month_day' ];
        delete newParams[ categoryName ];
    } else {
        uniqueId = categoryName.indexOf( '_0Z0_year_month' );
        if( uniqueId > 0 ) {
            let stemName = categoryName.substring( 0, uniqueId );
            delete newParams[ stemName + '_0Z0_year_month_day' ];
            delete newParams[ stemName + '_0Z0_week' ];
            delete newParams[ categoryName ];
        } else {
            uniqueId = categoryName.indexOf( '_0Z0_year' );
            if( uniqueId > 0 ) {
                exports.deleteDateCategory( categoryName, newParams, uniqueId );
            }
        }
    }
};
/**
 * Utility function of selectFilter
 *
 * @function selectFilter_procNullFilter
 * @memberOf searchFolderFilterService
 *
 * @param {Object} category - the category of the selected filter
* @param {Object} newParams - filter map
 */
export let selectFilter_procNullFilter = function( category, newParams ) {
    let categoryName = category.filterValues[ 0 ].categoryName;
    if( categoryName ) {
        let uniqueId = categoryName.indexOf( '_0Z0_year' );
        if( uniqueId > 0 ) {
            exports.deleteDateCategory( categoryName, newParams, uniqueId );
        } else {
            delete newParams[ categoryName ];
        }
    } else {
        if( category.searchResultCategoryInternalName ) {
            //object filter
            delete newParams[ category.searchResultCategoryInternalName ];
        }
    }
};

/**
 * Utility function of selectFilter_procValidFilter
 *
 * @function selectFilter_procValidFilterInt
 * @memberOf searchFolderFilterService
 *
 * @param {STRING} categoryName - category name
 * @param {Object} newParams - filter map
 * @param {Object} filter - the selected filter
 */
export let selectFilter_procValidFilterInt = function( categoryName, newParams, filter ) {
    exports.selectFilterInt( newParams, categoryName, filter );
    if( newParams[ categoryName ].length === 0 ) {
        let uniqueId = categoryName.indexOf( '_0Z0_year' );
        if( uniqueId > 0 ) {
            exports.deleteDateCategoryPartial( categoryName, newParams, uniqueId );
        } else {
            delete newParams[ categoryName ];
        }
    }
};


/**
 * Utility function of selectFilter_procValidFilter
 *
 * @function selectFilter_AssignNewFilter
 * @memberOf searchFolderFilterService
 * @param {Object} filter - the selected filter
 * @param {STRING} searchFilterType - searchFilterType
 * @returns {Object} filter
 */
export let selectFilter_AssignNewFilter = function( filter, searchFilterType ) {
    return {
        endDateValue: filter.endDateValue ? filter.endDateValue : '',
        endNumericValue: filter.endNumericValue ? filter.endNumericValue : '',
        searchFilterType: searchFilterType,
        startDateValue: filter.startDateValue ? filter.startDateValue : '',
        startEndRange: filter.startEndRange ? filter.startEndRange : '',
        startNumericValue: filter.startNumericValue ? filter.startNumericValue : '',
        stringDisplayValue: filter.name ? filter.name : '',
        stringValue: filter.internalName ? filter.internalName : ''
    };
};

/**
 * Utility function of selectFilter
 *
 * @function selectFilter_procValidFilter
 * @memberOf searchFolderFilterService
 * @param {Object} category - category
 * @param {STRING} categoryName - category name
 * @param {Object} newParams - filter map
 * @param {Object} filter - the selected filter
 */
export let selectFilter_procValidFilter = function( category, categoryName, newParams, filter ) {
    if( filter.searchFilterType === 'ObjectFilter' ) {
        exports.addOrRemoveObjectFilter( category.searchResultCategoryInternalName, filter.stringValue, undefined, filter.stringDisplayValue );
    }
    categoryName = filter.categoryName;
    if( !categoryName ) {
        categoryName = category.searchResultCategoryInternalName;
    }
    if( newParams[ categoryName ] ) {
        exports.selectFilter_procValidFilterInt( categoryName, newParams, filter );
    } else {
        let searchFilterType = filter.type;
        if( filter.type === 'DrilldownDateFilter' || categoryName.indexOf( '_0Z0_year' ) > 0 ) {
            searchFilterType = 'StringFilter';
        }
        let newFilter = exports.selectFilter_AssignNewFilter( filter, searchFilterType );
        newParams[ categoryName ] = [ newFilter ];
    }
};
/**
 * publish event to select filter
 *
 * @function selectFilter
 * @memberOf searchFolderFilterService
 *
 * @param {Object} category - the category of the selected filter
 * @param {Object} filter - the selected filter
 */
export let selectFilter = function( category, filter ) {
    var categoryName;
    let searchFolderCtx = appCtxService.getCtx( 'searchFolder' );
    var newParams = searchFolderCtx.searchFilterMap;
    // Check if the filter already exists to determine if adding or removing filter
    if( !filter ) {
        exports.selectFilter_procNullFilter( category, newParams );
    } else {
        exports.selectFilter_procValidFilter( category, categoryName, newParams, filter );
    }
    searchFolderCtx.isDirty = true;
    eventBus.publish( 'searchFolder.ruleChanged' );
};

/**
 * publish event to select date range
 *
 * @function selectDateRange
 * @memberOf searchFolderFilterService
 *
 * @param {Object} category - the category of the selected filter
 */
export let selectDateRange = function( category ) {
    var startValue = category.daterange.startDate.dateApi.dateObject;
    var endValue = category.daterange.endDate.dateApi.dateObject;

    let newFilter = {
        searchFilterType: 'DateFilter',
        startDateValue: startValue,
        endDateValue: endValue
    };
    let searchFolderCtx = appCtxService.getCtx( 'searchFolder' );
    var newParams = searchFolderCtx.searchFilterMap;
    newParams[ category.internalName ] = [ newFilter ];
    searchFolderCtx.isDirty = true;
    eventBus.publish( 'searchFolder.ruleChanged' );
};

/**
 * publish event to select numeric range
 *
 * @function selectNumericRange
 * @memberOf searchFolderFilterService
 *
 * @param {Object} category - the category of the selected filter
 */
export let selectNumericRange = function( category ) {
    var startRange = parseFloat( category.numericrange.startValue.dbValue );
    if( isNaN( startRange ) ) {
        startRange = null;
    }
    var endRange = parseFloat( category.numericrange.endValue.dbValue );
    if( isNaN( endRange ) ) {
        endRange = null;
    }
    if( filterPanelUtils.checkIfValidRange( category, startRange, endRange ) ) {
        let newFilter = {
            searchFilterType: 'NumericFilter',
            startNumericValue: startRange,
            endNumericValue: endRange,
            startEndRange: 'NumericRange'
        };
        let searchFolderCtx = appCtxService.getCtx( 'searchFolder' );
        var newParams = searchFolderCtx.searchFilterMap;
        newParams[ category.internalName ] = [ newFilter ];
        searchFolderCtx.isDirty = true;
        eventBus.publish( 'searchFolder.ruleChanged' );
    }
};

/**
 * method to set the selected filter for OwningSite.owning_site property in searchFolder ctx
 * @function setOwningSiteFilterInSearchFolderCtx
 * @memberOf searchFolderFilterService
 * @param {Object} data - the performSearchViewModel family SOA response
 * @returns {Object} searchFolderCtx.searchFilterMap - the searchFilterMap to be set in ctx.searchFolder
 */
export let setOwningSiteFilterInSearchFolderCtx = function( data ) {
    var searchFolderCtx = appCtxService.getCtx( 'searchFolder' );
    if( !searchFolderCtx ) {
        searchFolderCtx = {};

    }
    if( !searchFolderCtx.searchFilterMap ) {
        searchFolderCtx.searchFilterMap = {};
    }
    var searchFilterMap6 = data.searchFilterMap6;
    if( searchFilterMap6 && searchFilterMap6[ 'OwningSite.owning_site' ] ) {
        var filterValues = searchFilterMap6[ 'OwningSite.owning_site' ];
        _.forEach( filterValues, function( eachFilterValue ) {
            if( eachFilterValue.selected ) {
                searchFolderCtx.searchFilterMap[ 'OwningSite.owning_site' ] = [ eachFilterValue ];
            }
        } );
    }
    return searchFolderCtx.searchFilterMap;
};

exports = {
    selectCategory,
    deleteDateCategory,
    deleteDateCategoryPartial,
    setNewObjectFilter,
    addOrRemoveObjectFilterInt,
    addOrRemoveObjectFilter,
    selectHierarchyCategory,
    selectHierarchyFilter,
    selectFilterStringInt,
    selectFilterNumericInt,
    selectFilterDateInt_getFound,
    selectFilterDateInt,
    selectFilterInt,
    selectFilter_procNullFilter,
    selectFilter_procValidFilterInt,
    selectFilter_AssignNewFilter,
    selectFilter_procValidFilter,
    selectFilter,
    selectDateRange,
    selectNumericRange,
    setOwningSiteFilterInSearchFolderCtx
};

export default exports;
app.factory( 'searchFolderFilterService', () => exports );

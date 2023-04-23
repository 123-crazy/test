// Copyright (c) 2020 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/filterPanelEvents
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import filterPanelUtils from 'js/filterPanelUtils';
import searchFilterSvc from 'js/aw.searchFilter.service';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import analyticsSvc from 'js/analyticsService';
import 'js/uwDirectiveDateTimeService';

var exports = {};

/**
 * publish event to select category header
 *
 * @function selectCategory
 * @memberOf filterPanelEvents
 *
 * @param {Object}category - filter category
 *
 */
export let selectCategory = function( category ) {
    var propValues = filterPanelUtils.getPropGroupValues( category );

    var context = {
        source: 'filterPanel',
        currentCategory: category.currentCategory,
        internalPropertyNameToGroupOn: category.internalName,
        propGroupingValues: propValues,
        category: category
    };
    var ctx = appCtxService.getCtx( 'searchResponseInfo' );
    if( ctx ) {
        ctx.objectsGroupedByProperty.groupedObjectsMap = null;
        ctx.propGroupingValues = propValues;
        ctx.objectsGroupedByProperty.internalPropertyName = category.internalName;
        appCtxService.updateCtx( 'searchResponseInfo', ctx );
        var searchChart = appCtxService.getCtx( 'searchChart' );
        if( searchChart ) {
            searchChart.userOverrideOfCurrentHighlightedCategory = category.internalName;
            appCtxService.updateCtx( 'searchChart', searchChart );
        }
    }
    var searchCurrentFilterCategories = appCtxService
        .getCtx( 'searchResponseInfo.searchCurrentFilterCategories' );
    if( searchCurrentFilterCategories === undefined ) {
        exports.rememberCategoryFilterState( context );
    }
    eventBus.publish( 'targetFilterCategoryUpdated', category.internalName );
    eventBus.publish( 'groupObjectCategoryChanged' );
};

/**
 * publish event to select hierarchy category
 *
 * @function selectHierarchyCategory
 * @memberOf filterPanelEvents
 *
 * @param {Object}category - filter category
 *
 */
export let selectHierarchyCategory = function( category ) {
    // if there is a hierarchy filter selected, clear it. Otherwise do the default category selection
    if( !_.isUndefined( category.filterValues.parentnodes[ 0 ] ) && category.filterValues.parentnodes[ 0 ].selected ) {
        var interName = filterPanelUtils.INTERNAL_OBJECT_FILTER + category.filterValues.parentnodes[ 0 ].stringValue;
        searchFilterSvc.addOrRemoveFilter( category.internalName, interName, undefined, 'ObjectFilter' );
    } else {
        // Nothing selected, trigger the default category selection logic.
        exports.selectCategory( category );
    }
};

/**
 * publish event to select Hierarhcy filter
 *
 * @function selectHierarchyFilter
 * @memberOf filterPanelEvents
 *
 * @param {Object} category - the category of the selected filter
 * @param {Object} node - the selected hierarhcy node (same structure as search filter)
 */
export let selectHierarchyFilter = function( category, node ) {
    var interName = filterPanelUtils.INTERNAL_OBJECT_FILTER + node.stringValue;
    /*
     * The logic in 'filterSelected' is to handle the case when the user has selected the current parent node.
     * 'isLast' is used to determine if the user has clicked the parent node. In this case we want to deselect the
     * filter. Setting 'selected' to true forces the 'clearFilter' method to be called in
     * SearchFilterCommandHandler.java
     */
    if( node.isLast || node.selected ) {
        searchFilterSvc.addOrRemoveFilter( category.internalName, interName, undefined, 'ObjectFilter' );
    } else if( !node.selected ) {
        searchFilterSvc.addOrRemoveFilter( category.internalName, interName, true, 'ObjectFilter' );
    }
};

/**
 * publish event to select filter
 *
 * @function selectFilter
 * @memberOf filterPanelEvents
 *
 * @param {Object} category - the category of the selected filter
 * @param {Object} filter - the selected filter
 */
export let selectFilter = function( category, filter ) {
    filterPanelUtils.updateFiltersInContext( category, filter );
    var categoryName = filter.categoryName ? filter.categoryName : category.internalName;
    var interName = filter.internalName;
    if( category.type === 'NumericFilter' ) {
        interName = filterPanelUtils.INTERNAL_NUMERIC_FILTER + filter.internalName;
    } else if( category.type === 'StringFilter' && category.internalName !== 'Categorization.category' && filter.name !== filter.internalName ) {
        interName = filter.name + filterPanelUtils.INTERNAL_KEYWORD + filter.internalName;
    }

    var searchCurrentFilterCategories = appCtxService
        .getCtx( 'searchResponseInfo.searchCurrentFilterCategories' );
    if( searchCurrentFilterCategories === undefined ) {
        var context = {
            category: category
        };
        exports.rememberCategoryFilterState( context );
    }

    // Get the active filters
    var newParams = searchFilterSvc.getFilters();

    // Check if the filter already exists to determine if adding or removing filter
    var idx = newParams[ categoryName ] ? newParams[ categoryName ].indexOf( interName ) : -1;

    // Publish filter panel event to AW analytics
    exports.selectFilterAnalytics( idx, interName, category );

    searchFilterSvc.addOrRemoveFilter( categoryName, interName, undefined, category.type );
};

/**
 * publish event to select date range
 *
 * @function selectFilterAnalytics
 * @memberOf filterPanelEvents
 *
 * @param {Object} idx - index
 * @param {Object} interName - internal name
 * @param {Object} category - the category of the selected filter
 */
export let selectFilterAnalytics = function( idx, interName, category ) {
    var sanEvent = {};
    sanEvent.sanAnalyticsType = 'Commands';

    if( idx === -1 && interName ) {
        sanEvent.sanCommandId = 'addSearchFilter';
        sanEvent.sanCommandTitle = 'Add Search Filter';
    } else {
        sanEvent.sanCommandId = 'removeSearchFilter';
        sanEvent.sanCommandTitle = 'Remove Search Filter';
    }
    sanEvent.sanCmdLocation = 'primarySearchPanel';
    sanEvent.sanCategoryType = 'Other';

    var outOfTheBoxValues = [ 'Categorization.category', 'WorkspaceObject.object_type', 'POM_application_object.owning_user',
    'POM_application_object.owning_group', 'WorkspaceObject.release_status_list', 'WorkspaceObject.date_released',
    'POM_application_object.last_mod_date', 'POM_application_object.last_mod_user', 'WorkspaceObject.project_list' ];

    if( outOfTheBoxValues.includes( category.internalName ) ) {
        sanEvent.sanCategoryType = category.internalName;
    }
    analyticsSvc.logNonDeclarativeCommands( sanEvent );
};

/**
 * publish event to select date range
 *
 * @function selectDateRange
 * @memberOf filterPanelEvents
 *
 * @param {Object} category - the category of the selected filter
 */
export let selectDateRange = function( category ) {
    var startValue = category.daterange.startDate.dateApi.dateObject;
    var endValue = category.daterange.endDate.dateApi.dateObject;
    var internalName = filterPanelUtils.getDateRangeString( startValue, endValue );

    searchFilterSvc.addOrRemoveFilter( category.internalName, internalName, undefined, 'DateRange' );
};

/**
 * publish event to select numeric range
 *
 * @function selectNumericRange
 * @memberOf filterPanelEvents
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
        var internalName = filterPanelUtils.getNumericRangeString( startRange, endRange );
        searchFilterSvc.addOrRemoveFilter( category.internalName, internalName, undefined, 'NumericRange' );
    }
};

/**
 * put the current category's expand/show more/etc into context
 *
 * @function rememberCategoryFilterState
 * @memberOf filterPanelEvents
 *
 * @param {Object} context - context
 * @param {String} contextInfo - the name of the context ( search or incontext )
 */
export let rememberCategoryFilterState = function( context, contextInfo ) {
    var contextName;
    if( !contextInfo ) {
        contextName = 'searchResponseInfo';
    } else {
        contextName = contextInfo;
        var contextNameCtx = appCtxService.getCtx( contextName );
        if( !contextNameCtx ) {
            contextNameCtx = {};
            appCtxService.registerCtx( contextName, contextNameCtx );
        }
    }
    var searchCurrentFilterCategories = appCtxService
        .getCtx( contextName + '.searchCurrentFilterCategories' );
    if( searchCurrentFilterCategories === undefined ) {
        searchCurrentFilterCategories = [];
        var ctx = appCtxService.getCtx( contextName );
        if( ctx ) {
            searchCurrentFilterCategories.push( context.category );
            ctx.searchCurrentFilterCategories = searchCurrentFilterCategories;
            appCtxService.updateCtx( contextName, ctx );
        }
    } else {
        var index = _.findIndex( searchCurrentFilterCategories, function( category ) {
            return category.internalName === context.category.internalName;
        } );
        if( index < 0 ) {
            searchCurrentFilterCategories.push( context.category );
        } else {
            searchCurrentFilterCategories[ index ] = context.category;
        }
        appCtxService.updatePartialCtx( contextName + '.searchCurrentFilterCategories',
            searchCurrentFilterCategories );
    }
};

exports = {
    selectCategory,
    selectHierarchyCategory,
    selectHierarchyFilter,
    selectFilter,
    selectDateRange,
    selectNumericRange,
    rememberCategoryFilterState,
    selectFilterAnalytics
};
export default exports;
/**
 *
 * @memberof NgServices
 * @member filterPanelEvents
 * @param {appCtxService} appCtxService - Service to use.
 * @param {dateTimeService} dateTimeService - Service to use.
 * @param {messagingService} messagingService - Service to use.
 * @param {localeService} localeSvc - Service to use.
 * @param {filterPanelUtils} filterPanelUtils - Service to use.
 * @param {searchFilterService} searchFilterSvc - Service to use.
 * @returns {exports} Instance of this service.
 */
app.factory( 'filterPanelEvents', () => exports );

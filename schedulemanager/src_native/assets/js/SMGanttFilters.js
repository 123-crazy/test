// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * @module js/SMGanttFilters
 */
import _ from 'lodash';
import appCtxSvc from 'js/appCtxService';
import awSearchFilterService from 'js/aw.searchFilter.service';
import filterPanelUtils from 'js/filterPanelUtils';

let exports;

/**
 * Rebuilds the filter chips based on the search filters.
 * @param {Object} data Declarative data
 */
let refreshFilterChips = ( data ) => {
    data.filterChips = []; // Reset the filter chips
    let searchParams = awSearchFilterService.getFilters( false, true, true, false );
    var searchFilterMap = appCtxSvc.ctx.search.filterMap;
    let searchFilterCategories = appCtxSvc.ctx.search.filterCategories;

    _.map( searchParams, function( value, property ) {
        let index = _.findIndex( searchFilterCategories, function( filterCategory ) {
            return filterCategory.internalName === property;
        } );

        if( index <= -1 ) {
            return;
        }

        _.forEach( searchParams[ property ], function( filter ) {
            let origProperty = property;
            let origFilter = filterPanelUtils.getRealFilterWithNoFilterType( filter );
            if( filter.hasOwnProperty( 'property' ) ) {
                origProperty = filter.property;
                origFilter = filter.filter;
            }

            let displayValue = awSearchFilterService.getBreadCrumbDisplayValue( searchFilterMap[ origProperty ], origFilter );
            if( displayValue && !_.isEmpty( displayValue ) ) {
                data.filterChips.push( {
                    chipType: 'BUTTON',
                    uiIconId: 'miscRemoveBreadcrumb',
                    labelDisplayName: searchFilterCategories[ index ].displayName + ': ' + displayValue,
                    labelInternalName: origFilter,
                    categoryInternalName: origProperty
                } );
            }
        } );
    } );
};

/**
 * Removes the given filter from the filter chip list.
 * @param {Array} filterChips Filter chips
 * @param {Object} chipToRemove Chip to remove
 */
let removeFilter = ( filterChips, chipToRemove ) => {
    if( chipToRemove ) {
        _.pullAllBy( filterChips, [ { labelDisplayName: chipToRemove.labelDisplayName } ], 'labelDisplayName' );
        awSearchFilterService.addOrRemoveFilter( chipToRemove.categoryInternalName, chipToRemove.labelInternalName, false, undefined );
    }

};

/**
 * Clears all the filters.
 * @param {Object} data Declarative data
 */
let removeAllFilters = ( data ) => {
    data.filterChips = [];
    awSearchFilterService.setFilters( [] );
};

exports = {
    refreshFilterChips,
    removeFilter,
    removeAllFilters

};

export default exports;

//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aceFilterService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import filterPanelService from 'js/filterPanelService';
import filterPanelUtils from 'js/filterPanelUtils';
import AwRootScopeService from 'js/awRootScopeService';
import aceColorDecoratorService from 'js/aceColorDecoratorService';
import soa_preferenceService from 'soa/preferenceService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

import 'js/searchColorDecoratorService';

var exports = {};

var filterColorValues = [];
/**
 * This method will return the first category among the given categories which is multi-valued and doesn't have
 * any value selected. If it doesn't find such a category then it defaults to the last category.
 */
export let getApplicableCategory = function( categories ) {
    var categoryToSelect;
    _.forEach( categories, function( category ) {
        categoryToSelect = category;
        if( category.filterValues.length > 1 && !doesThisCategoryHaveAnySelectedFilterValue( category ) ) {
            return false;
        }
    } );
    return categoryToSelect;
};

var doesThisCategoryHaveAnySelectedFilterValue = function( category ) {
    var selectedFilterFound = false;
    _.forEach( category.filterValues, function( filterValue ) {
        if( filterValue.selected && selectedFilterFound === false ) {
            selectedFilterFound = true;
        }
    } );
    return selectedFilterFound;
};

export let selectGivenCategory = function( category, appCtxPathForCategoriesToUpdate, rawCategories, contextKey ) {
    var filterContext = appCtxSvc.ctx.aceActiveContext;
    if( contextKey ) {
        filterContext = appCtxSvc.ctx[contextKey];
    }
    if( !category && filterContext.context.currentSelectedCatogory &&
        filterContext.context.currentSelectedCatogory.currentCategory ) {
        category = filterContext.context.currentSelectedCatogory.currentCategory;
    }
    if( category ) {
        var internalNameOfSelectedCategory = category.internalName.split( '.' )[ 1 ];
        category.expand = true;
        updateCategories( internalNameOfSelectedCategory, appCtxPathForCategoriesToUpdate, rawCategories, contextKey );
        fireCategoryChangedEvent( category, internalNameOfSelectedCategory, contextKey );
    }
};

var getColorPrefValue = function() {
    if( soa_preferenceService.getLoadedPrefs().AWC_ColorFiltering && !( appCtxSvc.ctx.splitView && appCtxSvc.ctx.splitView.mode ) ) {
        if( soa_preferenceService.getLoadedPrefs().AWC_ColorFiltering[ 0 ] === 'true' ) {
            return true;
        }
    }
    return false;
};

var fireCategoryChangedEvent = function( category, internalNameOfSelectedCategory, contextKey ) {
    var propValues = filterPanelUtils.getPropGroupValues( category );
    var context = {
        source: 'filterPanel',
        currentCategory: category,
        internalPropertyNameToGroupOn: internalNameOfSelectedCategory,
        propGroupingValues: propValues
    };

    if( getColorPrefValue() ) {
        var watchDeregistration = AwRootScopeService.instance.$watch( function() {
            filterColorValues.length = 0;
            _.forEach( category.filterValues, function( filterValue ) {
                if( filterValue.colorIndex === -1 ) {
                    filterColorValues.push( '' );
                } else if( filterPanelUtils.getFilterColorRGBValue( filterValue.colorIndex ) !== '' ) {
                    filterColorValues.push( filterPanelUtils.getFilterColorRGBValue( filterValue.colorIndex ) );
                }
            } );
            return filterColorValues;
        }, function( filterColorValues ) {
            if( filterColorValues && filterColorValues.length === category.filterValues.length ) {
                appCtxSvc.updatePartialCtx( contextKey + '.context.currentSelectedCatogory', context );

                if( appCtxSvc.getCtx( contextKey + '.context.supportedFeatures.Awb0EnableColorFilterFeature' ) ) {
                    eventBus.publish( 'ace.groupObjectCategoryChanged', context );
                }
                watchDeregistration();
            }
        }, true );
    } else {
        appCtxSvc.updatePartialCtx( contextKey + '.context.currentSelectedCatogory', context );
    }
};

var updateCategories = function( internalNameOfSelectedCategory, appCtxPathForCategoriesToUpdate,
    rawCategoriesInfo, contextKey ) {
    var filterContext = appCtxSvc.ctx.aceActiveContext;
    if( contextKey ) {
        filterContext = appCtxSvc.ctx[contextKey];
    }
    var currentCategories = filterContext.context.currentSelectedCatogory ?
            [ filterContext.context.currentSelectedCatogory.currentCategory ] : [];
    var processedCategories = filterPanelService.updateCategories( rawCategoriesInfo.rawCategories,
        rawCategoriesInfo.rawCategoryValues, internalNameOfSelectedCategory, getColorPrefValue(), currentCategories );
    exports.suppressDateRangeFilterForDateFilters( processedCategories );
    retainExpansionStateOfCategories( filterContext.context.categoriesToRender,
        processedCategories );
    appCtxSvc.updatePartialCtx( appCtxPathForCategoriesToUpdate, processedCategories );
};

export let suppressDateRangeFilterForDateFilters = function( categories ) {
    _.forEach( categories, function( category ) {
        if( category.type === 'DateFilter' ) {
            category.showDateRangeFilter = false;
        }
    } );
};

var retainExpansionStateOfCategories = function( currentCategoryInfo, newCategoryInfo ) {
    _.forEach( newCategoryInfo, function( newCategory ) {
        _.forEach( currentCategoryInfo, function( currentCategory ) {
            if( newCategory.internalName === currentCategory.internalName ) {
                newCategory.expand = currentCategory.expand;
                newCategory.showExpand = currentCategory.showExpand;
                newCategory.visibleFilterCount = currentCategory.visibleFilterCount;
            }
        } );
    } );
    return newCategoryInfo;
};

export let selectApplicableCategory = function( categories, searchFilterCategories, sourceSearchFilterMap ) {
    if( categories && searchFilterCategories && sourceSearchFilterMap ) {
        var category = exports.getApplicableCategory( categories );
        exports.selectGivenCategory( category, 'aceActiveContext.context.categoriesToRender', {
            rawCategories: searchFilterCategories,
            rawCategoryValues: sourceSearchFilterMap
        } );
    }
};

export let extractFilterCategoriesAndFilterMap = function( filterString ) {
    var filterCategoryValues = filterString.split( '~' );
    var categoriesInfo = [];
    var filterMap = {};
    //LCS-454632 Get the filter separator value from the preference AW_FacetValue_Separator
    var filterSeparator = appCtxSvc.ctx.preferences.AW_FacetValue_Separator ? appCtxSvc.ctx.preferences.AW_FacetValue_Separator[0] : '^';

    for( var x in filterCategoryValues ) {
        var filterCategoryValueString = filterCategoryValues[ x ];
        if( filterCategoryValueString.length > 0 ) {
            var filterValues = filterCategoryValueString.split( '==' );
            var filterValueAndType = filterValues[ 0 ].split( '^^' );
            var keyStr = filterValueAndType[ 1 ];
            var categoryInfo = {
                categoryType: filterValueAndType[ 0 ],
                defaultFilterValueDisplayCount: 0,
                displayName: '',
                editable: false,
                internalName: keyStr,
                isHierarchical: false,
                isMultiSelect: false,
                quickSearchable: false
            };
            var filterVals = filterValues[ 1 ].split( filterSeparator );
            var tempVals = [];
            for( var y in filterVals ) {
                tempVals.push( {
                    count: 0,
                    endDateValue: '0001-01-01T00:00:00',
                    endNumericValue: 0,
                    hasChildren: false,
                    searchFilterType: filterValueAndType[ 0 ],
                    selected: true,
                    startDateValue: '0001-01-01T00:00:00',
                    startEndRange: '',
                    stringDisplayValue: 'dummy',
                    stringValue: filterVals[ y ]
                } );
            }
            filterMap[ keyStr ] = tempVals;
            categoriesInfo.push( categoryInfo );
        }
    }
    return {
        filterCategories: categoriesInfo,
        filterMap: filterMap
    };
};

export default exports = {
    getApplicableCategory,
    selectGivenCategory,
    suppressDateRangeFilterForDateFilters,
    selectApplicableCategory,
    extractFilterCategoriesAndFilterMap
};
app.factory( 'aceFilterService', () => exports );

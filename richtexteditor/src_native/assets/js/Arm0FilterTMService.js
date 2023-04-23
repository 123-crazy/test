// @<COPYRIGHT>@
// ==================================================
// Copyright 2022.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Arm0FilterTMService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import eventBus from 'js/eventBus';

import arm0TraceabilityMatrix from 'js/Arm0TraceabilityMatrix';
import _ from 'lodash';
import aceFilterService from 'js/aceFilterService';
import discoveryFilterService from 'js/discoveryFilterService';
import commandPanelService from 'js/commandPanel.service';

var exports = {};


var FILTER_CONTEXT_KEY_SOURCE = 'RMFilterContextSource';
var FILTER_CONTEXT_KEY_TARGET = 'RMFilterContextTarget';


/**
 * Set subType in listbox
 *
 * @function getSearchId
 * @param {Object} data - The panel's view model object
 */
export let populateFilterInformation = function( data, ctx ) {
    data.enableTracelinkFilterApply = false;
    if( ctx.panelContext ) {
        if( ctx.MatrixContext.activeFilterView === 'TRACELINK' ) {
            var res = arm0TraceabilityMatrix.getLinkTypes();
            var selectedFilters = ctx.MatrixContext.typeFilter && ctx.MatrixContext.typeFilter.filter ? ctx.MatrixContext.typeFilter.filter : [];
            if( res.tlTypeList ) {
                var list = [];
                var first = {
                    categoryType: 'Attribute',
                    currentCategory: data.i18n.TracelinkType,
                    displayName: data.i18n.TracelinkType,
                    editable: false,
                    endIndex: 0,
                    endReached: true,
                    expand: true,
                    filterValues: [],
                    hasMoreFacetValues: false,
                    index: 0,
                    internalName: data.i18n.TracelinkType,
                    isMultiSelect: true,
                    isPopulated: true,
                    isSelected: false,
                    results: [],
                    showColor: true,
                    showEnabled: true,
                    showExpand: true,
                    showStringFilter: true,
                    startIndexForFacetSearch: 0,
                    type: 'StringFilter'
                };
                for( var i = 0; i < res.tlTypeList.length; i++ ) {
                    if( !res.tltypeCountMap[res.tlTypeList[ i ].propInternalValue] ) {
                        continue;
                    }
                    if( data.i18n.all !== res.tlTypeList[ i ].propDisplayValue ) {
                        var value = {
                            categoryName: data.i18n.TracelinkType,
                            colorIndex: 0,
                            drilldown: 0,
                            count: res.tltypeCountMap[res.tlTypeList[ i ].propInternalValue],
                            showCount: res.tltypeCountMap[res.tlTypeList[ i ].propInternalValue],
                            internalName: res.tlTypeList[ i ].propInternalValue,
                            name: res.tlTypeList[ i ].propDisplayValue,
                            selected: Boolean( selectedFilters.includes( res.tlTypeList[ i ].propInternalValue ) ),
                            showSuffixIcon: false,
                            type: 'StringFilter'
                        };
                        first.filterValues.push( value );
                        first.results.push( value );
                    }
                }
                list.push( first );
                data.tracelinkTypeList = list;
            }
        } else if( ctx.MatrixContext.activeFilterView === 'ROW' || ctx.MatrixContext.activeFilterView === 'ROW_COLUMN' ) {
            setInitialFilterContext( data, ctx.MatrixContext.sourcePCI, FILTER_CONTEXT_KEY_SOURCE );
        } else if( ctx.MatrixContext.activeFilterView === 'COLUMN' ) {
            setInitialFilterContext( data, ctx.MatrixContext.targetPCI, FILTER_CONTEXT_KEY_TARGET );
        }
    }
};


let getSelectedTypeOfTraceLink = function( data, doNotAddALL ) {
    var filterFlag = 0;
    var typeFilterList = [];
    if( data.tracelinkTypeList && data.tracelinkTypeList.length > 0 ) {
        if( data.tracelinkTypeList[0].filterValues.length === 1 ) {
            filterFlag = 0;
        }
        if( data.tracelinkTypeList[0].filterValues.length > 1 ) {
            for( var i = 0; i < data.tracelinkTypeList[0].filterValues.length; i++ ) {
                var node = data.tracelinkTypeList[0].filterValues[ i ];
                if( node.selected ) {
                    filterFlag = 2;
                    typeFilterList.push( node.internalName );
                }
            }
        }
    }
    var typeFilter = {};
    if( filterFlag === 2 ) {
        if( typeFilterList.length === data.tracelinkTypeList[0].filterValues.length && !doNotAddALL ) {
            typeFilterList = [ 'ALL' ];
            typeFilter.isFilterNeeded = false;
        } else{
            typeFilter.isFilterNeeded = true;
        }
        typeFilter.filter = typeFilterList;
    }
    return typeFilter;
};

/**
 * Get all object types from preference
 *
 * @param {Object} data - The view model data
 */
export let checkForTracelinkTypeFilter = function( data ) {
    appCtxService.registerPartialCtx( 'MatrixContext.typeFilter', getSelectedTypeOfTraceLink( data ) );
};

//------ ACE Filter Panel ------

/**

*
* @param {*} data - view model object

*/
export let destroyFilterPanel = function( data ) {
    appCtxService.unRegisterCtx( data.contextKey );


    appCtxService.updatePartialCtx( 'MatrixContext.activeFilterView', undefined );


    discoveryFilterService.destroy();
    _.defer( function() {
        eventBus.publish( 'Arm0TraceabilityMatrix.resizeWindow' );
    } );
};


export let discoveryFilterPanelRevealedFromRM = function( data ) {
    discoveryFilterService.toggleDelayedApply( data, false );

    // eventBus.publish( 'filterPanel.toggleDelayedApply', {
    //     toggleValue: false  // Toggle function will negate the value


    // } );
};

/**
 *
 * @param {Object} data - view model object
 * @param {Object} pci - product context object
 */
let setInitialFilterContext = function( data, pci, filterContextKey ) {
    // var modelObj = cdm.getObject( pci.uid );


    // if( !modelObj || _.isEmpty( modelObj.props ) ) {
    //     dmSvc.loadObjects( [ modelObj.uid ] );
    // }
    var isUpdateContext = false;
    if( data.contextKey ) {
        isUpdateContext = true;
    }


    var initialCtx = {
        context: {
            currentState: {
                filter: '',
                pci_uid: pci.uid
            },
            productContextInfo: pci,
            requestPref: {
            },
            transientRequestPref: {
            },
            supportedFeatures: {
                Awb0EnableSmartDiscoveryFeature: true
            }
        },
        key: 'MatrixContext'
    };

    appCtxService.updatePartialCtx( 'panelContext.contextKey', filterContextKey );
    data.contextKey = filterContextKey;
    appCtxService.registerCtx( data.contextKey, initialCtx );
    setTimeout( () => {
        if( isUpdateContext ) {
            // eventBus.publish( 'initializeAndReveal' );
            discoveryFilterService.setContext( data, appCtxService.ctx );
            discoveryFilterService.getFilterData( data );
            discoveryFilterPanelRevealedFromRM( data );
        }
    }, 100 );
};

export let applyMatrixFilter = function( data ) {
    var activeFilterView = appCtxService.ctx.MatrixContext.activeFilterView;
    if( activeFilterView === 'TRACELINK' ) {
        checkForTracelinkTypeFilter( data );
    }else {
        populateUpdatedRecipe( data );
        discoveryFilterService.clearRecipeCacheOnApplyFilter( data );
        var filter = _populateFilterParameters( appCtxService.getCtx( data.contextKey ).context );
        if( activeFilterView === 'ROW' || activeFilterView === 'ROW_COLUMN' ) {
            var rowFilter = {};
            rowFilter.filter = filter;
            appCtxService.registerPartialCtx( 'MatrixContext.rowFilter', rowFilter );
        } else if( activeFilterView === 'COLUMN' ) {
            var colFilter = {};
            colFilter.filter = filter;
            appCtxService.registerPartialCtx( 'MatrixContext.colFilter', colFilter );
        }


        var contextChangedOnResponse = eventBus.subscribe( 'Arm0FilterTM.updateFilterContextOnResponse', function( eventData ) {
            eventBus.unsubscribe( contextChangedOnResponse );


            // Update Filter context
            if( eventData && eventData.filterOutput ) {
                appCtxService.updatePartialCtx( data.contextKey + '.context.recipe', eventData.filterOutput.recipe );
                appCtxService.updatePartialCtx( data.contextKey + '.context.searchFilterCategories', eventData.filterOutput.searchFilterCategories );
                appCtxService.updatePartialCtx( data.contextKey + '.context.searchFilterMap', eventData.filterOutput.searchFilterMap );
                appCtxService.updatePartialCtx( appCtxService.ctx[data.contextKey].key + '.searchFilterMap', eventData.filterOutput.searchFilterMap );
            }

            eventBus.publish( 'occDataLoadedEvent', {
                dataProviderActionType: 'initializeAction',
                contextKey: data.contextKey
            } );


            // Fire event to update Filters/Categiries in ACE
            eventBus.publish( 'productContextChangedEvent', {
                dataProviderActionType: 'initializeAction',
                updatedView: 'Arm0TraceMatrixFilter'

            } );
        } );
    }
    data.enableTracelinkFilterApply = false;
    eventBus.publish( 'Arm0FilterTM.loadMatrixFilterData' );
};

var populateUpdatedRecipe = function( data ) {
    var context = appCtxService.getCtx( data.contextKey ).context;
    var effectiveRecipe = context.effectiveRecipe;
    if( effectiveRecipe ) {
        effectiveRecipe = omitUnwantedProperties( effectiveRecipe, [ '$$hashKey' ] );
        appCtxService.updatePartialCtx( data.contextKey + '.context.updatedRecipe', effectiveRecipe );
    }
};

var omitUnwantedProperties = function( recipe, propertiesToOmit ) {
    var outRecipe = [];
    if( recipe ) {
        recipe.forEach( function( term ) {
            var outTerm = _.omit( term, propertiesToOmit );
            if( outTerm.subCriteria && outTerm.subCriteria.length > 0 ) {
                outTerm.subCriteria = omitUnwantedProperties( outTerm.subCriteria, propertiesToOmit );
            }


            outRecipe.push( outTerm );
        } );
    }
    return outRecipe;
};

var _populateFilterParameters = function( currentContext ) {
    var filter = {};
    var filterString = null;

    filterString = currentContext.effectiveFilterString;

    filter.searchFilterCategories = [];
    filter.searchFilterMap = {};
    var recipe;

    // Populate filters/recipe only when filters are applied from this action OR when a filtered structure is being refreshed
    // or expanded
    if( currentContext.appliedFilters || filterString && !currentContext.updatedRecipe ) {
        if( currentContext.appliedFilters ) {
            recipe = currentContext.recipe;
            var appliedFilters = currentContext.appliedFilters;
            if( appliedFilters.filterCategories && appliedFilters.filterMap ) {
                filter.searchFilterCategories = appliedFilters.filterCategories;
                filter.searchFilterMap = appliedFilters.filterMap;
            }
        } else if( filterString ) {
            var categoriesInfo = aceFilterService.extractFilterCategoriesAndFilterMap( filterString );
            filter.searchFilterCategories = categoriesInfo.filterCategories;
            filter.searchFilterMap = categoriesInfo.filterMap;
            recipe = currentContext.recipe;
        }
    }
    //Populate recipe when recipe is modified via applying proximity or delete or operator change
    if( currentContext.updatedRecipe ) {
        recipe = currentContext.updatedRecipe;
    }

    filter.fetchUpdatedFilters = false;
    filter.recipe = [];


    if( recipe ) {
        filter.recipe.push.apply( filter.recipe, recipe );
    }

    filter.searchFilterFieldSortType = 'Priority';
    filter.searchSortCriteria = [];

    return filter;
};

export let activateMatrixFilterPanel = function( panelData ) {
    appCtxService.registerPartialCtx( 'MatrixContext.activeFilterView', panelData );
    if( panelData === 'ROW' || panelData === 'ROW_COLUMN' ) {
        appCtxService.registerPartialCtx( 'MatrixContext.activeFilterViewObjectName', appCtxService.ctx.MatrixContext.peakSrcInfo.displayName );
    } else if( panelData === 'COLUMN' ) {
        appCtxService.registerPartialCtx( 'MatrixContext.activeFilterViewObjectName', appCtxService.ctx.MatrixContext.peakTargetInfo.displayName );
    }
    var activeCommandId = appCtxService.getCtx( 'sidenavCommandId' );
    if( activeCommandId && activeCommandId === 'Arm0TraceMatrixFilter' ) {
        // Panel already opened
        discoveryFilterService.destroy();    // Destroy to delete existing filter cache
        appCtxService.updatePartialCtx( 'MatrixContext.activeFilterView', panelData );
        eventBus.publish( 'Arm0MatrixFilter.populateFilterInformation' );
    } else {
        commandPanelService.activateCommandPanel(
            'Arm0TraceMatrixFilter',
            'aw_navigation',
            { },
            true,
            true,
            {
                width: 'STANDARD'
            } );
    }
};

/**
 * Function to enable/disable visibility of filter button for Tracelink Type filter panel
 * @param {*} category -
 * @param {*} filter -
 * @param {*} data -
 */
export let selectTracelinkTypeFilterAction = function( category, filter, data ) {
    var selectedTypes = getSelectedTypeOfTraceLink( data, true );
    selectedTypes.filter = selectedTypes.filter ? selectedTypes.filter : [];
    if( !selectedTypes.filter.includes( filter.internalName ) && !filter.selected ) {
        selectedTypes.filter.push( filter.internalName );
    } else if( selectedTypes.filter.includes( filter.internalName ) && filter.selected ) {
        var index = selectedTypes.filter.indexOf( filter.internalName );
        selectedTypes.filter.splice( index, 1 );
    }
    var typeFilterContext = appCtxService.ctx.MatrixContext.typeFilter && appCtxService.ctx.MatrixContext.typeFilter.filter ? appCtxService.ctx.MatrixContext.typeFilter.filter : [];
    typeFilterContext = _.cloneDeep( typeFilterContext );
    if( typeFilterContext.indexOf( 'ALL' ) > -1 ) { // replace ALL with individual all types
        typeFilterContext = Object.keys( arm0TraceabilityMatrix.getLinkTypes().tltypeCountMap );
    }
    if( typeFilterContext.sort().join( ',' ) === selectedTypes.filter.sort().join( ',' ) ) {
        data.enableTracelinkFilterApply = false;
    } else {
        data.enableTracelinkFilterApply = true;
    }
};

export default exports = {


    populateFilterInformation,


    checkForTracelinkTypeFilter,
    destroyFilterPanel,
    applyMatrixFilter,
    discoveryFilterPanelRevealedFromRM,
    activateMatrixFilterPanel,
    selectTracelinkTypeFilterAction
};

/**
 * Filter TM service utility
 *
 * @memberof NgServices
 * @member Arm0FilterTMService
 */
app.factory( 'Arm0FilterTMService', () => exports );


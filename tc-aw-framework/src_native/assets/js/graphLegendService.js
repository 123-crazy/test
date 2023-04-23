// Copyright (c) 2019 Siemens

/* global define */

/**
 * This module define graph legend service
 *
 * @module js/graphLegendService
 */
import app from 'app';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import logSvc from 'js/logger';
import graphUtils from 'js/graphUtils';
import performanceUtils from 'js/performanceUtils';
import graphConstants from 'js/graphConstants';

'use strict';

var exports = {};

var LegendCategoryTypes = {
    Object: 'objects',
    Relation: 'relations',
    Port: 'ports',
    Annotation: 'annotations'
};

var CreationMode = {
    objects: 'nodeCreationMode',
    relations: 'edgeCreationMode',
    ports: 'portCreationMode',
    annotations: 'boundaryCreationMode'
};

var ConvertToStrokeDash = {
    dashed: 'DASH',
    dotted: 'DOT'
};

/**
 * Get all the visible graph items of the given category.
 *
 * @param graphModel the graph model object
 * @param category the graph legend category
 */
var getGraphItemsByCategory = function( graphModel, category ) {
    var items = [];
    if( graphModel && category ) {
        if( category.categoryType === LegendCategoryTypes.Object ) {
            var nodes = graphModel.graphControl.graph.getVisibleNodes();
            items = _.filter( nodes, nodeFilter( graphModel, category ) );
        } else if( category.categoryType === LegendCategoryTypes.Relation ) {
            var edges = graphModel.graphControl.graph.getVisibleEdges();
            items = _.filter( edges, edgeFilter( graphModel, category ) );
        } else if( category.categoryType === LegendCategoryTypes.Port ) {
            var ports = graphModel.graphControl.graph.getVisiblePorts();
            items = _.filter( ports, portFilter( graphModel, category ) );
        } else if( category.categoryType === LegendCategoryTypes.Annotation ) {
            var boundaries = graphModel.graphControl.graph.getVisibleBoundaries();
            items = _.filter( boundaries, boundaryFilter( graphModel, category ) );
        }
    }
    return items;
};

/**
 * The color variable should have structure:
 * @example
 * color: {
 *  redValue: 255,
 *  greenValue: 255,
 *  blueValue: 255,
 *  }
 */
export let colorTemplate = _.template(
    'rgb({ color.redValue },{ color.greenValue },{ color.blueValue })', {
        variable: 'color',
        interpolate: /{([\s\S]+?)}/g
    } );

/**
 * Initialize graph legend data,
 */
export let initLegendViewsData = function( legendData ) {
    if( !legendData || legendData.initialized ) {
        return;
    }
    if( legendData.legendViews ) {
        _.forEach( legendData.legendViews, function( legendView ) {
            _.forEach( legendView.categoryTypes, function( categoryType ) {
                _.forEach( categoryType.categories, function( category ) {
                    category.isExpanded = false;
                    category.isSelected = false;
                    if( category.creationMode === undefined || category.creationMode === null ) {
                        category.creationMode = 0;
                    }
                    _.forEach( category.subCategories, function( subCategory ) {
                        subCategory.isSub = true;
                        subCategory.parent = category;
                        subCategory.isExpanded = false;
                        subCategory.isSelected = false;
                        if( subCategory.isAuthorable === undefined || subCategory.isAuthorable === null ) {
                            subCategory.isAuthorable = true;
                        }
                        if( subCategory.creationMode === undefined || subCategory.creationMode === null ) {
                            subCategory.creationMode = 0;
                        }
                    } );
                    category.authorableSubCategories = _.filter( category.subCategories, function( subCategory ) {
                        return subCategory.isAuthorable;
                    } );
                } );
            } );
        } );
        legendData.initialized = true;
    }
};

/**
 * Initialize legend view and set the active view
 *
 * @param {Object} legendData the legend data.
 * @param {Object} legendState legend state.
 * @param {String} activeViewName The name of active view. It can be null and the name comes form default or legendview[0]
 */
export let initLegendActiveView = function( legendData, legendState, activeViewName ) {
    // initialize legend state
    var activeView = null;
    if( legendData && legendData.legendViews ) {
        var realActiveViewName = activeViewName ? activeViewName : legendData.defaultActiveView;
        if( realActiveViewName ) {
            activeView = _.find( legendData.legendViews, function( legendView ) {
                return realActiveViewName === legendView.internalName;
            } );
        } else {
            // use the first legend view as active if no active view has been specified
            activeView = legendData.legendViews[ 0 ];
        }
        activeView.showEnabled = true;
        activeView.expand = true;
        legendState.activeView = activeView;

        // Set the active index for consumption of legend view list box
        legendState.activeViewIndex = _.findIndex( legendData.legendViews, activeView );

        _.forEach( legendData.legendViews, function( legendView ) {
            legendView.filteredCategories = _( legendView.categoryTypes ).reduce(
                function( allCategories, categoryType ) {
                    return allCategories.concat( categoryType.categories );
                }, [] ).filter( function( category ) {
                return category.isFiltered;
            } );
        } );
    }
};

export let initLegend = function( legendData, graphModel, legendState, legendView ) {
    exports.initLegendViewsData( legendData );
    exports.updateLegendCountAndSelection( graphModel, legendView );
    exports.registerFilter( graphModel, legendState );
};

var _clearView = function( legendView ) {
    _.forEach( legendView.categoryTypes, function( categoryType ) {
        _.forEach( categoryType.categories, function( category ) {
            category.isSelected = false;
            category.isFiltered = false;
            category.isExpanded = false;
            category.count = 0;
        } );
    } );

    legendView.expand = false;
    legendView.showEnabled = false;
    legendView.filteredCategories = null;
};

/**
 * Clear legend state of inputted view
 *
 * @param {Object} graphModel the legend data.
 * @param {Object} legendState legend state.
 * @param {Array} legendViews The legend view to clear
 */
export let clearLegend = function( graphModel, legendState, legendViews ) {
    _.forEach( legendViews, function( legendView ) {
        _clearView( legendView );
    } );

    exports.updateCreationCategory( graphModel, legendState, null, null );
};

/**
 * Update creation category in legend state.
 */
export let updateCreationCategory = function( graphModel, legendState, category, typeCategory ) {
    if( legendState.creatingCategory !== category ) {
        if( legendState.creatingCategory ) {
            legendState.creatingCategory.creationMode = 0;
        }
        legendState.creatingCategory = category;
    }

    if( legendState.creatingSubCategory !== typeCategory ) {
        if( legendState.creatingSubCategory ) {
            legendState.creatingSubCategory.creationMode = 0;
        }
        graphModel.graphControl.inputMode.cancelEdgeCreation();
        legendState.creatingSubCategory = typeCategory;
    }

    updateGraphState( legendState, graphModel );
    eventBus.publish( 'awGraphLegend.creationModeChanged', legendState );
};

/**
 * exit creation mode if is in single creation mode.
 */
export let updateCreationMode = function( graphModel, legendState ) {
    if( legendState && legendState.creatingSubCategory && legendState.creatingSubCategory.creationMode === 1 &&
        legendState.creatingCategory && legendState.creatingCategory.creationMode === 1 ) {
        legendState.creatingSubCategory.creationMode = 0;
        legendState.creatingCategory.creationMode = 0;
        updateGraphState( legendState, graphModel );
        eventBus.publish( 'awGraphLegend.creationModeChanged', legendState );
    }
};

/**
 * select view: action on click on the view title.
 */
export let selectView = function( activeViewIndex, legendData, legendState ) {
    if( !legendState ) {
        return;
    }

    if( activeViewIndex !== legendState.activeViewIndex ) {
        if( legendState.activeView ) {
            legendState.activeView.showEnabled = false;
            legendState.activeView.expand = false;

            // de-select all categories in old view
            _.forEach( legendState.activeView.categoryTypes, function( categoryType ) {
                _.forEach( categoryType.categories, function( category2 ) {
                    if( category2.isSelected ) {
                        category2.isSelected = false;
                    }
                } );
            } );
        }

        legendState.activeView = legendData.legendViews[ activeViewIndex ];
        legendState.activeView.showEnabled = true;
        legendState.activeView.expand = true;
        legendState.activeViewIndex = activeViewIndex;
        eventBus.publish( 'awGraphLegend.viewChanged' );
    }
};

/**
 * Calculate category count of one same graph item type.
 *
 * @param items the array of graph items of same item type
 * @param categories the array of categories of a legend group
 * @param categoryFn the function object to get category information of graph item
 */
var calculateCategoryCount = function( items, categories, categoryFn ) {
    if( items && categories && categoryFn ) {
        // reset all category count to 0 before statistic
        _.forEach( categories, function( category ) {
            category.count = 0;
        } );

        _.forEach( items, function( item ) {
            var category = _.find( categories, function( category ) {
                return matchCategory( category, categoryFn( item ) );
            } );

            if( category ) {
                if( category.count === undefined ) {
                    category.count = 0;
                }
                category.count++;
            }
        } );
    }
};

/**
 * Get all visible child nodes in the graph
 *
 * @return the visible child nodes
 */
var getVisibleChildNodes = function( nodes, graphModel ) {
    var groupGraph = graphModel.graphControl.groupGraph;
    return _.filter( nodes, function( node ) {
        return groupGraph.getParent( node );
    } );
};

/**
 * Calculate count of graph items of the same legend types by classifying their legend information. The count will
 * be updated in the input legend data.
 *
 * @param graphModel the graph model object
 * @param legendView the graph legend view
 *
 */
export let calculateLegendCount = function( graphModel, legendView ) {
    if( !graphModel || !graphModel.categoryApi ) {
        return;
    }

    var objectCategoryData = _.find( legendView.categoryTypes, {
        internalName: 'objects'
    } );

    var relationCategoryData = _.find( legendView.categoryTypes, {
        internalName: 'relations'
    } );
    var portCategoryData = _.find( legendView.categoryTypes, {
        internalName: 'ports'
    } );
    var boundaryCategoryData = _.find( legendView.categoryTypes, {
        internalName: 'annotations'
    } );

    var nodes = graphModel.graphControl.graph.getVisibleNodes();
    if( objectCategoryData ) {
        calculateCategoryCount( nodes, objectCategoryData.categories, graphModel.categoryApi.getNodeCategory );
    }

    if( relationCategoryData ) {
        var edges = graphModel.graphControl.graph.getVisibleEdges();
        calculateCategoryCount( edges, relationCategoryData.categories, graphModel.categoryApi.getEdgeCategory );

        if( !graphModel.graphControl.graph.isNetworkMode() ) {
            // calculate group relation category count for nested mode
            var allChildNodes = getVisibleChildNodes( nodes, graphModel );
            var groupRelationCategoryName = graphModel.categoryApi.getGroupRelationCategory();
            var groupRelationCategory = _.find( relationCategoryData.categories, {
                internalName: groupRelationCategoryName
            } );
            if( groupRelationCategory ) {
                groupRelationCategory.count = allChildNodes.length;
            }
        }
    }

    if( portCategoryData ) {
        // get all ports with input style, not the graphical ports that don't have geometry
        var ports = graphModel.graphControl.graph.getVisiblePorts();
        calculateCategoryCount( ports, portCategoryData.categories, graphModel.categoryApi.getPortCategory );
    }

    if( boundaryCategoryData ) {
        var boundaries = graphModel.graphControl.graph.getVisibleBoundaries();
        calculateCategoryCount( boundaries, boundaryCategoryData.categories, graphModel.categoryApi.getBoundaryCategory );
    }
};

/**
 * Update legend category selection by graph selection. Calculate count of graph items of the same legend types by
 * classifying their legend information. The count will be updated in the input legend data.
 *
 * @param graphModel the graph model object
 * @param legendView the graph legend view
 *
 */
export let updateLegendCountAndSelection = function( graphModel, legendView ) {
    if( !graphModel || !legendView ) {
        return;
    }

    exports.calculateLegendCount( graphModel, legendView );

    // update legend category selection by graph selection
    var selectedItems = graphModel.graphControl.getSelected();

    clearLegendSelectionState( legendView );
    exports.updateLegendSelection( graphModel, legendView, selectedItems, [] );
};

var clearLegendSelectionState = function( legendView ) {
    if( !legendView ) {
        return;
    }
    _.forEach( legendView.categoryTypes, function( categoryType ) {
        _.forEach( categoryType.categories, function( category ) {
            category.isSelected = false;
        } );
    } );
};

/**
 * clear registered filter
 */
export let clearFilter = function( graphModel, legendState ) {
    if( legendState.categoryFilterRegistered ) {
        graphModel.filters = [];
        legendState.categoryFilterRegistered = false;
    }
};

/**
 * register filter
 *
 * @param legendState the graph legendState
 */
export let registerFilter = function( graphModel, legendState ) {
    if( !graphModel || !legendState || legendState.categoryFilterRegistered ) {
        return;
    }

    if( !graphModel.filters ) {
        graphModel.filters = [];
    }

    var filter = legendCategoryFilter( graphModel, legendState );
    graphModel.filters.push( filter );
    legendState.categoryFilterRegistered = true;
};

var combinedFilter = function( defaultFilter, customerFilter ) {
    var hasCustomerFilter = Boolean( customerFilter && typeof customerFilter === 'function' );

    return function( graphModel, category ) {
        return function( item ) {
            if( hasCustomerFilter ) {
                return defaultFilter( graphModel, category )( item ) &&
                    customerFilter( graphModel, category )( item );
            }

            return defaultFilter( graphModel, category )( item );
        };
    };
};

var nodeFilter = function( graphModel, category ) {
    return function( item ) {
        return matchCategory( category, graphModel.categoryApi.getNodeCategory( item ) );
    };
};

var edgeFilter = function( graphModel, category ) {
    return function( item ) {
        return matchCategory( category, graphModel.categoryApi.getEdgeCategory( item ) );
    };
};

var portFilter = function( graphModel, category ) {
    return function( item ) {
        return matchCategory( category, graphModel.categoryApi.getPortCategory( item ) );
    };
};

var boundaryFilter = function( graphModel, category ) {
    return function( item ) {
        return matchCategory( category, graphModel.categoryApi.getBoundaryCategory( item ) );
    };
};

/**
 *
 * @param category the top level category
 * @param item the graph item
 * @param categoryFn the categoryFn
 * @param matchDisplayName flag to indicate whether to match legend category display name
 * @return true or false
 */
var matchCategory = function( category, categoryName, matchDisplayName ) {
    if( !category || !categoryName ) {
        return false;
    }

    // check top level first
    if( category.internalName === categoryName ) {
        return true;
    }

    if( matchDisplayName && category.displayName === categoryName ) {
        return true;
    }

    // then check sub level
    var matchedSubCategory = _.find( category.subCategories, function( subCategory ) {
        if( subCategory.internalName === categoryName ) {
            return true;
        }

        if( matchDisplayName && subCategory.displayName === categoryName ) {
            return true;
        }
    } );
    return matchedSubCategory !== undefined;
};

/**
 * get all ActiveFilters based on the filters from Legend
 *
 * @param filters
 * @return array the Active Filters
 */
var getActiveFilters = function( filters ) {
    if( !filters ) {
        return;
    }
    return _.reduce( filters, function( all, item ) {
        _.forEach( item.categories, function( category ) {
            if( category.isFiltered ) {
                all.push( category );
            }
        } );
        return all;
    }, [] );
};

/**
 * LegendCategoryFilter
 *
 * @param graphModel the graph model object
 * @param legendState the graph legendState
 *
 */
var legendCategoryFilter = function( graphModel, legendState ) {
    return function( nodes, edges, ports, boundaries, itemsToHide ) {
        // get all filters
        var filters = getActiveFilters( legendState.activeView.categoryTypes );

        if( !filters || filters.length === 0 ) {
            return {
                nodes: nodes,
                edges: edges,
                ports: ports,
                boundaries: boundaries,
                itemsToHide: itemsToHide
            };
        }

        // customer configured filters
        var customerItemFilter = null;
        if( graphModel.customFilterApi ) {
            customerItemFilter = graphModel.customFilterApi.customerItemFilter;
        }

        // 1, apply all filters, for all input graph items
        var filteredNodes = [];
        var filteredEdges = [];
        var filteredPorts = [];
        var filteredBoundaries = [];
        var leftNodes = [];
        var leftEdges = [];
        var leftPorts = [];
        var leftBoundaries = [];

        // 2 apply
        _.forEach( filters, function( category ) {
            var outs = [];
            if( category.categoryType === 'objects' ) {
                outs = _.filter( nodes, combinedFilter( nodeFilter, customerItemFilter )( graphModel, category ) );
                filteredNodes = filteredNodes.concat( outs );
            } else if( category.categoryType === 'relations' ) {
                outs = _.filter( edges, edgeFilter( graphModel, category ) );
                filteredEdges = filteredEdges.concat( outs );
            } else if( category.categoryType === 'ports' ) {
                outs = _.filter( ports, portFilter( graphModel, category ) );
                filteredPorts = filteredPorts.concat( outs );
            } else if( category.categoryType === 'annotations' ) {
                outs = _.filter( boundaries, boundaryFilter( graphModel, category ) );
                filteredBoundaries = filteredBoundaries.concat( outs );
            }
        } );

        leftNodes = _.difference( nodes, filteredNodes );
        leftEdges = _.difference( edges, filteredEdges );
        leftPorts = _.difference( ports, filteredPorts );
        leftBoundaries = _.difference( boundaries, filteredBoundaries );
        itemsToHide = itemsToHide.concat( filteredNodes, filteredEdges, filteredPorts, filteredBoundaries );

        return {
            nodes: leftNodes,
            edges: leftEdges,
            ports: leftPorts,
            boundaries: leftBoundaries,
            itemsToHide: itemsToHide
        };
    };
};

/**
 * Update graph selection on legend category selection. If in single selection mode, only the graph items of the
 * input legend categories will be selected, all the other existing selection will be reset. If in multiple
 * selection mode, the existing selection will be kept unchanged.
 *
 * @param graphModel the graph model object
 * @param category the selection changed legend category
 * @param isMultiSelect the flag of selection mode
 */
export let updateGraphSelectionByCategory = function( graphModel, category, isMultiSelect ) {
    if( !graphModel || !category ) {
        return;
    }

    // start performance timer
    var performanceTimer = performanceUtils.createTimer();

    var graphControl = graphModel.graphControl;
    var categoryItems = getGraphItemsByCategory( graphModel, category );
    if( isMultiSelect ) {
        graphControl.setSelected( categoryItems, category.isSelected );
    } else {
        graphControl.setSelected( null );
        graphControl.setSelected( categoryItems, category.isSelected );
    }

    // log performance time
    performanceTimer.endAndLogTimer( 'Category Selection Changed', 'categorySelectionChanged' );
};

/**
 * Wrapper method to get item type
 */
var getItemType = function( item ) {
    return item.getItemType();
};

/**
 * Update legend selection for a category type.
 *
 * @param graphModel the graph model object
 * @param itemType the graph item type.
 * @param newSelectedItemsGroupByType the new selected graph items grouped by item type
 * @param legendCategories the graph legend categories of the item type
 * @param categoryFn the function object to get category of graph item
 */
var updateLegendSelectionForCategoryType = function( itemType, graphModel, newSelectedItemsGroupByType,
    legendCategories, categoryFn ) {
    // select legend categories which have all items of that categories been selected
    if( itemType in newSelectedItemsGroupByType ) {
        var selectedNodesGroupByCategory = _.groupBy( newSelectedItemsGroupByType[ itemType ], categoryFn );
        var allSelectedItems = graphModel.graphControl.getSelected( itemType );
        var allSelectedItemsGroupByCategory = _.groupBy( allSelectedItems, categoryFn );
        _.forEach( selectedNodesGroupByCategory, function( value, key ) {
            var category = _.find( legendCategories, {
                internalName: key
            } );

            if( category && key in allSelectedItemsGroupByCategory ) {
                category.isSelected = allSelectedItemsGroupByCategory[ key ].length === category.count;
            }
        } );
    }
};

/**
 * Clear graph legend selection from unselected graph items for a category type.
 *
 * @param graphModel the graph model object
 * @param itemType the graph item type.
 * @param unselectedItemsGroupByType the unselected graph items grouped by item type
 * @param legendCategories the graph legend categories of the item type
 * @param categoryFn the function object to get category of graph item
 */
var clearLegendSelectionForCategoryType = function( itemType, graphModel, unselectedItemsGroupByType,
    legendCategories, categoryFn ) {
    if( itemType in unselectedItemsGroupByType ) {
        var unselectedItemsGroupByCategory = _.groupBy( unselectedItemsGroupByType[ itemType ], categoryFn );
        _.forEach( unselectedItemsGroupByCategory, function( value, key ) {
            var category = _.find( legendCategories, {
                internalName: key
            } );

            if( category ) {
                category.isSelected = false;
            }
        } );
    }
};

/**
 * Update graph legend category selection on graph selection changed. If all the items of a legend category are
 * selected on graph, then legend category will be updated to be selected.
 *
 * @param graphModel the graph model object
 * @param legendView the graph legend view
 * @param selectedItems the new selected graph items
 * @param unselectedItems the new unselected graph items
 */
export let updateLegendSelection = function( graphModel, legendView, selectedItems, unselectedItems ) {
    if( !graphModel || !graphModel.categoryApi || !legendView ) {
        return;
    }

    var objectCategoryData = _.find( legendView.categoryTypes, {
        internalName: 'objects'
    } );
    var relationCategoryData = _.find( legendView.categoryTypes, {
        internalName: 'relations'
    } );
    var portCategoryData = _.find( legendView.categoryTypes, {
        internalName: 'ports'
    } );
    var boundaryCategoryData = _.find( legendView.categoryTypes, {
        internalName: 'annotations'
    } );

    // select legend categories which have all items of that categories been selected
    if( selectedItems && selectedItems.length > 0 ) {
        var newSelectedItemsGroupByType = _.groupBy( selectedItems, getItemType );
        if( objectCategoryData ) {
            updateLegendSelectionForCategoryType( 'Node', graphModel, newSelectedItemsGroupByType,
                objectCategoryData.categories, graphModel.categoryApi.getNodeCategory );
        }
        if( relationCategoryData ) {
            updateLegendSelectionForCategoryType( 'Edge', graphModel, newSelectedItemsGroupByType,
                relationCategoryData.categories, graphModel.categoryApi.getEdgeCategory );
        }
        if( portCategoryData ) {
            updateLegendSelectionForCategoryType( 'Port', graphModel, newSelectedItemsGroupByType,
                portCategoryData.categories, graphModel.categoryApi.getPortCategory );
        }
        if( boundaryCategoryData ) {
            updateLegendSelectionForCategoryType( 'Boundary', graphModel, newSelectedItemsGroupByType,
                boundaryCategoryData.categories, graphModel.categoryApi.getBoundaryCategory );
        }
    }

    // un-select legend categories that have items been unselected
    if( unselectedItems && unselectedItems.length > 0 ) {
        var unselectedItemsGroupByType = _.groupBy( unselectedItems, getItemType );
        if( objectCategoryData ) {
            clearLegendSelectionForCategoryType( 'Node', graphModel, unselectedItemsGroupByType,
                objectCategoryData.categories, graphModel.categoryApi.getNodeCategory );
        }
        if( relationCategoryData ) {
            clearLegendSelectionForCategoryType( 'Edge', graphModel, unselectedItemsGroupByType,
                relationCategoryData.categories, graphModel.categoryApi.getEdgeCategory );
        }
        if( portCategoryData ) {
            clearLegendSelectionForCategoryType( 'Port', graphModel, unselectedItemsGroupByType,
                portCategoryData.categories, graphModel.categoryApi.getPortCategory );
        }
        if( boundaryCategoryData ) {
            clearLegendSelectionForCategoryType( 'Boundary', graphModel, unselectedItemsGroupByType,
                boundaryCategoryData.categories, graphModel.categoryApi.getBoundaryCategory );
        }
    }
};

var updateGraphState = function( legendState, graphModel ) {
    if( graphModel && legendState ) {
        var graphEditInputMode = 'editInputMode';
        if( legendState.creatingCategory ) {
            if( legendState.creatingCategory.creationMode === 0 ) {
                // set edit input mode
                graphModel.graphControl.inputMode.cancelEdgeCreation();
                graphModel.config.inputMode = graphEditInputMode;
            } else if( legendState.creatingCategory.creationMode === 1 ) {
                var previewColor = legendState.creatingCategory.style.color;
                graphModel.config.inputMode = CreationMode[ legendState.creatingCategory.categoryType ];
                switch ( legendState.creatingCategory.categoryType ) {
                    case 'objects':
                        break;
                    case 'relations':
                        // set edge preview color
                        graphModel.config.defaults.edgeStyle.color = previewColor;
                        break;
                    case 'ports':
                        // set port preview color
                        if( _.has( graphModel, 'config.defaults.portStyle.normalStyleClass' ) )  {
                            graphModel.config.defaults.portStyle.fillColor = previewColor;
                        } else {
                            graphModel.config.defaults.portStyle.borderColor = previewColor;
                        }
                        break;
                    case 'annotations':
                        // set boundary preview color
                        graphModel.config.defaults.boundaryStyle.fillColor = previewColor;
                        graphModel.config.defaults.boundaryStyle.borderColor = legendState.creatingCategory.style.borderColor;
                        graphModel.config.defaults.boundaryStyle.strokeDash = ConvertToStrokeDash[ legendState.creatingCategory.style.borderStyle ];
                        break;
                    default:
                        break;
                }
            }
        }
    }
};

/**
 * Get legend category by category type and category name in a legend view.
 *
 * @param categoryType the legend category type
 * @param categoryName the category name or sub category name
 * @param legendView the active legend view
 * @param matchDisplayName flag to indicate whether to match legend category display name
 *
 * @return {Object} the legend category object
 */
export let getLegendCategory = function( categoryType, categoryName, legendView, matchDisplayName ) {
    if( !categoryName || !legendView ) {
        return null;
    }

    var category = null;
    var objectCategoryType = _.find( legendView.categoryTypes, {
        internalName: categoryType
    } );

    if( objectCategoryType ) {
        category = _.find( objectCategoryType.categories, function( category ) {
            return matchCategory( category, categoryName, matchDisplayName );
        } );
    }

    return category;
};

/**
 * Get style from graph legend configuration
 *
 * @param categoryType the legend category type
 * @param categoryName the node category name
 * @param legendView the active legend view
 * @param graphModel the graph model
 *
 * @return the style object
 */
export let getStyleFromLegend = function( categoryType, categoryName, legendView, graphModel ) {
    // parse legend raw style and cache style object for matched category
    var style = null;
    var category = exports.getLegendCategory( categoryType, categoryName, legendView );
    if( category ) {
        if( category.parsedStyle ) {
            style = category.parsedStyle;
        } else {
            var rawStyle = category.style;
            style = _.clone( rawStyle );

            //
            if( categoryType === 'ports' ) {
                if( graphModel &&  _.has( graphModel, 'config.defaults.portStyle.normalStyleClass' ) ) {
                    if( graphModel.config.defaults.portStyle.borderColor ) {
                        style.borderColor = graphModel.config.defaults.portStyle.borderColor;
                    } else {
                        style.borderColor = graphConstants.DefaultPortStyle.borderColor;
                    }
                    style.fillColor = rawStyle.color;
                } else {
                    style.borderColor = rawStyle.color;
                }
            }

            if( rawStyle.borderStyle ) {
                style.dashStyle = rawStyle.borderStyle.toUpperCase();
            }
            if( rawStyle.borderWidth ) {
                style.thickness = parseInt( _.trimEnd( rawStyle.borderWidth, 'px' ) );
            }

            category.parsedStyle = style;
        }
    }

    return style;
};

/**
 * Given an array of objects to be represented in listbox, this function returns an array of ListModel objects for
 * consumption by the listbox widget.
 *
 * @param {ObjectArray} objArray - Array of objects
 * @param {String} path - If each object is a structure, then this is the path to the display string in each object;
 *            If each object represents a Model Object, then path is the Model Object property which holds the
 *            display value
 *
 * @return {ObjectArray} - Array of ListModel objects.
 */
export let getLegendViewList = function( objArray, path ) {
    var listModels = [];
    var listModel = null;

    var index = 0;

    _.forEach( objArray, function( modelObj ) {
        var dispName = _.get( modelObj, path );

        listModel = {
            propDisplayValue: '',
            propInternalValue: '',
            propDisplayDescription: '',
            hasChildren: false,
            children: {},
            sel: false
        };

        listModel.propDisplayValue = dispName;
        listModel.propInternalValue = index;
        index++;

        listModels.push( listModel );
    } );

    return listModels;
};

export default exports = {
    colorTemplate,
    initLegendViewsData,
    initLegendActiveView,
    initLegend,
    clearLegend,
    updateCreationCategory,
    updateCreationMode,
    selectView,
    calculateLegendCount,
    updateLegendCountAndSelection,
    clearFilter,
    registerFilter,
    updateGraphSelectionByCategory,
    updateLegendSelection,
    getLegendCategory,
    getStyleFromLegend,
    getLegendViewList
};

// Copyright (c) 2020 Siemens

/**
 * This module defines layout related functions
 *
 * @module js/actionBuilderGraphLayout
 */
import _ from 'lodash';
import graphConstants from 'js/graphConstants';
import actionBuilderUtils from 'js/actionBuilderUtils';

var exports = {};

export let incUpdateActive = function( layout ) {
    return layout && layout.type === 'IncUpdateLayout' && layout.isActive();
};

export let sortedLayoutActive = function( layout ) {
    return layout && layout.type === 'SortedLayout' && layout.isActive();
};

export let columnLayoutActive = function( layout ) {
    return layout && layout.type === 'ColumnLayout' && layout.isActive();
};

export let layoutActive = function( layout ) {
    return layout !== undefined && layout.isActive();
};

var removeObjectsFromSortedLayout = function( layout, graphItems ) {
    if( !layout || !graphItems || !exports.sortedLayoutActive( layout ) ) {
        return;
    }

    _.each( graphItems.nodes, function( item ) {
        if( layout.containsNode( item ) ) {
            // only remove nodes, related edges, ports will be removed automatically
            layout.removeNode( item );
        }
    } );
};

/**
 * Remove objects from layout.
 *
 * @param {Object} graphControl graph control object
 * @param {Array} graphItems the graphItems
 */
var removeObjectsFromIncUpdateLayout = function( graphControl, graphItems ) {
    var layout = graphControl.layout;
    var groupGraph = graphControl.groupGraph;
    if( !layout || !graphItems ) {
        return;
    }
    _.each( graphItems.nodes, function( item ) {
        if( layout.containsNode( item ) ) {
            var keepChild = false;
            if( groupGraph.isGroup( item ) && groupGraph.isExpanded( item ) ) {
                keepChild = true;
            }
            layout.removeNode( item, keepChild );
        }
    } );

    _.each( graphItems.edges, function( item ) {
        if( layout.containsEdge( item ) ) {
            layout.removeEdge( item );
        }
    } );

    _.each( graphItems.ports, function( item ) {
        if( layout.containsPort( item ) ) {
            layout.removePort( item );
        }
    } );
};

/**
 * Refine add data to ensure the node set contains all related graph items, by pulling all edges/ports' related
 * nodes to node set
 *
 * if missing this step, DF will throw exception.
 *
 * @param {Object} layout the layout
 * @param {Array} graphItems the graphItems
 */
var refineAddedDataForIncUpdateLayout = function( layout, graphItems ) {
    var results = graphItems.nodes ? graphItems.nodes : [];
    _.each( graphItems.edges, function( edge ) {
        results = results.concat( edge.getSourceNode(), edge.getTargetNode() );
    } );
    _.each( graphItems.ports, function( port ) {
        results = results.concat( port.getOwner() );
    } );

    results = _.uniq( results );
    var contained = _.filter( results, layout.containsNode );
    var nodes = _.difference( results, contained );

    graphItems.nodes = nodes;
};

/**
 * Add objects to layout, available for incUpdateLayout
 *
 * @param {Object} layout the layout
 * @param {Array} graphItems the graphItems
 */
var addObjectsToIncUpdateLayout = function( layout, graphItems ) {
    if( !layout || !graphItems ) {
        return;
    }

    refineAddedDataForIncUpdateLayout( layout, graphItems );
    _.each( graphItems.nodes, function( item ) {
        if( !layout.containsNode( item ) ) {
            // as a fresh node, fist time added to layout, layout should caculate position for this node
            // otherwise layout will use the existing position
            var usePositon = true;
            if( item.fresh ) {
                usePositon = false;
                item.fresh = false;
            }
            layout.addNode( item, usePositon );
        }
    } );
    //AW-65381 - GCTest: Filter and unfilter edge get routing changed
    //in the case drag to resize an edge and then filter/unfilter,
    //if application wants to keep the source/target port position after dragging,
    //here they need to addPort before addEdge.
    _.each( graphItems.ports, function( item ) {
        if( !layout.containsPort( item ) ) {
            // AW-68557 Edge re-routing after filter/unfilter
            // only handle port for the item with symbol, reference design from GWT version: RelationsViewModel.java: showRelations
            // symbol ports always use position
            layout.addPort( item, true );
        }
    } );
    _.each( graphItems.edges, function( item ) {
        if( !layout.containsEdge( item ) ) {
            layout.addEdge( item );
        }
    } );
};

export let resetLayoutData = function( layout ) {
    if( layout.type === graphConstants.DFLayoutTypes.SortedLayout ) {
        layout.itemsToBeRemoved = {
            nodes: [],
            edges: []
        };
        layout.itemsToBeFilterOff = {
            nodes: [],
            edges: []
        };
        layout.itemsToBeFilterOn = {
            nodes: [],
            edges: []
        };
    } else if( layout.type === graphConstants.DFLayoutTypes.IncUpdateLayout ) {
        layout.itemsToBeRemoved = {
            nodes: [],
            edges: [],
            ports: []
        };
        layout.itemsToBeAdded = {
            nodes: [],
            edges: [],
            ports: []
        };
        layout.nodesToBeChangeParent = [];
        layout.groupsToBeCollapsed = [];
        layout.groupsToBeExpanded = [];
        layout.nodesToBeFit = [];
    }
};

var concatMerge = function( destObj, sourceObj ) {
    if( !sourceObj ) {
        return;
    }

    //handle aray case
    if( _.isArray( destObj ) ) {
        _.each( sourceObj, function( item ) {
            if( destObj.indexOf( item ) < 0 ) {
                destObj.push( item );
            }
        } );
    } else {
        //handle object case
        _.mergeWith( destObj, sourceObj, function customizer( objValue, srcValue ) {
            if( _.isArray( objValue ) ) {
                _.each( srcValue, function( item ) {
                    if( objValue.indexOf( item ) < 0 ) {
                        objValue.push( item );
                    }
                } );
                return objValue;
            }
            return undefined;
        } );
    }
};

var updateToIncUpdateLayout = function( layout, eventType, eventData ) {
    if( !layout || !eventType || !eventData ) {
        return;
    }

    if( eventType === 'itemsRemoved' ) {
        concatMerge( layout.itemsToBeRemoved, eventData );
    } else if( eventType === 'visibilityChanged' ) {
        const visible = eventData.visible;
        // application should define their own behavior
        // for testharness, we defined the behavior as:
        // when graph items change visibility, they will be removed from or added to layout
        let destData = visible ? layout.itemsToBeAdded : layout.itemsToBeRemoved;
        // AW-68557 Edge re-routing after filter/unfilter
        // only handle port for the item with symbol, reference design from GWT version: RelationsViewModel.java: showRelations
        eventData.ports = _.filter( [].concat( eventData.ports ), function( item ) {
            return item.hasSymbol();
        } );
        concatMerge( destData, eventData );
    } else if( eventType === 'nodeCreated' ) {
        const data = {
            nodes: [ eventData ]
        };
        concatMerge( layout.itemsToBeAdded, data );
    } else if( eventType === 'portCreated' ) {
        const data = {
            ports: [ eventData ]
        };
        concatMerge( layout.itemsToBeAdded, data );
    } else if( eventType === 'edgeCreated' ) {
        const data = {
            edges: [ eventData ]
        };
        concatMerge( layout.itemsToBeAdded, data );
    } else if( eventType === 'changeParent' ) {
        concatMerge( layout.nodesToBeChangeParent, [].concat( eventData ) );
    } else if( eventType === 'groupMembersAdded' ) {
        const members = eventData.members;
        concatMerge( layout.nodesToBeChangeParent, members );
    } else if( eventType === 'groupMembersRemoved' ) {
        const group = eventData.group;
        const members = eventData.members;
        concatMerge( layout.nodesToBeChangeParent, members );
        concatMerge( layout.nodesToBeFit, [].concat( group ) );
    } else if( eventType === 'groupStateChanged' ) {
        const group = eventData.group;
        const expanded = eventData.expanded;
        let destData = expanded ? layout.groupsToBeExpanded : layout.groupsToBeCollapsed;
        concatMerge( destData, [].concat( group ) );
    } else if( eventType === 'nodesToBeFit' ) {
        concatMerge( layout.nodesToBeFit, [].concat( eventData ) );
    } else {
        //TODO: add more eventTypes
    }
};

var updateToSortedLayout = function( layout, eventType, eventData ) {
    if( !layout || !eventType || !eventData ) {
        return;
    }

    if( eventType === 'itemsRemoved' ) {
        concatMerge( layout.itemsToBeRemoved, eventData );
    } else if( eventType === 'visibilityChanged' ) {
        var visible = eventData.visible;
        var destData = visible ? layout.itemsToBeFilterOff : layout.itemsToBeFilterOn;
        concatMerge( destData, eventData );
    } else {
        //TODO: add more eventTypes
    }
};

export let updateToLayout = function( layout, eventType, eventData ) {
    if( !layout || !eventType || !eventData ) {
        return;
    }

    if( exports.incUpdateActive( layout ) ) {
        updateToIncUpdateLayout( layout, eventType, eventData );
    } else if( exports.sortedLayoutActive( layout ) ) {
        updateToSortedLayout( layout, eventType, eventData );
    } else {
        //TODO:
    }
};

//this is a sample compare functions, only compare object_name for test purpose.
// application should define their own compare criterions
var compareNodes = function( node1, node2 ) {
    var result = 0;
    if( node1 && node2 && node1.model && node2.model ) {
        var prop1 = node1.model.nodeObject.name;
        var prop2 = node2.model.nodeObject.name;

        // compare name
        result = prop1.localeCompare( prop2 );
    }
    return result;
};

var sortLayoutExpand = function( layout, direction, newAddedEdges, seedNodes ) {
    if( !layout || layout.type !== graphConstants.DFLayoutTypes.SortedLayout ) {
        return;
    }

    //active sorted layout the first time
    if( !layout.isActive() ) {
        var rootNode = getRootNode( seedNodes );
        if( rootNode ) {
            layout.registerCompareNodesCallback( compareNodes );
            layout.activate( rootNode );
        }
    }

    if( !newAddedEdges || newAddedEdges.length === 0 ) {
        return;
    }
};

var incUpdateLayoutExpand = function( layout, direction, seedNodes, newAddedNodes, newAddedEdges ) {
    if( !layout || layout.type !== graphConstants.DFLayoutTypes.IncUpdateLayout ) {
        return;
    }

    /** Apply layout all the time as we currently don't support group nodes */
    // if( !layout.isActive() ) {
    //apply global layout and active incremental update
    layout.applyLayout();
    layout.activate();
    return;
    // }

    /**
     * Commenting out for now as this is complicating drop in existing action flow layout
     * DO NOT REMOVE THIS, need to re-visit later when we implement expanding group nodes
     * in action builder
     */
    /**
    var distributeDirection = graphConstants.DistributeDirections.UseLayoutDirection;

    // expand down / up / all case
    if( direction === graphConstants.ExpandDirection.FORWARD ||
        direction === graphConstants.ExpandDirection.BACKWARD ||
        direction === graphConstants.ExpandDirection.ALL ) {
        layout.applyUpdate( function() {
            _.each( seedNodes, function( seedNode ) {
                newAddedNodes = _.filter( newAddedNodes, function( item ) {
                    if( !layout.containsNode( item ) ) {
                        // if item was newly created, but current was filtered
                        // don't add to layout, but need to mark it as a fresh node,
                        // so in future layout could caculate position for this node.
                        if( item.isFiltered() ) {
                            item.fresh = true;
                            return false;
                        }

                        return true;
                    }
                } );
                newAddedEdges = _.filter( newAddedEdges, function( item ) {
                    if( !layout.containsEdge( item ) ) {
                        // if item was newly created, but current was filtered
                        // don't add to layout
                        if( item.isFiltered() ) {
                            return false;
                        }

                        //check each end point for the visible edge
                        _.each( [ item.getSourceNode(), item.getTargetNode() ], function( node ) {
                            if( !layout.containsNode( node ) && _.indexOf( newAddedNodes, node ) < 0 ) {
                                // ensure it's end point is added first
                                layout.addNode( node, true );
                            }
                        } );

                        return true;
                    }
                } );
                if( newAddedNodes.length === 0 && newAddedEdges.length === 0 ) {
                    return false;
                }

                layout.distributeNewNodes( seedNode, newAddedNodes, newAddedEdges, distributeDirection );
            } );
        } );
    }
    */
};

var applyColumnLayout = function( graphModel, rootNode ) {
    var layout = graphModel.graphControl.layout;
    if( !layout || layout.type !== graphConstants.DFLayoutTypes.ColumnLayout ) {
        return;
    }

    //deactivate the column layout before next activation
    if( layout.isActive() ) {
        layout.deactivate();
    }

    var graph = graphModel.graphControl.graph;
    var edges = graph.getEdges();
    var columnDataList = [];
    var column1 = [];
    var column2 = [];
    var column3 = [];
    _.forEach( edges, function( edge ) {
        var sourceNode = edge.getSourceNode();
        var targetNode = edge.getTargetNode();
        if( _.indexOf( column1, sourceNode ) < 0 && _.indexOf( column2, sourceNode ) < 0 &&
            _.indexOf( column3, sourceNode ) < 0 ) {
            if( rootNode === sourceNode ) {
                column2.push( sourceNode );
            } else {
                column1.push( sourceNode );
            }
        }

        if( _.indexOf( column1, targetNode ) < 0 && _.indexOf( column2, targetNode ) < 0 &&
            _.indexOf( column3, targetNode ) < 0 ) {
            if( rootNode === targetNode ) {
                column2.push( targetNode );
            } else {
                column3.push( targetNode );
            }
        }
    } );

    columnDataList.push( column1 );
    columnDataList.push( column2 );
    columnDataList.push( column3 );
    var columnDataArray = [];
    _.forEach( columnDataList, function( columnData ) {
        var data = {};
        data.nodesInColumn = columnData;
        data.nodeAlignmentInColumn = 'center';
        data.minNodeDistanceInColumn = 30;
        data.minColumnDistance = 50;
        columnDataArray.push( data );
    } );
    layout.setLayoutDirection( graphConstants.LayoutDirections.LeftToRight );
    layout.activate( columnDataArray, edges );
};

var getRootNode = function( seedNodes ) {
    return _.find( seedNodes, function( node ) {
        return node.isRoot();
    } );
};

var applySortedLayoutUpdate = function( layout ) {
    var check = [].concat( [ layout.itemsToBeRemoved, layout.itemsToBeFilterOn, layout.itemsToBeFilterOff ] );
    if( !checkNeedToUpdate( check ) ) {
        return;
    }

    layout.applyUpdate( function() {
        removeObjectsFromSortedLayout( layout, layout.itemsToBeRemoved );

        var itemsToBeFilterOn = layout.itemsToBeFilterOn;
        if( itemsToBeFilterOn.nodes.length > 0 || itemsToBeFilterOn.edges.length > 0 ) {
            layout.filterOn( itemsToBeFilterOn.nodes, itemsToBeFilterOn.edges );
        }

        var itemsToBeFilterOff = layout.itemsToBeFilterOff;
        if( itemsToBeFilterOff.nodes.length > 0 || itemsToBeFilterOff.edges.length > 0 ) {
            layout.filterOff( itemsToBeFilterOff.nodes, itemsToBeFilterOff.edges );
        }
    } );
};

var checkNeedToUpdate = function( objects ) {
    var result = _.find( [].concat( objects ), function( obj ) {
        if( _.isArray( obj ) ) {
            return obj.length > 0;
        }

        var validObj = null;
        _.each( obj, function( value, key ) {
            if( _.isArray( value ) && value.length > 0 ) {
                // break loop
                validObj = obj;
                return false;
            }
        } );
        if( validObj ) {
            return true;
        }
        return false;
    } );

    return result !== undefined;
};

var applyIncUpdateLayoutUpdate = function( graphControl ) {
    var layout = graphControl.layout;
    if( !exports.incUpdateActive( layout ) ) {
        return;
    }

    var check = [].concat( [ layout.itemsToBeAdded, layout.itemsToBeRemoved, layout.nodesToBeChangeParent, layout.groupsToBeCollapsed, layout.groupsToBeExpanded, layout.nodesToBeFit ] );
    if( !checkNeedToUpdate( check ) ) {
        return;
    }

    layout.applyUpdate( function() {
        if( checkNeedToUpdate( layout.itemsToBeAdded ) ) {
            layout.itemsToBeAdded.nodes = _.difference( layout.itemsToBeAdded.nodes, layout.itemsToBeRemoved.nodes );
            layout.itemsToBeAdded.edges = _.difference( layout.itemsToBeAdded.edges, layout.itemsToBeRemoved.edges );
            layout.itemsToBeAdded.ports = _.difference( layout.itemsToBeAdded.ports, layout.itemsToBeRemoved.ports );
            addObjectsToIncUpdateLayout( layout, layout.itemsToBeAdded );
        }

        if( layout.nodesToBeChangeParent.length > 0 ) {
            var validData = _.filter( layout.nodesToBeChangeParent, layout.containsNode );
            layout.changeParent( validData );
        }

        removeObjectsFromIncUpdateLayout( graphControl, layout.itemsToBeRemoved );

        layout.groupsToBeCollapsed = _.difference( layout.groupsToBeCollapsed, layout.itemsToBeRemoved.nodes );
        _.each( _.filter( layout.groupsToBeCollapsed, layout.containsNode ), function( item ) {
            layout.collapseGroupNode( item );
        } );

        layout.groupsToBeExpanded = _.difference( layout.groupsToBeExpanded, layout.itemsToBeRemoved.nodes );
        _.each( _.filter( layout.groupsToBeExpanded, layout.containsNode ), function( item ) {
            layout.expandGroupNode( item );
        } );

        layout.nodesToBeFit = _.difference( layout.nodesToBeFit, layout.itemsToBeRemoved.nodes );
        _.each( _.filter( layout.nodesToBeFit, layout.containsNode ), function( item ) {
            layout.fitGroupNode( item );
            layout.fitAncestorNodes( item );
        } );
    } );
};

/**
 * apply bunch layout update when graph has changes
 *
 * @param {graphControl} graphControl the graphControl instance
 */
export let applyLayoutUpdate = function( graphControl ) {
    var layout = graphControl.layout;
    if( !layout ) {
        return;
    }
    if( layout.type === graphConstants.DFLayoutTypes.SortedLayout ) {
        applySortedLayoutUpdate( layout );
    } else if( layout.type === graphConstants.DFLayoutTypes.IncUpdateLayout ) {
        applyIncUpdateLayoutUpdate( graphControl );
    }

    exports.resetLayoutData( layout );
};

/**
 * apply layout expand for the whole graph when it was first draw
 *
 * @param {Object} graphModel the graphModel
 * @param {Object} context the context, format as \{seedIDs: \[seedIDs\], direction: direction \}
 * @param {Array} newAddedNodes newly added nodes
 * @param {Array} newAddedEdges newly added edges
 */
export let applyLayoutExpand = function( graphModel, context, newAddedNodes, newAddedEdges ) {
    var layout = graphModel.graphControl.layout;

    //don't need apply layout if no layout installed.
    if( !layout ) {
        return;
    }

    //get seed node and direction
    var seedIDs = context.seedIDs;
    var direction = context.direction;

    var seedNodes = _.map( seedIDs, function( id ) {
        return graphModel.dataModel.nodeModels[ id ].graphItem;
    } );

    if( layout.type === graphConstants.DFLayoutTypes.SortedLayout ) {
        sortLayoutExpand( layout, direction, newAddedEdges, seedNodes );
    } else if( layout.type === graphConstants.DFLayoutTypes.ColumnLayout ) {
        var rootNode = getRootNode( seedNodes );
        if( rootNode ) {
            applyColumnLayout( graphModel, rootNode );
        }
    } else if( layout.type === graphConstants.DFLayoutTypes.IncUpdateLayout ) {
        incUpdateLayoutExpand( layout, direction, seedNodes, newAddedNodes, newAddedEdges );
    }

    exports.applyLayoutUpdate( graphModel.graphControl );
    actionBuilderUtils.relocateAllPorts( graphModel );
};

export let setExpanded = function( graphControl, node, isExpand ) {
    var layout = graphControl.layout;
    if( !exports.incUpdateActive( layout ) ) {
        return;
    }

    var destData = isExpand ? layout.groupsToBeExpanded : layout.groupsToBeCollapsed;
    concatMerge( destData, [].concat( node ) );
};

export let setParent = function( graphControl, group, members ) {
    var layout = graphControl.layout;
    if( !exports.incUpdateActive( layout ) ) {
        return;
    }

    concatMerge( layout.nodesToBeChangeParent, members );
    if( group ) {
        concatMerge( layout.nodesToBeFit, [].concat( group ) );
    }
};

exports = {
    incUpdateActive,
    sortedLayoutActive,
    columnLayoutActive,
    layoutActive,
    resetLayoutData,
    updateToLayout,
    applyLayoutUpdate,
    applyLayoutExpand,
    setExpanded,
    setParent
};
export default exports;

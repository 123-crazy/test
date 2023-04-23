// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */
/**
 * This module defines layout related functions
 *
 * @module js/qfm0FmeaGraphLayout
 */
import app from 'app';
import _ from 'lodash';
import graphConstants from 'js/graphConstants';
import AwPromiseService from 'js/awPromiseService';
import layoutSvc from 'js/graphLayoutService';

'use strict';

var exports = {};

export let incUpdateActive = function( layout ) {
    return layout && layout.type === 'IncUpdateLayout' && layout.isActive();
};

/**
 * Remove objects from layout.
 *
 */
export let removeObjectsFromIncUpdateLayout = function( graphControl, graphItems ) {
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
};

/**
 * Refine add data to ensure the node set contains all related graph items, by pulling all edges/ports' related
 * nodes to node set
 *
 * if missing this step, DF will throw exception.
 *
 * @param layout the layout
 * @param graphItems the graphItems
 */
var refineAddedDataForIncUpdateLayout = function( layout, graphItems ) {
    var results = graphItems.nodes ? graphItems.nodes : [];
    _.each( graphItems.edges, function( edge ) {
        results = results.concat( edge.getSourceNode(), edge.getTargetNode() );
    } );

    results = _.uniq( results );
    var contained = _.filter( results, layout.containsNode );
    var nodes = _.difference( results, contained );

    graphItems.nodes = nodes;
};

/**
 * Add objects to layout.
 *
 * available for incUpdateLayout
 *
 */
export let addObjectsToIncUpdateLayout = function( layout, graphItems ) {
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
    _.each( graphItems.edges, function( item ) {
        if( !layout.containsEdge( item ) ) {
            layout.addEdge( item );
        }
    } );
};

var resetLayoutData = function( layout ) {
    if( layout.type === graphConstants.DFLayoutTypes.IncUpdateLayout ) {
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
        } );
    }
};

var updateToIncUpdateLayout = function( layout, eventType, eventData ) {
    if( eventType === 'itemsRemoved' ) {
        concatMerge( layout.itemsToBeRemoved, eventData );
    } else if( eventType === 'visibilityChanged' ) {
        var visible = eventData.visible;
        // application should define their own behavior
        // for testharness, we defined the behavior as:
        // when graph items change visibility, they will be removed from or added to layout
        var destData = visible ? layout.itemsToBeAdded : layout.itemsToBeRemoved;

        concatMerge( destData, eventData );
    } else if( eventType === 'nodeCreated' ) {
        var data = {
            nodes: [ eventData ]
        };
        concatMerge( layout.itemsToBeAdded, data );
    }  else if( eventType === 'edgeCreated' ) {
        var data = {
            edges: [ eventData ]
        };
        concatMerge( layout.itemsToBeAdded, data );
    } else if( eventType === 'changeParent' ) {
        concatMerge( layout.nodesToBeChangeParent, [].concat( eventData ) );
    } else if( eventType === 'nodesToBeFit' ) {
        concatMerge( layout.nodesToBeFit, [].concat( eventData ) );
    }
};


export let updateToLayout = function( layout, eventType, eventData ) {
    if( !layout || !eventType || !eventData ) {
        return;
    }

    if( exports.incUpdateActive( layout ) ) {
        updateToIncUpdateLayout( layout, eventType, eventData );
    }
};


var incUpdateLayoutExpand = function( layout, direction, seedNodes, newAddedNodes, newAddedEdges ) {
    if( !layout || layout.type !== graphConstants.DFLayoutTypes.IncUpdateLayout ) {
        return;
    }

    if( !layout.isActive() ) {
        //apply global layout and active incremental update
        layout.applyLayout();
        layout.activate();
        return;
    }

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
            exports.addObjectsToIncUpdateLayout( layout, layout.itemsToBeAdded );
        }

        if( layout.nodesToBeChangeParent.length > 0 ) {
            var validData = _.filter( layout.nodesToBeChangeParent, layout.containsNode );
            layout.changeParent( validData );
        }

        exports.removeObjectsFromIncUpdateLayout( graphControl, layout.itemsToBeRemoved );

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
    if( layout.type === graphConstants.DFLayoutTypes.IncUpdateLayout ) {
        applyIncUpdateLayoutUpdate( graphControl );
    }

    resetLayoutData( layout );
};

/**
 * apply layout expand for the whole graph when it was first draw
 *
 * @param graphModel the graphModel
 * @param context the context, format as \{seedIDs: \[seedIDs\], direction: direction \}
 * @param newAddedNodes
 * @param newAddedEdges
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
    if( newAddedNodes.length > 0 && newAddedNodes[0].appData.category === 'PFC_SystemElement' ) {
        direction = 'forward';
        seedIDs = [];
        seedIDs.push( newAddedEdges[0].edgeData.leftId );
        seedIDs.push( newAddedEdges[1].edgeData.leftId );
    }

    var seedNodes = _.map( seedIDs, function( id ) {
        return graphModel.nodeMap[id];
    } );

    //in case of Process Flow Chart, if the seed id is not found in nodeMap, handle 'undefined' in nodeMap.
    seedNodes = seedNodes.filter( ( seedNode ) => seedNode !== undefined );

    incUpdateLayoutExpand( layout, direction, seedNodes, newAddedNodes, newAddedEdges );

    exports.applyLayoutUpdate( graphModel.graphControl );
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


export default exports = {
    incUpdateActive,
    addObjectsToIncUpdateLayout,
    applyLayoutUpdate,
    applyLayoutExpand,
    setExpanded,
    setParent,
    removeObjectsFromIncUpdateLayout,
    updateToLayout
};

// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/CAW0CAPARelationDrawService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import layoutSvc from 'js/graphLayoutService';
import rbSvc from 'js/Rv1RelationBrowserService';
import node from 'js/CAW0CAPADrawNode';
import edge from 'js/Rv1RelationBrowserDrawEdge';
import _ from 'lodash';
import performanceUtils from 'js/performanceUtils';
import logger from 'js/logger';
import graphConstants from 'js/graphConstants';
import treeHelper from 'js/Rv1RelationBrowserTreeService';

var exports = {};

var layoutActive = function( layout ) {
    return layout && layout !== undefined && layout.isActive();
};

var getRootNode = function( seedNodes ) {
    return _.find( seedNodes, function( node ) {
        if( node ) {
            return node.isRoot();
        }
        return false;
    } );
};

/**
 * Compares two nodes based on their awp0CellProperties and returns the
 * lexicographically smaller of the two.
 *
 * @param node1 the first node object.
 * @param node2 the second node object.
 */
var compareNodes = function( node1, node2 ) {
    if( node1 && node2 && node1.appData && node2.appData ) {
        var propDBValues1 = node1.appData.nodeObject.props.awp0CellProperties.dbValues;
        var propDBValues2 = node2.appData.nodeObject.props.awp0CellProperties.dbValues;

        var propListLen = Math.min( Object.keys( propDBValues1 ).length, Object.keys( propDBValues2 ).length );

        for( var i = 0; i < propListLen; i++ ) {
            var prop1 = propDBValues1[ i ].substr( propDBValues1[ i ].indexOf( '\:' ) + 1 );
            var prop2 = propDBValues2[ i ].substr( propDBValues2[ i ].indexOf( '\:' ) + 1 );

            var temp = prop1.localeCompare( prop2, { numeric: true } );

            if( temp !== 0 ) {
                return temp;
            }
        }

        // Will list the object with less properties as smaller.
        return Object.keys( propDBValues1 ).length - Object.keys( propDBValues2 ).length;
    }

    return 0;
};

var sortLayoutExpand = function( graphModel, expandDirection, seedNodes, newAddedNodes, edges, isInitial ) {
    // If there is no layout or the current layout doesn't match what we want, we set a new one.
    var layoutPromise = AwPromiseService.instance.resolve();
    if( !graphModel.graphControl.layout || graphModel.graphControl.layout.type !== graphConstants.DFLayoutTypes.SortedLayout ) {
        layoutPromise = layoutSvc.createLayout( graphModel.graphControl, graphConstants.DFLayoutTypes.SortedLayout );
        graphModel.config.layout.layoutMode = graphConstants.DFLayoutTypes.SortedLayout;
    }

    // active sorted layout the first time
    layoutPromise.then( function() {
        if( !layoutActive( graphModel.graphControl.layout ) ) {
            var rootNode = getRootNode( seedNodes );
            if( rootNode ) {
                graphModel.graphControl.layout.registerCompareNodesCallback( compareNodes );
                graphModel.graphControl.layout.activate( rootNode );
            }
        }

        if( !edges || edges.length === 0 ) {
            return;
        }

        // expand new items
        _.each( seedNodes, function( node ) {
            var directions = [ expandDirection ];
            if( expandDirection === graphConstants.ExpandDirection.ALL ) {
                directions = [ graphConstants.ExpandDirection.FORWARD, graphConstants.ExpandDirection.BACKWARD ];
            }

            _.each( directions, function( direction ) {
                try {
                    var nodeTree = treeHelper.buildNodeTree( edges, direction, node );
                    if( nodeTree.hasChild() ) {
                        graphModel.graphControl.layout.expand( nodeTree, nodeTree.ownEdges, direction );
                    }
                } catch ( e ) {
                    logger.error( e );
                }
            } );
        } );

        // After expanding the sorted layout the graph will need re-centered
        if( isInitial ) {
            graphModel.graphControl.fitGraph();
        }
    } );
};

var incUpdateLayoutExpand = function( graphModel, expandDirection, seedNodes, newAddedNodes, newAddedEdges ) {
    // If there is no layout or the current layout doesn't match what we want, we set a new one.
    var layoutPromise = AwPromiseService.instance.resolve();
    if( !graphModel.graphControl.layout || graphModel.graphControl.layout.type !== graphConstants.DFLayoutTypes.IncUpdateLayout ) {
        layoutPromise = layoutSvc.createLayout( graphModel.graphControl, graphConstants.DFLayoutTypes.IncUpdateLayout );
    }

    layoutPromise.then( function() {
        var layout = graphModel.graphControl.layout;

        if( !layout.isActive() ) {
            //apply global layout and active incremental update
            layout.applyLayout();
            layout.activate();
            return;
        }

        if( !( newAddedNodes && newAddedNodes.length > 0 ) && !( newAddedEdges && newAddedEdges.length > 0 ) ) {
            return;
        }

        var distributeDirection = graphConstants.DistributeDirections.UseLayoutDirection;

        // expand down / up / all case
        if( expandDirection === graphConstants.ExpandDirection.FORWARD ||
            expandDirection === graphConstants.ExpandDirection.BACKWARD ||
            expandDirection === graphConstants.ExpandDirection.ALL ) {
            _.each( seedNodes, function( seedNode ) {
                layout.distributeNewNodes( seedNode, newAddedNodes, newAddedEdges, distributeDirection );
            } );
        }
    } );
};

var postApplyGraphLayout = function( graphModel, newAddedNodes, newAddedEdges, isInitial, performanceTimer ) {
    if( isInitial ) {
        _.defer( function() {
            graphModel.graphControl.fitGraph();
        } );
    }

    // apply graph filters and notify item added event
    graphModel.graphControl.graph.updateOnItemsAdded( newAddedNodes.concat( newAddedEdges ) );

    performanceTimer.endAndLogTimer( 'Graph Draw Data', 'drawGraph' );
};

export let applyGraphLayout = function( ctx, data, graphModel, newAddedNodes, edges, isInitial, performanceTimer, sortedLayoutPreferenceValue ) {

    graphModel.graphControl.disableCommand( 'PasteCommand' );

    // Default to IncUpdateLayout.
    var layout = graphConstants.DFLayoutTypes.IncUpdateLayout;

    // Check if the sorted layout preference is set, if so, update the layout.
    layout = graphConstants.DFLayoutTypes.SortedLayout;

    // Get seed node and direction
    var seedIDs = [ ctx.selected.uid ];
    var expandDirection = graphConstants.ExpandDirection.FORWARD;

    // Check for underlying object
    if( typeof ctx.selected.props.awb0UnderlyingObject !== 'undefined' ) {
        seedIDs = ctx.selected.props.awb0UnderlyingObject.dbValues;
    }

    if( ctx.graph.commandContextItem ) {
        seedIDs.push( ctx.graph.commandContextItem.appData.id );
    }

    if( data.seedIDs ) {
        seedIDs = data.seedIDs;
    }

    if( data.expandDirection ) {
        expandDirection = data.expandDirection;
    }

    var seedNodes = _.map( seedIDs, function( id ) {
        return graphModel.nodeMap[ id ];
    } );

    if( layout === graphConstants.DFLayoutTypes.SortedLayout ) {
        // We only want to apply sorted layout if the license check
        // passes successfully. To avoid a race condition in which
        // either drawGraph() or applyGraphLayout() are called before
        // the SOA has returned, we add a dependency on the promise to
        // complete.
        rbSvc.licenseCheck()
            .then(
                function() {
                    var allEdges = edges.existingEdges.concat( edges.addedEdges );
                    sortLayoutExpand( graphModel, expandDirection, seedNodes, newAddedNodes, allEdges, isInitial );
                    postApplyGraphLayout( graphModel, newAddedNodes, edges.addedEdges, isInitial, performanceTimer );
                },
                // else !
                function() {
                    incUpdateLayoutExpand( graphModel, expandDirection, seedNodes, newAddedNodes, edges.addedEdges, isInitial );
                    postApplyGraphLayout( graphModel, newAddedNodes, edges.addedEdges, isInitial, performanceTimer );
                }
            );
    } else if( layout === graphConstants.DFLayoutTypes.IncUpdateLayout ) {
        incUpdateLayoutExpand( graphModel, expandDirection, seedNodes, newAddedNodes, edges.addedEdges );
        postApplyGraphLayout( graphModel, newAddedNodes, edges.addedEdges, isInitial, performanceTimer );
    }
};

/**
 * Initialize the category API on graph model. The APIs will be used to calculate legend count.
 *
 * @param graphModel the graph model object
 */
var initGraphCategoryApi = function( graphModel ) {
    graphModel.categoryApi = {
        getNodeCategory: function( node ) {
            if( node && node.appData ) {
                return node.appData.category;
            }

            return null;
        },
        getEdgeCategory: function( edge ) {
            if( edge ) {
                return edge.category;
            }
            return null;
        },
        getGroupRelationCategory: function() {
            return 'Structure';
        },
        getPortCategory: function( port ) {
            if( port ) {
                return port.category;
            }
            return null;
        }
    };
};

export let drawGraph = function( ctx, data, sortedLayoutPreferenceValue, concentratedPreferenceValue ) {
    var performanceTimer = performanceUtils.createTimer();

    var graphModel = ctx.graph.graphModel;
    var graphData = ctx.graph.graphModel.graphData;

    var isInitial = false;
    if( !graphModel.nodeMap ) {
        graphModel.nodeMap = {};
        isInitial = true;
    }

    var activeLegendView = null;
    if( ctx.graph.legendState ) {
        activeLegendView = ctx.graph.legendState.activeView;
    }

    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;

    var addedNodes = [];
    var edges = [];

    var bIsConcentrated = false;

    // Check if the sorted layout preference is set, if so, update the layout.
    if( concentratedPreferenceValue && concentratedPreferenceValue[ 0 ] === 'true' ) {
        bIsConcentrated = true;
    }

    // process the nodes and edges
    addedNodes = node.processNodeData( graphModel, graphData, activeLegendView );
    edges = edge.processEdgeData( graphModel, graphData, activeLegendView, bIsConcentrated );

    if( graphModel.isShowLabel === false ) {
        graph.showLabels( graphModel.isShowLabel );
    }

    if( !graphModel.categoryApi ) {
        initGraphCategoryApi( graphModel );
    }

    // This function is potentially asynchronous, anything you wish to execute after this function
    // should go in postApplyGraphLayout().
    exports.applyGraphLayout( ctx, data, graphModel, addedNodes, edges, isInitial, performanceTimer, sortedLayoutPreferenceValue );
};

/**
 * Sets the node height and group node header height based on the wrapped text height
 */
export let setNodeHeightOnWrappedHeightChanged = function( graphModel, nodes ) {
    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;
    var layout = graphControl.layout;

    var sizeChangedNodes = [];

    _.forEach( nodes, function( nodeTextInfo ) {
        var currentWrappedHeight = nodeTextInfo.currentWrappedHeight;
        var node = nodeTextInfo.node;

        if( currentWrappedHeight ) {
            var currentHeight = node.getHeight();
            var padding = node.style.textPadding;
            var layoutHeight = currentWrappedHeight + padding;
            var newHeight = layoutHeight;

            if( newHeight > currentHeight ) {
                graph.update( function() {
                    node.setHeight( newHeight );
                } );
                sizeChangedNodes.push( node );
            }
        }
    } );

    if( layoutActive( layout ) && sizeChangedNodes.length > 0 ) {
        try {
            layout.applyUpdate( function() {
                _.forEach( sizeChangedNodes, function( sizeChangedNode ) {
                    layout.resizeNode( sizeChangedNode, true );
                } );
            } );
        } catch ( e ) {
            logger.error( e );
        }
    }
};

/**
 * CAW0CAPARelationDrawService factory
 */

export default exports = {
    applyGraphLayout,
    drawGraph,
    setNodeHeightOnWrappedHeightChanged
};
app.factory( 'CAW0CAPARelationDrawService', () => exports );

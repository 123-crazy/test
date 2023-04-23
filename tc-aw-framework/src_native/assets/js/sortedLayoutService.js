// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module provides graph layout support
 *
 * @module js/sortedLayoutService
 */
import app from 'app';
import _ from 'lodash';
import logSvc from 'js/logger';
import baseGraphLayout from 'js/baseGraphLayout';
import graphConstants from 'js/graphConstants';
import '@diagramming/sortedlayout';
import AwPromiseService from 'js/awPromiseService';

/**
 * Define public API
 */
var exports = {};

/**
 * Define the sorted layout
 *
 * @class
 * @param diagramView the diagram object
 * @param hostInterface the layout interface for host application
 */
export let SortedLayout = function( diagramView, hostInterface ) {
    if( !hostInterface ) {
        throw 'The layout host interface has not been initialized.';
    }

    var sortedLayouter = new window.SDF.Layout.SortedLayout( hostInterface );
    baseGraphLayout.BaseLayout.call( this, sortedLayouter, graphConstants.DFLayoutTypes.SortedLayout );

    var SDF = window.SDF;
    this._hostInterface = hostInterface;

    /**
     * Check if the sorted layout is activated
     *
     * @return true if sorted layout is activated, false otherwise
     */
    this.isActive = function() {
        return sortedLayouter.isActive();
    };

    /**
     * Activate the sorted layout
     *
     * @param rootNode the root node for sorted layout. Only effective for sorted layout.
     */
    this.activate = function( rootNode ) {
        if( sortedLayouter.isActive() ) {
            return;
        }

        if( rootNode ) {
            sortedLayouter.activateSortedLayout( rootNode );
        }
    };

    /**
     * Deactivate the sorted layout
     *
     */
    this.deactivate = function() {
        sortedLayouter.deactivateSortedLayout();
    };

    /**
     * This API will process the resizing node behavior in the layout.
     *
     * This method processes the layout's behavior when a node in the given array of hostNodes
     * is manually resized, but its origin (top-left corner) has not changed. By setting removeOverlap
     * to True, the behavior will mean that the dominant (largest) size node (boss node, see example below)
     * will control the spacing of the layout for the hostNodes.
     *
     * @param nodes The array of the host nodes that have been resized
     * @param removeOverlap A flag to control if the node overlap is allowed when resizing. True - layout will
     *            adjust and update the maximum size of the cell size of each row/col False/Undefined -Layout do
     *            nothing, and DF will handle this case. Overlapping will happen.
     *
     *
     * @return true if successfully collapsed
     */
    this.resizeNode = function( nodes, removeOverlap ) {
        var ret = false;

        var checknode = true;
        if( nodes && !_.isArray( nodes ) ) {
            nodes = [].concat( nodes );
        }

        _.each( nodes, function( node ) {
            if( !( node instanceof SDF.Models.Node ) ) {
                checknode = false;
                return;
            }
        } );

        var result = _.filter( nodes, this.containsNode );

        if( checknode && result && result.length > 0 ) {
            ret = sortedLayouter.updateOnNodeResized( result, removeOverlap );
        } else {
            logSvc.warn( 'check node failed for input parameter: nodes' );
        }

        return ret;
    };

    /**
     * This method is used when the Application had just moved a node in the Host's data model to a new location and
     * is calling Sorted Layout to reflect it to the end-user. By doing so, Sorted Layout will attempt to find an
     * empty cell to place the node that avoids overlapping with other nodes. If an empty cell is not found, the
     * node will stay in its original cell.
     *
     * @param node the node to be moved
     *
     * @return true if successfully collapsed
     */
    this.moveNode = function( node ) {
        var ret = false;

        if( node instanceof SDF.Models.Node ) {
            ret = sortedLayouter.updateOnNodeMoved( node );
        } else {
            logSvc.warn( 'check node failed for input parameter: node' );
        }

        return ret;
    };

    /**
     * This method registers the callback for comparing two nodes. The input parameter is a function
     * which the Application can create that will compare two nodes based on their own criteria.
     * The return should be a Number (see below).
     *
     * The comparison result. The meaning of the possible values are:
     * 1 : HostNodeA > HostNodeB
     * 0 : HostNodeA = HostNodeB
     * -1 : HostNodeA < HostNodeB
     *
     * @param compareNodeMethod compare node method, signature is function(node1, node2)
     */
    this.registerCompareNodesCallback = function( compareNodeMethod ) {
        sortedLayouter.registerCompareNodesCallback( compareNodeMethod );
    };

    /**
     * Set the determining node overlap percentage when doing single manually move. Parameter x and y are from 0 to
     * 1. Default value in sorted layout is x=0.5 and y=0.5 if you don't set this attribute which means using the
     * node center point to determine the overlap point.
     *
     * @param x the x direction
     * @param y the y direction
     */
    this.setNodeOverlapXYPercentage = function( x, y ) {
        sortedLayouter.setNodeOverlapXYPercentage( x, y );
    };

    /**
     * This method removes the given edge. If the port only has one edge on it, after deleting the
     * edge, the port will also be deleted. Otherwise the port will be remained.
     *
     * @param edge The referencing host edge to remove
     * @return True - Operation was successful False - Operation failed
     */
    this.removeEdge = function( edge ) {
        var ret = false;
        if( edge && edge instanceof SDF.Models.Connection ) {
            ret = sortedLayouter.removeConnection( edge );
        }
        return ret;
    };

    /**
     * This method removes the given node, including its children's from the ChangeState object used by the SortedLayout object.
     * Any connections attached to that given node or its children nodes will be automatically removed. Finally, the relation
     * tree will remove all relations to the hostNode.
     *
     * @param node The referencing host node to remove
     * @return True - Operation was successful False - Operation failed
     */
    this.removeNode = function( node ) {
        var ret = false;
        if( node && node instanceof SDF.Models.Node ) {
            ret = sortedLayouter.removeNode( node );
        }
        return ret;
    };

    /**
     * Hides the given array of Nodes and Connections
     *
     * This method hides the given array of Nodes (nodeList) and Connections (connectionList).
     * The nodeList can be empty if the command is to filter out certain relations.
     * The Sorted Layout will check if there are dangling connections when the nodes
     * in the nodeList are filtered out of the graph and will also check if nodes
     * have become unconnected after the Connections are removed from the graph.
     *
     * @param nodeList The array of Nodes that will be hidden from the graph.
     * @param connectionList The array of Connections associated with the Nodes found in nodeList.
     */
    this.filterOn = function( nodeList, connectionList ) {
        return sortedLayouter.filterOn( nodeList, connectionList );
    };

    /**
     * Shows the previously hidden nodes found in the nodeList array.
     *
     * The nodes in the nodeList are added back based on their outgoing/incoming relations with respect
     * to the existing nodes on the graph.
     * An error will be produced if Nodes in the nodeList array and/or a Connection in the connectionList
     * array already exists on the graph.
     *
     * For performance reasons, the Application should make one call to add all Nodes and Connections back to the graph.
     * There will be a flag, "retainOriginalPosition", that is a member of the SortedLayout object that controls
     * whether the original position of the nodes is available when the SortedLayout.filterOff() API is called.
     *
     *
     * @param nodeList The array of Nodes that will be shown from the graph.
     * @param connectionList The array of Connections associated with the Nodes found in nodeList.
     * @param showOption 1. Search a new location for the Nodes 2. Attempt to return the nodes back to their
     *            original positions. If the position is occupied, add the nodes to the head or tail of the same
     *            layer as the original position . Currently not implemented 3. Add the nodes back to its original
     *            position by pushing the occupying Node towards the head or tail.  Currently not implemented
     */
    this.filterOff = function( nodeList, connectionList, showOption ) {
        // DF only has implemented showOption 1
        // leave this for future expand if DF start to support more options
        var validOption = graphConstants.SortedLayout.ShowOption.SEARCH_NEW_LOCATION;
        if( !showOption || showOption !== validOption ) {
            showOption = validOption;
        }
        return sortedLayouter.filterOff( nodeList, connectionList, showOption );
    };

    /**
     * Apply sorted layout for the updated graph
     *
     * This method re-layouts the whole graph based on the current layout direction as specified in the referencing
     * HostInterface object and can only be called when SortedLayout is active (see SortedLayout.isActive() and
     * SortedLayout.activeSortedLayout() methods for more information). The final locations of the nodes after the
     * layout operation is complete using this API may not be the same as the final results based on manual
     * expansions.
     *
     */
    this.applyLayout = function() {
        sortedLayouter.reLayout();
    };

    /**
     * Expand outgoing / incoming edges and apply layout
     *
     * @param {Object} nodeTree node tree structure has properties: hostNode: the host node. childItems: All the
     *            child items of the host node
     *
     * The first item is the starting node to be expanded.
     * @param {Array} edges All the edges owned by the nodes in the tree structure
     *
     * @param direction the expand direction, value could be
     *            graphConstants.ExpandDirection.FORWARD,graphConstants.ExpandDirection.BACKWARD
     * @return true if successfully
     */
    this.expand = function( nodeTree, edges, direction ) {
        var ret = false;
        if( direction === graphConstants.ExpandDirection.FORWARD ) {
            ret = sortedLayouter.expandOutgoing( nodeTree, edges );
        } else if( direction === graphConstants.ExpandDirection.BACKWARD ) {
            ret = sortedLayouter.expandIncoming( nodeTree, edges );
        } else {
            throw 'error direction! please pass in a valid expand direction';
        }

        return ret;
    };

    /**
     * Apply incremental layout for the graph updates.
     *
     * @param {Function} - graphChangesFun the function object that can make graph changes
     *
     */
    this.applyUpdate = function( graphChangesFun ) {
        if( graphChangesFun && typeof graphChangesFun === 'function' ) {
            sortedLayouter.beginCompoundCommands();
            graphChangesFun();
            sortedLayouter.endCompoundCommandsAndUpdate();
        }
    };
};

/**
 * Create sorted layout.
 *
 * @param diagramView the diagram view object
 * @param hostInterface the host layout interface
 * @returns {promise} promise resolved with layout object
 */
export let createLayout = function( diagramView, hostInterface ) {
    var layout = new exports.SortedLayout( diagramView, hostInterface );
    return AwPromiseService.instance.resolve( layout );
};

export default exports = {
    SortedLayout,
    createLayout
};
/**
 * The service to provide sorted layout support.
 *
 * @member sortedLayoutService
 * @memberof NgServices
 */
app.factory( 'sortedLayoutService', () => exports );

// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module provides incremental update layout support. In Increment update, the diagram sheet is divided into grids
 * horizontally and vertically. The width and height of each grid is determined by Edge-to-Edge distance setting. Each
 * node is snapped to a grid. The width of each node should be divisible by grid width. The height of each node should
 * be divisible by grid height. The left and right group paddings should be divided by grid width.The top and bottom
 * group paddings should be divided by grid height
 *
 * For instance, Suppose the grid size is 15*10. When user moves node to (107, 82), Incremental update will snap it to
 * (90, 80) When user resizes node size to (200, 100), Incremental update will snap the size to (195, 100)
 *
 * @module js/incUpdateLayoutService
 */
import app from 'app';
import _ from 'lodash';
import logSvc from 'js/logger';
import baseGraphLayout from 'js/baseGraphLayout';
import graphConstants from 'js/graphConstants';
import performanceUtils from 'js/performanceUtils';
import internalGraphUtils from 'js/internalGraphUtils';
import AwPromiseService from 'js/awPromiseService';
import '@diagramming/incrementalupdate';
import '@diagramming/snakelayout';
import '@diagramming/sortedlayout';

/**
 * Define public API
 *
 * @exports js/incUpdateLayoutService
 */
var exports = {};

/**
 * Define the incremental update layout
 *
 * @class
 * @param diagramView the diagram object
 * @param hostInterface the layout interface for host application
 */
export let IncUpdateLayout = function( diagramView, hostInterface ) {
    if( !hostInterface ) {
        throw 'The layout host interface has not been initialized.';
    }

    var self = this;
    var SDF = window.SDF;
    this._hostInterface = hostInterface;

    var incLayouter = new window.SDF.Layout.GcIncUpdate( hostInterface );
    baseGraphLayout.BaseLayout.call( this, incLayouter, graphConstants.DFLayoutTypes.IncUpdateLayout );

    /**
     * This method controls how incremental update shrinks group when adding child to group, moving or resizing
     * child of group.
     *
     * @param option The acceptable values are: 0 - no padding fit, incremental update does not shrink group; 1 -
     *            padding for all sides, incremental updates shrinks four sides of group to fit the contents in it;
     *            2 - padding for right and bottom sides, incremental update shrinks the right and bottom sides to
     *            fit the contents in it
     *
     */
    this.setGroupPaddingFit = function( option ) {
        this.setGroupPaddingFit( option );
    };

    /**
     * Apply global layout to the graph.
     */
    this.applyLayout = function() {
        // start performance timer
        var performanceTimer = performanceUtils.createTimer();
        var active = this.isActive();
        if( active ) {
            this.deactivate();
        }

        // apply global layout
        var nodes = diagramView.getElementsByType( 'Node' );
        var visibleNodes = [];
        var visibleEdges = [];
        for( var i = 0; i < nodes.length; i++ ) {
            if( nodes[ i ].isPrimitiveVisible() && nodes[ i ].getItemType() !== 'Boundary' ) {
                visibleNodes.push( nodes[ i ] );
            }
        }

        var edges = diagramView.getElementsByType( 'Connection' );
        for( var j = 0; j < edges.length; j++ ) {
            if( edges[ j ].isPrimitiveVisible() ) {
                visibleEdges.push( edges[ j ] );
            }
        }

        // cache the previous suppress flag
        var suppressRouting = diagramView.isSuppressAutoRouting();
        var suppressBoundaryUpdate = diagramView.isSuppressNestedNodeAutoEnlarge();

        // set suppress for global layout
        diagramView.suppressAutoRouting( true );
        diagramView.suppressNestedNodeAutoEnlarge( true );

        // LCS-374641 - DITL:FORD: Connection lines are getting disconnected from ports while changing network to nested view in diagram
        // The 4th argument routingFlag needs to be true if only run global layout without incremental update.
        // At least, for nested view with group node, it needs to be true.
        // Fixed since afx-graph 1.2.0-17
        // eslint-disable-next-line new-cap
        window.SDF.Layout.Layouter.ApplyOptimizedLayout( hostInterface, visibleNodes, visibleEdges, true );

        // set back
        diagramView.suppressAutoRouting( suppressRouting );
        diagramView.suppressNestedNodeAutoEnlarge( suppressBoundaryUpdate );

        if( active ) {
            this.activate();
        }
        // log performance time
        performanceTimer.endAndLogTimer( 'Apply New Layout', 'applyNewLayout' );
    };

    /**
     * Check if the incremental update layout is activated
     *
     * @return true if incremental update layout is activated, false otherwise
     */
    this.isActive = function() {
        return incLayouter.isIncrementalActive();
    };

    /**
     * Activate the incremental update layout. This function will add all non-filtered nodes and connections to
     * layout and then adjust these elements to make position/size/path follow all layout rules
     *
     * @param keepPosition the flag to keep sheet element position or not. layout.
     */
    this.activate = function( keepPosition ) {
        if( self.isActive() ) {
            return;
        }

        // cache the suppress flag, will set back in deactivate. Per Jeris's suggestion
        this._suppressRouting = diagramView.isSuppressAutoRouting();
        this._suppressBoundaryUpdate = diagramView.isSuppressNestedNodeAutoEnlarge();
        // set suppress for incremental update layout
        diagramView.suppressAutoRouting( true );
        diagramView.suppressNestedNodeAutoEnlarge( true );

        var nodes = diagramView.getElementsByType( 'Node' ); // $NON-NLS-1$
        var edges = diagramView.getElementsByType( 'Connection' ); // $NON-NLS-1$
        var visibleNodes = _.filter( nodes, function( node ) {
            return node.isPrimitiveVisible() && !node.getIsContainer();
        } );

        var visibleEdges = _.filter( edges, function( edge ) {
            return edge.isPrimitiveVisible();
        } );

        _.forEach( diagramView.getElementsByType( 'Port' ), function( port ) {
            // LCS-98668 - GC: switch nested/network view several times get graph not able to be fit, viewport keeps to change smaller
            // solution from Jianwei
            if( !port.isProxy() || !port.isInternal() ) {
                internalGraphUtils.convertRelPortPosition2Abs( port );
            }
        } );

        incLayouter.activateIncUpdate( visibleNodes, visibleEdges, keepPosition );
    };

    /**
     * Deactivate the incremental update layout. This will remove all nodes/edges/ports from layout session
     *
     */
    this.deactivate = function() {
        incLayouter.disableIncUpdate();

        // clear all glue points on node
        var nodes = _.filter( diagramView.getElementsByType( 'Node' ), function( node ) {
            return !node.getIsContainer();
        } );
        _.each( nodes, function( item ) {
            var appObj = item.getAppObj();
            if( appObj !== null ) {
                appObj.gluePoints = null;
            }
        } );

        _.forEach( diagramView.getElementsByType( 'Port' ), function( port ) {
            internalGraphUtils.convertAbsPortPosition2Rel( port );
        } );

        // set back
        if( this._suppressRouting !== undefined && this._suppressBoundaryUpdate !== undefined ) {
            diagramView.suppressAutoRouting( this._suppressRouting );
            diagramView.suppressNestedNodeAutoEnlarge( this._suppressBoundaryUpdate );
        }
    };

    /**
     * Apply incremental layout for the graph updates.
     *
     * @param {Function} - graphChangesFun the function object that can make graph changes
     *
     */
    this.applyUpdate = function( graphChangesFun ) {
        if( graphChangesFun && typeof graphChangesFun === 'function' ) {
            incLayouter.beginCompoundCommands();
            graphChangesFun();
            incLayouter.endCompoundCommandsAndUpdate();
        }
    };

    /**
     * Adds a new node to incremental update session.
     * If incremental update is inactive or the node already exists in layout, this function will do nothing.
     * All ports of the node will be added to layout automatically.
     * If the node is child, its parent should be already in the layout and this function will
     * update the parent size and position. "groupPaddingFit" option affects how the parent size and position is
     * updated
     *
     * @param node the node to be added
     * @param usePosition whether using the given node's current position for placement;
     *        if no, incremental update will find the available position for node based on rule
     * @return true if successfully
     */
    this.addNode = function( node, usePosition ) {
        var ret = false;
        if( node && node instanceof SDF.Models.Node && !this.containsNode( node ) ) {
            if( usePosition ) {
                ret = incLayouter.addNewNode( node );
            } else {
                ret = incLayouter.addNewNodeUsingGridLayout( node );
            }
        }
        return ret;
    };

    /**
     * Adds a node as parent of existing nodes in the incremental update session.
     * Incremental update determines the node position based positions of its children
     *
     * If incremental update is not active or the node already exists in layout, this function will do nothing.
     *
     * All ports of the node will be added to layout automatically.
     * If the group is child of another group, its parent should be already in the layout and this function will
     * update the parent size and position. "groupPaddingFit" option affects how the parent size and position is
     * updated
     *
     * @param node the group node to be added
     * @param childNodes the node list to be children of the group node
     * @return true if successfully
     */
    this.addNewGroupNode = function( node, childNodes ) {
        var ret = false;
        if( node && childNodes && node instanceof SDF.Models.Node ) {
            ret = incLayouter.addNewGroupNode( node, childNodes );
        }
        return ret;
    };

    /**
     * Adds a new edge to incremental update session. If incremental update is inactive or
     * the edge already exists in layout, this function will do nothing.
     * If ports of edge are not in the session, incremental update will add them automatically
     *
     * Note: The source and target nodes should be already in the session
     *
     * @param edge the edge to be added
     * @return true if successfully
     */
    this.addEdge = function( edge ) {
        var ret = false;
        if( edge && edge instanceof SDF.Models.Connection && !this.containsEdge( edge ) ) {
            ret = incLayouter.addNewConnection( edge );
        }

        return ret;
    };

    /**
     * Adds a new port to incremental update session. If incremental update is inactive or
     * the port already exists in layout, this function will do nothing.
     *
     * Note: The node owning this port should be already in the session
     *
     * @param port the port to be added
     * @param usePosition whether using the given port's current position as placement
     * @return true if successfully
     */
    this.addPort = function( port, usePosition ) {
        var ret = false;
        if( port && port instanceof SDF.Models.Port && !this.containsPort( port ) ) {
            ret = incLayouter.addNewPort( port, usePosition );
        }
        return ret;
    };

    /**
     * Remove the node from layout session; the connections and ports of the node are also removed accordingly.
     *
     * @param node the node to be removed
     * @param keepChildren the flag to indicate if keeping children, if false, all children of the group will be
     *            removed from layout session (Include the connections and ports of children)
     * @return true if successfully removed
     */
    this.removeNode = function( node, keepChildren ) {
        var ret = false;
        if( node && node instanceof SDF.Models.Node ) {
            ret = incLayouter.removeNode( node, keepChildren );
        }
        return ret;
    };

    /**
     * Remove edge from incremental update session
     *
     * @param edge the edge to be removed
     * @return true if successfully removed
     */
    this.removeEdge = function( edge ) {
        var ret = false;
        if( edge && edge instanceof SDF.Models.Connection ) {
            ret = incLayouter.removeConnection( edge );
        }
        return ret;
    };

    /**
     * Remove port from incremental update session. Note: Incremental update does NOT remove edges of the port accordingly
     *
     * @param edge the port to be removed
     * @return true if successfully removed
     */
    this.removePort = function( port ) {
        var ret = false;
        var self = this;
        if( port && port instanceof SDF.Models.Port ) {
            if( !_.find( port.getConnections(), function( edge ) {
                    return self.containsEdge( edge );
                } ) ) {
                ret = incLayouter.removePort( port );
            } else {
                logSvc.error( 'Port' + port + 'can not be removed from the layout as the its related connection(s) are visible.' );
            }
        }
        return ret;
    };

    /**
     * Notify incremental update that a node is moved. Incremental update snaps the node position to a grid, updates
     * its connections and ports accordingly and moves conflicting nodes out of the way . If it is a parent node,
     * all children of it will be updated accordingly. If it is a child node, incremental update will adjust size
     * and position of its parent. "groupPaddingFit" option affects how the parent size and position is updated.
     *
     * @param node the node which is moved
     * @return true if successfully removed
     */
    this.moveNode = function( node ) {
        var ret = false;
        if( node && node instanceof SDF.Models.Node ) {
            ret = incLayouter.moveNode( node );
        }
        return ret;
    };

    /**
     * Notify incremental update that a node is resized. Incremental update snaps the node width to value divisible
     * by horizontal edge-to-edge distance, node height to value divisible by vertical edge-to-edge distance;
     * updates its connections and ports accordingly and move conflicting nodes out of the way. If it is a child
     * node, incremental update will adjust size of its parent. "groupPaddingFit" option affects how the parent size
     * is updated.
     *
     * If Incremental update is inactive or the node is not in the session, nothing will be done
     *
     * @param node the node which is moved
     * @return true if successfully removed
     */
    this.resizeNode = function( node ) {
        var ret = false;
        if( node && node instanceof SDF.Models.Node ) {
            ret = incLayouter.resizeNode( node );
        }
        return ret;
    };

    /**
     * Move the given port to a new glue point. The port will snap to the closest glue point any other ports in the
     * way are moved down or right.
     *
     * @param port the port to be moved
     * @return true if successfully
     */
    this.movePort = function( port ) {
        var ret = false;
        if( port && port instanceof SDF.Models.Port ) {
            ret = incLayouter.movePort( port );
        }
        return ret;
    };

    /**
     * Notify incremental update that an edge is reconnected.
     *
     * @param edge the edge to be reconnected
     * @return true if successfully reconnected
     */
    this.reconnectEdge = function( edge ) {
        var ret = false;
        if( edge && edge instanceof SDF.Models.Connection ) {
            ret = incLayouter.moveConnection( edge );
        }
        return ret;
    };

    /**
     * Notify incremental update that a group node is expanded. The group node should be already in the layout
     * session.This will update the node size to the last expanded size and move other nodes out of the way. The
     * connections and ports of the node are updated accordingly
     *
     * @param node the node which is moved
     * @return true if successfully removed
     */
    this.expandGroupNode = function( node ) {
        var ret = false;
        if( node && node instanceof SDF.Models.Node ) {
            ret = incLayouter.expandGroupNode( node );
        }
        return ret;
    };

    /**
     * Notify incremental update that a group node is expanded and some new child nodes are added into group. The
     * group node should be already in the layout session
     *
     * @param node the node which is expanded
     * @param childNodes list containing the child nodes added into the group, this list can not be empty
     * @param connections list containing connections of the child nodes, the list can be empty
     * @return true if successfully removed
     */
    this.expandAndLayoutExistingGroupNode = function( groupNode, childNodes, connections ) {
        var ret = false;
        if( groupNode && childNodes && groupNode instanceof SDF.Models.Node ) {
            ret = incLayouter.expandAndLayoutExistingGroupNode( groupNode, childNodes, connections );
        }
        return ret;
    };

    /**
     * Notify incremental update that a group node is collapsed. The group node should be already in the layout
     * session.This will update the node size to the last collapsed size. The connections and ports of the node are
     * updated accordingly.
     *
     * @param groupNode the group node to be collapsed
     * @return true if successfully collapsed
     */
    this.collapseGroupNode = function( groupNode ) {
        var ret = false;
        if( groupNode && groupNode instanceof SDF.Models.Node ) {
            ret = incLayouter.collapseGroupNode( groupNode );
        }
        return ret;
    };

    /**
     * Update group node size to fit its current contents; the behavior is controlled by "groupPaddingFit" option
     *
     * @param groupNode the group node to be fit
     * @return true if successfully fit
     */
    this.fitGroupNode = function( groupNode ) {
        var ret = false;
        if( groupNode && groupNode instanceof SDF.Models.Node ) {
            ret = incLayouter.fitGroupNode( groupNode );
        }
        return ret;
    };

    /**
     * Fit all the ancestors nodes of the given group node
     *
     * @param groupNode the group node to be fit
     * @return true if successfully fit
     */
    this.fitAncestorNodes = function fitAncestorNodes( groupNode ) {
        var ret = true;

        if( groupNode && groupNode instanceof SDF.Models.Node ) {
            ret = incLayouter.fitGroupNode( groupNode );
            var ancestor = groupNode.getOwner();
            if( ret && ancestor && self.containsNode( ancestor ) ) {
                ret = fitAncestorNodes( ancestor );
            }
        }
        return ret;
    };

    /**
     * For a given list of new nodes and new edges and an existing seed node add all of the new items as follows: 1.
     * If the new node belong to an existing group node then move the new node to the group using a grid layout 2.
     * Otherwise, distribute the new node along the first row or column that is in the direction of the current
     * layout direction and is open at the root level. Any node in the row or column that is directly connected to
     * the seed node will not be moved. Other nodes will be move along the row or column to keep the new nodes close
     * to the seed node
     *
     * @param seedNode host node reference for a reference node - this node must already be in layout
     * @param nodes array of new host node reference to add to layout
     * @param edges array of new host edge reference to add to layout
     * @param distributeDirection string one of "up", "down", "left", "right" or "useLayoutDirection"
     * @return true if successfully
     */
    this.distributeNewNodes = function( seedNode, nodes, edges, distributeDirection ) {
        var ret = incLayouter.distributeNewNodes( seedNode, nodes, edges, distributeDirection );
        return ret;
    };

    /**
     * Removes the given group node while maintaining all child nodes in place but re-parented to the group node's
     * parent node.
     *
     * @param groupNode the group node to be removed
     * @return true if successfully
     */
    this.removeOnlyGroupNode = function( groupNode ) {
        var ret = false;
        if( groupNode && groupNode instanceof SDF.Models.Node ) {
            ret = incLayouter.removeOnlyGroupNode( groupNode );
        }
        return ret;
    };

    /**
     * Set standard Node Size
     *
     * @param width the width to be set
     * @param height the height to be set
     */
    this.setStandardNodeSize = function( width, height ) {
        incLayouter.standardNodeWidth = width;
        incLayouter.standardNodeHeight = height;
    };

    /**
     * Create a new table layout for a given set of new nodes and connections (also includes an existing target child
     * node) Add a new group node to table layout and then make the new graph the content of the new group node
     *
     * @param targetChildNode host reference for an existing (i.e. already defined in table layout) child node for the
     *            new group being created
     * @param newGroupNode host reference for the new group node that contains the target child node and all nodes in
     *            the given node list
     * @param nodeList host reference for the new group node that contains the target child node and all nodes in the
     *            given node list
     * @param edgeList array of Host connection or edge references - connections between child nodes will be used to
     *            define the hierarchic layout - other connections (possibly from child nodes to nodes in the existing
     *            layout) will be added after the layout is complete
     * @return true if successfully
     */
    this.expandAndLayoutNewGroupNode = function( targetChildNode, newGroupNode, nodeList, edgeList ) {
        var ret = false;
        if( targetChildNode && newGroupNode ) {
            ret = incLayouter.expandAndLayoutNewGroupNode( targetChildNode, newGroupNode, nodeList, edgeList );
        }
        return ret;
    };

    /**
     * This method changes the parent of the given nodes. The nodes had either been moved into a group node,
     * taken out of a group node, or moved from one group node to another in the Host's data model.
     * If the given hostNodes moved into a group node, the group will be expanded to fit the new nodes
     * and assumes that the nodes are in a reasonable position for grouping. If the given hostNodes moved
     * out of a group node, that the group node's size will be dependent on the autoShrinkToFit option.
     *
     * @param nodes the nodes
     * @return true if successfully
     */
    this.changeParent = function( nodes ) {
        var ret = true;
        if( !nodes ) {
            return false;
        }
        _.each( [].concat( nodes ), function( node ) {
            if( ret && node instanceof SDF.Models.Node ) {
                ret = incLayouter.changeParent( node );
            }
        } );
        return ret;
    };

    /**
     * For a target group node and list of nodes re-parent all of the nodes to the group node and relocate those nodes
     * to the group using a grid layout
     *
     * @param nodeList array of host node references to be re-parented and relocated
     * @return true if successfully
     */
    this.changeParentAndRelocate = function( nodeList ) {
        var ret = false;
        if( nodeList ) {
            ret = incLayouter.changeParentAndRelocate( nodeList );
        }
        return ret;
    };

    /**
     * convert an empty group node to normal node
     *
     * @param node the node to be moved
     * @return true if converted to normal node
     */
    this.convertGroupNodeToNode = function( node ) {
        var ret = false;
        if( node ) {
            ret = incLayouter.convertGroupNodeToNode( node );
        }
        return ret;
    };

    /**
     * Notify incremental update that a normal node has been converted to group;
     * If incremental update is not active or the node is not in the session, nothing will be done
     *
     * Note: This converted node should not have any child when this function is called
     *
     * @param node the converted group
     * @return true if incremental update handles it successfully
     */
    this.convertToGroup = function( node ) {
        var ret = false;
        if( node ) {
            ret = incLayouter.convertNodeToGroupNode( node );
        }
        return ret;
    };

    // TODO add remaining APIs for incremental layout
};

/**
 * Create incremental update layout.
 *
 * @param diagramView the diagram view object
 * @param hostInterface the host layout interface
 * @returns {promise} promise resolved with layout object
 */
export let createLayout = function( diagramView, hostInterface ) {
    var layout = new exports.IncUpdateLayout( diagramView, hostInterface );
    return AwPromiseService.instance.resolve( layout );
};

export default exports = {
    IncUpdateLayout,
    createLayout
};
/**
 * The service to provide incremental update layout support.
 *
 * @member incUpdateLayoutService
 * @memberof NgServices
 */
app.factory( 'incUpdateLayoutService', () => exports );

// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module provides branch layout support.
 *
 * @module js/branchLayoutService
 */
import app from 'app';
import _ from 'lodash';
import logSvc from 'js/logger';
import baseGraphLayout from 'js/baseGraphLayout';
import graphConstants from 'js/graphConstants';
import AwPromiseService from 'js/awPromiseService';
import '@diagramming/branchlayout';

/**
 * Define public API
 *
 * @exports js/branchLayoutService
 */
var exports = {};

/**
 * The default branch layout configuration
 */
var _DEFAULT_CONFIG = {
    direction: 'LEFT_TO_RIGHT',
    nodeGrowDirection: 'TOP_TO_BOTTOM',
    routingType: 'HV'
};

/**
 * convert to DF internal options
 */
var getBranchLayoutOptions = function( config ) {
    var branchLayout = graphConstants.BranchLayout;

    var myConfig = _.clone( _DEFAULT_CONFIG );
    if( config ) {
        _.forEach( _.keys( myConfig ), function( key ) {
            if( _.has( config, key ) ) {
                myConfig[ key ] = config[ key ];
            }
        } );
    }

    // convert to DF internal value
    return {
        direction: branchLayout.BranchOutDirection[ myConfig.direction ],
        nodeGrowDirection: branchLayout.NodeGrowDirection[ myConfig.nodeGrowDirection ],
        routingType: branchLayout.RoutingType[ myConfig.routingType ]
    };
};

/**
 * Define the branch layout
 *
 * @class
 * @param diagramView the diagram object
 * @param hostInterface the layout interface for host application
 * @param config the branch layout configuration object. It includes:
 * direction: Denote the branch out direction. Four options: "leftToRight, (default)
 *            "rightToLeft", "topToBottom", "bottomToTop"
 *
 * nodeGrowDirection: This must be perpendicular to the direction If branchGrowDirection is
 *            "leftToRight" or "rightToLeft": This parameter should be: "topToBottom"(default) "bottomToTop" If
 *            branchGrowDirection is "topToBottom" or "bottomToTop": This parameter should be:
 *            "leftToRight"(default) "rightToLeft"
 *
 * routingType" "HV"(default) - Connections will be routed orthogonal. Used to avoid crossing Nodes
 *            "straightLine" - Connections will be a straight line from one node to another node. It will cross any
 *            nodes found along is path.
 */
export let BranchLayout = function( diagramView, hostInterface, config ) {
    if( !hostInterface ) {
        throw 'The layout host interface has not been initialized.';
    }

    this._hostInterface = hostInterface;

    var layoutConfig = getBranchLayoutOptions( config );
    var branchLayouter = new window.SDF.Layout.BranchLayout( hostInterface, layoutConfig.direction,
        layoutConfig.nodeGrowDirection, layoutConfig.routingType );
    baseGraphLayout.BaseLayout.call( this, branchLayouter, graphConstants.DFLayoutTypes.BranchLayout );

    /**
     * Initialize a branch
     *
     * @param branchNode new added branch node
     * @param nodeArray new added child nodes of branchNode
     * @return true for create successfully, otherwise false
     */
    this.initBranch = function( branchNode, nodeArray ) {
        var res = false;
        if( branchNode ) {
            res = branchLayouter.initBranch( branchNode, nodeArray );
        }
        return res;
    };

    /**
     * This API will detect if the branch layout is active or not.
     *
     * @return true is active
     */
    this.isActive = function() {
        return branchLayouter.isActive();
    };

    /**
     * Add child branch from a source node with given alignment pairs
     *
     * @param sourceNode source node to add branch
     * @param branchNode new added branch node
     * @param nodeArray new added child nodes of branch nodes of branchNode
     * @param alignmentNodePairs The alignment node pairs such as [ [n1, n2], [n3, n4] , [..]]
     * @return true for add successfully, otherwise false
     */
    this.addChildBranch = function( sourceNode, branchNode, nodeArray, alignmentNodePairs ) {
        var res = false;
        if( sourceNode && branchNode ) {
            res = branchLayouter.addChildBranch( sourceNode, branchNode, nodeArray, alignmentNodePairs );
        }
        return res;
    };

    /**
     * Add parent branch for source node with specific alignment information
     *
     * @param sourceNode source node to add branch
     * @param parentBranchNode new added branch node
     * @param nodeArray new added child nodes of parentBranchNode
     * @param alignmentNodePairs The alignment node pairs such as [ [n1, n2], [n3, n4] , [..]]
     * @return true for add successfully, otherwise false
     */
    this.addParentBranch = function( sourceNode, parentBranchNode, nodeArray, alignmentNodePairs ) {
        var res = false;
        if( sourceNode && parentBranchNode ) {
            res = branchLayouter.addParentBranch( sourceNode, parentBranchNode, nodeArray, alignmentNodePairs );
        }
        return res;
    };

    /**
     * Insert branch to the side of referBranchNode according to the global setting direction. The
     * insert branch (branchNode) should be the same level as the reference branch (referBranchNode).
     *
     * @param sourceNode source node to insert branch
     * @param branchNode new added branch node
     * @param nodeArray new added child nodes of parentBranchNode
     * @param beforeOrAfter. Insert branchNode before or after the referBranchNode. "before" "after"
     *
     * It will refer to the global parameter branchGrowDirection.
     *
     * If branchGrowDirection = leftToRight: "before": the branchNode will add to the left of referBranchNode
     * "after": the branchNode will add to the right of referBranchNode If branchGrowDirection = rightToLeft:
     * "before": the branchNode will add to the right of referBranchNode "after": the branchNode will add to the
     * left of referBranchNode If branchGrowDirection = topToBottom: "before": the branchNode will add to the top of
     * referBranchNode "after": the branchNode will add to the bottom of referBranchNode If branchGrowDirection =
     * bottomToTop: "before": the branchNode will add to the bottom of referBranchNode "after": the branchNode will
     * add to the top of referBranchNode
     *
     * @param referBranchNode branch node which is a reference to insert branch node
     * @param alignmentNodePairs The alignment node pairs such as [ [n1, n2], [n3, n4] , [..]]
     * @return true for insert successfully, otherwise false
     */
    this.insertBranch = function( sourceNode, branchNode, nodeArray, beforeOrAfter, referBranchNode,
        alignmentNodePairs ) {
        var res = false;
        if( sourceNode && branchNode ) {
            res = branchLayouter.insertBranch( sourceNode, branchNode, nodeArray, beforeOrAfter, referBranchNode,
                alignmentNodePairs );
        }

        return res;
    };

    /**
     * Remove the given branches. All the connections connected with those nodes will be removed together by branch
     * layout
     *
     * @param branchNodes Branch nodes to be removed
     * @param compact Whether the removed branch space should be reclaimed or not. True: the space is reclaimed
     *            False: the space is remained
     * @return true for remove successfully, otherwise false
     */
    this.removeBranches = function( branchNodes, compact ) {
        var res = false;
        if( branchNodes ) {
            res = branchLayouter.removeBranches( branchNodes, compact );
        }

        return res;
    };

    /**
     * Delete the given leaf node.
     *
     * @param {Node} node - Leaf node in a brandh it to be deleted.
     * @param {Boolean} removeConnections - whether the incoming connections of should be removed or not.
     */
    this.deleteLeafNode = function( node, removeConnections ) {
        return branchLayouter.deleteLeafNode( node, removeConnections );
    };

    /**
     * Add nodes to branch node with specific alignment
     *
     * @param branchNode branch to add child nodes
     * @param nodeArray nodes to add into branchNode
     * @param alignmentNodePairs The alignment node pairs such as [ [n1, n2], [n3, n4] , [..]]
     * @return true for add successfully, otherwise false
     */
    this.addNodesToBranch = function( branchNode, nodeArray, alignmentNodePairs ) {
        var res = false;
        if( branchNode && nodeArray ) {
            res = branchLayouter.addNodesToBranch( branchNode, nodeArray, alignmentNodePairs );
        }

        return res;
    };

    /**
     * Create connections
     *
     * @param connectionArray the connection array to add
     * @return true for add successfully, otherwise false
     */
    this.addConnections = function( connectionArray ) {
        var res = false;
        if( connectionArray ) {
            res = branchLayouter.addConnections( connectionArray );
        }

        return res;
    };

    /**
     * Remove connections
     *
     * @param connectionArray the connection array to remove
     * @return true for remove successfully, otherwise false
     */
    this.removeConnections = function( connectionArray ) {
        var res = false;
        if( connectionArray ) {
            res = branchLayouter.removeConnections( connectionArray );
        }

        return res;
    };

    /**
     * Collapse Up
     *
     * @param branchNode Recursively find the parent/ancestor branch nodes of the given branchNode and remove them.
     *            After this method, the branch node and its children will remain.
     * @param compact if the free space will be reclaimed or not
     * @return true for collapse successfully, otherwise false
     */
    this.collapseUpAll = function( branchNode, compact ) {
        var res = false;
        if( branchNode ) {
            res = branchLayouter.collapseUpAll( branchNode, compact );
        } else {
            logSvc.error( 'invalid \'branchNode\' passed in!' );
        }

        return res;
    };

    /**
     * Apply layout for the graph updates.
     *
     * @param {Function} - graphChangesFun the function object that can make graph changes
     *
     */
    this.applyUpdate = function( graphChangesFun ) {
        if( graphChangesFun && typeof graphChangesFun === 'function' ) {
            branchLayouter.beginCompoundCommands();
            graphChangesFun();
            branchLayouter.endCompoundCommandsAndUpdate();
        }
    };
};

/**
 * Create branch layout.
 *
 * @param diagramView the diagram view object
 * @param hostInterface the host layout interface
 * @param config the branch layout configuration object. It includes:
 * direction: Denote the branch out direction. Four options: "leftToRight, (default)
 *            "rightToLeft", "topToBottom", "bottomToTop"
 *
 * nodeGrowDirection: This must be perpendicular to the direction If branchGrowDirection is
 *            "leftToRight" or "rightToLeft": This parameter should be: "topToBottom"(default) "bottomToTop" If
 *            branchGrowDirection is "topToBottom" or "bottomToTop": This parameter should be:
 *            "leftToRight"(default) "rightToLeft"
 *
 * routingType" "HV"(default) - Connections will be routed orthogonal. Used to avoid crossing Nodes
 *            "straightLine" - Connections will be a straight line from one node to another node. It will cross any
 *            nodes found along is path.
 * @returns {promise} promise resolved with layout object
 */
export let createLayout = function( diagramView, hostInterface, config ) {
    var layout = new exports.BranchLayout( diagramView, hostInterface, config );
    return AwPromiseService.instance.resolve( layout );
};

/**
 * The service to provide branch layout support.
 *
 * @member branchLayoutService
 */

export default exports = {
    BranchLayout,
    createLayout
};
app.factory( 'branchLayoutService', () => exports );

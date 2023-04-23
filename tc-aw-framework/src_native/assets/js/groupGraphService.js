// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module provides group graph support
 *
 * @module js/groupGraphService
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import declUtils from 'js/declUtils';
import internalGraphUtils from 'js/internalGraphUtils';
import graphConstants from 'js/graphConstants';

/**
 * Define public API
 *
 * @exports js/groupGraphService
 */
var exports = {};

var getDefaultPadding = function( graphModel ) {
    var paddings = [ 10, 10, 10, 10 ];
    var defaultPadding = graphModel.config.defaults.nodePaddings;
    if( defaultPadding ) {
        if( defaultPadding.top ) {
            paddings[ 0 ] = defaultPadding.top;
        }

        if( defaultPadding.bottom ) {
            paddings[ 1 ] = defaultPadding.bottom;
        }

        if( defaultPadding.left ) {
            paddings[ 2 ] = defaultPadding.left;
        }

        if( defaultPadding.right ) {
            paddings[ 3 ] = defaultPadding.right;
        }
    }

    return paddings;
};

/**
 * Define group graph supported graph API
 *
 * @class
 *
 * @param graph the graph object
 */
export let GroupGraph = function( graph ) {
    if( !graph ) {
        throw 'Failed to create GroupGraph instance. The "graph" argument is invalid.';
    }

    this._SDF = window.SDF;
    this._diagramView = graph._diagramView;
    this._graphModel = graph._graphModel;
    this.graph = graph;
    this._defaultPaddings = getDefaultPadding( this._graphModel );

    var globalPaddings = {
        top: this._defaultPaddings[ 0 ],
        bottom: this._defaultPaddings[ 1 ],
        left: this._defaultPaddings[ 2 ],
        right: this._defaultPaddings[ 3 ]
    };
    this._diagramView.getSheetConfigurationData().nodePaddings = globalPaddings;
};

GroupGraph.prototype = {

    // for group operation
    isGroup: function( node ) {
        return node.isGroupingAllowed();
    },

    /**
     * Groups the nodes in children into a newly created group. The group node will be created at the common
     * ancestor level of all nodes in children.
     *
     *
     * @param childNodes the array of child nodes to be grouped into the new created group node.
     * @param style the node style instance. Can be null.
     * @param bindData the node bind data. Can be null.
     * @return The newly created group node.
     */
    createGroupNode: function( childNodes, style, bindData ) {
        var groupNode = null;
        var graph = this.graph;
        var SDF = this._SDF;
        this.graph.update( function() {
            var svgObject = SDF.Models.SVG.create( null );
            groupNode = SDF.Models.Node.createNestedNode( childNodes, '', svgObject );
            graph.setNodeStyle( groupNode, style, bindData );
        } );
        return groupNode;
    },

    /**
     * Get the parent node of a given node.
     *
     * @param node The node to yield parent node.
     * @return The parent node of a given node. null is returned if the node does not have parent
     */
    getParent: function( node ) {
        var parentNode = null;
        if( node ) {
            var owner = node.getOwner();
            if( owner instanceof this._SDF.Models.Node ) {
                parentNode = owner;
            }
        }
        return parentNode;
    },

    /**
     * Set the parent node for a list of given nodes.
     *
     * @param parent The parent group node.
     *        parent could be null, in this case, will remove the group relation for all childNodes.
     * @param childNodes List of nodes needs to assign a new parent. require all the childNodes are siblings.
     *
     */
    setParent: function( parent, childNodes ) {
        if( !childNodes ) {
            return;
        }
        if( !_.isArray( childNodes ) ) {
            childNodes = [].concat( childNodes );
        }
        var self = this;
        if( parent && parent instanceof self._SDF.Models.Node && childNodes.length > 0 ) {
            this.graph.update( function() {
                parent.addGroupMembers( childNodes );
            } );

            internalGraphUtils.publishGraphEvent( self._graphModel, 'awGraph.groupMembersAdded', {
                group: parent,
                members: childNodes
            } );
        } else if( !parent ) {
            // handle parent null case.
            // add this api enhance per Jeris's request
            var parentNode = null;
            var removedChildNodes = null;
            this.graph.update( function() {
                removedChildNodes = _.filter( childNodes, function( node ) {
                    parentNode = node.getOwner();
                    if( parentNode && parentNode instanceof self._SDF.Models.Node ) {
                        parentNode.removeGroupMember( node );
                        return true;
                    }
                } );
            } );

            if( removedChildNodes && removedChildNodes.length > 0 ) {
                internalGraphUtils.publishGraphEvent( self._graphModel, 'awGraph.groupMembersRemoved', {
                    group: parentNode,
                    members: removedChildNodes
                } );
            }
        }
    },

    /**
     * Get the child nodes of a group
     *
     * @param groupNode the group node
     * @return the child node array, empty list returned if the node does not have any child
     */
    getChildNodes: function( groupNode ) {
        var children = [];
        if( groupNode ) {
            children = _.filter( groupNode.getGroupMembers(), function( member ) {
                return member instanceof window.SDF.Models.Node;
            } );
        }

        if( !children ) {
            children = [];
        }
        return children;
    },

    /**
     * Change the group node to leaf
     *
     * @param node the group node
     */
    setAsLeaf: function( node ) {
        if( !node ) {
            return;
        }

        var self = this;

        // Clear the child nodes
        self.setParent( null, self.getChildNodes( node ) );

        node.setGroupingAllowed( false );
        node.setDisplayStrategy( null );
    },

    /**
     * Change a normal node as group
     *
     * @param node the normal node
     */
    setAsGroup: function( node ) {
        if( !node ) {
            return;
        }

        node.setGroupingAllowed( true );
        if( !node.getDisplayStrategy() ) {
            node.setDisplayStrategy( new this._SDF.Models.GroupingDisplayStrategy() );
        }

        // sync up group node header height with node height
        var svgObject = node.getSVG();
        var bindData = node.getAppObj();
        if( svgObject && bindData[ graphConstants.HEADER_HEIGHT_PROP ] === undefined ) {
            bindData[ graphConstants.HEADER_HEIGHT_PROP ] = node.getHeight();
            svgObject.bindNewValues( graphConstants.HEADER_HEIGHT_PROP );
        }

        var paddings = _.clone( this._defaultPaddings );
        var headerHeight = node.getProperty( graphConstants.HEADER_HEIGHT_PROP );
        if( headerHeight !== undefined ) {
            paddings[ 0 ] = headerHeight + paddings[ 0 ];
        }
        node.setNodePaddings( paddings );
    },

    /**
     * Check if the group node is expanded or not
     *
     * @param group the group node
     * @return true if the group node is expand, false otherwise
     */
    isExpanded: function( group ) {
        if( !group ) {
            throw 'GroupGraph.isExpanded: the argument \'group\' is invalid.';
        }

        return group.isExpanded();
    },

    /**
     * Set group node expanded or collapsed. The event "awGraph.groupStateChanged" will be fired if the group
     * expansion state changed.
     *
     * @param group the group node
     * @param isExpand the flag to expand or collapse
     */
    setExpanded: function( group, isExpand ) {
        if( !group ) {
            throw 'GroupGraph.isExpanded: the argument \'group\' is invalid.';
        }

        if( this.isGroup( group ) && this.isExpanded( group ) !== isExpand ) {
            // setup group node view state, so that the group node size can be retained on expand/collapse
            if( !group.viewState ) {
                group.viewState = {};
            }

            var graph = this.graph;
            var minHeight = group.getResizeMinimumSize().height;
            if( !graph.isNetworkMode() ) {
                if( isExpand ) {
                    group.viewState.collapsedSize = {
                        width: group.getWidthValue(),
                        height: group.getHeightValue()
                    };
                } else {
                    group.viewState.expandedSize = {
                        width: group.getWidthValue(),
                        height: group.getHeightValue()
                    };
                }
            }

            var graphModel = this._graphModel;
            var self = this;
            this.graph.update( function() {
                group.setExpanded( isExpand );

                if ( isExpand && group.viewState.firstExpanded === undefined ) {
                    group.viewState.firstExpanded = true;
                }

                // don't need update group node size in network mode or it's empty group
                if( graph.isNetworkMode() || self.getChildNodes( group ).length === 0 ) {
                    return;
                }

                var svgObject = group.getSVG();
                var bindData = group.getAppObj();

                // restore group node size in corresponding view state
                var defautNodeSize = graphModel.config.defaults.nodeSize;
                if( !isExpand ) {
                    if( !group.viewState.collapsedSize ) {
                        group.viewState.collapsedSize = {
                            width: defautNodeSize.width,
                            height: defautNodeSize.height
                        };
                    }

                    if( bindData ) {
                        var height = bindData[ graphConstants.HEADER_HEIGHT_PROP ];
                        if( height > group.viewState.collapsedSize.height ) {
                            group.viewState.collapsedSize.height = height;
                        }
                    }

                    graph.setBounds( group, group.viewState.collapsedSize );
                } else {
                    // set default expanded size
                    if( !group.viewState.expandedSize ) {
                        group.viewState.expandedSize = {
                            width: defautNodeSize.width + 20,
                            height: defautNodeSize.height * 2
                        };
                    }
                    graph.setBounds( group, group.viewState.expandedSize );

                    // if it is first expanded and there are no active layouts, then calling fitToContent
                    if( group.viewState.firstExpanded && !( graphModel.graphControl.layout && graphModel.graphControl.layout.isActive() ) ) {
                        var renderingPosition = group.getRenderingPosition();
                        group.fitToContent();
                        group.viewState.firstExpanded = false;
                        group.setRenderingPosition( renderingPosition.x, renderingPosition.y );
                    }

                    if( svgObject && bindData ) {
                        bindData[ graphConstants.HEADER_HEIGHT_PROP ] = minHeight;
                        svgObject.bindNewValues( graphConstants.HEADER_HEIGHT_PROP );

                        var paddings = _.clone( self._defaultPaddings );
                        paddings[ 0 ] = minHeight + paddings[ 0 ];
                        group.setNodePaddings( paddings );
                    }
                }
            } );

            internalGraphUtils.publishGraphEvent( graphModel, 'awGraph.groupStateChanged', {
                group: group,
                expanded: isExpand
            } );
        }
    }
};

/**
 * Create Group Graph
 *
 * @param graph the graph object
 */
export let createGroupGraph = function( graph ) {
    return new exports.GroupGraph( graph );
};

export default exports = {
    GroupGraph,
    createGroupGraph
};
/**
 * The service to provide group graph support.
 *
 * @member groupGraphService
 * @memberof NgServices
 */
app.factory( 'groupGraphService', () => exports );

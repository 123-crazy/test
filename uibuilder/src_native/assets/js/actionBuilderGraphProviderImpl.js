// Copyright (c) 2020 Siemens

/**
 * This implements the test harness's graph data provider
 *
 * @module js/actionBuilderGraphProviderImpl
 */
import _ from 'lodash';
import graphConstants from 'js/graphConstants';
import graphLegendSvc from 'js/graphLegendService';
import templateService from 'js/actionBuilderTemplateService';
import graphLayout from 'js/actionBuilderGraphLayout';
import performanceUtils from 'js/performanceUtils';
import actionBuilderUtils from 'js/actionBuilderUtils';
import appCtxService from 'js/appCtxService';

var exports = {};

var performanceTimer;

var _directionMap = {
    in: graphConstants.ExpandDirection.BACKWARD,
    out: graphConstants.ExpandDirection.FORWARD,
    all: graphConstants.ExpandDirection.ALL
};

var getVisibleRootNodes = function( graphModel ) {
    var visibleNodes = graphModel.graphControl.graph.getVisibleNodes();
    if( visibleNodes ) {
        return _.filter( visibleNodes, function( item ) {
            return item.isRoot();
        } );
    }
    return [];
};

/**
 * Preprocess the graph data before rendering by graph data provider. Application can define some data transformation logic here.
 * This API implementation is optional.
 * @param {Object} graphModel the graph model object
 * @param {Object} rawGraphData the raw graph data
 */
export let preDraw = function( graphModel, rawGraphData ) {
    //start performance timer
    performanceTimer = performanceUtils.createTimer();
    //populate node,edge,port category by object type
    var activeLegendView = appCtxService.getCtx( 'graph.legendState.activeView' );
    if( activeLegendView ) {
        //if no accurate category match the node type then classfy to 'Other' category
        var layout = graphModel.graphControl.layout;
        var otherCategory = graphLegendSvc.getLegendCategory( 'objects', 'Other', activeLegendView, false );
        var rootNodes = getVisibleRootNodes( graphModel );

        rawGraphData.nodes.forEach( function( nodeObject ) {
            var type = nodeObject.type.replace( /\s?Revision$/, '' );
            var legendCategory = graphLegendSvc.getLegendCategory( 'objects', type, activeLegendView, false );
            if( !legendCategory ) {
                legendCategory = otherCategory;
            }

            nodeObject.category = legendCategory.internalName;

            if( layout && layout.type === 'ColumnLayout' ) {
                nodeObject.labelText = nodeObject.name;
            }

            if( nodeObject.type === 'onEvent' ) {
                nodeObject.labelText = nodeObject.name;
            }

            //set root node flag
            if( rootNodes.length === 0 && rawGraphData.rootNodes.indexOf( nodeObject.id ) !== -1 ) {
                nodeObject.isRoot = true;
            }
        } );

        if( rawGraphData.edges ) {
            var i = 0;
            rawGraphData.edges.forEach( function( edgeObject ) {
                var legendCategory = graphLegendSvc.getLegendCategory( 'relations', edgeObject.type, activeLegendView, true );
                if( legendCategory ) {
                    edgeObject.category = legendCategory.internalName;

                    //set label text if not have
                    if( !edgeObject.labelText ) {
                        edgeObject.labelText = edgeObject.id;
                    }
                }
            } );
        }

        if( rawGraphData.ports ) {
            i = 0;
            rawGraphData.ports.forEach( function( portObject ) {
                var legendCategory = graphLegendSvc.getLegendCategory( 'ports', portObject.type, activeLegendView, true );
                if( legendCategory ) {
                    portObject.category = legendCategory.internalName;
                    portObject.labelText = 'P' + i;
                    i++;
                }
            } );
        }
    }
};

var updateRootNodeAndCommandTitle = function( graphModel, rawGraphData, node ) {
    var graph = graphModel.graphControl.graph;
    var groupGraph = graphModel.graphControl.groupGraph;
    //set root nodes
    if( node.model.nodeObject.isRoot ) {
        node.isRoot( true );
    }

    graph.setNodeMinSizeConfig( node, [ 20, 20 ] );

    var newBindData = {};
    if( groupGraph.isGroup( node ) ) {
        //collapse the empty group node
        if( groupGraph.isExpanded( node ) && groupGraph.getChildNodes( node ).length === 0 ) {
            groupGraph.setExpanded( node, false );
        }

        if( !groupGraph.isExpanded( node ) ) {
            newBindData.Gc1ToggleChildren_selected = false;
            newBindData.Gc1ToggleChildren_tooltip = 'Show Children';
        }

        if( groupGraph.getParent( node ) ) {
            newBindData.Gc1ExpandParent_tooltip = 'Hide Parent';
        }
    }

    if( node.isInComingExpanded ) {
        newBindData.Gc1ExpandUp_tooltip = 'Hide Incoming Relations';
    }
    if( node.isOutGoingExpanded ) {
        newBindData.Gc1ExpandDown_tooltip = 'Hide Outgoing Relations';
    }
    if( !_.isEmpty( newBindData ) ) {
        graph.updateNodeBinding( node, newBindData );
    }
};

var getPortStyleWithDirection = function( direction ) {
    var style = actionBuilderUtils.portStyle;
    style.direction = direction;

    return style;
};

var updatePortDirection = function( graphModel, edge ) {
    var graph = graphModel.graphControl.graph;
    var sourcePortModel = edge.model.sourcePort;
    var targetPortModel = edge.model.targetPort;
    if( sourcePortModel ) {
        var sourcePortStyle = getPortStyleWithDirection( graphConstants.EdgeDirection.OUT );
        if( sourcePortStyle ) {
            graph.setPortStyle( sourcePortModel.graphItem, sourcePortStyle );
            sourcePortModel.graphItem.direction = graphConstants.EdgeDirection.OUT;
        }
    }
    if( targetPortModel ) {
        var targetPortStyle = getPortStyleWithDirection( graphConstants.EdgeDirection.IN );
        if( targetPortStyle ) {
            graph.setPortStyle( targetPortModel.graphItem, targetPortStyle );
            targetPortModel.graphItem.direction = graphConstants.EdgeDirection.IN;
        }
    }
};

/**
 * Post process after rendering graph data by graph data provider. Application can define some graph layout logic here.
 * This API implementation is optional.
 * @param {Object} graphModel the graph model object
 * @param {Object} rawGraphData the raw graph data
 * @param {Object} graphUpdates the object hold graph updates
 */
export let postDraw = function( graphModel, rawGraphData, graphUpdates ) {
    if( !rawGraphData || !graphUpdates ) {
        return;
    }

    var addedNodes = graphUpdates.newNodes.slice();
    graphUpdates.newEdges.forEach( function( edge ) {
        var sourceNode = edge.getSourceNode();
        var targetNode = edge.getTargetNode();
        addedNodes.push( sourceNode );
        addedNodes.push( targetNode );

        //update port style with direction
        updatePortDirection( graphModel, edge );

        //when edge exist, the nodes relation are expanded
        sourceNode.isOutGoingExpanded = true;
        targetNode.isInComingExpanded = true;
    } );

    //handle group node expansion state and update command tooltip
    _.uniq( addedNodes ).forEach( function( node ) {
        updateRootNodeAndCommandTitle( graphModel, rawGraphData, node );
    } );

    //apply layout for new added graph items
    if( !rawGraphData.isRecall ) {
        graphUpdates.expandedGroupNodes.forEach( function( node ) {
            graphLayout.setExpanded( graphModel.graphControl, node, true );
        } );
        graphLayout.setParent( graphModel.graphControl, null, graphUpdates.parentChangedNodes );

        var context = {
            seedIDs: rawGraphData.rootNodes,
            direction: _directionMap[ rawGraphData.direction ]
        };
        graphLayout.applyLayoutExpand( graphModel, context, graphUpdates.newNodes, graphUpdates.newEdges );

        if( graphModel.isInitial || graphModel.isInitial === undefined ) {
            _.defer( function() {
                graphModel.graphControl.fitGraph();
            } );
            graphModel.isInitial = false;
        }
    } else if( graphModel.graphControl.layout ) {
        graphModel.graphControl.layout.activate( true );
    }
    //log performance time
    performanceTimer.endAndLogTimer( 'Graph Draw Data', 'graphDrawData' );
};

/**
 * Get the node style of given node model.
 * @param {Object} graphModel the graph model object
 * @param {Object} nodeModel the node model object
 * @returns {Object} node style
 */
export let getNodeStyle = function( graphModel, nodeModel ) {
    //basic node style
    if( actionBuilderUtils.isBasicNodeMode( graphModel ) ) {
        return templateService.getNodeTemplate( graphModel.nodeTemplates, null, false, null, true );
    }

    var props = templateService.getBindPropertyNames( nodeModel.nodeObject );
    var flag = templateService.useMultiLevelTemplate( nodeModel.nodeObject );
    return templateService.getNodeTemplate( graphModel.nodeTemplates, props, false, flag, nodeModel.category );
};

/**
 * Get the edge style of given edge model.
 * @param {Object} graphModel the graph model object
 * @param {Object} edgeModel the edge model object
 * @returns {Object} edge style
 */
export let getEdgeStyle = function( graphModel, edgeModel ) {
    var edgeStyle = _.clone( actionBuilderUtils.successStyle );

    var activeLegendView = appCtxService.getCtx( 'graph.legendState.activeView' );
    var legendEdgeStyle = graphLegendSvc.getStyleFromLegend( 'relations', edgeModel.category, activeLegendView );
    if( legendEdgeStyle && !_.isEmpty( legendEdgeStyle ) ) {
        //update edge style from legend edge style
        edgeStyle.dashStyle = legendEdgeStyle.dashStyle;
        edgeStyle.thickness = legendEdgeStyle.thickness;
        edgeStyle.color = legendEdgeStyle.color;
        edgeStyle.isHotSpotEdge = true;
    }

    return edgeStyle;
};

/**
 * Get the port style of given port model.
 * @param {Object} graphModel the graph model object
 * @param {Object} portModel the port model object
 * @returns {Object} port style
 */
export let getPortStyle = function( graphModel, portModel ) {
    return {
        borderColor: 'rgb(60,130,37)',
        borderStyle: 'solid',
        borderWidth: '1px',
        color: 'rgb(60,130,37)',
        dashStyle: 'SOLID',
        fillColor: '(255, 255, 255)',
        portShape: 'CIRCLE',
        rx: 2,
        ry: 2,
        size: 0,
        thickness: 1
    };
};

/**
 * Get the node binding data. This function is only used when the node rendered with SVG template.
 * This API implementation is required.
 * @param {Object} graphModel the graph model object
 * @param {Object} nodeModel the node model object
 * @returns {Object} node style
 */
export let getNodeBindData = function( graphModel, nodeModel ) {
    var nodeObject = nodeModel.nodeObject;
    var props = templateService.getBindPropertyNames( nodeObject );
    var bindData = templateService.getBindProperties( nodeObject, props );

    var nodeStyle = graphLegendSvc.getStyleFromLegend( 'objects', nodeModel.category, appCtxService.getCtx( 'graph.legendState.activeView' ) );
    if( nodeStyle ) {
        bindData.node_fill_color = nodeStyle.borderColor;

        if( nodeModel.modelObject.taskType === 'Event' ) {
            bindData.node_stroke_width = '3px';
            bindData.is_intermidiate_event = 'hidden';
        }
    }

    if( bindData.Name ) {
        bindData.Name_editable = false;
    }

    bindData.has_parent = true;

    return bindData;
};

/**
 * Get the node size of given node model.
 * This API implementation is optional. If not defined, the global default node size will be applied.
 * @param {Object} graphModel the graph model object
 * @param {Object} nodeModel the node model object
 * @returns {Object} node size
 */
export let getNodeSize = function( graphModel, nodeModel ) {
    return actionBuilderUtils.getNodeSize( graphModel, nodeModel );
};

/**
 * Get the minimum node size of given node model.
 * This API implementation is optional. If not defined, the global minimum node size will be applied.
 * @param {Object} graphModel the graph model object
 * @param {Object} nodeModel the node model object
 * @returns {Object} minimum node size
 */
export let getMinNodeSize = function( graphModel, nodeModel ) {
    return {
        width: 20,
        height: 20
    };
};

/**
 * Get the node label configuration
 * This API implementation is optional.
 * @param {Object} graphModel the graph model object
 * @param {Object} nodeModel the node model object
 * @returns {Object} node label configuration object
 */
export let getNodeLabelConfig = function( graphModel, nodeModel ) {
    let contentStyleName = 'aw-widgets-propertyLabel';
    var labelConfig = {
        margin: [ 5, 5, 5, 5 ],
        maxWidth: 200,
        sizeBinding: true,
        contentStyleClass: contentStyleName
    };

    if ( nodeModel.category === 'onEvent' ) {
        labelConfig = {
            hasBorder: false,
            orientation: 'BOTTOM',
            margin: [ 5, 5, 5, 5 ],
            maxWidth: 115,
            contentStyleClass: contentStyleName,
            backgroundStyleClass: 'aw-gctest-circleNodeLabelBackground',
            textAlignment: 'MIDDLE'
        };
        return labelConfig;
    }

    //basic node style
    if( actionBuilderUtils.isBasicNodeMode( graphModel ) && nodeModel.nodeObject.isRoot ) {
        labelConfig = {
            hasBorder: true,
            orientation: 'BOTTOM',
            margin: [ 5, 5, 5, 5 ],
            maxWidth: 250,
            contentStyleClass: 'aw-widgets-cellListCellTitle',
            backgroundStyleClass: 'aw-gctest-circleNodeLabelBackground',
            textAlignment: 'MIDDLE'
        };
    }

    return labelConfig;
};

exports = {
    preDraw,
    postDraw,
    getNodeStyle,
    getEdgeStyle,
    getPortStyle,
    getNodeBindData,
    getNodeSize,
    getMinNodeSize,
    getNodeLabelConfig
};
export default exports;

/* eslint-disable max-lines */
// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/qfm0PFCGraphService
 */
import app from 'app';
import eventBus from 'js/eventBus';
import declUtils from 'js/declUtils';
import templateService from 'js/qfm0FmeaGraphTemplateService';
import _ from 'lodash';
import logger from 'js/logger';
import performanceUtils from 'js/performanceUtils';
import graphLayout from 'js/qfm0FmeaGraphLayout';
import graphConstants from 'js/graphConstants';
import cdm from 'soa/kernel/clientDataModel';
import _localeSvc from 'js/localeService';
import graphPathsService from 'js/graphPathsService';
import appCtxService from 'js/appCtxService';

'use strict';

var exports = {};

var DUMMYNODE = 'DummyNode';

var START_NODE_NAME = 'Start';

var END_NODE_NAME = 'End';

var PFC_SYSTEM_ELEMENT = 'PFC_SystemElement';

var START_EDGE = 'StartEdge';

var END_EDGE = 'EndEdge';

var getVisibleRootNodes = function( graphModel ) {
    var visibleNodes = graphModel.graphControl.graph.getVisibleNodes();
    if( visibleNodes ) {
        return _.filter( visibleNodes, function( item ) {
            return item.isRoot();
        } );
    }
    return [];
};

export let drawGraph = function( ctx, data ) {
    data.graphModel = ctx.graph.graphModel;
    var graphModel = data.graphModel;
    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;

    //start performance timer
    var performanceTimer = performanceUtils.createTimer();

    if( data.hasOwnProperty( 'isInitialGraph' ) ) {
        data.isInitialGraph = false;
    }

    if( !graphModel.nodeMap ) {
        graphModel.nodeMap = {};
        if( data.hasOwnProperty( 'isInitialGraph' ) ) {
            data.isInitialGraph = true;
        }
    }
    if( !graphModel.edgeMap ) {
        graphModel.edgeMap = {};
    }

    var addedNodes = [];
    var addedEdges = [];

    _drawGraph( ctx, data, addedNodes, addedEdges );

    var context = {
        seedIDs: data.seedIDs,
        direction: data.expandDirection
    };

    graphLayout.applyLayoutExpand( graphModel, context, addedNodes, addedEdges );

    eventBus.publish( 'Gc1TestHarness.graphUpdated' );

    //apply graph filters and notify item added event
    graph.updateOnItemsAdded( [].concat( addedNodes, addedEdges ) );

    //log performance time
    performanceTimer.endAndLogTimer( 'Graph Draw Data', 'graphDrawData' );
};
var nodeName = '';
var _drawGraph = function( ctx, data, addedNodes, addedEdges ) {
    var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
    var localTextBundle = _localeSvc.getLoadedText( resource );
    var graphModel = data.graphModel;

    graphModel = ctx.graph.graphModel;

    data.graphData = ctx.graph.graphModel.graphData;

    var graphData = data.graphData;

    var nodeRect = {
        width: 250,
        height: 125,
        x: 200,
        y: 200
    };

    if( !graphModel.structureEdgeDatas ) {
        graphModel.structureEdgeDatas = [];
    }

    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;
    var groupGraph = graphControl.groupGraph;
    var degreeChangedNodes = [];
    var hasRoot = false;
    var operationName;

    if( data.eventData && data.eventData.fmeaElementToAdd ) {
        let fmeaNodeToUpdate = data.eventData.fmeaElementToAdd;
        if( fmeaNodeToUpdate && fmeaNodeToUpdate.length > 0 ) {
            var nodes = graphData.nodes.filter( node => fmeaNodeToUpdate.indexOf( node.nodeId ) > -1 );
            if( nodes.length !== 0 ) {
                graphData.nodes = nodes;
            }
        }
    }
    let processFlowNodesStart = _processFlowChartStartEndGraphData( graphData );
    graphData.nodes = processFlowNodesStart;

    _.forEach( graphData.nodes, function( nodeData ) {
        var nodeObject = cdm.getObject( nodeData.metaObject.uid );

        //Node data to be bind in SVG template
        if( !graphModel.nodeMap[ nodeData.nodeId ] ) {
            var template;
            var bindData;
            var nodeCategory;
            var node_shape = nodeData.props.node_shape;
            var process_sub_type = nodeData.props.process_sub_type;
            var isGroup = nodeData.props.is_group === 'true';

            if( nodeObject === null ) {
                nodeCategory = DUMMYNODE;
                if( addedNodes.length === 0 ) {
                    nodeName = START_NODE_NAME;
                } else {
                    nodeName = END_NODE_NAME;
                }
            } else {
                nodeCategory = PFC_SYSTEM_ELEMENT;
            }

            var props = templateService.getBindPropertyNames( nodeObject, nodeCategory, nodeName );
            template = templateService.getNodeTemplate( graphModel.nodeTemplates, props, isGroup, nodeCategory );
            if( !template ) {
                if( nodeObject ) {
                    logger.error( 'Failed to get SVG template for node object. Skip drawing the node. Object UID: ' + nodeObject.uid );
                }
                return;
            }

            bindData = templateService.getBindProperties( nodeObject, props, nodeCategory, nodeName );

            let nodeColor = graphData.processFlowChartGroup.filters.find( obj => obj.name === nodeData.props.Group );

            if( nodeColor ) {
                bindData.node_fill_color = `rgb(${nodeColor.color.redValue},${nodeColor.color.greenValue},${nodeColor.color.blueValue})`;
            }

            if( bindData.Name ) {
                bindData.Name_editable = true;
            }
            if( bindData.Sequence ) {
                bindData.Sequence_editable = localTextBundle.qfm0Sequence + ':';
            }
            if( bindData.Revision ) {
                bindData.Revision_editable = true;
            }
            bindData.node_child = localTextBundle.qfm0ChildElementCommand;
            bindData.node_parent = localTextBundle.qfm0Parent;

            bindData.partialExpandInCommand = 'Qfm0OnNodePartialExpandIn';
            bindData.partiaExpandOutCommand = 'Qfm0OnNodePartialExpandOut';
            bindData.isImageClickable = true;

            bindData.node_shape = node_shape;
            bindData.process_sub_type = process_sub_type;

            //fill node command binding data
            if( graphModel.nodeCommandBindData ) {
                declUtils.consolidateObjects( bindData, graphModel.nodeCommandBindData );
            }

            var node = graph.createNodeWithBoundsStyleAndTag( nodeRect, template, bindData );

            // use this API if applciation want to set node minimum size per node.
            // application also can configure it in viewModel for overall settings
            // the array is minumum node size [width, hight]
            var MIN_NODE_SIZE = [ 300, 125 ];
            graph.setNodeMinSizeConfig( node, MIN_NODE_SIZE );

            node.initPosition = nodeRect;

            node.appData = {
                id: nodeData.nodeId,
                nodeObject: nodeObject,
                isGroup: isGroup,
                category: nodeCategory
            };

            // record all added nodes
            addedNodes.push( node );

            var labelText = '';
            var prop;
            if( nodeObject === null && addedNodes.length === 1 ) {
                labelText = START_NODE_NAME;
            } else {
                labelText = END_NODE_NAME;
            }
            if( nodeObject && nodeObject.props ) {
                prop = nodeObject.props.object_name;
                if( !prop ) {
                    prop = nodeObject.props.object_string;
                }
            }

            if( prop ) {
                labelText = prop.getDisplayValue();
            }

            var labelConfiguration;

            //simulate application's root node
            if( nodeObject && !hasRoot && getVisibleRootNodes( graphModel ).length === 0 && node.appData.nodeObject.uid === graphData.rootUID ) {
                node.isRoot( true );
                hasRoot = true;
                graphModel.rootId = node.appData.nodeObject.uid;

                labelConfiguration = {
                    hasBorder: true,
                    orientation: 'BOTTOM',
                    margin: [ 5, 5, 5, 5 ],
                    maxWidth: 250,
                    contentStyleClass: 'aw-widgets-cellListCellTitle',
                    backgroundStyleClass: 'aw-gctest-circleNodeLabelBackground',
                    textAlignment: 'MIDDLE'
                };
            } else {
                labelConfiguration = {
                    margin: [ 5, 5, 5, 5 ],
                    maxWidth: 200,
                    sizeBinding: true,
                    contentStyleClass: 'aw-widgets-cellListCellTitle'
                };
            }

            if( isGroup ) {
                groupGraph.setAsGroup( node );
                var expanded = Boolean( nodeData.isExpanded );
                node.expanded = expanded;
            }

            //build node map to help create edges
            graphModel.nodeMap[ nodeData.nodeId ] = node;

            if( data.isBasicNodeApply ) {
                graph.setLabel( node, labelText, labelConfiguration );
            }
        }
    } );
    if( data.fmeaElementToAdd && data.fmeaElementToAdd.length > 0 ) {
        operationName = 'nodeAddition';
    }
    exports.drawEdge( data, false, degreeChangedNodes, addedEdges, operationName );
    degreeChangedNodes = _.uniq( degreeChangedNodes );

    if( graphModel.isShowLabel === false ) {
        graph.showLabels( graphModel.isShowLabel );
    }

    //handle group node expansion state and update command tooltip
    _.forEach( _.uniq( addedNodes.concat( degreeChangedNodes ) ), function( node ) {
        var newBindData = {};
        if( node.expanded === false ) {
            groupGraph.setExpanded( node, false );
            graphLayout.setExpanded( graphControl, node, false );

            newBindData.Gc1ToggleChildren_selected = false;
            newBindData.Gc1ToggleChildren_tooltip = getChildrenTooltip( node, true ); //localTextBundle.qfm0Expand;
        }

        if( !_.isEmpty( newBindData ) ) {
            graph.updateNodeBinding( node, newBindData );
        }
    } );

    if( !graphModel.categoryApi ) {
        initGraphCategoryApi( graphModel );
    }
};

/** This function appends startNode before the first node and endNode after the last node in the array from the SOA response.
 * @param {object} graphData
 * @returns {Array} - processFlowChartGraphData - Containing start and end nodes
 **/
function _processFlowChartStartEndGraphData( graphData ) {
    var processFlowChartGraphData = [];

    // Adding Start Node as first element in Graph
    var nodeStart = {
        nodeId: 'StartNode',
        nodeName: 'StartNode',
        metaObject: {
            props: {
                object_name: {
                    uiValues: [ 'object_name\\:StartNode' ]
                }
            },
            uid: 'StartNode',
            name: 'StartNode',
            type: 'StartNode',
            parentId: null
        },
        props: {
            Group: DUMMYNODE,
            in_degree: '0',
            out_degree: '1'
        }
    };
    var nodeEnd = {
        nodeId: 'EndNode',
        nodeName: 'EndNode',
        metaObject: {
            props: {
                object_name: {
                    uiValues: [ 'object_name\\:EndNode' ]
                }
            },
            uid: 'EndNode',
            name: 'EndNode',
            type: 'EndNode',
            parentId: null
        },
        props: {
            Group: DUMMYNODE,
            in_degree: '1',
            out_degree: '0'
        }
    };
    processFlowChartGraphData.push( nodeStart );
    for( var index = 0; index < graphData.nodes.length; index++ ) {
        processFlowChartGraphData.push( graphData.nodes[ index ] );
    }
    processFlowChartGraphData.push( nodeEnd );
    return processFlowChartGraphData;
}

/**  Function returns modelObjects
 * @param {object} object -
 * @param {object} relatedWhys -
 * @returns {relatedWhys}
 **/
function _processFlowChartStartEndEdge( graphData, graphModel ) {
    var processFlowGraphData = [];

    // Adding Start Node as first element in Graph
    var edgestart = {
        leftId: graphData.nodes[ 0 ].metaObject.uid,
        rightId: graphData.nodes[ 1 ].metaObject.uid,
        relationType: '',
        metaObject: {
            uid: START_EDGE
        }
    };
    var edgeend = {
        leftId: graphData.nodes[ graphData.nodes.length - 2 ].metaObject.uid,
        rightId: graphData.nodes[ graphData.nodes.length - 1 ].metaObject.uid,
        relationType: '',
        metaObject: {
            uid: END_EDGE
        }
    };
    processFlowGraphData.push( edgestart );
    for( var index = 0; index < graphData.edges.length - 1; index++ ) {
        processFlowGraphData.push( graphData.edges[ index ] );
    }
    processFlowGraphData.push( edgeend );
    return processFlowGraphData;
}

var getChildrenTooltip = function( node, expanded ) {
    let childrenTooltip;
    var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
    var localTextBundle = _localeSvc.getLoadedText( resource );

    return childrenTooltip;
};
/**
 * Initialize the category API on graph model.
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
        }
    };
};
/**
 * to draw edge
 * @param {Object} data - viewmodel data
 * @param {boolean} isConvert - to check convertable
 * @param { number} degreeChangedNodes - change node
 * @param {object} addedEdges - edges
 * @returns {Array} addedEdges - added edged
 */
export let drawEdge = function( data, isConvert, degreeChangedNodes, addedEdges, operationName ) {
    var graphData = data.graphData;
    var graphModel = data.graphModel;
    var graph = graphModel.graphControl.graph;
    var edgeIdForRemoval;
    var removedEdge;

    if( !addedEdges ) {
        addedEdges = [];
    }
    let processFlowChartStartEdge = _processFlowChartStartEndEdge( graphData, data.graphModel );
    graphData.edges = processFlowChartStartEdge;

    if( graphData.edges.length === 2 && graphData.nodes.length === 2 ) {
        graphData.edges.splice( 0, 1 );
    }
    if( operationName && operationName === 'nodeAddition' ) {
        var edgeKeys = Object.keys( graphModel.edgeMap );
        var edgeForRemoval;
        _.forEach( edgeKeys, function( edge ) {
            if( edge.indexOf( 'EndNode' ) > -1 ) {
                edgeForRemoval = edge;
            }
        } );

        edgeIdForRemoval = graphModel.edgeMap[ edgeForRemoval ];
        removedEdge = graphModel.edgeMap[ edgeForRemoval ];
    } else if( operationName && operationName === 'sysEleTypeChangedFromInfoPanel' ) {
        _.forEach( graphModel.edgeMap, function( edgeData ) {
            if( edgeData.edgeData.rightId === data.eventData.nodes[ 0 ].appData.id ) {
                removedEdge = edgeData;
            }
        } );
        edgeIdForRemoval = removedEdge;

        var newEdgeLeftId = edgeIdForRemoval.edgeData.leftId;
        var newEdgeRightId = '';
        var splittedArr = [];
        _.forEach( Object.keys( graphModel.edgeMap ), function( key ) {
            splittedArr = key.split( '_' );
            if( splittedArr[ 2 ] && splittedArr[ 1 ] === data.eventData.nodes[ 0 ].appData.id ) {
                newEdgeRightId = splittedArr[ 2 ];
            }
        } );

        var newEdge = { leftId: newEdgeLeftId, rightId: newEdgeRightId, metaObject: { uid: 'AAAAAAAAAAAAAA' }, relationType: '' };

        graphData.edges.push( newEdge );
    }

    if( graphModel.graphControl.layout.itemsToBeRemoved ) {
        const filteredArr = graphModel.graphControl.layout.itemsToBeRemoved.edges.filter( ( elem ) => elem !== undefined );
        graphModel.graphControl.layout.itemsToBeRemoved.edges = filteredArr;
        if( removedEdge && removedEdge !== undefined ) {
            graphModel.graphControl.graph.removeEdges( [ removedEdge ], true );
        }
    }
    if( edgeIdForRemoval && edgeIdForRemoval !== undefined ) {
        delete graphModel.edgeMap[ edgeIdForRemoval ];
        eventBus.publish( 'awGraph.itemsRemoved', { edges: [ edgeIdForRemoval ] } );
    }

    _.uniq( graphData.edges );
    _.forEach( graphData.edges, function( edgeData ) {
        var edgeId = constructEdgeIdFromEdgeData( edgeData );
        if( !graphModel.edgeMap[ edgeId ] ) {
            var sourceNode = graphModel.nodeMap[ edgeData.leftId ];
            var targetNode = graphModel.nodeMap[ edgeData.rightId ];
            if( !sourceNode || !targetNode ) {
                logger.error( 'Failed to get source or target node. Skip drawing the edge: ' + edgeData.leftId +
                    ' to ' + edgeData.rightId );
                return;
            }

            var edgeCategory = edgeData.relationType;
            //get default edge style
            var defaultEdgeStyle = graphModel.config.defaults.edgeStyle;
            var edge = createEdge( data, edgeData, defaultEdgeStyle, sourceNode, targetNode, isConvert );

            if( degreeChangedNodes ) {
                degreeChangedNodes.push( sourceNode );
                degreeChangedNodes.push( targetNode );
            }
            if( edge ) {
                var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
                var localTextBundle = _localeSvc.getLoadedText( resource );

                let edgeName = localTextBundle.qfm0SystemElementCommand;

                graph.setLabel( edge, edgeName );
                var edgeLabel = edge.getLabel();
                edgeLabel.setVisible( false );
                edge.category = edgeCategory;
                edge.edgeData = edgeData;
                graphModel.edgeMap[ edgeId ] = edge;

                // record all added edges
                addedEdges.push( edge );
            }
        }
    } );
    return addedEdges;
};

var constructEdgeIdFromEdgeData = function( edgeData ) {
    var uid = null;

    if( edgeData.metaObject && edgeData.metaObject.uid ) {
        uid = edgeData.metaObject.uid;
    }

    //check if the uid is not present/'AAAAAAAAAAAAA'/EndEdge as the edges need to be updated accordingly on add/edit/delete of node
    if( !uid || uid === 'AAAAAAAAAAAAAA' || uid === 'EndEdge' ) {
        var context = [ edgeData.relationType, edgeData.leftId, edgeData.rightId ];
        if( edgeData.startPortObject && edgeData.startPortObject.uid ) {
            context.concat( edgeData.startPortObject.uid );
        }
        if( edgeData.endPortObject && edgeData.endPortObject.uid ) {
            context.concat( edgeData.endPortObject.uid );
        }
        uid = _.join( context, '_' );
    }
    return uid;
};

/*
 * Create edge internal
 */
var createEdge = function( data, edgeData, defaultEdgeStyle, sourceNode, targetNode, isConvert ) {
    var graphModel = data.graphModel;
    var graph = graphModel.graphControl.graph;
    var groupGraph = graphModel.graphControl.groupGraph;
    var graphControl = graphModel.graphControl;

    var edge;
    var edgeStyle = {};

    if( defaultEdgeStyle ) {
        //update edge style from default edge style
        edgeStyle.dashStyle = defaultEdgeStyle.dashStyle;
        edgeStyle.thickness = defaultEdgeStyle.thickness;
        edgeStyle.color = defaultEdgeStyle.color;
        edgeStyle.isHotSpotEdge = true;
        edgeStyle.targetArrow = defaultEdgeStyle.targetArrow;
    }

    if( sourceNode && targetNode ) {
        if( edgeData.relationType.localeCompare( 'Structure' ) === 0 ) {
            if( !isConvert ) {
                graphModel.structureEdgeDatas.push( edgeData );
            }

            if( !groupGraph.isGroup( sourceNode ) ) {
                var props = templateService
                    .getBindPropertyNames( sourceNode.appData.nodeObject, sourceNode.appData.category );
                var nodeStyle = templateService.getNodeTemplate( graphModel.nodeTemplates,
                    props, true );
                var bindData = {};
                bindData.HEADER_HEIGHT = nodeStyle.initialBindData.HEADER_HEIGHT;
                graph.setNodeStyle( sourceNode, nodeStyle, bindData );
                if( !graph.isNetworkMode() ) {
                    bindData.HEADER_HEIGHT = sourceNode.getHeight();
                }

                groupGraph.setAsGroup( sourceNode );
                sourceNode.setGroupingAllowed( true );
            }
            if( sourceNode !== groupGraph.getParent( targetNode ) ) {
                groupGraph.setParent( sourceNode, [ targetNode ] );
                graphLayout.setParent( graphModel.graphControl, null, [ targetNode ] );
            }
            if( !isConvert ) {
                sourceNode.expanded = true;
                var newBindData = {};
                groupGraph.setExpanded( sourceNode, true );
                graphLayout.setExpanded( graphControl, sourceNode, true );

                newBindData.Gc1ToggleChildren_selected = true;
                newBindData.Gc1ToggleChildren_tooltip = getChildrenTooltip( sourceNode, false ); //localTextBundle.qfm0Expand;

                if( !_.isEmpty( newBindData ) ) {
                    graph.updateNodeBinding( sourceNode, newBindData );
                }
            }

            if( graph.isNetworkMode() ) {
                edge = graph.createEdgeWithNodesStyleAndTag( sourceNode, targetNode, edgeStyle, null );
            }
        } else {
            edge = graph.createEdgeWithNodesStyleAndTag( sourceNode, targetNode, edgeStyle, null );
            if( edgeData.edgePosition ) {
                graph.setEdgePosition( edge, edgeData.edgePosition );
                edge.initPosition = edgeData.edgePosition;
            }
            sourceNode.isOutGoingExpanded = true;
            targetNode.isInComingExpanded = true;
        }
    }
    return edge;
};

/**
 * updateNodeBindingData
 */
function updateNodeBindingData( graph, node ) {
    var bindData = {};

    var filteredInEdgeCount = Number( node.appData.inDegrees );
    var filteredOutEdgeCount = Number( node.appData.outDegrees );

    bindData.filtered_in_degree = filteredInEdgeCount.toString();
    bindData.filtered_out_degree = filteredOutEdgeCount.toString();

    var inEdges = node.getEdges( graphConstants.EdgeDirection.IN );
    var visibleInEdges = _.filter( inEdges, function( edge ) {
        return edge.isVisible();
    } );
    var visibleInEdgesCount = visibleInEdges.length;

    var outEdges = node.getEdges( graphConstants.EdgeDirection.OUT );
    var visibleOutEdges = _.filter( outEdges, function( edge ) {
        return edge.isVisible();
    } );
    var visibleOutEdgesCount = visibleOutEdges.length;

    bindData.visible_in_degree = visibleInEdgesCount.toString();
    bindData.visible_out_degree = visibleOutEdgesCount.toString();

    bindData.incoming_all_shown = false;
    bindData.incoming_show_expand_button = false;
    bindData.incoming_show_partial_expand_button = false;

    if( filteredInEdgeCount > 0 ) {
        if( visibleInEdgesCount > 0 ) {
            if( visibleInEdgesCount === filteredInEdgeCount ) {
                bindData.incoming_show_expand_button = true;
                bindData.incoming_all_shown = true;
            } else {
                bindData.incoming_show_partial_expand_button = true;
            }
        } else {
            bindData.incoming_show_expand_button = true;
        }
    }

    bindData.outgoing_all_shown = false;
    bindData.outgoing_show_expand_button = false;
    bindData.outgoing_show_partial_expand_button = false;

    if( filteredOutEdgeCount > 0 ) {
        if( visibleOutEdgesCount > 0 ) {
            if( visibleOutEdgesCount === filteredOutEdgeCount ) {
                bindData.outgoing_show_expand_button = true;
                bindData.outgoing_all_shown = true;
            } else {
                bindData.outgoing_show_partial_expand_button = true;
            }
        } else {
            bindData.outgoing_show_expand_button = true;
        }
    }

    graph.updateNodeBinding( node, bindData );
}

export let updateRelationCounts = function( graphModel ) {
    try {
        var graphControl = graphModel.graphControl;
        var graph = graphControl.graph;

        var visibleNodes = graph.getVisibleNodes();

        // Check each node and verify counts
        _.forEach( visibleNodes, function( node ) {
            // Update the binding data
            updateNodeBindingData( graph, node );
        } );
    } catch ( ex ) {
        logger.debug( ex );
    }
};

/**
 * Toggle child node expand for the given node
 * @param {Object} graphModel - graphmodel object
 * @param {Object} node - node object
 */
export let toggleChildrenExpansion = function( graphModel, node ) {
    if( graphModel && node && node.getItemType() === 'Node' ) {
        var graphControl = graphModel.graphControl;
        var groupGraph = graphControl.groupGraph;

        if( !groupGraph.isGroup( node ) ) {
            return;
        }

        //start performance timer
        var performanceTimer = performanceUtils.createTimer();

        var isExpanded = groupGraph.isExpanded( node );
        var children = groupGraph.getChildNodes( node );
        if( !isExpanded && children.length === 0 && node.appData.nodeObject ) {
            eventBus.publish( 'Gc1TestHarness.expandOutgoing', {
                rootIDs: [ node.appData.nodeObject.uid ],
                expandDirection: graphConstants.ExpandDirection.FORWARD,
                expansionType: 'structure'
            } );
        } else {
            groupGraph.setExpanded( node, !isExpanded );
            graphLayout.setExpanded( graphControl, node, !isExpanded );

            eventBus.publish( 'Gc1TestHarness.graphUpdated' );
        }

        //update command selection state
        var bindData = node.getAppObj();
        var newBindData = {};
        newBindData.Gc1ToggleChildren_selected = !bindData.Gc1ToggleChildren_selected;
        newBindData.Gc1ToggleChildren_tooltip = getChildrenTooltip( node, isExpanded );
        graphControl.graph.updateNodeBinding( node, newBindData );
        //log performance time
        if( isExpanded ) {
            performanceTimer.endAndLogTimer( 'Graph Group Collapse', 'graphGroupCollapse' );
        } else {
            performanceTimer.endAndLogTimer( 'Group Expand Down', 'graphGroupExpandDown' );
        }
    }
};

/**
 *  toggle outgoing action in node
 * @param {Object} graphModel - graph model
 * @param {Object} node - node
 */
export let toggleOutgoingEdges = function( graphModel, node ) {
    if( graphModel && node && node.appData.nodeObject ) {
        var performance = performanceUtils.createTimer();

        var edges = node.getEdges( graphConstants.EdgeDirection.OUT );
        var visibleEdges = _.filter( edges, function( edge ) {
            return edge.isVisible();
        } );

        if( visibleEdges.length > 0 ) {
            var graph = graphModel.graphControl.graph;

            graph.removeEdges( edges );
            exports.resolveConnectedGraph( graphModel );
        } else {
            eventBus.publish( 'Rv1RelationsBrowser.expandGraph', {
                rootIDs: [ node.appData.nodeObject.uid ],
                expandDirection: graphConstants.ExpandDirection.FORWARD
            } );
        }
        updateSelections( graphModel );

        performance.endAndLogTimer( 'Graph Expand/Collapse Down Relations', 'toggleOutgoingEdges' );
    }
};

/**
 *  toggle incoming action in node
 * @param {Object} graphModel - graph model
 * @param {Object} node - node
 */
export let toggleIncomingEdges = function( graphModel, node ) {
    if( graphModel && node && node.appData.nodeObject ) {
        var performance = performanceUtils.createTimer();

        var edges = node.getEdges( graphConstants.EdgeDirection.IN );
        var visibleEdges = _.filter( edges, function( edge ) {
            return edge.isVisible();
        } );

        if( visibleEdges.length > 0 ) {
            var graph = graphModel.graphControl.graph;

            graph.removeEdges( edges );
            exports.resolveConnectedGraph( graphModel );
        } else {
            eventBus.publish( 'Rv1RelationsBrowser.expandGraph', {
                rootIDs: [ node.appData.nodeObject.uid ],
                expandDirection: graphConstants.ExpandDirection.BACKWARD
            } );
        }
        updateSelections( graphModel );

        performance.endAndLogTimer( 'Graph Expand/Collapse Up Relations', 'toggleIncomingEdges' );
    }
};

/**
 * update selection on Incoming and Outgoing toggle.
 * @param {Object} graphModel - - graphmodel object
 */
let updateSelections = function( graphModel ) {
    var currentSelectedNodes = graphModel.graphControl.getSelected( 'Node' );
    var currentSelectedEdges = graphModel.graphControl.getSelected( 'Edge' );
    var selectedItems = _.concat( currentSelectedNodes, currentSelectedEdges );

    graphModel.numSelected = selectedItems ? selectedItems.length : 0;
    graphModel.selectedEdgesCount = currentSelectedEdges ? currentSelectedEdges.length : 0;
    if( graphModel.selectedEdgesCount === 1 ) {
        graphModel.singleSelectedEdge = currentSelectedEdges[ 0 ];
    } else {
        graphModel.singleSelectedEdge = null;
    }
};

/**
 * to resolve newly added/removed nodes
 * @param {Object} graphModel - graphmodel object
 */
export let resolveConnectedGraph = function( graphModel ) {
    var unconnectedItems = [];
    //based on all visible graph items
    var visibleNodes = graphModel.graphControl.graph.getNodes();
    if( visibleNodes ) {
        var rootNodes = getVisibleRootNodes( graphModel );
        if( rootNodes && rootNodes.length > 0 ) {
            var connectedItems;
            connectedItems = graphPathsService.getConnectedGraph( rootNodes, getNextLevelNodes( graphModel ) );
            unconnectedItems = _.difference( visibleNodes, connectedItems );
        }
    }
    graphModel.graphControl.graph.removeNodes( unconnectedItems );
};

/**
 *
 * @param {Object} graphModel - graphmodel objet
 * @returns {Array} list of next lavel nodes
 */
var getNextLevelNodes = function( graphModel ) {
    return function( node ) {
        var nextLevelNodes = [];
        var groupedGraph = graphModel.graphControl.groupGraph;
        if( node.getItemType() !== 'Node' ) {
            return;
        }
        var edges = node.getEdges();

        var visibleEdges = _.filter( edges, function( edge ) {
            return !edge.isFiltered();
        } );

        _.forEach( visibleEdges, function( edge ) {
            if( edge.getSourceNode() === node ) {
                var targetNode = edge.getTargetNode();
                if( targetNode ) {
                    nextLevelNodes.push( targetNode );
                }
            } else if( edge.getTargetNode() === node ) {
                var sourceNode = edge.getSourceNode();
                if( sourceNode ) {
                    nextLevelNodes.push( sourceNode );
                }
            }
        } );

        var children = node.getGroupMembers();
        var parent = groupedGraph.getParent( node );
        if( children ) {
            nextLevelNodes = nextLevelNodes.concat( children );
        }
        if( parent ) {
            nextLevelNodes.push( parent );
        }

        nextLevelNodes = _.uniq( nextLevelNodes );

        nextLevelNodes = _.filter( nextLevelNodes, function( node ) { return !node.isFiltered(); } );
        return nextLevelNodes;
    };
};
/**
 * Hook to event awGraph.itemsRemoved
 *
 * when app detects node removal event, should also remove these nodes from layout to avoid layout crash.
 */
export let itemsRemovedFromGraph = function( graphModel, eventData ) {
    if( !eventData ) {
        return;
    }

    var layout = graphModel.graphControl.layout;
    graphLayout.updateToLayout( layout, 'itemsRemoved', eventData );
    exports.updateNodeMap( graphModel, eventData.nodes );
    exports.updateEdgeMap( graphModel, eventData.edges );
    resolveConnectedGraph( graphModel );

    eventBus.publish( 'Gc1TestHarness.graphUpdated' );
};

export let updateNodeMap = function( graphModel, nodes ) {
    if( graphModel && graphModel.graphControl.graph ) {
        if( nodes ) {
            _.forEach( nodes, function( node ) {
                _.forEach( graphModel.nodeMap, function( value, key ) {
                    if( value === node ) {
                        delete graphModel.nodeMap[ key ];
                    }
                } );
            } );
        }
    }
};

export let updateEdgeMap = function( graphModel, edges ) {
    if( graphModel && graphModel.graphControl.graph ) {
        if( edges ) {
            _.forEach( edges, function( item ) {
                _.forEach( graphModel.edgeMap, function( value, key ) {
                    if( value === item ) {
                        delete graphModel.edgeMap[ key ];
                    }
                } );
            } );
        }
    }
};

export let onGraphUpdated = function( graphModel ) {
    if( !graphModel ) {
        return;
    }
    var graphControl = graphModel.graphControl;
    //start performance timer
    var performanceTimer = performanceUtils.createTimer();

    // auto adjust the graph to fit in given area
    graphControl.layout.applyLayout();
    graphModel.graphControl.fitGraph();

    graphLayout.applyLayoutUpdate( graphControl );

    //log performance time
    performanceTimer.endAndLogTimer( 'Render', 'graphRenderDone' );
};

export let performDeleteFromFmeaGraph = function( ctx, data ) {
    if( !ctx.graph ) {
        return;
    }
    var graphModel = ctx.graph.graphModel;
    if( !graphModel ) {
        return;
    }

    var nodes = graphModel.graphControl.getSelected( 'Node' );
    var nodesArr = [];
    for( var i = 0; i < nodes.length; i++ ) {
        for( var j = 0; j < data.eventData.deleteElementResponse.length; j++ ) {
            if( nodes[ i ].appData.id === data.eventData.deleteElementResponse[ j ] ) {
                nodesArr.push( nodes[ i ] );
                break;
            }
        }
    }
    if( nodesArr.length < 1 ) {
        return;
    }
    var edgeData = [];

    _.forEach( ctx.graph.graphModel.edgeMap, function( edgeInfo ) {
        var edgeObject = edgeInfo.edgeData;
        edgeData.push( edgeObject );
    } );

    var graphControl = graphModel.graphControl;
    var groupGraph = graphControl.groupGraph;
    var graph = graphControl.graph;
    var layout = graphModel.graphControl.layout;

    var parentArr = [];

    for( var i = 0; i < nodesArr.length; i++ ) {
        var sourceNode;
        var uid = nodesArr[ i ].appData.id;

        for( var j = 0; j < edgeData.length; j++ ) {
            if( uid === edgeData[ j ].rightId ) {
                sourceNode = graphModel.nodeMap[ edgeData[ j ].leftId ];
                break;
            }
        }
        if( sourceNode ) {
            var filteredOutEdgeCount = Number( sourceNode.appData.outDegrees );
            var newFilteredOutEdgeCount = filteredOutEdgeCount - 1;
            sourceNode.appData.outDegrees = newFilteredOutEdgeCount.toString();
        }
        var parent = graphControl.groupGraph.getParent( nodesArr[ i ] );
        if( parent ) {
            parentArr.push( parent );
        }
    }

    var edges;
    edges = graphModel.graphControl.graph.getVisibleEdges();
    var edgesToRemove = [];
    if( edges.length > 0 ) {
        for( var i = 0; i < edges.length; i++ ) {
            for( var j = 0; j < data.eventData.deleteElementResponse.length; j++ ) {
                if( edges[ i ].edgeData.rightId === data.eventData.deleteElementResponse[ j ] ) {
                    edgesToRemove.push( edges[ i ] );
                    break;
                }
            }
        }
    }

    graphModel.graphControl.graph.removeNodes( nodesArr, true );
    if( edgesToRemove.length > 0 ) {
        graphModel.graphControl.graph.removeEdges( edgesToRemove, true );
    }

    for( var i = 0; i < nodesArr.length; i++ ) {
        var index = graphModel.graphData.nodes.findIndex( function( node ) {
            return node.nodeId === nodesArr[ i ].appData.id;
        } );
        if( index > -1 ) {
            graphModel.graphData.nodes.splice( index, 1 );
        }
    }

    var uniqueParentObjs = [];
    _.forEach( parentArr, function( parentObject ) {
        if( !uniqueParentObjs.includes( parentObject ) ) {
            uniqueParentObjs.push( parentObject );
        }
    } );

    _.pullAll( uniqueParentObjs, nodesArr );

    if( uniqueParentObjs.length > 0 ) {
        for( var i = 0; i < uniqueParentObjs.length; i++ ) {
            var children = groupGraph.getChildNodes( uniqueParentObjs[ i ] );
            if( !children || children.length === 0 ) {
                uniqueParentObjs[ i ].appData.isGroup = false;
                var nodeObject = uniqueParentObjs[ i ].appData.nodeObject;
                if( graphModel && nodeObject ) {
                    //update group node to normal node
                    var props = templateService.getBindPropertyNames( nodeObject, uniqueParentObjs[ i ].category );
                    var nodeStyle = templateService.getNodeTemplate( graphModel.nodeTemplates,
                        props, false );
                    var bindData = {
                        HEADER_HEIGHT: 0
                    };
                    graph.setNodeStyle( uniqueParentObjs[ i ], nodeStyle, bindData );
                    groupGraph.setExpanded( uniqueParentObjs[ i ], false );
                    groupGraph.setAsLeaf( uniqueParentObjs[ i ] );
                    graph.setBounds( uniqueParentObjs[ i ], uniqueParentObjs[ i ].getResizeMinimumSize() );
                }
            }
        }
    }

    if( nodes.length === nodesArr.length ) {
        var graphNode = graphModel.nodeMap[ graphModel.rootId ];
        if( graphNode ) {
            graphModel.graphControl.setSelected( [ graphNode ], true );
        }
    }

    layout.applyLayout();

    eventBus.publish( 'Gc1TestHarness.graphUpdated' );
};

/**
 * This function updates the out-degree and and in-degree of the node selected based on expansion
 * @param {data} data graph data
 * @param {appctxservice} ctx
 */
export let updateSeedNodeDegree = function( data, ctx ) {
    data.graphModel = ctx.graph.graphModel;
    var graphModel = data.graphModel;

    var isDirectionForward;
    var idx;
    var node;

    data.graphData = ctx.graph.graphModel.graphData;
    var graphData = data.graphData;
    var nodeMapObjKeysArr = Object.keys( graphModel.nodeMap );

    if( data.eventData && data.eventData.rootIDs && data.eventData.rootIDs.length > 0 ) {
        _.forEach( data.eventData.rootIDs, function( rootId ) {
            if( nodeMapObjKeysArr.length === 2 ) {
                node = graphModel.nodeMap.StartNode;
            } else {
                idx = graphData.nodes.length - data.eventData.fmeaElementToAdd.length - 1;
                rootId = graphData.nodes[ idx ].nodeId;
                isDirectionForward = false;
                node = graphModel.nodeMap[ rootId ];
            }
        } );
    }
    eventBus.publish( 'Gc1TestHarness.graphUpdated' );
};

/**
 * Update graph after deleting relations by selecting relation edges
 * @param {Object} ctx
 * @param {Object} data
 */
export let updateGraphAfterDeletingRelations = function( ctx, data ) {
    if( !ctx.graph ) {
        return;
    }
    var graphModel = ctx.graph.graphModel;
    if( !graphModel ) {
        return;
    }

    if( data.deletedRelationObjects && data.deletedRelationObjects.length > 0 ) {
        var edgesToRemove = [];
        var selectedEdges = graphModel.graphControl.getSelected( 'Edge' );
        var filteredEdge = null;
        data.deletedRelationObjects.forEach( function( deletedRelationId ) {
            filteredEdge = null;
            filteredEdge = selectedEdges.find( function( edge ) {
                if( edge && edge.edgeData && edge.edgeData.metaObject && edge.edgeData.metaObject.uid ) {
                    return edge.edgeData.metaObject.uid === deletedRelationId;
                }
            } );
            if( filteredEdge ) {
                edgesToRemove.push( filteredEdge );
            }
        } );

        graphModel.graphControl.graph.removeEdges( edgesToRemove, true );
        var visibleNodes = graphModel.graphControl.graph.getVisibleNodes();
        var nodeMapObjKeysArr = Object.keys( graphModel.nodeMap );

        edgesToRemove.forEach( function( edge ) {
            if( edge.edgeData ) {
                // For edge's left node
                let leftNodeId = edge.edgeData.leftId;
                let leftNode = visibleNodes.find( function( node ) {
                    if( node.appData ) {
                        return node.appData.id === leftNodeId;
                    }
                } );
                if( leftNode ) {
                    let leftNodeIndex = nodeMapObjKeysArr.indexOf( leftNodeId );
                    if( leftNodeIndex > -1 ) {
                        graphModel.nodeMap[ nodeMapObjKeysArr[ leftNodeIndex ] ].appData.outDegrees = ( Number( graphModel.nodeMap[ nodeMapObjKeysArr[ leftNodeIndex ] ].appData.outDegrees ) -
                            1 ).toString();
                    }
                }

                // For edge's right node
                let rightNodeId = edge.edgeData.rightId;
                let rightNode = visibleNodes.find( function( node ) {
                    if( node.appData ) {
                        return node.appData.id === rightNodeId;
                    }
                } );
                if( rightNode ) {
                    let rightNodeIndex = nodeMapObjKeysArr.indexOf( rightNodeId );
                    if( rightNodeIndex > -1 ) {
                        graphModel.nodeMap[ nodeMapObjKeysArr[ rightNodeIndex ] ].appData.inDegrees = ( Number( graphModel.nodeMap[ nodeMapObjKeysArr[ rightNodeIndex ] ].appData.inDegrees ) -
                            1 ).toString();
                    }
                }
            }
        } );
    }
    let selectedEdgesAfterDeletion = graphModel.graphControl.getSelected( 'Edge' );
    ctx.graph.graphModel.selectedEdgesCount = selectedEdgesAfterDeletion ? selectedEdgesAfterDeletion.length : 0;
};

/**  Function is to update Graph Node once the selected object is updated from Info Panel
 * @param {object} ctx -
 * @param {object} data -
 **/
export let updateGraphThroughInfo = function( ctx, data ) {
    if( data.eventData.dataSource && data.eventData.dataSource.xrtType && data.eventData.dataSource.xrtType === 'INFO' ) {
        var graphModel = ctx.graph.graphModel;
        var graphControl = graphModel.graphControl;
        var nodeObjectID = data.eventData.dataSource.vmo;
        var isChangedToDesign = false;
        var operationName = 'updateFromInfoPanel';
        if( nodeObjectID ) {
            var node = graphModel.nodeMap[ nodeObjectID.uid ];
            if( node ) {
                var nodeObject = node.appData.nodeObject;
                if( node.appData.category === undefined && ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_ProcessFlowChart' ) {
                    node.appData.category = PFC_SYSTEM_ELEMENT;
                }
                var props = templateService.getBindPropertyNames( nodeObject, node.appData.category );
                var objectBindData = templateService.getBindProperties( nodeObject, false, node.appData.category );
                _.forEach( props, function( prop ) {
                    if( prop === 'System Element Type' && ( objectBindData[ prop ] === 'Design' || objectBindData[ prop ] === '' ) ) {
                        //remove the node from graph if the system element type is changed to design from info panel.
                        isChangedToDesign = true;
                        var removedNodes = graphModel.nodeMap[ nodeObjectID.uid ];
                        if( graphModel.graphControl.layout.itemsToBeRemoved ) {
                            graphModel.graphControl.layout.itemsToBeRemoved.nodes.push( removedNodes );

                            const filteredArr = graphModel.graphControl.layout.itemsToBeRemoved.edges.filter( ( elem ) => elem !== undefined );
                            graphModel.graphControl.layout.itemsToBeRemoved.edges = filteredArr;

                            graphModel.graphControl.graph.removeNodes( [ removedNodes ], true );
                        }
                    }
                    if( prop === 'Sequence' ) {
                        //remove the edges from the graph and call soa to get new edges for which will be sorted according to sequence number
                        var visibleEdges = graphModel.graphControl.graph.getVisibleEdges();
                        graphModel.graphControl.layout.itemsToBeRemoved.edges = visibleEdges;
                        graphModel.graphControl.graph.removeEdges( visibleEdges, true );

                        //Below event is published to get the nodes/edges in a sequencial manner.
                        //After successful response, just edges will be manipulated and no impact on nodes. (NODES ARE NOT REDRAWN)
                        eventBus.publish( 'Gc1TestHarness.queryNetwork' );
                    }
                    var newBindData = {};
                    newBindData[ prop ] = objectBindData[ prop ];
                    graphControl.graph.updateNodeBinding( node, newBindData );
                } );
                if( isChangedToDesign ) {
                    operationName = 'sysEleTypeChangedFromInfoPanel';
                    data.graphModel = graphModel;
                    data.graphData = graphModel.graphData;
                    ctx.graph.graphModel.numSelected = 0;
                    appCtxService.updateCtx( 'selected', ctx.xrtSummaryContextObject );
                    exports.drawEdge( data, false, [], [], operationName );
                }
            }
        }
    } else {
        return;
    }
};

export default exports = {
    drawGraph,
    updateRelationCounts,
    toggleChildrenExpansion,
    drawEdge,
    toggleIncomingEdges,
    resolveConnectedGraph,
    toggleOutgoingEdges,
    itemsRemovedFromGraph,
    updateNodeMap,
    updateEdgeMap,
    onGraphUpdated,
    performDeleteFromFmeaGraph,
    updateSeedNodeDegree,
    updateGraphAfterDeletingRelations,
    updateGraphThroughInfo
};

/* eslint-disable max-lines */
// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/qfm0FmeaGraphService
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
import messagingService from 'js/messagingService';
import qfm0FmeaGraphUtil2 from './qfm0FmeaGraphUtil2';

'use strict';

var exports = {};
var riskEstimationMethod = '';
var isRiskMethodFetched = false;

const _preventiveAction = 'Preventive Action';
const _detectionAction = 'Detection Action';
const NODE_TEMPLATE_NAME = 'Gc1TileNodeTemplate';
const GROUP_NODE_TEMPLATE_NAME = 'Gc1GroupTileNodeTemplate';
const BIG_NODE_TEMPLATE_NAME = 'Gc1BigTileNodeTemplate';
const BIG_GROUP_NODE_TEMPLATE_NAME = 'Gc1BigGroupTileNodeTemplate';
const FUNCTIONELEMENT = 'FunctionElement';
const FAILUREELEMENT = 'FailureElement';
const CURRENT_CONTROL_ACTION_GROUP = 'CurrentControlActionGroup';
const CURRENT_OPTIMIZATION_ACTION_GROUP = 'OptimizationActionGroup';
const FUNCTIONSPECIFICATION = 'FunctionSpecification';
const FAILURESPECIFICATION = 'FailureSpecification';
const RISK_METHOD_AP = 'Action Priority';
const RISK_METHOD_RPN = 'Risk Priority Number';

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
    //commented this as data.graphModel is not update with new netview on pinning
    //if (!data.graphModel) {
    data.graphModel = ctx.graph.graphModel;
    //}
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

var _drawGraph = function( ctx, data, addedNodes, addedEdges ) {
    var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
    var localTextBundle = _localeSvc.getLoadedText( resource );
    var graphModel = data.graphModel;
    //commented this as data.graphModel is not update with new netview on pinning
    //if (!graphModel) {
    graphModel = ctx.graph.graphModel;
    //}
    //commented this as data.graphData is not update with new netview on pinning
    //if (!data.graphData) {
    data.graphData = ctx.graph.graphModel.graphData;
    //}
    var graphData = data.graphData;

    var nodeRect = {
        width: 300,
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
    //var addedPorts = [];
    var hasRoot = false;

    if( data.eventData && data.eventData.fmeaElementToAdd ) {
        let fmeaNodeToUpdate = data.eventData.fmeaElementToAdd;
        if( fmeaNodeToUpdate && fmeaNodeToUpdate.length > 0 ) {
            var nodes = graphData.nodes.filter( node => fmeaNodeToUpdate.indexOf( node.nodeId ) > -1 );
            if( nodes.length !== 0 ) {
                graphData.nodes = nodes;
            }
        }
    }

    _.forEach( graphData.nodes, function( nodeData ) {
        var nodeObject = cdm.getObject( nodeData.metaObject.uid );

        //Node data to be bind in SVG template
        if( !graphModel.nodeMap[ nodeData.nodeId ] ) {
            var template;
            var templateId = '';
            var bindData;
            var nodeCategory = nodeData.props.Group;
            var outDegrees = nodeData.props.out_degree;
            var inDegrees = nodeData.props.in_degree;
            var isGroup = nodeData.props.is_group === 'true';

            if( nodeCategory === CURRENT_CONTROL_ACTION_GROUP || nodeCategory === CURRENT_OPTIMIZATION_ACTION_GROUP ) {
                processActionGroupNodes( nodeData, nodeObject, localTextBundle );               
            }

            var props = templateService.getBindPropertyNames( nodeObject, nodeCategory );
            template = templateService.getNodeTemplate( graphModel.nodeTemplates, props, isGroup, nodeCategory, ctx );
            if( !template ) {
                logger
                    .error( 'Failed to get SVG template for node object. Skip drawing the node. Object UID: ' +
                        nodeObject.uid );
                return;
            }
            templateId = template.templateId ? template.templateId.split('-')[0] : '' ;

            bindData = templateService.getBindProperties( nodeObject, props, nodeCategory );

            let nodeColor = graphData.netViewGroup.filters.find( obj => obj.name === nodeData.props.Group );

            if( nodeColor ) {
                bindData.node_fill_color = `rgb(${nodeColor.color.redValue},${nodeColor.color.greenValue},${nodeColor.color.blueValue})`;
            }

            if( bindData.Name ) {
                bindData.Name_editable = true;
            }
            if( bindData.Revision ) {
                bindData.Revision_editable = true;
            }
            if( bindData.Severity ) {
                let ctxPreferences = appCtxService.getCtx( 'preferences' );
                bindData.Severity_editable = ( ctxPreferences && ctxPreferences.FMEA_cascaded_severity && ctxPreferences.FMEA_cascaded_severity[0] &&
                                               ctxPreferences.FMEA_cascaded_severity[0].toUpperCase() === 'TRUE' ) ? false : true ;
            }
            if( bindData.Detection ) {
                bindData.Detection_editable = true;
            }
            if( bindData.Occurrence ) {
                bindData.Occurrence_editable = true;
            }
            bindData.node_child = localTextBundle.qfm0ChildElementCommand;
            bindData.node_parent = localTextBundle.qfm0Parent;
            bindData.isDetectionAction = false;
            if( nodeData.metaObject.props && nodeData.metaObject.props.qam0QualityActionSubtype && nodeData.metaObject.props.qam0QualityActionSubtype.dbValues[ 0 ] === _detectionAction ) {
                bindData.isDetectionAction = true;
            }
            bindData.isPreventionAction = false;
            if( nodeData.metaObject.props && nodeData.metaObject.props.qam0QualityActionSubtype && nodeData.metaObject.props.qam0QualityActionSubtype.dbValues[ 0 ] === _preventiveAction ) {
                bindData.isPreventionAction = true;
            }

            bindData.partialExpandInCommand = 'Qfm0OnNodePartialExpandIn';
            bindData.partiaExpandOutCommand = 'Qfm0OnNodePartialExpandOut';
            bindData.isImageClickable = true;

            if( nodeCategory === FUNCTIONELEMENT || nodeCategory === FUNCTIONSPECIFICATION ) {
                bindData.node_child = localTextBundle.qfm0LowerLevelFunction;
                bindData.node_parent = localTextBundle.qfm0HigherLevel;
                bindData.partiaExpandOutCommand = 'Qfm0OnFunctionNodePartialExpandOut';
                if( ctx.selected.modelType.typeHierarchyArray.indexOf( 'Qfm0FunctionElement' ) > -1 ) {
                    bindData.isImageClickable = true;
                } else {
                    bindData.isImageClickable = false;
                }
            } else if( nodeCategory === FAILUREELEMENT || nodeCategory === FAILURESPECIFICATION ) {
                bindData.node_child = localTextBundle.qfm0Cause;
                bindData.node_parent = localTextBundle.qfm0Effect;
                bindData.partiaExpandOutCommand = 'Qfm0OnFailureNodePartialExpandOut';
                bindData.partialExpandInCommand = 'Qfm0OnFailureNodePartialExpandIn';
                if( ctx.selected.modelType.typeHierarchyArray.indexOf( 'Qfm0FailureElement' ) > -1 ) {
                    bindData.isImageClickable = true;
                } else {
                    bindData.isImageClickable = false;
                }
            }

            bindData.nodeCategory = nodeCategory;

            //fill node command binding data
            if( graphModel.nodeCommandBindData ) {
                declUtils.consolidateObjects( bindData, graphModel.nodeCommandBindData );
            }

            let updatedNodeRect = Object.assign( {}, nodeRect );
            if( nodeCategory === FAILUREELEMENT && ( templateId === BIG_NODE_TEMPLATE_NAME || templateId === BIG_GROUP_NODE_TEMPLATE_NAME ) ) {
                updatedNodeRect.height = 150;
            }

            var node = graph.createNodeWithBoundsStyleAndTag( updatedNodeRect, template, bindData );

            // use this API if applciation want to set node minimum size per node.
            // application also can configure it in viewModel for overall settings
            // the array is minumum node size [width, hight]
            let MIN_NODE_SIZE = [];
            if( nodeCategory === FAILUREELEMENT && ( templateId === BIG_NODE_TEMPLATE_NAME || templateId === BIG_GROUP_NODE_TEMPLATE_NAME ) ) {
                MIN_NODE_SIZE = [ 300, 150 ];
            }
            else {
                MIN_NODE_SIZE = [ 300, 125 ];
            }
            graph.setNodeMinSizeConfig( node, MIN_NODE_SIZE );
            node.initPosition = Object.assign( {}, updatedNodeRect );
            

            node.appData = {
                id: nodeData.nodeId,
                nodeObject: nodeObject,
                inDegrees: inDegrees,
                outDegrees: outDegrees,
                isGroup: isGroup,
                category: nodeCategory
            };

            // record all added nodes
            addedNodes.push( node );

            var labelText = '';
            var prop;
            if( nodeObject.props ) {
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
            if( !hasRoot && getVisibleRootNodes( graphModel ).length === 0 && node.appData.nodeObject.uid === graphData.rootUIDs[ 0 ] ) {
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
    exports.drawEdge( data, false, degreeChangedNodes, addedEdges );
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

    let isFailureAnalysisTab = ( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Failure_Analysis' || ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Failure_Analysis' ) ? true : false;
    if( isFailureAnalysisTab ) {
        let eventName = getEventNameInCaseIfCauseEffectAdded(data);  
        if( eventName ) {
            // If a cause or effect is added then update severity of impacted failure nodes and update RPN/AP of affected action group nodes
            let updatedFailueElements = data.eventMap[eventName].updatedFailureElements;
            let modelObjects = data.eventMap[eventName].modelObjects;
            qfm0FmeaGraphUtil2.updateGraphNodesOnSeverityCascade( ctx, data, updatedFailueElements, modelObjects );
            data.eventMap[eventName].isCauseEffectAdded = "false";
        }
    }
};

/**
 * Get event name of event fired in case if cause or effect is added in Net View
 * @param {Object} data 
 * @returns {String} eventName
 */
var getEventNameInCaseIfCauseEffectAdded = function( data ) {
    let eventName = '';
    if( data.eventMap && ( data.eventMap["Gc1TestHarness.expandIncoming"] || data.eventMap["Gc1TestHarness.expandOutgoing"] || data.eventMap["Rv1RelationsBrowser.expandGraph"] )) {    
        if( data.eventMap["Gc1TestHarness.expandIncoming"] && data.eventMap["Gc1TestHarness.expandIncoming"].isCauseEffectAdded && data.eventMap["Gc1TestHarness.expandIncoming"].isCauseEffectAdded === "true" ) {
            eventName = "Gc1TestHarness.expandIncoming";
        }
        else if( data.eventMap["Gc1TestHarness.expandOutgoing"] && data.eventMap["Gc1TestHarness.expandOutgoing"].isCauseEffectAdded && data.eventMap["Gc1TestHarness.expandOutgoing"].isCauseEffectAdded === "true" ) {
            eventName = "Gc1TestHarness.expandOutgoing";
        }
        else if( data.eventMap["Rv1RelationsBrowser.expandGraph"] && data.eventMap["Rv1RelationsBrowser.expandGraph"].isCauseEffectAdded && data.eventMap["Rv1RelationsBrowser.expandGraph"].isCauseEffectAdded === "true" ) {
            eventName = "Rv1RelationsBrowser.expandGraph";
        }
    }
    return eventName;
};

var getChildrenTooltip = function( node, expanded ) {
    let childrenTooltip;
    var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
    var localTextBundle = _localeSvc.getLoadedText( resource );

    if( expanded ) {
        childrenTooltip = localTextBundle.qfm0Expand;
        switch ( node.appData.category ) {
            case 'FunctionElement':
                childrenTooltip = localTextBundle.qfm0ShowFailure;
                break;
            case 'FailureElement':
                childrenTooltip = localTextBundle.qfm0ShowAction;
                break;
        }
    } else {
        childrenTooltip = localTextBundle.qfm0Collapse;
        switch ( node.appData.category ) {
            case 'FunctionElement':
                childrenTooltip = localTextBundle.qfm0HideFailure;
                break;
            case 'FailureElement':
                childrenTooltip = localTextBundle.qfm0HideAction;
                break;
        }
    }

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
export let drawEdge = function( data, isConvert, degreeChangedNodes, addedEdges ) {
    var graphData = data.graphData;
    var graphModel = data.graphModel;
    var graph = graphModel.graphControl.graph;

    if( !addedEdges ) {
        addedEdges = [];
    }

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

                let edgeName = localTextBundle.qfm0ChildSystemElement;

                if( edgeCategory === 'NextLowerLevelFunction' ) {
                    edgeName = localTextBundle.qfm0NextLowerFunction;
                } else if( edgeCategory === 'Cause' ) {
                    edgeName = localTextBundle.qfm0Cause;
                }
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

    // by default root node should be selected on load of net view
    if( !graphModel.isRootNodeSelectedFirstTime ) {
        var rootNode = graphModel.nodeMap[ graphModel.rootId ];
        graphModel.graphControl.setSelected( [ rootNode ], true );
        graphModel.isRootNodeSelectedFirstTime = true;

        // auto adjust the graph to fit in given area only first time after opening Net View tab
        graphModel.graphControl.fitGraph();
    }

    graphControl.layout.applyLayout();
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
        if( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_ProcessFlowChart' || ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_ProcessFlowChart' ) {
            createNewEdgeAfterDelete( ctx, graphModel );
        }
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
 * This method is called on deleting the node from PFC. Method creates the new edge between the prior and next node of deleted node.
 * @param {ctx} ctx
 * @param {graphModel} graphModel
 */
function createNewEdgeAfterDelete( ctx, graphModel ) {
    var visibleEdges = graphModel.graphControl.graph.getVisibleEdges();
    graphModel.graphControl.layout.itemsToBeRemoved.edges = visibleEdges;
    graphModel.graphControl.graph.removeEdges( visibleEdges, true );

    //Below event is published to get the nodes/edges in a sequencial manner.
    //After successful response, just edges will be manipulated and no impact on nodes. (NODES ARE NOT REDRAWN)
    eventBus.publish( 'Gc1TestHarness.queryNetwork' );

    ctx.graph.graphModel.numSelected = 0;
    appCtxService.updateCtx( 'selected', ctx.xrtSummaryContextObject );
}

/**
 * This function updates the out-degree and and in-degree of the node selected based on expansion
 * @param {data} data graph data
 * @param {appctxservice} ctx
 */
export let updateSeedNodeDegree = function( data, ctx ) {
    data.graphModel = ctx.graph.graphModel;
    var graphModel = data.graphModel;

    data.graphData = ctx.graph.graphModel.graphData;
    var graphData = data.graphData;
    var nodeMapObjKeysArr = Object.keys( graphModel.nodeMap );

    let failuresPresentInNewlyCreatedRelations = [];
    let isFailureAnalysisTab = ( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Failure_Analysis' || ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Failure_Analysis' ) ? true : false;
    if( isFailureAnalysisTab && data.eventData ) {
        // Below code is for getting those failure element Uids which are either primary or secondary in the newly created cause/effect relation 
        // this information can be used later to distinguish between failure nodes need to be updated due to severity cascade and failure nodes need to be
        // updated for incoming/outgoing info due to relation creation
        let createdCauseEffectRelationObjects = data.eventData.createdCauseEffectRelationObjects;
        if( createdCauseEffectRelationObjects && createdCauseEffectRelationObjects.length > 0) {
            createdCauseEffectRelationObjects.forEach( function( relationObj ) {
                if( relationObj.props.primary_object && relationObj.props.secondary_object ) {
                    failuresPresentInNewlyCreatedRelations.push(relationObj.props.primary_object.dbValues[0]);
                    failuresPresentInNewlyCreatedRelations.push(relationObj.props.secondary_object.dbValues[0]);
                }
            });
            failuresPresentInNewlyCreatedRelations = _.uniq(failuresPresentInNewlyCreatedRelations);
        }
    }

    if( data.eventData && data.eventData.rootIDs && data.eventData.rootIDs.length > 0 ) {
        _.forEach( data.eventData.rootIDs, function( rootId ) {
            var idx = _.findLastIndex( graphData.nodes, function( node ) {
                return node.nodeId === rootId;
            } );

            var isDirectionForward = false;
            var node = graphModel.nodeMap[ rootId ];
            if( data.eventData.expandDirection === graphConstants.ExpandDirection.FORWARD || data.eventData.expandDirection === graphConstants.ExpandDirection.ALL ) {
                node.appData.outDegrees =  Number( graphData.nodes[ idx ].props.out_degree ).toString();
                isDirectionForward = true;
            }
            if( data.eventData.expandDirection === graphConstants.ExpandDirection.BACKWARD || data.eventData.expandDirection === graphConstants.ExpandDirection.ALL ) {
                node.appData.inDegrees =  Number( graphData.nodes[ idx ].props.in_degree ).toString();
            }

            if( data.eventData.fmeaElementToAdd && data.eventData.fmeaElementToAdd.length > 0 ) {
                let failuresPresentInCreatedRelationsTempArr = [];
                if( isFailureAnalysisTab ) {
                    if( failuresPresentInNewlyCreatedRelations && failuresPresentInNewlyCreatedRelations.length > 0) {
                        failuresPresentInCreatedRelationsTempArr = JSON.parse(JSON.stringify(failuresPresentInNewlyCreatedRelations));

                        let rootFailureIndex = failuresPresentInCreatedRelationsTempArr.indexOf(node.appData.id);
                        if( rootFailureIndex > -1 ){
                            failuresPresentInCreatedRelationsTempArr.splice( rootFailureIndex, 1 );
                        }
                    }
                }
                
                data.eventData.fmeaElementToAdd.forEach( function( nodeToUpdate ) {
                    if( nodeToUpdate !== node.appData.id ) {
                        let nodeToUpdateIndex = nodeMapObjKeysArr.indexOf( nodeToUpdate );
                        if( ( !isFailureAnalysisTab && nodeToUpdateIndex > -1 ) || ( isFailureAnalysisTab && nodeToUpdateIndex > -1 && 
                            failuresPresentInCreatedRelationsTempArr && failuresPresentInCreatedRelationsTempArr.indexOf(nodeToUpdate) > -1 )) {
                            // If a new relation (edge) has been created to a node which is already existing in graph then update it's inDegree or outDegree
                            if( isDirectionForward ) {
                                let inDegree = Number( graphModel.nodeMap[ nodeMapObjKeysArr[ nodeToUpdateIndex ] ].appData.inDegrees );
                                graphModel.nodeMap[ nodeMapObjKeysArr[ nodeToUpdateIndex ] ].appData.inDegrees = ( inDegree + 1 ).toString();
                            } else {
                                let outDegree = Number( graphModel.nodeMap[ nodeMapObjKeysArr[ nodeToUpdateIndex ] ].appData.outDegrees );
                                graphModel.nodeMap[ nodeMapObjKeysArr[ nodeToUpdateIndex ] ].appData.outDegrees = ( outDegree + 1 ).toString();
                            }
                        }
                    }
                } );
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

        // If a cause or effect is removed then update severity of impacted failure nodes and update RPN/AP of affected action group nodes
        if( data.eventMap && data.eventMap["updateGraphAfterDeletingRelations"] && data.eventMap["updateGraphAfterDeletingRelations"].isCauseEffectRemoved && data.eventMap["updateGraphAfterDeletingRelations"].isCauseEffectRemoved === "true" ) {
            let effectFailureUids = [];
            for(let i = 0; i < edgesToRemove.length; i++) {
                if( edgesToRemove[i] && edgesToRemove[i].edgeData && edgesToRemove[i].edgeData.leftId && edgesToRemove[i].edgeData.rightId ) {
                    effectFailureUids.push(edgesToRemove[i].edgeData.leftId);
                    effectFailureUids.push(edgesToRemove[i].edgeData.rightId);
                }
            }
            let updatedFailueElements = data.eventMap["updateGraphAfterDeletingRelations"].updatedFailureElements;
            updatedFailueElements = updatedFailueElements.concat(effectFailureUids);
            updatedFailueElements = _.uniq(updatedFailueElements);
            let modelObjects = data.eventMap["updateGraphAfterDeletingRelations"].modelObjects;
            qfm0FmeaGraphUtil2.updateGraphNodesOnSeverityCascade( ctx, data, updatedFailueElements, modelObjects );
            data.eventMap["updateGraphAfterDeletingRelations"].isCauseEffectRemoved = "false";
        }

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
        updateNodeTextBindingData( ctx, data );
    } else {
        return;
    }
};

/** Function is to update properties(properties corresponding to text visible on node) of Node once the selected object is updated
 * @param {object} ctx
 * @param {object} data
 **/
 export let updateNodeTextBindingData = function( ctx, data) {
    var graphModel = ctx.graph.graphModel;
    var graphControl = graphModel.graphControl;
    var nodeModelObject = data.eventData.dataSource.vmo;
    if( nodeModelObject ) {
        var node = graphModel.nodeMap[ nodeModelObject.uid ];
        if( node ) {
            var nodeObject = node.appData.nodeObject;
            var props = templateService.getBindPropertyNames( nodeObject, node.appData.category );
            var objectBindData = templateService.getBindProperties( nodeObject, false, node.appData.category );
            _.forEach( props, function( prop ) {
                var newBindData = {};
                newBindData[ prop ] = objectBindData[ prop ];
                graphControl.graph.updateNodeBinding( node, newBindData );
            } );
        }
    }    
};

function processActionGroupNodes( nodeData, nodeObject, localTextBundle ) {
    if( nodeData.props.hasOwnProperty('qfm0RPN') ) {
        nodeObject.qfm0RPN = nodeData.props.qfm0RPN;
    } else if( nodeData.props.hasOwnProperty('qfm0ActionPriority') ) {
        nodeObject.qfm0ActionPriority = nodeData.props.qfm0ActionPriority;
    }                              
    nodeObject.qfm0RiskEvaluationObjUid = nodeData.props.qfm0RiskEvaluationObjUid;

    if( !isRiskMethodFetched ) {
        if( nodeData.props.hasOwnProperty('qfm0RPN') ) {
            riskEstimationMethod = RISK_METHOD_RPN;
        } else if( nodeData.props.hasOwnProperty('qfm0ActionPriority') ) {
            riskEstimationMethod = RISK_METHOD_AP;
        } else {
            riskEstimationMethod = '';
        }
        isRiskMethodFetched = true;
        templateService.setRiskEstimationMethod( riskEstimationMethod );
        templateService.setLabelsValueForRPNAndAP();

        if( !riskEstimationMethod ) {
            let errorMessage = localTextBundle.qfm0RPNandAPMissingError;
            messagingService.showError( errorMessage );
        }
    }
}

export let resetRiskMethodRelatedData = function() {
    riskEstimationMethod = '';
    isRiskMethodFetched = false;
    templateService.setRiskEstimationMethod( riskEstimationMethod );
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
    updateGraphThroughInfo,
    updateNodeTextBindingData,
    resetRiskMethodRelatedData
};

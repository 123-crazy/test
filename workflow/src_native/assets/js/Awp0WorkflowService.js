// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awp0WorkflowService
 */
import * as app from 'app';
import eventBus from 'js/eventBus';
import declUtils from 'js/declUtils';
import templateService from 'js/Awp0WorkflowTemplateService';
import _ from 'lodash';
import graphLegendSvc from 'js/graphLegendService';
import policySvc from 'soa/kernel/propertyPolicyService';
import cdm from 'soa/kernel/clientDataModel';
import graphSelection from 'js/Awp0WorkflowGraphSelectionService';
import graphService from 'js/awGraphService';
import workflowGraphStyles from 'js/Awp0WorkflowGraphStyles';
import ctxService from 'js/appCtxService';
import workflowLegendSvc from 'js/Awp0WorkflowViewerGraphLegendManager';
import workflowGraphService from 'js/Awp0WorkflowViewerGraphService';
import workflowUtils from 'js/Awp0WorkflowUtils';

'use strict';
var MIN_NODE_SIZE = [ 50, 50 ];
var rootObject;
var previousParentProcesses = [];
var workflowViewerPropertyPolicy = null;
var parentData = null;

var exports = {};

var incUpdateActive = function( layout ) {
    return layout && layout.type === 'IncUpdateLayout' && layout.isActive();
};

var layoutActive = function( layout ) {
    return incUpdateActive( layout );
};

var isExceptionNode = function( nodeObject ) {
    // - Presence of subtasks
    // - Presence of subprocesses
    var childTasksPropObj = nodeObject.props.child_tasks;
    if( typeof childTasksPropObj !== typeof undefined &&
        typeof childTasksPropObj.dbValues !== typeof undefined && childTasksPropObj.dbValues[ 0 ] ) {
        return true;
    }

    var subprocessPropObj = nodeObject.props.sub_processes_states;
    if( typeof subprocessPropObj !== typeof undefined &&
        typeof subprocessPropObj.dbValues !== typeof undefined && subprocessPropObj.dbValues[ 0 ] ) {
        return true;
    }
    return false;
};
var isEdgeCountMore = function( nodeObject ) {
    // We need to check for the following values:
    // Number of successors and predecessors
    // If the combined number of successors and predecessors is greater than 4, or if there are
    // subtasks or subprocesses, then the node will not be rendered as a noninteractive node

    var successorPropObj = nodeObject.props.successors;
    var successorTasksCount = 0;
    if( typeof successorPropObj !== typeof undefined && typeof successorPropObj.dbValues !== typeof undefined ) {
        successorTasksCount = successorPropObj.dbValues.length;
    }

    var predecessorPropObj = nodeObject.props.predecessors;
    var predecessorTasksCount = 0;
    if( typeof predecessorPropObj !== typeof undefined &&
        typeof predecessorPropObj.dbValues !== typeof undefined ) {
        predecessorTasksCount = predecessorPropObj.dbValues.length;
    }
    if( predecessorTasksCount + successorTasksCount > 4 ) {
        return true;
    }

    return false;
};

var setRootTaskObject = function( modelObject ) {
    if( typeof modelObject !== typeof undefined ) {
        rootObject = modelObject;
    }
};
var hasSubProcess = function( nodeObject ) {
    var subprocessPropObj = nodeObject.props.sub_processes_states;
    if( typeof subprocessPropObj !== typeof undefined &&
        typeof subprocessPropObj.dbValues !== typeof undefined && subprocessPropObj.dbValues[ 0 ] ) {
        return true;
    }

    return false;
};

/**
 * Get the start node location value that need to be used to show the start node
 * at specific position.
 *
 * @param {Object} nodeObject Start node object
 * @param {Array} taskPosition Current start node position value
 *
 * @returns {Object} start node location proeprty value
 */
var _getStartNodePosition = function( nodeObject, taskPosition ) {
    var startNodePosition = taskPosition;
    // Check if tc version is tc12.4 or more then use the input task position for start node as it has the correct
    // index in platform code that returns the correct value and on older release it's incorrect so for older release
    // getting it from template object
    if( ctxService.ctx.tcSessionData && ( ctxService.ctx.tcSessionData.tcMajorVersion === 12 && ctxService.ctx.tcSessionData.tcMinorVersion > 3
        || ctxService.ctx.tcSessionData.tcMajorVersion > 12 ) ) {
        return startNodePosition;
    }
    // Get the task template and get start node location from task template
    if( nodeObject && nodeObject.props.task_template && nodeObject.props.task_template.dbValues
        && nodeObject.props.task_template.dbValues[ 0 ] ) {
        var taskTemplateObject = cdm.getObject( nodeObject.props.task_template.dbValues[ 0 ] );
        if( taskTemplateObject && taskTemplateObject.props && taskTemplateObject.props.start_node_location
        && taskTemplateObject.props.start_node_location.dbValues ) {
            startNodePosition = taskTemplateObject.props.start_node_location.dbValues;
        }
    }
    return startNodePosition;
};

/**
 * Get the value of the preference WRKFLW_preferred_diagram_layout and apply to the graph
 */
var _setInitialContextFromPreference = function( data, isAutoLayout, selectionLayoutDirection ) {
    var workflowViewerCtx = {
        diagram : {
            isAutoLayoutOn : isAutoLayout,
            layoutOption : selectionLayoutDirection
        }
    };
    ctxService.registerCtx( 'workflowViewerCtx', workflowViewerCtx );
};

/**
 * Return the true or false based on auto layout is on or off.
 *
 * @returns {boolean} True or False
 */
var _isFixedLayoutMode = function( data ) {
    var workflowViewerCtx = ctxService.getCtx( 'workflowViewerCtx' );
    if( workflowViewerCtx && workflowViewerCtx.diagram && !workflowViewerCtx.diagram.isAutoLayoutOn ) {
        return true;
    } else if( !ctxService.ctx.workflowViewerCtx ||  !ctxService.ctx.workflowViewerCtx.diagram || !ctxService.ctx.workflowViewerCtx.diagram.layoutOption ) {
        //Get the preferred layout direction from the preference if it exists and set the layout context
        if ( data && data.preferences.WRKFLW_preferred_diagram_layout ) {
             var selectionLayoutDirection = data.preferences.WRKFLW_preferred_diagram_layout[0];
             if ( selectionLayoutDirection === 'FixedLayout' ) {
                _setInitialContextFromPreference( data, false, selectionLayoutDirection );
                return true;
             }
            _setInitialContextFromPreference( data, true, selectionLayoutDirection );
            return false;
        }
        return false;
    }
    return false;
};

/**
 * Get the node position
 * @param {Object} nodeObject Node obejct whose postion need to be fetched
 * @param {boolean} isStartFinishNode True or false value
 * @param {String} nodeType Node type string value
 *
 * @returns {Object} Node positions
 */
var _getNodeXYCoordinates = function( nodeObject, isStartFinishNode, nodeType ) {
    var locationX;
    var locationY;
    var nodeXPosition = 200;
    var nodeYPosition = 200;

    var isFixedLayout = _isFixedLayoutMode( parentData );
    // Check if we are in autolayout then we don't need to return the node positions and automatic
    // positions will be used.
    if( !isFixedLayout ) {
        return {
            nodeXPosition: nodeXPosition,
            nodeYPosition : nodeYPosition
        };
    }

    var scalingFactor = 1.9;
    var locationPropName = 'location';
    if( isStartFinishNode && nodeType === 'start' && nodeObject.props.start_node_location ) {
        locationPropName = 'start_node_location';
    } else if( isStartFinishNode && nodeType === 'finish' && nodeObject.props.complete_node_location ) {
        locationPropName = 'complete_node_location';
    }
    // Get the node location value for specific property and then parse the correct value and return the node positions
    if( nodeObject && nodeObject.props && nodeObject.props[ locationPropName ] && nodeObject.props[ locationPropName ].dbValues ) {
        var location = nodeObject.props[ locationPropName ].dbValues;
        if( locationPropName === 'start_node_location' ) {
            location = _getStartNodePosition( nodeObject, location );
        }
        if( location && location[ 0 ] ) {
            var locationArray = location[ 0 ].split( ',' );
            locationX = parseInt( locationArray[ 0 ], 10 );
            locationY = parseInt( locationArray[ 1 ], 10 );
            nodeXPosition = ( locationX + 100 ) * scalingFactor;
            nodeYPosition = ( locationY - 150 ) * scalingFactor;
        }
    }

    return  {
        nodeXPosition: nodeXPosition,
        nodeYPosition : nodeYPosition
    };
};

/**
 * Get the node rectanlge and return
 * @param {Object} nodeObject Node obejct whose postion need to be fetched
 * @param {boolean} isStartFinishNode True or false value
 * @param {boolean} isGroup True or false value based on node is group node or not
 * @param {String} nodeType Node type string value
 * @param {Object} bindData Bind data that will contain all properties to be shown on node
 *
 * @returns {Object} Node positions rectangle
 */
var _getNodeRectObject = function( nodeObject, isStartFinishNode, isGroup, nodeType, bindData ) {
    var nodeRect = {
        width: 50,
        height: 50
    };
    var nodeWidth = 75;
    var nodeHeight = 100;
    var nodeName = '';
    // Check if input bind data is not null and job name present on bind data
    // then use job name to calculate the node width else use the object name
    if( !nodeType && bindData && bindData.job_name ) {
        nodeName = bindData.job_name;
    } else if( nodeObject && nodeObject.props.object_name.dbValues ) {
        nodeName = nodeObject.props.object_name.dbValues[ 0 ];
    }

    var nodeCoordinates = _getNodeXYCoordinates( nodeObject, isStartFinishNode, nodeType );
    // Check if node is start or finish node and it's not group node or node type is finish
    // where start node can be group node but finish node can't be group node so just calculate
    // the node width for group start node or all other nodes.
    if( isStartFinishNode && ( !isGroup || nodeType === 'finish' ) ) {
        if( nodeType === 'finish' || nodeType === 'start' ) {
            nodeRect.width = 75;
            nodeRect.height = 100;
        }
        nodeRect.x = nodeCoordinates.nodeXPosition;
        nodeRect.y = nodeCoordinates.nodeYPosition;
        return nodeRect;
    }
    nodeRect.x = nodeCoordinates.nodeXPosition;
    nodeRect.y = nodeCoordinates.nodeYPosition;

    if( isStartFinishNode && ( isGroup && nodeType === 'start' ) ) {
        nodeRect.width = 125;
        nodeRect.height = nodeHeight;
        return nodeRect;
    }

    var widthAdj = 7 * nodeName.length;
    if( nodeName.length < 5 ) {
        widthAdj = 0;
    }
    nodeWidth += widthAdj;
    nodeRect.width = nodeWidth;
    nodeRect.height = nodeHeight;
    return nodeRect;
};

var getStartFinishNode = function( nodeObj, graph, graphModel, nodeType, tooltip, stateValue, activeLegendView, rootTaskObject ) {
    var isStartNode = true;
    var props = templateService.getBindPropertyNames( nodeObj, null, rootTaskObject );
    var bindData = templateService.getBindProperties( nodeObj, props, nodeType );
    var isGroup = hasSubProcess( nodeObj );
    var nodeCategory = 'EPM_completed';
    var template = null;
    var nodeRect = {
        width: 50,
        height: 50
    };
    // Get the node rectangle that will be used for node size
    nodeRect = _getNodeRectObject( nodeObj, true, isGroup, nodeType, bindData );
    if( isGroup && nodeType === 'start' ) {
        template = templateService.getNodeTemplate( graphModel.nodeTemplates, props, isGroup );
        if( stateValue === '32' ) {
            nodeCategory = 'EPM_aborted';
        }
        var legendStyle = graphLegendSvc.getStyleFromLegend( 'objects', nodeCategory, activeLegendView );
        bindData.node_fill_color = legendStyle.borderColor;
        bindData.job_name = tooltip;
        bindData.task_state_style_svg = 'hidden';
        bindData.open_process = '';
    } else {
        // Check if node type is start or finish then we need to show it as normal node
        // similar to workflow designer to handle that case where we can create more than 4 connection from
        // less prominetn node to other node.
        if( nodeType === 'start' || nodeType === 'finish' ) {
            isStartNode = false;
            bindData.job_name = tooltip;
            nodeCategory = workflowUtils.getStartFinishNodeCategory( nodeType, stateValue );
            var legendStyle1 = graphLegendSvc.getStyleFromLegend( 'objects', nodeCategory, activeLegendView );
            bindData.node_fill_color = legendStyle1.borderColor;
        }
        template = templateService.getNodeTemplate( graphModel.nodeTemplates, props, isGroup, isStartNode );
    }
    var node = graph.createNodeWithBoundsStyleAndTag( nodeRect, template, bindData );
    if( isGroup ) {
        node.setGroupingAllowed( true );
        graphModel.graphControl.groupGraph.setExpanded( node, false );
        graph.setBounds( node, nodeRect );
    }
    node.appData = {
        nodeObject: nodeObj,
        tooltipOfNode: tooltip,
        isGroup: isGroup,
        isStartFinishNode: nodeType
    };
    return node;
};

var applyGraphLayout = function( graphModel, data ) {
    var isFixedLayout = _isFixedLayoutMode( data );
    // If we are in fixed layout then no need to apply the layout
    if( isFixedLayout ) {
        return;
    }
    //the layout is initialized by GC by default, it's directly available
    var layout = graphModel.graphControl.layout;
    if( layout ) {
        //need apply global layout first for incremental update
        layout.applyLayout();
        layout.activate( false );
    }
};

/**
 * Sets the node height and group node header height based on the wrapped text height
 */
export let setNodeHeightOnWrappedHeightChanged = function( graphModel, nodes ) {
    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;
    var groupGraph = graphControl.groupGraph;
    var layout = graphControl.layout;

    var sizeChangedNodes = [];
    _.forEach( nodes, function( nodeTextInfo ) {
        var currentWrappedHeight = nodeTextInfo.currentWrappedHeight;
        var node = nodeTextInfo.node;

        if( currentWrappedHeight ) {
            var currentHeight = node.getHeight();
            var padding = 60;
            var layoutHeight = currentWrappedHeight + padding;
            var newHeight = layoutHeight;

            var isResize = false;
            if( groupGraph.isGroup( node ) ) {
                if( groupGraph.isExpanded( node ) ) {
                    var offset = graphControl.updateHeaderHeight( node, newHeight );
                    newHeight = currentHeight + offset;
                    if( newHeight !== currentHeight ) {
                        isResize = true;
                    }
                } else if( newHeight > currentHeight || newHeight !== currentHeight &&
                    graphModel.config.enableEdit ) {
                    isResize = true;
                    graphControl.updateHeaderHeight( node, newHeight );
                }
            } else {
                if( newHeight > currentHeight ) {
                    isResize = true;
                }
            }

            if( isResize ) {
                graph.update( function() {
                    node.setHeight( newHeight );
                } );

                sizeChangedNodes.push( node );
            }
        }
    } );

    if( layoutActive( layout ) && sizeChangedNodes.length > 0 ) {
        layout.applyUpdate( function() {
            _.forEach( sizeChangedNodes, function( sizeChangedNode ) {
                layout.resizeNode( sizeChangedNode, true );
            } );
        } );
    }
};

var _isEPMtaskOrSignOff = function( ctx ) {
    return ctx.xrtSummaryContextObject && ( ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'EPMTask' ) > -1 || ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'Signoff' ) > -1 );
};

/**
 * Return the applied layout option on the diagram. If no layout applied then by
 * default it will return 'GcLeftToRightLayout' layout option.
 *
 * @returns {String} Default layout string.
 */
var _getAppliedLayoutOption = function( data ) {
    if( ctxService.ctx.workflowViewerCtx && ctxService.ctx.workflowViewerCtx.diagram && ctxService.ctx.workflowViewerCtx.diagram.layoutOption ) {
        return ctxService.ctx.workflowViewerCtx.diagram.layoutOption;
    } else if( !ctxService.ctx.workflowViewerCtx ||  !ctxService.ctx.workflowViewerCtx.diagram || !ctxService.ctx.workflowViewerCtx.diagram.layoutOption ) {
        return 'GcLeftToRightLayout';
    }
    return null;
};

var _setWorkflowViewerContext = function( data ) {
    var workflowViewerCtx = ctxService.getCtx( 'workflowViewerCtx' );

    var isFixedLayout = _isFixedLayoutMode( data );
    // Get the default layout option and apply on the graph
    var defaultLayout = _getAppliedLayoutOption( data );
    if( workflowViewerCtx ) {
        if( !workflowViewerCtx.diagram ) {
            workflowViewerCtx.diagram = {};
        }
        workflowViewerCtx.diagram.isAutoLayoutOn = !isFixedLayout;
        workflowViewerCtx.diagram.layoutOption = defaultLayout;
        ctxService.registerCtx( 'workflowViewerCtx', workflowViewerCtx );
    } else {
        workflowViewerCtx = {
            diagram : {
                isAutoLayoutOn : !isFixedLayout,
                layoutOption : defaultLayout
            }
        };
        ctxService.registerCtx( 'workflowViewerCtx', workflowViewerCtx );
    }
};

/**
 * Create all edges that need to be shown on the graph and return thos edges.
 *
 * @param {Object} data Data view model obejct
 * @param {Array} edgeDataArray Edge data array that will contain all edge information that need to be shown
 * @param {Object} startNode Start node object
 * @param {Object} finishNode Finish node object
 * @param {Object} graphModel Graph model object
 * @param {Object} activeLegendView Active legend view object to populate node style info
 *
 * @return {Array} addedEdges All actual edge objects
 */
var _drawEdges = function( data, edgeDataArray, startNode, finishNode, graphModel, activeLegendView ) {
    var addedEdges = [];
    if( !edgeDataArray || edgeDataArray.length <= 0 || !graphModel ) {
        return addedEdges;
    }
    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;
    var groupGraph = graphControl.groupGraph;

    var edgeStyles = workflowGraphStyles.parseGraphStyleXML( data.presentationStylesXML );
    _.forEach( edgeDataArray, function( edgeData ) {
        var sourceNode;
        var targetNode;

        sourceNode = graphModel.nodeMap[ edgeData.end1Element.uid ];
        targetNode = graphModel.nodeMap[ edgeData.end2Element.uid ];
        if( typeof rootObject !== typeof undefined ) {
            if( edgeData.end1Element.uid === rootObject.uid ) {
                sourceNode = startNode;
            }
            if( edgeData.end2Element.uid === rootObject.uid ) {
                targetNode = finishNode;
            }
        }

        var edge;
        var edgeCategory = edgeData.edgeInfo.edgeType[ 0 ];
        // Check if edge category is structure and there are multiple nodes as target nodes
        // that can happen only in case of sub process where duplicate sub process need to be
        // rendered on UI inside the parent node correctly.
        if( edgeCategory === 'Structure' && _.isArray( targetNode ) ) {
            var multiTargetNodes = targetNode;
            // Set the target node as first node. This is mainly to handle any unknown issue
            targetNode = targetNode[0];

            // Iterate for all target node and then check for each node if any node
            // has parent node already set then don't use that node to create structure
            // relation. If parent is not set then use that node and create the structure relation
            // and break the loop.
            for( var idx1 = 0; idx1 < multiTargetNodes.length; idx1++ ) {
                var node = multiTargetNodes[ idx1 ];
                var parent = groupGraph.getParent( node );
                if( !parent ) {
                    targetNode = node;
                    break;
                }
            }
        }
        edgeData.relationType = edgeCategory;
        var isFailPath = false;
        //get edge style from graph legend
        var legendEdgeStyle = graphLegendSvc.getStyleFromLegend( 'relations', edgeCategory,
            activeLegendView );
        var edgeStyleObject = null;
        if( legendEdgeStyle && ( edgeCategory === 'FailSuccessor' || edgeCategory === 'PendingFailSuccessor' ) ) {
            edgeStyleObject = edgeStyles.FailSuccessorStyle;
            isFailPath = true;
        } else if( legendEdgeStyle && ( edgeCategory === 'CompleteSuccessor' || edgeCategory === 'PendingCompleteSuccessor' ) ) {
            edgeStyleObject = edgeStyles.CompleteSuccessorStyle;
        }
        // Get the correct edge category style from all edge styles and then set the correct style on edge.
        if( edgeStyles[ edgeCategory ] ) {
            edgeStyleObject = edgeStyles[ edgeCategory ];
        }
        if( edgeStyleObject ) {
            if( isFailPath ) {
                legendEdgeStyle.dashStyle = edgeStyleObject.dashStyle;
            }
            legendEdgeStyle.targetArrow = edgeStyleObject.targetArrow;
            legendEdgeStyle.thickness = edgeStyleObject.thickness;
            legendEdgeStyle.targetArrow.fillInterior = true;
        }

        if( sourceNode && targetNode ) {
            if( edgeCategory === 'Structure' ) {
                groupGraph.setAsGroup( sourceNode );

                groupGraph.setParent( sourceNode, [ targetNode ] );

                //the group node is in group display by default, it can be switched to network display
                sourceNode.isNestedDisplay = true;
            } else {
                edge = graph.createEdgeWithNodesStyleAndTag( sourceNode, targetNode, legendEdgeStyle, null );
            }
        }

        if( edge ) {
            if( typeof edgeData.edgeInfo.edgeName !== typeof undefined ) {
                graph.setLabel( edge, edgeData.edgeInfo.edgeName[ 0 ] );
                edge.category = edgeCategory;
            }
            // record all added edges
            addedEdges.push( edge );
        }
    } );
    return addedEdges;
};

/**
 * Create all node that need to be shown on the graph and return those nodes.
 *
 * @param {Object} data Data view model object
 * @param {Array} elementDataArray Node data array that will contain all node information that need to be shown
 * @param {Object} graphModel Graph model object
 * @param {Object} rootTaskObject Root task object
 * @param {Object} activeLegendView Active legend view object to populate node style info
 *
 * @return {Array} addedNodes All actual node objects
 */
var _drawNodes = function( data, elementDataArray, graphModel, rootTaskObject, activeLegendView ) {
    var addedNodes = [];
    if( !elementDataArray || elementDataArray.length <= 0 || !graphModel ) {
        return addedNodes;
    }
    var nodeRect = {
        width: 300,
        height: 100,
        x: 200,
        y: 200
    };
    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;
    var groupGraph = graphControl.groupGraph;
    for( var i = 0; i < elementDataArray.length; i++ ) {
        var nodeData = data.workflowOutput.elementData[ i ];
        var nodeObject = cdm.getObject( nodeData.element.uid );
        var perform_signoff_assignees = [];

        if( rootTaskObject === nodeObject ) {
            var nodeType = 'start';
            var startNode = getStartFinishNode( nodeObject, graph, graphModel, nodeType,
                data.i18n.startTooltip, nodeObject.props.state_value.dbValues[ 0 ], activeLegendView, rootTaskObject );
            addedNodes.push( startNode );
            graphModel.nodeMap.startNode = startNode;

            nodeType = 'finish';
            var finishNode = getStartFinishNode( nodeObject, graph, graphModel, nodeType,
                data.i18n.finishTooltip, nodeObject.props.state_value.dbValues[ 0 ], activeLegendView, rootTaskObject );
            graphModel.nodeMap.finishNode = finishNode;
            addedNodes.push( finishNode );

            continue;
        }

        if( typeof graphModel.nodeMap !== typeof undefined ) {
            var isInteractiveTask = true;
            var nodeCategory = data.workflowOutput.elementData[ i ].elementInfo.elementType[ 0 ];
            if( nodeObject.props.fnd0Status.dbValues === 'Error' ) {
                nodeCategory = 'EPM_failed';
            }
            if( data.workflowOutput.elementData[ i ].elementInfo.isInteractiveTask ) {
                isInteractiveTask = data.workflowOutput.elementData[ i ].elementInfo.isInteractiveTask[ 0 ];
            }

            if( isInteractiveTask === 'false' ) {
                var taskExecStatus = nodeObject.props.fnd0TaskExecutionStatus;

                //check the fnd0TaskExecutionStatus property.  If it is set to 2, don't add as a non-interactive list
                if( taskExecStatus && taskExecStatus.dbValues && taskExecStatus.dbValues.length > 0 ) {
                    var statusValue = taskExecStatus.dbValues[ 0 ];

                    // Additionaly check for this node needs to be shown as interactive node based
                    // on validation like child process or sub process exist on non interactive task
                    if( statusValue !== '2' && !isExceptionNode( nodeObject ) && !isEdgeCountMore( nodeObject ) ) {
                        isInteractiveTask = false;
                        var prominentNode = getStartFinishNode( nodeObject, graph, graphModel,
                            isInteractiveTask );
                        prominentNode.setMinNodeSize( MIN_NODE_SIZE );
                        addedNodes.push( prominentNode );
                        graphModel.nodeMap[ nodeData.element.uid ] = prominentNode;
                        continue;
                    }
                }
            }
            if( typeof data.workflowOutput.elementData[ i ].elementInfo.perform_signoff_assignees !== typeof undefined ) {
                perform_signoff_assignees = data.workflowOutput.elementData[ i ].elementInfo.perform_signoff_assignees;
            }
            var isGroup = isExceptionNode( nodeObject );
            var props = templateService.getBindPropertyNames( nodeObject, perform_signoff_assignees );
            var template = templateService.getNodeTemplate( graphModel.nodeTemplates, props, isGroup, !isInteractiveTask );

            var bindData = templateService.getBindProperties( nodeObject, props, false,
                perform_signoff_assignees );

            //get node style from graph legend
            var nodeStyle = graphLegendSvc.getStyleFromLegend( 'objects', nodeCategory, activeLegendView );
            if( nodeStyle ) {
                bindData.node_fill_color = nodeStyle.borderColor;
            }

            //fill node command binding data
            if( graphModel.nodeCommandBindData ) {
                graphModel.nodeCommandBindData.Awp0ToggleChildren_tooltip = data.i18n.showChildren;
                graphModel.nodeCommandBindData.Awp0ToggleSubProcess_tooltip = data.i18n.showSubProcess;
                declUtils.consolidateObjects( bindData, graphModel.nodeCommandBindData );
            }
             // Get the node rectangle that will be used for node size
            nodeRect = _getNodeRectObject( nodeObject, false, isGroup, null,  bindData );
            var node = graph.createNodeWithBoundsStyleAndTag( nodeRect, template, bindData );
            node.appData = {
                nodeObject: nodeObject,
                isGroup: isGroup,
                category: nodeCategory
            };
            addedNodes.push( node );
            if( isGroup ) {
                node.setGroupingAllowed( true );
                var isExpanded = false;
                groupGraph.setExpanded( node, isExpanded );
            }

            //build node map to help create edges
            var nodeObj = node;
            // Check if graph model node map already contains the node UID and we are trying
            // to add same UID again that means it's duplicate node case and that can happen only in
            // case of sub process where dependency arguemnt is not present. So to handle that case
            // in case of duplicate nodes, we are adding all duplicate nodes to the map and that will
            // be used while creating edge. Duplicate case will happen only in Structure edge case.
            // Fix for defect LCS-604269
            if(  graphModel.nodeMap[ nodeData.element.uid ] ) {
                var nodes = graphModel.nodeMap[ nodeData.element.uid ];
                // If it's not array then create array and add the new node to that array and then
                // add it to map.
                if( !_.isArray( nodes ) ) {
                    nodes = [ nodes ];
                }
                nodes.push( node );
                nodeObj = nodes;
            }
            graphModel.nodeMap[ nodeData.element.uid ] = nodeObj;
        }
    }
    return addedNodes;
};

/**
 * Draw the graph in auto or fixed layout
 * @param {Object} ctx Context object
 * @param {Object} data Declarative view model object
 * @param {Object} graphModel Graph model object
 * @param {String} layout Applied layout string
 * @param {Object} activeLegendView Active legend view object to populate node style info
 */
var _drawGraph = function( ctx, data, graphModel, layout, activeLegendView ) {
    var rootTaskObject = null;
    if( typeof data.workflowOutput !== typeof undefined && data.workflowOutput ) {
        rootTaskObject = workflowGraphService.getRootTaskObject( data.workflowOutput );
        // Set the root task on graph model so that it can be used in all other places. This is mainly
        // needed in fixed layout when user oepning up the task which has children.
        graphModel.rootTaskObject = rootTaskObject;
        setRootTaskObject( rootTaskObject );
    }
    // If we are in fixed layout and we need to show the breadcrumb then only show the breadcrumb
    if( layout === 'FixedLayout' ) {
        if( data.eventMap && data.eventMap[ 'workflowViewer.loadChildren' ] && data.eventMap[ 'workflowViewer.loadChildren' ].object ) {
            var currentParentObject = data.eventMap[ 'workflowViewer.loadChildren' ].object;
            if( currentParentObject ) {
                rootTaskObject = currentParentObject;
                setRootTaskObject( rootTaskObject );
                // Set the root task obejct on graph model
                graphModel.rootTaskObject = rootTaskObject;
                delete data.eventMap[ 'workflowViewer.loadChildren' ].object;
            }
        }
        // Have the updated final breadcrumb here
         if( ctx.workflowViewerSubTaskSelectionUid ) {
            workflowGraphService.populateFixedLayoutBreadCrumbs( ctx, data, ctx.workflowViewerSubTaskSelectionUid );
        } else if( rootTaskObject ) {
            workflowGraphService.populateFixedLayoutBreadCrumbs( ctx, data, rootTaskObject.uid );
        }
    }

    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;
    var addedNodes = [];
    var addedEdges = [];

    // Iterate for each workflow output to create the diagram node and edges
    // that will be shown on the diagram
    if( typeof data.workflowOutput !== typeof undefined ) {
        addedNodes = _drawNodes( data, data.workflowOutput.elementData, graphModel, rootTaskObject, activeLegendView );
        addedEdges = _drawEdges( data, data.workflowOutput.edgeData, graphModel.nodeMap.startNode, graphModel.nodeMap.finishNode, graphModel, activeLegendView );
    }

    // Get the default layout option and apply on the graph
    var defaultLayout = _getAppliedLayoutOption( data );

    if( graphModel && graphModel.graphControl ) {
        applyGraphLayout( graphModel, data );
        graphControl.fitGraph();
        if( defaultLayout && defaultLayout !== 'FixedLayout' ) {
            graphService.setActiveLayout( graphModel, defaultLayout );
        }
    }

    //apply graph filters and notify item added event
    graph.updateOnItemsAdded( addedNodes.concat( addedEdges ) );

    if( typeof data.eventMap !== typeof undefined && data.eventMap.awWorkflowRefreshInitiated !== undefined ) {
        if( data.eventMap.awWorkflowRefreshInitiated.type !== 'Job' && _isEPMtaskOrSignOff( ctx ) ) {
            graphSelection.setSourceObject( data.eventMap.awWorkflowRefreshInitiated );
        }
    } else {
        graphSelection.setSourceObject( ctx.selected );
    }
};

/**
 *
 * Draw the graph in auto or fixed layout. First it will clear the graph if it has any content then only it will
 * draw the graph based on new content.
 * @param {Object} ctx Context object
 * @param {Object} data Declarative view model object
 */
export let drawGraph = function( ctx, data ) {
    document.getElementById( 'WorkflowViewer' ).style.height = '800px';
    var graphModel = data.graphModel;
    parentData = data;

    var activeLegendView = null;
    if( ctx.graph.legendData.legendViews ) {
        activeLegendView = ctx.graph.legendData.legendViews[ 0 ];
    }

    // Clear the graph node map and edge map if not empty
    var isClearGraph = false;
    if( graphModel.nodeMap ) {
        isClearGraph = true;
    }
    graphModel.nodeMap = {};
    graphModel.edgeMap = {};
    if( !graphModel.categoryApi ) {
        workflowLegendSvc.initGraphCategoryApi( graphModel );
    }
    var layout = 'GcLeftToRightLayout';

    // Get the layout to check if it's fixed layout that means all layout will be disabled and we need
    // to set differnt edge routing algorithm.
    if( _isFixedLayoutMode( parentData ) ) {
        layout = 'FixedLayout';
    }

    workflowGraphService.setDiagramConfigForLayout( layout, graphModel );

    // Initially clear the graph
    if( isClearGraph && graphModel && graphModel.graphControl ) {
        //clear the graph
        var graph = graphModel.graphControl.graph;
        if( graph ) {
            graph.update( function() {
                graph.clear();
            } );
        }
    }
    if( graphModel && layout && activeLegendView  ) {
        _drawGraph( ctx, data, graphModel, layout, activeLegendView );
    }
    _setWorkflowViewerContext( data );
};

// Move elements with incremental / sorted layout update
var moveElements = function( movedNodes, movedPorts, layout ) {
    if( layoutActive( layout ) && ( movedNodes.length > 0 || movedPorts.length > 0 ) ) {
        layout.applyUpdate( function() {
            _.forEach( movedNodes, function( node ) {
                layout.moveNode( node );
            } );

            if( incUpdateActive( layout ) ) {
                _.forEach( movedPorts, function( port ) {
                    layout.movePort( port );
                } );
            }
        } );
    }
};

export let graphItemsMoved = function( items, graphModel ) {
    console.log( 'graphItemsMoved event trigged' );
    var movedNodes = [];
    var movedPorts = [];
    if( items ) {
        items.forEach( function( element ) {
            if( element.getItemType() === 'Node' ) {
                movedNodes.push( element );
                console.log( 'moved Nodes:' + element.getAppObj().Name );
            } else if( element.getItemType() === 'Port' ) {
                movedPorts.push( element );
            }
        } );
        var layout = graphModel.graphControl.layout;
        moveElements( movedNodes, movedPorts, layout );
    }
};

var setNodeHoverStyle = function( node, hoveredClass ) {
    var bindData = node.getAppObj();
    templateService.setHoverNodeProperty( bindData, hoveredClass );
    if( node.getSVG() ) {
        node.getSVG().bindNewValues( templateService.NODE_HOVERED_CLASS );
        node.getSVG().bindNewValues( templateService.TEXT_HOVERED_CLASS );
    }
};

export let hoverChanged = function( hoveredItem, unHoveredItem ) {
    if( unHoveredItem && unHoveredItem.getItemType() === 'Node' ) {
        setNodeHoverStyle( unHoveredItem, null );
    }
    if( hoveredItem && hoveredItem.getItemType() === 'Node' ) {
        setNodeHoverStyle( hoveredItem, 'aw-widgets-cellListItemNodeHovered' );
    }
};

export let clearTheCurrentGraphAW = function( graphModel ) {
    if( graphModel && graphModel.graphControl ) {
        graphModel.graphControl.clear();
    }
};

var setParentProcessLinkText = function( parentProcessJobName, parentProcessJob ) {
    parentProcessJob.propertyDisplayName = parentProcessJob.propertyDisplayName.concat( parentProcessJobName );
};

var storeParentProcess = function( parentProcess, parentProcessJob, data ) {
    // Check if parent process is null then no need to process further
    if( typeof parentProcess === typeof undefined ) {
        return;
    }

    previousParentProcesses.push( parentProcess );
    var parentProcessNamePropObject = parentProcess.props.job_name;

    // Parent process property is not null and has some value then only set it
    if( typeof parentProcessNamePropObject !== typeof undefined &&
        typeof parentProcessNamePropObject.dbValues[ 0 ] !== typeof undefined ) {
        parentProcessJob.propertyDisplayName = data.i18n.backTo;
        setParentProcessLinkText( parentProcessNamePropObject.dbValues[ 0 ], parentProcessJob );
    }
};

/**
 * Unregister the selected process from context if registered.
 *
 */
export let unregisterWorkflowContext = function() {
    var context = ctxService.ctx[ 'ActiveWorkspace:xrtContext' ];
    // Check if context is not null and it has entry for selected process then
    // only remove it from context
    if( context && context.selectedProcess ) {
        ctxService.updatePartialCtx( 'ActiveWorkspace:xrtContext.selectedProcess', '' );
    }
    ctxService.unRegisterCtx( 'workflowViewerCtx' );
    ctxService.unRegisterCtx( 'workflowViewerSubTaskSelectionUid' );
};

var refreshSignOffData = function( modelObject ) {
    // Check if input model object is empty then no need to process further and return from here
    if( typeof modelObject === typeof undefined ) {
        return;
    }

    var context = ctxService.ctx[ 'ActiveWorkspace:xrtContext' ];
    // Check if context is present then add the selected process in the context else create a new context.
    if( typeof context !== typeof undefined ) {
        context.selectedProcess = modelObject.uid;
        ctxService.updateCtx( 'ActiveWorkspace:xrtContext', context );
    } else {
        var jsoValue = {
            selectedProcess: modelObject.uid
        };
        ctxService.updateCtx( 'ActiveWorkspace:xrtContext', jsoValue );
    }
};

var openProcessInViewer = function( selected, parentProcess, graphModel, parentProcessJob, data ) {
    exports.clearTheCurrentGraphAW( graphModel );
    storeParentProcess( parentProcess, parentProcessJob, data );
    setRootTaskObject( selected );
    eventBus.publish( 'awWorkflowRefreshInitiated', selected );
    eventBus.publish( 'workflowTaskPanel.updateWhenTaskOpenInViewer', selected );
    eventBus.publish( 'workflowViewer.openProcessInViewer', selected );
    refreshSignOffData( selected );
    ctxService.unRegisterCtx( 'workflowViewerSubTaskSelectionUid' );
};

export let handleCommand = function( graphModel, commandHandlerId, layoutString, data, parentProcessJob, node ) {
    var selected = node.appData.nodeObject;
    parentProcessJob.isSubProcessOpened = true;

    var parentProcess = rootObject;
    if( commandHandlerId === 'OpenProcessInViewer' ) {
        openProcessInViewer( selected, parentProcess, graphModel, parentProcessJob, data );
    }
};

/**
 * Open the selected process in fixed layout from pop view.
 * @param {Object} graphModel Graph model object
 * @param {Object} selectedJob Seleted job that need to open
 */
export let openSubProcessInFixedLayout = function( graphModel, selectedJob ) {
    if( !selectedJob || !parentData ) {
        return;
    }
    var parentProcess = graphModel.rootTaskObject;
    if( typeof parentData.workflowOutput !== typeof undefined && parentData.workflowOutput ) {
        parentProcess = workflowGraphService.getRootTaskObject( parentData.workflowOutput );
    }
    var selctedObject =  selectedJob;

    // Get the root task from job and pass it to open the root ask as this is need to update the perform task
    // panel when user opened up the target.
    if( selctedObject && selctedObject.props && selctedObject.props.root_task && selctedObject.props.root_task.dbValues &&
        selctedObject.props.root_task.dbValues.length > 0 ) {
        var rootTaskUid = selctedObject.props.root_task.dbValues[ 0 ];
        if( rootTaskUid ) {
            selctedObject = cdm.getObject( rootTaskUid );
        }
    }

    // Close the popup view and open the input job
    eventBus.publish( 'Awp0MySubProcessPopup.closePopup' );
    parentData.parentProcess.isSubProcessOpened = true;
    openProcessInViewer( selctedObject, parentProcess, graphModel, parentData.parentProcess, parentData );
};

export let returnToParent = function( graphModel, parentProcessLink, data ) {
    if( typeof previousParentProcesses !== typeof undefined ) {
        exports.clearTheCurrentGraphAW( graphModel );
        if( previousParentProcesses.length > 0 ) {
            var parentProcess = previousParentProcesses[ previousParentProcesses.length - 1 ];
            previousParentProcesses.splice( previousParentProcesses.length - 1, 1 );
            parentProcessLink.isSubProcessOpened = false;
            if( previousParentProcesses.length > 0 ) {
                parentProcessLink.isSubProcessOpened = true;
                var parentOfParentProcess = previousParentProcesses[ previousParentProcesses.length - 1 ];
                var parentProcessNamePropObject = parentOfParentProcess.props.job_name;
                if( typeof parentProcessNamePropObject !== typeof undefined ) {
                    parentProcessLink.propertyDisplayName = data.i18n.backTo;
                    setParentProcessLinkText( parentProcessNamePropObject.dbValues[ 0 ], parentProcessLink );
                }
            }
            setRootTaskObject( parentProcess );

            // Update the signoff table as per selection
            refreshSignOffData( parentProcess );
        }
        // This is mainly needed when we click on back to parent that time this should nto have any value
        // as we shows the main graph and it will set the breadcrumb for that correctly while loading the graph
        ctxService.unRegisterCtx( 'workflowViewerSubTaskSelectionUid' );
        var selctedObject = ctxService.ctx.xrtSummaryContextObject;
        var workflowRefreshProcess = parentProcess;
        // Get the root task from open xrt summary object and check if it matches with parent process task then we need to
        // send selected object to server to show the graph. As it should show selected object as open object only.
        // Fix for defect # LCS-444174
        if( selctedObject && selctedObject.props && selctedObject.props.root_task && selctedObject.props.root_task.dbValues &&
            selctedObject.props.root_task.dbValues.length > 0 ) {
            var rootTaskUid = selctedObject.props.root_task.dbValues[ 0 ];
            if( rootTaskUid && parentProcess && parentProcess.uid === rootTaskUid ) {
                workflowRefreshProcess = selctedObject;
            }
        }
        eventBus.publish( 'awWorkflowRefreshInitiated', workflowRefreshProcess );
        eventBus.publish( 'workflowTaskPanel.updateWhenTaskOpenInViewer', parentProcess );
        eventBus.publish( 'workflowViewer.openProcessInViewer', parentProcess );
        // Clear the breadcrumb when user click on back to parent process link
        if( data && data.provider ) {
            data.provider.crumbs = [];
        }
    }
};

/**
 * Register workflow properties
 *
 * @param {Object} policy Policy that need to be registered
 */
export let registerWorkflowProp = function( policy ) {
    if( policy ) {
        workflowViewerPropertyPolicy = policySvc.register( policy );
    }
};

/**
 * Unregister workflow properties
 */
export let unregisterWorkflowProp = function() {
    if( workflowViewerPropertyPolicy !== null ) {
        policySvc.unregister( workflowViewerPropertyPolicy );
        workflowViewerPropertyPolicy = null;
    }
};

export let disableTheLink = function( data ) {
    data.parentProcess.isSubProcessOpened = false;
};

export default exports = {
    setNodeHeightOnWrappedHeightChanged,
    drawGraph,
    graphItemsMoved,
    hoverChanged,
    clearTheCurrentGraphAW,
    unregisterWorkflowContext,
    handleCommand,
    returnToParent,
    registerWorkflowProp,
    unregisterWorkflowProp,
    disableTheLink,
    openSubProcessInFixedLayout
};

app.factory( 'Awp0WorkflowService', () => exports );

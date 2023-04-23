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
 * @module js/NetworkGraphService
 */
import app from 'app';
import NetworkUtils from 'js/NetworkUtils';
import NetworkGraphTemplateService from 'js/NetworkGraphTemplateService';
import selectionService from 'js/selection.service';
import appCtxService from 'js/appCtxService';
import NetworkGraphLegendService from 'js/NetworkGraphLegendService';
import NetworkGraphDataService from 'js/NetworkGraphDataService';
import NetworkGraphDrawNodeEdge from 'js/NetworkGraphDrawNodeEdge';
import balloonPopupSvc from 'js/balloonPopupService';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import graphService from 'js/awGraphService';
import graphLegendService from 'js/graphLegendService';
import declUtils from 'js/declUtils';
import graphConstants from 'js/graphConstants';

var exports = {};

export let initLegendData = function( ctx ) {
    var formattedLegendViewsData = NetworkGraphLegendService.createLegendViewsData();
    //init legend
    ctx.graph.legendData = formattedLegendViewsData;
    graphLegendService.initLegendActiveView( formattedLegendViewsData, ctx.graph.legendState );
    var eventData = {
        userActionKey: 'openDiagram'
    };
    eventBus.publish( 'network.legendInitialized', eventData );
};

/**
 * Get input for loadNetworkGraph2 SOA input.
 *
 * @param ctx the application context object
 * @param data the view model object
 *
 * @return the queryNetwork SOA input
 */
export let getloadNetworkGraphInput = function( ctx, data ) {
    if( !ctx || !data ) {
        return;
    }
    var graphParamMap;
    var rootid;
    if( data.eventMap[ 'network.expandOutgoing' ] && data.eventMap[ 'network.expandOutgoing' ].userActionKey === 'ExpandIn' ) {
        graphParamMap = {
            direction: graphConstants.ExpandDirection.BACKWARD
        };
        rootid = [ ctx.graph.commandContextItem.appData.id ];
    } else {
        graphParamMap = {
            direction: graphConstants.ExpandDirection.FORWARD
        };
        rootid = [ ctx.selected.uid ];
    }
    var input = {
        rootIds: rootid,
        loadParameters: graphParamMap
    };
    return input;
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
            return null;
        }
    };
};

var drawItemsAndApplyLayout = function( ctx, data, graphModel ) {
    var activeLegendView = null;

    if( ctx.graph.legendState ) {
        activeLegendView = ctx.graph.legendState.activeView;
    }

    if( !graphModel.nodeMap ) {
        graphModel.nodeMap = {};
    }

    var graphControl = graphModel.graphControl;
    var graph = graphControl.graph;

    var networkGraphData = {};
    NetworkGraphDataService.populateNetworkGraphData( ctx, data, networkGraphData );

    NetworkGraphDrawNodeEdge.setDegreeToNode( networkGraphData );

    NetworkGraphDrawNodeEdge.drawNodes( networkGraphData, graphModel, graph, activeLegendView, data );

    NetworkGraphDrawNodeEdge.drawEdges( networkGraphData.edges, graphModel, graph, activeLegendView );
    graph.updateOnItemsAdded();
    graphService.setActiveLayout( graphModel, 'GcRightToLeftLayout' );
};

export let drawGraph = function( ctx, data ) {
    var graphModel = data.graphModel;
    var isInitial;
    if( !graphModel.nodeMap ) {
        graphModel.nodeMap = {};
        isInitial = true;
    }

    drawItemsAndApplyLayout( ctx, data, graphModel );

    eventBus.publish( 'networkUpdateDegreeInfoOnNodes' );

    if( !graphModel.categoryApi ) {
        initGraphCategoryApi( graphModel );
    }

    if( isInitial ) {
        graphModel.graphControl.fitGraph();
    }
};

var updateDegreeAttributesOnNode = function( node, edgeDirection, graphModel, data ) {
    var degree = 0;
    var visibleRelations;
    var unLoadedRelations;
    if( edgeDirection === graphConstants.EdgeDirection.OUT && node.appData.outDegrees ) {
        degree = node.appData.outDegrees;
    } else if( edgeDirection === graphConstants.EdgeDirection.IN && node.appData.inDegrees ) {
        degree = node.appData.inDegrees;
    }
    var outgoingEdges = node.getEdges( edgeDirection );
    visibleRelations = NetworkUtils.getVisibleRelations( outgoingEdges, edgeDirection );
    unLoadedRelations = NetworkUtils.getUnloadedRelations( degree, visibleRelations );
    if( unLoadedRelations === 0 ) {
        if( edgeDirection === graphConstants.EdgeDirection.OUT ) {
            node.isOutGoingExpanded = true;
        } else {
            node.isInComingExpanded = true;
        }
    } else {
        if( edgeDirection === graphConstants.EdgeDirection.OUT ) {
            node.isOutGoingExpanded = false;
        } else {
            node.isInComingExpanded = false;
        }
    }
    //get AppObj
    var nodeObject = {};
    //set your binding values
    NetworkGraphTemplateService.getDegree( degree, visibleRelations, unLoadedRelations, edgeDirection, nodeObject, data );
    //update the bindings
    graphModel.graphControl.graph.updateNodeBinding( node, nodeObject );
};

export let updateDegreeInfoOnAllVisibleNodes = function( data, ctx ) {
    _.forOwn( data.graphModel.nodeMap, function( value ) {
        updateDegreeAttributesOnNode( value, 'OUT', ctx.graph.graphModel, data );
        updateDegreeAttributesOnNode( value, 'IN', ctx.graph.graphModel, data );
    } );
};

/**
 * Toggle incoming edges visibility for the given node
 */
export let toggleIncomingEdges = function( graphModel, node ) {
    if( graphModel && node && node.appData.nodeObject ) {
        var edges = node.getEdges( graphConstants.EdgeDirection.IN );
        var visibleEdges = _.filter( edges, function( edge ) {
            return edge.isVisible();
        } );

        if( visibleEdges.length > 0 ) {
            var graph = graphModel.graphControl.graph;

            var numFilteredOutDegrees = node.appData.inDegrees;

            // Remove Incoming nodes.
            if( numFilteredOutDegrees === visibleEdges.length ) {
                var nodeRemoveMap = {};
                var nodesToBeRemoved = [];
                NetworkUtils.getNodesToBeRemoved( graphModel, node, nodesToBeRemoved );
                nodeRemoveMap.nodesToBeRemoved = nodesToBeRemoved;
                for( var i = 0; i < nodesToBeRemoved.length; i++ ) {
                    delete graphModel.nodeMap[ nodesToBeRemoved[ i ].appData.id ];
                }

                graph.removeNodes( nodeRemoveMap.nodesToBeRemoved );
                node.isInComingExpanded = false;
                graphModel.collapseDirection = graphConstants.EdgeDirection.IN;
                graphModel.selectedNodeForCollapse = node;
                graphModel.nodeRemoveMap = nodeRemoveMap;
                graph.updateOnItemsAdded();
                eventBus.publish( 'networkUpdateDegreeInfoOnNodes' );
            } else {
                node.Psi0NetworkGraphShownIncomingEdges = visibleEdges.length;
                node.Psi0NetworkGraphTotalIncomingEdges = numFilteredOutDegrees;

                var element = $( node.getSVG().getEvaluatedSvgContent() ).find( '[data-command-id=\'Psi0ExpandUp\']' )[ 0 ];
                var viewportOffset = element.getBoundingClientRect();

                var commandDimension = {
                    popupId: 'Psi0NetworkGraphIncoming',
                    offsetHeight: viewportOffset.height,
                    offsetLeft: viewportOffset.left,
                    offsetTop: viewportOffset.top,
                    offsetWidth: viewportOffset.width
                };

                balloonPopupSvc.openBalloonPopup( 'Psi0NetworkGraphShowIncomingPopup', commandDimension, 'bottom', '100px', '300px', 'false' );
            }

            // Show more Incoming nodes.
        } else {
            eventBus.publish( 'network.expandOutgoing', {
                rootIDs: [ node.appData.nodeObject.uid ],
                userActionKey: 'ExpandIn'
            } );
        }
    }
};

/**
 * Toggle outgoing edges visibility for the given node
 */
export let toggleOutgoingEdges = function( graphModel, node ) {
    if( graphModel && node && node.appData.nodeObject ) {
        var edges = node.getEdges( graphConstants.EdgeDirection.OUT );
        var visibleEdges = _.filter( edges, function( edge ) {
            return edge.isVisible();
        } );

        if( visibleEdges.length > 0 ) {
            var graph = graphModel.graphControl.graph;

            var numFilteredOutDegrees = node.appData.outDegrees;

            // Remove Outgoing nodes.
            if( numFilteredOutDegrees === visibleEdges.length ) {
                var graph = graphModel.graphControl.graph;
                var isNodeInComingExpanded = node.isInComingExpanded;
                if( isNodeInComingExpanded ) {
                    var nodeRemoveMap = {};
                    var nodesToBeRemoved = [];
                    NetworkUtils.getNodesToBeRemoved( graphModel, node, nodesToBeRemoved );
                    nodesToBeRemoved = _.without( nodesToBeRemoved, node );
                    nodeRemoveMap.nodesToBeRemoved = nodesToBeRemoved;
                    for( var i = 0; i < nodesToBeRemoved.length; i++ ) {
                        delete graphModel.nodeMap[ nodesToBeRemoved[ i ].appData.id ];
                    }

                    graph.removeNodes( nodeRemoveMap.nodesToBeRemoved );
                    node.isInComingExpanded = false;
                    graphModel.collapseDirection = graphConstants.EdgeDirection.IN;
                    graphModel.selectedNodeForCollapse = node;
                    graphModel.nodeRemoveMap = nodeRemoveMap;
                    eventBus.publish( 'networkUpdateDegreeInfoOnNodes' );
                }

                // Ask the user via a popup whether they want to hide the remaining
                // Outgoing edges or bring back the missing ones.
            } else {
                node.Psi0NetworkGraphShownOutgoingEdges = visibleEdges.length;
                node.Psi0NetworkGraphTotalOutgoingEdges = numFilteredOutDegrees;

                var element = $( node.getSVG().getEvaluatedSvgContent() ).find( '[data-command-id=\'Psi0ExpandDown\']' )[ 0 ];
                var viewportOffset = element.getBoundingClientRect();

                var commandDimension = {
                    popupId: 'Psi0NetworkGraphOutgoing',
                    offsetHeight: viewportOffset.height,
                    offsetLeft: viewportOffset.left,
                    offsetTop: viewportOffset.top,
                    offsetWidth: viewportOffset.width
                };

                balloonPopupSvc.openBalloonPopup( 'Psi0NetworkGraphShowOutgoingPopup', commandDimension, 'bottom', '100px', '300px', 'false' );
            }

            // Show more Outgoing nodes.
        } else {
            node.isOutGoingExpanded = true;
            var selectedNodeObject = node.appData.nodeObject;

            eventBus.publish( 'network.expandOutgoing', {
                rootIDs: [ selectedNodeObject.uid ],
                userActionKey: 'ExpandOut'
            } );
        }
    }
};

export let networkGrpahUpdateMethod = function( data ) {
    eventBus.publish( 'workElementCreateSuccessful', data );
};

var incUpdateActive = function( layout ) {
    return layout && layout.type === 'IncUpdateLayout' && layout.isActive();
};

var layoutActive = function( layout ) {
    return incUpdateActive( layout );
};
// Move elements with incremental / sorted layout update
var moveElements = function( movedNodes, movedPorts, layout ) {
    if( layoutActive( layout ) && movedNodes.length > 0 ) {
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

export let networkgraphItemsMoved = function( items, graphModel ) {
    var movedNodes = [];
    var movedPorts = [];
    if( items ) {
        items.forEach( function( element ) {
            if( element.getItemType() === 'Node' ) {
                movedNodes.push( element );
            } else if( element.getItemType() === 'Port' ) {
                movedPorts.push( element );
            }
        } );
        var layout = graphModel.graphControl.layout;
        moveElements( movedNodes, movedPorts, layout );
    }
};

/**
 * Closes all instances of aw-balloon-popup created by the expand
 * command buttons on the node and executes the desired hide/show
 * action.
 *
 * @param graphModel the graph model object
 * @param node the context node.
 * @param direction the direction of the command, Incoming/Outgoing.
 * @param action the action: Hide/Show.
 */
export let networkGraphclosePopup = function( graphModel, node, direction, action ) {
    var awBalloonPopups;

    if( direction && _.isString( direction ) ) {
        awBalloonPopups = $( 'body' ).find( 'aw-balloon-popup-panel#Psi0NetworkGraph' + direction + 'BalloonPopup' );
    }

    _.forEach( awBalloonPopups, function( element ) {
        $( element ).detach();
        eventBus.publish( 'balloonPopup.Close', { popupId: element.id } );
    } );

    // Remove properties set the by Incoming command.
    $( node ).removeProp( 'Psi0NetworkGraphShownIncomingEdges' );
    $( node ).removeProp( 'Psi0NetworkGraphTotalIncomingEdges' );

    // Remove properties set the by Outgoing command.
    $( node ).removeProp( 'Psi0NetworkGraphShownOutgoingEdges' );
    $( node ).removeProp( 'Psi0NetworkGraphTotalOutgoingEdges' );

    if( direction === 'Incoming' ) {
        if( action === 'Show' ) {
            eventBus.publish( 'network.expandOutgoing', {
                rootIDs: [ node.appData.nodeObject.uid ],
                userActionKey: 'ExpandIn'
            } );
        } else if( action === 'Hide' ) {
            var nodeRemoveMap = {};
            var nodesToBeRemoved = [];
            NetworkUtils.getNodesToBeRemoved( graphModel, node, nodesToBeRemoved );
            nodeRemoveMap.nodesToBeRemoved = nodesToBeRemoved;
            for( var i = 0; i < nodesToBeRemoved.length; i++ ) {
                delete graphModel.nodeMap[ nodesToBeRemoved[ i ].appData.id ];
            }

            graph.removeNodes( nodeRemoveMap.nodesToBeRemoved );
            node.isInComingExpanded = false;
            graphModel.collapseDirection = graphConstants.EdgeDirection.IN;
            graphModel.selectedNodeForCollapse = node;
            graphModel.nodeRemoveMap = nodeRemoveMap;
            graph.updateOnItemsAdded();
            eventBus.publish( 'networkUpdateDegreeInfoOnNodes' );
        }
    } else if( direction === 'Outgoing' ) {
        if( action === 'Show' ) {
            eventBus.publish( 'network.expandOutgoing', {
                rootIDs: [ node.appData.nodeObject.uid ],
                userActionKey: 'ExpandOut'
            } );
        } else if( action === 'Hide' ) {
            var graph = graphModel.graphControl.graph;
            var isNodeInComingExpanded = node.isInComingExpanded;
            if( isNodeInComingExpanded ) {
                var nodeRemoveMap = {};
                var nodesToBeRemoved = [];
                NetworkUtils.getNodesToBeRemoved( graphModel, node, nodesToBeRemoved );
                nodesToBeRemoved = _.without( nodesToBeRemoved, node );
                nodeRemoveMap.nodesToBeRemoved = nodesToBeRemoved;
                for( var i = 0; i < nodesToBeRemoved.length; i++ ) {
                    delete graphModel.nodeMap[ nodesToBeRemoved[ i ].appData.id ];
                }

                graph.removeNodes( nodeRemoveMap.nodesToBeRemoved );
                node.isInComingExpanded = false;
                graphModel.collapseDirection = graphConstants.EdgeDirection.IN;
                graphModel.selectedNodeForCollapse = node;
                graphModel.nodeRemoveMap = nodeRemoveMap;
                eventBus.publish( 'networkUpdateDegreeInfoOnNodes' );
            }
        }
    }
};

/**
 * Initialization
 */
const loadConfiguration = () => {
    eventBus.subscribe( 'networkGraph.contentUnloaded', function() {
        if( appCtxService.getCtx( 'networkGraphNodeSelection' ) ) {
            appCtxService.unRegisterCtx( 'networkGraphNodeSelection' );
        }
    }, 'NetworkGraphService' );
};

loadConfiguration();

export default exports = {
    initLegendData,
    getloadNetworkGraphInput,
    drawGraph,
    updateDegreeInfoOnAllVisibleNodes,
    toggleIncomingEdges,
    toggleOutgoingEdges,
    networkGrpahUpdateMethod,
    networkgraphItemsMoved,
    networkGraphclosePopup
};
app.factory( 'NetworkGraphService', () => exports );

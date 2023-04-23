// Copyright (c) 2019 Siemens

/* global
 afxDynamicImport
 */
/**
 * This module defines utility methods to initialize graph data provider
 *
 * @module js/graphDataProviderService
 */
import app from 'app';
import _ from 'lodash';
import logger from 'js/logger';
import eventBus from 'js/eventBus';
import graphModelService from 'js/graphModelService';

var exports = {};
var validate = function( graphDataProvider ) {
    if( !graphDataProvider.name ) {
        throw 'The "name" property is not defined in graph data provider.';
    }

    if( !graphDataProvider.graphRenderInterface ) {
        throw 'The "graphRenderInterface" property is not defined in graph data provider.';
    }

    var dataParser = graphDataProvider.dataParser;
    if( !dataParser ) {
        throw 'The "dataParser" property is not defined in graph data provider.';
    }
    if( !dataParser.nodes ) {
        throw 'The "nodes" property is not defined in graph data parser.';
    }
    if( !dataParser.node ) {
        throw 'The "node" property is not defined in graph data parser.';
    }
    if( !dataParser.node.id ) {
        throw 'The "id" property is not defined in graph node parser.';
    }
};

export let init = function( graphModel, graphDataProvider ) {
    if( !graphDataProvider ) {
        return;
    }

    validate( graphDataProvider );

    graphDataProvider.renderApis = {};
    afxDynamicImport( [ graphDataProvider.graphRenderInterface ], function( apiImpl ) {
        graphDataProvider.renderApis = apiImpl;

        if( !apiImpl.getNodeStyle ) {
            throw 'Missing required graph render API "getNodeStyle" in graph data provider ' + graphDataProvider.graphRenderInterface;
        }

        if( !apiImpl.getNodeBindData ) {
            throw 'Missing required graph render API "getNodeBindData" in graph data provider ' + graphDataProvider.graphRenderInterface;
        }
    } );

    graphModel.categoryApi = {
        getCategory: function( graphItem ) {
            if( graphItem && graphItem.model ) {
                return graphItem.model.category;
            }

            return null;
        },
        getNodeCategory: function( node ) {
            if( node && node.model ) {
                return node.model.category;
            }

            return null;
        },
        getEdgeCategory: function( edge ) {
            if( edge && edge.model ) {
                return edge.model.category;
            }
            return null;
        },
        getGroupRelationCategory: function() {
            return graphDataProvider.groupRelationCategory;
        },
        getPortCategory: function( port ) {
            if( port && port.model ) {
                return port.model.category;
            }
            return null;
        },
        getBoundaryCategory: function( boundary ) {
            if( boundary && boundary.model ) {
                return boundary.model.category;
            }
            return null;
        }
    };

    var parseNodes = function( dataParser, rawGraphData, graphDataModel ) {
        var nodesPath = dataParser.nodes || 'nodes';
        var nodeObjects = _.get( rawGraphData, nodesPath ) || [];
        var nodeParser = dataParser.node;
        nodeObjects.forEach( function( nodeObject ) {
            var nodeId = _.get( nodeObject, nodeParser.id );
            if( !nodeId ) {
                logger.error( 'Failed to parse graph node id.' );
                return;
            }

            var nodeModel = graphModel.dataModel.nodeModels[ nodeId ];
            if( !nodeModel ) {
                var category = _.get( nodeObject, nodeParser.category );
                var label = _.get( nodeObject, nodeParser.label );
                nodeModel = new graphModelService.NodeModel( nodeId, nodeObject, category, label );

                var position = _.get( nodeObject, nodeParser.position );
                if( position ) {
                    nodeModel.setInitPosition( position );
                }

                var labelPosition = _.get( nodeObject, nodeParser.labelPosition );
                if( labelPosition ) {
                    nodeModel.setInitLabelPosition( labelPosition );
                }
                var initialExpanded = _.get( nodeObject, nodeParser.initialExpanded );
                if( initialExpanded !== undefined ) {
                    nodeModel.setInitialExpanded( initialExpanded );
                }
            }
            graphDataModel.nodeModels[ nodeId ] = nodeModel;
        } );
    };

    var parseBoundaries = function( dataParser, rawGraphData, graphDataModel ) {
        var boundaryPath = dataParser.boundaries || 'boundaries';
        var boundaryObjects = _.get( rawGraphData, boundaryPath ) || [];
        var boundaryParser = dataParser.boundary;
        boundaryObjects.forEach( function( boundaryObject ) {
            var id = _.get( boundaryObject, boundaryParser.id );
            if( !id ) {
                logger.error( 'Failed to parse graph boundary id.' );
                return;
            }

            var boundaryModel = graphModel.dataModel.boundaryModels[ id ];
            if( !boundaryModel ) {
                var category = _.get( boundaryObject, boundaryParser.category );
                var label = _.get( boundaryObject, boundaryParser.label );
                boundaryModel = new graphModelService.BoundaryModel( id, boundaryObject, category, label );

                var position = _.get( boundaryObject, boundaryParser.position );
                if( position ) {
                    boundaryModel.setInitPosition( position );
                }

                var labelPosition = _.get( boundaryObject, boundaryParser.labelPosition );
                if( labelPosition ) {
                    boundaryModel.setInitLabelPosition( labelPosition );
                }
            }
            graphDataModel.boundaryModels[ id ] = boundaryModel;
        } );
    };

    var parsePorts = function( dataParser, rawGraphData, graphDataModel ) {
        var portsPath = dataParser.ports || 'ports';
        var portObjects = _.get( rawGraphData, portsPath ) || [];
        var portParser = dataParser.port;
        portObjects.forEach( function( portObject ) {
            var portId = _.get( portObject, portParser.id );
            if( !portId ) {
                logger.error( 'Failed to parse graph port id.' );
                return;
            }

            var portModel = graphModel.dataModel.portModels[ portId ];
            if( !portModel ) {
                var ownerNodeId = _.get( portObject, portParser.ownerNodeId );
                var ownerNode = graphDataModel.nodeModels[ ownerNodeId ];
                if( !ownerNode ) {
                    logger.error( 'Failed to parse port [ID: ,', portId, '],  port owner doesn not exist.' );
                    return;
                }
                var category = _.get( portObject, portParser.category );
                var label = _.get( portObject, portParser.label );
                portModel = new graphModelService.PortModel( portId, portObject, category, ownerNode, label );

                var position = _.get( portObject, portParser.position );
                if( position ) {
                    portModel.setInitPosition( position );
                }

                var labelPosition = _.get( portObject, portParser.labelPosition );
                if( labelPosition ) {
                    portModel.setInitLabelPosition( labelPosition );
                }
            }
            graphDataModel.portModels[ portId ] = portModel;
        } );
    };

    var parseEdges = function( dataParser, rawGraphData, graphDataModel ) {
        var edgesPath = dataParser.edges || 'edges';
        var edgeObjects = _.get( rawGraphData, edgesPath ) || [];
        var edgeParser = dataParser.edge;
        edgeObjects.forEach( function( edgeObject ) {
            var edgeId = _.get( edgeObject, edgeParser.id );
            if( !edgeId ) {
                logger.error( 'Failed to parse graph edge id, edge id is not defined.' );
                return;
            }

            var edgeModel = graphModel.dataModel.edgeModels[ edgeId ];
            if( !edgeModel ) {
                var sourceNodeModel;
                var targetNodeModel;
                var sourcePortModel;
                var targetPortModel;

                // parse source/target port ID first, if not exist then parse source/target node
                if( edgeParser.sourcePortId ) {
                    var sourcePortId = _.get( edgeObject, edgeParser.sourcePortId );
                    if( sourcePortId ) {
                        sourcePortModel = graphDataModel.portModels[ sourcePortId ];
                    }
                }

                // if source port not defined, then parse source node
                if( sourcePortModel ) {
                    sourceNodeModel = graphDataModel.nodeModels[ sourcePortModel.ownerNode.id ];
                } else if( edgeParser.sourceNodeId ) {
                    var sourceNodeId = _.get( edgeObject, edgeParser.sourceNodeId );
                    if( sourceNodeId ) {
                        sourceNodeModel = graphDataModel.nodeModels[ sourceNodeId ];
                    }
                }

                if( !sourcePortModel && !sourceNodeModel ) {
                    logger.error( 'Failed to parse the edge [ID:', edgeId, '], the source port or node does not exist.' );
                    return;
                }

                if( edgeParser.targetPortId ) {
                    var targetPortId = _.get( edgeObject, edgeParser.targetPortId );
                    if( targetPortId ) {
                        targetPortModel = graphDataModel.portModels[ targetPortId ];
                    }
                }

                if( targetPortModel ) {
                    targetNodeModel = graphDataModel.nodeModels[ targetPortModel.ownerNode.id ];
                } else if( edgeParser.targetNodeId ) {
                    var targetNodeId = _.get( edgeObject, edgeParser.targetNodeId );
                    if( targetNodeId ) {
                        targetNodeModel = graphDataModel.nodeModels[ targetNodeId ];
                    }
                }

                if( !targetPortModel && !targetNodeModel ) {
                    logger.error( 'Failed to parse the edge [ID:', edgeId, '], the target port or node does not exist.' );
                    return;
                }

                var category = _.get( edgeObject, edgeParser.category );
                var label = _.get( edgeObject, edgeParser.label );
                edgeModel = new graphModelService.EdgeModel( edgeId, edgeObject, category, sourceNodeModel, targetNodeModel, sourcePortModel, targetPortModel, label );

                var position = _.get( edgeObject, edgeParser.position );
                if( position ) {
                    edgeModel.setInitPosition( position );
                }

                var labelPosition = _.get( edgeObject, edgeParser.labelPosition );
                if( labelPosition ) {
                    edgeModel.setInitLabelPosition( labelPosition );
                }
            }
            graphDataModel.edgeModels[ edgeId ] = edgeModel;
        } );
    };

    /**
     * Parse graph data and create standard graph data model
     * @param {Object} dataParser the graph data parser
     * @param {Object} rawGraphData the graph data
     * @returns {Object} the converted graph data model
     */
    function parseGraphData( dataParser, rawGraphData ) {
        var graphDataModel = {
            nodeModels: {},
            boundaryModels: {},
            edgeModels: {},
            portModels: {}
        };

        if( !rawGraphData ) {
            logger.error( 'No graph data' );
            return graphDataModel;
        }

        parseNodes( dataParser, rawGraphData, graphDataModel );
        parseBoundaries( dataParser, rawGraphData, graphDataModel );
        parsePorts( dataParser, rawGraphData, graphDataModel );
        parseEdges( dataParser, rawGraphData, graphDataModel );
        return graphDataModel;
    }

    /**
     * Draw graph node
     * @param {Object} graphDataProvider the graph data provider
     * @param {Array} nodeModels the array of node models to be rendered
     * @returns {Array} created node array
     */
    function drawNodes( graphDataProvider, nodeModels ) {
        var graph = graphModel.graphControl.graph;
        var groupGraph = graphModel.graphControl.groupGraph;
        var renderApis = graphDataProvider.renderApis;
        var newNodes = [];
        _.values( nodeModels ).forEach( function( nodeModel ) {
            // skip drawing the existing edge
            if( graphModel.dataModel.nodeModels[ nodeModel.id ] ) {
                return;
            }

            var nodeRect = nodeModel.initialPosition || {};
            if( !nodeRect.width || !nodeRect.height ) {
                if( renderApis.getNodeSize ) {
                    var size = renderApis.getNodeSize( graphModel, nodeModel );
                    nodeRect.width = size.width;
                    nodeRect.height = size.height;
                }
            }

            var template = renderApis.getNodeStyle( graphModel, nodeModel );
            var bindData = renderApis.getNodeBindData( graphModel, nodeModel );
            var node = graph.createNodeWithBoundsStyleAndTag( nodeRect, template, bindData );
            if( template.isGroup ) {
                groupGraph.setAsGroup( node );
            }

            // set node label
            if( nodeModel.label ) {
                var labelConfig;
                if( typeof graphDataProvider.renderApis.getNodeLabelConfig === 'function' ) {
                    labelConfig = graphDataProvider.renderApis.getNodeLabelConfig( graphModel, nodeModel );
                }
                graph.setLabel( node, nodeModel.label, labelConfig );
                if( nodeModel.initLabelPosition ) {
                    node.getLabel().setPosition( nodeModel.initLabelPosition );
                }
            }

            graphModel.addNodeModel( node, nodeModel );
            newNodes.push( node );
        } );
        return newNodes;
    }

    /**
     * Draw boundary on graph
     * @param {Object} graphDataProvider the graph data provider
     * @param {Array} boundaryModels the array of boundary models to be rendered
     * @returns {Array} created boundary array
     */
    function drawBoundaries( graphDataProvider, boundaryModels ) {
        var graph = graphModel.graphControl.graph;
        var newBoundaries = [];
        _.values( boundaryModels ).forEach( function( boundaryModel ) {
            // skip drawing the existing edge
            if( graphModel.dataModel.boundaryModels[ boundaryModel.id ] ) {
                return;
            }

            var position = boundaryModel.initialPosition || {};
            var boundary = graph.createBoundary( position, graphModel.config.defaults.boundaryStyle );

            // set node label
            if( boundaryModel.label ) {
                graph.setLabel( boundary, boundaryModel.label, graphModel.config.defaults.boundaryLabel );
            }

            graphModel.addBoundaryModel( boundary, boundaryModel );
            newBoundaries.push( boundary );
        } );
        return newBoundaries;
    }

    /**
     *Draw graph ports
     * @param {Object} graphDataProvider the graph data provider
     * @param {Array} portModels the array of port models to be rendered
     * @returns {Array} created edge array
     */
    function drawPorts( graphDataProvider, portModels ) {
        var graph = graphModel.graphControl.graph;
        var renderApis = graphDataProvider.renderApis;
        var newPorts = [];
        if( typeof renderApis.getPortStyle === 'function' ) {
            _.values( portModels ).forEach( function( portModel ) {
                // skip drawing the existing edge
                if( graphModel.dataModel.portModels[ portModel.id ] ) {
                    return;
                }

                var portStyle = renderApis.getPortStyle( graphModel, portModel );
                var port = graph.addPortAtLocationWithStyle( portModel.ownerNode.graphItem, portModel.initialPosition, portStyle );
                if( portModel.label ) {
                    graph.setLabel( port, portModel.label );

                    if( portModel.initLabelPosition ) {
                        port.getLabel().setPosition( portModel.initLabelPosition );
                    }
                }

                graphModel.addPortModel( port, portModel );
                newPorts.push( port );
            } );
        } else {
            logger.error( 'The "getPortStyle" API is not defined in graph render API implementation, skip drawing ports.' );
        }
        return newPorts;
    }

    /**
     * Draw graph edges
     * @param {Object} graphDataProvider the graph data provider
     * @param {Array} edgeModels the array of edge models to be rendered
     * @returns {Object} the graph updates
     */
    function drawEdges( graphDataProvider, edgeModels ) {
        var graph = graphModel.graphControl.graph;
        var groupGraph = graphModel.graphControl.groupGraph;
        var renderApis = graphDataProvider.renderApis;
        var graphUpdates = {
            newEdges: [],
            expandedGroupNodes: [],
            collapsedGroupNodes: [],
            parentChangedNodes: []
        };

        var isNetworkMode = graph.isNetworkMode();
        var groupCategory = graphDataProvider.groupRelationCategory;
        // skip drawing the existing edge
        edgeModels = _.filter( edgeModels, function( edgeModel ) {
            var sourceNode = edgeModel.sourceNode.graphItem;
            var targetNode = edgeModel.targetNode.graphItem;

            if( !sourceNode || !targetNode ) {
                logger.error( 'Failed to get source or target node. Skip drawing the edge [', edgeModel.id, '].' );
                return false;
            }
            return graphModel.dataModel.edgeModels[ edgeModel.id ] === undefined;
        } );

        var edgeModelGroup = [
            [], edgeModels
        ];
        if( edgeModelGroup && !isNetworkMode ) {
            edgeModelGroup = _.partition( edgeModels, function( edgeModel ) {
                return edgeModel.category === groupCategory;
            } );

            // process group relation edge models first
            _.values( edgeModelGroup[ 0 ] ).forEach( function( edgeModel ) {
                var sourceNode = edgeModel.sourceNode.graphItem;
                var targetNode = edgeModel.targetNode.graphItem;

                // create group for group relation
                var edge;
                if( !groupGraph.isGroup( sourceNode ) ) {
                    // convert normal node to group
                    groupGraph.setAsGroup( sourceNode );
                }

                if( sourceNode !== groupGraph.getParent( targetNode ) ) {
                    groupGraph.setParent( sourceNode, [ targetNode ] );
                    graphUpdates.parentChangedNodes.push( targetNode );

                    // set group node initial expansion state
                    var initialExpanded = sourceNode.model.initialExpanded;
                    var isExpanded = groupGraph.isExpanded( sourceNode );
                    if( initialExpanded !== undefined ) {
                        if( initialExpanded !== isExpanded ) {
                            groupGraph.setExpanded( sourceNode, initialExpanded );
                            if( initialExpanded ) {
                                graphUpdates.expandedGroupNodes.push( sourceNode );
                            } else {
                                graphUpdates.collapsedGroupNodes.push( sourceNode );
                            }

                            // reset group node size when expansion state changed
                            if( edgeModel.sourceNode.initialPosition ) {
                                graph.setBounds( sourceNode, edgeModel.sourceNode.initialPosition );
                            }
                        }
                    } else if( !isExpanded ) {
                        // set group node expaned by default
                        groupGraph.setExpanded( sourceNode, true );
                        graphUpdates.expandedGroupNodes.push( sourceNode );
                    }
                }

                graphModel.addEdgeModel( edge, edgeModel );
            } );
        }

        _.values( edgeModelGroup[ 1 ] ).forEach( function( edgeModel ) {
            var sourceNode = edgeModel.sourceNode.graphItem;
            var targetNode = edgeModel.targetNode.graphItem;

            // create group for group relation
            var edge;

            if( groupCategory && edgeModel.category === groupCategory && !isNetworkMode ) {
                if( !groupGraph.isGroup( sourceNode ) ) {
                    // convert normal node to group
                    groupGraph.setAsGroup( sourceNode );
                }

                if( sourceNode !== groupGraph.getParent( targetNode ) ) {
                    groupGraph.setParent( sourceNode, [ targetNode ] );
                    graphUpdates.parentChangedNodes.push( targetNode );

                    if( !groupGraph.isExpanded( sourceNode ) ) {
                        groupGraph.setExpanded( sourceNode, true );
                        graphUpdates.expandedGroupNodes.push( sourceNode );
                    }
                }
            } else if( typeof renderApis.getEdgeStyle === 'function' ) {
                var sourcePort = null;
                var targetPort = null;
                if( edgeModel.sourcePort ) {
                    sourcePort = edgeModel.sourcePort.graphItem;
                }

                if( edgeModel.targetPort ) {
                    targetPort = edgeModel.targetPort.graphItem;
                }

                var edgeStyle = renderApis.getEdgeStyle( graphModel, edgeModel );
                if( sourcePort && targetPort ) {
                    edge = graph.createEdgeWithPortsStyleAndTag( sourcePort, targetPort, edgeStyle, null );
                } else if( edgeModel.edgeObject.props.startLocation || edgeModel.edgeObject.props.endLocation ) {
                    edge = graph.createEdgeWithNodesStyleAndLocation( sourceNode, edgeModel.edgeObject.props.startLocation,
                        targetNode, edgeModel.edgeObject.props.endLocation, edgeStyle, null );
                } else {
                    edge = graph.createEdgeWithNodesStyleAndTag( sourceNode, targetNode, edgeStyle, null );
                }

                if( edgeModel.label ) {
                    graph.setLabel( edge, edgeModel.label );
                }

                graphUpdates.newEdges.push( edge );
            } else {
                logger.error( 'The "getEdgeStyle" API is not defined in graph render API implementation, skip drawing the edge.' );
                return;
            }

            graphModel.addEdgeModel( edge, edgeModel );
        } );

        return graphUpdates;
    }

    graphDataProvider.drawGraph = function( rawGraphData ) {
        // preprocess graph data if preDraw defined
        if( typeof this.renderApis.preDraw === 'function' ) {
            this.renderApis.preDraw( graphModel, rawGraphData );
        }
        var graphDataModel = parseGraphData( this.dataParser, rawGraphData );
        var graphUpdates = {};
        var graph = graphModel.graphControl.graph;
        graphModel.graphControl.suppressGraphChanged( function() {
            // draw nodes
            graphUpdates.newNodes = drawNodes( graphDataProvider, graphDataModel.nodeModels );

            // draw boundaries
            graphUpdates.newBoundaries = drawBoundaries( graphDataProvider, graphDataModel.boundaryModels );

            // draw ports
            graphUpdates.newPorts = drawPorts( graphDataProvider, graphDataModel.portModels );

            // draw edges
            var edgeUpdates = drawEdges( graphDataProvider, graphDataModel.edgeModels );
            _.merge( graphUpdates, edgeUpdates );

            // reset edge path if has initial position
            graphUpdates.newEdges.forEach( function( edge ) {
                var edgeModel = edge.model;
                if( edgeModel.initialPosition ) {
                    graph.setEdgePosition( edge, edgeModel.initialPosition );
                }

                var label = edge.getLabel();
                if( label && edgeModel.initLabelPosition ) {
                    label.setPosition( edgeModel.initLabelPosition );
                }
            } );
        } );

        // preprocess graph data if postDraw defined
        if( typeof this.renderApis.postDraw === 'function' ) {
            this.renderApis.postDraw( graphModel, rawGraphData, graphUpdates );
        }

        // apply graph filters and notify item added event
        graph.updateOnItemsAdded( [].concat( graphUpdates.newNodes, graphUpdates.newEdges, graphUpdates.newPorts ) );

        eventBus.publish( graphDataProvider.name + '.graphDataRenderComplete', graphUpdates );
    };
};

export default exports = {
    init
};

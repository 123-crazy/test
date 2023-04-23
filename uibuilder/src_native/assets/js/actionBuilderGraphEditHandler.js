// Copyright (c) 2020 Siemens

/**
 * This implements the graph edit handler interface APIs defined by aw-graph widget to provide graph authoring
 * functionalities.
 *
 * @module js/actionBuilderGraphEditHandler
 *
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxService from 'js/appCtxService';
import $ from 'jquery';
import _ from 'lodash';
import logger from 'js/logger';
import actionBuilderGraphEditService from 'js/actionBuilderGraphEditService';
import actionBuilderGraphLayout from 'js/actionBuilderGraphLayout';
import actionBuilderUtils from './actionBuilderUtils';

let exports = {};

/**
 * Function to be called to determine whether can create node at given location.
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} contextGroupNode - the clicked group node during node creation.
 * @param {PointD} location - the location to create node
 * @returns {Boolean} return true to create node, return false to cancel the node creation
 */
export let canCreateNode = function( graphModel, contextGroupNode, location ) {
    return true;
};

/**
 * Function to be called to get port candidate provider type for edge creation
 *
 * @param {Object} graphModel - the graph model object
 * @returns {String} portCandidateProviderType return portCandidateProviderType
 */
export let getPortCandidateProviderType = function( graphModel ) {
    return 'NODE_AND_PORT';
};

/**
 * Function to be called to tell if the edge was permitted to reconnect
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} updatedEndPoint - the connection end type, could be "source" or "target"
 * @param {Object} edge - the edge to reconnect
 * @returns {Boolean} flag whether the edge can be reconnected
 */
export let canReconnectEdge = function( graphModel, updatedEndPoint, edge ) {
    let edgeCategory = graphModel.categoryApi.getEdgeCategory( edge );
    // Disable the Tracebility reconnect
    if( edgeCategory === 'relations' ) {
        return false;
    }
    return true;
};

/**
 * Function to be called to tell if the edge was permitted to create from this source
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} source - the source whether the edge can be created from
 * @param {Object} clickPosition - the click position on the sheet coordinate
 * @returns {Boolean} flag whether the edge can be connected to the source node
 */
export let canCreateEdgeFrom = function( graphModel, source, clickPosition ) {
    if( source && ( source.getItemType() === 'Port' || source.getItemType() === 'Node' ) ) {
        if( source.getItemType() === 'Port' ) {
            let legendState = appCtxService.ctx.graph.legendState;
            return !legendState || legendState.creatingCategory.internalName !== 'success';
        }
        return true;
    }
    return false;
};

/**
 * Function to be called to tell if the edge was permitted to create from this source
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} target - the target whether the edge can be created to
 * @param {Object} edge - edge object
 * @param {Object} position - the hover position on the sheet coordinate
 * @returns {Boolean} flag whether the edge can be connected to the target node
 */
export let canCreateEdgeTo = function( graphModel, target, edge, position ) {
    if( target.getItemType() === 'Port' || target.getItemType() === 'Node' ) {
        if( target.getItemType() === 'Port' ) {
            let legendState = appCtxService.ctx.graph.legendState;
            return !legendState || legendState.creatingCategory.internalName !== 'success';
        }
        return true;
    }
    return false;
};

/**
 * Function to be called to tell if the object was permitted to connect to
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} endPoint - the connection end type, could be "source" or "target"
 * @param {Object} target - the target object to connect to
 * @param {Object} edge - the edge to reconnect
 * @param {Object} position - the hover position on the sheet coordinate
 * @returns {Boolean} flag whether the object can be connected to
 */
export let canReconnectEdgeTo = function( graphModel, endPoint, target, edge, position ) {
    let edgeCategory = graphModel.categoryApi.getEdgeCategory( edge );
    if( edgeCategory === 'Connectivity' && target.getItemType() === 'Port' ) {
        return true;
    }
    // Comment out the following statement to disable the Tracebility reconnection to.
    // if( edgeCategory === "Success" && target.getItemType() === "Node" ) {
    //     return true;
    // }

    return false;
};

let showTextEditor = function( graphModel, node ) {
    if( !graphModel || !node ) {
        return undefined;
    }

    // show inline editor
    let nodePropertyEditHandler = graphModel.graphControl.nodePropertyEditHandler;
    if( nodePropertyEditHandler ) {
        //find the name element
        let property = 'Name';
        let selector = 'text.aw-graph-modifiableProperty[data-property-name="Name"]';
        let nameElement = $( selector, node.getSVGDom() );
        if( nameElement && nameElement[ 0 ] ) {
            return nodePropertyEditHandler.editNodeProperty( node, nameElement[ 0 ], property, node.getProperty( property ) );
        }
    }
    return undefined;
};

/**
 * Function to create node at given location.
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} contextGroupNode - the clicked group node during node creation.
 * @param {PointD} location - the location to create node on the sheet coordinate
 * @param {Object} customNodeSize - custom node size
 * @param {Object} nodeDef - nodeDefinition
 */
export let createNode = function( graphModel, contextGroupNode, location, customNodeSize, nodeDef ) {
    let customNodeStyle = {
        templateId: nodeDef.nodeTemplate
    };

    let legendState = appCtxService.ctx.graph.legendState;
    let nodeStyle = customNodeStyle && customNodeStyle.templateId ? customNodeStyle : graphModel.config.defaults.nodeStyle;
    if( nodeStyle ) {
        let templateId = nodeStyle.templateId;
        let registeredTemplate = graphModel.nodeTemplates[ templateId ];
        if( registeredTemplate ) {
            let initialBindData = registeredTemplate.initialBindData;
            if( initialBindData ) {
                initialBindData.node_fill_color = legendState.creatingCategory.style.color;
                initialBindData.Name = nodeDef.id;
                initialBindData.Name_editable = false;
            }
        }
    }
    let defaultNodeSize = graphModel.config.defaults.nodeSize;
    let rect = {
        x: location.x,
        y: location.y,
        width: customNodeSize ? customNodeSize.width : defaultNodeSize.width,
        height: customNodeSize ? customNodeSize.height : defaultNodeSize.height
    };

    let graph = graphModel.graphControl.graph;
    let node = graph.createNodeWithBoundsStyleAndTag( rect, nodeStyle );
    graph.setNodeMinSizeConfig( node, [ 20, 20 ] );

    //create node inside group
    if( contextGroupNode ) {
        graph.update( function() {
            contextGroupNode.addGroupMember( node );
        } );
    } else {
        node.isRoot( true );
    }

    let category = legendState.creatingCategory.internalName;
    let type = legendState.creatingSubCategory.internalName;
    _.defer( function() {
        showTextEditor( graphModel, node ).then(
            function( editData ) {
                //commit edit
                if( _.trim( editData.newValue ) !== '' ) {
                    graph.updateNodeBinding( node, { Name: editData.newValue } );
                }

                // update to layout
                let layout = graphModel.graphControl.layout;
                if( actionBuilderGraphLayout.incUpdateActive( layout ) ) {
                    layout.addNode( node, true );
                }

                actionBuilderGraphEditService.updateNodeWithNewObject( graphModel, node, category, type );
            },
            function() {
                //cancel edit, so remove dummy node
                graph.removeNodes( [ node ] );
            }
        );
    } );

    //asyc to create model object
};

/**
 * Function to create node at given location.
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} contextGroupNode - the clicked group node during node creation.
 * @param {PointD} location - the location to create node on the sheet coordinate
 * @param {Object} customNodeSize - custom node size
 * @param {Object} nodeDef - custom node style
 * @param {Object} defaultNodeText - default node text
 * @returns {Object} node - created node
 */
export let createDropInNode = function( graphModel, contextGroupNode, location, customNodeSize, nodeDef, defaultNodeText ) {
    let customNodeStyle = {
        templateId: nodeDef.nodeTemplate
    };

    let legendState = appCtxService.ctx.graph.legendState;
    let nodeStyle = customNodeStyle && customNodeStyle.templateId ? customNodeStyle : graphModel.config.defaults.nodeStyle;
    if( nodeStyle ) {
        let templateId = nodeStyle.templateId;
        let registeredTemplate = graphModel.nodeTemplates[ templateId ];
        if( registeredTemplate ) {
            let initialBindData = registeredTemplate.initialBindData;
            if( initialBindData ) {
                initialBindData.node_fill_color = legendState.creatingCategory.style.color;
                initialBindData.Name = nodeDef.id;
                initialBindData.Name_editable = false;
            }
        }
    }
    let defaultNodeSize = graphModel.config.defaults.nodeSize;
    let rect = {
        x: location.x,
        y: location.y,
        width: customNodeSize ? customNodeSize.width : defaultNodeSize.width,
        height: customNodeSize ? customNodeSize.height : defaultNodeSize.height
    };

    let graph = graphModel.graphControl.graph;
    let node = graph.createNodeWithBoundsStyleAndTag( rect, nodeStyle );
    graph.setNodeMinSizeConfig( node, [ 20, 20 ] );

    //create node inside group
    if( contextGroupNode ) {
        graph.update( function() {
            contextGroupNode.addGroupMember( node );
        } );
    } else {
        node.isRoot( true );
    }

    let category = nodeDef.id;
    let type = nodeDef.id;
    //commit edit

    graph.updateNodeBinding( node, { Name: defaultNodeText } );

    // update to layout
    let layout = graphModel.graphControl.layout;
    if( actionBuilderGraphLayout.incUpdateActive( layout ) ) {
        layout.addNode( node, true );
    }

    return actionBuilderGraphEditService.updateNodeDropInWithNewObject( graphModel, node, category, type );
};

let updateNodeDataDegree = function( nodeData, edgeId, direction, isRemoved ) {
    if( !nodeData || !edgeId || !direction ) { return; }
    let changedDegrees = nodeData.degrees ? nodeData.degrees[ direction ] : nodeData.modelObject.degrees[ direction ];
    if( isRemoved ) {
        _.remove( changedDegrees, function( id ) {
            return id === edgeId;
        } );
    } else {
        changedDegrees.push( edgeId );
    }
};

/**
 * Function to create edge.
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} previewEdge - the preview edge.
 */
export let createEdge = function( graphModel, previewEdge ) {
    //on success
    let legendState = appCtxService.ctx.graph.legendState;
    actionBuilderGraphEditService.updateEdgeWithNewObject( graphModel, previewEdge, legendState.creatingCategory );

    let addedPorts = [];
    addedPorts.push( previewEdge.getSourcePort() );
    addedPorts.push( previewEdge.getTargetPort() );

    let edgeModel = graphModel.dataModel.edgeModels[ previewEdge.edgeData.id ];

    let srcNodeId = previewEdge.sourceNode.model.id;
    let tgtNodeId = previewEdge.targetNode.model.id;

    edgeModel.edgeObject.props = {};
    edgeModel.edgeObject.props.startNodeId = srcNodeId;
    edgeModel.edgeObject.props.endNodeId = tgtNodeId;

    updateNodeDataDegree( graphModel.dataModel.nodeModels[ srcNodeId ], previewEdge.edgeData.id, 'out' );
    updateNodeDataDegree( graphModel.dataModel.nodeModels[ tgtNodeId ], previewEdge.edgeData.id, 'in' );

    let layout = graphModel.graphControl.layout;
    if( actionBuilderGraphLayout.incUpdateActive( layout ) ) {
        _.each( addedPorts, function( port ) {
            layout.addPort( port, true );
        } );

        layout.addEdge( previewEdge, true );
    }

    actionBuilderUtils.relocateAllPorts( graphModel );
};

/**
 * Function to reconnect edge.
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} reconnectedEdge - the reconnected edge.
 * @param {Object} oldPort - the old connected port.
 * @param {Object} oldPath - the old connected path.
 * @param {String} updatedEndPoint - the updated end point source or target
 * @param {Object} targetItem - the target item will be reconnected
 */
export let reconnectEdge = function( graphModel, reconnectedEdge, oldPort, oldPath, updatedEndPoint, targetItem ) {
    logger.info( 'edge reconnected event trigged.' );
    //success
    let layout = graphModel.graphControl.layout;
    if( reconnectedEdge && layout ) {
        if( actionBuilderGraphLayout.incUpdateActive( layout ) && reconnectedEdge ) {
            layout.applyUpdate( function() {
                layout.reconnectEdge( reconnectedEdge );
            } );
        }
    }
};

/**
 * Function to create boundary.
 *
 * @param {Object} graphModel - the graph model object
 * @param {String} boundary - the preview boundary
 * @param {Object} position - the created position on the sheet coordinate
 */
export let createBoundary = function( graphModel, boundary, position ) {
    let legendState = appCtxService.ctx.graph.legendState;
    actionBuilderGraphEditService.updateBoundaryWithNewObject( graphModel, boundary, legendState );
};

export let preNodeEdit = function( graphModel, node, propertyName ) {
    let deferred = AwPromiseService.instance.defer();

    _.defer( function() {
        deferred.resolve();
    } );

    return deferred.promise;
};

export let getNearestCandidate = function( node, mousePosition ) {
    if( node && node instanceof window.SDF.Models.Node ) {
        let bbox = node.getBBox();
        let pointCandidates = [
            { x: bbox.x + bbox.width / 2, y: bbox.y },
            { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height },
            { x: bbox.x, y: bbox.y + bbox.height / 2 },
            { x: bbox.x + bbox.width, y: bbox.y + bbox.height / 2 }
        ];
        let distance = Infinity;
        let index = 0;
        for( let ii = 0; ii < 4; ii++ ) {
            let temp = Math.pow( mousePosition.x - pointCandidates[ ii ].x, 2 ) + Math.pow( mousePosition.y - pointCandidates[ ii ].y, 2 );
            if( temp < distance ) {
                index = ii;
                distance = temp;
            }
        }
        return pointCandidates[ index ];
    }
    return undefined;
};

let isEdgeCreatable = function( graphModel, node, mousePosition ) {
    let inputMode = graphModel.graphControl.inputMode;
    if( inputMode.showPortCandidate && inputMode.endPointTolerance ) {
        let pointCandidate = exports.getNearestCandidate( node, mousePosition );
        let distance = Math.pow( mousePosition.x - pointCandidate.x, 2 ) + Math.pow( mousePosition.y - pointCandidate.y, 2 );
        return Math.sqrt( distance ) <= inputMode.endPointTolerance;
    }
    return true;
};

export let canCreateEdgeOnCandidate = function( graphModel, node, mousePosition ) {
    if( node && node.getItemType() === 'Node' ) {
        return isEdgeCreatable( graphModel, node, mousePosition );
    }
    return true;
};

exports = {
    canCreateNode,
    getPortCandidateProviderType,
    canReconnectEdge,
    canCreateEdgeFrom,
    canCreateEdgeTo,
    canReconnectEdgeTo,
    createNode,
    createDropInNode,
    createEdge,
    reconnectEdge,
    createBoundary,
    preNodeEdit,
    getNearestCandidate,
    canCreateEdgeOnCandidate
};
export default exports;
/**
 * Define graph edit handler
 *
 * @memberof NgServices
 * @member actionBuilderGraphEditHandler
 */
app.factory( 'actionBuilderGraphEditHandler', () => exports );

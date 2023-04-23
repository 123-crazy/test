// Copyright (c) 2020 Siemens

/**
 * This defines the graph edit service.
 *
 * @module js/actionBuilderGraphEditService
 */
import _ from 'lodash';
import graphModelService from 'js/graphModelService';
import templateService from 'js/actionBuilderTemplateService';
import performanceUtils from 'js/performanceUtils';
import actionBuilderUtils from 'js/actionBuilderUtils';
import localeSvc from 'js/localeService';
import nodeDefSvc from 'js/nodeDefinitionService';
import saveActionFlowSvc from 'js/saveActionFlowService';
import 'js/awGraphService';
import AwStateService from 'js/awStateService';

var exports = {};

/**
 * Setup to map labels to local names.
 */
var localeMap = {};

export let loadConfiguration = function() {
    localeSvc.getLocalizedTextFromKey( 'UIMessages.successInfo', true ).then( result => localeMap.success = result );
    localeSvc.getLocalizedTextFromKey( 'ActionBuilderMessages.failure', true ).then( result => localeMap.failure = result );
};

/**
 * Create a unique node name
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} customizedName - the customizedName, optional
 * @return {Object} the name
 */
export let generateNewNodeName = function( graphModel, customizedName ) {
    if( !graphModel ) {
        return undefined;
    }

    if( !graphModel.nodeCount ) {
        graphModel.nodeCount = 0;
    }
    graphModel.nodeCount++;
    var defaultBaseName = 'New Node';
    var nodeName = defaultBaseName + ' ' + graphModel.nodeCount;
    if( customizedName && customizedName !== defaultBaseName ) {
        nodeName = customizedName;
    }

    return nodeName;
};

/**
 * Create a faked node object
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} nodeName - the nodeName
 * @param {String} typeName - the object type name
 * @param {String} category - type of node to create
 * @return {Object} the node object
 */
export let createNodeObject = function( graphModel, nodeName, typeName, category ) {
    if( !graphModel ) {
        return undefined;
    }

    return nodeDefSvc.getNodeDefinition( category ).then( function( nodeDef ) {
        // generate unique name for any dummy names
        nodeName = exports.generateNewNodeName( graphModel, nodeName );

        //define a faked node object and the degree information
        var nodeId = '0000' + graphModel.nodeCount;
        var name = nodeName;
        var nodeObject = {
            displayInfos: [ 'Name\\:' + name, 'ID\\:' + nodeId ],
            type: typeName,
            category: typeName,
            id: nodeId,
            name: name,
            actionDef: nodeDef.actionDef ? nodeDef.actionDef : {},
            messageDef: nodeDef.messageDef ? nodeDef.messageDef : null
        };

        if( nodeDef && nodeDef.propsView ) {
            nodeObject.propsView = nodeDef.propsView;
        }

        return nodeObject;
    } );
};

/**
 * Create a faked node object
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} nodeName - the nodeName
 * @param {String} typeName - the object type name
 * @param {String} category - type of node to create
 * @return {Object} the node object
 */
export let createDropInNodeObject = function( graphModel, nodeName, typeName, category ) {
    return nodeDefSvc.getNodeDefinition( category ).then( function( nodeDef ) {
        // generate unique name for any dummy names
        nodeName = exports.generateNewNodeName( graphModel, nodeName );

        //define a faked node object and the degree information
        var nodeId = '0000' + graphModel.nodeCount;
        var name = nodeName;
        var nodeObject = {
            displayInfos: [ 'Name\\:' + name, 'ID\\:' + nodeId ],
            type: typeName,
            category: typeName,
            id: nodeId,
            name: name,
            actionDef: nodeDef.actionDef
        };

        if( nodeDef && nodeDef.propsView ) {
            nodeObject.propsView = nodeDef.propsView;
        }

        return nodeObject;
    } );
};

/**
 * Function to create port.
 *
 * @param {Object} graphModel - the graph model object
 * @param {String} port - the preview port
 * @param {Object} owner - the owner of port
 * @param {Object} position - the created position on the sheet coordinate
 */
export let createPort = function( graphModel, owningNode, portId, portCategory, portPosition, direction ) {
    var graph = graphModel.graphControl.graph;
    var portStyle = actionBuilderUtils.portStyle;
    var port = graph.addPortAtLocationWithStyle( owningNode, portPosition, portStyle );
    port.id = portId;
    port.direction = direction;
    port.initPosition = portPosition;
    return port;
};

/**
 * Update graph node with created node object. Here just to demonstrate how to update node with new node object.
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} node - the created graph node
 * @param {Object} category - node category
 * @param {Object} typeName - node type name
 */
export let updateNodeWithNewObject = function( graphModel, node, category, typeName ) {
    if( !( graphModel && node && category && typeName ) ) {
        return;
    }

    //start performance timer
    var performanceTimer = performanceUtils.createTimer();

    //prepare node binding data
    var nodeName = node.getProperty( 'Name' );
    exports.createNodeObject( graphModel, nodeName, typeName, category ).then( function( nodeObject ) {
        var props = templateService.getBindPropertyNames( nodeObject );
        var bindData = templateService.getBindProperties( nodeObject, props );

        if( bindData.Name ) {
            bindData.Name_editable = false;
        }

        //get node template for the created node object
        var flag = templateService.useMultiLevelTemplate( nodeObject );
        var template = templateService.getNodeTemplate( graphModel.nodeTemplates, props, false, flag, category );
        graphModel.graphControl.graph.setNodeStyle( node, template, bindData );
        var nodeModel = new graphModelService.NodeModel( bindData.ID, nodeObject, category );
        nodeModel.degrees = {
            in: [],
            out: []
        };

        graphModel.addNodeModel( node, nodeModel );
        graphModel.graphControl.graph.updateOnItemsAdded( [ node ] );
        //log performance time
        performanceTimer.endAndLogTimer( 'Graph Create Node', 'graphCreateNode' );
    } );
};

/**
 * Update graph node with created node object. Here just to demonstrate how to update node with new node object.
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} node - the created graph node
 * @param {Object} category - node category
 * @param {Object} typeName - node type name
 * @returns {Object} node - new node.
 */
export let updateNodeDropInWithNewObject = function( graphModel, node, category, typeName ) {
    //start performance timer
    var performanceTimer = performanceUtils.createTimer();

    //prepare node binding data
    var nodeName = node.getProperty( 'Name' );
    return exports.createDropInNodeObject( graphModel, nodeName, typeName, category ).then( function( nodeObject ) {
        var props = templateService.getBindPropertyNames( nodeObject );
        var bindData = templateService.getBindProperties( nodeObject, props );

        if( bindData.Name ) {
            bindData.Name_editable = false;
        }

        //get node template for the created node object
        var flag = templateService.useMultiLevelTemplate( nodeObject );
        var template = templateService.getNodeTemplate( graphModel.nodeTemplates, props, false, flag, category );
        graphModel.graphControl.graph.setNodeStyle( node, template, bindData );
        var nodeModel = new graphModelService.NodeModel( bindData.ID, nodeObject, category );
        nodeModel.degrees = {
            in: [],
            out: []
        };

        graphModel.addNodeModel( node, nodeModel );
        graphModel.graphControl.graph.updateOnItemsAdded( [ node ] );

        //log performance time
        performanceTimer.endAndLogTimer( 'Graph Create Node', 'graphCreateNode' );

        return node;
    } );
};

/**
 * Create a faked edge object
 *
 * @param {Object} graphModel - the graph model object
 * @param {String} typeName - the object type name
 * @return {Object} the edge object
 */
export let createEdgeObject = function( graphModel, typeName ) {
    if( !graphModel ) {
        return undefined;
    }

    if( !graphModel.edgeCount ) {
        graphModel.edgeCount = 0;
    }
    graphModel.edgeCount++;

    //define a faked edge object
    var edgeId = '0000' + graphModel.edgeCount;
    return {
        id: edgeId,
        category: typeName,
        type: typeName,
        displayName: typeName === 'success' ? localeMap.success : localeMap.failure,
        propsView: 'connectionProperties',
        actionDef: {
            actionType: 'success'
        }
    };
};

/**
 * Update graph edge with created edge object. Here just to demonstrate how to update preview edge with new edge
 * style.
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} edge - the created graph edge
 * @param {Object} edgeCategory - the edge creation category
 */
export let updateEdgeWithNewObject = function( graphModel, edge, edgeCategory ) {
    if( !( graphModel && edge && edgeCategory ) ) {
        return;
    }

    //start performance timer
    var performanceTimer = performanceUtils.createTimer();
    var graph = graphModel.graphControl.graph;

    //create business object for the edge
    var edgeData = exports.createEdgeObject( graphModel, edgeCategory.internalName );
    edge.edgeData = edgeData;

    //update
    if( graphModel && edge ) {
        edge.category = edge.edgeData.type;
        var style = {};
        style = _.clone( actionBuilderUtils.successStyle );
        graph.setEdgeStyle( edge, style );

        edge.sourceNode = edge.getSourceNode();
        edge.targetNode = edge.getTargetNode();
        edge.itemType = 'Edge';

        graphModel.graphControl.graph.setEdgeStyle( edge, style );
    }

    var edgeModel = new graphModelService.EdgeModel( edgeData.id, edgeData, edgeData.category, edge.getSourceNode().model, edge.getTargetNode().model, '' );

    graphModel.addEdgeModel( edge, edgeModel );
    graph.updateOnItemsAdded( [ edge ] );
    if ( edge.sourceNode.model.category === 'start' ) {
        let $state = AwStateService.instance;
        let nodeText = $state.params.s_uid;
        graphModel.graphControl.graph.updateNodeBinding( edge.targetNode, { Name: nodeText } );
        edge.targetNode.model.modelObject.name = nodeText;
    }

    saveActionFlowSvc.updateGraphModel( edge.sourceNode.model, edge.targetNode.model, edge );
    graphModel.graphControl.setSelected( [ edge ], true );
    //log performance time
    performanceTimer.endAndLogTimer( 'Graph Create Edge', 'graphCreateEdge' );
};

/**
 * Update graph boundary with created boundary object. Here just to demonstrate how to update preview boundary with new boundary
 * style.
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} boundary - the created graph boundary
 * @param {Object} legendState - the graph legend state
 */
export let updateBoundaryWithNewObject = function( graphModel, boundary, legendState ) {
    boundary.category = legendState.creatingCategory.internalName;
    var label = 'boundary';
    if( boundary.category === 'Rectangle' ) {
        graphModel.graphControl.graph.setLabel( boundary, label, graphModel.config.defaults.boundaryLabel );
    }
    if( !graphModel.boundaryCount ) {
        graphModel.boundaryCount = 0;
    }
    graphModel.boundaryCount++;

    //define a faked boundary object
    var boundaryId = 'boundary' + graphModel.boundaryCount;
    var boundaryObject = {
        type: boundary.category,
        id: boundaryId,
        boundaryLabelText: label
    };
    boundary.boundaryObject = boundaryObject;
    var boundaryModel = new graphModelService.BoundaryModel( boundaryObject.id, boundaryObject, boundaryObject.type, label );
    graphModel.addBoundaryModel( boundary, boundaryModel );
    graphModel.graphControl.graph.updateOnItemsAdded( [ boundary ] );
};

/**
 * Update graph port with created port object. Here just to demonstrate how to update preview port with new port style.
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} port - the created graph port
 * @param {Object} portCategory - the port category
 * @param {Object} direction - the port category
 */
export let updatePortWithNewObject = function( graphModel, port, portCategory, direction ) {
    if( !graphModel || !port || !portCategory ) {
        return;
    }

    port.category = portCategory;

    var portObject = {
        type: port.category,
        id: _.uniqueId( 'userport_' ),
        nodeId: port.getOwner().model.id
    };
    port.portObject = portObject;

    // deal with test data service update
    // testDataService.addPortData( port );
    port.direction = 'BOTH';
    if( direction ) {
        port.direction = direction;
    }
    var label = 'New Port';
    graphModel.graphControl.graph.setLabel( port, label );

    if( portCategory === 'Interface' ) {
        var portStyle = actionBuilderUtils.portStyle;
        graphModel.graphControl.graph.setPortStyle( port, portStyle );
        port.portObject.isMocked = true;
    }

    var portModel = new graphModelService.PortModel( portObject.id, portObject, portCategory, port.getOwner().model, label );
    graphModel.addPortModel( port, portModel );

    graphModel.graphControl.graph.updateOnItemsAdded( [ port ] );
};

/**
 * Verify and update the label text
 *
 * @param {Object} graphModel - graph model object
 * @param {SheetElement} lable - label being edited
 * @param {String} oldValue - label string before edited
 * @param {String} newValue - new label string
 */

export let verifyAndUpdateLabelText = function( graphModel, label, oldValue, newValue ) {
    console.log( 'Label committed!>>>' + label + oldValue + ' ' + newValue );
};
exports = {
    generateNewNodeName,
    createNodeObject,
    createDropInNodeObject,
    updateNodeWithNewObject,
    updateNodeDropInWithNewObject,
    createEdgeObject,
    updateEdgeWithNewObject,
    updateBoundaryWithNewObject,
    verifyAndUpdateLabelText,
    createPort,
    loadConfiguration
};

loadConfiguration();

export default exports;

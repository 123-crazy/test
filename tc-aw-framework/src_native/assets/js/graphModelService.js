// Copyright (c) 2019 Siemens

/* global
 define

 */
/**
 * This module defines methods to create graph data models
 *
 * @module js/graphModelService
 */
import app from 'app';
import _ from 'lodash';

var exports = {};

var BaseGraphModel = function( id, modelObject, category, label ) {
    if( !id ) {
        throw 'The "id" is required to create graph item model.';
    }

    this.id = id;
    this.modelObject = modelObject;
    this.category = category;
    this.label = label;

    this.setInitPosition = function( initPos ) {
        this.initialPosition = initPos;
    };

    this.setInitLabelPosition = function( initLabelPos ) {
        this.initLabelPosition = initLabelPos;
    };
};

/**
 * Node model constructor
 * @param {String} id the node model ID
 * @param {Object} nodeObject the node object
 * @param {String} category node legend category
 * @param {String} label node label
 */
export let NodeModel = function( id, nodeObject, category, label ) {
    BaseGraphModel.call( this, id, nodeObject, category, label );

    if( !nodeObject ) {
        throw 'The "nodeObject" is required to create graph node model.';
    }

    this.nodeObject = nodeObject;

    this.setInitialExpanded = function( initialExpanded ) {
        this.initialExpanded = initialExpanded;
    };
};

/**
 * Boundary model constructor
 * @param {String} id the boundary model ID
 * @param {Object} modelObject the boundary object
 * @param {String} category boundary legend category
 * @param {String} label boundary label
 */
export let BoundaryModel = function( id, modelObject, category, label ) {
    BaseGraphModel.call( this, id, modelObject, category, label );
};

/**
 *Constructor to create edge model object
 * @param {String} id the node model ID
 * @param {Object} edgeObject the edge object
 * @param {String} category edge legend category
 * @param {NodeModel} sourceNodeModel the source node of the edge
 * @param {NodeModel} targetNodeModel the source node of the edge
 * @param {PortModel} sourcePortModel the source node of the edge. Optional.
 * @param {PortModel} targetPortModel the source node of the edge. Optional.
 * @param {String} label edge label
 * @param {Object} initialPosition initial edge position
 */
export let EdgeModel = function( id, edgeObject, category, sourceNodeModel, targetNodeModel, sourcePortModel, targetPortModel, label ) {
    BaseGraphModel.call( this, id, edgeObject, category, label );

    if( !sourceNodeModel ) {
        throw 'The "sourceNodeModel" is required to create edge model.';
    }
    if( !targetNodeModel ) {
        throw 'The "targetNodeModel" is required to create edge model.';
    }

    this.edgeObject = edgeObject;
    this.sourceNode = sourceNodeModel;
    this.targetNode = targetNodeModel;
    this.sourcePort = sourcePortModel;
    this.targetPort = targetPortModel;
};

/**
 *Constructor to create port model object
 * @param {String} id the port model ID
 * @param {Object} portObject the port object
 * @param {String} category port legend category
 * @param {NodeModel} ownerNode port owner node
 * @param {String} label edge label
 */
export let PortModel = function( id, portObject, category, ownerNode, label ) {
    BaseGraphModel.call( this, id, portObject, category, label );
    if( !ownerNode ) {
        throw 'The "ownerNode" is required to create port model.';
    }

    this.portObject = portObject;
    this.ownerNode = ownerNode;
};

export default exports = {
    NodeModel,
    BoundaryModel,
    EdgeModel,
    PortModel
};

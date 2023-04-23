// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module provides graph layout data model
 *
 * @module js/baseGraphLayout
 */
import app from 'app';
import _ from 'lodash';
import graphConstants from 'js/graphConstants';
import '@diagramming/globallayout';
import '@diagramming/layoutcore';
import '@diagramming/layoutappinterface';
import '@diagramming/yfileswrapper';

'use strict';

/**
 * Define public API
 */
var exports = {};

/**
 * Define the base layout. It's a wrapper layer of Diagram Foundation layout.
 *
 * @class
 * @param dfLayout {Object} the layout wrapper
 * @param type {String} the layout type
 */
export let BaseLayout = function( dfLayout, type ) {
    if( !dfLayout ) {
        throw 'Layouter is invalid.';
    }

    this.type = type;

    var hostInterface = dfLayout.hostInterfaceObj;
    /**
     * Remove a node from layout data model
     *
     * @param node the node to be removed
     * @return true if successfully removed
     */
    this.removeNode = function( node ) {
        return dfLayout.removeNode( node );
    };

    /**
     * Removes the given connection from layout data model
     *
     * @param edge connection/edge reference to be removed from layout data model
     * @return true if successfully removed
     */
    this.removeEdge = function( edge ) {
        return dfLayout.removeConnection( edge );
    };

    /**
     * Removes the given port from layout data model
     *
     * @param port port reference to be removed from layout data model
     * @return true if successfully removed
     */
    this.removePort = function( port ) {
        return dfLayout.removePort( port );
    };

    /**
     * Checks whether the given node is in layout data model
     *
     * @param node host node reference to check
     * @return return true if the given node is already in the layout data model
     */
    this.containsNode = function( node ) {
        return dfLayout.nodeInTable( node );
    };
    /**
     * Checks whether the given edge is in layout data model
     *
     * @param edge host edge reference to check
     * @return return true if the given edge is already in the layout data model
     */
    this.containsEdge = function( edge ) {
        return dfLayout.connectionInTable( edge );
    };
    /**
     * Checks whether the given port is in layout data model
     *
     * @param port host port reference to check
     * @return return true if the given port is already in the layout data model
     */
    this.containsPort = function( port ) {
        return dfLayout.portInTable( port );
    };

    /**
     * Set the property "nodeToNodeDist"
     *
     * @param xDistance the distance x to be set
     * @param yDistance the distance y to be set
     */
    this.setNodeToNodeDist = function( xDistance, yDistance ) {
        var distance = {
            x: xDistance,
            y: yDistance
        };

        hostInterface.nodeToNodeDist = distance;
    };

    /**
     * Set the property "edgeToEdgeDist"
     *
     * @param xDistance the distance x to be set
     * @param yDistance the distance y to be set
     */
    this.setEdgeToEdgeDist = function( xDistance, yDistance ) {
        var distance = {
            x: xDistance,
            y: yDistance
        };

        hostInterface.edgeToEdgeDist = distance;
    };

    /**
     * Set the property "layoutType"
     *
     * @param layoutType the type to be set ( graphConstants.GlobalLayoutTypes.keys )
     */
    this.setLayoutType = function( layoutType ) {
        var type = graphConstants.GlobalLayoutTypes[ layoutType ];
        if( !type ) {
            type = graphConstants.GlobalLayoutTypes.Hierarchical;
        }

        hostInterface.layoutType = type;
    };

    /**
     * Gets the layout type
     *
     * @return the layout type ( graphConstants.GlobalLayoutTypes.keys )
     */
    this.getLayoutType = function() {
        var type = _.findKey( graphConstants.GlobalLayoutTypes, function( value ) {
            return hostInterface.layoutType === value;
        } );

        if( !type ) {
            type = 'Hierarchical';
        }
        return type;
    };

    /**
     * Set the property "layoutDirection"
     *
     * @param direction the direction to be set (graphConstants.LayoutDirections.keys)
     */
    this.setLayoutDirection = function( direction ) {
        var dir = graphConstants.LayoutDirections[ direction ];
        if( !dir ) {
            dir = graphConstants.LayoutDirections.TopToBottom;
        }

        hostInterface.layoutDirection = dir;
    };

    /**
     * Gets the layout direction
     *
     * @return the layout direction ( graphConstants.LayoutDirections.keys)
     */
    this.getLayoutDirection = function() {
        var dir = _.findKey( graphConstants.LayoutDirections, function( value ) {
            return hostInterface.layoutDirection === value;
        } );

        if( !dir ) {
            dir = 'TopToBottom';
        }
        return dir;
    };

    /**
     * Move a node
     *
     * @param node the node to be moved
     * @return true if successfully
     */
    this.moveNode = function( node ) {
        var ret = false;
        if( node ) {
            ret = dfLayout.moveNode( node );
        }
        return ret;
    };
};

/**
 * The base layout data, contains informations for applying layout
 */
export let BaseLayoutData = {
    nodesTobeAdded: [],
    nodesTobeRemoved: [],
    edgesTobeAdded: [],
    edgesTobeRemoved: [],
    removeHiddenNodesOnly: false,
    clear: function() {
        this.nodesTobeAdded = [];
        this.nodesTobeRemoved = [];
        this.edgesTobeAdded = [];
        this.edgesTobeRemoved = [];
    }
};

export default exports = {
    BaseLayout,
    BaseLayoutData
};

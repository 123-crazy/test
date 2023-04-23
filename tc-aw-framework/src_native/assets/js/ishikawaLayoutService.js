// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module provides graph layout support
 *
 * @module js/ishikawaLayoutService
 */
import app from 'app';
import baseGraphLayout from 'js/baseGraphLayout';
import graphConstants from 'js/graphConstants';
import _ from 'lodash';
import connectionStyleProvider from 'js/IshikawaConnectionStyleProvider';
import AwPromiseService from 'js/awPromiseService';

/**
 * Define public API
 */
var exports = {};

var NodePortPosition = {
    TOP: 'TOP',
    RIGHT: 'RIGHT',
    BOTTOM: 'BOTTOM',
    LEFT: 'LEFT'
};

/**
 * Define the ishikawa layout
 *
 * @class
 * @param diagramView the diagram object
 * @param hostInterface the layout interface for host application
 */
export let IshikawaLayout = function( diagramView, hostInterface ) {
    if( !hostInterface ) {
        throw 'The layout host interface has not been initialized.';
    }

    // Ishikaw layout only support left-to-right direction
    hostInterface.layoutDirection = graphConstants.LayoutDirections.LeftToRight;

    this._hostInterface = hostInterface;

    this._ishikawaDataModel = {};
    this._isActive = false;

    /**
     * Initialize the ishikawa layout
     */
    this.initIshikawaLayout = function( rootNode, categoryNodes, spineStyle ) {
        if( !rootNode ) {
            throw 'The root/effect node is null or undefined.';
        }

        this._ishikawaDataModel.rootNode = rootNode;
        this._ishikawaDataModel.rootNode.categories = [];
        this.addCategories( categoryNodes );
        this._isActive = true;

        // Create the spine edge
        var sheet = diagramView.getManager().getSheet();

        var startLocation = new window.SDF.Models.Location( 0, 0 );

        var port = new window.SDF.Models.Port( sheet, 0, 0, null, null, null, rootNode );
        rootNode.addPort( null, port );
        this._setPortPosition( rootNode, NodePortPosition.LEFT );

        var spineEdge = new window.SDF.Models.Connection( sheet, undefined, port, startLocation.getEvaluatedX(), startLocation.getEvaluatedY() );
        spineEdge.setStyleProvider( new connectionStyleProvider( spineStyle ) );
    };

    this.setLayoutType = function( layoutType ) {
        // Stub for layout interface
    };

    this.setLayoutDirection = function( layoutDirection ) {
        // Stub for layout interface
    };

    this.moveNode = function( node ) {
        // Stub for layout interface
    };

    /**
     * Add the category nodes into ishikawa graph.
     *
     * @param {Array} categoryNodes - nodes array of category
     * @param {Array} categoryEdgeStyle - styles array for each category node
     */
    this.addCategories = function( categoryNodes, categoryEdgeStyle ) {
        var currentCategory = this._ishikawaDataModel.rootNode.categories;
        var self = this;
        var styleIndex = 0;
        _.forEach( categoryNodes, function( categoryNode ) {
            if( !_.find( currentCategory, function( category ) {
                    return category.node === categoryNode;
                } ) ) {
                var sheet = diagramView.getManager().getSheet();
                currentCategory.push( { node: categoryNode, causes: [] } );

                // Create edge with the categoryEdgeStyle.
                var targetLocation = new window.SDF.Models.Location( 0, 0 );

                var port = new window.SDF.Models.Port( sheet, 0, 0, null, null, null, categoryNode );
                categoryNode.addPort( null, port );
                self._setPortPosition( categoryNode, NodePortPosition.BOTTOM );

                var categoryEdge = new window.SDF.Models.Connection( sheet, port, undefined, undefined, undefined, targetLocation.getEvaluatedX(), targetLocation.getEvaluatedY() );
                if( categoryEdge ) {
                    categoryEdge.setStyleProvider( new connectionStyleProvider( categoryEdgeStyle[ styleIndex ] ) );
                }
                styleIndex++;
            }
        } );
    };

    /**
     * Add the cause node into the ishikawa layout
     *
     * @param {Node} categoryNode - category node already exists in the ishikawa layout which will owns cause nodes
     * @param {Array} causeNodes - arrray of cause node which will be the cause of the category
     * @param {Array} causeEdgeStyle - array of cause edge for each cause node, it must have same length with the causeNodes
     */
    this.addCauses = function( categoryNode, causeNodes, causeEdgeStyle ) {
        var category = _.find( this._ishikawaDataModel.rootNode.categories, function( categoryItem ) {
            return categoryItem.node === categoryNode;
        } );

        if( !category ) {
            category = this._ishikawaDataModel.rootNode.categories.push( { node: categoryNode, causes: [] } );
        }

        var self = this;
        var sheet = diagramView.getManager().getSheet();

        // To filter duplicate causes
        var styleIndex = 0;
        _.forEach( causeNodes, function( causeNode ) {
            if( !_.indexOf( category.causes, causeNode ) >= 0 ) {
                category.causes.push( causeNode );

                // Create edge with the categoryEdgeStyle.
                var targetLocation = new window.SDF.Models.Location( 0, 0 );

                var port = new window.SDF.Models.Port( sheet, 0, 0, null, null, null, causeNode );
                causeNode.addPort( null, port );
                self._setPortPosition( causeNode, NodePortPosition.LEFT );

                var causeEdge = new window.SDF.Models.Connection( sheet, port, undefined, undefined, undefined, targetLocation.getEvaluatedX(), targetLocation.getEvaluatedY() );
                if( causeEdge ) {
                    causeEdge.setStyleProvider( new connectionStyleProvider( causeEdgeStyle[ styleIndex ] ) );
                }
                styleIndex++;
            }
        } );
    };

    /**
     * Clear the ishikawa layout
     */

    this.clear = function() {
        this._ishikawaDataModel.rootNode = undefined;
        this._isActive = false;
    };

    /**
     * Remove the nodes and edges they owned.
     *
     * @param {Array} - Array of remove nodes
     */

    this.removeNodes = function( removeNodes ) {
        var self = this;
        if( _.find( removeNodes, this._ishikawaDataModel.rootNode ) ) {
            diagramView.deleteAll( diagramView.getManager().getSheet() );
            self._ishikawaDataModel.rootNode = undefined;
        } else {
            var allNodes = [];
            var removeCategories = [];
            _.forEach( self._ishikawaDataModel.rootNode.categories, function( categoryItem ) {
                if( _.find( removeNodes, function( nodeItem ) {
                        return categoryItem.node === nodeItem;
                    } ) ) {
                    removeCategories.push( categoryItem );
                    allNodes = allNodes.concat( categoryItem.causes );
                    allNodes.push( categoryItem.node );
                }
            } );

            // Remove the categories for the layout tree
            _.pullAll( self._ishikawaDataModel.rootNode.categories, removeCategories );

            var removeCauseNodes = _.difference( removeNodes, allNodes );

            _.forEach( self._ishikawaDataModel.rootNode.categories, function( categoryItem ) {
                _.pullAll( categoryItem.causes, removeCauseNodes );
            } );

            allNodes = allNodes.concat( removeCauseNodes );

            var allEdges = [];

            _.forEach( allNodes, function( nodeItem ) {
                allEdges = allEdges.concat( nodeItem.askLinkedConnections() );
            } );

            // Remove the edges and the nodes
            diagramView.deleteElements( allEdges.concat( allNodes ) );
        }
    };

    /**
     * Check if the Ishikawa layout is activated
     *
     * @return true if Ishikawa layout is activated, false otherwise
     */
    this.isActive = function() {
        return this._isActive;
    };

    /**
     * activate the Ishikawa layout
     */
    this.activate = function() {
        this._isActive = true;
    };

    /**
     * deactivate Ishikawa layout.
     */
    this.deactivate = function() {};

    /**
     * relocate the port to its center point of specified side.
     *
     * @param {Object} node - the node who owns the port
     * @param {String} portPosition - string to describe the port position
     */
    this._setPortPosition = function( node, portPosition ) {
        var ports = node.getPorts();
        if( ports && ports.length === 1 ) {
            var percentX = 0.5;
            var percentY = 0;

            switch ( portPosition ) {
                case NodePortPosition.TOP:
                    break;
                case NodePortPosition.RIGHT:
                    percentX = 1;
                    percentY = 0.5;
                    break;
                case NodePortPosition.BOTTOM:
                    percentX = 0.5;
                    percentY = 1;
                    break;
                case NodePortPosition.LEFT:
                    percentX = 0;
                    percentY = 0.5;
                    break;
            }

            // Set the port position
            var portLocation = ports[ 0 ].getLocation();
            portLocation.setInput( window.SDF.Utils.CoordinateMode.PERCENT, window.SDF.Utils.Axis.X, percentX );
            portLocation.setInput( window.SDF.Utils.CoordinateMode.ABSOLUTE, window.SDF.Utils.Axis.X, 0 );
            portLocation.setInput( window.SDF.Utils.CoordinateMode.PERCENT, window.SDF.Utils.Axis.Y, percentY );
            portLocation.setInput( window.SDF.Utils.CoordinateMode.ABSOLUTE, window.SDF.Utils.Axis.Y, 0 );
        }
    };

    /**
     * Calculate the length of the spine edge. As it is horizontal, just give the x offset to (0, 0).
     */
    this._calculateSpineLength = function() {
        var rectViewport = diagramView.getManager().getViewport();
        var rootNode = this._ishikawaDataModel.rootNode;
        if( rootNode ) {
            if( rootNode.categories && rootNode.categories.length === 0 ) {
                return rectViewport.width - rootNode.getWidthValue() - 50;
            }
            var maxCauseNum = this._getMaxCauseNumOfCategory( rootNode.categories );

            // Assume all category nodes have the same height
            var categoryNode = rootNode.categories[ 0 ].node;
            var offsetY = rootNode.getHeightValue() * ( maxCauseNum + 1.5 ) + categoryNode.getHeightValue() * 3 / 2;

            var spineLength = rootNode.getWidthValue() * 2 / 3 +
                ( rootNode.getWidthValue() + categoryNode.getWidthValue() ) * ( Math.ceil( rootNode.categories.length / 2 ) - 1 );

            spineLength = spineLength + Math.tan( Math.PI / 6 ) * offsetY + categoryNode.getWidthValue();

            return spineLength;
        }
        return undefined;
    };

    /**
     * Calculate the max cause num of all categories
     */
    this._getMaxCauseNumOfCategory = function( categories ) {
        var maxCauseCategory = _.maxBy( categories, function( category ) {
            return category.causes.length;
        } );

        if( maxCauseCategory && maxCauseCategory.causes ) {
            return maxCauseCategory.causes.length;
        }
        return 0;
    };

    /**
     * Apply global layout to the graph.
     */
    this.applyLayout = function() {
        var rootNode = this._ishikawaDataModel.rootNode;
        if( rootNode ) {
            // Locate the effect node
            var spineLen = this._calculateSpineLength();

            diagramView.beginTransaction();

            rootNode.setRenderingPosition( spineLen, -rootNode.getHeightValue() / 2 );

            if( rootNode.categories && rootNode.categories.length > 0 ) {
                var categories = rootNode.categories;

                // locate the category nodes
                var offsetY = 0;
                var offsetX = 0;

                var maxCauseNum = this._getMaxCauseNumOfCategory( categories );

                var categoryX = 0;
                var categoryY = 0;

                var rootNodePosition = rootNode.getRenderingPosition();
                for( var i = 0; i < categories.length; i++ ) {
                    var categoryNode = categories[ i ].node;
                    var causes = categories[ i ].causes;

                    offsetY = rootNode.getHeightValue() * ( maxCauseNum + 1.5 ) + categoryNode.getHeightValue() * 3 / 2;
                    offsetX = Math.tan( Math.PI / 6 ) * offsetY;

                    if( i < 2 ) {
                        categoryX = rootNodePosition.x - rootNode.getWidthValue() * 2 / 3;
                    } else if( i % 2 === 0 ) {
                        categoryX = categoryX - rootNode.getWidthValue() - categoryNode.getWidthValue();
                    }

                    var connections = categoryNode.askLinkedConnections();
                    if( connections.length > 0 ) {
                        connections[ 0 ].getEndLocation().setEvaluatedLocation( categoryX, categoryY );
                    }

                    if( i % 2 === 0 ) {
                        categoryNode.setRenderingPosition( categoryX - offsetX - categoryNode.getWidthValue() / 2,
                            -offsetY - categoryNode.getHeightValue() );
                        this._setPortPosition( categoryNode, NodePortPosition.BOTTOM );
                    } else {
                        categoryNode.setRenderingPosition( categoryX - offsetX - categoryNode.getWidthValue() / 2, offsetY );
                        this._setPortPosition( categoryNode, NodePortPosition.TOP );
                    }

                    // To locate the cause positions
                    var paddingX = 50;
                    for( var j = 0; j < causes.length; j++ ) {
                        var paddingY = ( offsetY - categoryNode.getHeightValue() - rootNode.getHeightValue() / 2 ) / maxCauseNum - causes[ j ].getHeightValue();
                        var childOffsetY = offsetY - categoryNode.getHeightValue() - ( causes[ j ].getHeightValue() + paddingY ) * j;
                        var childOffsetX = Math.tan( Math.PI / 6 ) * childOffsetY;
                        var causeX = 0;
                        var causeY = 0;
                        if( i % 2 === 0 ) {
                            causes[ j ].setRenderingPosition( categoryX - childOffsetX + categoryNode.getWidthValue() / 2 + paddingX, -childOffsetY );
                            causeX = categoryX - ( childOffsetY - causes[ j ].getHeightValue() / 2 ) * Math.tan( Math.PI / 6 );
                            causeY = -childOffsetY + causes[ j ].getHeightValue() / 2;
                        } else {
                            causes[ j ].setRenderingPosition( categoryX - childOffsetX + categoryNode.getWidthValue() / 2 + paddingX,
                                childOffsetY - causes[ j ].getHeightValue() );
                            causeX = categoryX - ( childOffsetY - causes[ j ].getHeightValue() / 2 ) * Math.tan( Math.PI / 6 );
                            causeY = childOffsetY - causes[ j ].getHeightValue() / 2;
                        }

                        var connections = causes[ j ].askLinkedConnections();
                        if( connections.length > 0 ) {
                            connections[ 0 ].getEndLocation().setEvaluatedLocation( causeX, causeY );
                        }
                        this._setPortPosition( causes[ j ], NodePortPosition.LEFT );
                    }
                }
            }
            diagramView.endTransaction();
        }
    };

    /**
     * Apply layout for the graph updates.
     *
     * @param {Function} - graphChangesFun the function object that can make graph changes
     *
     */
    this.applyUpdate = function( graphChangesFun ) {
        if( graphChangesFun && typeof graphChangesFun === 'function' ) {
            graphChangesFun();
        }
    };
};

/**
 * Create Ishikawa layout.
 *
 * @param diagramView the diagram view object
 * @param hostInterface the host layout interface
 * @returns {promise} promise resolved with layout object
 */
export let createLayout = function( diagramView, hostInterface ) {
    var layout = new exports.IshikawaLayout( diagramView, hostInterface );
    return AwPromiseService.instance.resolve( layout );
};

export default exports = {
    IshikawaLayout,
    createLayout
};
/**
 * The service to provide column layout support.
 *
 * @member columnLayoutService
 * @memberof NgServices
 */
app.factory( 'IshikawaLayoutService', () => exports );

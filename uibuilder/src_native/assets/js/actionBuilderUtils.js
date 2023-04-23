// Copyright (c) 2020 Siemens

/**
 * This module provides graph style support
 *
 * @module js/actionBuilderUtils
 */

import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import graphConstants from 'js/graphConstants';

let exports;

var portLocation2Position = function( node, port ) {
    var portLocation = port.getLocation();
    var percentX = portLocation.getInputPercentX();
    var percentY = portLocation.getInputPercentY();

    var bbox = node.getBBox();
    if( percentX === 0 ) {
        var valueX = portLocation.getInputValueX();
        if( valueX > 0 ) {
            percentX = valueX / bbox.width;
        }
    }

    if( percentX > 0 && percentX < 1 ) {
        percentX = 0.5;
    }

    if( percentY === 0 ) {
        var valueY = portLocation.getInputValueY();
        if( valueY > 0 ) {
            percentY = valueY / bbox.height;
        }
    }
    if( percentY > 0 && percentY < 1 ) {
        percentY = 0.5;
    }

    if( percentX === 0.5 && percentY === 0 ) {
        return graphConstants.NodePortPosition.TOP;
    } else if( percentX === 1 && percentY === 0.5 ) {
        return graphConstants.NodePortPosition.RIGHT;
    } else if( percentX === 0.5 && percentY === 1 ) {
        return graphConstants.NodePortPosition.BOTTOM;
    }

    return graphConstants.NodePortPosition.LEFT;
};

var centerPortOnSide = function( graphModel, node ) {
    var ports = node.getPorts();

    // Merge all ports on the same side to one
    var portsOnSides = _.groupBy( ports, function( port ) {
        return portLocation2Position( node, port );
    } );

    _.forEach( portsOnSides, function( value, key ) {
        if( value && value.length > 0 ) {
            var graph = graphModel.graphControl.graph;
            graph.centerPortOnNodeSide( value[ 0 ], key );
            if( graphModel.graphControl.layout.isActive() && graphModel.graphControl.layout.containsPort( value[ 0 ] ) ) {
                graphModel.graphControl.layout.movePort( value[ 0 ] );
            }
            if( value.length > 1 ) {
                // Remove the other ports on the same side and reconnect connections to the first port.
                for( var ii = 1; ii < value.length; ii++ ) {
                    var linkedEdges = value[ ii ].askLinkedConnections();
                    if( linkedEdges && linkedEdges.length > 0 ) {
                        for( var jj = 0; jj < linkedEdges.length; jj++ ) {
                            if( linkedEdges[ jj ].getStart() === value[ ii ] ) {
                                linkedEdges[ jj ].setStart( value[ 0 ] );
                            } else {
                                linkedEdges[ jj ].setEnd( value[ 0 ] );
                            }
                        }
                    }
                    if( graphModel.graphControl.layout.containsPort( value[ ii ] ) ) {
                        graphModel.graphControl.layout.removePort( value[ ii ] );
                    }
                    value[ ii ].remove();
                }
            }
        }
    } );
};

export let relocateAllPorts = function( graphModel ) {
    var graph = graphModel.graphControl.graph;
    var nodes = graph.getNodes();
    graphModel.graphControl.graph.update( function() {
        _.forEach( nodes, function( node ) {
            centerPortOnSide( graphModel, node );
        } );
    } );
};

export let successStyle = {
    dashStyle: 'SOLID',
    thickness: 1.0,
    color: 'rgb(135,155,170)',
    isHotSpotEdge: true,
    targetArrow: {
        arrowShape: 'TRIANGLE',
        arrowScale: 1.0,
        fillInterior: true
    },
    rollupStyle: {
        sourceArrow: {
            arrowShape: 'SIMPLE',
            arrowScale: 1.0,
            fillInterior: true
        },
        targetArrow: {
            arrowShape: 'CIRCLE',
            arrowScale: 1.0,
            fillInterior: true
        }
    }
    /*
     * Leave here for test: indicator: { "strokesWidth": 2, "strokesColor": "rgb(0,0,0)", "fillColor":
     * "rgb(0,0,0)", "scale": 1, "position": 0.4 }
     */
};

export let failureStyle = {
    dashStyle: 'DASH',
    thickness: 2.0,
    color: 'rgb(135,155,170)',
    isHotSpotEdge: true,
    targetArrow: {
        arrowShape: 'TRIANGLE',
        arrowScale: 1.0,
        fillInterior: true
    },
    rollupStyle: {
        sourceArrow: {
            arrowShape: 'SIMPLE',
            arrowScale: 1.0,
            fillInterior: true
        },
        targetArrow: {
            arrowShape: 'CIRCLE',
            arrowScale: 1.0,
            fillInterior: true
        }
    }
    /*
     * Leave here for test: indicator: { "strokesWidth": 2, "strokesColor": "rgb(0,0,0)", "fillColor":
     * "rgb(0,0,0)", "scale": 1, "position": 0.4 }
     */
};

export let portStyle = {
    borderColor: 'rgb(0,0,0)',
    borderStyle: 'solid',
    borderWidth: '0px',
    color: 'rgb(60,130,37)',
    dashStyle: 'SOLID',
    fillColor: 'rgb(255,255,255)',
    portShape: 'CIRCLE',
    rx: 0,
    ry: 0,
    size: 0,
    thickness: 0
};

export let editPortStyle = {
    borderColor: 'rgb(0,0,0)',
    borderStyle: 'solid',
    borderWidth: '1px',
    color: 'rgb(60,130,37)',
    dashStyle: 'SOLID',
    fillColor: 'rgb(255,255,255)',
    portShape: 'CIRCLE',
    rx: 2,
    ry: 2,
    size: 5,
    thickness: 1
};

export let isBasicNodeMode = function( graphModel ) {
    var activeLegendView = appCtxService.getCtx( 'graph.legendState.activeView' );
    return graphModel.graphControl.layout.type === 'ColumnLayout' && activeLegendView.internalName === 'General';
};

/**
 * Get the node size of given node model.
 * This API implementation is optional. If not defined, the global default node size will be applied.
 * @param {Object} graphModel the graph model object
 * @param {Object} nodeModel the node model object
 * @returns {Object} node size
 */
export let getNodeSize = function( graphModel, nodeModel ) {
    var rect = {
        width: 230,
        height: 48
    };

    if( /^(start|end|onEvent)$/.test( nodeModel.category ) ) {
        rect = {
            width: 25,
            height: 25
        };
    }

    //basic node style
    if( exports.isBasicNodeMode( graphModel ) ) {
        if( nodeModel.nodeObject.isRoot ) {
            rect = {
                width: 50,
                height: 50
            };
        } else {
            rect = {};
        }
    }

    return rect;
};

exports = {
    successStyle,
    failureStyle,
    portStyle,
    editPortStyle,
    isBasicNodeMode,
    getNodeSize,
    relocateAllPorts
};
export default exports;

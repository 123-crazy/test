//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define

 */

/**
 * This implements the selection handler interface APIs defined by aw-graph widget to provide selection functionalities.
 *
 * @module js/NetworkGraphSelectionService
 */
import app from 'app';
import selectionService from 'js/selection.service';
import ctxService from 'js/appCtxService';

var exports = {};

var sourceObj;

var NODE_HOVERED_CLASS = 'relation_node_hovered_style_svg';
var TEXT_HOVERED_CLASS = 'relation_text_hovered_style_svg';
var NODE_DEFAULT_CLASS = 'aw-graph-noeditable-area';

/**
 * This function will set the source object to the context.
 *
 * @param {Object} selection - The selected Object
 */
export let setSourceObject = function( selection ) {
    sourceObj = selection;
    selectionService.updateSelection( sourceObj );
};

/**
 * Function to be called when we select items on graph and will update the context.
 *
 * @param {Object} selected - The selected Object.
 * @param {Object} unselected - The unselected Object.
 */
export let updateContextSelection = function( selected, unselected ) {
    if( selected.length > 0 ) {
        var selectedModelObject;
        if( selected[ 0 ].itemType === 'Node' ) {
            if( typeof selected[ '0' ].appData !== typeof undefined ) {
                selectedModelObject = selected[ '0' ].appData.nodeObject;
                selectionService.updateSelection( selectedModelObject );
            }
        }
        if( selected[ 0 ].itemType === 'Edge' ) {
            if( typeof selected[ '0' ].modelObject !== typeof undefined ) {
                selectedModelObject = selected[ '0' ].modelObject;
                selectionService.updateSelection( selectedModelObject );
            }
        }
    }
    if( unselected.length > 0 && selected.length <= 0 ) {
        selectedModelObject = ctxService.ctx.xrtSummaryContextObject;
        selectionService.updateSelection( selectedModelObject );
    }
};

/**
 * ------------------------------------------------------------------- Set the hovered style of a node.
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} nodes - the graph nodes on which to apply a style
 * @param {String} isHovered - true if the node is being hovered over
 *
 * Applying a node style, as is done here, is a two step process. First, update the relevant properties kept by
 * the node. Then call updateNodeBinding to apply properties to the SVG/DOM. Node (fill, stroke, etc.) and text
 * styling will be specified in the single node-hovered styling class in graphModel.hoverStyle.node.
 */
function setNodeHoverStyle( graphModel, nodes, isHovered ) {
    for( var i = 0; i < nodes.length; i++ ) {
        var node = nodes[ i ];
        if( node ) {
            var appObj = {};

            if( isHovered ) {
                appObj[ NODE_HOVERED_CLASS ] = graphModel.hoverStyle.node;
                appObj[ TEXT_HOVERED_CLASS ] = graphModel.hoverStyle.node;
            } else {
                appObj[ NODE_HOVERED_CLASS ] = NODE_DEFAULT_CLASS;
                appObj[ TEXT_HOVERED_CLASS ] = '';
            }

            graphModel.graphControl.graph.updateNodeBinding( node,
                appObj );
        }
    }
}

/**
 * ------------------------------------------------------------------- Set the style of an edge and the
 * associated nodes to hovered, or standard depending on parameter isHovered.
 *
 * @param {Object} graphModel - The graph model object.
 * @param {Object} edge - The edge on which to set the style.
 * @param {String} isHovered - true if the edge is being hovered over.
 */
function setEdgeHoverStyle( graphModel, edge, isHovered ) {
    if( !edge.style ) {
        return;
    }

    exports.setEdgeStyle( graphModel, edge, isHovered );
    setNodeHoverStyle( graphModel, [ edge.getSourceNode(), edge.getTargetNode() ], isHovered );
}

/**
 * Set the style for an edge. If the edge is being hovered over, use the style in the style cache for hover,
 * else use the plain styling cache.
 *
 * @param {Object} graphModel - The graph model object.
 * @param {Object} edge - The edge on which to set the style.
 * @param {String} isHovered - true if the node is being hovered over.
 */
export let setEdgeStyle = function( graphModel, edge, isHovered ) {
    if( !graphModel || !edge ) {
        return;
    }
    var style = edge.style;
    if( isHovered ) {
        style.thickness *= graphModel.hoverStyle.edge.thicknessScale;
        graphModel.graphControl.graph.setEdgeStyle( edge, style );
    } else {
        style.thickness = 2;
        graphModel.graphControl.graph.setEdgeStyle( edge, style );
    }
};

/**
 * ------------------------------------------------------------------- Graph hover-changed handler
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} eventData - contains the hovered and/or unhovered items from the graph
 */
export let networkGraphHoverChanged = function( graphModel, eventData ) {
    if( !graphModel || !eventData ) {
        return;
    }
    var unHoveredItem = eventData.unHoveredItem;
    var hoveredItem = eventData.hoveredItem;
    if( unHoveredItem ) {
        if( !unHoveredItem.isSelected() ) {
            if( unHoveredItem.getItemType() === 'Edge' ) {
                setEdgeHoverStyle( graphModel, unHoveredItem, false );
            } else if( unHoveredItem.getItemType() === 'Node' ) {
                setNodeHoverStyle( graphModel, [ unHoveredItem ], false );
            }
        }
    }
    if( hoveredItem ) {
        if( !hoveredItem.isSelected() ) {
            if( hoveredItem.getItemType() === 'Edge' ) {
                setEdgeHoverStyle( graphModel, hoveredItem, true );
            } else if( hoveredItem.getItemType() === 'Node' ) {
                setNodeHoverStyle( graphModel, [ hoveredItem ], true );
            }
        }
    }
};

export default exports = {
    setSourceObject,
    updateContextSelection,
    setEdgeStyle,
    networkGraphHoverChanged
};
/**
 * Define selection service handler.
 *
 * @memberof NgServices
 * @member NetworkGraphSelectionService
 */
app.factory( 'NetworkGraphSelectionService', () => exports );

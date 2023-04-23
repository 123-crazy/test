// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define

 */

/**
 * This implements the graph edit handler interface APIs defined by aw-graph widget to provide graph authoring
 * functionalities.
 *
 * @module js/CAW0MethodologyOverlayHandler
 */
import app from 'app';

var exports = {};

export let setOverlayNode = function( graphModel, node, pointOnPage ) {
    if( graphModel && graphModel.graphControl ) {
        var nodeSize;
        if( node.appData.nodeObject.type === 'CauseGroup' ) {
            nodeSize = {
                width: 180,
                height: 70
            };
        } else {
            nodeSize = {
                width: 300,
                height: 100
            };
        }
        var nodeStyle = node.style;
        var nodeData = node.getAppObj();
        if( node.appData.isGroup ) {
            nodeSize.height = node.getAppObj().HEADER_HEIGHT;
        }
        graphModel.graphControl.setCustomOverlayNode( node, nodeStyle, nodeSize, nodeData, pointOnPage );
    }
};

export default exports = {
    setOverlayNode
};
/**
 * Define graph overlay handler
 *
 * @memberof NgServices
 * @member CAW0MethodologyOverlayHandler
 */
app.factory( 'CAW0MethodologyOverlayHandler', () => exports );

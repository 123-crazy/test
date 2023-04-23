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
 * This implements the graph edit handler interface APIs defined by aw-graph widget to provide graph authoring
 * functionalities.
 *
 * @module js/Rv1RelationBrowserOverlayHandler
 */
import app from 'app';

var exports = {};

export let setOverlayNode = function( graphModel, node, pointOnPage ) {
    if( graphModel && graphModel.graphControl ) {
        var nodeSize = {
            width: 300,
            height: 125
        };
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
 * @member Rv1RelationBrowserOverlayHandler
 */
app.factory( 'Rv1RelationBrowserOverlayHandler', () => exports );

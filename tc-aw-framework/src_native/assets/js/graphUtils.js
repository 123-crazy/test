// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module defines graph utils
 *
 * @module js/graphUtils
 */
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import graphConstants from 'js/graphConstants';
import graphUtils from 'js/internalGraphUtils';
import logSvc from 'js/logger';

'use strict';

var exports = {};

/**
 * Transform the sheet point coordinates into screen coordinate
 *
 * @param graph the current graph
 * @param pointOnSheet the pointOnSheet need to be converted
 */
export let sheetToScreenCoordinate = function( graph, pointOnSheet ) {
    return graphUtils.sheetToScreenCoordinate( graph._diagramView, pointOnSheet );
};

/**
 * convert Coordinate from sheet To View
 *
 * @param graph the current graph
 * @param pointOnSheet the point on sheet coordinate
 *
 */
export let sheetToViewCoordinate = function( graph, pointOnSheet ) {
    return graphUtils.sheetToViewCoordinate( graph._diagramView, pointOnSheet );
};

/**
 * convert Coordinate from View To Sheet
 *
 * @param graph the current graph
 * @param pointOnView the point on view coordinate
 *
 */
export let viewToSheetCoordinate = function( graph, pointOnView ) {
    return graphUtils.viewToSheetCoordinate( graph._diagramView, pointOnView );
};

/**
 * convert Coordinate from view To page
 *
 * @param graph the current graph
 * @param pointOnView the point on view coordinate
 *
 */
export let viewToPageCoordinate = function( graph, pointOnView ) {
    return graphUtils.viewToPageCoordinate( graph._diagramView, pointOnView );
};

/**
 * convert Coordinate from page To view
 *
 * @param graph the current graph
 * @param pointOnView the point on view coordinate
 *
 */
export let pageToViewCoordinate = function( graph, pointOnPage ) {
    return graphUtils.pageToViewCoordinate( graph._diagramView, pointOnPage );
};

/**
 * Convert the point on sheet coordinate to page coordinate
 *
 * @param graph the current graph
 * @param pointOnSheet the point on sheet coordinate
 */
export let sheetToPageCoordinate = function( graph, pointOnSheet ) {
    return graphUtils.sheetToPageCoordinate( graph._diagramView, pointOnSheet );
};

/**
 * whether the point located in node header area
 *
 * @param node the node
 * @param pointOnSheet the point on sheet
 * @return true if point inside of node header, false otherwise.
 *
 */
export let isPointInNodeHeader = function( node, pointOnSheet ) {
    if( !node || !( node instanceof window.SDF.Models.Node ) ) {
        return false;
    }

    var rect = node.getRenderingBBox();
    var appObj = node.getAppObj();
    if( node.isGroupingAllowed() && appObj && appObj.HEADER_HEIGHT !== undefined ) {
        rect.height = appObj.HEADER_HEIGHT;
    }
    return rect.isPointInside( pointOnSheet );
};

/**
 * Check whether the hit point in a circle
 *
 * @param hitPoint the hit point
 * @param centerPoint the center position
 * @param radius the circle radius
 *
 * @return flag whether the hit point in circle
 */
export let isPointInCircle = function( hitPoint, centerPoint, radius ) {
    var xSquare = Math.pow( hitPoint.x - centerPoint.x, 2 );
    var ySquare = Math.pow( hitPoint.y - centerPoint.y, 2 );
    var result = Math.pow( xSquare + ySquare, 0.5 );

    if( result <= radius ) {
        return true;
    }

    return false;
};

/**
 * Show context menu on graph at give context element or position. All the visible child commands will display as context menu.
 *
 * @param graphModel the graph model to show context menu
 * @param groupCommandId the group command ID.
 * @param graphItem the context graph item to show context menu.
 * @param position the context menu popup position on page coordinate. Optional, if position is not given, the context menu will related to the
 * DOM element of context graph item.
 *
 * @return flag whether the hit point in circle
 */
export let showPopupMenu = function( graphModel, groupCommandId, graphItem, position ) {
    if( !graphModel || !groupCommandId || !( graphItem || position ) ) {
        return;
    }

    var relativeRect = {};
    var pointOnPage = position;
    if( position ) {
        if( !position.x || !position.y ) {
            logSvc.error( 'Failed to show popup menu on graph, the input "position" is not a valid point.' );
            return;
        }

        relativeRect.width = 1;
        relativeRect.height = 1;
    } else if( graphItem && graphItem instanceof window.SDF.Models.SheetElement ) {
        var zoomFactor = graphModel.graphControl.getZoom();
        var rect = graphItem.getRenderingBBox();
        pointOnPage = exports.sheetToPageCoordinate( graphModel.graphControl.graph, rect );
        relativeRect.width = rect.width * zoomFactor;
        relativeRect.height = rect.height * zoomFactor;
    } else {
        logSvc.error( 'Failed to show popup menu on graph, the input "graphItem" is not a valid graph item object.' );
        return;
    }

    relativeRect.left = pointOnPage.x;
    relativeRect.x = pointOnPage.x;
    relativeRect.top = pointOnPage.y;
    relativeRect.y = pointOnPage.y;

    graphUtils.publishGraphEvent( graphModel, 'awGraph.showContextMenu', {
        groupCommandId: groupCommandId,
        graphItem: graphItem,
        relativeRect: relativeRect
    } );
};

export default exports = {
    sheetToScreenCoordinate,
    sheetToViewCoordinate,
    viewToSheetCoordinate,
    viewToPageCoordinate,
    pageToViewCoordinate,
    sheetToPageCoordinate,
    isPointInNodeHeader,
    isPointInCircle,
    showPopupMenu
};

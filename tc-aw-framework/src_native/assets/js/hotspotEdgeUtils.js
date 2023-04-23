// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module provides util functions of edge with hotspot.
 *
 * @module js/hotspotEdgeUtils
 */
import internalGraphUtils from 'js/internalGraphUtils';

'use strict';

var exports = {};

/**
 * Got the hotspot of a edge.
 *
 * @param {Connection} edge The edge
 * @returns The hotspot
 */
var getHotspot = function( edge ) {
    return edge.getAttachedSheetElementWithTagName( 'gc-hotspot' );
};

/**
 * Remove the hotspot of the edge.
 *
 * @param {DiagramView} diagramView
 * @param {Connection} edge The edge
 */
export let removeHotspot = function( diagramView, edge ) {
    var hotspot = getHotspot( edge );
    if( hotspot === null ) {
        return;
    }
    unregisterHotspotHandler( edge );
    diagramView.beginTransaction();
    hotspot.setVisible( false );
    hotspot.remove();
    diagramView.endTransaction();
};

/**
 * Find the nearest segment to a specific point.
 *
 * @param {Array} lines The segments of a connection
 * @param {Point} point The specific point
 * @returns {Number} The index of array of the segments
 */
var findNearestSegmentToPoint = function( lines, point ) {
    var index = 0;
    var segment;
    var minDistance = lines[ 0 ].distanceFromPoint( point );

    for( var i = 1; i < lines.length; i++ ) {
        segment = lines[ i ];
        if( segment.isPointOnLine( point ) ) {
            return i;
        }
        var tempDistance = segment.distanceFromPoint( point );
        if( tempDistance < minDistance ) {
            index = i;
            minDistance = tempDistance;
        }
    }

    return index;
};

/**
 * Add hotspot on the specific location of the specific connection. If the location is null, add the hotspot on
 * default location.
 *
 * @param {Object} graphModel the graph model
 * @param {Connection} connection
 * @param {Point} location
 */
export let addHotspot = function( graphModel, connection, location ) {
    var diagramView = graphModel.graphControl._diagramView;
    diagramView.beginTransaction();

    var hotpotLocPer = null;
    var inlineElement = getHotspot( connection );

    if( inlineElement !== null ) {
        inlineElement.setVisible( true );
    } else {
        var hotSpot = new window.SDF.Models.Ellipse();

        hotSpot.setAnchorX( 0.5 );
        hotSpot.setAnchorY( 0.5 );
        var points;
        var length;

        if( location ) {
            var lines = connection.getLines();
            var index = findNearestSegmentToPoint( lines, location );
            var segment = lines[ index ];
            var projectPoint = segment.getProjectionPoint( location );
            var locPercent = 0;
            if( segment.isVertical() ) {
                locPercent = ( projectPoint.y - segment.start.y ) / ( segment.end.y - segment.start.y );
            } else if( segment.isHorizontal() ) {
                locPercent = ( projectPoint.x - segment.start.x ) / ( segment.end.x - segment.start.x );
            }
            inlineElement = connection.addInlineElement( hotSpot, index, locPercent, 11, 11, 0, 0 );

            points = connection.getConnectionRender().getPointsAfterTrim();
            length = points.length;

            var pathLength = 0;
            var posLength = 0;

            for( var idx = 0; idx < length - 1; idx++ ) {
                var dis = points[ idx + 1 ].distanceToPoint( points[ idx ] );
                pathLength += dis;
                if( idx < index ) {
                    posLength += dis;
                } else if( idx === index ) {
                    posLength += points[ idx ].distanceToPoint( projectPoint );
                }
            }

            if( pathLength > 0 ) {
                hotpotLocPer = posLength / pathLength;
            }
        } else {
            points = connection.getConnectionRender().getPointsAfterTrim();
            length = points.length;

            if( length === 2 ) {
                inlineElement = connection.addInlineElement( hotSpot, 0, 0.5, 11, 11, 0, 0 );
            } else {
                inlineElement = connection.addInlineElement( hotSpot, length - 2, 0, 11, 11, 0, 0 );
            }
        }

        if( inlineElement ) {
            inlineElement.setOwner( connection );
            inlineElement.setAppObj( 'gc-hotspot' );
            var prop = inlineElement.getSymbols()[ 0 ].getRenderingProperties();
            var propConnection = connection.getRenderingProperties();

            prop.setFillColor( propConnection.getStrokeColor() );
            prop.setStrokeColor( propConnection.getStrokeColor() );
            prop.setStrokeWidth( 1 );
            prop.setStyleClass( 'aw-relations-hotspot' );

            var DONT_ALLOW_TRANSFORMATION = 0;
            inlineElement.setAllowedTransformations( DONT_ALLOW_TRANSFORMATION );

            registerHotspotHandler( graphModel, connection );
        }
    }

    if( inlineElement ) {
        inlineElement.getLocation().setLocationRule( new window.SDF.Models.HotspotLocationRule( hotpotLocPer ) );
    }

    diagramView.endTransaction();
};

/**
 * Tests if an element is a connection which can have a hotspot.
 *
 * @param {SheetElement} element The element to test
 * @returns true or false
 */
export let isHotSpotEdge = function( element ) {
    if( element instanceof window.SDF.Models.Connection && element.style ) {
        return element.style.isHotSpotEdge;
    }

    return false;
};

var registerHotspotHandler = function( graphModel, edge ) {
    var hotspotElement = getHotspot( edge );
    if( hotspotElement ) {
        hotspotElement.handler = function() {
            internalGraphUtils.publishGraphEvent( graphModel, 'awGraph.hotspotClicked', {
                edge: edge
            } );
        };
        hotspotElement.on( 'mouseup', hotspotElement.handler );
    }
};

var unregisterHotspotHandler = function( edge ) {
    var hotspotElement = getHotspot( edge );
    if( hotspotElement && hotspotElement.handler ) {
        hotspotElement.off( 'mouseup', hotspotElement.handler );
        hotspotElement.handler = null;
    }
};

export default exports = {
    removeHotspot,
    addHotspot,
    isHotSpotEdge
};

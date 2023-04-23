// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module define a customized edge label moving strategy
 *
 * @module js/EdgeLabelMoveStrategy
 */
import DF from '@diagramming/foundation';

var MoveStrategy = DF.Utils.MoveStrategy;
var Point = DF.Utils.Point;

/**
 * @param {Object} target - target
 * @param {Object} distance - distance
 */
function EdgeLabelMoveStrategy( target, distance ) {
    MoveStrategy.call( this, target );
    this.maxDistance = distance;
}

DF.Utils.EdgeLabelMoveStrategy = EdgeLabelMoveStrategy;

/**
 * @param {Number} dx - dx
 * @param {Number} dy - dy
 */
EdgeLabelMoveStrategy.prototype.getFinalTransformation = function( dx, dy ) {
    var loc = this.element.getLocation();
    var lines = loc.getReference().getLines();
    var anchorPos = this.getOriginalAnchorPosition( this.element );

    var cursorX = anchorPos.x + dx;
    var cursorY = anchorPos.y + dy;

    var minX = 0;
    var minY = 0;
    var maxX = 0;
    var maxY = 0;
    var leng = lines.length;
    if( leng > 0 ) {
        minX = lines[ 0 ].start.x;
        minY = lines[ 0 ].start.y;

        for( var indx = 0; indx < leng; ++indx ) {
            for( var i = 0; i < 2; ++i ) {
                var segmentPoint;
                if( i === 0 ) {
                    segmentPoint = lines[ indx ].start;
                } else {
                    segmentPoint = lines[ indx ].end;
                }

                minX = Math.min( minX, segmentPoint.x );
                maxX = Math.max( maxX, segmentPoint.x );
                minY = Math.min( minY, segmentPoint.y );
                maxY = Math.max( maxY, segmentPoint.y );
            }
        }
    }

    var refBoxP1 = new Point( minX, minY );
    var refBoxP2 = new Point( maxX, minY );
    var refBoxP3 = new Point( minX, maxY );

    var labelBox = this.getElementOriginalBBox( this.element );
    var maxD = this.maxDistance;
    var max_x, min_x, max_y, min_y;

    min_x = Math.min( refBoxP1.x - maxD - labelBox.width, refBoxP2.x + maxD );
    max_x = Math.max( refBoxP1.x - maxD - labelBox.width, refBoxP2.x + maxD );

    max_y = Math.max( refBoxP1.y - maxD - labelBox.height, refBoxP3.y + maxD );
    min_y = Math.min( refBoxP1.y - maxD - labelBox.height, refBoxP3.y + maxD );

    if( cursorX > max_x || cursorX < min_x || cursorY > max_y || cursorY < min_y ) {
        cursorX = anchorPos.x;
        cursorY = anchorPos.y;
        this.setStopMove( true );
    } else {
        this.setStopMove( false );
    }

    var offsetX = cursorX - anchorPos.x;
    var offsetY = cursorY - anchorPos.y;

    return { dx: offsetX, dy: offsetY, angle: undefined };
};

MoveStrategy.inheritedBy( EdgeLabelMoveStrategy );
export default EdgeLabelMoveStrategy;

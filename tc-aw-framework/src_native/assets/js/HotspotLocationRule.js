// Copyright (c) 2019 Siemens

/* global
 define
 */

/* globals MSGesture: false */
import DF from '@diagramming/foundation';
/**
 * HotspotLocationRule
 *
 * @module js/HotspotLocationRule
 */

var LocationRule = DF.Models.LocationRule;

/**
 * Constructor
 * Hotspot location rule
 *
 * @param {any} locationPer
 */
function HotspotLocationRule( locationPer ) {
    LocationRule.call( this );
    var DEFAULT_HOTSPOT_PERSENTAGE = 1 / 3;

    if( locationPer ) {
        this.locationPer = locationPer;
    } else {
        this.locationPer = DEFAULT_HOTSPOT_PERSENTAGE;
    }
}

DF.Models.HotspotLocationRule = HotspotLocationRule;

HotspotLocationRule.prototype.getEvaluatedPoint = function( object, location, x, y ) {
    var refConnection = location.getReference();

    if( refConnection ) {
        var renderingContext = refConnection.getConnectionRender();
        if( renderingContext ) {
            var pointList = renderingContext.getPointsAfterTrim();
            if( pointList ) {
                var len = pointList.length;

                var lineLenArray = [];
                var pathLength = 0;
                var idx;
                var dis;

                for( idx = 0; idx < len - 1; idx++ ) {
                    dis = pointList[ idx + 1 ].distanceToPoint( pointList[ idx ] );
                    pathLength += dis;
                    lineLenArray.push( dis );
                }

                var targetLocation = pathLength * this.locationPer;

                var tmpLen = 0;
                var segmentId = 0;
                var tmpSubLen = 0;
                for( idx = 0; idx < len - 1; idx++ ) {
                    dis = lineLenArray[ idx ];
                    if( tmpLen + dis > targetLocation ) {
                        segmentId = idx;
                        tmpSubLen = targetLocation - tmpLen;
                        break;
                    }
                    tmpLen += dis;
                }

                var startPoint = pointList[ segmentId ];
                var endPoint = pointList[ segmentId + 1 ];
                var ratio = window.SDF.Utils.MathUtil.doubleCompare( lineLenArray[ segmentId ], 0 ) === 0 ? 0 :
                    tmpSubLen / lineLenArray[ segmentId ];
                x = startPoint.x + ( endPoint.x - startPoint.x ) * ratio;
                y = startPoint.y + ( endPoint.y - startPoint.y ) * ratio;

                return new window.SDF.Utils.Point( x, y );
            }
        }
    }

    return new window.SDF.Utils.Point( 0, 0 );
};

LocationRule.inheritedBy( HotspotLocationRule );

// End of define HotspotLocationRule
export default HotspotLocationRule;

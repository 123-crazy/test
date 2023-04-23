// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module defines graph utils
 *
 * @module js/internalGraphUtils
 */
import _ from 'lodash';
import $ from 'jquery';
import graphConstants from 'js/graphConstants';
import eventBus from 'js/eventBus';

'use strict';

var exports = {};

/**
 * convert a layout group option to a valid layout( including type and direction)
 *
 * @param {GCLayoutOption} option The GCLayoutOption
 * @return {GCLayout} the GCLayout, structure as {layoutType: layoutType, layoutDirection:layoutDirection}
 */
export let convertToLayout = function( option ) {
    var layout = {};

    if( !option || _.includes( _.keys( graphConstants.LayoutDirections ), option ) ) {
        layout.layoutType = 'Hierarchical';
        layout.layoutDirection = option;
    } else if( _.includes( _.keys( graphConstants.GlobalLayoutTypes ), option ) ) {
        layout.layoutType = option;
        // set default direction for Hierarchical layout
        if( option === 'Hierarchical' ) {
            layout.layoutDirection = 'TopToBottom';
        }
    }
    return layout;
};

var internalKeyDef = {
    shift: 16,
    ctrl: 17,
    alt: 18
};

var getKeyArray = function( modifierKeyArray ) {
    var keyLine = [];
    if( Array.isArray( modifierKeyArray ) ) {
        for( var j = 0; j < modifierKeyArray.length; j++ ) {
            var indexKeyCode = internalKeyDef[ modifierKeyArray[ j ].toLowerCase() ];
            if( indexKeyCode ) {
                keyLine.push( [ indexKeyCode ] );
            }
        }
    }
    return keyLine;
};

/**
 * Parse the modifier key for rectangleSelectCommand (marquee selection)
 *
 * @param modifierKey modifier key array defined in option json
 * @return array of the modifier key for the command
 */
export let parseModifierKey = function( modifierKey ) {
    var modifierKeyArr = [];
    var keyLine = [];
    if( modifierKey && modifierKey.length > 0 ) {
        if( Array.isArray( modifierKey[ 0 ] ) ) {
            for( var i = 0; i < modifierKey.length; i++ ) {
                var modifierItem = modifierKey[ i ];
                keyLine = getKeyArray( modifierItem );
                if( keyLine.length > 0 ) {
                    modifierKeyArr.push( keyLine );
                }
            }
        } else {
            keyLine = getKeyArray( modifierKey );
            if( keyLine.length > 0 ) {
                modifierKeyArr.push( keyLine );
            }
        }
    }
    return modifierKeyArr;
};

/**
 * Util functions to return a converter with the given map, used to convert property values between GC exposed
 * values and DF internal values
 *
 * @param map the map for GC exposed values and DF internal values(could be any of
 *            string/array/boolean/integer/function etc.)
 * @return converter function
 */
export let convert = function( map ) {
    var getKeyByValue = function( map, inputValue ) {
        var result;
        _.each( map, function( value, key ) {
            var tmp = _.isFunction( value ) ? value() : value;
            if( _.isEqual( tmp, inputValue ) ) {
                result = key;
                return;
            }
        } );
        return result;
    };

    var getValueByKey = function( map, inputKey ) {
        var value = _.get( map, inputKey );
        return _.isFunction( value ) ? value() : value;
    };

    /**
     * transform input values between keys and values using user specified map
     */
    var transform = function( map, input, transformer ) {
        if( _.isUndefined( input ) || input === null ) {
            return;
        }

        var isArray = _.isArray( input );
        var results = isArray ? [] : null;
        if( isArray ) {
            _.each( input, function( item ) {
                results = results.concat( transformer( map, item ) );
            } );
        } else {
            results = transformer( map, input );
        }

        return results;
    };

    /**
     * return a converter function using given map
     */
    return function() {
        var transformer = arguments[ 1 ] ? getKeyByValue : getValueByKey;
        return transform( map, arguments[ 0 ], transformer );
    };
};

/**
 * Get the mask value of alt, shift and ctrl
 */
var getKeyMask = function( isAlt, isShift, isCtrl ) {
    var keyMask = 0;
    if( isAlt ) {
        keyMask += 1;
    }
    if( isShift ) {
        keyMask += 2;
    }
    if( isCtrl ) {
        keyMask += 4;
    }
    return keyMask;
};

/**
 * Check whether the Alt, Shift, and Ctrl key combination is the modifier key for the command
 *
 * @param {String[]} commandKeyDef - command modifier key definition, for example, the ["alt", "ctrl"] indicates the
 *            modifier key for the command are Alt + Ctrl.
 * @param {Boolean} isAlt - true for Alt key being down
 * @param {Boolean} isShift - true for Shift key being down
 * @param {Boolean} isCtrl - true for Ctrl key being down
 * @return {Boolean} - true for the key combination is the modifier key for the command, otherwise false
 */
export let checkCommandModifierKey = function( commandKeyDef, isAlt, isShift, isCtrl ) {
    if( commandKeyDef && Array.isArray( commandKeyDef ) && commandKeyDef.length > 0 ) {
        var keyMask = getKeyMask( isAlt, isShift, isCtrl );

        var commandMask = 0;
        for( var index = 0; index < commandKeyDef.length; index++ ) {
            var keyName = commandKeyDef[ index ].replace( /^\s+|\s+$/g, '' ).toLowerCase();
            switch ( keyName ) {
                case 'alt':
                    commandMask += 1;
                    break;
                case 'shift':
                    commandMask += 2;
                    break;
                case 'ctrl':
                    commandMask += 4;
                    break;
                default:
                    break;
            }
        }

        if( keyMask === commandMask ) {
            return true;
        }
    }
    return false;
};

/**
 * Transform the sheet point coordinates into screen coordinate
 *
 * @param diagramView the current graph
 * @param pointOnSheet the point on diagram sheet coordinate
 */
export let sheetToScreenCoordinate = function( diagramView, pointOnSheet ) {
    if( !diagramView || !pointOnSheet ) {
        return null;
    }

    var matrixSheetToScreen = diagramView.getManager().getSheetToScreenTransform();
    return matrixSheetToScreen.transformPoint( pointOnSheet );
};

/**
 * convert Coordinate from sheet To View
 *
 * @param diagramView the current graph
 * @param pointOnSheet the point on diagram sheet coordinate
 */
export let sheetToViewCoordinate = function( diagramView, pointOnSheet ) {
    if( !diagramView || !pointOnSheet ) {
        return null;
    }

    var matrixSheetToView = diagramView.getSheetToViewTransform();
    return matrixSheetToView.transformPoint( pointOnSheet );
};

/**
 * convert Coordinate from View To Sheet
 *
 * @param diagramView the current graph
 * @param pointOnView the point need to be converted
 *
 */
export let viewToSheetCoordinate = function( diagramView, pointOnView ) {
    if( !diagramView || !pointOnView ) {
        return null;
    }

    var matrixViewToSheet = diagramView.getSheetToViewTransform().invert();
    return matrixViewToSheet.transformPoint( pointOnView );
};

/**
 * Convert the point on sheet coordinate to page coordinate
 *
 * @param diagramView the current graph
 * @param pointOnSheet the point on sheet coordinate
 */
export let sheetToPageCoordinate = function( diagramView, pointOnSheet ) {
    var pointOnView = exports.sheetToViewCoordinate( diagramView, pointOnSheet );
    return exports.viewToPageCoordinate( diagramView, pointOnView );
};

/**
 * convert Coordinate from view To page
 *
 * @param diagramView the current graph
 * @param pointOnView the point on view coordinate
 *
 */
export let viewToPageCoordinate = function( diagramView, pointOnView ) {
    if( !diagramView || !pointOnView ) {
        return null;
    }

    var matrixPageToView = diagramView.getViewToPageTransform();
    return matrixPageToView.transformPoint( pointOnView );
};

/**
 * convert Coordinate from page To view
 *
 * @param diagramView the current graph
 * @param pointOnView the point on view coordinate
 *
 */
export let pageToViewCoordinate = function( diagramView, pointOnPage ) {
    if( !diagramView || !pointOnPage ) {
        return null;
    }

    var matrixPageToView = diagramView.getViewToPageTransform().invert();
    return matrixPageToView.transformPoint( pointOnPage );
};

/**
 * get CommandElement By Point
 *
 * @param pointOnPage the point in the page
 * @return {Element} the CommandElement
 */
export let getCommandElementByPoint = function( pointOnPage ) {
    var clickedDomElement = document.elementFromPoint( pointOnPage.x, pointOnPage.y );
    // check if clicked on the tile command
    var jqElement = $( clickedDomElement );
    var parents = jqElement.parents();
    return _.find( parents, function( element ) {
        // use className val to support both chrome && ie11 browser
        var className = '';
        if( element.className && element.className.baseVal ) {
            className = element.className.baseVal;
        }

        return className.indexOf( 'aw-graph-tileCommand' ) >= 0;
    } );
};

/**
 * Get the editable text element on the point
 *
 * @param pointOnPage the point on page
 * @return true of false
 *
 */
export let getEditableTextElement = function( pageMousePosition ) {
    var pointDomElement = document.elementFromPoint( pageMousePosition.x, pageMousePosition.y );
    if( pointDomElement.tagName === 'tspan' ) {
        pointDomElement = pointDomElement.parentElement || pointDomElement.parentNode;
    }
    if( pointDomElement.tagName === 'text' ) {
        var className = '';
        if( pointDomElement.className && pointDomElement.className.baseVal ) {
            className = pointDomElement.className.baseVal;
            if( className.indexOf( graphConstants.MODIFIABLE_PROPERTY_CLASS ) >= 0 ) {
                return pointDomElement;
            }
        }
    }

    return null;
};

/**
 * get point by the location.
 *
 * @param location the number array of length 2.
 * @return Location
 *
 */
export let getPointByLocation = function( location ) {
    var point = null;

    if( location && location.length === 2 ) {
        point = new window.SDF.Utils.Point( location[ 0 ], location[ 1 ] );
    }
    return point;
};

/**
 * group objects based on object type
 *
 * @param graphItems the graphItems
 */
export let groupItems = function( graphItems ) {
    if( !graphItems ) {
        return;
    }

    var results = _.groupBy( graphItems, _.method( 'getItemType' ) );
    return results;
};

/**
 * Publish graph event with additional event source.
 * @param graphModel the graph model
 * @param channel the event channel
 * @param eventData event data
 */
export let publishGraphEvent = function( graphModel, channel, eventData ) {
    if( channel ) {
        if( eventData === undefined ) {
            eventData = {};
        }

        if( graphModel ) {
            eventData.sourceGraph = graphModel;
        }

        eventBus.publish( channel, eventData );
    }
};

/**
 * Regulate the edge creation end point. If the click point is very close to target node border, regular the
 * end point to node border.
 *
 * Direct port from GWT version
 *
 * @param targetNode the node to create edge
 * @param location the the end point to create edge
 * @param tolerance the tolerance to target node border
 * @return position the regulated edge creation end point
 */
export let getEdgeCreationEndPoint = function( targetNode, location, tolerance ) {
    if( !targetNode || !location ) {
        return;
    }

    var nodePos = targetNode.getRenderingPosition();
    var width = targetNode.getWidthValue();
    var height = targetNode.getHeightValue();
    var offsetX = location.x - nodePos.x;
    var offsetY = location.y - nodePos.y;
    var percentX = offsetX / width;
    var percentY = offsetY / height;

    // to regulate the creation end point if the click position is very close to target node border within the tolerance
    var offsetToRightX = location.x - ( nodePos.x + targetNode.getWidthValue() );
    var offsetToBottomY = location.y - ( nodePos.y + targetNode.getHeightValue() );
    var minOffSetX = Math.min( Math.abs( offsetX ), Math.abs( offsetToRightX ) );
    var minOffSetY = Math.min( Math.abs( offsetY ), Math.abs( offsetToBottomY ) );

    if( minOffSetX > minOffSetY ) {
        if( minOffSetY < tolerance ) {
            percentY = Math.round( percentY );
        }
    } else if( minOffSetX < tolerance ) {
        percentX = Math.round( percentX );
    }

    return [ percentX * width, percentY * height ];
};

/**
 * Get visible graph items from the input
 *
 * @param items the graph items array
 * @return the visible graph items
 */
export let getVisibleItems = function( items ) {
    return _.filter( items, function( item ) {
        return item.isVisible();
    } );
};

/**
 * Get Diagram Foundation command
 *
 * @param diagramView the diagram view instance
 * @param commandName the graph items array
 * @return the visible graph items
 */
export let getDFCommand = function( diagramView, commandName ) {
    var command = null;

    if( diagramView && commandName ) {
        try {
            command = diagramView.getManager().getCommandManager().getCommand( commandName );
        } catch ( error ) {
            // DF currently raise error if the command doesn't exist, it should return undefined instead.
        }
    }
    return command;
};

/**
 * Get node bounding box
 *
 * @param node the graph node
 * @return node binding box of the node
 */
export let getBounds = function( node ) {
    if( !node ) {
        return null;
    }

    return {
        x: node.getAnchorPositionX(),
        y: node.getAnchorPositionY(),
        width: node.getWidthValue(),
        height: node.getHeightValue()
    };
};

/**
 * Set the port location with relative coordinator
 *
 * @param portLocation the location of the port
 * @param percentX x percent of the port refer to its owner node
 * @param percentY y percent of the port refer to its owner node
 */
export let setPortRelLocation = function( portLocation, percentX, percentY ) {
    var precision = 0.001;
    var perX = percentX;
    var perY = percentY;

    portLocation.setInput( window.SDF.Utils.CoordinateMode.ABSOLUTE, window.SDF.Utils.Axis.X, 0 );
    portLocation.setInput( window.SDF.Utils.CoordinateMode.ABSOLUTE, window.SDF.Utils.Axis.Y, 0 );

    if( Math.abs( percentX ) < precision ) {
        perX = 0;
    } else if( Math.abs( 1 - percentX ) < precision ) {
        perX = 1;
    }
    portLocation.setInput( window.SDF.Utils.CoordinateMode.PERCENT, window.SDF.Utils.Axis.X, perX );

    if( Math.abs( percentY ) < precision ) {
        perY = 0;
    } else if( Math.abs( 1 - percentY ) < precision ) {
        perY = 1;
    }
    portLocation.setInput( window.SDF.Utils.CoordinateMode.PERCENT, window.SDF.Utils.Axis.Y, perY );
};

/**
 * Set the port location with absolute coordinator according to its position on the node border
 *
 * @param portLocation location of the port
 * @param offsetX  x offset
 * @param offsetY  y offset
 * @param  percentX x percent
 * @param  percentY y percent
 */
export let setPortAbsLocation = function( portLocation, offsetX, offsetY, percentX, percentY ) {
    var perX = -1;
    var perY = -1;
    var precision = 0.001;

    if( Math.abs( percentX ) < precision ) {
        perX = 0;
    } else if( Math.abs( 1 - percentX ) < precision ) {
        perX = 1;
    }
    if( Math.abs( percentY ) < precision ) {
        perY = 0;
    } else if( Math.abs( 1 - percentY ) < precision ) {
        perY = 1;
    }

    if( perX === 0 || perX === 1 ) { // left or right border
        portLocation.setInput( window.SDF.Utils.CoordinateMode.PERCENT, window.SDF.Utils.Axis.X, perX );
        portLocation.setInput( window.SDF.Utils.CoordinateMode.ABSOLUTE, window.SDF.Utils.Axis.X, 0 );
        portLocation.setInput( window.SDF.Utils.CoordinateMode.PERCENT, window.SDF.Utils.Axis.Y, 0 );
    } else {
        portLocation.setInput( window.SDF.Utils.CoordinateMode.ABSOLUTE, window.SDF.Utils.Axis.X, offsetX );
    }

    if( perY === 0 || perY === 1 ) { // top or bottom border
        portLocation.setInput( window.SDF.Utils.CoordinateMode.PERCENT, window.SDF.Utils.Axis.X, 0 );
        portLocation.setInput( window.SDF.Utils.CoordinateMode.ABSOLUTE, window.SDF.Utils.Axis.Y, 0 );
        portLocation.setInput( window.SDF.Utils.CoordinateMode.PERCENT, window.SDF.Utils.Axis.Y, perY );
    } else {
        portLocation.setInput( window.SDF.Utils.CoordinateMode.ABSOLUTE, window.SDF.Utils.Axis.Y, offsetY );
    }
};

/**
 * Convert the relative position of the port to absolute
 *
 * @param port port needs to convert the location
 */
export let convertRelPortPosition2Abs = function( port ) {
    if( port ) {
        var nodeBoundBox = exports.getBounds( port.getOwner() );
        var portLocation = port.getLocation();

        var offsetX = Math.abs( portLocation.getEvaluatedX() - nodeBoundBox.x );
        var offsetY = Math.abs( portLocation.getEvaluatedY() - nodeBoundBox.y );

        var percentX = offsetX / nodeBoundBox.width;
        var percentY = offsetY / nodeBoundBox.height;

        this.setPortAbsLocation( portLocation, offsetX, offsetY, percentX, percentY );
    }
};

/**
 * Convert port position to relative coordinators
 *
 * @param {Object} port port needs to convert the location
 */
export let convertAbsPortPosition2Rel = function( port ) {
    if( port ) {
        var nodeBoundBox = exports.getBounds( port.getOwner() );
        var portLocation = port.getLocation();

        var percentX = Math.abs( portLocation.getEvaluatedX() - nodeBoundBox.x ) / nodeBoundBox.width;
        var percentY = Math.abs( portLocation.getEvaluatedY() - nodeBoundBox.y ) / nodeBoundBox.height;

        this.setPortRelLocation( portLocation, percentX, percentY );
    }
};

export let isValidatePointForCreateEdgeOnGroupNode = function( graphControl, node, location, tolerance ) {
    var groupGraph = graphControl.groupGraph;
    var graph = graphControl.graph;
    var valid = true;
    if( !graph || !groupGraph ) {
        return valid;
    }
    if( !graph.isNetworkMode() && groupGraph.isGroup( node ) && groupGraph.isExpanded( node ) ) {
        // check if the click position is outside of group node
        // cancel edge creation if the edge end point is outside node boundary
        var nodeRect = new window.SDF.Utils.Rect( node.getAnchorPositionX(), node.getAnchorPositionY(),
            node.getWidthValue(), node.getHeightValue() );
        // check if the click position is inside of inflated group node box by tolerance
        nodeRect.inflate( -tolerance, -tolerance );
        if( nodeRect.isPointInside( location, graphConstants.Precision ) ) {
            valid = false;
        }
    }

    return valid;
};

var trimPathToNode = function( node, allPoints, isSourceNode ) {
    var testPnt1 = new window.SDF.Utils.Point( 0, 0 );
    var testPnt2 = new window.SDF.Utils.Point( 0, 0 );
    if( isSourceNode ) {
        testPnt1.x = allPoints[ 0 ].x;
        testPnt1.y = allPoints[ 0 ].y;
    } else {
        testPnt1.x = allPoints[ allPoints.length - 1 ].x;
        testPnt1.y = allPoints[ allPoints.length - 1 ].y;
    }
    var rect = node.getClipBoundary();
    if( allPoints.length > 2 && rect.isPointInside( testPnt1, graphConstants.Precision ) ) {
        while( allPoints.length > 2 ) {
            if( isSourceNode ) {
                testPnt1.x = allPoints[ 0 ].x;
                testPnt1.y = allPoints[ 0 ].y;
                testPnt2.x = allPoints[ 1 ].x;
                testPnt2.y = allPoints[ 1 ].y;
            } else {
                testPnt1.x = allPoints[ allPoints.length - 1 ].x;
                testPnt1.y = allPoints[ allPoints.length - 1 ].y;
                testPnt2.x = allPoints[ allPoints.length - 2 ].x;
                testPnt2.y = allPoints[ allPoints.length - 2 ].y;
            }
            if( rect.isPointInside( testPnt1, graphConstants.Precision ) && rect.isPointInside( testPnt2, graphConstants.Precision ) ) {
                if( isSourceNode ) {
                    allPoints.shift();
                } else {
                    allPoints.pop();
                }
            } else {
                var intersectPoint = rect.intersectWithSegment( testPnt1, testPnt2 );
                if( intersectPoint.length > 0 ) {
                    if( isSourceNode ) {
                        allPoints[ 0 ].x = intersectPoint[ 0 ].x;
                        allPoints[ 0 ].y = intersectPoint[ 0 ].y;
                    } else {
                        allPoints[ allPoints.length - 1 ].x = intersectPoint[ 0 ].x;
                        allPoints[ allPoints.length - 1 ].y = intersectPoint[ 0 ].y;
                    }
                    break;
                } else {
                    if( isSourceNode ) {
                        allPoints.shift();
                    } else {
                        allPoints.pop();
                    }
                }
            }
        }
    }
    return allPoints;
};

/**
 * trim edge path to nodes
 *
 * @param graphControl the edge
 * @param edge the edge
 * @return allPoints trimmed edge points
 */
export let trimPathToNodes = function( graphControl, edge ) {
    // remove the inside path segments
    var graph = graphControl.graph;
    var allPoints = graph.getEdgePosition( edge );
    if( graph.isNetworkMode() ) {
        var sourceNode = edge.getStart().getOwner();
        allPoints = trimPathToNode( sourceNode, allPoints, true );

        var targetNode = edge.getEnd().getOwner();
        allPoints = trimPathToNode( targetNode, allPoints, false );
        return allPoints;
    }
    return edge.trimPathToNodes( allPoints );
};

/**
 * is Port On Node Border
 *
 * @param graphControl the edge
 * @param port the edge
 * @param node the edge
 * @return boolean flag if is port on node border
 */
export let isPortOnNodeBorder = function( graphControl, port, node ) {
    var point = graphControl.graph.getPortPosition( port );
    return point.x === node.getAnchorPositionX() ||
        point.x === node.getAnchorPositionX() + node.getWidthValue() ||
        point.y === node.getAnchorPositionY() ||
        point.y === node.getAnchorPositionY() + node.getHeightValue();
};

export default exports = {
    convertToLayout,
    parseModifierKey,
    convert,
    checkCommandModifierKey,
    sheetToScreenCoordinate,
    sheetToViewCoordinate,
    viewToSheetCoordinate,
    sheetToPageCoordinate,
    viewToPageCoordinate,
    pageToViewCoordinate,
    getCommandElementByPoint,
    getEditableTextElement,
    getPointByLocation,
    groupItems,
    publishGraphEvent,
    getEdgeCreationEndPoint,
    getVisibleItems,
    getDFCommand,
    getBounds,
    setPortRelLocation,
    setPortAbsLocation,
    convertRelPortPosition2Abs,
    convertAbsPortPosition2Rel,
    isValidatePointForCreateEdgeOnGroupNode,
    trimPathToNodes,
    isPortOnNodeBorder
};

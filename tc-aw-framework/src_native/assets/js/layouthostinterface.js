// Copyright (c) 2019 Siemens

/* global
 define
 */

/**
 * ============================================================================
 * File description: LayoutHostInterface.js
 *
 * This class contain the methods to interface with different "host" applications. This file contains methods to access
 * information from host nodes, port, labels and connections. And then update node and port positions/sizes and
 * connection paths. It also contains methods to control display update.
 *
 * To interface with modules using this interface the host application must implement this class and then pass an
 * instance to this class to the modules using this class.
 *
 * For the Graphing Component this is done by passing the host interface object to the gcIncUpdate module. That module
 * will create a change state object that other modules access. Those modules will find the reference to the host
 * interface on the change state object.
 *
 * This file contains the interface for SPD Diagram Foundation and is used to test the various modules that are being
 * delivered to GC outside of the DF component. The interface in this file is specifically for the test host application
 * DF_Test.
 *
 * =============================================================================
 */

// Global variables not defined within this file - required for JSHint
/* globals DiagramFoundation: false */

/**
 * This module provides host interface for layout
 *
 * @module js/layouthostinterface
 */
import _ from 'lodash';
import logger from 'js/logger';
import graphConstants from 'js/graphConstants';

'use strict';

/**
 * Define public API
 */
var exports = {};

var SDFPoint;
var SDFLayout;

var _HEADER_HEIGHT = 'HEADER_HEIGHT';

// the default layout configurations
var _DEFAULT_LAYOUT_CONFIG = {
    nodeToNodeDistance: {
        x: 50,
        y: 50
    },
    edgeToEdgeDistance: {
        x: 25,
        y: 25
    },
    portSize: {
        width: 24,
        height: 24
    },
    minNodeSize: {
        width: 300,
        height: 125
    },
    minSegmentLength: 0,
    enableRSOP: true,
    autoClearNodeArea: true,
    enableCompactLayout: true,
    makeRoomInRSOPDisable: false,
    snakeWrapType: 'LENGTH', // supported value: LENGTH, RATIO
    snakeWrapLength: 500,
    snakeWrapRatio: 1.0,
    snakeWrapMirror: true
};

/**
 * Constructor function to create host interface object
 * <P>
 * For the constructor the host can define whatever signature is required since the host instantiates this object.
 * All other signature must conform to the examples found here.
 *
 * @param {Object} diagramView - The DF diagram view used to display the graph.
 * @param {Object} config - The object contains layout configurations
 */
var LayoutHostInterface = function( diagramView, config ) {
    this.hostDiagramView = diagramView;
    this.session = diagramView.getSession();

    // set layout configurations
    var layoutConfig = _.clone( _DEFAULT_LAYOUT_CONFIG );
    var myConfig = _.clone( config );
    if( myConfig ) {
        _.forEach( _.keys( layoutConfig ), function( key ) {
            if( _.has( myConfig, key ) ) {
                layoutConfig[ key ] = myConfig[ key ];
            }
        } );

        // normalize the node-to-node distance to the multiplies of edge-to-edge distance
        var nodeDist = layoutConfig.nodeToNodeDistance;
        var edgeDist = layoutConfig.edgeToEdgeDistance;
        layoutConfig.nodeToNodeDistance.x = Math.ceil( nodeDist.x / edgeDist.x ) * edgeDist.x;
        layoutConfig.nodeToNodeDistance.y = Math.ceil( nodeDist.y / edgeDist.y ) * edgeDist.y;
        layoutConfig.minSegmentLength = Math.ceil( layoutConfig.minSegmentLength / edgeDist.x ) * edgeDist.x;
    }

    this.layoutConfig = layoutConfig;

    // Configure to let Incremental Update handle group node size
    var sheetConfig = diagramView.getSheetConfigurationData();
    sheetConfig.nestedNodeCollapsedHeight = 0;
    sheetConfig.nestedNodeCollapsedWidth = 0;

    layoutConfig.autoRotatePortIcon = sheetConfig.autoRotatePortIcon;

    SDFPoint = window.SDF.Utils.Point;
    SDFLayout = window.SDF.Layout;
};

var getNodeHeaderHeight = function( hostNode ) {
    var headerHeight = 0.0;
    if( hostNode ) {
        var appObject = hostNode.getAppObj();
        if( appObject && appObject[ _HEADER_HEIGHT ] ) {
            headerHeight = appObject[ _HEADER_HEIGHT ];
        }
    }
    return headerHeight;
};

var setPortSymbolRotation = function( port, direction ) {
    var portSymbolOcc = port.getSymbols();
    if( portSymbolOcc && portSymbolOcc.length > 0 ) {
        _.forEach( portSymbolOcc, function( symbolOcc ) {
            symbolOcc.setRotation( direction );
        } );
    }
};

var setPortRotation = function( port, direction ) {
    if( port.autoRotate === undefined || port.autoRotate ) {
        var autoRotateMap = _.assign( _.clone( graphConstants.portRotateMap ), port.customRotateMap );
        if( direction === 'Left' ) {
            setPortSymbolRotation( port, autoRotateMap.Left );
        } else if( direction === 'Top' ) {
            setPortSymbolRotation( port, autoRotateMap.Top );
        } else if( direction === 'Right' ) {
            setPortSymbolRotation( port, autoRotateMap.Right );
        } else if( direction === 'Bottom' ) {
            setPortSymbolRotation( port, autoRotateMap.Bottom );
        }
    }
};
/**
 * GET NODE TO NODE DIST
 *
 * @returns Return node to node distance limits in the X and Y directions.
 */
LayoutHostInterface.prototype.getNodeToNodeDist = function() {
    return this.layoutConfig.nodeToNodeDistance;
};

/**
 * GET EDGE TO EDGE DIST
 *
 * @returns {Object} the edge to edge distance limit limits in the X and Y directions.
 */
LayoutHostInterface.prototype.getEdgeToEdgeDist = function() {
    return this.layoutConfig.edgeToEdgeDistance;
};

/**
 * GET MIN NODE SIZE
 *
 * @returns {Object} Return the minimum size allowed for nodes.<br>
 */
LayoutHostInterface.prototype.getMinNodeSize = function( hostNode ) {
    if( hostNode === null ) {
        return {
            w: 0,
            h: 0
        };
    }

    var defaultSize = this.layoutConfig.minNodeSize;
    var minNodeSize = {
        w: defaultSize.width,
        h: defaultSize.height
    };
    var minSize = hostNode.getMinNodeSize();
    if( minSize ) {
        minNodeSize.w = minSize[ 0 ];
        minNodeSize.h = minSize[ 1 ];
    }

    return minNodeSize;
};

/**
 * GET LAYOUT TYPE
 *
 * @returns {Object} The layout type.
 */
LayoutHostInterface.prototype.getLayoutType = function() {
    var type = SDFLayout.LayoutType.Hierarchical;
    if( SDFLayout.LayoutType.hasOwnProperty( this.layoutType ) ) {
        type = SDFLayout.LayoutType[ this.layoutType ];
    }

    return type;
};

/**
 * GET LAYOUT DIRECTION
 *
 * @returns {Object} The layout direction.
 */
LayoutHostInterface.prototype.getLayoutDirection = function() {
    var dir = SDFLayout.LayoutDirection.TopToBottom;
    if( SDFLayout.LayoutDirection.hasOwnProperty( this.layoutDirection ) ) {
        dir = SDFLayout.LayoutDirection[ this.layoutDirection ];
    }

    return dir;
};

/**
 * GET ROUTING TYPE
 *
 * @returns {Object} The Routing type.
 */
LayoutHostInterface.prototype.getRoutingType = function() {
    return SDFLayout.RoutingType.Default;
};

/**
 * GET INC UPDATE PATH TYPE
 *
 * @returns {String} a string indicating the type of path GcIncUpdate should generate.<br>
 *         "hv" - horizontal and vertical paths attached to ports that are snapped to glue points.<br>
 *         "line" - straight line paths to the center of the connected nodes and trimmed to the node border (ports
 *         are relocated to path end points)
 */
LayoutHostInterface.prototype.getIncUpdatePathType = function() {
    if( this.layoutType === 'Balloon' || this.layoutType === 'Organic' ) {
        return 'line';
    }
    return 'hv';
};

/**
 * GET ENABLE GLOBAL LAYOUT
 *
 * @returns {Boolean} A flag controlling the layout algorithm should use BottomToUp Layout or Global Layout.<br>
 *         true - use Global layout.<br>
 *         false - use BottomToUp layout. Default is false.
 */
LayoutHostInterface.prototype.getEnableGlobalLayout = function() {
    return true;
};

/**
 * GET MINIMUM PORT EXTENSION DIST
 *
 * @returns {Number} The minimum length of a port extension
 */
LayoutHostInterface.prototype.getMinPortExtensionDist = function() {
    return 20;
};

/**
 * GET MINIMUM SEGMENT DIST
 *
 * @returns {Number} The minimum length of a segment
 */
LayoutHostInterface.prototype.getMinSegmentDist = function() {
    return 20;
};

/**
 * GET GROUP AUTO SHRINK FLAG
 *
 * @returns {Boolean} A flag controlling whether group shrink automatically in global layout. Incremental update will
 *         not reference this API and it has its own option setGroupPaddingFit() to control. true - group will
 *         shrink automatically. false - group will not shrink.
 */
LayoutHostInterface.prototype.getGroupAutoShrink = function() {
    return true;
};

/**
 * GET HOST MANAGES GROUP NODE SIZES
 *
 * @returns {Boolean} Return option flag for host to manage group node sizes<br>
 *         true - Incremental Update will query host group node size to set initial group node size after any
 *         expand/collapse operation. Incremental update will expand the group node size if room is needed for
 *         ports.<br>
 *         false - Incremental update will remember the expanded and collapsed states of group nodes and will use
 *         those stored values for expand/collapse operations
 */
LayoutHostInterface.prototype.getHostManagesGroupNodeSizes = function() {
    return true;
};

/**
 * GET WRAP MIRROR FLAG
 *
 * @returns {Boolean} Return a flag to control whether the edge direction should be mirrored when wrapping the graph
 *         in snake layout.<br>
 *         This is only used for snake layout
 */
LayoutHostInterface.prototype.getWrapMirror = function() {
    return this.layoutConfig.snakeWrapMirror;
};

/**
 * GET WRAP FIXED LENGTH FLAG
 * <P>
 * This is only used for snake layout
 *
 * @returns {Boolean } Return a flag to control whether a length or a ratio is used to wrap graph in snake layout.<br>
 *         true: a length is used to wrap the graph in snake layout<br>
 *         false: a ratio is used to maintain the graph area in snake layout
 */
LayoutHostInterface.prototype.getWrapFixedLength = function() {
    return _.toUpper( this.layoutConfig.snakeWrapType ) === 'LENGTH';
};

/**
 * GET WRAP LENGTH
 * <P>
 * This is only used for snake layout
 *
 * @returns {Number} Return the length value. The snake layout will wrap the graph if the graph area size exceeds the
 *         length value in layout.
 */
LayoutHostInterface.prototype.getWrapLength = function() {
    return this.layoutConfig.snakeWrapLength;
};

/**
 * GET WRAP RATIO
 * <P>
 * This is only used for snake layout
 *
 * @returns {Number} Return a ratio value. The snake layout will try to maintain the graph area size according to the
 *         ratio in layout.
 */
LayoutHostInterface.prototype.getWrapRatio = function() {
    return this.layoutConfig.snakeWrapRatio;
};

/**
 * For the given host node return a structure of the form { x, y, w, h } where<br>
 * x,y - upper left hand corner position for the given node<br>
 * w - width of the node<br>
 * h - height of the node
 *
 * @param {Object} hostNode - A reference to whatever object the host uses to represent a node.
 */
LayoutHostInterface.prototype.getNodeRect = function( hostNode ) {
    var pos = hostNode.getRenderingPosition();
    var w = hostNode.getWidthValue();
    var h = hostNode.getHeightValue();

    return {
        x: pos.x,
        y: pos.y,
        w: w,
        h: h
    };
};

/**
 * Set a given host node's size and position.
 *
 * @param {Object} hostNode - A reference to whatever object the host uses to represent a node.
 * @param {Number} x - X coordinate for the upper left hand corner of the node.
 * @param {Number} y - Y coordinate for the upper left hand corner of the node.
 * @param {Number} width - Node width.
 * @param {Number} height - Node height.
 */
LayoutHostInterface.prototype.setNodeRect = function( hostNode, x, y, width, height ) {
    if( !hostNode || !( hostNode instanceof window.SDF.Models.Node ) ) {
        return;
    }

    var oldBBox = hostNode.getBBox();
    if( !oldBBox || oldBBox.x !== x || oldBBox.y !== y || oldBBox.width !== width || oldBBox.height !== height ) {
        hostNode.modifyBoundingBox( x, y, width, height );
    }

    // If the group is collapsed
    if( this.isGroupNode( hostNode ) && ( !this.isExpanded( hostNode ) || !this.isNestedView() ) ) {
        var appObject = hostNode.getAppObj();
        var svgObject = hostNode.getSVG();
        if( appObject ) {
            appObject[ _HEADER_HEIGHT ] = height;
            if( svgObject ) {
                svgObject.bindNewValues( _HEADER_HEIGHT );
            }
        }
    }
};

/**
 * GET STANDARD PORT SIZE
 *
 * @returns {Object} the standard size for all ports. Return a structure of the form { w, h }<br>
 *         w - standard port width<br>
 *         h - standard port height
 */
LayoutHostInterface.prototype.getStandardPortSize = function() {
    var portSize = this.layoutConfig.portSize;
    return {
        w: portSize.width,
        h: portSize.height
    };
};

/**
 * GET PORT RECT
 * <P>
 * For the given host port return a structure of the form { x, y, w, h } where<br>
 * x,y - upper left hand corner position for the given port<br>
 * w - width of the port<br>
 * h - height of the port
 *
 * @param {Object} hostPort - host port reference">A reference to whatever object the host uses to represent a port.
 */
LayoutHostInterface.prototype.getPortRect = function( hostPort ) {
    var pos = hostPort.getRenderingPosition();
    var x = pos.x;
    var y = pos.y;
    var w = hostPort.getWidthValue();
    var h = hostPort.getHeightValue();
    if( w === 0 && h === 0 ) {
        var defaultPortSize = this.layoutConfig.portSize;
        w = defaultPortSize.width;
        h = defaultPortSize.height;

        // (x,y) is port top-left corner
        x -= w / 2.0;
        y -= h / 2.0;
    }

    return {
        x: x,
        y: y,
        w: w,
        h: h
    };
};

/**
 * Set a given host node's size and position.
 *
 * @param {Object} hostPort - host port reference">A reference to whatever object the host uses to represent a port.
 * @param {Number} x - X coordinate for the upper left hand corner of the port.
 * @param {Number} y - Y coordinate for the upper left hand corner of the port.
 * @param {Number} width - Port width.
 * @param {Number} height - Port height.
 */
LayoutHostInterface.prototype.setPortRect = function( hostPort, x, y, width, height ) {
    // Note: the zero size port is considered with standard port size from hostInterface. Here for zero size port,
    // we need convert the input port top-left corner (x,y) to port center.
    if( hostPort.getWidthValue() === 0 ) {
        x += width / 2.0;
        y += height / 2.0;
        // Port real size is zero
        width = 0;
        height = 0;
    }

    var oldBBox = hostPort.getBBox();
    if( !oldBBox || oldBBox.x !== x || oldBBox.y !== y || oldBBox.width !== width || oldBBox.height !== height ) {
        var loc = hostPort.getLocation();
        if( loc ) {
            var node = hostPort.getOwner();
            // check the valid owner
            if( !( node instanceof window.SDF.Models.Node ) ) {
                return;
            }

            var nodeBox = node.getBBox();
            var nodeX = nodeBox.x;
            var nodeY = nodeBox.y;
            var nodeW = nodeBox.width;
            var nodeH = nodeBox.height;

            var xDiff = Math.abs( x - nodeX );
            var yDiff = Math.abs( y - nodeY );

            var relX;
            var relY;

            var left = xDiff;
            var right = nodeW - left;
            var top = yDiff;
            var bottom = nodeH - top;

            var point = hostPort.translateRenderingToAnchorPosition( this.makePoint( x, y ) );
            if(
                point.x > nodeBox.x &&
                point.x < nodeBox.x + nodeBox.width &&
                point.y > nodeBox.y &&
                point.y < nodeBox.y + nodeBox.height ) {
                // port is in inside the node(Set percent value as 0 and use offset value to locate the port)
                relX = 0.0;
                relY = 0.0;
            } else if( left < Math.min( right, top, bottom ) ) {
                // port is on the left side
                relY = 0.0;
                relX = 0.0;
                hostPort.setConnectionDirection( [ -1, 0 ] );
                if( this.layoutConfig.autoRotatePortIcon && hostPort.hasSymbol() ) {
                    setPortRotation( hostPort, 'Left' );
                }
            } else if( right < Math.min( top, bottom ) ) {
                // port is on the right side
                relY = 0.0;
                relX = 1.0;
                hostPort.setConnectionDirection( [ 1, 0 ] );
                if( this.layoutConfig.autoRotatePortIcon && hostPort.hasSymbol() ) {
                    setPortRotation( hostPort, 'Right' );
                }
            } else if( top < bottom ) {
                // port is on the top side
                relX = 0.0;
                relY = 0.0;
                hostPort.setConnectionDirection( [ 0, -1 ] );
                if( this.layoutConfig.autoRotatePortIcon && hostPort.hasSymbol() ) {
                    setPortRotation( hostPort, 'Top' );
                }
            } else {
                // port is on the bottom side
                relX = 0.0;
                relY = 1.0;
                hostPort.setConnectionDirection( [ 0, 1 ] );
                if( this.layoutConfig.autoRotatePortIcon && hostPort.hasSymbol() ) {
                    setPortRotation( hostPort, 'Bottom' );
                }
            }

            loc.setInputPercentX( relX );
            loc.setInputPercentY( relY );
        }
        hostPort.setRenderingPosition( x, y );
        hostPort.setWidthValue( width );
        hostPort.setHeightValue( height );
    }
};

/**
 * GET PARENT NODE
 *
 * @param {Object} hostNode - A reference to whatever object the host uses to represent a node.
 * @returns {Object|Null} the parent host node for the given host node. <br>
 *         If the given host node is not a child of a group node (meaning the give node is at the root level of the
 *         nested hierarchy of nodes) then null is return.
 */
LayoutHostInterface.prototype.getParentNode = function( hostNode ) {
    var parentObject = hostNode.getOwner();

    // In DF all top nodes belong to the sheet object
    if( this.hostDiagramView.getManager().getSheet() === parentObject ) {
        return null;
    }

    return parentObject;
};

/**
 * GET NODE PRIORITY
 *
 * @param {Object} hostNode - A reference to whatever object the host uses to represent a node
 * @returns {Integer} Return a positive integer value for the priority of the given node. Where 1 is the highest priority.
 */
LayoutHostInterface.prototype.getNodePriority = function( hostNode ) {
    if( !hostNode ) {
        return 0;
    }

    var tag = hostNode.getAppObj();
    var nodePriority = tag.priority;

    if( !nodePriority ) {
        return 0;
    }

    var priorityValue = nodePriority.valueOf() * 2;

    if( hostNode.isGroupingAllowed() ) {
        priorityValue--;
    }

    return priorityValue;
};

/**
 * IS EXPANDED
 *
 * @param {Object} hostNode - A reference to whatever object the host uses to represent a node.
 * @returns {Boolean} is expanded?
 */
LayoutHostInterface.prototype.isExpanded = function( hostNode ) {
    // / <summary>
    // / Return true for all group nodes that are expanded.
    // / Return false for all other cases (group node that is not expanded - or a normal node).
    // / </summary>

    // Note DF isExpanded() may return true for non-group nodes
    if( hostNode.isGroupingAllowed() === false ) {
        return false;
    }
    return hostNode.isExpanded();
};

/**
 * IS GROUP NODE
 *
 * @param {Object} hostNode - host node
 * @returns {Boolean} true if the node is group node
 */
LayoutHostInterface.prototype.isGroupNode = function( hostNode ) {
    return hostNode.isGroupingAllowed();
};

/**
 * GET the padding required for a specific given group node.
 *
 * @param {Object} hostNode - the group host node
 * @returnss {Object} Return the padding required for a specific given group node.
 */
LayoutHostInterface.prototype.getGroupNodePadding = function( hostNode ) {
    // / <summary>
    // / Return the paddin required for a specfic given group node.
    // / Return a structure of the form: { top, bottom, left, right }
    // / Where each value defines the distance from the respective side of the group node to any child nodes.
    // / Note that padding values should be multiples of the edge to edge distance property and should
    // / be at least 2 X edge-to-edge distance. This is required to leave room for at least one path
    // / within the padding area.
    // / </summary>
    // / <param name="hostNode" type="host node reference">The group node to return padding.</param>

    // GC will need to query the given group node for padding values.
    var edgeDist = this.layoutConfig.edgeToEdgeDistance;
    var defaultPortSize = this.layoutConfig.portSize;
    var maxEdgeDist = Math.max( edgeDist.x, edgeDist.y );
    var maxPortSize = Math.max( defaultPortSize.width, defaultPortSize.height );

    var pad = 2 * ( maxEdgeDist + Math.round( maxPortSize / 2 / maxEdgeDist ) * maxEdgeDist );

    var headerHeight = getNodeHeaderHeight( hostNode );

    if( headerHeight <= 0.0 ) {
        headerHeight = this.layoutConfig.minNodeSize.height;
    }

    var topPad = headerHeight + pad;
    var leftPad = pad;
    var rightPad = pad;
    var bottomPad = pad;

    if( !hostNode ) {
        return {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
        };
    }

    return {
        top: topPad,
        bottom: bottomPad,
        left: leftPad,
        right: rightPad
    };
};

/**
 * GET GROUP NODE KEEP OUT AREA
 *
 * @param {Object} hostNode - host node
 * @param {Object} newNodeSize - new node size
 */
LayoutHostInterface.prototype.getGroupNodeKeepOutArea = function( hostNode, newNodeSize ) {
    // / <summary>
    // / Return a relative area in the group node title bar that paths are not allowed to cross.
    // / Return a structure of the form: { x, y, w, h } where
    // / x,y - are offsets from the upper left hand corner of the node
    // /       for the upper left hand corner of the keep out area
    // / w   - width of the keep out area
    // / h   - height of the keep out area
    // / Return null if there is no header keep out area for the given node.
    // / </summary>
    // / <param name="hostNode" type="host node reference">The group node to return padding.</param>
    // / <param name="newNodeSize" type="Structure">The size the host node will be updated to after update.
    // /  Structure of the form {w,h} where
    // /  w = new width of the host node
    // /  h = new height of the host node.</param>

    // var nodeWidth = hostNode.getWidthValue();

    // Remember to leave enough room for at least one path at the bottom of the top padding area
    // Area left open must be at least 2 X edge-to-edge distance
    var x = 0; // For now the keep out area is assumed start at the top left corner of the node
    var y = 0; // So x,y are assumed to be set to zero.
    // var w = Math.min((5*20), nodeWidth); //This should consume 5 glue points on the top
    // var h = (2*20); //This should consume 2 glue points on the left side

    var w = newNodeSize.w;
    var keepHeight = getNodeHeaderHeight( hostNode );

    if( keepHeight <= 0.0 ) {
        keepHeight = this.layoutConfig.minNodeSize.height;
    }
    var h = Math.min( keepHeight, newNodeSize.h );

    return {
        x: x,
        y: y,
        w: w,
        h: h
    };
};

/**
 * GET SOURCE PORT
 *
 * @param {Object} hostConnection - host connection
 */
LayoutHostInterface.prototype.getSourcePort = function( hostConnection ) {
    // / <summary>
    // / For a given host connection return the source port (port that is on the starting side of the connection).
    // / Return null for dangling source side connections (a connection not attached to anything on the source side).
    // / </summary>
    // / <param name="hostConnection" type="host connection reference">A reference to whatever object the host uses to represent a connection/edge.</param>

    var sourcePort = hostConnection.getStart();
    if( sourcePort === undefined ) {
        return null;
    } // DF can have dangling connections

    return sourcePort;
};

/**
 * GET TARGET PORT
 *
 * @param {Object} hostConnection - host connection
 */
LayoutHostInterface.prototype.getTargetPort = function( hostConnection ) {
    // / <summary>
    // / For a given host connection return the target port (port that is on the ending side of the connection).
    // / Return null for dangling target side connections (a connection not attached to anything on the target side).
    // / </summary>
    // / <param name="hostConnection" type="host connection reference">A reference to whatever object the host uses to represent a connection/edge.</param>

    var targetPort = hostConnection.getEnd();
    if( targetPort === undefined ) {
        return null;
    } // DF can have dangling connections

    return targetPort;
};

/**
 * GET NODE OF PORT
 *
 * @param {Object} hostPort - host port
 */
LayoutHostInterface.prototype.getNodeOfPort = function( hostPort ) {
    // / <summary>
    // / Return the host node that owns the given host port.
    // / If the port does not belong to a node then null is returned.
    // / </summary>
    // / <param name="hostPort" type="host port reference">A reference to whatever object the host uses to represent a port.</param>

    if( hostPort === null ) {
        return null;
    }

    var hostNode = hostPort.getOwner();
    if( hostNode === undefined ) {
        return null;
    } // DF can have dangling connections

    return hostNode;
};

/**
 * GET ALL PORTS FOR NODE
 *
 * @param {Object} hostNode - host node
 */
LayoutHostInterface.prototype.getAllPortsForNode = function( hostNode ) {
    // / <summary>
    // / Return an array of host port references for all ports owned by the given host node.
    // / If no ports belong to the node then an empty array is returned.
    // / </summary>
    // / <param name="hostNode" type="host node reference">A reference to whatever object the host uses to represent a node.</param>

    var portArray = [];

    var ports = hostNode.getPorts();
    for( var i = 0, length = ports.length; i < length; i++ ) {
        var thePort = ports[ i ];
        // filter out proxy port
        if( !thePort.isProxy() && ( thePort.isVisible() || thePort.getConnectionNum() > 0 || !thePort.isVisible() && thePort.getProxy() ) ) {
            portArray.push( thePort );
        }
    }

    return portArray;
};

/**
 * GET ALL CONNECTIONS FOR PORT
 *
 * @param {Object} hostPort - host port
 */
LayoutHostInterface.prototype.getAllConnectionsForPort = function( hostPort ) {
    // / <summary>
    // / Return an array of host connection references for all connections attached to the given host port.
    // / If no connection belong to the port then an empty array is returned.
    // / </summary>
    // / <param name="hostPort" type="host port reference">A reference to whatever object the host uses to represent a port.</param>

    return hostPort.getConnections();
};

/**
 * GET SOURCE NODE
 *
 * @param {Object} hostConnection - host connection
 */
LayoutHostInterface.prototype.getSourceNode = function( hostConnection ) {
    // / <summary>
    // / For a given host connection return the source node (node that is on the starting side of the connection).
    // / Return null for dangling source side connections (a connection not attached to anything on the source side).
    // / </summary>
    // / <param name="hostConnection" type="host connection reference">A reference to whatever object the host uses to represent a connection/edge.</param>

    var sourcePort = hostConnection.getStart();
    if( sourcePort === undefined ) {
        return null;
    } // DF can have dangling connections

    var sourceNode = sourcePort.getOwner();
    if( sourceNode === undefined ) {
        return null;
    } // DF can have dangling connections

    return sourceNode;
};

/**
 * GET TARGET NODE
 *
 * @param {Object} hostConnection - host connection
 */
LayoutHostInterface.prototype.getTargetNode = function( hostConnection ) {
    // / <summary>
    // / For a given host connection return the target node (node that is on the ending side of the connection).
    // / Return null for dangling target side connections (a connection not attached to anything on the target side).
    // / </summary>
    // / <param name="hostConnection" type="host connection reference">A reference to whatever object the host uses to represent a connection/edge.</param>

    var targetPort = hostConnection.getEnd();
    if( targetPort === undefined ) {
        return null;
    } // DF can have dangling connections

    var targetNode = targetPort.getOwner();
    if( targetNode === undefined ) {
        return null;
    } // DF can have dangling connections

    return targetNode;
};

/**
 * GET PATH
 *
 * @param {Object} hostConnection - host connection
 */
LayoutHostInterface.prototype.getPath = function( hostConnection ) {
    // / <summary>
    // / Return an array of host point objects for the path defined for the given host connection.  If there
    // / is not path defined for the connection then return null.
    // / Note that it is assumed the host point object has "x" and "y" properties.
    // / </summary>
    // / <param name="hostConnection" type="host connection reference">A reference to whatever object the host uses to represent a connection/edge.</param>

    var geometry = hostConnection.getGeometry();
    if( !geometry ) {
        return null;
    }

    return geometry.getPoints();
};

/**
 * SET PATH
 *
 * @param {Object} hostConnection - host connection
 */
LayoutHostInterface.prototype.setPath = function( hostConnection, path ) {
    // / <summary>
    // / Set the path for a given connection.
    // / </summary>
    // / <param name="hostConnection" type="host connection reference">A reference to whatever object the host uses to represent a connection/edge.</param>
    // / <param name="path" type="Array">Array of host points object created with makeHostPoint.</param>

    // Note that in yFiles we may need to filter out null paths
    // In DF if we do not set paths to null then the old path continue to display
    // if (path === null) return;

    var oldPath = null;
    var geom = hostConnection.getGeometry();
    if( geom ) {
        oldPath = geom.getPoints();
    }
    if( !oldPath && !path ) {
        // If both old path and new path are null, just do nothing
        return;
    }

    if( !oldPath || !path ) {
        // If one of old path and new path is null, just update path
        hostConnection.setPath( path );
        return;
    }

    // Both old path and new path are defined, compare the array
    var oldPathLen = oldPath.length;
    var newPathLen = path.length;
    if( oldPathLen !== newPathLen ) {
        hostConnection.setPath( path );
        return;
    }

    for( var i = 0; i < newPathLen; i++ ) {
        if( !path[ i ].equal( oldPath[ i ] ) ) {
            hostConnection.setPath( path );
            return;
        }
    }
};

/**
 * SET GLUE POINTS
 *
 * @param {Object} hostNode - host node
 * @param {Object} gluePointLists - glue point lists
 */
LayoutHostInterface.prototype.setGluePoints = function( hostNode, gluePointLists ) {
    // / <summary>
    // / Provides a list of allocated glue points to the host.  It is assumed that the host node
    // / position and size has already been updated to agree with the given list of glue points.
    // / </summary>
    // / <param name="hostNode" type="host node reference">A reference to whatever object the host uses to represent a node.</param>
    // / <param name="gluePointLists" type="Structure">Structure of the form { top, bottom, left, right } where each items defines
    // / a sparse array of allocated glue point structures.</param>

    // reset glue points on this node
    var tag = hostNode.getAppObj();

    tag.gluePoints = [];

    // Compute maximum allowed glue points on this node
    var rect = this.getNodeRect( hostNode );
    var w = rect.w;
    var h = rect.h;
    var edgeDist = this.layoutConfig.edgeToEdgeDistance;
    var maxHInx = Math.round( w / edgeDist.x ) - 1;
    var maxVInx = Math.round( h / edgeDist.y ) - 1;

    var nodeSide = null;
    var gpList = null;
    var nGPs;

    var sides = [ 'top', 'bottom', 'left', 'right' ];
    var nSides = sides.length;

    // Build a single list of glue points for all sides
    for( var sideInx = 0; sideInx < nSides; ++sideInx ) {
        nodeSide = sides[ sideInx ];
        if( gluePointLists ) {
            gpList = gluePointLists[ nodeSide ];
        }
        nGPs = maxHInx;

        var gpLocation;
        var gpInx;
        if( sideInx > 1 ) {
            // calculate glue points on vertical borders
            nGPs = maxVInx;

            for( gpInx = 1; gpInx <= nGPs; ++gpInx ) {
                // ignore the allocated glue points
                if( gpList !== null && gpList[ gpInx ] ) {
                    continue;
                }

                var y = rect.y + edgeDist.y * gpInx;
                gpLocation = new SDFPoint( sideInx === 3 ? rect.x + rect.w : rect.x, y );
                tag.gluePoints.push( gpLocation );
            }
        } else {
            // calculate glue points on horizontal borders
            for( gpInx = 1; gpInx <= nGPs; ++gpInx ) {
                // ignore the allocated glue points
                if( gpList !== null && gpList[ gpInx ] ) {
                    continue;
                }

                var x = rect.x + edgeDist.x * gpInx;
                gpLocation = new SDFPoint( x, sideInx === 1 ? rect.y + rect.h : rect.y );
                tag.gluePoints.push( gpLocation );
            }
        }
    }
};

/**
 * GET PORT LABEL
 *
 * @param {Object} hostPort - host port
 */
LayoutHostInterface.prototype.getPortLabel = function( hostPort ) {
    // / <summary>
    // / Return a reference to the host label object attached to the given host port.
    // / If the port does not have a label return null.
    // / </summary>
    // / <param name="hostPort" type="host port reference">A reference to whatever object the host uses to represent a port.</param>

    // currently label will not be considered in IncUpdate, so for port label , we directly return null;
    return null;
};

/**
 * GET CONNECTIOIN LABEL
 *
 * @param {Object} hostConnection - host connection
 */
LayoutHostInterface.prototype.getConnectionLabel = function( hostConnection ) {
    // / <summary>
    // / Return a reference to the host label object attached to the given host connection/edge.
    // / If the connection does not have a label return null.
    // / </summary>
    // / <param name="hostConnection" type="host connection reference">A reference to whatever object the host uses to represent a connection/edge.</param>

    // currently label will not be considered in IncUpdate, so for connection label , we directly return null;
    return null;
};

/**
 * GET LABEL RECT
 *
 * @param {Object} hostLabel - host label
 */
LayoutHostInterface.prototype.getLabelRect = function( hostLabel ) {
    // / <summary>
    // / For the given host label return a structure of the form { x, y, w, h } where
    // / x,y - upper left hand corner position for the given label
    // / w   - width of the label
    // / h   - height of the label
    // / </summary>
    // / <param name="hostLabel" type="host label reference">A reference to whatever object the host uses to represent a port or connection label.</param>

    // Label no longer participate layout, do nothing with label for layout
    return null;
};

/**
 * SET LABEL RECT
 *
 * @param {Object} hostLabel - host label
 * @param {Number} x - x
 * @param {Number} y - y
 * @param {Number} width - width
 * @param {Number} height - height
 */
LayoutHostInterface.prototype.setLabelRect = function( hostLabel, x, y, width, height ) {
    // / <summary>
    // / Set a given host label's size and position.
    // / </summary>
    // / <param name="hostLabel" type="host label reference">A reference to whatever object the host uses to represent a port or connection label.</param>
    // / <param name="x" type="Number">X coordinate for the upper left hand corner of the port.</param>
    // / <param name="y" type="Number">Y coordinate for the upper left hand corner of the port.</param>
    // / <param name="width" type="Number">Port width.</param>
    // / <param name="height" type="Number">Port height.</param>

    // Label no longer participate layout, do nothing with label for layout
};

/**
 * STOP DISPLAY UPDATE
 */
LayoutHostInterface.prototype.stopDisplayUpdate = function() {
    // / <summary>
    // / Command to the host to stop updating the display. This is used when multiple objects are being updated
    // / and the display should not change until all object updates are complete (see updateDisplay).
    // / </summary>

    this.hostDiagramView.beginTransaction();
};

/**
 * UPDATE DISPLAY
 */
LayoutHostInterface.prototype.updateDisplay = function() {
    // / <summary>
    // / Command to the host to update the display and to continue normal display update.
    // / This is used after calling stopDisplayUpdate when all object updates are complete.
    // / </summary>

    this.hostDiagramView.endTransaction();
};

/**
 * MAKE POINT
 *
 * @param {Number} x - x
 * @param {Number} y - y
 */
LayoutHostInterface.prototype.makePoint = function( x, y ) {
    // / <summary>
    // / Creates and return a new point object for the given (x,y) coordinates.
    // / </summary>
    // / <param name="x" type="Number">X coordinate for new point.</param>
    // / <param name="y" type="Number">Y coordinate for new point.</param>

    return new SDFPoint( x, y );
};

/**
 * Report the given error message to the host application.
 *
 * @param {String} errorMessage - error message
 */
LayoutHostInterface.prototype.reportError = function( errorMessage ) {
    logger.error( errorMessage );
};

/**
 * Return option to disable make room or not.
 * @returnss true - RSOP (Remove Segment Overlaps Process) will not make room, and just distribute overlaps in current available space.
            false - RSOP will first make room, then distribute overlaps in available space.
 */
LayoutHostInterface.prototype.isMakeRoomInRSOPDisabled = function() {
    return this.layoutConfig.makeRoomInRSOPDisable;
};

/**
 * Return option to automatically clear node area or honor layout direction.
 * @returnss true - Automatically clear node area
            false - Clear node area by honoring layout direction
 */
LayoutHostInterface.prototype.isAutoClearNodeArea = function() {
    return this.layoutConfig.autoClearNodeArea;
};

/**
 * Decide whether a port is floating or not. If the port's size is zero, it'll be taken as floating port.
 * @param {Port} hostPort the graph port
 * @returnss true:floating port
            false:fixed port
 */
LayoutHostInterface.prototype.isPortFloating = function( hostPort ) {
    var portSize = hostPort.getSize();
    return ( portSize[ 0 ] <= 0 || portSize[ 1 ] <= 0 ) && !hostPort.isPinned();
};

/**
 * Return option to enable whole RSOP or not.
 * @returnss true - RSOP (Remove Segment Overlaps Process)will be enabled.
            false - RSOP will be disabled.
 */
LayoutHostInterface.prototype.isRSOPEnabled = function() {
    return this.layoutConfig.enableRSOP;
};

/**
 * Return determining point when processing the node overlap in sorted layout.
 */
LayoutHostInterface.prototype.getSortedLayoutNodeOverlapDeterminingPoint = function() {
    return { x: 0.5, y: 0.5 };
};

LayoutHostInterface.prototype.enableCompactLayout = function() {
    // / <summary>
    // /  A flag to control if the layout of the graph should be compacted.
    // /  Compact Layout is where the Layout will initially only consider the distances between Nodes.
    // /  Connections running between the nodes and the amount of room between two parallel Connection segments will not be considered (Connections will overlap).
    // /  Note: The RSOP process may increase in time if there are a large amount of Connections overlapped during the initial Compact Layout process
    // /  True: Enable compact layout generation.
    // /  False: Disable compact layout generation.
    // / </summary>
    return this.layoutConfig.enableCompactLayout;
};

LayoutHostInterface.prototype.getMinSegmentLength = function() {
    // / <summary>
    // / Return min segment length.
    // / </summary>
    var minSegmentLength = {
        x: this.layoutConfig.minSegmentLength,
        y: this.layoutConfig.minSegmentLength
    };

    return minSegmentLength;
};

/**
 * Return current view type.
 * @returnss true - nested view, false - not nested view.
 */
LayoutHostInterface.prototype.isNestedView = function() {
    // In DF, nested view is 0, network view is 1
    return !this.hostDiagramView.getManager().getSheet().getGroupViewMode();
};

/**
 * Creates a host interface object
 * <P>
 * For the constructor the host can define whatever signature is required since the host instantiates this object.
 * All other signature must conform to the examples found here.
 *
 * @param {Object} diagramView - The DF diagram view used to display the graph.
 * @param {Object} config - The object contains layout configurations
 */
export let createLayoutHostInterface = function( diagramView, config ) {
    return new LayoutHostInterface( diagramView, config );
};

export default exports = {
    createLayoutHostInterface
};

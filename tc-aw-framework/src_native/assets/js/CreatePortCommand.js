// Copyright (c) 2019 Siemens

/* global
 define
 */

/**
 * This class provides an custom implementation to create port on node via user gestures.
 *
 * @module js/CreatePortCommand
 */
import DF from '@diagramming/foundation';

var Command = DF.Command;

var _commandName = 'CreatePortCommand';

/**
 * @constructor
 */
function CreatePortCommand() {
    Command.call( this );

    this.portCreator = null;
    this.canvas = null;

    // Instance variables to hold the status of the command
    this.previewPort = null;

    this.portStyle = null;

    this.portSize = 24;

    this.isMovingPort = false;
    this.isMouseDown = false;
}

/**
 * @param {Object} hitPoint - hit point
 * @param {Object} node - node
 */
var getNearestPortCandidate = function( hitPoint, node ) {
    var candidatePoint = null;

    var gluePoints = node.getAppObj().gluePoints;
    if( gluePoints ) {
        var d = Number.POSITIVE_INFINITY;
        for( var i = 0; i < gluePoints.length; i++ ) {
            var distance = hitPoint.distanceToPoint( gluePoints[ i ] );
            if( distance < d ) {
                d = distance;
                candidatePoint = gluePoints[ i ];
            }
        }
    }
    return candidatePoint;
};

/**
 * @param {Object} hitPoint - hit point
 * @param {Object} node - node
 * @param {Number} allowedDistance - allowed distance
 * @return {Object} Returns the desired port position and the node side:<br>
 *         0 - top;<br>
 *         1 - right;<br>
 *         2 - bottom;<br>
 *         3 - left;<br>
 *         4 - topLeftCorner;<br>
 *         5 - topRightCorner;<br>
 *         6 - bottomRightCorner;<br>
 *         7 - bottomLeftCorner
 */
var desiredPortPositionProvider = function( hitPoint, node, allowedDistance ) {
    var desiredPortPosition = [];
    var nodeBBox = node.getBBox();

    // get the nearest glue point if exist
    var gluePoints = null;
    var appObj = node.getAppObj();
    if( appObj ) {
        gluePoints = appObj.gluePoints;
    }

    if( gluePoints ) {
        // the nearest port candidate point should not far away then allowed distance
        var candidatePoint = getNearestPortCandidate( hitPoint, node );
        if( candidatePoint && hitPoint.distanceToPoint( candidatePoint ) < allowedDistance ) {
            hitPoint = candidatePoint;
        } else {
            return desiredPortPosition;
        }
    }

    // no glue points on initial nodes, show dynamic port preview instead
    var hitPoint2TopLine = Math.abs( hitPoint.y - nodeBBox.y );
    if( hitPoint2TopLine <= allowedDistance ) {
        desiredPortPosition = [ new window.SDF.Utils.Point( hitPoint.x, nodeBBox.y ), 0 ];
        if( nodeBBox.isPointOutside( desiredPortPosition[ 0 ] ) ) {
            desiredPortPosition = desiredPortPosition[ 0 ].x < nodeBBox.x ? [
                new window.SDF.Utils.Point( nodeBBox.x, nodeBBox.y ), 4
            ] : [
                new window.SDF.Utils.Point( nodeBBox.x + nodeBBox.width, nodeBBox.y ), 5
            ];
        }
    } else {
        var hitPoint2RightLine = Math.abs( hitPoint.x - ( nodeBBox.x + nodeBBox.width ) );
        if( hitPoint2RightLine <= allowedDistance ) {
            desiredPortPosition = [ new window.SDF.Utils.Point( nodeBBox.x + nodeBBox.width, hitPoint.y ), 1 ];
            if( nodeBBox.isPointOutside( desiredPortPosition[ 0 ] ) ) {
                desiredPortPosition = desiredPortPosition[ 0 ].y < nodeBBox.y ? [
                    new window.SDF.Utils.Point( nodeBBox.x + nodeBBox.width, nodeBBox.y ), 5
                ] : [
                    new window.SDF.Utils.Point( nodeBBox.x + nodeBBox.width, nodeBBox.y + nodeBBox.height ),
                    6
                ];
            }
        } else {
            var hitPoint2BottomLine = Math.abs( hitPoint.y - ( nodeBBox.y + nodeBBox.height ) );
            if( hitPoint2BottomLine <= allowedDistance ) {
                desiredPortPosition = [ new window.SDF.Utils.Point( hitPoint.x, nodeBBox.y + nodeBBox.height ),
                    2
                ];
                if( nodeBBox.isPointOutside( desiredPortPosition[ 0 ] ) ) {
                    desiredPortPosition = desiredPortPosition[ 0 ].x < nodeBBox.x ? [
                        new window.SDF.Utils.Point( nodeBBox.x, nodeBBox.y + nodeBBox.height ), 7
                    ] : [
                        new window.SDF.Utils.Point( nodeBBox.x + nodeBBox.width, nodeBBox.y +
                            nodeBBox.height ), 6
                    ];
                }
            } else {
                var hitPoint2LeftLine = Math.abs( hitPoint.x - nodeBBox.x );
                if( hitPoint2LeftLine <= allowedDistance ) {
                    desiredPortPosition = [ new window.SDF.Utils.Point( nodeBBox.x, hitPoint.y ), 3 ];
                    if( nodeBBox.isPointOutside( desiredPortPosition[ 0 ] ) ) {
                        desiredPortPosition = desiredPortPosition[ 0 ].y < nodeBBox.y ? [
                            new window.SDF.Utils.Point( nodeBBox.x, nodeBBox.y ), 4
                        ] : [
                            new window.SDF.Utils.Point( nodeBBox.x, nodeBBox.y + nodeBBox.height ), 7
                        ];
                    }
                }
            }
        }
    }
    return desiredPortPosition;
};

/**
 * @param {Object} port - port
 * @param {Object} desiredPortPosition - desired port position
 * @param {Object} nodeBBox - node bounding box
 */
var updatePortPosition = function( port, desiredPortPosition, nodeBBox ) {
    var portLocation = port.getLocation();

    switch ( desiredPortPosition[ 1 ] ) {
        case 0:
        case 3:
        case 4:
            portLocation.setInput( window.SDF.Utils.CoordinateMode.ABSOLUTE, window.SDF.Utils.Axis.X,
                desiredPortPosition[ 0 ].x - nodeBBox.x );
            portLocation.setInput( window.SDF.Utils.CoordinateMode.ABSOLUTE, window.SDF.Utils.Axis.Y,
                desiredPortPosition[ 0 ].y - nodeBBox.y );
            portLocation.setInput( window.SDF.Utils.CoordinateMode.PERCENT, window.SDF.Utils.Axis.X, 0 );
            portLocation.setInput( window.SDF.Utils.CoordinateMode.PERCENT, window.SDF.Utils.Axis.Y, 0 );
            break;
        case 1:
        case 5:
            portLocation.setInput( window.SDF.Utils.CoordinateMode.ABSOLUTE, window.SDF.Utils.Axis.X, 0 );
            portLocation.setInput( window.SDF.Utils.CoordinateMode.ABSOLUTE, window.SDF.Utils.Axis.Y,
                desiredPortPosition[ 0 ].y - nodeBBox.y );
            portLocation.setInput( window.SDF.Utils.CoordinateMode.PERCENT, window.SDF.Utils.Axis.X, 1 );
            portLocation.setInput( window.SDF.Utils.CoordinateMode.PERCENT, window.SDF.Utils.Axis.Y, 0 );
            break;
        case 2:
        case 7:
            portLocation.setInput( window.SDF.Utils.CoordinateMode.ABSOLUTE, window.SDF.Utils.Axis.X,
                desiredPortPosition[ 0 ].x - nodeBBox.x );
            portLocation.setInput( window.SDF.Utils.CoordinateMode.ABSOLUTE, window.SDF.Utils.Axis.Y, 0 );
            portLocation.setInput( window.SDF.Utils.CoordinateMode.PERCENT, window.SDF.Utils.Axis.X, 0 );
            portLocation.setInput( window.SDF.Utils.CoordinateMode.PERCENT, window.SDF.Utils.Axis.Y, 1 );
            break;
        case 6:
            portLocation.setInput( window.SDF.Utils.CoordinateMode.ABSOLUTE, window.SDF.Utils.Axis.X, 0 );
            portLocation.setInput( window.SDF.Utils.CoordinateMode.ABSOLUTE, window.SDF.Utils.Axis.Y, 0 );
            portLocation.setInput( window.SDF.Utils.CoordinateMode.PERCENT, window.SDF.Utils.Axis.X, 1 );
            portLocation.setInput( window.SDF.Utils.CoordinateMode.PERCENT, window.SDF.Utils.Axis.Y, 1 );
            break;
        default:
    }
};

/**
 * Hook with canvas so we can get mouse event
 *
 * @param {Object} canvas - canvas
 * @param {Object} diagramMgr - diagram manager
 */
CreatePortCommand.prototype.hook = function( canvas, diagramMgr ) {
    Command.prototype.hook.call( this, canvas, diagramMgr );
    this.session = diagramMgr.getSheetSession();
    this.canvas = canvas;

    var self = this;
    var allowedDistance = 10;

    var getTargetNode = function( hitPoint, allowedDistance ) {
        var selRect = new window.SDF.Utils.Rect( hitPoint.x - allowedDistance, hitPoint.y - allowedDistance,
            allowedDistance * 2, allowedDistance * 2 );
        var hitElements = self.diagramManager.getElementsInsideAndIntersectRect( selRect );
        if( hitElements ) {
            var len = hitElements.length;
            for( var idx = len; idx > 0; idx-- ) {
                var tmpElement = hitElements[ idx - 1 ];
                if( tmpElement instanceof window.SDF.Models.Node ) {
                    return tmpElement;
                }
            }
        }
        return undefined;
    };

    /**
     * Hide preview port
     */
    var hidePreviewPort = function() {
        if( self.previewPort ) {
            self.previewPort.setVisible( false );
            self.previewPort.remove();
            self.previewPort = null;
        }
    };
    /**
     * Hide preview port and update the dom immediately
     */
    var hidePreviewPortAndUpdateDom = function() {
        var session = self.diagramManager.getSheetSession();
        session.makeWorkSession();
        self.diagramManager.beginTransaction();
        hidePreviewPort();
        self.diagramManager.endTransaction();
    };

    var getHoveredElements = function( e ) {
        var m = self.diagramManager.getScreenToSheetTransform();
        var offset = self.canvas.offset();
        var x = e.pageX - offset.left;
        var y = e.pageY - offset.top;
        var pt = m.transformPoint( new window.SDF.Utils.Point( x, y ) );
        return self.diagramManager.getElementsByPoint( pt );
    };

    var isHoveredNonPreviewItem = function( e ) {
        var hoveredElements = getHoveredElements( e );
        var length = hoveredElements.length;
        var hasBoundary = false;
        var hasNode = false;
        for( var i = 0; i < length; i++ ) {
            if( hoveredElements[ i ] instanceof window.SDF.Models.Port && hoveredElements[ i ] !== self.previewPort ) {
                return true;
            } else if( hoveredElements[ i ].getItemType() === 'Boundary' ) {
                hasBoundary = true;
            } else if( hoveredElements[ i ].getItemType() === 'Node' ) {
                hasNode = true;
            }
        }
        if( hasBoundary && !hasNode ) {
            return true;
        }
        return false;
    };

    var createPreviewPort = function( hitPoint ) {
        var session = self.diagramManager.getSheetSession();
        // We need to enlarge the selection radius to make sure
        // a target node is identified when the cursor near to it
        var targetNode = getTargetNode( hitPoint, allowedDistance );

        session.makeWorkSession();
        self.diagramManager.beginTransaction();
        if( targetNode ) {
            var nodeBBox = targetNode.getBBox();
            var desiredPortPosition = desiredPortPositionProvider( hitPoint, targetNode, allowedDistance );

            if( desiredPortPosition.length > 0 ) {
                // Create a port preview on the desired port position
                self.diagramManager.setCursor( 'immediate', 'crosshair', self.canvas );

                var port_symbol_occ;
                if( !self.previewPort ) {
                    var port_symbol = new window.SDF.Models.Rectangle();

                    // To set the anchor coordinator before create the sysmbol occurence,
                    // otherwise the updatePortPosition will give a wrong position when you try creating a port on top/left border.
                    port_symbol.setAnchorX( 0.5 );
                    port_symbol.setAnchorY( 0.5 );

                    port_symbol_occ = new window.SDF.Models.SymbolOccurrence( 0, 0, port_symbol );

                    port_symbol_occ.setRenderingProperties( self.getPortStyle() );

                    // Port
                    self.previewPort = new window.SDF.Models.Port( self.diagramManager.getSheet(),
                        self.portSize, self.portSize, null, null, null, targetNode );
                    self.previewPort.setOwner( targetNode );

                    // Add an attribute to indicate it's a preview port
                    self.previewPort._is_preview_ = true;

                    targetNode.addPort( 0, self.previewPort );
                    updatePortPosition( self.previewPort, desiredPortPosition, nodeBBox );
                    self.previewPort.addSymbol( port_symbol_occ );
                    self.previewPort.setVisible( true );
                    self.previewPort
                        .setAllowedTransformations( window.SDF.Utils.AllowedTransformations.TRANSLATION );

                    self.previewPort
                        .setMoveStrategy( new window.SDF.Utils.PortMoveStrategy( self.previewPort ) );
                } else {
                    // port style may be changed in current session
                    port_symbol_occ = self.previewPort.getSymbols()[ 0 ];
                    if( port_symbol_occ ) {
                        port_symbol_occ.setRenderingProperties( self.getPortStyle() );
                    }
                    self.previewPort.setVisible( true );
                    if( targetNode.getPorts().indexOf( self.previewPort ) < 0 ) {
                        targetNode.addPort( 0, self.previewPort );
                    }

                    updatePortPosition( self.previewPort, desiredPortPosition, nodeBBox );
                }
            } else if( self.previewPort ) {
                hidePreviewPort();
            }
        } else if( self.previewPort ) {
            hidePreviewPort();
        }
        self.diagramManager.endTransaction();
    };

    var createPort = function() {
        if( self.previewPort ) {
            if( self.previewPort.isVisible() && self.portCreator !== null ) {
                // Finish the create
                // Can trigger other application function
                var location = self.previewPort.getLocation();
                var owner = self.previewPort.getOwner();

                if( self.previewPort._is_preview_ ) {
                    delete self.previewPort._is_preview_;
                }

                // To wrap the HidePreviewPort with a transaction to ensure the port preview
                // can be removed from the graph view
                hidePreviewPortAndUpdateDom();

                self.portCreator( owner, location );
            } else {
                // Remove the port preview
                hidePreviewPortAndUpdateDom();
            }
        }
    };

    canvas.bind( 'mouseleave', function( e ) {
        if( self.isEnabled() && self.previewPort ) {
            var session = self.diagramManager.getSheetSession();
            session.makeWorkSession();
            self.diagramManager.beginTransaction();
            hidePreviewPort();
            self.diagramManager.endTransaction();
            self.isMovingPort = false;
        }
    } );

    canvas.bind( 'mousemove', function( e ) {
        if( self.isEnabled() ) {
            var needDeactiveCursor = true;
            if( !self.isMouseDown ) {
                var hoveredElements = getHoveredElements( e );
                var length = hoveredElements.length;
                if( length === 0 || isHoveredNonPreviewItem( e ) ) {
                    hidePreviewPortAndUpdateDom();
                } else {
                    var offset = self.canvas.offset();
                    var mousePt = new window.SDF.Utils.Point();
                    mousePt.x = e.pageX - offset.left;
                    mousePt.y = e.pageY - offset.top;
                    var m = self.diagramManager.getScreenToSheetTransform();

                    if( m && self.isMovingPort === false ) {
                        var hitPoint = m.transformPoint( mousePt );
                        var targetNode = getTargetNode( hitPoint, allowedDistance );
                        if( targetNode ) {
                            var desiredPortPosition = desiredPortPositionProvider( hitPoint, targetNode,
                                allowedDistance );
                            if( desiredPortPosition.length > 0 ) {
                                needDeactiveCursor = false;
                                self.canvas.activateCursor( 'immediate' );
                                createPreviewPort( hitPoint );
                            } else {
                                hidePreviewPortAndUpdateDom();
                            }
                        }
                    }
                }
            }
            if( needDeactiveCursor ) {
                self.canvas.deactivateCursor( 'immediate' );
            }
        }
    } );

    canvas.bind( 'mouseup', function( e ) {
        if( self.isEnabled() ) {
            if( e.button === 0 ) {
                if( self.isMouseDown ) {
                    createPort();

                    var cmdMgr = self.diagramManager.getCommandManager();
                    cmdMgr.releaseMutex( self );

                    self.previewPort = null;
                    self.isMouseDown = false;
                    self.canvas.deactivateCursor( 'immediate' );
                }
            }
            self.isMovingPort = false;
        }
    } );

    canvas.bind( 'mousedown', function( e ) {
        if( self.isEnabled() && e.button === 0 ) {
            var hoveredElements = getHoveredElements( e );
            var length = hoveredElements.length;
            for( var i = 0; i < length; i++ ) {
                if( hoveredElements[ i ] instanceof window.SDF.Models.Port ) {
                    if( hoveredElements[ i ] !== self.previewPort ) {
                        self.isMovingPort = true;
                        hidePreviewPortAndUpdateDom();
                    } else {
                        var cmdMgr = self.diagramManager.getCommandManager();
                        cmdMgr.requestMutex( self );
                        self.isMouseDown = true;
                    }
                    break;
                }
            }
        }
    } );

    /*
     * <wangtao> 28-Sep-2015 Support touch devices
     */
    var touchCreatePortFlag = false;
    var startTimeStamp;
    var touchStartX;
    var touchStartY;
    canvas.bind( 'touchstart', function( e ) {
        if( self.isEnabled() ) {
            var touches = e.originalEvent.touches;
            var fingers = touches.length;
            if( fingers > 1 ) {
                return;
            }

            startTimeStamp = e.timeStamp;
            touchStartX = touches[ 0 ].pageX;
            touchStartY = touches[ 0 ].pageY;
            touchCreatePortFlag = true;

            e.preventDefault();
        }
    } );

    canvas.bind( 'touchmove', function( e ) {
        if( self.isEnabled() ) {
            var touches = e.originalEvent.touches;
            var fingers = touches.length;
            if( fingers > 1 ) {
                return;
            }

            var x = touches[ 0 ].pageX;
            var y = touches[ 0 ].pageY;
            if( x !== touchStartX || y !== touchStartY ) {
                touchCreatePortFlag = false;
            }
            e.preventDefault();
        }
    } );

    canvas.bind( 'touchend', function( e ) {
        if( self.isEnabled() ) {
            if( !touchCreatePortFlag ) {
                return;
            }

            var touches = e.originalEvent.changedTouches;
            var fingers = touches.length;
            if( fingers > 1 ) {
                return;
            }

            var dt = e.timeStamp - startTimeStamp;
            if( dt > 600 ) {
                // too long time to touch
                return;
            }

            e.preventDefault();

            var offset = self.canvas.offset();
            var touchPt = new window.SDF.Utils.Point();
            touchPt.x = touches[ 0 ].pageX - offset.left;
            touchPt.y = touches[ 0 ].pageY - offset.top;
            var m = diagramMgr.getScreenToSheetTransform();
            if( m ) {
                createPreviewPort( m.transformPoint( touchPt ) );
            }

            createPort();

            self.previewPort = null;
            touchCreatePortFlag = false;
        }
    } );
};

/**
 * Get the port style
 *
 * @returns {object} port style
 */
CreatePortCommand.prototype.getPortStyle = function() {
    if( !this.portStyle ) {
        this.portStyle = new window.SDF.Models.RenderingProperties();
        this.portStyle.setStrokeColor( window.SDF.Utils.Color.Blue );
        this.portStyle.setFillColor( new window.SDF.Utils.Color( 255, 255, 255, 1 ) );
    }
    return this.portStyle;
};

/**
 * Set a call back for this command to get the dynamic style
 *
 * @param {Function} previewPortStyleFunc call back to get the user defined style for preview port creating
 */
CreatePortCommand.prototype.setPreviewPortStyleFunc = function( previewPortStyleFunc ) {
    this.previewPortStyleFunc = previewPortStyleFunc;
};

/**
 * @param {Number} size - port size
 */
CreatePortCommand.prototype.setPortSize = function( size ) {
    this.portSize = size;
};

/**
 * @param {Object} creator - creator
 */
CreatePortCommand.prototype.setPortCreator = function( creator ) {
    this.portCreator = creator;
};

/**
 * Callback that is called when the command is disabled.
 */
CreatePortCommand.prototype.onDisabled = function() {
    if( this.previewPort ) {
        this.session.makeWorkSession();
        this.diagramManager.beginTransaction();
        this.previewPort.remove();
        this.diagramManager.endTransaction();
        this.previewPort = null;
        if( this.canvas ) {
            this.canvas.deactivateCursor( 'immediate' );
        }
    }
};

/**
 * Get command type name.
 */
CreatePortCommand.prototype.getTypeName = function() {
    return _commandName;
};

Command.inheritedBy( CreatePortCommand );

export default CreatePortCommand;

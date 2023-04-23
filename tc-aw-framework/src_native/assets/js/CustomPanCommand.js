// Copyright (c) 2020 Siemens

/* global
 define
 */

/* globals MSGesture: false */
import DF from '@diagramming/foundation';
import graphUtils from 'js/graphUtils';
/**
 * Custom Pan Command for GC only
 *
 * @module js/CustomPanCommand
 */

var Command = DF.Command;
var Annotation = DF.Models.Annotation;
var Port = DF.Models.Port;
var Node = DF.Models.Node;
var CursorID = DF.Utils.CursorID;
var Point = DF.Utils.Point;
var Vector = DF.Utils.Vector;
var NorthwestResize = 2;
var WestResize = 9;

var _commandName = 'CustomPanCommand';

/**
 * Constructor
 */
function CustomPanCommand() {
    Command.call( this );
    this.__m_canvas__ = null;
    this.__move_without_selection__ = true;
}

/**
 * Method for App to switch the move mode
 */
CustomPanCommand.prototype.setMoveWithoutSelection = function( moveMode ) {
    this.__move_without_selection__ = moveMode;
};

/**
 * hook method
 */
CustomPanCommand.prototype.hook = function( canvas, dataModelMgr ) {
    Command.prototype.hook.call( this, canvas, dataModelMgr );
    var cmdMgr = null;
    var config = null;
    var panFlag = false;
    var panExecuted = false;
    var startX = 0;
    var startY = 0;
    var startX1 = 0;
    var startY1 = 0;

    var self = this;
    this.__m_canvas__ = canvas;
    this.__move_without_selection__ = true;

    var moveCommandOriginalStatus;
    var rectangleSelectCommandOriginalStatus;

    /**
     * <wangtao> 21-Sep-2015 add supporting for rubber band select mode Switch pan mode and move-node mode and
     * rubber band select mode
     */
    var switchPanMode = function( pt, touchMode, e ) {
        var isPanAllowed = false;
        var overlay;

        config = dataModelMgr.getSheetConfigurationData();
        if( config.viewData.isPanMode() ) {
            return true;
        }

        if( touchMode ) {
            // touch on resize/rotate/connection end overlays will disable the pan mode
            overlay = dataModelMgr.getOverlayByTouch( pt );
            if( overlay ) {
                return false;
            }
        }

        cmdMgr = dataModelMgr.getCommandManager();
        var sheetElements = dataModelMgr.getElementsByPoint( pt );
        var len = sheetElements.length;
        moveCommandOriginalStatus = cmdMgr.getCommand( 'MoveCommand' ).isEnabled();
        rectangleSelectCommandOriginalStatus = cmdMgr.getCommand( 'RectangleSelectCommand' ).isEnabled();
        if( len === 0 ) {
            cmdMgr.enableCommand( 'MoveCommand', false );
            if( rectangleSelectCommandOriginalStatus && ( e.ctrlKey || e.altKey || e.shiftKey ) ) {
                isPanAllowed = false;
            } else {
                isPanAllowed = true;
            }
        } else {
            var createConMode = config.contextData.getConnectionCreationContext();
            var curSheetElement = sheetElements[ len - 1 ];
            if( curSheetElement instanceof Node ) {
                if( curSheetElement.getIsContainer() ) {
                    isPanAllowed = false;
                } else {
                    if( !graphUtils.isPointInNodeHeader( curSheetElement, pt ) ) {
                        if( !createConMode ) {
                            overlay = dataModelMgr.getOverlayByPoint( pt );
                            var operationFlag = overlay ? overlay.getId() : undefined;
                            if( operationFlag && operationFlag >= NorthwestResize &&
                                operationFlag <= WestResize ) {
                                isPanAllowed = false;
                            } else {
                                cmdMgr.enableCommand( 'MoveCommand', false );
                                if( rectangleSelectCommandOriginalStatus && ( e.ctrlKey || e.altKey || e.shiftKey ) ) {
                                    isPanAllowed = false;
                                } else {
                                    isPanAllowed = true;
                                }
                            }
                        } else {
                            isPanAllowed = false;
                            cmdMgr.enableCommand( 'RectangleSelectCommand', false );
                        }
                    } else if( curSheetElement.isSelected() || self.__move_without_selection__ ) {
                        isPanAllowed = false;
                        if( !createConMode ) {
                            cmdMgr.enableCommand( 'MoveCommand', moveCommandOriginalStatus );
                        }
                    } else if( !self.__move_without_selection__ ) {
                        if( !createConMode ) {
                            isPanAllowed = true;
                            cmdMgr.enableCommand( 'MoveCommand', false );
                        } else {
                            isPanAllowed = false;
                        }
                    }
                }
            } else if( curSheetElement instanceof Annotation || curSheetElement instanceof Port ) {
                isPanAllowed = false;
                if( !createConMode ) {
                    cmdMgr.enableCommand( 'MoveCommand', moveCommandOriginalStatus );
                }
            }
        }

        return isPanAllowed;
    };

    /**
     * <wangtao> 24-Sep-2015 translate viewport (pan) as the given vector
     */
    var translateViewport = function( vector ) {
        if( vector.x === 0 && vector.y === 0 ) {
            return;
        }
        var m = dataModelMgr.getScreenToSheetTransform();
        var v = m.transformVector( vector );
        dataModelMgr.translateViewport( v );
    };

    var mouseMoveHandler = function( e ) {
        if( panFlag && self.isEnabled() ) {
            cmdMgr.requestMutex( self );

            var x = e.pageX;
            var y = e.pageY;
            translateViewport( new Vector( x - startX, y - startY ) );
            startX = x;
            startY = y;
            self.__m_canvas__.activateCursor( CursorID.PAN );
            panExecuted = true;
        }
    };

    canvas.bind( 'SDF_mousedownhold', function( e ) {
        if( !self.isEnabled() || window.navigator.msMaxTouchPoints ) {
            return;
        }
        if( panFlag ) {
            self.__m_canvas__.activateCursor( CursorID.PAN );
            panExecuted = true;
        }
    }, true );

    canvas.bind( 'mousedown', function( e ) {
        // LCS-374869 - REG: Click mouse middle button not moving canvas
        // CKEditor introduces a global div in the body when it initializes in the overview tab as follows:
        // <div class="cke_screen_reader_only cke_copyformatting_notification"><div aria-live="polite"></div></div>
        // it makes the auto-scrolling icon always displayed whenever you click the middle mouse button on the whole page
        // Add the following filter to disable the default behavior of clicking middle button as a workaround
        if( e.button === 1 ) {
            self.__m_canvas__.activateCursor( CursorID.PAN );
            e.preventDefault();
        }
        if( !self.isEnabled() || window.navigator.msMaxTouchPoints ) {
            return;
        }

        var m = dataModelMgr.getScreenToSheetTransform();
        var offset = canvas.offset();
        var x = e.pageX - offset.left;
        var y = e.pageY - offset.top;
        var pt = m.transformPoint( new Point( x, y ) );
        if( switchPanMode( pt, false, e ) ) {
            panFlag = true;
            startX = e.pageX;
            startY = e.pageY;
            canvas.bind( 'mousemove', mouseMoveHandler );
        }
    }, true );

    canvas.bind( 'mouseup', function( e ) {
        if( cmdMgr ) {
            cmdMgr.releaseMutex( self );
            cmdMgr.enableCommand( 'MoveCommand', moveCommandOriginalStatus );
            cmdMgr.enableCommand( 'RectangleSelectCommand', rectangleSelectCommandOriginalStatus );
        }
        if( panFlag ) {
            panFlag = false;
            canvas.unbind( 'mousemove', mouseMoveHandler );
        }

        // DF provided the solution which added panExecuted checking
        if( panExecuted ) {
            panExecuted = false;
            self.__m_canvas__.deactivateCursor( CursorID.PAN );
        }
    }, true );

    /**
     * <wangtao> 24-Sep-2015 Support touch devices
     */
    var touchMoveHandler = function( e ) {
        if( self.isEnabled() ) {
            e.preventDefault();

            if( panFlag ) {
                var touches = e.originalEvent.touches;
                var len = touches.length;

                if( len === 1 ) {
                    var x = touches[ 0 ].pageX;
                    var y = touches[ 0 ].pageY;
                    translateViewport( new Vector( x - startX, y - startY ) );
                    startX = x;
                    startY = y;
                } else if( len === 2 ) {
                    var x0 = touches[ 0 ].pageX;
                    var y0 = touches[ 0 ].pageY;
                    var x1 = touches[ 1 ].pageX;
                    var y1 = touches[ 1 ].pageY;
                    var v0 = new Vector( x0 - startX, y0 - startY );
                    var v1 = new Vector( x1 - startX1, y1 - startY1 );
                    if( v0.length() === 0 || v1.length() === 0 ) {
                        return;
                    }

                    translateViewport( new Vector( ( v0.x + v1.x ) / 2, ( v0.y + v1.y ) / 2 ) );
                    startX = x0;
                    startY = y0;
                    startX1 = x1;
                    startY1 = y1;
                }
            }
        }
    };

    canvas.bind( 'touchstart', function( e ) {
        if( self.isEnabled() ) {
            e.preventDefault();

            var touches = e.originalEvent.touches;
            var len = touches.length;

            var isPanAllowed = false;
            if( len === 1 ) {
                var m = dataModelMgr.getScreenToSheetTransform();
                var offset = canvas.offset();
                var touch = e.originalEvent.touches[ 0 ];
                var x = touch.pageX - offset.left;
                var y = touch.pageY - offset.top;
                var pt = m.transformPoint( new Point( x, y ) );
                if( switchPanMode( pt, true, e ) ) {
                    isPanAllowed = true;
                }
            } else if( len === 2 ) {
                isPanAllowed = true;
            }

            if( isPanAllowed ) {
                panFlag = true;
                startX = touches[ 0 ].pageX;
                startY = touches[ 0 ].pageY;
                if( len === 2 ) {
                    startX1 = touches[ 1 ].pageX;
                    startY1 = touches[ 1 ].pageY;
                }
                canvas.bind( 'touchmove', touchMoveHandler );
            }
        }
    }, true );

    canvas.bind( 'touchend', function( e ) {
        if( self.isEnabled() ) {
            e.preventDefault();

            if( panFlag ) {
                panFlag = false;
                canvas.unbind( 'touchmove', touchMoveHandler );
            }
        }
    }, true );

    // for IE on Windows touchpad
    var surfaceTouchPoints = 0;
    var msPanFlag = false;
    var disableFlag = true;
    canvas.bind( 'MSGestureChange', function( e ) {
        if( !msPanFlag ) {
            return;
        }

        if( disableFlag ) {
            cmdMgr = dataModelMgr.getCommandManager();
            cmdMgr.requestMutex( self );
            disableFlag = false;
        }

        var wrapper = canvas.getInteractionCanvas();
        wrapper.translationX += e.translationX;
        wrapper.translationY += e.translationY;

        translateViewport( new Vector( e.translationX, e.translationY ) );
    } );

    canvas.bind( 'MSGestureEnd', function( e ) {
        if( !disableFlag ) {
            cmdMgr.releaseMutex( self );
            disableFlag = true;
        }
    } );

    // "MSPointerUp" event will always be triggered after "MSPointerDown" but "MSGestureEnd" doesn't.
    canvas.bind( 'MSPointerUp', function( e ) {
        msPanFlag = false;
        surfaceTouchPoints = 0;
    } );

    canvas.bind( 'MSPointerDown', function( e ) {
        if( !window.navigator.msMaxTouchPoints ) {
            return;
        }

        // count the touch points on MS Surface
        surfaceTouchPoints++;

        var isPanAllowed = false;
        if( surfaceTouchPoints === 1 ) {
            var m = dataModelMgr.getScreenToSheetTransform();
            var offset = canvas.offset();
            var x = e.clientX - offset.left;
            var y = e.clientY - offset.top;
            var pt = m.transformPoint( new Point( x, y ) );
            if( switchPanMode( pt, true, e ) ) {
                isPanAllowed = true;
            }
        } else if( surfaceTouchPoints === 2 ) {
            isPanAllowed = true;
        }

        if( isPanAllowed ) {
            msPanFlag = true;
            disableFlag = true;

            // Ensure the div has been initialized.
            var wrapper = canvas.getInteractionCanvas();
            if( wrapper.translationX === null || typeof wrapper.translationX === 'undefined' ) {
                wrapper.translationX = 0;
            }
            if( wrapper.translationY === null || typeof wrapper.translationY === 'undefined' ) {
                wrapper.translationY = 0;
            }
            if( wrapper.gestureObject === null || typeof wrapper.gestureObject === 'undefined' ) {
                wrapper.gestureObject = new MSGesture();
                wrapper.gestureObject.target = wrapper;
            }

            wrapper.gestureObject.addPointer( e.pointerId );
        }
    } );
};

CustomPanCommand.prototype.execute = function() {};

CustomPanCommand.prototype.onEnabled = function() {
    // <summary>Set the pan command cursor when the command is enabled.</summary>
    if( this.__m_canvas__ ) {
        var cursorConfig = this.diagramManager.getSheetSession().getCursorConfiguration();
        this.__m_canvas__.setCursor( cursorConfig[ CursorID.PAN ] );
    }
};

/**
 * Get command type name.
 */
CustomPanCommand.prototype.getTypeName = function() {
    return _commandName;
};

Command.inheritedBy( CustomPanCommand );

export default CustomPanCommand;

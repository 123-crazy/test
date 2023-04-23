// Copyright (c) 2019 Siemens

/* global define
 */
/**
 * This module provides graph cursor support
 *
 * @module js/graphCursorService
 */
import app from 'app';

/**
 * Define public API
 */
var exports = {};

var CURSOR_NAME = {
    CROSS: 'crosshair',
    MOVE: 'move',
    HAND: 'pointer',
    ARROW: 'default',
    DEFAULT: 'default',
    NOTALLOWED: 'not-allowed',
    ERESIZE: 'e-resize',
    NERESIZE: 'ne-resize',
    NWRESIZE: 'nw-resize',
    NRESIZE: 'n-resize',
    SWRESIZE: 'sw-resize',
    SERESIZE: 'se-resize',
    SRESIZE: 's-resize',
    WRESIZE: 'w-resize'
};

/**
 * Define the constructor the graph cursor service
 *
 * @param diagramView the diagram view object
 * @param config the graph input mode configuration
 */
export let GraphCursorHandler = function( diagramView, inputMode ) {
    var self = this;

    /**
     * Set the cursor as specified cursor
     *
     * @param cursorName name of the cursor
     */
    self.setCurrentCursor = function( cursorName ) {
        var CursorID = window.SDF.Utils.CursorID;
        [ CursorID.PRESELECT, CursorID.CREATENODE, CursorID.SINGLESELECT, CursorID.MOVE, CursorID.LINK,
            CursorID.BRKLINK, CursorID.ATTACH, CursorID.TEE, CursorID.PREMULTISELECT, CursorID.CONNECTIONLINKSTART,
            CursorID.CONNECTIONNODESIDESTART, CursorID.CONNECTIONSEGMENTSTART, CursorID.CREATECON
        ].forEach( function( cursorIdItem ) {
            diagramView.setCursor( cursorIdItem, cursorName );
        } );
    };

    /**
     *  Reset the default cursor of GC
     */
    self.resetDefaultCursors = function() {
        var CursorID = window.SDF.Utils.CursorID;
        [
            { id: CursorID.ERESIZE, value: CURSOR_NAME.ERESIZE },
            { id: CursorID.NERESIZE, value: CURSOR_NAME.NERESIZE },
            { id: CursorID.NWRESIZE, value: CURSOR_NAME.NWRESIZE },
            { id: CursorID.NRESIZE, value: CURSOR_NAME.NRESIZE },
            { id: CursorID.SWRESIZE, value: CURSOR_NAME.SWRESIZE },
            { id: CursorID.SERESIZE, value: CURSOR_NAME.SERESIZE },
            { id: CursorID.SRESIZE, value: CURSOR_NAME.SRESIZE },
            { id: CursorID.WRESIZE, value: CURSOR_NAME.WRESIZE },
            { id: CursorID.DRAGMOVE, value: CURSOR_NAME.CROSS },
            { id: CursorID.DRAGCOPY, value: CURSOR_NAME.CROSS },
            { id: CursorID.DROPREJECT, value: CURSOR_NAME.NOTALLOWED },
            { id: CursorID.MOVEREJECT, value: CURSOR_NAME.NOTALLOWED }
        ].forEach( function( eachCursor ) {
            diagramView.setCursor( eachCursor.id, eachCursor.value );
        } );
    };

    /**
     * set the extension cursor
     */
    self.setExtensionCursors = function( configData ) {
        var CursorID = window.SDF.Utils.CursorID;
        [
            { id: CursorID.ERESIZE, configCursor: configData.eresizeCursor },
            { id: CursorID.NERESIZE, configCursor: configData.neresizeCursor },
            { id: CursorID.NWRESIZE, configCursor: configData.nwresizeCursor },
            { id: CursorID.NRESIZE, configCursor: configData.nresizeCursor },
            { id: CursorID.SWRESIZE, configCursor: configData.swresizeCursor },
            { id: CursorID.SERESIZE, configCursor: configData.seresizeCursor },
            { id: CursorID.SRESIZE, configCursor: configData.sresizeCursor },
            { id: CursorID.WRESIZE, configCursor: configData.wresizeCursor },
            { id: CursorID.DRAGMOVE, configCursor: configData.dragMoveCursor },
            { id: CursorID.DRAGCOPY, configCursor: configData.dragMoveCursor },
            { id: CursorID.DROPREJECT, configCursor: configData.dropRejectCursor },
            { id: CursorID.MOVEREJECT, configCursor: configData.moveRejectCursor }
        ].forEach( function( eachCursor ) {
            if( eachCursor.configCursor ) {
                diagramView.setCursor( eachCursor.id, eachCursor.configCursor );
            }
        } );
    };

    /**
     * Set the cursor for the pan command
     */
    self.setPanCursor = function( cursorName ) {
        diagramView.setCursor( window.SDF.Utils.CursorID.PAN, cursorName );
    };

    /**
     * Set the default cursor for PAN
     */
    self.setPanCursor( CURSOR_NAME.MOVE );

    /**
     * Set the cursors for the grahp drag and drop
     *
     * @param {String} dragMove - name of the drag move cursor
     * @param {String} dragCopy  - name of the drag copy cursor
     * @param {String} dropReject - name of the drop reject cursor
     */
    self.setDragAndDrogCursor = function( dragMove, dragCopy, dropReject ) {
        if( dragMove ) {
            diagramView.setCursor( window.SDF.Utils.CursorID.DRAGMOVE, dragMove );
        }
        if( dragCopy ) {
            diagramView.setCursor( window.SDF.Utils.CursorID.DRAGCOPY, dragCopy );
        }
        if( dropReject ) {
            diagramView.setCursor( window.SDF.Utils.CursorID.DROPREJECT, dropReject );
        }
    };

    /**
     * Set drag related cursors: dragable and dragging cursor
     *
     * @param dragableCursor URL of dragable cursor
     * @param draggingCursor URL of dragging cursor
     */
    self.setDragUrlCursor = function( dragableCursor, draggingCursor ) {
        var cursorUrl = '';
        var autoUrl = 'auto, auto';
        if( dragableCursor ) {
            cursorUrl = 'url(' + dragableCursor + '), auto';
            diagramView.setCursor( window.SDF.Utils.CursorID.PRESELECT, cursorUrl );
            diagramView.setCursor( window.SDF.Utils.CursorID.SINGLESELECT, cursorUrl );
            diagramView.setCursor( window.SDF.Utils.CursorID.PREMULTISELECT, cursorUrl );
            diagramView.setCursor( window.SDF.Utils.CursorID.MULTISELECT, cursorUrl );
        } else {
            diagramView.setCursor( window.SDF.Utils.CursorID.PRESELECT, autoUrl );
            diagramView.setCursor( window.SDF.Utils.CursorID.SINGLESELECT, autoUrl );
            diagramView.setCursor( window.SDF.Utils.CursorID.PREMULTISELECT, autoUrl );
            diagramView.setCursor( window.SDF.Utils.CursorID.MULTISELECT, autoUrl );
        }
        if( draggingCursor ) {
            cursorUrl = 'url(' + draggingCursor + '), auto';
            diagramView.setCursor( window.SDF.Utils.CursorID.MOVE, cursorUrl );
        } else {
            diagramView.setCursor( window.SDF.Utils.CursorID.MOVE, autoUrl );
        }
    };

    /**
     * Set the context cursors when the hover over on nodes.
     *
     * @param preselectionGraphItem The preselected graph item, which must be a node.
     * @param isGroupNode the current node is group node or not.
     * @param inHeader the cursor locates in the header of the node.
     * @param isSelected whether the node is selected.
     * @param toSelect will be selected.
     * @param canCreateEdgeFrom flag to indicate whether the preselection item can be used as edge start
     */
    var setCurrentContextCursorsForNode = function( preselectionGraphItem, isGroupNode, inHeader, isSelected,
        toSelect, canCreateEdgeFrom ) {
        var isNodeCreatable = inputMode.creatableItem === 'Node';
        var isEdgeCreatable = inputMode.creatableItem === 'Edge';
        var isBoundaryCreatable = inputMode.creatableItem === 'Boundary';
        var isNodeMovable = inputMode.movableItems.indexOf( 'Node' ) !== -1;

        // Currently just handle the "move without selection gesture"
        if( inHeader && isNodeMovable ) {
            self.setDragUrlCursor( inputMode.dragableCursorUrl, inputMode.draggingCursorUrl );
        }

        if( inputMode.editMode ) {
            if( isEdgeCreatable && !( isNodeMovable && isSelected ) ) {
                if( canCreateEdgeFrom ) {
                    self.setCurrentCursor( inputMode.createEdgeCursor );
                } else {
                    self.setCurrentCursor( inputMode.moveCursor );
                }
            } else if( isNodeCreatable && !isBoundaryCreatable ) {
                if( isGroupNode && !toSelect ) {
                    self.setCurrentCursor( inputMode.createNodeCursor );
                }
            } else if( !inHeader ) {
                self.setCurrentCursor( inputMode.moveCursor );
            }
        } else if( inHeader && !isNodeMovable ) {
            self.setCurrentCursor( inputMode.moveCursor );
        }
    };

    /**
     * Set the cursor when hover on a port
     * @param {Boolean} canCreateEdgeFrom flag to indicate whether the port can be used as start port
     */
    var setCurrentContextCursorForPort = function( canCreateEdgeFrom ) {
        if( inputMode.editMode && inputMode.creatableItem === 'Edge' ) {
            if( canCreateEdgeFrom ) {
                self.setCurrentCursor( inputMode.createEdgeCursor );
            } else {
                self.setCurrentCursor( inputMode.defaultCursor );
            }
        } else {
            self.setDragUrlCursor( inputMode.dragableCursorUrl, inputMode.draggingCursorUrl );
        }
    };

    /**
     * Set the context cursors when the hover over on the graph items.
     *
     * @param preselectionGraphItem The preselected graph item
     * @param inHeader the cursor locates in the header of the node
     * @param toSelect will be selected.
     * @param canCreateEdgeFrom flag to indicate whether the preselection item can be used as edge start.
     */
    self.setCurrentContextCursors = function( preselectionGraphItem, inHeader, toSelect, canCreateEdgeFrom ) {
        if( preselectionGraphItem ) {
            if( preselectionGraphItem instanceof window.SDF.Models.Node ) {
                var isSelected = diagramView.isSelected( preselectionGraphItem );
                var isGroupNode = preselectionGraphItem.isGroupingAllowed();

                setCurrentContextCursorsForNode( preselectionGraphItem, isGroupNode, inHeader, isSelected,
                    toSelect, canCreateEdgeFrom );
            } else if( preselectionGraphItem instanceof window.SDF.Models.Port ) {
                setCurrentContextCursorForPort( canCreateEdgeFrom );
            } else if( preselectionGraphItem instanceof window.SDF.Models.Annotation ) {
                self.setDragUrlCursor( inputMode.dragableCursorUrl, inputMode.draggingCursorUrl );
            } else {
                self.setCurrentCursor( inputMode.defaultCursor );
            }
        }
    };
};

/**
 * Create the graph cursor service
 *
 * @param diagramView diagram view instance
 * @param inputMode input mode instance scribes the cursor service
 */
export let createGraphCursorHandler = function( diagramView, inputMode ) {
    return new exports.GraphCursorHandler( diagramView, inputMode );
};

/**
 * The service to set the cursor for graph items when the mouse hovers on them
 *
 * @member graphCursorService
 */

export default exports = {
    GraphCursorHandler,
    createGraphCursorHandler
};
app.factory( 'graphCursorService', () => exports );

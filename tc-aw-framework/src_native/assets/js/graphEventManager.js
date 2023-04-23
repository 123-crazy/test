/* eslint-disable max-lines */
/* eslint-disable no-bitwise */

// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module defines graph event manager
 *
 * @module js/graphEventManager
 */
import _ from 'lodash';
import dragAndDropService from 'js/dragAndDropService';
import * as graphConstants from 'js/graphConstants';
import * as graphUtils from 'js/graphUtils';
import * as internalGraphUtils from 'js/internalGraphUtils';
import * as logSvc from 'js/logger';
import * as performanceUtils from 'js/performanceUtils';

'use strict';

var clickWithoutSelection = false;

/**
 * Define the GraphEventManager. Manage register/unregister Events
 *
 * @class
 * @param {Object} graphControl the graphControl
 */
var GraphEventManager = function( graphControl ) {
    if( !graphControl ) {
        return;
    }

    var diagramView = graphControl._diagramView;

    var EventsMap = {
        OnTextChange: updateTextChange( graphControl ),
        OnMouseClick: mouseClick( graphControl ),
        OnTap: tap( graphControl ),
        OnTouchHold: touchHold( graphControl ),
        OnMouseDoubleClick: mouseDoubleClick( graphControl ),
        OnDoubleTap: mouseDoubleClick( graphControl ),
        OnKeydown: keyDown( graphControl ),
        OnTransformStart: transformStart( graphControl ),
        OnTransformEnd: transformEnd( graphControl ),
        OnTransformDelta: transformDelta( graphControl ),
        OnPreTransformEnd: preTransformEnd( graphControl ),
        OnDrag: drag( graphControl ),
        OnQueryTooltip: queryTooltip( graphControl ),
        OnHoverChanged: hoverChanged( graphControl ),
        OnViewportChanged: viewportChanged( graphControl ),
        OnSelectionChanged: selectionChanged( graphControl ),
        OnRenderCallback: renderCallback( graphControl ),
        OnAttaching: attaching( graphControl ),
        OnDetaching: detaching( graphControl ),
        OnGeometryChange: geometryChange( graphControl ),
        OnAttached: attached( graphControl ),
        OnElementCreating: elementCreating( graphControl ),
        OnElementCreated: elementCreated( graphControl ),
        OnPreselectionFilter: preselectionFilter( graphControl )
    };

    var OverlayEventsMap = {
        OnTextChange: updateTextChange( graphControl, true ),
        OnMouseClick: mouseClick( graphControl, true ),
        OnTap: tap( graphControl, true ),
        OnRenderCallback: renderCallback( graphControl, true )
    };

    var hook = function( events, isRegister, isOverlay ) {
        if( !events || events.length === 0 ) {
            return;
        }

        var map = isOverlay ? OverlayEventsMap : EventsMap;
        var dv = isOverlay ? graphControl._graphOverlay.overlayDiagram : diagramView;
        var func = isRegister ? 'registerEventListener' : 'unregisterEventListener';

        _.each( events, function( event ) {
            // invalid event
            if( !_.has( map, event ) ) {
                logSvc.warn( 'check event failed for input parameter: events' );
                return;
            }

            var handler = map[ event ];
            var invoker = dv[ func ];
            invoker( window.SDF.EventType[ event ], handler );
        } );
    };

    /**
     * register events
     *
     * @param {Array} events the events list need to be registered
     * @param {Boolean} isOverlay, boolean, register events for overlay
     *
     */
    this.registerEvents = function( events, isOverlay ) {
        hook( events, true, isOverlay );
    };
    /**
     * unregister events
     *
     * @param {array} events the events list need to be unregistered
     * @param {boolean} isOverlay, boolean, unregister events for overlay
     *
     */
    this.unregisterEvents = function( events, isOverlay ) {
        hook( events, false, isOverlay );
    };
};

var preselectionFilter = function( graphControl ) {
    var diagramView = graphControl._diagramView;
    var session = diagramView.getSession();

    // eslint-disable-next-line complexity
    return function( event ) {
        var sheetElements = event.getSheetElements();
        if( sheetElements.length === 0 ) {
            return;
        }

        var isHandled = false;
        var topItem = sheetElements[ sheetElements.length - 1 ];
        var mousePosition = session.getMousePosition();
        var mousePositionOnPage = graphUtils.viewToPageCoordinate( graphControl.graph, mousePosition );
        var candidateElements = sheetElements;
        var inHeader = true;
        var cancelSelect = false;

        var inputMode = graphControl.getInputMode();
        var pointOnSheet = graphUtils.viewToSheetCoordinate( graphControl.graph, mousePosition );
        if( topItem instanceof window.SDF.Models.Node ) {
            isHandled = true;
            candidateElements = [];

            inHeader = graphUtils.isPointInNodeHeader( topItem, pointOnSheet );
            if( inHeader ) {
                candidateElements.push( topItem );

                // don't select node when click on tile command
                var commandElement = internalGraphUtils.getCommandElementByPoint( graphUtils.viewToPageCoordinate(
                    graphControl.graph, mousePosition ) );

                if( commandElement || inputMode.editMode && internalGraphUtils.getEditableTextElement( mousePositionOnPage ) ) {
                    cancelSelect = true;
                }
            } else {
                cancelSelect = true;
            }
        }

        // if application has own preselection handler
        if( graphControl.hitTestHandler ) {
            var hitTestHandler = graphControl.hitTestHandler.onHitTest( graphControl._graphModel, sheetElements, mousePositionOnPage );
            if( hitTestHandler && hitTestHandler.isHandled ) {
                isHandled = true;
                cancelSelect = hitTestHandler.cancel;
                if( cancelSelect ) {
                    candidateElements = [];
                } else {
                    candidateElements = hitTestHandler.candidateElements;
                }
            }
        }

        var canCreateEdgeFrom = true;

        if( topItem instanceof window.SDF.Models.Port || topItem instanceof window.SDF.Models.Node ) {
            var configData = graphControl._configData;
            var isEdgeCreationMode = configData.contextData.getConnectionCreationContext();
            var editHandler = graphControl.graphEditHandler;
            if( isEdgeCreationMode && editHandler && editHandler.canCreateEdgeFrom ) {
                canCreateEdgeFrom = editHandler.canCreateEdgeFrom( graphControl._graphModel, topItem, pointOnSheet );
                if ( inputMode && inputMode.showPortCandidate && editHandler.canCreateEdgeOnCandidate ) {
                    canCreateEdgeFrom = editHandler.canCreateEdgeOnCandidate( graphControl._graphModel, topItem, pointOnSheet );
                }
            }
        }

        if( inputMode && inputMode.graphCursorService ) {
            inputMode.graphCursorService.setCurrentContextCursors( topItem, inHeader, !cancelSelect, canCreateEdgeFrom );
        }

        if( !graphControl._graphModel.config.disableSelectionOnDbclick ) {
            if( !cancelSelect ) {
                diagramView.enableCommand( graphControl._dfCommands.SINGLE_SELECT_COMMAND );
            } else {
                diagramView.disableCommand( graphControl._dfCommands.SINGLE_SELECT_COMMAND );
            }
        }
        if( inputMode && inputMode.graphCursorService ) {
            inputMode.graphCursorService.setCurrentContextCursors( topItem, inHeader, !cancelSelect, canCreateEdgeFrom );
        }

        if( !graphControl._graphModel.config.disableSelectionOnDbclick ) {
            if( !cancelSelect ) {
                diagramView.enableCommand( graphControl._dfCommands.SINGLE_SELECT_COMMAND );
            } else {
                diagramView.disableCommand( graphControl._dfCommands.SINGLE_SELECT_COMMAND );
            }
        }
        clickWithoutSelection = cancelSelect;

        if( event.isHover() && isHandled ) {
            event.setSheetElements( candidateElements );
            event.setHandled( true );
        }
    };
};

/**
 * Get the port on the specified point
 *
 * @param {Array} ports - ports array of the node
 * @param {Point} point - an point
 * @param {Number} tolerance - tolerance to check the port
 * @returns {Object} the port on the point
 */
var _getPortOnPoint = function( ports, point, tolerance ) {
    var toleranceSqr = tolerance * tolerance;
    return _.find( ports, function( port ) {
        var portLocation = port.getLocation();
        var distance = Math.pow( point.x - portLocation.getEvaluatedX(), 2 ) + Math.pow( point.y - portLocation.getEvaluatedY(), 2 );
        if ( distance < toleranceSqr ) {
            return port;
        }
    }  );
};

var elementCreating = function( graphControl ) {
    var configData = graphControl._configData;
    var graphModel = graphControl._graphModel;
    var diagramView = graphControl._diagramView;
    return function( event ) {
        var isNodeCreationMode = configData.contextData.getNodeCreationContext();
        var isEdgeCreationMode = configData.contextData.getConnectionCreationContext();
        var contextElement = event.getContextSheetElement();
        var inputMode = graphControl.getInputMode();
        var editHandler = graphControl.graphEditHandler;
        var point = internalGraphUtils.getPointByLocation( event.getClickLocation() );

        var locIndicatorInfo = event.getLocationIndicatorInfo();
        if( locIndicatorInfo ) {
            point = locIndicatorInfo.location;
        }

        if( isNodeCreationMode ) {
            if( point !== null && inputMode.creatableItem === 'Boundary' ) {
                if( !diagramView.getManager().getElementByPoint( point ) ) {
                    graphControl.inputMode.graphCursorService.setCurrentCursor( 'crosshair' );
                    event.setNewSheetElement( null );
                    event.setHandled( true );
                } else {
                    graphControl.inputMode.graphCursorService.setCurrentCursor( inputMode.defaultCursor );
                    event.setCancelled( true );
                }
            } else {
                event.setCancelled( true );
            }
        } else if( isEdgeCreationMode && editHandler && ( !editHandler.canCreateEdgeFrom ||
                editHandler.canCreateEdgeFrom( graphModel, contextElement, point ) &&
                ( !editHandler.canCreateEdgeOnCandidate ||
                editHandler.canCreateEdgeOnCandidate( graphModel, contextElement, point ) ) ) ) {
            var sourcePort = null;
            var sheet = diagramView.getManager().getSheet();
            if( point && contextElement instanceof window.SDF.Models.Node ) {
                var tolerance = inputMode.endPointTolerance / diagramView.getCurrentZoomRatio();
                if( !internalGraphUtils.isValidatePointForCreateEdgeOnGroupNode( graphControl, contextElement, point, tolerance ) ) {
                    event.setCancelled( true );
                    return;
                }

                // if the input mode supports port candidate, get the nearest the port candidate without any connected connection
                if ( inputMode.showPortCandidate && editHandler.getNearestCandidate ) {
                    point = editHandler.getNearestCandidate( contextElement, point );
                    sourcePort = _getPortOnPoint( contextElement.getPorts(), point, tolerance );
                }

                if ( !sourcePort ) {
                    sourcePort = createNewPortForEdge( graphControl, diagramView, contextElement, point, tolerance );
                }

                // For the port is created from a candidate, the port can not be moved
                if ( inputMode.showPortCandidate ) {
                    sourcePort.setPinned( true );
                }

                inputMode.tmpSheetElementForEdgeCreation.push( sourcePort );
            } else if( contextElement instanceof window.SDF.Models.Port ) {
                // create edge from port
                sourcePort = contextElement;
            }
            if( sourcePort ) {
                diagramView.beginTransaction();
                var connection = null;
                var resolvedSourcePortposition = sourcePort.getResolvedSymbolConnectionPoint();
                if( resolvedSourcePortposition ) {
                    connection = new window.SDF.Models.Connection( sheet, sourcePort, null, null, null, resolvedSourcePortposition.x, resolvedSourcePortposition.y );
                } else {
                    connection = new window.SDF.Models.Connection( sheet );
                }
                connection.setAllowedTransformations( 1 );
                connection.setOwner( sheet );
                connection.setStart( sourcePort );

                var previewStyle = graphModel.config.defaults.edgeStyle;
                if( editHandler.getPreviewEdgeStyle ) {
                    previewStyle = editHandler.getPreviewEdgeStyle( graphModel, contextElement );
                }

                if( !previewStyle ) {
                    previewStyle = graphConstants.DefaultEdgeStyle;
                }

                graphControl.graph.setEdgeStyle( connection, previewStyle );
                diagramView.endTransaction();
                event.setNewSheetElement( connection );
                event.setHandled( true );

                inputMode.tmpSheetElementForEdgeCreation.push( connection );
            } else {
                event.setCancelled( true );
            }
        } else {
            event.setCancelled( true );
        }
    };
};

var elementCreated = function( graphControl ) {
    var graphModel = graphControl._graphModel;
    return function( event ) {
        // start performance timer
        var performanceTimer = performanceUtils.createTimer();

        var editHandler = graphControl.graphEditHandler;
        if( !editHandler ) {
            return;
        }

        var point = internalGraphUtils.getPointByLocation( event.getLocation() );
        var contextElement = event.getContextSheetElement();

        var inGroupContentArea = false;
        var isCreateBoundary = graphControl.inputMode.creatableItem === 'Boundary';

        // only allow node creation when click on empty space or inside group content area
        if( contextElement instanceof window.SDF.Models.Node ) {
            var isGroup = contextElement.isGroupingAllowed();
            inGroupContentArea = isGroup &&
                !graphUtils.isPointInNodeHeader( contextElement, point );
            if( !inGroupContentArea ) {
                return;
            }
        } else if( contextElement !== undefined ) {
            return;
        }

        if( isCreateBoundary ) {
            if( !contextElement ) {
                var defaultBoundaryStyle = graphModel.config.defaults.boundaryStyle;
                var defaultBoundarySize = graphModel.config.defaults.boundarySize;
                if( !defaultBoundarySize ) {
                    defaultBoundarySize = graphConstants.defaultBoundarySize;
                }

                if( editHandler.getPreviewBoundaryStyle ) {
                    defaultBoundaryStyle = editHandler.getPreviewBoundaryStyle( graphModel );
                }

                if( !defaultBoundaryStyle ) {
                    defaultBoundaryStyle = graphConstants.defaultBoundaryStyle;
                }

                var rect = {
                    x: point.x,
                    y: point.y,
                    width: defaultBoundarySize.width,
                    height: defaultBoundarySize.height
                };
                var boundary = graphControl.graph.createBoundary( rect, defaultBoundaryStyle );

                internalGraphUtils.publishGraphEvent( graphModel, 'awGraph.itemCreateHandled' );
                if( editHandler.createBoundary ) {
                    editHandler.createBoundary( graphModel, boundary, point );
                }
                event.setNewSheetElement( boundary );
                event.setHandled( true );
            }
        } else if( editHandler && ( !editHandler.canCreateNode || editHandler.canCreateNode( graphModel, contextElement, point ) ) ) {
            internalGraphUtils.publishGraphEvent( graphModel, 'awGraph.itemCreateHandled' );
            if( editHandler.createNode ) {
                editHandler.createNode( graphModel, contextElement, point );
            }

            event.setHandled( true );
        }

        // log performance time
        performanceTimer.endAndLogTimer( 'Graph Create Node', 'graphCreateNode' );
    };
};

var createNewPortForEdge = function( graphControl, diagramView, node, point, tolerance ) {
    var position = internalGraphUtils.getEdgeCreationEndPoint( node, point, tolerance );

    // the default target port is at center of the node
    var sheet = diagramView.getManager().getSheet();
    diagramView.beginTransaction();
    var newPort = new window.SDF.Models.Port( sheet, 0, 0, null, position[ 0 ], position[ 1 ], node );
    newPort.setParentSides( window.SDF.Utils.AllowedSides.ALL );
    newPort.setAllowedTransformations( 0 );
    node.addPort( window.SDF.Utils.Direction.BOTH, newPort );
    var portLocation = newPort.getLocation();
    if( portLocation ) {
        portLocation.setInput( window.SDF.Utils.CoordinateMode.ABSOLUTE, window.SDF.Utils.Axis.X, 0 );
        portLocation.setInput( window.SDF.Utils.CoordinateMode.ABSOLUTE, window.SDF.Utils.Axis.y, 0 );
        portLocation.setInput( window.SDF.Utils.CoordinateMode.PERCENT, window.SDF.Utils.Axis.X, position[ 0 ] / node.getWidthValue() );
        portLocation.setInput( window.SDF.Utils.CoordinateMode.PERCENT, window.SDF.Utils.Axis.y, position[ 1 ] / node.getHeightValue() );
    }
    diagramView.endTransaction();
    sheet.addSheetElement( newPort );

    return newPort;
};

var attached = function( graphControl ) {
    var graphModel = graphControl._graphModel;
    var diagramView = graphControl._diagramView;
    // eslint-disable-next-line complexity
    return function( event ) {
        // start performance timer
        var performanceTimer = performanceUtils.createTimer();

        var contextElement = event.getContextSheetElement();
        var targetElement = event.getTargetElement();
        var editHandler = graphControl.graphEditHandler;
        if( !editHandler || !targetElement || !contextElement ) {
            graphControl.detachingStartPort = null;
            graphControl.detachingEndPort = null;
            graphControl.detachingPath = [];
            event.setCancelled( true );
            return;
        }

        if( contextElement instanceof window.SDF.Models.Connection ) {
            // clean up temporary sheet elements before creating real edge
            var inputMode = graphControl.getInputMode();
            if( inputMode ) {
                inputMode.tmpSheetElementForEdgeCreation = [];
            }
            var targetPort = null;
            if( graphControl.detachingStartPort || graphControl.detachingEndPort ) {
                // reconnect
                if( targetElement instanceof window.SDF.Models.Port ) {
                    targetPort = targetElement;
                }

                var connectionEnd = event.getConnectionEnd();
                var end = null;
                var oldPort = null;
                if( connectionEnd === graphConstants.ConnectionEnd.START ) {
                    if( targetPort ) {
                        diagramView.beginTransaction();
                        contextElement.setStart( targetPort );
                        diagramView.endTransaction();
                    }
                    end = 'source';
                    oldPort = graphControl.detachingStartPort;
                } else if( connectionEnd === graphConstants.ConnectionEnd.END ) {
                    if( targetPort ) {
                        diagramView.beginTransaction();
                        contextElement.setEnd( targetPort );
                        diagramView.endTransaction();
                    }
                    end = 'target';
                    oldPort = graphControl.detachingEndPort;
                }
                if( editHandler && editHandler.reconnectEdge ) {
                    editHandler.reconnectEdge( graphModel, contextElement, oldPort, graphControl.detachingPath, end, targetElement );
                }
            } else {
                // create
                if( targetElement instanceof window.SDF.Models.Port ) {
                    targetPort = targetElement;
                } else if( targetElement instanceof window.SDF.Models.Node ) {
                    var point = internalGraphUtils.getPointByLocation( event.getLocation() );
                    var tolerance = inputMode.endPointTolerance / diagramView.getCurrentZoomRatio();

                    if ( inputMode.showPortCandidate && editHandler.getNearestCandidate ) {
                        point = editHandler.getNearestCandidate( targetElement, point );
                        targetPort = _getPortOnPoint( targetElement.getPorts(), point, tolerance );
                    }

                    if ( !targetPort ) {
                        targetPort = createNewPortForEdge( graphControl, diagramView, targetElement, point, tolerance );
                    }

                    if ( inputMode.showPortCandidate ) {
                        targetPort.setPinned( true );
                    }
                }

                contextElement.setEnd( targetPort );

                // update edge path start&end points
                var allPoints = graphControl.graph.getEdgePosition( contextElement );
                var edgePathPoints = internalGraphUtils.trimPathToNodes( graphControl, contextElement, allPoints );

                // udpate start port position to edge start point
                var startPort = contextElement.getStart();
                var startPortPosition = graphControl.graph.getPortPosition( startPort );
                var startPoint = new window.SDF.Utils.Point( startPortPosition.x, startPortPosition.y );
                if( !_.isEqual( startPoint, edgePathPoints[ 0 ] ) && internalGraphUtils.isPortOnNodeBorder( graphControl, startPort, startPort.getOwner() ) ) {
                    if( graphControl._configData.autoRoutingTypeForPreview === graphConstants.AutoRoutingtype.STRAIGHT_LINE ) {
                        edgePathPoints[ 0 ] = startPoint;
                    } else {
                        edgePathPoints = _.concat( startPoint, edgePathPoints );
                    }
                }

                var endPortPosition = graphControl.graph.getPortPosition( targetPort );
                var endPoint = new window.SDF.Utils.Point( endPortPosition.x, endPortPosition.y );
                if( !_.isEqual( endPoint, edgePathPoints[ edgePathPoints.length - 1 ] ) && internalGraphUtils.isPortOnNodeBorder( graphControl, targetPort, targetElement ) ) {
                    if( graphControl._configData.autoRoutingTypeForPreview === graphConstants.AutoRoutingtype.STRAIGHT_LINE ) {
                        edgePathPoints[ edgePathPoints.length - 1 ] = endPoint;
                    } else {
                        edgePathPoints.push( endPoint );
                    }
                }
                graphControl.graph.setEdgePosition( contextElement, edgePathPoints );

                // incase edge broke with end point
                contextElement.getStart().setConnectionTrimPolicy( 1 );
                contextElement.getEnd().setConnectionTrimPolicy( 1 );

                internalGraphUtils.publishGraphEvent( graphModel, 'awGraph.itemCreateHandled' );
                if( editHandler && editHandler.createEdge ) {
                    editHandler.createEdge( graphModel, contextElement );
                }
            }

            event.setHandled( true );

            graphControl.detachingStartPort = null;
            graphControl.detachingEndPort = null;
            graphControl.detachingPath = [];
        }

        // log performance time
        performanceTimer.endAndLogTimer( 'Graph Create Edge', 'graphCreateEdge' );
    };
};

var geometryChange = function( graphControl ) {
    return function( event ) {
        var type = event.getPhase();
        if( type === graphConstants.ChangePhase.END ) {
            var edge = event.getEditConnection();

            if( edge && graphControl.detachingStartPort && graphControl.detachingEndPort ) {
                graphControl.detachingStartPort = null;
                graphControl.detachingEndPort = null;
                graphControl.detachingPath = [];
            }
        }
    };
};

var detaching = function( graphControl ) {
    var graphModel = graphControl._graphModel;

    return function( event ) {
        var detachingElement = event.getContextSheetElement();
        var editHandler = graphControl.graphEditHandler;
        var connectionEnd = event.getConnectionEnd();
        var end = null;
        if( connectionEnd === graphConstants.ConnectionEnd.START ) {
            end = 'source';
        } else if( connectionEnd === graphConstants.ConnectionEnd.END ) {
            end = 'target';
        }
        if( detachingElement && detachingElement instanceof window.SDF.Models.Connection && editHandler &&
            editHandler.canReconnectEdge( graphModel, end, detachingElement ) ) {
            graphControl.detachingStartPort = detachingElement.getStart();
            graphControl.detachingEndPort = detachingElement.getEnd();
            var geometry = detachingElement.getGeometry();
            graphControl.detachingPath = geometry.getPoints();
        } else {
            event.setCancelled( true );
            return;
        }
    };
};

var attaching = function( graphControl ) {
    var graphModel = graphControl._graphModel;
    // eslint-disable-next-line complexity
    return function( event ) {
        var attachingElement = event.getContextSheetElement();
        var targetElement = event.getTargetElement();
        var firstNode = null;
        var editHandler = graphControl.graphEditHandler;
        var inputMode = graphControl.inputMode;
        var connectionEnd = event.getConnectionEnd();
        var point = internalGraphUtils.getPointByLocation( event.getLocation() );
        var end = null;
        if( attachingElement && attachingElement instanceof window.SDF.Models.Connection ) {
            var firstPort = attachingElement.getStart();
            end = 'target';
            if( connectionEnd === graphConstants.ConnectionEnd.START ) {
                firstPort = attachingElement.getEnd();
                end = 'source';
            }

            firstNode = firstPort.getOwner();
        }

        var allowConnect = false;

        if( targetElement && targetElement instanceof window.SDF.Models.Node ) {
            var tolerance = inputMode.endPointTolerance / graphControl._diagramView.getCurrentZoomRatio();
            if( !internalGraphUtils.isValidatePointForCreateEdgeOnGroupNode( graphControl, targetElement, point, tolerance ) ) {
                event.setCancelled( true );
                return;
            }
        }

        // target candidate for edge reconnection
        if( attachingElement && targetElement && graphControl.detachingStartPort &&
            graphControl.detachingEndPort ) {
            if( editHandler &&
                !editHandler.canReconnectEdgeTo( graphModel, end, targetElement, attachingElement, point ) ) {
                if( graphControl.inputMode && graphControl.inputMode.graphCursorService ) {
                    graphControl.inputMode.graphCursorService
                        .setCurrentCursor( graphControl.inputMode.dragCursor );
                }
                event.setCancelled( true );
                return;
            }
            allowConnect = true;
            if( graphControl.inputMode && graphControl.inputMode.graphCursorService ) {
                graphControl.inputMode.graphCursorService
                    .setCurrentCursor( graphControl.inputMode.reconnectCursor );
            }
        } else if( targetElement &&
            ( targetElement instanceof window.SDF.Models.Node || targetElement instanceof window.SDF.Models.Port ) ) {
            if( editHandler && !editHandler.canCreateEdgeTo( graphModel, targetElement, attachingElement, point ) ) {
                event.setCancelled( true );
                return;
            }
            allowConnect = true;
        }

        if( targetElement ) {
            inputMode = graphControl.getInputMode();
            if( !inputMode ) {
                event.setCancelled( true );
                return;
            }
            var secondNode = null;
            if( targetElement instanceof window.SDF.Models.Port && allowConnect ) {
                secondNode = targetElement.getOwner();
                if( !inputMode.enableSelfLoopConnection && firstNode === secondNode || !targetElement.hasSymbol() ) {
                    if( graphControl.inputMode && graphControl.inputMode.graphCursorService ) {
                        graphControl.inputMode.graphCursorService
                            .setCurrentCursor( graphControl.inputMode.dragCursor );
                    }
                    event.setCancelled( true );
                    return;
                }
                event.setHandled( true );
                return;
            } else if( targetElement instanceof window.SDF.Models.Node && allowConnect ) {
                secondNode = targetElement;
                if( !inputMode.enableSelfLoopConnection && firstNode === secondNode ) {
                    if( graphControl.inputMode && graphControl.inputMode.graphCursorService ) {
                        graphControl.inputMode.graphCursorService
                            .setCurrentCursor( graphControl.inputMode.dragCursor );
                    }
                    event.setCancelled( true );
                    return;
                }

                if ( inputMode.showPortCandidate ) {
                    var bbox = targetElement.getBBox();
                    var svgStrTempl = inputMode.portCandidateSvgStr;
                    var svgHiStrTempl = inputMode.portHiCandidateSvgStr;
                    if ( !svgStrTempl ) {
                        svgStrTempl = graphConstants.PortCandidateTemplate.Default.Normal;
                    }
                    if ( !svgHiStrTempl ) {
                        svgHiStrTempl = graphConstants.PortCandidateTemplate.Default.Highlight;
                    }

                    // DF later than DF1926 upgraded the port candidate feature. The original workaround doesn't work any more.
                    var anchor = [ 0.5, 0.5 ];

                    var locArrs = [ new window.SDF.Utils.Point( bbox.x + bbox.width / 2, bbox.y ),  //middle top
                                    new window.SDF.Utils.Point( bbox.x + bbox.width, bbox.y + bbox.height / 2 ),    //middle right
                                    new window.SDF.Utils.Point( bbox.x + bbox.width / 2, bbox.y + bbox.height ),    //middle bottom
                                    new window.SDF.Utils.Point( bbox.x, bbox.y + bbox.height / 2 ) ];                 //middle left

                    var locDirs = [ new window.SDF.Utils.Vector( 0, -1 ),
                                    new window.SDF.Utils.Vector( 1, 0 ),
                                    new window.SDF.Utils.Vector( 0, 1 ),
                                    new window.SDF.Utils.Vector( -1, 0 ) ];

                    var info = new window.SDF.Utils.LocationIndicator( svgStrTempl, anchor, locArrs, [ 10, 10 ], svgHiStrTempl, locDirs, 1 );
                    event.setLocationIndicatorInfo( info );
                }

                event.setHandled( true );
                return;
            }
        }
        event.setCancelled( true );
    };
};


var renderCallback = function( graphControl, isOverlay ) {
    var graphModel = graphControl._graphModel;
    var diagramView = graphControl._diagramView;
    return function( event ) {
        var renderTargets = event.getRenderTargets();
        var resizeModeCode = window.SDF.Utils.RenderReason.SizeChange;
        var createModeCode = window.SDF.Utils.RenderReason.Create;

        var wrappedHeightChangedNodes = [];
        var hasCreatedNode = false;
        diagramView.beginTransaction();
        for( var index = 0; index < renderTargets.length; ++index ) {
            var renderTarget = renderTargets[ index ];
            var sheetElement = renderTarget.sheetElement;
            var renderStyle = renderTarget.symbolStyle;
            var svgElement = renderTarget.symbolVisual;
            if( renderStyle && sheetElement && svgElement ) {
                if( sheetElement instanceof window.SDF.Models.Node ) {
                    var renderReason = renderStyle.renderReason;
                    if( renderReason & createModeCode ) {
                        hasCreatedNode = true;
                    }

                    var textOverflow = sheetElement.style ? sheetElement.style.textOverflow : false;
                    if( !textOverflow || textOverflow === 'NONE' ) {
                        continue;
                    }

                    // apply wordWrapping
                    if( renderReason & resizeModeCode || renderReason & createModeCode ) {
                        var changedNode = graphControl._graphWordWrappingService.applyWordWrap(
                            graphControl.graphContainer, sheetElement );

                        if( changedNode ) {
                            if( isOverlay ) {
                                graphControl._graphOverlay.setHeightValue( changedNode.currentWrappedHeight );
                            } else {
                                wrappedHeightChangedNodes.push( changedNode );
                            }
                        }
                    }
                }
                if( graphModel.config.autoRotatePortIcon ) {
                    if( sheetElement && sheetElement instanceof window.SDF.Models.Port ) {
                        if( sheetElement.hasSymbol() ) {
                            _setPortImageRotation( graphControl, sheetElement );
                        }
                    }
                }
            }
        }
        diagramView.endTransaction();
        if( !isOverlay && wrappedHeightChangedNodes.length > 0 ) {
            graphControl._graphWordWrappingService.updateNodeHeightForWrapping( graphModel, wrappedHeightChangedNodes );

            internalGraphUtils.publishGraphEvent( graphModel, 'awGraph.wrappedHeightChanged', {
                wrappedHeightChangedNodes: wrappedHeightChangedNodes
            } );
        }

        if( hasCreatedNode && graphControl._createRenderCallback ) {
            graphControl._createRenderCallback();
        }
    };
};

var _setPortImageRotation = function( graphControl, port ) {
    if( !graphControl || !port || !port.getOwner() ) {
        return;
    }
    if( port.autoRotate === false ) {
        return;
    }

    var ownerNode = port.getOwner();
    var autoRotateMap = _.assign( _.clone( graphConstants.portRotateMap ), port.customRotateMap );
    if( internalGraphUtils.isPortOnNodeBorder( graphControl, port, ownerNode ) ) {
        var rotateAngle = NaN;
        var point = graphControl.graph.getPortPosition( port );
        // set rotation
        // port on right border
        if( point.x === ownerNode.getAnchorPositionX() + ownerNode.getWidthValue() ) {
            rotateAngle = autoRotateMap.Right;
        } else if( point.y === ownerNode.getAnchorPositionY() ) {
            // port on top border
            rotateAngle = autoRotateMap.Top;
        } else if( point.x === ownerNode.getAnchorPositionX() ) {
            // port on left border
            rotateAngle = autoRotateMap.Left;
        } else if( point.y === ownerNode.getAnchorPositionY() + ownerNode.getHeightValue() ) {
            // port on bottom border
            rotateAngle = autoRotateMap.Bottom;
        }
        // LCS-301244 - DYSON: Graphical Bug - Corrupted connection layout in diagramming
        // As DF handles port rotate is different with the layout does, fix it with symbol occurence rotation instead
        if( !Number.isNaN( rotateAngle ) ) {
            var portSymbolOcc = port.getSymbols();
            if( portSymbolOcc && portSymbolOcc.length > 0 ) {
                _.forEach( portSymbolOcc, function( symbolOcc ) {
                    symbolOcc.setRotation( rotateAngle );
                } );
            }
        }
    }
};

var selectionChanged = function( graphControl ) {
    return function( event ) {
        if( clickWithoutSelection && graphControl._graphModel.config.disableSelectionOnDbclick ) {
            graphControl.setSelected( event.getAddedElements(), false );
            return;
        }
        graphControl._onDeselectElements( event );
        graphControl._onSelectElements( event );

        internalGraphUtils.publishGraphEvent( graphControl._graphModel, 'awGraph.selectionChanged', {
            selected: event.getAddedElements(),
            unSelected: event.getRemovedElements(),
            isShiftKeyDown: event.getIsShiftKey(),
            isCtrlKeyDown: event.getIsCtrlKey(),
            isAltKeyDown: event.getIsAltKey()
        } );
    };
};

var viewportChanged = function( graphControl ) {
    return function( event ) {
        var zoom = event.getViewportData().scale;

        // DF didn't update the current zoom on diagram before fire OnViewportChanged event, so have to defer the node template update process to next cycle
        _.defer( function() {
            graphControl._switchNodeTemplate( zoom );
        } );
    };
};

var setHoverDropShadowStyle = function( graphControl, hoveredItem, flag ) {
    if( hoveredItem ) {
        var selected = graphControl.isSelected( hoveredItem );
        var itemType = hoveredItem.getItemType();
        if( itemType === 'Node' ) {
            var cssNodeStyle = flag ? 'aw-graph-node-filter-hover' : selected ? 'aw-graph-node-filter-selected' : 'aw-graph-node-filter';
            graphControl._setNodeDropShadowStyle( graphControl, hoveredItem, cssNodeStyle );
        } else if( itemType === 'Port' ) {
            var defaultPortStyle = graphControl._graphModel.config.defaults.portStyle;
            var normalStyle = defaultPortStyle.normalStyleClass;
            normalStyle = normalStyle ? normalStyle : 'aw-graph-port-filter';
            var hoverStyle = defaultPortStyle.hoverStyleClass;
            hoverStyle = hoverStyle ? hoverStyle : 'aw-graph-port-filter-hover';
            var selectedStyle = defaultPortStyle.selectedStyleClass;
            selectedStyle = selectedStyle ? selectedStyle : 'aw-graph-port-filter-selected';

            var cssPortStyle = flag ? hoverStyle : selected ? selectedStyle : normalStyle;
            graphControl.graph.setPortStyleClass( hoveredItem, cssPortStyle );
        }
    }
};

var hoverChanged = function( graphControl ) {
    return function( event ) {
        var hoveredItem = event.getNewElement();
        var unHoveredItem = event.getOldElement();

        var shadowEffects = graphControl._graphModel.config.shadowEffects;
        if( shadowEffects && shadowEffects.length === 0 ) {
            setHoverDropShadowStyle( graphControl, hoveredItem, true );
            setHoverDropShadowStyle( graphControl, unHoveredItem, false );
        }

        internalGraphUtils.publishGraphEvent( graphControl._graphModel, 'awGraph.hoverChanged', {
            hoveredItem: hoveredItem,
            unHoveredItem: unHoveredItem
        } );
    };
};

var queryTooltip = function( graphControl ) {
    var diagramView = graphControl._diagramView;
    var graphModel = graphControl._graphModel;
    return function( event ) {
        var element = event.getSheetElement();
        var pointOnView = diagramView.getSession().getMousePosition();
        var pointOnPage = graphUtils.viewToPageCoordinate( graphControl.graph, pointOnView );
        var commandElement = internalGraphUtils.getCommandElementByPoint( pointOnPage );
        // not show tooltip when hover on command on node
        if( commandElement ) {
            return;
        }
        if( graphControl.tooltipHandler ) {
            event.setTooltip( graphControl.tooltipHandler.getTooltip( element, graphModel ) );
        }
        event.setHandled( true );
    };
};

/**
 * private function to get the drag delta of DnD gesture
 *
 * @param {object} event OnPreTransformEnd
 * @return {PointD} transform delta
 */
var _getDragDelta = function( event ) {
    var transMatrix = event.getTransforms();
    var resultArray = [];
    if( transMatrix && transMatrix.length > 0 ) {
        for( var i = 0; i < transMatrix.length; i++ ) {
            resultArray.push( transMatrix[ i ].toArray() );
        }
    }
    if( resultArray.length > 0 ) {
        transMatrix = resultArray[ resultArray.length - 1 ];
        if( transMatrix.length > 8 ) {
            return {
                x: transMatrix[ 6 ],
                y: transMatrix[ 7 ]
            };
        }
    }
    return null;
};

// The handler for the OnPreTransformEnd event
var preTransformEnd = function( graphControl ) {
    var graphModel = graphControl._graphModel;
    return function( event ) {
        var dragEffect = event.getDragEffect();
        if( dragEffect && dragEffect !== 'none' ) {
            var cursorLocation = internalGraphUtils.getPointByLocation( event.getLocation() );
            var draggingItems = [].concat( event.getSheetElements() );
            var hoveredItem = event.getTargetElement();
            var overlappedItem = event.getOverlappedElements();
            if( !hoveredItem && overlappedItem && overlappedItem.length > 0 ) {
                hoveredItem = overlappedItem[ overlappedItem.length - 1 ];
            }

            if( graphControl.dragAndDropHandler.onGraphDrop( graphModel, draggingItems, hoveredItem, dragEffect
                    .toUpperCase(), cursorLocation, _getDragDelta( event ) ) ) {
                event.setHandled( true );
                event.setCancelled( true );
            }
        }
    };
};

/**
 * Get the valid the dragEffect for current effectAllowed when the gesture gets started from outside of graph
 *
 * none  The item may not be dropped.
 * copy  A copy of the source item may be made at the new location.
 * copyLink  A copy or link operation is permitted.
 * copyMove  A copy or move operation is permitted.
 * link  A link may be established to the source at the new location.
 * linkMove  A link or move operation is permitted.
 * move  An item may be moved to a new location.
 * all  All operations are permitted.
 * uninitialized  The default value when the effect has not been set, equivalent to all.
 *
 * Assigning any other value to effectAllowed has no effect and the old value is retained.
 * Internet Explorer will change the value to be lowercased; thus, linkMove will become linkmove, and so on.
 *
 * @param {Event} dndEvent - native DnD event
 * @returns {String} - compatible dragEffect with the effectAllowed.
 */
var getValidDropEffect = function( dndEvent ) {
    var effectAllowed = dndEvent.dataTransfer.effectAllowed.toLowerCase();
    switch ( effectAllowed ) {
        case 'all':
        case 'copylink':
        case 'copy':
        case 'copymove':
        case 'uninitialized': // LCS-301244 - DYSON: Graphical Bug - Corrupted connection layout in diagramming (on Firefox only)
            return 'copy';
        case 'link':
        case 'move':
            return effectAllowed;
        case 'linkmove':
            return 'move';
        default:
            return 'none';
    }
};

/**
 * Handle the OnDrag event
 *
 * @param {Object} graphControl instance of graph control
 * @param {Object} event on drag event
 * @param {array} draggingItems elements being dragged
 * @param {object} hoveredGraphItem the graph item being hovered on
 * @param {number} dragType type of drag
 * @param {array} outItems the items being hovered out
 */
var _handleOnDrag = function( graphControl, event, draggingItems, hoveredGraphItem, dragType, outItems ) {
    var graphModel = graphControl._graphModel;
    var cursorLocation = internalGraphUtils.getPointByLocation( event.getLocation() );
    var originalEvent = event.getOriginalEvent();

    switch ( dragType ) {
        case 0: // drag enter
            logSvc.info( 'Drag enter!' );
            break;
        case 1: // drag over
            // invoke the App's customized API
            if( graphControl.dragAndDropHandler.onGraphDragOver( graphModel, draggingItems, hoveredGraphItem,
                    'COPY', outItems, cursorLocation ) ) {
                event.setIsDropAccepted( true );
                originalEvent.dataTransfer.dropEffect = getValidDropEffect( originalEvent );
            } else {
                event.setIsDropAccepted( false );
                originalEvent.dataTransfer.dropEffect = 'none';
            }
            event.setHandled( true );
            break;
        case 2: // drop
            if( graphControl.dragAndDropHandler.onGraphDrop( graphModel, draggingItems, hoveredGraphItem, 'COPY',
                    cursorLocation, null ) ) {
                event.setIsDropAccepted( true );
            }
            event.setHandled( true );
            break;
        case 3: // drag leave
            logSvc.info( 'Drag leave!' );
            break;
        case 4: // drag start
            logSvc.info( 'Drag start!' );
            break;
        default:
            break;
    }
};

// The handler for the onDrag event
var drag = function( graphControl ) {
    return function( event ) {
        var draggingItems = dragAndDropService.getCachedSourceUids();
        var dragType = event.getDragType();
        var hoveredGraphItem = null;
        var outItems = [];
        var targetGraphItems = event.getTargetElements();
        if( targetGraphItems && targetGraphItems.length > 0 ) {
            var hoveredIndex = targetGraphItems.length - 1;
            hoveredGraphItem = targetGraphItems[ hoveredIndex ];

            // Only keep the top one as the target element
            if( hoveredIndex > 0 ) {
                for( var j = 0; j < hoveredIndex; j++ ) {
                    outItems.push( targetGraphItems[ j ] );
                }
            }
        }

        outItems = outItems.concat( event.getOutElements() );

        _handleOnDrag( graphControl, event, draggingItems, hoveredGraphItem, dragType, outItems );
    };
};

// register the handler for the OnTransformDelta event.
var transformDelta = function( graphControl ) {
    var graphModel = graphControl._graphModel;
    return function( event ) {
        var dragEffect = event.getDragEffect();
        var cursorLocation = internalGraphUtils.getPointByLocation( event.getLocation() );
        if( !dragEffect || dragEffect === 'none' ) {
            if( event.getTransformType() === 'scale' ) {
                var resizingElements = event.getSheetElements();
                _.forEach( resizingElements, function( resizingElement ) {
                    if( resizingElement.getItemType() === 'Node' ) {
                        handleUpdateHeaderHeight( graphControl, resizingElement );
                    }
                } );
            }
            return;
        }
        var sheetElements = event.getSheetElements();
        var draggingItems = [].concat( sheetElements );
        var hoveredGraphItem = null;
        var outItems = [];
        var targetGraphItems = event.getTargetElements();
        if( targetGraphItems && targetGraphItems.length > 0 ) {
            var hoveredIndex = targetGraphItems.length - 1;
            hoveredGraphItem = targetGraphItems[ hoveredIndex ];

            // Only keep the top one as the target element
            if( hoveredIndex > 0 ) {
                for( var j = 0; j < hoveredIndex; j++ ) {
                    outItems.push( targetGraphItems[ j ] );
                }
            }
        }

        outItems = outItems.concat( event.getOutElements() );

        // invoke the App's customized API
        var isDropAccepted = graphControl.dragAndDropHandler.onGraphDragOver( graphModel, draggingItems, hoveredGraphItem,
            dragEffect.toUpperCase(), outItems, cursorLocation );

        event.setDropTarget( hoveredGraphItem );
        event.setNewTransforms( event.getTransforms() );
        event.setIsDropAccepted( isDropAccepted );
        event.setHandled( true );
    };
};

var transformEnd = function( graphControl ) {
    return function( event ) {
        var sheetElements = event.getSheetElements();
        if( !sheetElements ) {
            return;
        }

        var graphModel = graphControl._graphModel;
        if( event.getTransformType() === 'translate' ) {
            internalGraphUtils.publishGraphEvent( graphModel, 'awGraph.graphItemsMoved', {
                items: sheetElements
            } );
        } else if( event.getTransformType() === 'scale' ) {
            graphControl.graph.update( function() {
                _.forEach( sheetElements, function( sheetElement ) {
                    if( sheetElement.getItemType() === 'Boundary' ) {
                        handleResizeBoundaries( sheetElement, true );
                    }
                } );
            } );

            internalGraphUtils.publishGraphEvent( graphModel, 'awGraph.graphItemsResized', {
                items: sheetElements
            } );
        }
    };
};

var transformStart = function( graphControl ) {
    var diagramView = graphControl._diagramView;
    var graphModel = graphControl._graphModel;

    return function( event ) {
        var elements = event.getSheetElements();
        var movableItems = graphModel.config.movableItems;
        for( var j = 0; j < elements.length; j++ ) {
            var sheetItem = elements[ j ];
            var typeName = sheetItem.getItemType();
            if( typeName === 'Port' && !sheetItem.getMoveStrategy() ) {
                // Set port move strategy
                sheetItem.setMoveStrategy( new window.SDF.Utils.PortMoveStrategy( sheetItem ) );
            }
            if( !movableItems || movableItems.indexOf( typeName ) === -1 ) {
                event.setCancelled( true );
                return;
            }
        }

        var isEdgeCreationMode = diagramView.getSheetConfigurationData().contextData
            .getConnectionCreationContext();
        if( isEdgeCreationMode ) {
            for( var i = 0; i < elements.length; i++ ) {
                // only check whether can move node
                var element = elements[ i ];
                if( element instanceof window.SDF.Models.Node || element instanceof window.SDF.Models.Port ) {
                    event.setCancelled( true );
                    return;
                }
            }
        }

        return _handleDragAndDropStart( graphControl, event );
    };
};

var handleUpdateHeaderHeight = function( graphControl, node ) {
    var groupGraph = graphControl.groupGraph;
    var graph = graphControl.graph;
    if( groupGraph.isGroup( node ) && ( graph.isNetworkMode() || !groupGraph.isExpanded( node ) ) ) {
        graphControl.updateHeaderHeight( node, node.getHeight() );
    }
};

/**
 * Get all edges which source/target node/port do not be contained in the group node
 * @param {array} draggingElements elements dragging
 * @returns {array} edges are not contained
 */
var getNoContainedEdges = function( draggingElements ) {
    if( draggingElements && draggingElements.length > 0 ) {
        var topElement = draggingElements[ 0 ];
        var allMembers = _.uniq( [].concat( draggingElements ).concat( topElement.getAllMembers() ) );

        var allPorts = _.reduce( allMembers, function( sum, item ) {
            if( item instanceof window.SDF.Models.Node ) {
                sum = sum.concat( item.getPorts() );
            }
            return sum;
        }, [] );

        allMembers = allMembers.concat( allPorts ).concat( topElement.getEdges() );

        return _.filter( allMembers, function( item ) {
            if( item instanceof window.SDF.Models.Connection ) {
                if( item.getStart() && allMembers.indexOf( item.getStart() ) === -1 ||
                    item.getEnd() && allMembers.indexOf( item.getEnd() ) === -1 ) {
                    return true;
                }
            }
        } );
    }
};

/**
 * Create the preview SVG element for DnD gesture
 *
 * @param {object} graphControl instance of graph control
 * @param {array} draggingElements elements are being dragged
 * @returns {object} DnD preview element or null
 */
var createDnDPreviewElement = function( graphControl, draggingElements ) {
    if( draggingElements && draggingElements.length > 0 ) {
        var diagramView = graphControl._diagramView;
        diagramView.beginTransaction();

        var topElement = draggingElements[ 0 ];
        var bbox = topElement.getBBox();
        var domString = topElement.getSVGDom( true, true, getNoContainedEdges( draggingElements ) );

        var svgElement = window.SDF.Models.SVG.create( domString );
        svgElement.bindTemplateToObject( domString, {} );
        var dndPreviewElement = window.SDF.Models.Node.createNode( topElement.getOwningSheet(),
            bbox.width, bbox.height, bbox.x, bbox.y, svgElement );

        diagramView.endTransaction();
        return [ dndPreviewElement ];
    }
    return null;
};

// Handle the drag and drop
var _handleDragAndDropStart = function( graphControl, event ) {
    var graphModel = graphControl._graphModel;

    if( !graphControl.dragAndDropHandler || !graphControl.dragAndDropHandler.onGraphDragStart ) {
        return;
    }
    var modifierKeyDown = event.getIsAltKey() || event.getIsCtrlKey() || event.getIsShiftKey();
    if( !modifierKeyDown ) {
        return;
    }

    var moveModifierKey = _getModifierKey( graphControl._graphModel, 'MOVE' );
    var copyModifierKey = _getModifierKey( graphControl._graphModel, 'COPY' );

    var elements = event.getSheetElements();

    // To check modifier key: move or copy
    if( internalGraphUtils.checkCommandModifierKey( moveModifierKey, event.getIsAltKey(), event.getIsShiftKey(), event
            .getIsCtrlKey() ) ) {
        if( graphControl.dragAndDropHandler.onGraphDragStart( graphModel, elements, 'MOVE' ) ) {
            event.setNewSheetElements( elements );
            event.setDragEffect( 'move' );
        } else {
            event.setCancelled( true );
        }
    } else if( internalGraphUtils.checkCommandModifierKey( copyModifierKey, event.getIsAltKey(), event.getIsShiftKey(),
            event.getIsCtrlKey() ) ) {
        if( graphControl.dragAndDropHandler.onGraphDragStart( graphModel, elements, 'COPY' ) ) {
            event.setNewSheetElements( createDnDPreviewElement( graphControl, elements ) );
            event.setDragEffect( 'copy' );
        } else {
            event.setCancelled( true );
        }
    }
    event.setHandled( true );
};

/**
 * Get the modifier key of DnD gesture
 *
 * @param {object} graphModel instance of graph control
 * @param {string} keyName - "MOVE" or "COPY"
 * @returns {string} drag and drop modify key
 *
 */
var _getModifierKey = function( graphModel, keyName ) {
    if( graphModel.config.dragAndDropModifierKey ) {
        switch ( keyName ) {
            case 'MOVE':
                if( Array.isArray( graphModel.config.dragAndDropModifierKey.move ) &&
                    graphModel.config.dragAndDropModifierKey.move.length > 0 ) {
                    return graphModel.config.dragAndDropModifierKey.move;
                }
                break;
            case 'COPY':
                if( Array.isArray( graphModel.config.dragAndDropModifierKey.copy ) &&
                    graphModel.config.dragAndDropModifierKey.copy.length > 0 ) {
                    return graphModel.config.dragAndDropModifierKey.copy;
                }
                break;
            default:
                break;
        }
    }
    return graphConstants.DefaultDnDModifierKey[ keyName ];
};

var keyDown = function( graphControl ) {
    return function( event ) {
        var isEdgeCreationMode = graphControl._diagramView.getSheetConfigurationData().contextData
            .getConnectionCreationContext();
        if( isEdgeCreationMode && event.getKeyCode() === graphConstants.KeyCodes.KEY_ESCAPE ) {
            var inputMode = graphControl.getInputMode();
            if( inputMode ) {
                inputMode.cancelEdgeCreation();
            }
        } else if( event.getKeyCode() === graphConstants.KeyCodes.KEY_DELETE ) {
            var isAltKeyDown = event.getIsAltKey();
            var isShiftKeyDown = event.getIsShiftKey();
            var isCtrlKeyDown = event.getIsCtrlKey();
            internalGraphUtils.publishGraphEvent( graphControl._graphModel, 'awGraph.deleteKeyDown', {
                isAltKey: isAltKeyDown,
                isShiftKey: isShiftKeyDown,
                isCtrlKey: isCtrlKeyDown
            } );
        }
    };
};

/**
 * Get the coordinate on the page when the event occurs
 *
 * @param {object} diagramView the current graph
 * @param {event} event the mouse event
 * @returns {point} coordinate of the mouse
 *
 */
var getMousePointOnPage = function( diagramView, event ) {
    var clickedElement = event.getSheetElement();
    var location = event.getRelativeLoc();

    if( clickedElement === null ) {
        clickedElement = diagramView.getManager().getElementByPoint( location );
    }

    if( clickedElement ) {
        var renderingPosition = clickedElement.getRenderingPosition();
        if( renderingPosition ) {
            location[ 0 ] += renderingPosition.x;
            location[ 1 ] += renderingPosition.y;
        }
    }

    var point = internalGraphUtils.getPointByLocation( location );
    return internalGraphUtils.sheetToPageCoordinate( diagramView, point );
};

var mouseDoubleClick = function( graphControl ) {
    return function( event ) {
        var pointOnPage = getMousePointOnPage( graphControl._diagramView, event );
        internalGraphUtils.publishGraphEvent( graphControl._graphModel, 'awGraph.doubleClicked', {
            item: event.getSheetElement(),
            position: pointOnPage
        } );
    };
};

var getDiagramView = function( graphControl, isOverlay ) {
    return isOverlay ? graphControl._graphOverlay.overlayDiagram : graphControl._diagramView;
};

var tap = function( graphControl, isOverlay ) {
    return function( event ) {
        var diagramView = getDiagramView( graphControl, isOverlay );
        var clickedElement = event.getSheetElement();
        var pointOnPage = getMousePointOnPage( diagramView, event );

        // hide overlay node on mouse click
        if( !isOverlay ) {
            graphControl.hideOverlayNode();
        }

        var isHandled = handleLeftClickedEvent( graphControl, clickedElement, pointOnPage, isOverlay );
        event.setHandled( isHandled );
    };
};

var touchHold = function( graphControl, isOverlay ) {
    return function( event ) {
        var diagramView = getDiagramView( graphControl, isOverlay );
        var clickedElement = event.getSheetElement();
        var pointOnPage = getMousePointOnPage( diagramView, event );

        // hide overlay node on mouse click
        if( !isOverlay ) {
            graphControl.hideOverlayNode();
        }

        var isHandled = handleRightClickedEvent( graphControl, clickedElement, pointOnPage, isOverlay );
        event.setHandled( isHandled );
    };
};

var isInMultipleSelection = function( config, keyForMultipleSelection, isShift, isCtrl, isAlt ) {
    if( !config.enableMultipleSelection ) {
        return false;
    }
    var keys = _.flattenDeep( keyForMultipleSelection );
    return isShift && _.indexOf( keys, 16 ) >= 0 ||
        isCtrl && _.indexOf( keys, 17 ) >= 0 ||
        isAlt && _.indexOf( keys, 18 ) >= 0;
};

var customSelectionChange = function( graphControl, clickedElement, event ) {
    if( graphControl ) {
        var inMultipleSelection = isInMultipleSelection( graphControl._graphModel.config,
            graphControl._configData.assistantKeysForMultipleSelect,
            event.getIsShiftKey(), event.getIsCtrlKey(), event.getIsAltKey() );
        var selectedItems = [];
        var oldSelectedItems = graphControl.getSelected();

        // If the mutliple selection command is inactive
        if( !inMultipleSelection && !clickWithoutSelection ) {
            if( clickedElement ) {
                selectedItems.push( clickedElement );
                oldSelectedItems = _.difference( oldSelectedItems, selectedItems );
            }

            graphControl._setSelectedStatus( selectedItems, oldSelectedItems );

            // Fire the event
            internalGraphUtils.publishGraphEvent( graphControl._graphModel, 'awGraph.selectionChanged', {
                selected: selectedItems,
                unSelected: oldSelectedItems,
                isShiftKeyDown: event.getIsShiftKey(),
                isCtrlKeyDown: event.getIsCtrlKey(),
                isAltKeyDown: event.getIsAltKey()
            } );
        }
    }
};

var mouseClick = function( graphControl, isOverlay ) {
    return function( event ) {
        var diagramView = getDiagramView( graphControl, isOverlay );
        var clickedElement = event.getSheetElement();
        var pointOnPage = getMousePointOnPage( diagramView, event );
        var mouseButton = event.getButton();

        // hide overlay node on mouse click
        if( !isOverlay ) {
            graphControl.hideOverlayNode();
        }

        var isHandled = false;
        if( mouseButton === graphConstants.KeyCodes.MOUSE_BUTTON_LEFT ) {
            if( graphControl._graphModel.config.disableSelectionOnDbclick ) {
                customSelectionChange( graphControl, clickedElement, event );
            }

            isHandled = handleLeftClickedEvent( graphControl, clickedElement, pointOnPage, isOverlay );
        } else if( mouseButton === graphConstants.KeyCodes.MOUSE_BUTTON_RIGHT ) {
            isHandled = handleRightClickedEvent( graphControl, clickedElement, pointOnPage, isOverlay );
        }
        event.setHandled( isHandled );
    };
};

/**
 *
 * @param {*} graphControl the graph control object
 * @param {*} node the node to edit
 * @param {*} editTextElement the text element in node to edit
 * @param {*} isOverlay is overlay graph node
 * @returns {Boolean} whether the left click event is handled
 */
var editNodeProperty = function( graphControl, node, editTextElement, isOverlay ) {
    var isHandled = false;
    if( graphControl.inputMode.editMode ) {
        var propertyName = editTextElement.getAttribute( 'data-property-name' );
        if( propertyName ) {
            var propertyValue = node.getProperty( propertyName );
            if( propertyValue ) {
                var propertyEditHandler = getNodePropertyEditHandler( graphControl, isOverlay );
                if( propertyEditHandler ) {
                    var editHandler = graphControl.graphEditHandler;
                    if( editHandler && editHandler.preNodeEdit ) {
                        editHandler.preNodeEdit( graphControl._graphModel, node, propertyName ).then(
                            function() {
                                propertyEditHandler.editNodeProperty( node, editTextElement, propertyName,
                                    propertyValue );
                            }
                        );
                    } else {
                        propertyEditHandler.editNodeProperty( node, editTextElement, propertyName,
                            propertyValue );
                    }

                    isHandled = true;
                }
            }
        }
    }

    return isHandled;
};

/**
 * Handle the label edit
 *
 * @param {graphControl} graphControl - instance of graph control
 * @param {SheetElement} clickedLabel - the label being clicked
 * @returns {boolean} whether the left click event is handled
 */
var handleLabelEdit = function( graphControl, clickedLabel ) {
    var owner = clickedLabel.getOwner();
    var displayText = clickedLabel.getText();

    var isHandled = false;
    if( owner ) {
        var screenCoor = graphUtils.sheetToScreenCoordinate( graphControl.graph, clickedLabel
            .getRenderingPosition() );
        graphControl._labelEditHandler.showLabelInlineEditor( screenCoor, clickedLabel, displayText, null,
            '' );
        isHandled = true;
    }

    return isHandled;
};

/**
 * Handle Node (boundary/column layout) label edit.
 * @param {Object} graphControl the graph control
 * @param {Object} clickedLabel boundary label
 * @param {Object} ownerType owner type of the label
 * @returns {boolean} whether the left click event is handled
 */
var handleNodeLabelEdit = function( graphControl, clickedLabel, ownerType ) {
    var owner = clickedLabel.getOwner();
    var displayText = clickedLabel.getText();
    var isHandled = false;
    if( owner ) {
        var maxWidth = owner.getWidthValue();
        var zoomFactor = graphControl._diagramView.getCurrentZoomRatio();
        // for auto line feed
        var cssString = 'white-space:normal;border:none;' +
            'max-width:' + maxWidth * zoomFactor + 'px;';
        if( ownerType === 'Boundary' ) {
            var maxHeight = owner.getHeightValue();
            cssString += 'max-height:' + maxHeight * zoomFactor + 'px;';
        }
        var screenCoor = graphUtils.sheetToScreenCoordinate( graphControl.graph, clickedLabel
            .getRenderingPosition() );

        graphControl._labelEditHandler.showLabelInlineEditor( screenCoor, clickedLabel, displayText, null,
            cssString );
        isHandled = true;
    }

    return isHandled;
};

/**
 * Handle graph left clicked event.
 *
 * @param {object} graphControl instance of graph control
 * @param {object} clickedItem item being clicked
 * @param {point} pointOnPage point on page
 * @param {boolean} isOverlay flag for overlay
 * @returns {boolean} whether the left click event is handled
 */
var handleLeftClickedEvent = function( graphControl, clickedItem, pointOnPage, isOverlay ) {
    var graphModel = graphControl._graphModel;

    if( clickedItem ) {
        // Handle the click event on the graph
        var inputMode = graphControl.getInputMode();
        var itemType = clickedItem.getItemType();

        // So far, in edit mode the label always is editable. So just check editMode is enough
        if( inputMode.editMode ) {
            if( inputMode.enableLabelEdit && itemType === 'Label' ) {
                var ownerType = clickedItem.getOwner().getItemType();
                if( ownerType === 'Boundary' || ownerType === 'Node' ) {
                    return handleNodeLabelEdit( graphControl, clickedItem, ownerType );
                }
                return handleLabelEdit( graphControl, clickedItem );
            } else if( itemType === 'Node' ) {
                clickWithoutSelection = true;
                // edit node property when click on editable text element
                var editTextElement = internalGraphUtils.getEditableTextElement( pointOnPage );
                if( editTextElement ) {
                    return editNodeProperty( graphControl, clickedItem, editTextElement,
                        isOverlay );
                }
            }
        }

        // perform command action when click on the tile command
        if( itemType === 'Node' ) {
            var commandElement = internalGraphUtils.getCommandElementByPoint( pointOnPage );
            if( commandElement ) {
                var commandId = commandElement.getAttribute( 'data-command-id' );
                if( commandId ) {
                    // set command target as the master node if click on overlay node
                    var commandTargetNode = clickedItem;
                    if( isOverlay ) {
                        commandTargetNode = graphControl.overlayMasterNode;
                    }

                    internalGraphUtils.publishGraphEvent( graphModel, 'awGraph.executeTileCommand', {
                        commandId: commandId,
                        node: commandTargetNode,
                        commandElement: commandElement
                    } );
                    return true;
                }
            }
        }
    } else if( isOverlay ) {
        logSvc.error( 'The clicked graph item should be a node for overlay graph.' );
    } else {
        // If click on the blank area of the graph
        clickWithoutSelection = false;
    }

    // fire left clicked event on main graph
    internalGraphUtils.publishGraphEvent( graphModel, 'awGraph.leftClicked', {
        item: clickedItem,
        position: pointOnPage
    } );

    return false;
};

/**
 * Handle graph right clicked event.
 *
 * @returns {boolean} whether the right click event is handled
 */
var handleRightClickedEvent = function( graphControl, clickedItem, pointOnPage, isOverlay ) {
    // right click on a node
    var graphModel = graphControl._graphModel;
    if( clickedItem && clickedItem instanceof window.SDF.Models.Node ) {
        // perform action of command 'data-command-id2' when right click on the tile command
        var commandElement = internalGraphUtils.getCommandElementByPoint( pointOnPage );
        if( commandElement ) {
            var commandId = commandElement.getAttribute( 'data-command-id2' );
            if( commandId ) {
                // set command target as the master node if click on overlay node
                var commandTargetNode = clickedItem;
                if( isOverlay ) {
                    commandTargetNode = graphControl.overlayMasterNode;
                }

                internalGraphUtils.publishGraphEvent( graphModel, 'awGraph.executeTileCommand', {
                    commandId: commandId,
                    node: commandTargetNode,
                    commandElement: commandElement
                } );
                return true;
            }
        }

        // show overlay graph when right click on main graph node
        if( !isOverlay && graphModel.config.showNodeOverlay &&
            graphControl._diagramView.getCurrentZoomRatio() < graphControl.overlayZoomThreshold ) {
            graphControl.graphOverlayHandler.setOverlayNode( graphModel, clickedItem, pointOnPage );
            return true;
        }
    } else if( isOverlay ) {
        logSvc.error( 'The clicked graph item should be a node for overlay graph.' );
    }

    internalGraphUtils.publishGraphEvent( graphModel, 'awGraph.rightClicked', {
        item: clickedItem,
        position: pointOnPage
    } );

    return false;
};

/**
 * Handle resized boundaries
 *
 * @param resizedBoundaries the resized boundary
 */
var handleResizeBoundaries = function( resizedBoundary, updateOutOfDate ) {
    if( !resizedBoundary ) {
        return;
    }
    var label = resizedBoundary.getLabel();
    if( label ) {
        var symOcc = label.getSymbols()[ 0 ];
        if( symOcc ) {
            symOcc.setWidth( resizedBoundary.getWidthValue() );
            var symbol = symOcc.getSymbol();
            if( symbol && updateOutOfDate ) {
                symbol.setSizeOutOfDate();
            }
        }
    }
};

var getNodePropertyEditHandler = function( graphControl, isOverlay ) {
    var handler = null;
    if( isOverlay ) {
        handler = graphControl.overlayNodePropertyEditHandler;
    } else {
        handler = graphControl.nodePropertyEditHandler;
    }
    return handler;
};

/**
 * If the user modifies the text via overlay node, call this API to update the associate node in the graph
 *
 * @param {graphControl} graphControl the graphControl
 * @param {SDF.Models.Node} editingNode graph node assicated with the node editing
 * @param {String} editingPropertyName name of property in editing
 * @param {String} committedPropertyValue value of property
 */
var updateMainNodeText = function( graphControl, editingNode, editingPropertyName, committedPropertyValue ) {
    if( committedPropertyValue && _.trim( committedPropertyValue ) !== '' ) {
        graphControl._diagramView.update( function() {
            var newBindData = {};
            newBindData[ editingPropertyName ] = committedPropertyValue;
            graphControl.graph.updateNodeBinding( editingNode, newBindData );
        } );
    }
};

/**
 * Dispathing TextChangeEvent
 *
 */
var updateTextChange = function( graphControl, isOverlay ) {
    var diagramView = graphControl._diagramView;
    return function( event ) {
        var argOwner = event.getOwner();
        if( event ) {
            var itemType = argOwner.getItemType();
            var propertyValue = event.getValue();
            var nodePropertyEditHandler = getNodePropertyEditHandler( graphControl, isOverlay );

            if( itemType === 'Node' ) {
                if( argOwner instanceof window.SDF.Models.Node ) {
                    if( event.getPhase() === window.SDF.Utils.TextChangeEventPhase.PreUpdate ) {
                        if( graphControl.overlayMasterNode &&
                            nodePropertyEditHandler.getDiagramView() !== diagramView ) {
                            updateMainNodeText( graphControl, graphControl.overlayMasterNode,
                                nodePropertyEditHandler.editingPropertyName, propertyValue );
                        }
                    } else if( event.getPhase() === window.SDF.Utils.TextChangeEventPhase.PostUpdate ) {
                        nodePropertyEditHandler.commitNodeEdit( argOwner, propertyValue, graphControl.overlayMasterNode );
                    } else if( event.getPhase() === window.SDF.Utils.TextChangeEventPhase.Cancel ) {
                        nodePropertyEditHandler.cancelNodeEdit( argOwner, graphControl.overlayMasterNode );
                    }
                }
            } else if( itemType === 'Label' ) {
                var labelEditHandler = graphControl._labelEditHandler;

                switch ( event.getPhase() ) {
                    case window.SDF.Utils.TextChangeEventPhase.PreUpdate:
                        break;
                    case window.SDF.Utils.TextChangeEventPhase.PostUpdate:
                        labelEditHandler.commitLabelEdit( argOwner, propertyValue );
                        break;
                    case window.SDF.Utils.TextChangeEventPhase.Cancel:
                        break;
                    default:
                        break;
                }
            }
        }
    };
};

/**
 * Create graph event manager for graph control
 * @param {GraphControl} graphControl the graph control instance
 * @returns {GraphEventManager} graph event manager instance
 */
export let createGraphEventManager = function( graphControl ) {
    return new GraphEventManager( graphControl );
};

export default {
    createGraphEventManager
};

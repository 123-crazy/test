// Copyright (c) 2019 Siemens
/* global
 define
 */
/**
 * This module provides graph operation support
 *
 * @module js/graphControlFactory
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import graphInputModeFactory from 'js/graphInputModeFactory';
import editPropertyService from 'js/editPropertyService';
import graphTemplateService from 'js/graphTemplateService';
import dragAndDropService from 'js/dragAndDropService';
import graphLabelEditService from 'js/graphLabelEditService';
// import require from 'require';
import $ from 'jquery';
import _ from 'lodash';
import declUtils from 'js/declUtils';
import logger from 'js/logger';
import dfCommands from 'js/diagramFoundationCommands';
import hotspotUtil from 'js/hotspotEdgeUtils';
import graphStyleUtils from 'js/graphStyleUtils';
import graphConstants from 'js/graphConstants';

import graphWordWrappingService from 'js/graphWordWrappingService';
import internalGraphUtils from 'js/internalGraphUtils';
import graphEventManager from 'js/graphEventManager';
import GraphOverlay from 'js/GraphOverlay';

/**
 * Define public API
 *
 * @exports js/graphControlFactory
 */
var exports = {};

/**
 * Clear commands state. NXLE imports new feature (command state) to meet its special requirements for import
 * mode. GC needs to clear these states in its initialization.
 */
var clearCommandStates = function( diagramView ) {
    _.each( dfCommands, function( commandName ) {
        var command = internalGraphUtils.getDFCommand( diagramView, commandName );
        if( command ) {
            command.states = [];
        }
    } );
};

var _setAutoRoutingType = function( configData, autoRoutingType, SDF ) {
    // set the route type of global layout
    configData.contextData.setConnectionCreationRoutingType( SDF.Layout.RoutingType.Orthogonal );
    configData.autoRoutingType = autoRoutingType;

    if( autoRoutingType === graphConstants.AutoRoutingtype.STRAIGHT_LINE ) {
        configData.contextData.setConnectionCreationRoutingType( SDF.Layout.RoutingType.StraightLine );
    }
};

var _setAutoRoutingTypeForPreview = ( configData, autoRoutingType ) => {
    configData.autoRoutingTypeForPreview = autoRoutingType;
};

var _initializeEdgeRoutingType = function( graphModel, configData, SDF ) {
    // the default is Simple Orthogonal Path
    var autoRoutingType = graphConstants.AutoRoutingtype.HV_SEGMENT0;
    configData.autoRoutingTypeForPreview = graphConstants.AutoRoutingtype.HV_SEGMENT0;

    if( graphModel.config.autoEdgeRoutingType ) {
        autoRoutingType = graphConstants.AutoRoutingtype[ graphModel.config.autoEdgeRoutingType ];
        configData.autoRoutingTypeForPreview = autoRoutingType;
    }
    _setAutoRoutingType( configData, autoRoutingType, SDF );
};

/**
 * Initialize the overlay node handler asynchronously.
 * @param {GraphControl} graphControl the graph control object
 * @returns the promise resolved when overlay handler is created.
 */
var initOverlayHandler = function( graphControl ) {
    var graphModel = graphControl._graphModel;
    graphControl._graphOverlay = new GraphOverlay( graphControl.graphContainer, graphControl._diagramView );
    graphControl.graph._graphOverlay = graphControl._graphOverlay;

    graphControl.graphOverlayHandler = {
        setOverlayNode: function( graphModel, clickedElement, pointOnPage ) {
            graphControl.setOverlayNode( clickedElement, pointOnPage );
        }
    };

    graphControl.overlayNodePropertyEditHandler = editPropertyService
        .createPropertyEditHandler( graphModel, graphControl._graphOverlay.overlayDiagram );

    // support edit property on overlay node
    graphControl._eventManager.registerEvents( [ 'OnMouseClick', 'OnTextChange', 'OnRenderCallback' ], true );

    // init customized node overlay handler
    var nodeOverlayConfig = graphModel.config.nodeOverlay;
    if( graphModel.config.showNodeOverlay && nodeOverlayConfig && nodeOverlayConfig.graphOverlayHandler ) {
        declUtils.loadImports( [ nodeOverlayConfig.graphOverlayHandler ], AwPromiseService.instance ).then( function( handlers ) {
            if( handlers && handlers.length > 0 && handlers[ 0 ].setOverlayNode !== undefined ) {
                graphControl.graphOverlayHandler = handlers[ 0 ];
            } else {
                logger.error( 'Failed to install customized overlay node handler. The handler should have "setOverlayNode" function.' );
            }
        }, function( error ) {
            logger.error( 'Failed to install customized overlay node handler.', error );
        } );
    }
};

/**
 * Configure the edge line jumper on graph.
 * @param {Sheet} sheet the diagram sheet
 * @param {Object} jumperConfig the jumper configuration object
 */
var configJumper = function( sheet, jumperConfig ) {
    if( jumperConfig ) {
        // set jumper priority
        var jumperPriority = jumperConfig.jumperPriority;
        var priority = graphConstants.JumperPriorityType.VERTICAL;
        if( jumperPriority ) {
            if( graphConstants.JumperPriorityType.hasOwnProperty( jumperPriority ) ) {
                priority = graphConstants.JumperPriorityType[ jumperPriority ];
            } else {
                logger.warn( 'The jumper priority was not configured correct, use default! ' );
            }
        } else {
            logger.info( 'The jumper priority was not configured, use default "VERTICAL"! ' );
        }

        sheet.setJumperPriorityType( priority );

        // set jumper size
        var jumperSize = jumperConfig.jumperSize;
        var jumperWidth = jumperSize && jumperSize.width !== undefined ? jumperSize.width : graphConstants.DefaultJumperSize.width;
        var jumperHeight = jumperSize && jumperSize.height !== undefined ? jumperSize.height : graphConstants.DefaultJumperSize.height;
        sheet.setJumperHeight( jumperWidth );
        sheet.setJumperWidth( jumperHeight );

        // set jumper type
        var type = graphConstants.JumperType.ARC;
        var jumperType = jumperConfig.jumperType;
        if( jumperType ) {
            if( graphConstants.JumperType.hasOwnProperty( jumperType ) ) {
                type = graphConstants.JumperType[ jumperType ];
            } else {
                logger.warn( 'The jumper type was not configured correct, use default "ARC"! ' );
            }
        }
        sheet.setJumperType( type );
    }
};

var setPreviewPortStyle = function( graphModel, createPortCommand ) {
    var portDefaultStyle = graphModel.config.defaults.portStyle;

    if( !portDefaultStyle ) {
        portDefaultStyle = graphConstants.DefaultPortStyle;
    }

    if( portDefaultStyle ) {
        createPortCommand.setPortSize( portDefaultStyle.size );

        var portStyle = createPortCommand.getPortStyle();
        if( portStyle ) {
            var fillColor = graphStyleUtils.parseColor( portDefaultStyle.fillColor );
            var strokeColor = graphStyleUtils.parseColor( portDefaultStyle.borderColor );
            portStyle.setStrokeColor( strokeColor );
            portStyle.setFillColor( fillColor );
            portStyle.setStrokeWidth( portDefaultStyle.thickness );
        }
    }
};

var setPortCreator = function( graphControl ) {
    var graphModel = graphControl._graphModel;
    var diagramView = graphControl._diagramView;
    // set the callback for the customized create port command.
    var createPortCommand = internalGraphUtils.getDFCommand( diagramView, dfCommands.CREATE_PORT_COMMAND );
    if( createPortCommand ) {
        setPreviewPortStyle( graphModel, createPortCommand );

        createPortCommand.setPortCreator( function( owner, location ) {
            var editHandler = graphControl.graphEditHandler;
            if( !editHandler ) {
                return;
            }

            if( owner.getItemType() === 'Boundary' ) {
                return;
            }
            // Create the port base the default style
            var position = {
                x: location.getEvaluatedX(),
                y: location.getEvaluatedY()
            };

            var previewStyle = graphModel.config.defaults.portStyle;
            if( editHandler.getPreviewPortStyle ) {
                previewStyle = editHandler.getPreviewPortStyle( graphModel );
            }
            if( !previewStyle ) {
                previewStyle = graphConstants.DefaultPortStyle;
            }
            var port = graphControl.graph.addPortAtLocationWithStyle( owner, position, previewStyle );

            // Set port move strategy
            port.setMoveStrategy( new window.SDF.Utils.PortMoveStrategy( port ) );

            internalGraphUtils.publishGraphEvent( graphModel, 'awGraph.itemCreateHandled' );
            if( editHandler.createPort ) {
                editHandler.createPort( graphModel, port, owner, position );
            }

            // Reset the port location to relative if there is no layout active
            if( !graphControl.layout.isActive() ) {
                internalGraphUtils.convertAbsPortPosition2Rel( port );
            }
        } );
    }
};

/**
 * Define layout supported graph API
 *
 * @class
 * @param {Graph} graph - The graph object
 * @param {HTMLElement} graphContainer - The graph widget container DOM element
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
// eslint-disable-next-line complexity
export let GraphControl = function( graph, graphContainer ) {
    var self = this;
    var SDF = window.SDF;
    if( !SDF ) {
        throw 'Failed to create GraphControl instance. Diagram Foundation module has not been loaded.';
    }

    if( !graph ) {
        throw 'Failed to create GraphControl instance. The argument "graph" is invalid.';
    }

    var graphModel = graph._graphModel;
    var diagramView = graph._diagramView;
    this._graphModel = graphModel;
    this._diagramView = diagramView;

    var configData = diagramView.getSheetConfigurationData();
    this._session = diagramView.getSession();
    this.graph = graph;
    this.graphContainer = graphContainer;
    this._configData = configData;

    this.editPropertyService = editPropertyService;
    this.dragAndDropService = dragAndDropService;
    this._graphWordWrappingService = graphWordWrappingService;
    this._dfCommands = dfCommands;
    this._eventManager = graphEventManager.createGraphEventManager( self );

    clearCommandStates( diagramView );

    configData.autoRotatePortIcon = graphModel.config.autoRotatePortIcon ? graphModel.config.autoRotatePortIcon : false;

    // Disable the bends handler visibility of the connection
    configData.showConnectionHoverHandles = false;
    // Change the scale stroke width during scaling, such as zoom, resize.
    configData.vectorEffectOption = 0;
    // Disable the handle visibility of connection when it gets hovered.
    var handleStyle = configData.handleStyle;
    handleStyle.connectionBendingHandler.isVisible = false;
    handleStyle.moveHandler.isVisible = false;
    handleStyle.resizeHandler.isVisible = false;
    handleStyle.rotateHandler.isVisible = false;
    handleStyle.rotateCenterHandler.isVisible = false;
    handleStyle.connectionEndHandler.isVisible = false;
    configData.textInputUnfocusCommit = true;
    configData.transformImmediateUpdate = true;
    // enable F5 key
    configData.disabledHotkey = [];
    // set tooltip location offset
    configData.tooltipLocationXYOffset = [ 0, 20 ];
    if( graphModel.config.tooltipOffset ) {
        if( graphModel.config.tooltipOffset.x ) {
            configData.tooltipLocationXYOffset[ 0 ] = graphModel.config.tooltipOffset.x;
        }
        if( graphModel.config.tooltipOffset.y ) {
            configData.tooltipLocationXYOffset[ 1 ] = graphModel.config.tooltipOffset.y;
        }
    }
    if( graphModel.config.tooltipHandler ) {
        // enable query tooltip
        configData.selectionPreferencesData.setTooltipOnRollover( true );

        // set tooltip delay time
        if( graphModel.config.tooltipDelayTime ) {
            configData.rolloverDelay[ 1 ] = graphModel.config.tooltipDelayTime;
        } else {
            // by default set the tooltip delay time 100ms
            configData.rolloverDelay[ 1 ] = 100;
        }
        configData.selectionPreferencesData.setHighlightRolloverDelay( 1 );
    } else {
        // disable query tooltip
        configData.selectionPreferencesData.setTooltipOnRollover( false );
    }

    configData.selectionPreferencesData.setHighlightSelectionOnRollover( false );
    configData.selectionPreferencesData.setChangeColorOnSelection( false );

    // set the minimum segment length. It cannot be too small like 5 which will cause performance issue
    if( graphModel.config.minSegmentLength ) {
        configData.minSegmentLength = graphModel.config.minSegmentLength;
        if( graphModel.config.layout.config && !graphModel.config.layout.config.minSegmentLength ) {
            graphModel.config.layout.config.minSegmentLength = graphModel.config.minSegmentLength;
        }
    }

    this._dfTypeMaps = {
        Node: SDF.Models.Node,
        Boundary: SDF.Models.Node,
        Edge: SDF.Models.Connection,
        Port: SDF.Models.Port,
        Label: SDF.Models.Annotation,
        Location: SDF.Models.Location
    };

    this._diagramView.suppressNestedNodeAutoEnlarge( graphModel.config.suppressBoundaryUpdateOnNestedNodeChanged || false );
    this._diagramView.suppressAutoRouting( graphModel.config.suppressRoutingOnConnectionChanged || false );

    // enable async rendering
    diagramView.enableAsynchronousRendering( true );

    // keep zoom ratio when resize view port
    var viewConfig = this._session.getViewConfig();
    viewConfig.keepZoomRatio = true;

    diagramView.disableCommand( dfCommands.PAN_COMMAND );
    diagramView.disableCommand( dfCommands.DELETE_COMMAND );
    diagramView.enableCommand( dfCommands.CUSTOM_PAN_COMMAND );

    // The start port of detaching edge
    this.detachingStartPort = null;

    // The end port of detaching edge
    this.detachingEndPort = null;

    // The detaching edge path
    this.detachingPath = [];

    this.graphItemPreselectionHandlers = [];

    // apply configuration to graph control
    this.setFitViewPosition( graphModel.config.fitViewPosition );

    _initializeEdgeRoutingType( graphModel, configData, SDF );

    var sheet = diagramView.getManager().getSheet();
    if( graphModel.config.enableJumper ) {
        configJumper( sheet, graphModel.config.jumper || {} );
        sheet.setAllowJumpers( true );
    } else {
        sheet.setAllowJumpers( false );
    }

    // set minimum and maximum zoom ratio
    configData.minZoomRatio = 0;
    configData.maxZoomRatio = 1;

    var minZoom = graphModel.config.minZoom;
    var maxZoom = graphModel.config.maxZoom;
    if( minZoom ) {
        if( _.isNumber( minZoom ) ) {
            configData.minZoomRatio = minZoom;
        } else {
            logger.error( 'Graph configuration error: the min zoom value ', minZoom,
                'is invalid, should be a number.' );
        }
    }

    if( maxZoom ) {
        if( _.isNumber( maxZoom ) ) {
            configData.maxZoomRatio = maxZoom;
        } else {
            logger.error( 'Graph configuration error: the max zoom value ', maxZoom,
                'is invalid, should be a number.' );
        }
    }
    self.setMoveWithoutSelection( graphModel.config.moveWithoutSelection );

    // install input mode
    var activeInputMode = {};
    if( graphModel.inputModes && graphModel.config.inputMode ) {
        activeInputMode = graphModel.inputModes[ graphModel.config.inputMode ];

        if( !activeInputMode ) {
            logger.warn( 'Graph input mode "' + graphModel.config.inputMode + '" is not defined.' );
            activeInputMode = {};
        }
    }
    if( graphModel.config.disableSelectionOnDbclick ) {
        activeInputMode.disableSelectionOnDbclick = true;
    }
    self.updateInputMode( activeInputMode );

    self.overlayZoomThreshold = 0.9;
    if( graphModel.config.nodeOverlay && graphModel.config.nodeOverlay.zoomThreshold ) {
        self.overlayZoomThreshold = graphModel.config.nodeOverlay.zoomThreshold;
    }
    self.enableAutoPan( graphModel.config.enableAutoPan );
    self.enableMarqueeSelection( graphModel.config.enableMarqueeSelection );

    self.enableMultipleSelection( graphModel.config.enableMultipleSelection );

    // init node edit handler
    this.nodePropertyEditHandler = editPropertyService
        .createPropertyEditHandler( graphModel, diagramView );

    // initialize overlay graph
    if( graphModel.config.showNodeOverlay ) {
        initOverlayHandler( self );
    }

    this.editingPropertyName = null;
    this._labelEditHandler = graphLabelEditService.createLabelInlineEditor( graphModel, diagramView );

    var previousZoom = diagramView.getCurrentZoomRatio();
    // Switch node template when zoom ratio changed for the nodes with multiple level template style.
    // zoom: the current zoom ratio
    this._switchNodeTemplate = function( zoom ) {
        var checkedZoomPartitions = {};
        _.forEach( self.graph.getNodes(), function( node ) {
            var style = node.style;
            if( !style || !style.partitionZooms ) {
                return;
            }

            // the same partition zooms will only need be checked once
            var partitionZoomsKey = String( style.partitionZooms );
            var needSwitchTemplate = checkedZoomPartitions[ partitionZoomsKey ];
            if( needSwitchTemplate === undefined ) {
                var i = 0;
                var j = 0;
                for( var k = 0; k < style.partitionZooms.length && i === j; k++ ) {
                    var threshold = style.partitionZooms[ k ];
                    if( zoom > threshold ) {
                        i++;
                    }

                    if( previousZoom > threshold ) {
                        j++;
                    }
                }

                needSwitchTemplate = i !== j;
                checkedZoomPartitions[ partitionZoomsKey ] = needSwitchTemplate;
            }

            if( needSwitchTemplate ) {
                self.graph.setNodeStyle( node, style );
            }
        } );

        var viewPortChange = {
            oldZoom: previousZoom,
            newZoom: zoom
        };
        internalGraphUtils.publishGraphEvent( graphModel, 'awGraph.viewportChanged', viewPortChange );

        previousZoom = zoom;
    };

    /**
     * Set the css class for the drop-shadow effect
     *
     * @param {*} graphControl
     * @param {*} graphNodeItem
     * @param {*} filterCssStyle
     */
    this._setNodeDropShadowStyle = function( graphControl, graphNodeItem, filterCssStyle ) {
        if( graphNodeItem && graphNodeItem.getItemType() === 'Node' && graphControl && graphControl.graph ) {
            var newBindData = {};
            newBindData.nodeFilterStyle = filterCssStyle;
            graphControl.graph.updateNodeBinding( graphNodeItem, newBindData );
        }
    };

    this._onDeselectElements = function( event ) {
        var deselectElements = event.getRemovedElements();

        var shadowEffects = graphModel.config.shadowEffects;
        if( shadowEffects && shadowEffects.length === 0 ) {
            deselectElements.forEach( function( item ) {
                var itemType = item.getItemType();
                if( itemType === 'Node' ) {
                    self._setNodeDropShadowStyle( graphModel.graphControl, item, 'aw-graph-node-filter' );
                } else if( itemType === 'Port' ) {
                    var portNormalStyle = 'aw-graph-port-filter';
                    if( _.has( graphModel, 'config.defaults.portStyle.normalStyleClass' ) ) {
                        portNormalStyle = graphModel.config.defaults.portStyle.normalStyleClass;
                    }
                    graphModel.graphControl.graph.setPortStyleClass( item, portNormalStyle );
                }
            } );
        }

        deselectElements.forEach( function( element ) {
            if( hotspotUtil.isHotSpotEdge( element ) ) {
                hotspotUtil.removeHotspot( diagramView, element );
            }
        } );
    };

    this._onSelectElements = function( event ) {
        var selectElements = event.getAddedElements();
        var mousePosition = self._session.getMousePosition();
        var sheetPosition = internalGraphUtils.viewToSheetCoordinate( diagramView, mousePosition );
        var mousePositionElement = diagramView.getManager().getElementByPoint( sheetPosition );

        var shadowEffects = graphModel.config.shadowEffects;
        if( shadowEffects && shadowEffects.length === 0 ) {
            selectElements.forEach( function( item ) {
                var itemType = item.getItemType();
                if( itemType === 'Node' ) {
                    self._setNodeDropShadowStyle( graphModel.graphControl, item, 'aw-graph-node-filter-selected' );
                } else if( itemType === 'Port' ) {
                    var portStyle = 'aw-graph-port-filter-selected';
                    if( _.has( graphModel, 'config.defaults.portStyle.selectedStyleClass' ) ) {
                        portStyle = graphModel.config.defaults.portStyle.selectedStyleClass;
                    }
                    graphModel.graphControl.graph.setPortStyleClass( item, portStyle );
                }
            } );
        }
        selectElements.forEach( function( element ) {
            // TODO: Do we need to check isVisible?
            if( hotspotUtil.isHotSpotEdge( element ) && element.isVisible() ) {
                if( element === mousePositionElement ) {
                    hotspotUtil.addHotspot( graphModel, element, sheetPosition );
                } else {
                    hotspotUtil.addHotspot( graphModel, element, null );
                }
            }
        } );
    };

    // set graph overlay handler
    if( graphModel.config.tooltipHandler ) {
        declUtils.loadImports( [ graphModel.config.tooltipHandler ], AwPromiseService.instance ).then( function( handlers ) {
            if( handlers && handlers.length > 0 && handlers[ 0 ] ) {
                self.tooltipHandler = handlers[ 0 ];
            }
        } );
    }

    // Set the dragAndDropHandler
    if( graphModel.config.dragAndDropHandler ) {
        declUtils.loadImports( [ graphModel.config.dragAndDropHandler ], AwPromiseService.instance ).then( function( fn ) {
            self.dragAndDropHandler = fn[ 0 ];
        } );
    }

    // Set the hitTestHandler
    if( graphModel.config.hitTestHandler ) {
        declUtils.loadImports( [ graphModel.config.hitTestHandler ], AwPromiseService.instance ).then( function( fn ) {
            self.hitTestHandler = fn[ 0 ];
        } );
    }

    // init graph edit event handler
    if( graphModel.config.enableEdit ) {
        if( graphModel.config.graphEditHandler ) {
            declUtils.loadImports( [ graphModel.config.graphEditHandler ], AwPromiseService.instance ).then( function( handlers ) {
                self.graphEditHandler = handlers[ 0 ];
            } );
        }

        self._eventManager.registerEvents( [ 'OnAttaching', 'OnDetaching', 'OnGeometryChange', 'OnAttached',
            'OnElementCreating', 'OnElementCreated'
        ] );
    }

    // register event listener
    this._eventManager.registerEvents( [ 'OnTextChange', 'OnMouseClick', 'OnTap', 'OnTouchHold', 'OnMouseDoubleClick', 'OnDoubleTap', 'OnKeydown',
        'OnTransformStart', 'OnTransformEnd', 'OnQueryTooltip', 'OnHoverChanged', 'OnViewportChanged',
        'OnSelectionChanged', 'OnRenderCallback', 'OnPreselectionFilter'
    ] );

    // register the handler for the OnDrag event, the event for external DnD
    if( graphModel.config.dragAndDropHandler ) {
        this._eventManager.registerEvents( [ 'OnTransformDelta', 'OnPreTransformEnd', 'OnDrag' ] );
    }

    /**
     * define properties: suppressRoutingOnConnectionChanged, suppressBoundaryUpdateOnNestedNodeChanged
     *
     * true will disable graph's built-in RoutingOnConnectionChanged and BoundaryUpdateOnNestedNodeChanged
     * false will enable graph's built-in RoutingOnConnectionChanged and BoundaryUpdateOnNestedNodeChanged
     *
     * disable/enable them could optimize performance by remove unnessary costly low level computations.
     *
     * it's usefull for follow scenarios
     * scenario 1. incremental layout becuase it will handle edge routing intenally, not need these auto route.
     * scenario 2. apply global layout becuase it will handle routing intenally, not need these auto route.
     * scenario 3. recall becuase it contains all position informantions, not need these auto route.
     *
     * it's application's choice to suppress these flags or not depands on their use case.
     *
     * @property {boolean}  suppressRoutingOnConnectionChanged - default false
     */
    Object.defineProperty( self, 'suppressRoutingOnConnectionChanged', {
        enumerable: true,
        configurable: true,
        get: function() {
            return self._diagramView.isSuppressAutoRouting();
        },
        set: function( newValue ) {
            self._diagramView.suppressAutoRouting( newValue );
        }
    } );

    /**
     * @property { boolean } suppressBoundaryUpdateOnNestedNodeChanged - default false
     */
    Object.defineProperty( self, 'suppressBoundaryUpdateOnNestedNodeChanged', {
        enumerable: true,
        configurable: true,
        get: function() {
            return self._diagramView.isSuppressNestedNodeAutoEnlarge();
        },
        set: function( newValue ) {
            self._diagramView.suppressNestedNodeAutoEnlarge( newValue );
        }
    } );
};

// GraphControl API
GraphControl.prototype = {
    /**
     * Update input mode.
     *
     * @param inputModeConfig
     */
    updateInputMode: function( inputModeConfig ) {
        // first clear previous inputMode if any
        // LCS-92300: dangling edge in graph after ending authoring while dragging out an edge
        if( this.inputMode ) {
            this.inputMode.cancelEdgeCreation();
        }

        this.inputMode = graphInputModeFactory.createInputMode( this._diagramView, inputModeConfig );

        // init port creator
        if( !this._portCreatorInit && inputModeConfig && inputModeConfig.creatableItem === 'Port' ) {
            setPortCreator( this );
            this._portCreatorInit = true;
        }
    },
    setMoveWithoutSelection: function( enable ) {
        // Enable the custom pan command
        var customPanCommand = this._diagramView.getManager().getCommandManager().getCommand(
            dfCommands.CUSTOM_PAN_COMMAND );
        // Set the MoveWithoutSelection option, the default is true
        if( customPanCommand ) {
            if( enable === undefined || enable ) {
                customPanCommand.setMoveWithoutSelection( true );
            } else {
                customPanCommand.setMoveWithoutSelection( false );
            }
        }
    },
    enableAutoPan: function( enable ) {
        if( enable ) {
            this._configData.viewData.setAutoPanMode( true );
        } else {
            this._configData.viewData.setAutoPanMode( false );
        }
    },
    enableMarqueeSelection: function( enable ) {
        // Enable the Rectangle Selection command (marquee selection), the default is disabled
        if( enable ) {
            var modifierKeyArray = internalGraphUtils
                .parseModifierKey( this._graphModel.config.marqueeSelectionModifierKey );
            if( modifierKeyArray.length === 0 ) {
                // Set a default modifier key 'Shift', its key code is 16.
                modifierKeyArray.push( [ 16 ] );
            }
            this._configData.assistantKeysForRectSelect = modifierKeyArray;
            this._diagramView.enableCommand( dfCommands.RECTANGLE_SELECT_COMMAND );
        } else {
            this._diagramView.disableCommand( dfCommands.RECTANGLE_SELECT_COMMAND );
        }
    },
    enableMultipleSelection: function( enable ) {
        // The default for this option is true
        if( enable === undefined || enable ) {
            var modifierKeyArray = internalGraphUtils
                .parseModifierKey( this._graphModel.config.multipleSelectionModifierKey );
            if( modifierKeyArray.length === 0 ) {
                // The default key for multiple selection is Ctrl, keycode = 17
                modifierKeyArray.push( [ 17 ] );
            }
            this._configData.assistantKeysForMultipleSelect = modifierKeyArray;
            this._diagramView.enableCommand( dfCommands.MULTI_SELECT_COMMAND );
        } else {
            this._diagramView.disableCommand( dfCommands.MULTI_SELECT_COMMAND );
        }
    },
    setFitViewPosition: function( positionString ) {
        // set fit view position.
        var fitViewPosition;
        switch ( positionString ) {
            case 'TOP':
                fitViewPosition = [ 0.5, 0 ];
                break;
            case 'BOTTOM':
                fitViewPosition = [ 0.5, 1 ];
                break;
            case 'LEFT':
                fitViewPosition = [ 0, 0.5 ];
                break;
            case 'RIGHT':
                fitViewPosition = [ 1, 0.5 ];
                break;
            case 'CENTER':
            default:
                fitViewPosition = [ 0.5, 0.5 ];
                break;
        }
        this._configData.visualizationPreferencesData.setFitViewPosition( fitViewPosition );
    },
    /**
     * Show overlay node with the same style of underling node.
     * @param node the node on main graph.
     * @param pointOnPage the origin point to show overlay node
     */
    setOverlayNode: function( node, pointOnPage ) {
        if( node && node.getItemType() === 'Node' ) {
            var size = {
                width: node.getWidth(),
                height: node.getHeight()
            };

            // for group node, set the size of overlay node as the collapsed group size
            if( node.isGroupingAllowed() ) {
                if( node.viewState && node.viewState.collapsedSize ) {
                    size = node.viewState.collapsedSize;
                } else {
                    size = this.graph._defaultNodeSize;
                }
            }

            this.setCustomOverlayNode( node, node.style, size, node.getAppObj(), pointOnPage );
        } else {
            this.hideOverlayNode();
        }
    },

    /**
     * Show overlay node with the specified node style.
     * @param node the node on main graph.
     * @param nodeStyle the overlay node style.
     * @param nodeSize the overlay node size.
     * @param bindData the binding data for overlay node.
     * @param pointOnPage the origin point to show overlay node
     */
    setCustomOverlayNode: function( node, nodeStyle, nodeSize, bindData, pointOnPage ) {
        if( !this._graphOverlay ) {
            logger.error( 'Graph overlay is not enabled.' );
            return;
        }

        if( node && node.getItemType() === 'Node' ) {
            this.overlayMasterNode = node;
            var templateId = nodeStyle.templateId;
            var newBindData = _.cloneDeep( bindData );

            // use the detail level sub template for overlay node if it's multiple level template
            if( nodeStyle.subTemplateIds ) {
                templateId = _.last( nodeStyle.subTemplateIds );
            }
            var templateContent = nodeStyle.templateContent;
            if( !templateContent ) {
                var graphModel = this._graphModel;
                if( templateId && graphModel.nodeTemplates[ templateId ] ) {
                    var template = graphModel.nodeTemplates[ templateId ];
                    templateContent = template.templateContent;
                }
            }

            var templateElement = graphTemplateService.getTemplateElement( templateId, templateContent );
            if( templateElement ) {
                this._graphOverlay.setOverlay( node, templateElement, nodeSize.width, nodeSize.height, pointOnPage, newBindData );
            } else {
                logger.error( 'Failed to load template of ID "', templateId, '" for overlay node.' );
            }
        } else {
            // hide overlay node if input node is undefined.
            this.hideOverlayNode();
        }
    },

    hideOverlayNode: function() {
        if( this._graphOverlay ) {
            this._graphOverlay.setOverlay( null, null, graphConstants.DefaultNodeWidth,
                graphConstants.DefaultNodeHeight, null, null );
            this.overlayMasterNode = null;
        }
    },

    /**
     * Get input mode.
     *
     * @return {InputMode} the input mode object
     */
    getInputMode: function() {
        return this.inputMode;
    },

    /**
     * Enable the command of DFCommand
     * @param {string} commandStr
     */
    enableCommand: function( commandStr ) {
        this._diagramView.enableCommand( commandStr );
    },

    /**
     * Disable the DFCommand
     * @param {string} commandStr
     */
    disableCommand: function( commandStr ) {
        this._diagramView.disableCommand( commandStr );
    },

    /**
     * Fit graph.
     */
    fitGraph: function() {
        this._diagramView.fit();

        // fit API call doesn't fire view changed event, so need switch node template explicitly
        this._switchNodeTemplate( this._diagramView.getCurrentZoomRatio() );
    },

    /**
     * Get view point.
     */
    getViewPoint: function() {
        return this._diagramView.getSheetConfigurationData().viewData.getViewport();
    },

    /**
     * Set view point.
     *
     * @param point the view point
     */
    setViewPoint: function( point ) {
        var viewPoint = [];
        var configData = this._diagramView.getSheetConfigurationData();
        if( point ) {
            var oldViewPoint = this.getViewPoint();
            var width = point.width ? point.width : oldViewPoint.width;
            var height = point.height ? point.height : oldViewPoint.height;
            viewPoint = [ point.x, point.y, width, height ];
            configData.viewData.setViewport( viewPoint );
        }
    },

    /**
     * Get zoom ratio.
     */
    getZoom: function() {
        return this._diagramView.getCurrentZoomRatio();
    },

    /**
     * Set zoom ratio.
     *
     * @param zoom the zoom ratio
     */
    setZoom: function( zoom ) {
        this._diagramView.setCurrentZoomRatio( zoom );
    },

    /**
     * Create overview on the parent element.
     *
     * @param parentElement the parent element
     */
    createOverview: function( parentElement ) {
        this._diagramView.openOverviewWindow( parentElement );
    },

    /**
     * Get the selected graph items of given type. If type is not given, then return all the selected items.
     *
     * @param type the graph item type
     * @return an array of selected nodes
     */
    getSelected: function( type ) {
        var selectedItems = this._diagramView.getSelectedElements();

        if( type ) {
            if( type in this._dfTypeMaps ) {
                selectedItems = _.filter( selectedItems, function( item ) {
                    return item.getItemType() === type;
                } );
            } else {
                selectedItems = [];
            }
        }
        return selectedItems;
    },

    /**
     * Set the selected status of the graph
     *
     * @param {Array} itemsToSelected items will be set to selected
     * @param {Array} itemsToDeselected items will be set to deselected
     * @returns {Object} object for selected status changed
     */
    _setSelectedStatus: function( itemsToSelected, itemsToDeselected ) {
        var selectedItems = null;
        var deselectedItems = null;
        var selectionChanged = false;
        var oldSelectedItems = this.getSelected();
        var sheet = this._diagramView.getManager().getSheet();
        if( !sheet ) {
            return;
        }
        if( itemsToSelected && itemsToSelected.length > 0 || itemsToDeselected && itemsToDeselected.length > 0 ) {
            this._diagramView.beginTransaction();
            if( itemsToSelected ) {
                sheet.addToSelectedElements( itemsToSelected );
                var newSelected = _.difference( this.getSelected(), oldSelectedItems );
                if( newSelected.length > 0 ) {
                    selectedItems = newSelected;
                    selectionChanged = true;
                }
            }
            if( itemsToDeselected ) {
                sheet.removeFromSelectedElements( itemsToDeselected );
                var newDeselected = _.difference( oldSelectedItems, this.getSelected() );
                if( newDeselected.length > 0 ) {
                    deselectedItems = newDeselected;
                    selectionChanged = true;
                }
            }
            this._diagramView.endTransaction();
        } else {
            deselectedItems = this._diagramView.getSelectedElements();
            if( deselectedItems && deselectedItems.length > 0 ) {
                selectionChanged = true;
            }
            // clear graph selection
            this._diagramView.setSelected( null );
        }

        var self = this;
        if( selectedItems && selectedItems.length > 0 ) {
            selectedItems.forEach( function( selectedItem ) {
                var selectedItemType = selectedItem.getItemType();
                if( selectedItemType === 'Edge' && hotspotUtil.isHotSpotEdge( selectedItem ) ) {
                    hotspotUtil.addHotspot( self._graphModel, selectedItem );
                } else if( selectedItemType === 'Node' ) {
                    self._setNodeDropShadowStyle( self._graphModel.graphControl, selectedItem, 'aw-graph-node-filter-selected' );
                } else if( selectedItemType === 'Port' ) {
                    var portStyle = 'aw-graph-port-filter-selected';
                    if( _.has( self._graphModel, 'config.defaults.portStyle.selectedStyleClass' ) ) {
                        portStyle = self._graphModel.config.defaults.portStyle.selectedStyleClass;
                    }
                    self.graph.setPortStyleClass( selectedItem, portStyle );
                }
            } );
        }
        if( deselectedItems && deselectedItems.length > 0 ) {
            deselectedItems.forEach( function( deselectedItem ) {
                var deselectedItemType = deselectedItem.getItemType();
                if( deselectedItemType === 'Edge' && hotspotUtil.isHotSpotEdge( deselectedItem ) ) {
                    hotspotUtil.removeHotspot( self._diagramView, deselectedItem );
                } else if( deselectedItemType === 'Node' ) {
                    self._setNodeDropShadowStyle( self._graphModel.graphControl, deselectedItem, 'aw-graph-node-filter' );
                } else if( deselectedItemType === 'Port' ) {
                    var portNormalStyle = 'aw-graph-port-filter';
                    if( _.has( self._graphModel, 'config.defaults.portStyle.normalStyleClass' ) ) {
                        portNormalStyle = self._graphModel.config.defaults.portStyle.normalStyleClass;
                    }
                    self.graph.setPortStyleClass( deselectedItem, portNormalStyle );
                }
            } );
        }
        return { selectionChanged, selectedItems, deselectedItems };
    },

    /**
     * Set graph items selection status. This will only change the visible graph items selection status. If the
     * given items are null, all the graph selection will be cleared.
     *
     * @param {Array} items the graph items array
     * @param {boolean} selected the selection flag
     * @param {Object} userData extra data needed by users
     */
    setSelected: function( items, selected, userData ) {
        var selectionStatus;
        if( selected ) {
            selectionStatus = this._setSelectedStatus( items, null );
        } else {
            selectionStatus = this._setSelectedStatus( null, items );
        }

        if( selectionStatus && selectionStatus.selectionChanged ) {
            internalGraphUtils.publishGraphEvent( this._graphModel, 'awGraph.selectionChanged', {
                selected: selectionStatus.selectedItems,
                unSelected: selectionStatus.deselectedItems,
                isShiftKeyDown: false,
                isCtrlKeyDown: false,
                isAltKeyDown: false,
                userData: userData
            } );
        }
    },

    /**
     * Get selection state of the graph item
     *
     * @param item the graph item
     * @return true if the graph item is selected, false otherwise.
     */
    isSelected: function( item ) {
        return this._diagramView.isSelected( item );
    },

    /**
     * Set the view port size. If width and height are not given, the view port will be resized to fully occupy
     * the graph canvas container size.
     *
     * @param width width of the view port
     * @param height height of the view port
     */
    setViewportSize: function( width, height ) {
        this._diagramView.setViewportSize( width, height );
    },

    /**
     * Reset the view port size to fully occupy the graph canvas container size.
     *
     */
    resetViewportSize: function() {
        this._diagramView.setViewportSize();
    },

    /**
     * Pan the specific elements to view
     *
     * @param {sheetElement[]} elements - array of the target elements
     * @param {PanToViewOption} [panToViewOption = "AUTO"] - option for panning the graph
     */
    panToView: function( elements, panToViewOption ) {
        var SDF = window.SDF;
        var panOption = SDF.Utils.PanOptionForElementPan.Auto;
        var fitOption = SDF.Utils.ZoomOptionForElementPan.Auto;
        switch ( panToViewOption ) {
            case graphConstants.PanToViewOption.AUTO:
                break;
            case graphConstants.PanToViewOption.CENTER:
                panOption = SDF.Utils.PanOptionForElementPan.Center;
                break;
            case graphConstants.PanToViewOption.FIT:
                fitOption = SDF.Utils.ZoomOptionForElementPan.True;
                break;
            default:
                break;
        }
        var oldZoom = this.getZoom();
        this._diagramView.panElementInView( elements, panOption, fitOption );
        // panToView didn't emit event for fit, need to switch node template explicitly
        var zoom = this.getZoom();
        // zoom is a float number between 0 and 1, use a small number to avoid round-off error
        if( Math.abs( oldZoom - zoom ) > Math.pow( 10, -5 ) ) {
            this._switchNodeTemplate( zoom );
        }
    },
    /**
     * Clear graph contents
     *
     */
    clear: function() {
        if( this.graph ) {
            this.graph.clear();
        }
        if( this._graphOverlay ) {
            this._graphOverlay.clear();
        }
    },

    /**
     * Remove the diagram from HTML DOM. This function need be called to destroy the diagram object when graph
     * container is removed from DOM tree.
     *
     */
    destroy: function() {
        this.graphContainer = null;

        var createPortCommand = internalGraphUtils.getDFCommand( this._diagramView, dfCommands.CREATE_PORT_COMMAND );
        if( createPortCommand ) {
            createPortCommand.setPortCreator( null );
        }

        this._diagramView.destroy();

        if( this._graphOverlay ) {
            this._graphOverlay.destroy();
            this._graphOverlay = null;
        }
    },

    /**
     * Creates a ExportControl instance.
     *
     */
    createExportControl: function() {
        return new window.SDF.Utils.DiagramExportControl();
    },

    // internal function
    _exportGraph: function( exportControl, exportingEvtHandler, exportFunc ) {
        if( exportingEvtHandler ) {
            this._diagramView.registerEventListener( window.SDF.EventType.OnDiagramExporting, exportingEvtHandler );
        }

        if( !exportControl ) {
            exportControl = this.createExportControl();
            // In order to keep consistence with the original graph, turn on the following option
            exportControl.includeParentDoms = true;
        }
        var value = exportFunc( exportControl );

        if( exportingEvtHandler ) {
            this._diagramView.unregisterEventListener( window.SDF.EventType.OnDiagramExporting, exportingEvtHandler );
        }

        return value;
    },

    /**
     * Creates a new page that contains only the diagram for printing.
     *
     * @param exportControl the exportControl
     * @param exportingEvtHandler the exporting event handler
     */
    printGraph: function( exportControl, exportingEvtHandler ) {
        var self = this;
        this._exportGraph( exportControl, exportingEvtHandler, function( exportControl ) {
            self._diagramView.createPrintPage( exportControl );
        } );
    },

    /**
     * Returns the diagram's SVG DOM as a string
     *
     * @param exportControl the exportControl
     * @param exportingEvtHandler the exporting event handler
     * @return the exported string
     */
    exportGraphAsString: function( exportControl, exportingEvtHandler ) {
        var self = this;
        return this._exportGraph( exportControl, exportingEvtHandler, function( exportControl ) {
            return self._diagramView.exportSvgAsString( exportControl );
        } );
    },

    /**
     * Set auto routing type.
     * @param {number} autoRoutingType the type of auto routing. Referece to graphConstants.autoRoutingtype
     */
    setAutoRoutingType: function( autoRoutingType ) {
        _setAutoRoutingTypeForPreview( this._configData, autoRoutingType );
        _setAutoRoutingType( this._configData, autoRoutingType, window.SDF );
    },

    /**
     * Set suppressBoundaryUpdateOnNestedNodeChanged config option to disable/enable DF boundary update when its child nodes changed.
     * @param {boolean} suppressBoundaryUpdate config option
     */
    setGroupNodeBoundaryUpdateMode: function( suppressBoundaryUpdate ) {
        this._configData.suppressBoundaryUpdateOnNestedNodeChanged = suppressBoundaryUpdate;
    },

    /**
     * Set the min segment length for edge creation
     *
     * @param {Number} minSegLen
     */

    setMinSegmentLength: function( minSegLen ) {
        if( minSegLen >= 0 ) {
            this._configData.minSegmentLength = minSegLen;
        }
    },

    /**
     * Get the minSegmentLength
     *
     * @returns {number} min segment length
     */
    getMinSegmentLength: function( ) {
        return this._configData.minSegmentLength;
    },

    /**
     * Suppress RoutingOnConnectionChanged and BoundaryUpdateOnNestedNodeChanged when draw.
     *
     * @param {function} actionFn the action function for drawing
     */
    suppressGraphChanged: function( actionFn ) {
        var suppressRouting = this._diagramView.isSuppressAutoRouting();
        var suppressBoundaryUpdate = this._diagramView.isSuppressNestedNodeAutoEnlarge();
        // set suppress for performance
        this._diagramView.suppressAutoRouting( true );
        this._diagramView.suppressNestedNodeAutoEnlarge( true );

        if( typeof actionFn === 'function' ) {
            actionFn();
        }

        this._diagramView.suppressAutoRouting( suppressRouting );
        this._diagramView.suppressNestedNodeAutoEnlarge( suppressBoundaryUpdate );
    },

    /**
     * Set header height of the ground node expansion state changed.
     *
     * @param groupNode the group node
     * @param headerheight the header height to update
     * @return the offset of current header height and the old header height
     */
    updateHeaderHeight: function( groupNode, headerheight ) {
        if( !groupNode ) {
            return;
        }
        var bindData = groupNode.getAppObj();
        if( !bindData ) {
            return;
        }

        var groupGraph = this.groupGraph;
        var graph = this.graph;
        var adjustedHeight = 0;
        if( !groupGraph.isGroup( groupNode ) ) {
            return adjustedHeight;
        }

        var svgObject = groupNode.getSVG();
        if( svgObject ) {
            var session = this._diagramView.getSession();

            graph.update( function() {
                if( headerheight > 0 && bindData[ graphConstants.HEADER_HEIGHT_PROP ] ) {
                    var oldHeadHeight = bindData[ graphConstants.HEADER_HEIGHT_PROP ];
                    if( oldHeadHeight !== headerheight ) {
                        bindData[ graphConstants.HEADER_HEIGHT_PROP ] = headerheight;
                        adjustedHeight = headerheight - oldHeadHeight;
                        svgObject.bindNewValues( graphConstants.HEADER_HEIGHT_PROP );

                        var paddings = _.clone( groupGraph._defaultPaddings );
                        paddings[ 0 ] = headerheight + paddings[ 0 ];
                        groupNode.setNodePaddings( paddings );

                        var children = groupNode.getGroupMembers();

                        if( !graph.isNetworkMode() && groupGraph.isExpanded( groupNode ) && children && children.length > 0 ) {
                            var childrenLength = children.length;
                            var isBoundaryUpdatedSuppressed = session.suppressBoundaryUpdateOnNestedNodeChanged;
                            session.suppressBoundaryUpdateOnNestedNodeChanged = true;
                            var childrenAnchorY = [];

                            for( var i = 0; i < childrenLength; ++i ) {
                                childrenAnchorY.push( children[ i ].getAnchorPositionY() );
                            }

                            var yPos = groupNode.getAnchorPositionY() - adjustedHeight;
                            groupNode.setAnchorPositionY( yPos );

                            for( var j = 0; j < childrenLength; ++j ) {
                                children[ j ].setAnchorPositionY( childrenAnchorY[ j ] );
                            }

                            session.suppressBoundaryUpdateOnNestedNodeChanged = isBoundaryUpdatedSuppressed;
                        }
                    }
                }
            } );
        }

        return adjustedHeight;
    },

    /**
     * Add render callback function.
     *
     * @param {Function} func a render callback function
     */
    addCreateRenderCallback: function( func ) {
        if( typeof func === 'function' ) {
            this._createRenderCallback = func;
        }
    },

    /**
     * Remove render callback function.
     *
     * @param {Function} func a render callback function
     */
    removeCreateRenderCallback: function() {
        this._createRenderCallback = null;
    },

    /**
     * Get the rectangle of the sheet
     *
     * @returns {Object} bounds of the sheet as a rectangle
     */
    getSheetBounds: function() {
        return this._diagramView.getManager().getSheet().getSheetBounds();
    }
};

/**
 * Create Graph Control instance
 *
 * @param graph the graph object
 */
export let createGraphControl = function( graph, graphContainer ) {
    return new exports.GraphControl( graph, graphContainer );
};

export default exports = {
    GraphControl,
    createGraphControl
};
/**
 * The factory to create graph control.
 *
 * @member graphControlFactory
 * @memberof NgServices
 */
app.factory( 'graphControlFactory', () => exports );

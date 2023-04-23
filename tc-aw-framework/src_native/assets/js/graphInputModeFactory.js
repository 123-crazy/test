// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module define API to control graph input mode
 *
 * @module js/graphInputModeFactory
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import graphCursorService from 'js/graphCursorService';
import _ from 'lodash';
import declUtils from 'js/declUtils';
import logSvc from 'js/logger';
import dfCommands from 'js/diagramFoundationCommands';

/**
 * Define public API
 */
var exports = {};

// Dependencies injection

/**
 * set visibility of connection end
 */
var setConnectionEndVisible = function( configData, visible ) {
    configData.handleStyle.connectionEndHandler.isVisible = visible;
};

/**
 * set node resizable
 */
var setNodeResizable = function( configData, resizable ) {
    configData.handleStyle.resizeHandler.isVisible = resizable;
};

/**
 * set whether allow manual edge routing
 */
var enableManualEdgeRouting = function( configData, allow ) {
    configData.showConnectionHoverHandles = allow;
    configData.showConnectionSelectionHandles = allow;
    configData.handleStyle.connectionBendingHandler.isVisible = allow;
};

/**
 * To enable and disable DF commands
 */
var switchDFCommands = function( diagramView, commandNames, enable ) {
    _.each( commandNames, function( commandName ) {
        try {
            var fn = enable ? diagramView.enableCommand : diagramView.disableCommand;
            fn( commandName );
        } catch ( error ) {
            // DF currently raise error if the command doesn't exist, it should return undefined instead.
        }
    } );
};

/**
 * Define graph input mode
 *
 * @param diagramView the diagram view object
 * @param config the graph input mode configuration
 */
var InputMode = function( diagramView, config ) {
    var self = this;
    var configData = diagramView.getSheetConfigurationData();

    configData.highlightOnPreview = false;
    // cursor setting. 'default' works on all browsers, 'hand', 'pointer' work on IE/NS6 only
    self.defaultCursor = config.defaultCursor ? config.defaultCursor : 'default';
    self.dragCursor = config.dragCursor ? config.dragCursor : 'move';

    // special customized cursor for moving gesture
    self.dragableCursorUrl = '';
    self.draggingCursorUrl = '';

    if( config.dragableCursorUrl ) {
        self.dragableCursorUrl = app.getBaseUrlPath() + '/' + config.dragableCursorUrl;
    }
    if( config.draggingCursorUrl ) {
        self.draggingCursorUrl = app.getBaseUrlPath() + '/' + config.draggingCursorUrl;
    }

    self.moveCursor = config.moveCursor ? config.moveCursor : 'move';
    self.panCursor = config.panCursor ? config.panCursor : '';

    self.reconnectCursor = config.reconnectCursor ? config.reconnectCursor : 'crosshair';
    self.createNodeCursor = config.createNodeCursor ? config.createNodeCursor : 'crosshair';
    self.createEdgeCursor = config.createEdgeCursor ? config.createEdgeCursor : 'crosshair';

    self.enableSelfLoopConnection = config.enableSelfLoopConnection ? config.enableSelfLoopConnection : false;
    self.tmpSheetElementForEdgeCreation = [];

    // graph is in view mode by default
    var editMode = config.editMode;
    self.enableLabelEdit = Boolean( config.enableLabelEdit );

    self.movableItems = [ 'Node', 'Edge', 'Boundary' ];
    self.creatableItem = '';

    if( config.movableItems ) {
        self.movableItems = config.movableItems;
    }

    if( self.movableItems && self.movableItems.length > 0 ) {
        diagramView.enableCommand( dfCommands.MOVE_COMMAND );
    }

    if( config.creatableItem ) {
        self.creatableItem = config.creatableItem;
    }

    if( config.showPortCandidate ) {
        self.showPortCandidate = config.showPortCandidate;
        if( config.portCandidateSvgStr ) {
            self.portCandidateSvgStr = config.portCandidateSvgStr;
        }
        if( config.portHiCandidateSvgStr ) {
            self.portHiCandidateSvgStr = config.portHiCandidateSvgStr;
        }
    }

    if( _.has( config, 'attachableObjects' ) ) {
        configData.attachableTargets.Connection = config.attachableObjects;
    }

    // The DF default gesture to launch the text edit is Double-click, but the GC and its based Apps use Click instead.
    // Just disable the command.
    diagramView.disableCommand( dfCommands.TEXT_EDIT_COMMAND );

    self.enableNodeResize = config.enableNodeResize === true;

    setNodeResizable( configData, self.enableNodeResize );

    // fix issue AW50011 - Tile node does not disappear after click "End Authoring"
    diagramView.beginTransaction();
    configData.viewData.setRefresh( !configData.viewData.isRefresh() );
    diagramView.endTransaction();

    switchDFCommands( diagramView, [ dfCommands.RESIZE_COMMAND ], self.enableNodeResize );
    self.enableManualEdgeRouting = config.enableManualEdgeRouting === true;
    enableManualEdgeRouting( configData, self.enableManualEdgeRouting );

    if( config.disableSelectionOnDbclick ) {
        switchDFCommands( diagramView, [ dfCommands.SINGLE_SELECT_COMMAND ], false );
    }

    if( graphCursorService ) {
        self.graphCursorService = graphCursorService.createGraphCursorHandler( diagramView, self );
        self.graphCursorService.resetDefaultCursors();
        // additional cursor setting for resizing gesture
        self.graphCursorService.setExtensionCursors( config );
    }

    /**
     * Cancel edge creation
     *
     */
    self.cancelEdgeCreation = function() {
        if( self.tmpSheetElementForEdgeCreation.length > 0 ) {
            diagramView.beginTransaction();
            diagramView.deleteElements( self.tmpSheetElementForEdgeCreation );
            diagramView.endTransaction();
            var createConnectionCommand = diagramView.getManager().getCommandManager().getCommand(
                dfCommands.CREATE_CONNECTION_COMMAND );
            if( createConnectionCommand ) {
                createConnectionCommand.cleanup();
            }
            self.tmpSheetElementForEdgeCreation = [];
        }
    };

    /**
     * Set graph item types that allow creation items could be one of String "Node","Edge","Port"
     *
     * @param itemTypes the item types that allow creation
     */
    self.setCreatableItem = function( itemType ) {
        self.creatableItem = itemType;

        var toEnableCommands = [];
        var toDisableCommands = [];

        if( self.editMode ) {
            if( self.creatableItem === 'Port' ) { // Port create mode
                configData.contextData.setNodeCreationContext( false );
                configData.contextData.setConnectionCreationContext( false );

                toEnableCommands = [ dfCommands.CREATE_PORT_COMMAND,
                    dfCommands.SINGLE_SELECT_COMMAND,
                    dfCommands.HOVER_HIGHLIGHT_COMMAND
                ];

                if( config.disableSelectionOnDbclick ) {
                    toEnableCommands = _.difference( toEnableCommands, [ dfCommands.SINGLE_SELECT_COMMAND ] );
                }
                switchDFCommands( diagramView, toEnableCommands, true );

                toDisableCommands = [ dfCommands.CREATE_NODE_COMMAND,
                    dfCommands.CREATE_CONNECTION_COMMAND
                ];
                switchDFCommands( diagramView, toDisableCommands, false );
            } else if( self.creatableItem === 'Node' || self.creatableItem === 'Boundary' ) {
                configData.contextData.setConnectionCreationContext( false );
                configData.contextData.setNodeCreationContext( true );

                toEnableCommands = [ dfCommands.CREATE_NODE_COMMAND,
                    dfCommands.SINGLE_SELECT_COMMAND,
                    dfCommands.HOVER_HIGHLIGHT_COMMAND
                ];

                if( config.disableSelectionOnDbclick ) {
                    toEnableCommands = _.difference( toEnableCommands, [ dfCommands.SINGLE_SELECT_COMMAND ] );
                }
                switchDFCommands( diagramView, toEnableCommands, true );

                toDisableCommands = [ dfCommands.CREATE_PORT_COMMAND,
                    dfCommands.CREATE_CONNECTION_COMMAND
                ];
                switchDFCommands( diagramView, toDisableCommands, false );
            } else if( self.creatableItem === 'Edge' ) {
                configData.contextData.setNodeCreationContext( false );
                configData.contextData.setConnectionCreationContext( true );
                // enable 'HOVER_HIGHLIGHT_COMMAND' to highlight mouse hovered port when creating edge
                switchDFCommands( diagramView, [ dfCommands.CREATE_CONNECTION_COMMAND, dfCommands.HOVER_HIGHLIGHT_COMMAND ], true );
                switchDFCommands( diagramView, [ dfCommands.CREATE_PORT_COMMAND, dfCommands.CREATE_NODE_COMMAND ], false );
                // set edge creation end point tolerance
                self.endPointTolerance = config.endPointTolerance ? config.endPointTolerance : 10;
            } else {
                configData.contextData.setNodeCreationContext( false );
                configData.contextData.setConnectionCreationContext( false );

                if( config.disableSelectionOnDbclick ) {
                    switchDFCommands( diagramView, [ dfCommands.HOVER_HIGHLIGHT_COMMAND ], true );
                } else {
                    switchDFCommands( diagramView, [ dfCommands.SINGLE_SELECT_COMMAND, dfCommands.HOVER_HIGHLIGHT_COMMAND ], true );
                }

                toDisableCommands = [ dfCommands.CREATE_PORT_COMMAND,
                    dfCommands.CREATE_CONNECTION_COMMAND,
                    dfCommands.CREATE_NODE_COMMAND
                ];
                switchDFCommands( diagramView, toDisableCommands, false );

                setConnectionEndVisible( configData, true );
            }
        } else {
            configData.contextData.setNodeCreationContext( false );
            configData.contextData.setConnectionCreationContext( false );

            toDisableCommands = [ dfCommands.CREATE_PORT_COMMAND,
                dfCommands.CREATE_CONNECTION_COMMAND,
                dfCommands.CREATE_NODE_COMMAND
            ];
            switchDFCommands( diagramView, toDisableCommands, false );
            setConnectionEndVisible( configData, false );
        }
    };

    /**
     * Set graph to edit or view mode. Some configurations are only effective in edit mode. Like creatable item,
     * label editable.
     *
     * @param mode the item types that allow creation
     */
    self.setEditMode = function( mode ) {
        self.editMode = mode;

        if( mode ) {
            self.setCreatableItem( config.creatableItem );
        } else {
            self.setCreatableItem( '' );
        }
    };

    self.setEditMode( editMode );
};

/**
 * Create Graph input mode instance
 *
 * @param diagramView the diagram view object
 * @param config the graph input mode configuration
 */
export let createInputMode = function( diagramView, config ) {
    return new InputMode( diagramView, config );
};

export default exports = {
    createInputMode
};
/**
 * The factory to create graph input mode.
 *
 * @member graphInputModeFactory
 * @memberof NgServices
 */
app.factory( 'graphInputModeFactory', () => exports );

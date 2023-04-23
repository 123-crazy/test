// Copyright (c) 2020 Siemens

/**
 * This module defines the primary classes used to manage the 'aw-table' directive (used by decl grid).
 *
 * @module js/awTableStateService
 */
import app from 'app';
import assert from 'assert';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import logger from 'js/logger';
import localStrg from 'js/localStorage';
import uwUtilSvc from 'js/uwUtilService';

/**
 * {String} Expansion state of a node when expanded
 */
var _EXPAND_FULL = 'full';

/**
 * {String} The primary topic (i.e. key) used to store state information.
 */
var _LS_TOPIC = 'awTreeTableState';

/**
 * {String} The current local storage schema version accepted.
 */
var _LS_TOPIC_VERSION = '1.0.1';

/**
 * {String} A common location that is included in the declViewModel's path that needs to be removed before reporting
 * the ID of the declViewModel's ID.
 */
var _VM_DIR_NAME = '/viewmodel/';

/**
 * {Boolean} TRUE if various activities of this services should be logged.
 */
var _debug_logTableStateActivity = false;

/**
 * {Boolean} TRUE if all levels should be expanded (as they become visible).
 */
var _expandAll = false;

/**
 * {Object} The keys of this object are the unique 'roots' requesting saves.
 */
var _pendingSaveStateRequests = {};

/**
 * @param {DeclViewModel} declViewModel - The DeclViewModel where the table is defined.
 * @param {String} gridId - The ID of the declGrid used to define the table.
 * @param {ViewModelTreeNode} targetNode - The node to find the path to all the 'parent' nodes up the levels
 *            currently in the viewModelCollection of the associated dataProvider.
 *
 * @return {StringArray} An array of node IDs that identify the given node (as element [0]) in its hierarchy up to
 *         the 'top' node (as element [length-1]).
 */
var _buildNodePath = function( declViewModel, gridId, targetNode ) {
    var uwDataProvider = _getDataProvider( declViewModel, gridId );

    /**
     * Find target
     */
    var vmRows = uwDataProvider.getViewModelCollection().getLoadedViewModelObjects();

    var targetNdx = -1;

    for( var ndx = 0; ndx < vmRows.length; ndx++ ) {
        if( uwUtilSvc.getEvaluatedId( vmRows[ ndx ] ) === uwUtilSvc.getEvaluatedId( targetNode ) ) {
            targetNdx = ndx;
            break;
        }
    }

    if( targetNdx < 0 ) {
        return [];
    }

    /**
     * Build path by looking 'up' the rows
     */
    var pathIDs = [ uwUtilSvc.getEvaluatedId( targetNode ) ];

    var currRowNdx = targetNdx;
    var currNextLevel = targetNode.levelNdx - 1;

    while( currNextLevel > -1 ) {
        for( var ndx2 = currRowNdx - 1; ndx2 >= 0; ndx2-- ) {
            //
            var currRow = vmRows[ ndx2 ];

            if( currRow.levelNdx === currNextLevel ) {
                pathIDs.push( uwUtilSvc.getEvaluatedId( currRow ) );
                currNextLevel = currRow.levelNdx - 1;
            }
        }
    }

    return pathIDs;
};

/**
 * Return the structure object of the given 'target' node (and set with the 'target' 'childNdx') and create any
 * missing 'parent' structure nodes (if necessary).
 *
 * @param {DeclViewModel} declViewModel - The DeclViewModel where the table is defined.
 * @param {String} gridId - The ID of the declGrid used to define the table.
 * @param {Object} ttState - An object holding the state for the given declModel/declGrid.
 * @param {ViewModelTreeNode} targetNode - The node to return the object for.
 *
 * @return {Object} The structure object of the given 'target' node (and set with the 'target' 'childNdx').
 */
var _assureStructureNode = function( declViewModel, gridId, ttState, targetNode ) {
    var pathIDs = _buildNodePath( declViewModel, gridId, targetNode );

    if( !ttState.structure ) {
        ttState.structure = {};
    }

    /**
     * Start at the top and work down based on the 'target' path.
     */
    var currStructureNode = ttState.structure;

    for( var ndx = pathIDs.length - 1; ndx >= 0; ndx-- ) {
        var pathID = pathIDs[ ndx ];

        if( !currStructureNode[ pathID ] ) {
            currStructureNode[ pathID ] = {};
        }

        currStructureNode = currStructureNode[ pathID ];
    }

    currStructureNode.childNdx = targetNode.childNdx;

    return currStructureNode;
};

/**
 * Delete the structure object of the given 'target' node.
 *
 * @param {DeclViewModel} declViewModel - The DeclViewModel where the table is defined.
 * @param {String} gridId - The ID of the declGrid used to define the table.
 * @param {Object} ttState - An object holding the state for the given declModel/declGrid.
 * @param {ViewModelTreeNode} targetNode - The node to delete the state for.
 */
var _removeStructureNode = function( declViewModel, gridId, ttState, targetNode ) {
    if( ttState.structure ) {
        var pathIDs = _buildNodePath( declViewModel, gridId, targetNode );

        /**
         * Start at the top and work down based on the 'target' path.
         */
        var currParentNode = ttState.structure;

        var parentNodes = {};

        for( var ndx = pathIDs.length - 1; ndx > 0; ndx-- ) {
            var pathID = pathIDs[ ndx ];

            currParentNode = currParentNode[ pathID ];

            if( !currParentNode ) {
                break;
            }

            parentNodes[ pathID ] = currParentNode;
        }

        /**
         * Starting at the lowest level, delete any structure objects that are not empty.
         */
        if( currParentNode ) {
            currParentNode = ttState.structure;

            var keys = Object.keys( parentNodes );

            for( var ndx2 = keys.length - 1; ndx2 > 1; ndx2-- ) {
                var key = keys[ ndx2 ];

                currParentNode = parentNodes[ key ];

                if( Object.keys( currParentNode ).length < 2 ) {
                    var immParent = parentNodes[ keys[ ndx2 - 1 ] ];

                    delete immParent[ key ];
                }
            }
        }
    }
};

/**
 * @param {Object} ttState - An object holding the state for the given declModel/declGrid.
 * @param {String} nodeId - ID of the node to return the object for,
 *
 * @return {Object} The state object associated with the given node (or NULL if no state exists for it.
 */
var _getNodeState = function( ttState, nodeId ) {
    if( !ttState.nodeStates ) {
        ttState.nodeStates = {};
        return null;
    }

    return ttState.nodeStates[ nodeId ];
};

/**
 * @return {Object} The top-level object (loaded from local storage) containing the state information for all tables
 *         currently being tracked.
 */
var _getAllStates = function() {
    var allStates;

    var allStatesStr = localStrg.get( _LS_TOPIC );

    if( allStatesStr ) {
        try {
            allStates = JSON.parse( allStatesStr );

            if( allStates.schemaVersion !== _LS_TOPIC_VERSION ) {
                allStates = null;
            }
        } catch ( ex ) {
            // Handled below
        }
    }

    if( !allStates ) {
        allStates = {
            schemaVersion: _LS_TOPIC_VERSION
        };
    }

    return allStates;
};

/**
 * @param {DeclViewModel} declViewModel - The DeclViewModel where the table is defined.
 * @param {String} gridId - The ID of the declGrid used to define the table.
 *
 * @return {UwDataProvider} The current dataProvider associated with the given table.
 */
var _getDataProvider = function( declViewModel, gridId ) {
    var declGrid = declViewModel._internal.grids[ gridId ];

    assert( declGrid, 'Table definition not found' );

    var uwDataProvider = declViewModel.dataProviders[ declGrid.dataProvider ];

    assert( uwDataProvider, 'Table dataProvider is not valid' );

    return uwDataProvider;
};

/**
 * @param {DeclViewModel} declViewModel - The DeclViewModel where the table is defined.
 * @param {String} gridId - The ID of the declGrid used to define the table.
 *
 * @return {String} The unique ID of the view model object that 'owns' the table's data (i.e. The ID of an assembly)
 *         (or 'nonTreeRoot' if there is no 'topNode' set on the associated dataProvider).
 */
var _getRootId = function( declViewModel, gridId ) {
    var uwDataProvider = _getDataProvider( declViewModel, gridId );

    return uwDataProvider.topTreeNode ? uwUtilSvc.getEvaluatedId( uwDataProvider.topTreeNode ) : 'nonTreeRoot';
};

/**
 * @param {Object} allStates - The top-level object (loaded from local storage) containing the state information for
 *            all tables currently being tracked.
 * @param {DeclViewModel} declViewModel - The DeclViewModel where the table is defined.
 * @param {String} gridId - The ID of the declGrid used to define the table.
 *
 * @return {Object} An object holding the state for the given declModel/declGrid.
 */
var _getTreeTableGridState = function( allStates, declViewModel, gridId ) {
    assert( declViewModel, 'Invalid DeclViewModel' );
    assert( declViewModel._internal.panelId, 'Invalid DeclViewModel' );
    assert( gridId, 'Invalid table ID' );

    var declViewModelId = declViewModel._internal.panelId;

    var vmDirNdx = declViewModelId.indexOf( _VM_DIR_NAME );

    if( vmDirNdx !== -1 ) {
        declViewModelId = declViewModelId.substring( vmDirNdx + _VM_DIR_NAME.length );
    }

    if( !allStates[ declViewModelId ] ) {
        allStates[ declViewModelId ] = {};
    }

    if( !allStates[ declViewModelId ][ gridId ] ) {
        allStates[ declViewModelId ][ gridId ] = {};
    }

    return allStates[ declViewModelId ][ gridId ];
};

/**
 * This save state function is 'debounced' to only save data after updated 'quiets down' for ~2 second.
 *
 * @private
 */
var _pingSaveStateDebounce = _.debounce( function() {
    /**
     * Check if we have pending requests<BR>
     * If so: Process the pending requests.
     */
    if( !_.isEmpty( _pendingSaveStateRequests ) ) {
        var saveStateRequests = _pendingSaveStateRequests;

        _pendingSaveStateRequests = {};

        var allStates = _getAllStates();

        _.forEach( saveStateRequests, function( req ) {
            /**
             * Since a ping can time out *after* a declViewModel has been destroyed, check if the pending request
             * has a valid declViewModel.
             */
            if( !req.declViewModel.isDestroyed() ) {
                var gridState = _getTreeTableGridState( allStates, req.declViewModel, req.gridId );

                var rootId = _getRootId( req.declViewModel, req.gridId );

                gridState[ rootId ] = req.ttState;
            }
        } );

        if( _debug_logTableStateActivity ) {
            logger.info( 'Saving table states' );
        }

        localStrg.publish( _LS_TOPIC, JSON.stringify( allStates ) );
    }
}, 2000, {
    maxWait: 10000,
    trailing: true,
    leading: false
} );

/**
 * @param {DeclViewModel} declViewModel - The DeclViewModel where the table is defined.
 * @param {String} gridId - The ID of the declGrid used to define the table.
 * @param {Object} ttState - An object holding the state for the given declModel/declGrid.
 */
var _saveTreeTableState = function( declViewModel, gridId, ttState ) {
    var rootId = _getRootId( declViewModel, gridId );

    _pendingSaveStateRequests[ rootId ] = {
        declViewModel: declViewModel,
        gridId: gridId,
        ttState: ttState
    };

    _pingSaveStateDebounce();
};

/**
 * -------------------------------------------------------------------------<BR>
 * Define Service Objects<BR>
 * -------------------------------------------------------------------------<BR>
 */
/**
 * -------------------------------------------------------------------------<BR>
 * Define Service API<BR>
 * -------------------------------------------------------------------------<BR>
 */
var exports = {};

/**
 * @param {DeclViewModel} declViewModel - The DeclViewModel where the table is defined.
 * @param {String} gridId - The ID of the declGrid used to define the table.
 */
export let clearAllStates = function( declViewModel, gridId ) {
    /**
     * Check if any of the new 'child' nodes are known to be expanded.<BR>
     * If so: Setup to async expand them later.
     */
    var ttState = exports.getTreeTableState( declViewModel, gridId );

    ttState.nodeStates = {};
    ttState.structure = {};

    // clear from local storage
    _saveTreeTableState( declViewModel, gridId, ttState );
};

/**
 * @param {DeclViewModel} declViewModel - The DeclViewModel where the table is defined.
 * @param {String} gridId - The ID of the declGrid used to define the table.
 * @param {ViewModelTreeNodeArray} nodesToTest - The nodes to test expansion status for.
 *
 * @return {Map} An object that maps a tree node ID to a data object with the following properties for each of the
 *         given nodes that are currently expanded:
 *
 * <pre>
 * {
 *     expanded: true,
 *     nodeToExpand: [node from nodesToTest]
 * }
 * </pre>
 */
export let findExpandedNodes = function( declViewModel, gridId, nodesToTest ) {
    /**
     * Check if any of the new 'child' nodes are known to be expanded.<BR>
     * If so: Setup to async expand them later.
     */
    var ttState = exports.getTreeTableState( declViewModel, gridId );

    var expandNodeRequests = {};

    if( !_.isEmpty( ttState.nodeStates ) ) {
        _.forEach( nodesToTest, function( testNode ) {
            if( _expandAll ) {
                expandNodeRequests[ uwUtilSvc.getEvaluatedId( testNode ) ] = {
                    expanded: true,
                    nodeToExpand: testNode
                };
            } else {
                var nodeState = ttState.nodeStates[ uwUtilSvc.getEvaluatedId( testNode ) ];

                if( nodeState && nodeState.expansion === _EXPAND_FULL ) {
                    expandNodeRequests[ uwUtilSvc.getEvaluatedId( testNode ) ] = {
                        expanded: true,
                        nodeToExpand: testNode
                    };
                }
            }
        } );
    }

    return expandNodeRequests;
};

/**
 * @param {DeclViewModel} declViewModel - The DeclViewModel where the table is defined.
 * @param {String} gridId - The ID of the declGrid used to define the table.
 *
 * @return {Object} An object holding the table state for the given declModel/declGrid.
 */
export let getTreeTableState = function( declViewModel, gridId ) {
    var uwDataProvider = _getDataProvider( declViewModel, gridId );

    if( !uwDataProvider.ttState ) {
        var allStates = _getAllStates();

        var gridState = _getTreeTableGridState( allStates, declViewModel, gridId );

        var rootId = _getRootId( declViewModel, gridId );

        if( _debug_logTableStateActivity ) {
            logger.info( 'Reading table states for: ' + rootId );
        }

        if( !gridState[ rootId ] ) {
            gridState[ rootId ] = {
                structure: {},
                nodeStates: {}
            };
        }

        uwDataProvider.ttState = gridState[ rootId ];

        // <pre>
        // Possible fix for scroll to problem...investigate later w/ related changes in 'aw.table.controller'.
        // if( uwDataProvider.ttState ) {
        //     uwDataProvider.isFocusedLoad = true;
        // }
        // </pre>
    }

    return uwDataProvider.ttState;
};

/**
 * @param {Object} ttState - (Optional) An object holding the table state for a given declModel/declGrid.
 * @param {ViewModelTreeNodeArray} nodeToTest - The nodes to test status for.
 *
 * @return {Boolean} TRUE if the given node is currently expanded.
 */
export let isNodeExpanded = function( ttState, nodeToTest ) {
    if( ttState.nodeStates ) {
        var nodeState = ttState.nodeStates[ uwUtilSvc.getEvaluatedId( nodeToTest ) ];

        return nodeState && nodeState.expansion === _EXPAND_FULL;
    }

    return false;
};

/**
 * Clear the persisted expansion state of the given node .
 *
 * @param {DeclViewModel} declViewModel - The DeclViewModel where the table is defined.
 * @param {String} gridId - The ID of the declGrid used to define the table.
 * @param {ViewModelTreeNode} targetNode - The node just collapsed.
 */
export let saveRowCollapsed = function( declViewModel, gridId, targetNode ) {
    /**
     * Forget we are expanding this node.
     */
    var ttState = exports.getTreeTableState( declViewModel, gridId );

    _assureStructureNode( declViewModel, gridId, ttState, targetNode );

    var nodeState = _getNodeState( ttState, uwUtilSvc.getEvaluatedId( targetNode ) );

    if( nodeState && nodeState.expansion ) {
        delete nodeState.expansion;

        if( _.isEmpty( nodeState ) ) {
            delete ttState.nodeStates[ uwUtilSvc.getEvaluatedId( targetNode ) ];

            _removeStructureNode( declViewModel, gridId, ttState, targetNode );
        }

        _saveTreeTableState( declViewModel, gridId, ttState );
    }
};

/**
 * Update the persisted expansion state of the given node .
 *
 * @param {DeclViewModel} declViewModel - The DeclViewModel where the table is defined.
 * @param {String} gridId - The ID of the declGrid used to define the table.
 * @param {ViewModelTreeNode} targetNode - The node just expanded.
 */
export let saveRowExpanded = function( declViewModel, gridId, targetNode ) {
    /**
     * Remember we are expanding this node.
     */
    var ttState = exports.getTreeTableState( declViewModel, gridId );

    _assureStructureNode( declViewModel, gridId, ttState, targetNode );

    var nodeState = _getNodeState( ttState, uwUtilSvc.getEvaluatedId( targetNode ) );

    if( !nodeState ) {
        ttState.nodeStates[ uwUtilSvc.getEvaluatedId( targetNode ) ] = {
            expansion: _EXPAND_FULL
        };

        _saveTreeTableState( declViewModel, gridId, ttState );
    } else if( nodeState.expansion !== _EXPAND_FULL ) {
        nodeState.expansion = _EXPAND_FULL;

        _saveTreeTableState( declViewModel, gridId, ttState );
    }
};

/**
 * Update the persisted current top row in the table. .
 *
 * @param {DeclViewModel} declViewModel - The DeclViewModel where the table is defined.
 * @param {String} gridId - The ID of the declGrid used to define the table.
 * @param {ViewModelTreeNode} targetNode - The node of the currently visible top row of the table.
 */
export let saveScrollTopRow = function( declViewModel, gridId, targetNode ) {
    var pathIDs = _buildNodePath( declViewModel, gridId, targetNode );

    var ttState = exports.getTreeTableState( declViewModel, gridId );

    if( !ttState.topRowPath || _.difference( ttState.topRowPath, pathIDs ).length !== 0 ) {
        ttState.topRowPath = pathIDs;

        _saveTreeTableState( declViewModel, gridId, ttState );
    }
};

_debug_logTableStateActivity = browserUtils.getUrlAttributes().logTableStateActivity === '';

exports = {
    clearAllStates,
    findExpandedNodes,
    getTreeTableState,
    isNodeExpanded,
    saveRowCollapsed,
    saveRowExpanded,
    saveScrollTopRow
};
export default exports;
/**
 * @member awTableStateService
 * @memberof NgServices
 */
app.factory( 'awTableStateService', () => exports );

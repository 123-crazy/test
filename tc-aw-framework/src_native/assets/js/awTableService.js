// Copyright (c) 2020 Siemens

/**
 * This module defines the primary classes used to manage the 'aw-table' directive (used by decl grid).
 *
 * @module js/awTableService
 */
import app from 'app';
import awColumnSvc from 'js/awColumnService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import declModelRegistrySvc from 'js/declModelRegistryService';
import vmPropSvc from 'js/uwPropertyService';
import assert from 'assert';
import _ from 'lodash';
import $ from 'jquery';
import declUtils from 'js/declUtils';
import logger from 'js/logger';

/**
 * {Number} The maximum # of nodes/rows to request to be returned in a single call to the dataProviderService
 * for the table.
 * <P>
 * Note: This number could be changed dynamically in the future to be based on the number of rows actually being
 * displayed.
 */
var _defaultPageSizeTable = 40;

/**
 * {Number} The maximum # of nodes/rows to request to be returned in a single call to the dataProviderService
 * for the tree.
 * <P>
 * Note: This number could be changed dynamically in the future to be based on the number of rows actually being
 * displayed.
 */
var _defaultPageSizeTree = 40;

/**
 * -------------------------------------------------------------------------<BR>
 * Define Service Objects<BR>
 * -------------------------------------------------------------------------<BR>
 */

/**
 * This class is the overall model used to control the contents and behavior of the 'aw-table' directive. This
 * model allows for functional pieces to be overridden and implemented in application specific ways. Defaults
 * are specified here.
 *
 * @class AwTableViewModel
 *
 * @param {DeclViewModel} declViewModel - The 'declViewModel' containing properties to base the new
 *            'awTableViewModel' upon.
 *
 * @param {String} gridId - ID of the {declGrid} this model is wrapping.
 *
 * @param {Object} $scope - the scope object
 *
 */
var AwTableViewModel = function( declViewModel, gridId, $scope ) {
    var vmSelf = this; // eslint-disable-line consistent-this

    /**
     * Set the ID of this instance.
     */
    vmSelf._modelId;

    /**
     * @property {String} selectionMode - 'single' or 'multi'
     *
     * @memberOf module:js/awTableService~AwTableViewModel
     */
    vmSelf.selectionMode = 'single';

    /**
     * @property {String} selectionScope - 'row' or 'cell'
     *
     * @memberOf module:js/awTableService~AwTableViewModel
     */
    vmSelf.selectionScope = 'row';

    /**
     * @property {Boolean} enableArrangeMenu - default is false
     *
     * @memberOf module:js/awTableService~AwTableViewModel
     */
    vmSelf.enableArrangeMenu = false;

    /**
     * @property {Boolean} enableFilterMenu - default is false
     *
     * @memberOf module:js/awTableService~AwTableViewModel
     */
    vmSelf.enableFilterMenu = false;

    /**
     * @property {Boolean} isEditable - default is false
     */
    vmSelf.isEditable = false;

    /**
     * ---------------------------------------------------------------------------<BR>
     * Property & Function definition complete....Finish initialization. <BR>
     * ---------------------------------------------------------------------------<BR>
     */

    /**
     * Check if we do NOT have a valid 'declViewModel' and 'gridId' to work with.
     */
    assert( declViewModel, 'No DeclViewModel specified' );
    assert( gridId, 'No DeclGrid ID specified' );

    if( declViewModel._internal.isDestroyed ) {
        assert( false, 'Invalid to create objects on a destroyed DeclViewModel: ' + declViewModel );
    }

    /**
     * The ID of the 'declViewModel' to use for this 'aw-table'.
     */
    vmSelf._declViewModelId = declViewModel.getPanelId();

    /**
     * Remember this 'declGrid' ID
     * The ID of the 'declGrid' in the 'declViewModel' to use for this 'aw-table'.
     */
    vmSelf._declGridId = gridId;

    declModelRegistrySvc.registerModel( 'AwTableViewModel', vmSelf, '_declGridId', '_modelId' );

    /**
     * Initialize all properties based on the 'declViewModel' defined information.
     * <P>
     * Check if the 'declGrid' exists
     */
    var declGrid = declViewModel._internal.grids[ gridId ];

    assert( declGrid, 'Invalid DeclGrid ID specified' );

    /**
     * Set options from v-m json data
     */
    vmSelf.gridOptions = declGrid.gridOptions;

    /**
     * Check if declGrid has a valid 'dataProvider'.
     */
    assert( declGrid.dataProvider, 'No DeclDataProvider ID specified' );
    assert( declViewModel.dataProviders[ declGrid.dataProvider ], 'Invalid DeclDataProvider ID specified' );

    /**
     * Set reference to the 'declGrid's UwDataProvider.
     */
    var uwDataProvider = declViewModel.dataProviders[ declGrid.dataProvider ];

    /**
     * The 'UwDataProvider' used to access information about the rows and column value of this 'aw-table'.
     */
    vmSelf._uwDataProvider = uwDataProvider;

    if( uwDataProvider.selectionModel && uwDataProvider.selectionModel.mode ) {
        vmSelf.selectionMode = uwDataProvider.selectionModel.mode;
    }

    if( uwDataProvider.selectionModel && uwDataProvider.selectionModel.scope ) {
        vmSelf.selectionScope = uwDataProvider.selectionModel.scope;
    }

    /**
     * Setup columns information
     * The 'AwTableColumnProvider' used to access information about the columns of this 'aw-table'.
    */
    vmSelf._tableColumnProvider = awColumnSvc.createColumnProvider( declViewModel, $scope,
        uwDataProvider.commands, gridId, uwDataProvider.json.commandsAnchor );

    vmSelf._tableColumnProvider.initialize().then( function() {
        // DO nothing
    }, function( err ) {
        logger.error( 'Failure during table tableColumnProvider initialization: ' + err );
    } );

    /**
     * Set 'enableArrangeMenu' if the declGrid indicated an override of the default.
     */
    if( !declUtils.isNil( declGrid.enableArrangeMenu ) ) {
        vmSelf.enableArrangeMenu = declGrid.enableArrangeMenu;
    }

    /**
     * Set 'enableFilterMenu' if the declGrid indicated an override of the default.
     */
    if( !declUtils.isNil( declGrid.enableFilterMenu ) ) {
        vmSelf.enableFilterMenu = declGrid.enableFilterMenu;
    }

    /**
     * Check if declGrid has a valid 'propertyProvider'.
     * The 'UwDataProvider' used to access properties for the rows and column value of this 'aw-table'.
    */
    if( declGrid.propertyProvider && declViewModel.dataProviders[ declGrid.propertyProvider ] ) {
        vmSelf._uwPropProvider = declViewModel.dataProviders[ declGrid.propertyProvider ];
    }
}; // AwTableViewModel

/**
 * Override the default implementation to return more helpful information.
 *
 * @return {String} Text used to identify the ID of the AwTableViewModel (e.g. 'modelId' + optional model IDs).
 */
AwTableViewModel.prototype.toString = function() {
    if( this ) {
        if( this._declViewModelId ) {
            return this._modelId + //
                '  viewModel: ' + this._declViewModelId + //
                '  grid: ' + this._declGridId + //
                '  dataProvider: ' + this._uwDataProvider;
        }

        return this._modelId + '  viewModelId: ' + '???';
    }

    return 'AwTableViewModel' + '(Destroyed)';
};

/**
 * Get the 'provider' used to access information about the rows and column values of this 'aw-table'.
 *
 * @memberOf module:js/awTableService~AwTableViewModel
 *
 * @return {UwDataProvider} Reference to the currently registered 'UwDataProvider'.
 */
AwTableViewModel.prototype.getDataProvider = function() {
    return this._uwDataProvider;
};

/**
 * Get the 'provider' used to access properties for the rows and column values of this 'aw-table'.
 *
 * @memberOf module:js/awTableService~AwTableViewModel
 *
 * @return {UwDataProvider} Reference to the currently registered 'UwDataProvider' that provides property
 *         information.
 */
AwTableViewModel.prototype.getPropertyProvider = function() {
    return this._uwPropProvider;
};

/**
 * Get the 'provider' used to access information about the columns of this 'aw-table'.
 *
 * @memberOf module:js/awTableService~AwTableViewModel
 *
 * @return {AwTableColumnProvider} Reference to the currently registered 'AwTableColumnProvider'.
 */
AwTableViewModel.prototype.getColumnProvider = function() {
    assert( this._tableColumnProvider, 'No AwTableColumnProvider set' );

    return this._tableColumnProvider;
};

/**
 * Get the ID of the 'declGridId' in the 'declViewModel' to be used with this 'aw-table'.
 *
 * @memberOf module:js/awTableService~AwTableViewModel
 *
 * @return {String} The ID of the 'declGridId' in the 'declViewModel' to be used with this 'aw-table'.
 */
AwTableViewModel.prototype.getGridId = function() {
    return this._declGridId;
};

/**
 * Free up all resources held/managed by this object.
 * <P>
 * Note: After this function, no API call should be considered valid. This function is intended to be called
 * when the $scope of any associated viewModel is also being 'destroyed'. After this call (and a GC event), any
 * objects managed by this class may be considered a 'memory leak'.
 */
AwTableViewModel.prototype.destroy = function() {
    declModelRegistrySvc.unregisterModel( 'AwTableViewModel', this, '_declGridId', '_modelId' );

    if( this._tableColumnProvider ) {
        this._tableColumnProvider.destroy();
        this._tableColumnProvider = null;
    }

    this._uwDataProvider = null;
    this._uwPropProvider = null;
};

/**
 * Instances of this class represent the input structure to a request to load a page of rows (nodes) into a flat
 * table/list.
 *
 * @class ListLoadInput
 *
 * @param {String} parentUid - (See property description below)
 * @param {Number} startChildNdx - (See property description below)
 * @param {Number} pageSize - (Optional) (See property description below)
 * @param {Boolean} addAfter - (Optional) (See property description below)
 * @param {Object} filter - (Optional) The string used to filter the list.
 *            <P>
 *            <P>
 *
 * @property {String} parentUid - The 'parent' ViewModelTreeNode used to access any 'child' nodes in the next
 *           level down in the hierarchy.
 * @property {Number} startChildNdx - The 'childNdx' of the node to start the 'next' page loading at (Default:
 *           0).
 * @property {Number} pageSize - The maximum # of 'child' node to return in any single paged access (Default:
 *           See _defaultPageSizeTable ).
 * @property {String} startChildId - The 'id' of the node to start the 'next' page loading at.
 * @property {Boolean} addAfter - TRUE if any new children should be added AFTER the optional 'cursorNodeId'
 *           (Default: TRUE)
 * @property {String} filter - The string used to filter the list.
 */
var ListLoadInput = function( parentUid, startChildNdx, pageSize, addAfter, filter ) {
    this.parentUid = parentUid;
    this.startChildNdx = declUtils.isNil( startChildNdx ) ? 0 : startChildNdx;
    this.pageSize = declUtils.isNil( pageSize ) ? _defaultPageSizeTable : pageSize;
    this.addAfter = declUtils.isNil( addAfter ) ? true : addAfter;
    this.filter = filter;
};

/**
 * The class is used to communicate the results of a single paged loading of 'child' nodes in a 'parent' node.
 *
 * @class ListLoadResult
 *
 * @param {ViewModelObject} parentNode - (See property description below)
 * @param {ViewModelObjectArray} childNodes - (See property description below)
 * @param {Number} totalChildCount - (See property description below)
 * @param {Number} startChildNdx - (See property description below)
 * @param {ViewModelObject} newTopNode - (See property description below)
 *            <P>
 *            <P>
 * @property {ViewModelObject} parentNode - The 'parent' ViewModelTreeNode used to access any 'child' nodes in
 *           the next level down in the hierarchy.
 *
 * @property {ViewModelObjectArray} childNodes - Array of 'child' nodes resulting from a single load execution
 *           in the context of a 'parent' node (i.e. 'children' in the next level down in the hierarchy).
 *
 * @property {Number} totalChildCount - The total # of known 'child' nodes regardless of how many are currently
 *           loaded into the 'parent' 'children' array.
 *
 * @property {Number} startChildNdx - The 'childNdx' provided in the ListLoadInput that was used to load this
 *           data. This is returned as part of the result to handle cases when multiple loads are being
 *           performed on the same 'parent' and the original closure data could have changed during the async
 *           processing.
 *
 * @property {ViewModelObject} newTopNode - (Optional) If this property is defined, it will be used to replace
 *           the (unseen) 'top' node associated with the overall list.
 *           <P>
 *           Note: If 'children' array of this node is not empty it will be ignored and the 'childNodes' of this
 *           result will be set as the 1st level children of this 'parent' node.
 */
var ListLoadResult = function( parentNode, childNodes, totalChildCount, startChildNdx, newTopNode ) {
    this.parentNode = parentNode;
    this.childNodes = childNodes;
    this.totalChildCount = totalChildCount;
    this.startChildNdx = startChildNdx;

    /**
     * We want to keep the following undefined until when know we need them to be defined.
     */
    if( newTopNode ) {
        this.newTopNode = newTopNode;
    }
};

/**
 * Instances of this class represent the input structure to a request to load properties of a collection of
 * tree-table nodes.
 *
 * @class PropertyLoadRequest
 * @param {ViewModelTreeNode} parentNode - (See property description below)
 * @param {ViewModelTreeNodeArray} childNodes - (See property description below)
 * @param {AwTableColumnInfoArray} columnInfos - (See property description below)
 *            <P>
 *            <P>
 * @property {ViewModelTreeNode} parentNode - The 'parent' node the 'child' nodes belong to.
 * @property {ViewModelTreeNodeArray} childNodes - Array of nodes to load ViewModelProperty objects for.
 * @property {AwTableColumnInfoArray} columnInfos - Array of AwTableColumnInfo object containing property names
 *           to load.
 */
var PropertyLoadRequest = function( parentNode, childNodes, columnInfos ) {
    this.parentNode = parentNode;
    this.childNodes = childNodes;
    this.columnInfos = columnInfos;
};

/**
 * Instances of this class represent the input structure to a request to load properties of a collection of
 * tree-table nodes.
 *
 * @class PropertyLoadInput
 * @param {PropertyLoadRequestArray} propertyLoadRequests - (See property description below)
 *            <P>
 *            <P>
 * @property {PropertyLoadRequestArray} propertyLoadRequests - Array requests to fulfill.
 */
var PropertyLoadInput = function( propertyLoadRequests ) {
    this.propertyLoadRequests = propertyLoadRequests;
};

/**
 * The class is used to communicate the results of incremental loading of properties for ViewModelTreeNodes.
 *
 * @class PropertyLoadResult
 * @param {ViewModelTreeNodeArray} updatedNodes - (See property description below)
 *            <P>
 *            <P>
 * @property {ViewModelTreeNodeArray} updatedNodes - Array of ViewModelTreeNodes who's ViewModelProperties have
 *           been loaded/updated.
 */
var PropertyLoadResult = function( updatedNodes ) {
    this.updatedNodes = updatedNodes;
};

/**
 * The class is used to communicate the results of a single paged loading of 'child' nodes in a 'parent' node.
 *
 * @class TableLoadResult
 * @param {Number} totalFound - (See property description below)
 *            <P>
 *            <P>
 * @property {ViewModelObjectArray} rowsLoaded - Array of ViewModelObjects resulting from a single load
 *           execution in the context of a flat table.
 * @property {Number} totalFound - The total # of known rows regardless of how many are currently loaded into
 *           the flat table.
 * @property {Number} nextSearchIndex - The 'page' to start the 'next' page loading at (or -1 if no more rows
 *           exist).
 */
var TableLoadResult = function( totalFound ) {
    this.rowsLoaded = [];
    this.totalFound = totalFound;
    this.nextSearchIndex = -1;
};

/**
 * Instances of this class represent the input structure to a request to load a page of rows (nodes) into a
 * tree-table.
 *
 * @class TreeLoadInput
 *
 * @param {ViewModelTreeNode} parentNode - (See property description below)
 * @param {Number} startChildNdx - (See property description below)
 * @param {String} startChildId - (See property description below)
 * @param {String} cursorNodeId - (Optional) (See property description below)
 * @param {Number} pageSize - (Optional) (See property description below)
 * @param {Boolean} addAfter - (Optional) (See property description below)
 * @param {ViewModelTreeNode} rootNode - (Optional) (See property description below)
 * @param {Boolean} focusLoadAction - (Optional) (See property description below)
 *            <P>
 *            <P>
 * @property {ViewModelTreeNode} parentNode - The 'parent' ViewModelTreeNode used to access any 'child' nodes in
 *           the next level down in the hierarchy.
 * @property {Number} startChildNdx - The 'childNdx' of the node to start the 'next' page loading at.
 * @property {String} startChildId - The 'id' of the node to start the 'next' page loading at.
 * @property {String} cursorNodeId - ID of an existing node in the 'parent' (and, presumably a
 *           ViewModelCollection) to insert any new nodes after (or before...depending on value of 'addAfter').
 *           <P>
 *           Note: If not defined, the 'child' nodes will be added at the end (or beginning) of the 'parent'
 *           node's 'children'.
 * @property {Boolean} addAfter - TRUE if any new children should be added AFTER the optional 'cursorNodeId'
 *           (Default: TRUE)
 * @property {Number} pageSize - The maximum # of 'child' nodes to return in any single paged access (Default:
 *           See _defaultPageSizeTree).
 * @property {ViewModelTreeNode} rootNode - The 'tree' ViewModelTreeNode used to access any 'child' nodes in the
 *           next level down in the hierarchy.
 * @property {Boolean} focusLoadAction - (Optional) TRUE if action is called to load selected object that is
 *           currently not present in tree
 */
var TreeLoadInput = function( parentNode, startChildNdx, startChildId, cursorNodeId, pageSize, addAfter,
    rootNode, focusLoadAction ) {
    this.parentNode = parentNode;
    this.rootNode = rootNode;

    this.startChildNdx = startChildNdx;
    this.startChildId = startChildId;
    this.cursorNodeId = cursorNodeId;
    this.pageSize = declUtils.isNil( pageSize ) ? _defaultPageSizeTree : pageSize;
    this.addAfter = declUtils.isNil( addAfter ) ? true : addAfter;

    /**
     * We want to keep following parameter undefined until when know we need them to be defined.
     */
    if( focusLoadAction ) {
        this.focusLoadAction = focusLoadAction;
    }
};

/**
 * The class is used to communicate the results of a single paged loading of 'child' nodes in a 'parent' node.
 *
 * @class TreeLoadResult
 *
 * @param {ViewModelTreeNode} parentNode - (See property description below)
 * @param {ViewModelTreeNodeArray} childNodes - (See property description below)
 * @param {Number} totalChildCount - (See property description below)
 * @param {Number} startChildNdx - (See property description below)
 * @param {String} cursorNodeId - (See property description below)
 * @param {ViewModelTreeNode} newTopNode - (See property description below)
 * @param {ViewModelTreeNodeArray} vmNodesInTreeHierarchyLevels - (See property description below)
 * @param {Boolean} mergeNewNodesInCurrentlyLoadedTree - (See property description below)
 *            <P>
 *            <P>
 * @property {ViewModelTreeNode} parentNode - The 'parent' ViewModelTreeNode used to access any 'child' nodes in
 *           the next level down in the hierarchy.
 *
 * @property {ViewModelTreeNodeArray} childNodes - Array of 'child' ViewModelTreeNode objects resulting from a
 *           single load execution in the context of a 'parent' node (i.e. 'children' in the next level down in
 *           the hierarchy).
 *
 * @property {Number} totalChildCount - The total # of known 'child' nodes regardless of how many are currently
 *           loaded into the 'parent' 'children' array.
 *
 * @property {Number} startChildNdx - The 'childNdx' provided in the TreeLoadInput that was used to load this
 *           data. This is returned as part of the result to handle cases when multiple loads are being
 *           performed on the same 'parent' and the original closure data could have changed during the async
 *           processing.
 *
 * @property {String} cursorNodeId - (Optional) ID of an existing node in the 'parent' (and, presumably a
 *           ViewModelCollection) to insert any new nodes after (or before) depending on value of 'addAfter'.
 *
 * @property {ViewModelTreeNode} newTopNode - (Optional) If this property is defined, it will be used to replace
 *           the (unseen) 'top' tree node associated with the overall tree-table.
 *           <P>
 *           Note: If 'children' array of this node is not empty it will be ignored and the 'childNodes' of this
 *           result will be set as the 1st level children of this 'parent' node.
 *
 * @property {ViewModelTreeNodeArray} vmNodesInTreeHierarchyLevels - (Optional) Array of arrays. Each array
 *           index represents ViewModelTreeNode objects at given level.Array at index 0 in represents level -1, ,
 *           index 1 level 0 and so on. Each level will have ViewModelTreeNode where next level nodes need to be
 *           inserted.
 *
 * @property {Boolean} mergeNewNodesInCurrentlyLoadedTree - (Optional) If this property is true,
 *           vmNodesInTreeHierarchyLevels array will be merged in currently loaded tree at proper merge point if
 *           present in tree. All existing nodes in Tree and their properties will be retained.
 *
 */
var TreeLoadResult = function( parentNode, childNodes, totalChildCount, startChildNdx, cursorNodeId,
    newTopNode, vmNodesInTreeHierarchyLevels, mergeNewNodesInCurrentlyLoadedTree ) {
    this.parentNode = parentNode;
    this.childNodes = childNodes;
    this.totalChildCount = totalChildCount;
    this.startChildNdx = startChildNdx;
    this.cursorNodeId = cursorNodeId;

    /**
     * We want to keep the following parameters undefined until when know we need them to be defined.
     */
    if( newTopNode ) {
        this.newTopNode = newTopNode;
    }

    if( vmNodesInTreeHierarchyLevels ) {
        this.vmNodesInTreeHierarchyLevels = vmNodesInTreeHierarchyLevels;
    }

    if( mergeNewNodesInCurrentlyLoadedTree ) {
        this.mergeNewNodesInCurrentlyLoadedTree = mergeNewNodesInCurrentlyLoadedTree;
    }
};

/**
 * Instances of this class represent the properties, hierarchy and status of a single row in a tree-table.
 *
 * @class ViewModelTreeNode
 * @param {String} nodeId - Unique ID for this node within the tree-table.
 * @param {String} type - (See property description below)
 * @param {String} displayName - (See property description below)
 * @param {Number} levelNdx - (See property description below)
 * @param {Number} childNdx - (See property description below)
 * @param {String} iconURL - (See property description below)
 *            <P>
 *            <P>
 * @property {String} id - Unique ID for this node within the tree-table.
 * @property {String} type - The type of model object represented by this tree node (i.e. 'Item'
 *           'DocumentRevision', etc.).
 * @property {String} displayName - The name to display in the 'navigation' column of the tree node.
 * @property {Number} levelNdx - The # of levels down from the 'root' of the tree-table.
 * @property {Number} childNdx - The index to this 'child' within the immediate 'parent'. This information is
 *           meant to help in when only a partial (or sparse) range of children have been loaded. This index is
 *           stable within the 'parent' and not representative of the order based on the 'id'.
 * @property {String} iconURL - The URL to the icon associated with the display of this node in the 'navigation'
 *           column of the tree-table.
 *           <P>
 * @property {ViewModelPropertyMap} props - Map of propertyName to ViewModelProperty object holding the
 *           value/state of that property (or 'undefined' if no properties have been loaded yet).
 *           <P>
 * @property {Number} totalChildCount - The total # of known 'child' nodes regardless of how many are currently
 *           loaded into the 'children' array (or 'undefined' if no expansion has been occured or there are no
 *           children).
 *           <P>
 * @property {ViewModelTreeNodeArray} children - Array of currently loaded ViewModelTreeNode children in the
 *           next level down in the hierarchy (or 'undefined' if no expansion has been occurred or there are no
 *           children).
 *           <P>
 * @property {Boolean} isLeaf - TRUE if we have checked and there are NO 'child' nodes beneath this 'parent'
 *           node (or 'undefined' if no expansion has been occurred or there are children).
 */
var ViewModelTreeNode = function( nodeId, type, displayName, levelNdx, childNdx, iconURL ) {
    this.uid = nodeId;
    this.id = nodeId;
    this.type = type;

    this.displayName = displayName;

    this.levelNdx = levelNdx;
    this.childNdx = childNdx;
    this.iconURL = iconURL;
    this.visible = true;

    /**
     * We want to keep the following undefined until when know we need them to be defined.
     */
    // this.props;              // Defined for all ViewModelObjects
    // this.selected;           // Defined for all ViewModelObjects
    //
    // this.totalChildCount;
    // this.children;
    // this.isLeaf;
    // this.isExpanded;
    /**
     * @private
     * @property {Number} level number property used by ui-grid
     */
    this.$$treeLevel = levelNdx;

    /**
     * Note: This property is only defined when needed and then deleted after use.
     *
     * @private
     * @property {Boolean} TRUE if this node is known to have >0 siblings before it in the ordered collection of
     *           'child' nodes of its 'parent' node.
     */
    // this.incompleteHead = false;
    /**
     * Note: This property is only defined when needed and then deleted after use.
     *
     * @private
     * @property {Boolean} TRUE if this node is known to have >0 siblings after it in the ordered collection of
     *           'child' nodes of its 'parent' node.
     */
    // this.incompleteTail = false;
};

/**
 * Note: This property is only defined when needed and then deleted after use.
 *
 * @private
 * @property {String} A localized suffix string shown when async loading operations are being performed on this
 *           node.
 */
// this.loadingStatus;
ViewModelTreeNode.prototype.clearEditiableStates = function() {
    _.forEach( this.props, function( prop2 ) {
        vmPropSvc.resetUpdates( prop2 );
        vmPropSvc.setIsEditable( prop2, false );
    } );
};

/**
 * Sets the 'isEditable' of viewModelProperties if property in the associated IModelObject can be modified.
 *
 * @param {Boolean} editable - TRUE if the properties are to be marked as 'editable'.
 * @param {Boolean} override - TRUE if the editing state should be updated an announced even if not currently
 *            different than the desired state.
 * @param {Boolean} skipDigest - (Optional) TRUE if the 'triggerDigestCycle' function should NOT be called.
 */
ViewModelTreeNode.prototype.setEditableStates = function( editable, override, skipDigest ) {
    viewModelObjectSvc.setEditableStates( this, editable, override, skipDigest );
};

/**
 * Override the default implementation to return more helpful information.
 *
 * @return {String} Text used to identify this ViewModelTreeNode (e.g. 'displayName', 'levelNdx', etc.).
 */
ViewModelTreeNode.prototype.toString = function() {
    if( this.displayName ) {
        return 'node: displayName: ' + this.displayName + ' levelNdx: ' + this.levelNdx + ' childNdx: ' +
            this.childNdx;
    }

    return 'node: displayName: ' + '???';
};

/**
 * -------------------------------------------------------------------------<BR>
 * Define Service API<BR>
 * -------------------------------------------------------------------------<BR>
 */
var exports = {};

/**
 * @param {String} parentUid - UID of the 'parent' IModelObject used to access any 'child' nodes in the next
 *            level down in the hierarchy.
 *
 * @param {Number} startChildNdx - The index to start the 'next' page loading at.
 *
 * @param {Number} pageSize - (Optional) The maximum # of 'child' nodes to return in any single paged access
 *            (Default: See _defaultPageSize).
 *
 * @param {Boolean} addAfter - (Optional) TRUE if any new children should be added AFTER the optional
 *            'cursorNodeId' (Default: TRUE)
 *
 * @param {Boolean} skipFocusOccCheck - (Optional) TRUE if you do not want focus passed. (Default: FALSE)
 *
 * @param {String} filter - (Optional) Filter string.
 *
 * @return {ListLoadInput} Newly created wrapper initialized with properties from the given inputs.
 */
export let createListLoadInput = function( parentUid, startChildNdx, pageSize, addAfter, skipFocusOccCheck, filter ) {
    return new ListLoadInput( parentUid, startChildNdx, pageSize, addAfter, filter );
};

/**
 * @param {ViewModelObject} parentNode - The 'parent' ViewModelObject used to access any 'child' nodes in the
 *            next level down in the hierarchy.
 *
 * @param {ViewModelObjectArray} childNodes - Array of 'child' nodes resulting from a single load execution in
 *            the context of a 'parent' node (i.e. 'children' in the next level down in the hierarchy).
 *
 * @param {Number} totalChildCount - The total # of known 'child' nodes regardless of how many are currently
 *            loaded into the 'parent' 'children' array.
 *
 * @param {Number} startChildNdx - The 'childNdx' provided in the ListLoadInput that was used to load this data.
 *            This is returned as part of the result to handle cases when multiple loads are being performed on
 *            the same 'parent' and the original closure data could have changed during the async processing.
 *
 * @param {ViewModelObject} newTopNode - (Optional) If this property is defined, it will be used to replace the
 *            (unseen) 'top' node associated with the overall list.
 *            <P>
 *            Note: If 'children' array of this node is not empty it will be ignored and the 'childNodes' of
 *            this result will be set as the 1st level children of this 'parent' node.
 *
 * @return {ListLoadResult} Newly created wrapper initialized with properties from the given inputs.
 */
export let createListLoadResult = function( parentNode, childNodes, totalChildCount, startChildNdx, newTopNode ) {
    return new ListLoadResult( parentNode, childNodes, totalChildCount, startChildNdx, newTopNode );
};

/**
 * @param {TreeNodeInput} treeLoadInput - The input to a 'getTreeNodePage' operation that specified which
 *            'child' nodes to load dynamically.
 * @param {TreeNodeResult} treeLoadResult - The result of a 'getTreeNodePage' operation that resulted in
 *            ViewModelTreeNodes who's ViewModelProperties need to be loaded dynamically.
 * @param {AwTableColumnInfoArray} columnInfos - Array of AwTableColumnInfo containing property names to
 *            request.
 *
 * @return {PropertyLoadInput} Newly created wrapper initialized with properties from the given inputs.
 */
export let createPropertyLoadRequest = function( treeLoadInput, treeLoadResult, columnInfos ) {
    return new PropertyLoadRequest( treeLoadInput.parentNode, treeLoadResult.childNodes, columnInfos );
};

/**
 * @param {ViewModelTreeNodeArray} owningNodes - Array of nodes to load ViewModelProperty objects for.
 * @param {StringArray} propertyNames - Array property names to request.
 *
 * @return {PropertyLoadInput} Newly created wrapper initialized with properties from the given inputs.
 */
export let createPropertyLoadInput = function( owningNodes, propertyNames ) {
    return new PropertyLoadInput( owningNodes, propertyNames );
};

/**
 * @param {ViewModelTreeNodeArray} childNodes - Array of nodes who's ViewModelProperties have been
 *           loaded/updated.
 *
 * @return {PropertyLoadResult} Newly created wrapper initialized with properties from the given inputs.
 */
export let createPropertyLoadResult = function( childNodes ) {
    return new PropertyLoadResult( childNodes );
};

/**
 * @param {Number} totalFound - Total # of rows in the overall table.
 *
 * @return {TableLoadResult} Newly created wrapper initialized with properties from the given inputs.
 */
export let createTableLoadResult = function( totalFound ) {
    return new TableLoadResult( totalFound );
};

/**
 * @param {ViewModelTreeNode} parentNode - The 'parent' ViewModelTreeNode used to access any 'child' nodes in
 *            the next level down in the hierarchy.
 *
 * @param {Number} startChildNdx - The 'childNdx' to start the 'next' page loading at.
 *
 * @param {String} startChildId - (Optional) The 'id' of the node to start the 'next' page loading at.
 *
 * @param {String} cursorNodeId - (Optional) ID of an existing node in the 'parent' (and, presumably a
 *            ViewModelCollection) to insert any new nodes after (or before) depending on value of 'addAfter'.
 *
 * @param {Number} pageSize - (Optional) The maximum # of 'child' nodes to return in any single paged access
 *            (Default: See _defaultPageSize).
 *
 * @param {Boolean} addAfter - (Optional) TRUE if any new children should be added AFTER the optional
 *            'cursorNodeId' (Default: TRUE)
 * @param {ViewModelTreeNode} rootNode - The 'root' ViewModelTreeNode used to access any 'child' nodes in the
 *            next level down in the hierarchy.
 *
 * @return {TreeLoadInput} Newly created wrapper initialized with properties from the given inputs.
 */
export let createTreeLoadInput = function( parentNode, startChildNdx, startChildId, cursorNodeId, pageSize,
    addAfter, rootNode ) {
    return new TreeLoadInput( parentNode, startChildNdx, startChildId, cursorNodeId, pageSize, addAfter,
        rootNode );
};

/**
 * @param {ViewModelTreeNode} parentNode - The 'parent' ViewModelTreeNode used to access any 'child' nodes in
 *            the next level down in the hierarchy.
 *
 * @param {ViewModelTreeNodeArray} childNodes - Array of 'child' ViewModelTreeNode objects resulting from a
 *            single load execution in the context of a 'parent' node (i.e. 'children' in the next level down in
 *            the hierarchy).
 *
 * @param {Number} totalChildCount - The total # of known 'child' nodes regardless of how many are currently
 *            loaded into the 'parent' 'children' array.
 *
 * @param {Number} startChildNdx - The 'childNdx' provided in the TreeLoadInput that was used to load this data.
 *            This is returned as part of the result to handle cases when multiple loads are being performed on
 *            the same 'parent' and the original closure data could have changed during the async processing.
 *
 * @param {String} cursorNodeId - (Optional) ID of an existing node in the 'parent' (and, presumably a
 *            ViewModelCollection) to insert any new nodes after (or before) depending on value of 'addAfter'.
 *
 * @param {Number} newTopNode - (Optional) The node to be considered the new top-most 'parent' node as a result
 *            of this loading operation.
 *            <P>
 *            Note: Often this will be an 'occurrence' object of the underlying 'productModelObject'.
 *
 * @return {TreeLoadResult} Newly created wrapper initialized with properties from the given inputs.
 */
export let createTreeLoadResult = function( parentNode, childNodes, totalChildCount, startChildNdx, cursorNodeId,
    newTopNode ) {
    return new TreeLoadResult( parentNode, childNodes, totalChildCount, startChildNdx, cursorNodeId, newTopNode );
};

/**
 * @param {String} nodeId - Unique ID for this node within the tree-table. 'DocumentRevision', etc.).
 * @param {String} type - The type of model object represented by this tree node (i.e. 'Item'
 * @param {String} displayName - The name to display in the 'navigation' column of the tree-table.
 * @param {Number} levelNdx - The # of levels down from the 'root' of the tree-table.
 * @param {Number} childNdx - The index to this 'child' within the immediate 'parent'. This information is meant
 *            to help in when only a partial (or sparse) range of children have been loaded. This index is
 *            stable within the 'parent' and not representative of the order based on the 'id'.
 * @param {String} iconURL - The URL to the icon associated with the display of this node in the 'navigation'
 *            column of the tree-table.
 *
 * @return {ViewModelTreeNode} Newly created wrapper initialized with properties from the given inputs.
 */
export let createViewModelTreeNode = function( nodeId, type, displayName, levelNdx, childNdx, iconURL ) {
    return new ViewModelTreeNode( nodeId, type, displayName, levelNdx, childNdx, iconURL );
};

/**
 * Returns a class that is the overall model used to control the contents and behavior of the 'aw-table'
 * directive. This model allows for functional pieces to be overridden and implemented in application specific
 * ways. Defaults are specified here.
 *
 * @param {DeclViewModel} declViewModel - The 'declViewModel' containing properties to base the new
 *            'awTableViewModel' upon.
 * @param {String} gridId - ID of the {declGrid} the new model will wrap.
 * @param {Object} $scope - the scope object
 *
 * @returns {AwTableViewModel} New instance of this class.
 */
export let createViewModel = function( declViewModel, gridId, $scope ) {
    return new AwTableViewModel( declViewModel, gridId, $scope );
};

/**
 * Centralized handling of the 'start' phase of editing a cell in the table. This function is invoked by the
 * 'aw-table-cell' directive's controller.
 *
 * @param {Object} $scope - The AngularJS scope of the controller.
 * @param {Element} $element - The DOM Element the controller is attached to.
 * @param {ClickEvent} event - The ClickEvent on the cell where the editing is to take place.
 */
export let handleCellStartEdit = function( $scope, $element, event ) {
    if( $scope.prop && $scope.prop.isEditable && !$scope.prop.isEditing ) {
        // stop propagation to avoid firing the stopEdit event we are about to attach
        event.stopPropagation();

        // trigger any existing stopEdit event in case another cell is in edit mode
        $( 'body' ).triggerHandler( 'click' );

        $scope.prop.autofocus = true;
        $scope.prop.isEditing = true;

        $scope._bodyClickListener = function( event2 ) {
            exports.handleCellStopEdit( $scope, $element, event2 );
        };

        // click outside stops the edit
        $( 'body' ).on( 'click touchstart', $scope._bodyClickListener );

        /**
         * Apply editing class on the parent row so CSS can increase the height
         * <P>
         * Would be better to set this on the row scope and let the row template style the DOM but 'ui-grid'
         * doesn't seem to make that part of the template easily customizable.
         */
        var gridElem = $element.closest( '.aw-jswidgets-grid' );

        if( gridElem ) {
            var gridScope = gridElem.scope();

            if( gridScope && gridScope.findCellRowElement ) {
                var rowElem = gridScope.findCellRowElement( $element );

                if( rowElem ) {
                    rowElem.addClass( 'aw-jswidgets-isEditing-row' );
                }
            }
        }

        /**
         * Add tabIndex so that it can be used by the control being opened for edit. Otherwise, that control is
         * opened with the default tab index and tabbing does not move to the next control.
         */
        $scope.prop.tabIndex = event.currentTarget.tabIndex;

        /**
         * Set the cellTop element tab index to -1 so that backtab moves to the correct cell
         */
        if( $scope.prop.type !== 'DATE' && $scope.prop.type !== 'DATEARRAY' ) {
            event.currentTarget.tabIndex = -1;
        }
    }
};

/**
 * Centralized handling of the 'end' phase of editing a cell in the table. This function is invoked by the
 * 'aw-table-cell' directive's controller.
 *
 * @param {Object} $scope - The AngularJS scope of the controller.
 * @param {Element} $element - The DOM Element the controller is attached to.
 * @param {ClickEvent} event - The ClickEvent on some other element indicating editing is to stop.
 */
export let handleCellStopEdit = function( $scope, $element, event ) {
    /**
     * Ignore clicks in the date picker header and ckeditor toolbar.
     * <P>
     * Note: Can't reference with the standard datepicker id (#ui-datepicker-div) as the element has been
     * detached at this point (month change destroys original div)
     * <P>
     * Could be better to flip and ensure target has "#main-view" parent, but that would tie to tc.html
     */
    var target = $( event.target );
    if( target.parents( '.ui-datepicker-header' ).length === 0 && target.closest( '.cke' ).length === 0 ) {
        var cell = target.closest( '.aw-jswidgets-cellTop' );

        if( cell.length === 0 || !cell.scope() || !cell.scope().prop || !cell.scope().prop.isEditing ) {
            /**
             * For non-LOV object reference property stay on edit widget until object Reference panel is active
             */
            if( $scope.prop.type === 'OBJECT' && !$scope.prop.hasLov ) {
                if( $scope.referencePanelLoaded ) {
                    return;
                }
            }

            $scope.$evalAsync( function() {
                $scope.prop.isEditing = false;

                /**
                 * Set or unset dirty state based on current value
                 */
                var prevDisplayValues = $scope.prop.prevDisplayValues;
                $scope.prop.dirty = prevDisplayValues && prevDisplayValues.length > 0 &&
                    !_.isEqual( prevDisplayValues[ 0 ], $scope.prop.uiValue );
            } );

            var gridElem = $element.closest( '.aw-jswidgets-grid' );

            if( gridElem ) {
                var gridScope = gridElem.scope();

                if( gridScope && gridScope.findCellRowElement ) {
                    var rowElem = gridScope.findCellRowElement( $element );

                    if( rowElem ) {
                        rowElem.removeClass( 'aw-jswidgets-isEditing-row' );
                    }
                }
            }

            $( 'body' ).off( 'click touchstart', $scope._bodyClickListener );

            delete $scope._bodyClickListener;

            /**
             * Reset the cellTop element tab index
             */
            var $cellTop = $element.find( '.aw-jswidgets-cellTop' );

            if( $cellTop && $scope.prop ) {
                $cellTop.prop( 'tabindex', $scope.prop.tabIndex );
            }
        }
    }
};

/**
 * Test if the given object 'is-a' ListLoadInput created by this service.
 *
 * @param {Object} objectToTest - Object to check prototype history of.
 * @return {Boolean} TRUE if the given object is a ListLoadInput.
 */
export let isListLoadInput = function( objectToTest ) {
    return objectToTest instanceof ListLoadInput;
};

/**
 * Test if the given object 'is-a' TreeLoadInput created by this service.
 *
 * @param {Object} objectToTest - Object to check prototype history of.
 * @return {Boolean} TRUE if the given object is a TreeLoadInput.
 */
export let isTreeLoadInput = function( objectToTest ) {
    return objectToTest instanceof TreeLoadInput;
};

/**
 * Test if the given object 'is-a' ViewModelTreeNode created by this service.
 *
 * @param {Object} objectToTest - Object to check prototype history of.
 * @return {Boolean} TRUE if the given object is a ViewModelTreeNode.
 */
export let isViewModelTreeNode = function( objectToTest ) {
    return objectToTest instanceof ViewModelTreeNode;
};

/**
 * Test if the given object 'is-a' PropertyLoadInput created by this service.
 *
 * @param {Object} objectToTest - Object to check prototype history of.
 * @return {Boolean} TRUE if the given object is a PropertyLoadInput.
 */
export let isPropertyLoadInput = function( objectToTest ) {
    return objectToTest instanceof PropertyLoadInput;
};

/**
 * Resolve the row data for the 'next' page of 'children' nodes of the given 'parent'.
 * <P>
 * Note: The paging status is maintained in the 'parent' node.
 *
 * @param {TreeLoadInput} treeLoadInput - The original input to the load operation.
 *
 * @param {ViewModelTreeNodeArray} childNodesIn - The 'child' nodes just loaded.
 *
 * @param {Boolean} simplePage - TRUE if the 'childNodesIn' represents a 'page' (and NOT an array of all 'child'
 *            nodes). If TRUE, the nodes will be simply passed along as the result. If FALSE, the page of
 *            children will be extracted from this array.
 *
 * @param {Boolean} startReached - TRUE if the first page of the results has been reached.
 *
 * @param {Boolean} endReached - TRUE if the last page of the results has been reached.
 *
 * @param {ViewModelTreeNode} newTopNode - (Optional) The node to be considered the new top-most 'parent' node
 *            as a result of this loading operation.
 *
 * @return {TreeLoadResult} A new TreeLoadResult object containing result/status information.
 */
export let buildTreeLoadResult = function( treeLoadInput, childNodesIn, simplePage, startReached, endReached,
    newTopNode ) {
    var parentNode = newTopNode ? newTopNode : treeLoadInput.parentNode;

    var currentChildCount = parentNode.children ? parentNode.children.length : 0;

    if( simplePage ) {
        /**
         * Determine if we already know how many 'child' nodes this 'parent' has OR we need to compute it now.
         * <P>
         * Assume we do not know a 'total' for the 'parent' and simply add these 'child' nodes to the total.
         */
        var totalChildCount;

        if( _.isEmpty( childNodesIn ) ) {
            totalChildCount = currentChildCount;
        } else {
            totalChildCount = currentChildCount + childNodesIn.length;

            /**
             * Get the 'head' and 'tail' from the collection of new 'child' nodes.
             */
            var headChild = _.head( childNodesIn );
            var lastChild = _.last( childNodesIn );

            /**
             * Check if the 'tail' is known to NOT be the last 'child' of this 'parent'.<br>
             * If so: Mark that 'child' as an 'incompleteTail' so we know to ask for more below it later.
             */
            if( !declUtils.isNil( endReached ) ) {
                if( !endReached ) {
                    lastChild.incompleteTail = true;
                    totalChildCount++;
                }
            } else if( lastChild.childNdx + 1 < totalChildCount ) {
                lastChild.incompleteTail = true;
            }

            /**
             * Check if we are adding the 1st set of 'child' nodes to this 'parent' and the 'head' one is NOT
             * the actual 1st child of that 'parent'<BR>
             * If so: Mark that 'child' as an 'incompleteHead' so we know to ask for more above it later.
             */
            if( !declUtils.isNil( startReached ) ) {
                if( !startReached ) {
                    headChild.incompleteHead = true;
                }
            } else if( currentChildCount === 0 && headChild && headChild.childNdx > 0 ) {
                headChild.incompleteHead = true;
            }
        }

        /**
         * Create the final data object returned to the dataProvider.
         */
        return exports.createTreeLoadResult( treeLoadInput.parentNode, childNodesIn, totalChildCount,
            treeLoadInput.startChildNdx, treeLoadInput.cursorNodeId, newTopNode );
    }

    /**
     * Check for trival 'no child' case.
     */
    if( _.isEmpty( childNodesIn ) ) {
        return exports.createTreeLoadResult( parentNode, [], currentChildCount, treeLoadInput.startChildNdx,
            treeLoadInput.cursorNodeId, newTopNode );
    }

    /**
     * Determine starting/stop row range to resolve
     */
    var pageSize = treeLoadInput.pageSize;

    var begNdx = treeLoadInput.startChildNdx;

    if( begNdx >= childNodesIn.length ) {
        return exports.createTreeLoadResult( parentNode, [], childNodesIn.length, treeLoadInput.startChildNdx,
            treeLoadInput.cursorNodeId, newTopNode );
    }

    var endNdx = begNdx + pageSize;

    if( endNdx > childNodesIn.length ) {
        endNdx = childNodesIn.length;
    }

    var childNodes = childNodesIn.slice( begNdx, endNdx );

    if( endNdx < childNodesIn.length ) {
        _.last( childNodes ).incompleteTail = true;
    }

    /**
     * Resolve the async request.
     */
    return exports.createTreeLoadResult( parentNode, childNodes, childNodesIn.length,
        treeLoadInput.startChildNdx, treeLoadInput.cursorNodeId, newTopNode );
};

/**
 * Check if the given TreeLoadInput is valid.
 *
 * @param {TreeLoadInput} treeLoadInput - Object to validate.
 *
 * @return {String} The text of a failure message (or NULL if input is valid).
 */
export let validateTreeLoadInput = function( treeLoadInput ) {
    if( !treeLoadInput ) {
        return 'No TreeLoadInput specified';
    } else if( !treeLoadInput.parentNode || treeLoadInput.startChildNdx < 0 || treeLoadInput.pageSize <= 0 ) {
        return 'Invalid TreeLoadInput specified';
    }
    return undefined;
};

/**
 * Extract a parameter of a specific class from the given arguments array.
 * <P>
 * Note: The order or existence of parameters can vary when more-than-one property is specified in the
 * 'inputData' property of a DeclAction JSON. This code seeks out the requested one.
 *
 * @param {ObjectArray} argsIn - Array of argument objects
 *
 * @return {Object} ListLoadInput from the given arguments (or undefined if not found)
 */
export let findListLoadInput = function( argsIn ) {
    for( var ndx = 0; ndx < argsIn.length; ndx++ ) {
        var arg = argsIn[ ndx ];

        if( exports.isListLoadInput( arg ) ) {
            return arg;
        }
    }
    return undefined;
};

/**
 * Extract a parameter of a specific class from the given arguments array.
 * <P>
 * Note: The order or existence of parameters can vary when more-than-one property is specified in the
 * 'inputData' property of a DeclAction JSON. This code seeks out the requested one.
 *
 * @param {ObjectArray} argsIn - Array of argument objects
 *
 * @return {Object} PropertyLoadInput from the given arguments (or undefined if not found)
 */
export let findPropertyLoadInput = function( argsIn ) {
    var input;
    for( var ndx = 0; ndx < argsIn.length; ndx++ ) {
        var arg = argsIn[ ndx ];

        if( exports.isPropertyLoadInput( arg ) ) {
            input = arg;
        } else if( arg && arg.hasOwnProperty( 'clientName' ) && arg.hasOwnProperty( 'clientScopeURI' ) && input ) {
            // add input context from v-m
            input.propertyLoadContext = arg;
        }
    }
    return input;
};

/**
 * Extract a parameter of a specific class from the given arguments array.
 * <P>
 * Note: The order or existence of parameters can vary when more-than-one property is specified in the
 * 'inputData' property of a DeclAction JSON. This code seeks out the requested one.
 *
 * @param {ObjectArray} argsIn - Array of argument objects
 *
 * @return {Object} TreeLoadInput from the given arguments (or undefined if not found)
 */
export let findTreeLoadInput = function( argsIn ) {
    for( var ndx = 0; ndx < argsIn.length; ndx++ ) {
        var arg = argsIn[ ndx ];

        if( exports.isTreeLoadInput( arg ) ) {
            return arg;
        }
    }
    return undefined;
};

exports = {
    createListLoadInput,
    createListLoadResult,
    createPropertyLoadRequest,
    createPropertyLoadInput,
    createPropertyLoadResult,
    createTableLoadResult,
    createTreeLoadInput,
    createTreeLoadResult,
    createViewModelTreeNode,
    createViewModel,
    handleCellStartEdit,
    handleCellStopEdit,
    isListLoadInput,
    isTreeLoadInput,
    isViewModelTreeNode,
    isPropertyLoadInput,
    buildTreeLoadResult,
    validateTreeLoadInput,
    findListLoadInput,
    findPropertyLoadInput,
    findTreeLoadInput
};
export default exports;
/**
 * @member awTableService
 * @memberof NgServices
 */
app.factory( 'awTableService', () => exports );

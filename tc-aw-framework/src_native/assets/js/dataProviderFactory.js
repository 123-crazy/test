/* eslint-disable max-lines */
// Copyright (c) 2020 Siemens

/**
 * Data provider factory
 *
 * @module js/dataProviderFactory
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import AwRootScopeService from 'js/awRootScopeService';
import viewModelCollectionFactory from 'js/viewModelCollectionFactory';
import selectionModelFactory from 'js/selectionModelFactory';
import localeSvc from 'js/localeService';
import editHandlerFactory from 'js/editHandlerFactory';
import editHandlerSvc from 'js/editHandlerService';
import uwUtilSvc from 'js/uwUtilService';
import awTableSvc from 'js/awTableService';
import dataSourceService from 'js/dataSourceService';
import dataCtxService from 'js/declarativeDataCtxService';
import declModelRegistrySvc from 'js/declModelRegistryService';
import editUtilsService from 'js/editUtilsService';
import appCtxService from 'js/appCtxService';
import assert from 'assert';
import _ from 'lodash';
import declUtils from 'js/declUtils';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import arrayUtils from 'js/arrayUtils';
import browserUtils from 'js/browserUtils';
import parsingUtils from 'js/parsingUtils';
import debugService from 'js/debugService';
import editEventsService from 'js/editEventsService';

import 'js/awTableStateService';

/**
 * {StringArray} Collection of valid properties in the 'inputData' property of dataProvider's JSON definition.
 */
var _modifiablePropertiesViaInputData = [ 'selectionModel', 'accessMode', 'topNodeUid', 'editSupportParamKeys' ];

/**
 * {Boolean} TRUE if tree node insertion details should be logged.
 */
var _debug_logTreeLoadActivity = false;

/**
 * Constructs an object that wraps access to a 'viewModelCollection' created by the
 * 'viewModelCollectionFactory'.
 *
 * @class UwDataProvider
 *
 * @param {QueueService} $q - Queue service to use.
 *
 * @param {DeclDataProviderJson} dataProviderJson - The JSON definition of the desired DeclDataProvider object
 *            from the DeclViewModel's JSON.
 *
 * @param {DeclAction} actionObj - The associated DeclAction object from the DeclViewModel's JSON.
 *
 * @param {String} dataProviderName - ID of the DeclDataProvider in the DeclViewModel structure.
 *
 * @param {Object} someDataProviderSvc - Some API object where various APIs (i.e. 'getFirstPage', 'getNextPage',
 *            etc.) methods are implemented (e.g. 'js/declDataProviderService').
 *
 * @param {ViewModelCollection} viewModelCollection - The 'viewModelCollection' used to hold all
 *            ViewModelObjects managed by this DataProvider.
 *
 * @param {StringMap} actionMap - Map of action name to the action object from a declViewModel's JSON
 *            definition.
 */
var UwDataProvider = function( $q, dataProviderJson, actionObj, dataProviderName, someDataProviderSvc,
    viewModelCollection, actionMap ) {
    var dpSelf = this; // eslint-disable-line consistent-this

    /**
     * Data that is passed into the data provider constructor from outside of the view model.
     */
    var _ctorInputData = dataProviderJson ? dataProviderJson.inputData : null;

    /**
     * {Boolean} TRUE if 'destroy' has been invoked on this instance.
     */
    dpSelf._isDestroyed = false;

    /**
     * @property {String} noResultsFound - Localized message stating 'No results found'.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.noResultsFound = null;

    /**
     * @property {String} isLoading - Localized message stating 'loading'.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.isLoading = null;

    /**
     * @property {Boolean} cacheCollapse - cache collapse infomation to reuse in next expand.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.cacheCollapse = false;

    /**
     * @property {Object} someDataProviderSvc - Some API object where 'getFirstPage', 'getNextPage', et al.
     *           methods are implemented (e.g. 'js/declDataProviderService').
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.someDataProviderSvc = someDataProviderSvc;

    /**
     * @property {String} name - name of data provider object
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.name = dataProviderName;

    /**
     * @property {ViewModelCollection} viewModelCollection - viewModelCollection which maintains the loaded
     *           ViewModelObjects and also have APIs to access the information of collection.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.viewModelCollection = viewModelCollection;

    /**
     * @property {Number} startIndex - Start/Next index into a virtual list.
     *           <P>
     *           Note: This property is accessed by some declViewModel bindings and 'glue' code. While it is
     *           somewhat analogous to the data in the newer 'cursorObject', it is necessary to keep it exposed
     *           for support of these earlier uses of it.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.startIndex = 0;

    /**
     * @property {DeclAction} action - The 'declAction' JSON object.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.action = null;

    /**
     * @property {DeclAction} action - The 'declAction' JSON object.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.focusAction = null;

    /**
     * @property {DeclDataProviderJson} json - The 'UwDataProvider' JSON object.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.json = null;

    /**
     * @property {Object} policy - The Currently set property policy object.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.policy = null;

    /**
     * @property {Object} selectionModel - Object which maintains all the selection objects stuff and provides
     *           APIs to access information.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.selectionModel = selectionModelFactory
        .buildSelectionModel( dataProviderJson ? dataProviderJson.selectionModelMode : null );

    /**
     * @property {Boolean} noResults - Flag decides whether to show no results message if there are no values
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.noResults = false;

    /**
     * @property {ObjectArray} sortCriteria - Array of ordered sort criteria objects.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.sortCriteria = [];

    /**
     * @property {Object} filiterMap - A map (string, list of SearchFilter) containing the list of search
     *           filters for each search filter field. The key in the map is the property name that represents
     *           the filter category. It is in the format "TypeName.PropertyName". e.g
     *           WorkspaceObject.object_type
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.filterMap = {};

    /**
     * @property {ViewModelTreeNode} The ViewModelTReeNode which is the logical (but unseen) 'top' node in any
     *           hierarchy being managed by this UwDataProvider
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.topTreeNode = null;

    /**
     * Selected objects
     */
    dpSelf.selectedObjects = [];

    /**
     * {Boolean} TRUE if any editHandler associated with this UwDataProvider has been registered.
     */
    var _editHandlerRegistered;

    // Toggle the display of Cell Decorators.
    dpSelf.toggleDecoratorsEvent = eventBus.subscribe( dpSelf.name + '.toggleCellDecorators', function(
        eventData ) {
        if( eventData ) {
            dpSelf.showDecorators = eventData.toggleState;
        } else {
            if( dpSelf.showDecorators ) {
                dpSelf.showDecorators = false;
            } else {
                dpSelf.showDecorators = true;
            }
        }
    } );

    /**
     * Fire modelObjects updated event using data provider name space
     *
     * @param {Object} dataCtxNode - The 'scope' to use.
     * @param {Object} eventData - Event data containing data to include in notify.
     */
    var _notifyModelObjectsUpdate = function( dataCtxNode, eventData ) {
        if( dataCtxNode ) {
            dpSelf.syncSelectionModel( dataCtxNode );
        }

        eventData = eventData || {};

        // Set standard data
        eventData.viewModelObjects = dpSelf.viewModelCollection.getLoadedViewModelObjects();
        eventData.noResults = dpSelf.noResults;

        // Publish event
        eventBus.publish( dpSelf.name + '.modelObjectsUpdated', eventData );
    };

    /**
     * Insert the given array of ViewModelObjects into the given viewModelCollection starting after the given
     * 'cursor' ViewModelObject ID.
     *
     * @param {ViewModelCollection} vmCollection - The ViewModelCollection to update.
     * @param {String} cursorId - ID of the object The ViewModelObject in the collection to insert after.
     * @param {ViewModelObjectArray} vmosToInsert - The ViewModelObjects to insert.
     * @param {Boolean} addAfter - TRUE if any new children should be added AFTER the optional 'cursorNodeId'
     *            (Default: TRUE)
     */
    function _insertModelObjects( vmCollection, cursorId, vmosToInsert, addAfter ) {
        var cursorNdx = vmCollection.findViewModelObjectById( cursorId );

        var cursorNode = cursorNdx === -1 ? null : vmCollection.getViewModelObject( cursorNdx );

        var loadedVMOs = vmCollection.getLoadedViewModelObjects();

        if( _debug_logTreeLoadActivity ) {
            logger.info( '_insertModelObjects: ' + '\n' + //
                'n1stLevelFound : ' + vmCollection.totalFound + '\n' + //
                'n1stLevelLoaded: ' + vmCollection.totalObjectsLoaded + '\n' + //
                'nLoadedOverall : ' + loadedVMOs.length + '\n' + //
                'cursorId       : ' + cursorId + '\n' + //
                'nVMOsToInsert  : ' + vmosToInsert.length + '\n' + //
                'addAfter       : ' + addAfter + '\n' + //
                'cursorNdx      : ' + cursorNdx + '\n' + //
                'cursorNode     : ' + cursorNode );
        }

        /**
         * Check if we found where to insert and it is NOT the top level node.
         * <P>
         * Note: This function purposefully does not maintain the 'totalObjectsLoaded' for the overall
         * viewModelCollection since that value only makes sense for the 'top' node.
         */
        if( cursorNode && cursorNode.levelNdx !== -1 ) {
            var childNdxOffset;

            if( addAfter ) {
                /**
                 * Check if the VMOs being inserted are from the same level of the tree.<BR>
                 * If so: Adjust the 'childNdx' of the new VMOs to relative to that of the 'cursor' node. This
                 * property is helpful when debugging.
                 */
                if( cursorNode.levelNdx === vmosToInsert[ 0 ].levelNdx ) {
                    childNdxOffset = loadedVMOs[ cursorNdx ].childNdx + 1;

                    for( var ndx1 = 0; ndx1 < vmosToInsert.length; ndx1++ ) {
                        vmosToInsert[ ndx1 ].childNdx = childNdxOffset + ndx1;
                    }
                }

                /**
                 * AW-49335 - Jumping to target does not work when page is refreshed...
                 * <P>
                 * Check if the 'cursor' node has any children<br>
                 * If so: We need to account for them before we insert
                 * <P>
                 * Note: We look forward until we find a node at the same (or 'above') level.
                 */
                var insertNdx = cursorNdx;

                for( var ndx3 = cursorNdx + 1; ndx3 < loadedVMOs.length; ndx3++ ) {
                    if( loadedVMOs[ ndx3 ].levelNdx <= cursorNode.levelNdx ) {
                        break;
                    }

                    insertNdx++;
                }

                arrayUtils.insert( loadedVMOs, insertNdx, vmosToInsert );
            } else {
                /**
                 * Check if the VMOs being inserted are from the same level of the tree.<BR>
                 * If so: Adjust the 'childNdx' of the new VMOs to relative to that of the 'cursor' node. This
                 * property is helpful when debugging.
                 */
                if( cursorNode.levelNdx === vmosToInsert[ 0 ].levelNdx ) {
                    childNdxOffset = loadedVMOs[ cursorNdx ].childNdx - vmosToInsert.length;

                    for( var ndx2 = 0; ndx2 < vmosToInsert.length; ndx2++ ) {
                        vmosToInsert[ ndx2 ].childNdx = childNdxOffset + ndx2;
                    }
                }

                /**
                 * Insert just before the 'cursor' node.
                 * <P>
                 * Note: Even if the 'cursor' node is preceded by any children from an earlier 'sibling' (i.e. a
                 * node at the same tree level) we do NOT need to account for them before we insert since the
                 * 'cursor' position defines the correct break in the tree level.
                 */
                arrayUtils.insertBefore( loadedVMOs, cursorNdx, vmosToInsert );
            }
        }
    } // _insertModelObjects

    /**
     * Locate the 'child' in the given 'parent' based on the 'child' node's ID.
     *
     * @param {ViewModelTreeNode} parentNode - The 'parent' who's 'children' to search.
     * @param {String} cursorNodeId - The ID of the 'child' node to find.
     * @returns {Number} Index to the 'child' node (or -1 if not found)
     */
    function _findChildNdx( parentNode, cursorNodeId ) {
        var nChild = parentNode.children ? parentNode.children.length : 0;

        if( cursorNodeId ) {
            for( var ndx = 0; ndx < nChild; ndx++ ) {
                if( parentNode.children[ ndx ].id === cursorNodeId ) {
                    return ndx;
                }
            }
        }

        return -1;
    }

    /**
     * Insert the results into the ViewModelCollection array starting at the current location of the 'cursor'
     * node.
     *
     * @param {TreeLoadInput} treeLoadInput - The original input parameters used to generate the response we are
     *            processing now.
     *
     * @param {Object} responseObj - Object returned from the associated load 'action'
     *
     * @param {Object} dataCtxNode - Data context used for selection model sync.
     *
     * @param {Object} origCursorObj - The cursorObject of the 'parent' node BEFORE the load operation.
     *
     * @return {ViewModelCollection} A reference to the updated ViewModelCollection object.
     */
    function _processLoadTreeNodePageResponse( treeLoadInput, responseObj, dataCtxNode, origCursorObj ) { // eslint-disable-line
        assert( responseObj, 'Action did not return a ResponseResult Object' );

        var treeLoadResult = responseObj.treeLoadResult;

        assert( treeLoadResult, 'Action did not return a TreeLoadResult Object' );

        /**
         * Move the 'parent' and 'viewModelCollection' into handier variables.
         */
        var resultParentNode = treeLoadResult.parentNode;

        var vmCollection = dpSelf.viewModelCollection;

        /**
         * Determine if we are working on the very top node of the tree.
         */
        var isParentRoot = resultParentNode.levelNdx === -1;

        /**
         * Optionally log some useful information
         */
        if( _debug_logTreeLoadActivity && !_.isEmpty( treeLoadResult.childNodes ) ) {
            logger.info( '_processLoadTreeNodePageResponse' + '\n' + 'parentNode: ' + resultParentNode +
                ' isParentRoot: ' + isParentRoot + '\n' + '# children returned: ' +
                treeLoadResult.childNodes.length );
        }

        /**
         * AW-47271 - bash_PI1712-2 : Can Not expand Sub Assembly in tree View in a spcific scenario
         * <P>
         * Find the original 'parent' node in the vmCollection and see if it is still expanded.
         * <P>
         * Note: If we are working on the 'root', skip this check since the 'root' cannot actually be collapsed.
         */
        if( !isParentRoot ) {
            /**
             * Check if NOT expanded<BR>
             * If so: No need to continue. Return current vmCollection unchanged.
             * <P>
             * Note: The 'parent' node returned from the async processing can sometimes be a clone made during
             * processing. It is best to go back to the original to be sure we do not miss the latest state.
             */
            var origParentNdx = vmCollection.findViewModelObjectById( uwUtilSvc.getEvaluatedId( resultParentNode ) );
            if( origParentNdx === -1 || !vmCollection.getViewModelObject( origParentNdx ).isExpanded ) {
                if( _debug_logTreeLoadActivity ) {
                    logger
                        .info( '_processLoadTreeNodePageResponse: Skipping insertion of child nodes into collapsed or missing parent' +
                            '\n' + 'parent: ' + resultParentNode + '\n' + 'index: ' + origParentNdx );
                }

                return vmCollection;
            }
        }

        /**
         * Check if we actually have results to insert.
         */
        var newTopNode;
        var moreAboveFirst;
        var moreBelowLast;

        if( treeLoadResult.totalChildCount > 0 && !_.isEmpty( treeLoadResult.childNodes ) ) {
            /**
             * If this is the 'top' level node we now know IT is NOT empty.
             */
            if( isParentRoot ) {
                dpSelf.noResults = false;
            }

            var expectantParentNode = resultParentNode;

            /**
             * Get the effective 'parent' node from the paths (if necessary)
             */
            var nRootPaths = _.isEmpty( treeLoadResult.rootPathNodes ) ? 0 :
                treeLoadResult.rootPathNodes.length;

            var usedPathParent;

            if( nRootPaths > 0 ) {
                /**
                 * Get the 'top' node based on the path but do not override the current 'expectantParentNode'
                 * unless it refers to a different object.
                 */
                var resultTopNode = _.last( treeLoadResult.rootPathNodes );

                if( resultParentNode.uid !== resultTopNode.uid ) {
                    expectantParentNode = resultTopNode;
                    usedPathParent = true;
                }
            }

            /**
             * Check if the action has passed back a new 'top' (unseen) 'parent' node.
             * <P>
             * Note: It is a bad thing to change the 'top' node AFTER we have already been adding the previous
             * 'top' children into the ViewModelCollection. Do not do this!
             */
            newTopNode = treeLoadResult.newTopNode;

            if( newTopNode && newTopNode.levelNdx === -1 ) {
                dpSelf.topTreeNode = newTopNode;
                dpSelf.topTreeNode.children = null;

                dpSelf.topNodeUid = dpSelf.topTreeNode.uid;

                if( !usedPathParent ) {
                    resultParentNode = treeLoadResult.newTopNode;
                }
            }

            /**
             * Determine if we are inserting before or after the 'start' or 'cursor' node.
             */
            var addAfter = declUtils.isNil( treeLoadInput.addAfter ) ? true : treeLoadInput.addAfter;

            /**
             * Check for the trivial case of 1st-time children
             * <P>
             * Note: We do a shallow clone to make sure it is not the same array as the result.
             */
            var newParent = _.isEmpty( expectantParentNode.children );

            if( newParent ) {
                expectantParentNode.children = _.clone( treeLoadResult.childNodes );
            } else {
                /**
                 * Insert the new 'child' nodes into the 'children' array property of the 'parent' node.
                 * <P>
                 * Try to use the 'cursor' node to locate exactly where in the 'parent' to insert the new
                 * 'child' nodes.
                 * <P>
                 * If no 'cursor' then just trust the previous index as a 'best guess' (works in a downward list
                 * scenario).
                 * <P>
                 * Note: We have to do this since some cases where the children were inserted out of order or
                 * even had duplicates. Relocating the 'cursor' locks it in for at least 'this' thread pass.
                 */
                var cursorChildNdx = _findChildNdx( expectantParentNode, treeLoadResult.cursorNodeId );
                var insertionChildNdx = cursorChildNdx;

                if( addAfter ) {
                    /**
                     * Reset the 'start' info of the 'parent' node (Server bug? we should not have to do this)
                     */
                    if( origCursorObj ) {
                        expectantParentNode.cursorObject.startIndex = origCursorObj.startIndex;
                        expectantParentNode.cursorObject.startOccUid = origCursorObj.startOccUid;
                        expectantParentNode.cursorObject.startReached = origCursorObj.startReached;
                    }
                    /**
                     * First new 'child' node inserted AFTER another cannot be an 'incompleteHead'.
                     */
                    _.first( treeLoadResult.childNodes ).incompleteHead = false;

                    /**
                     * Insert new 'child' nodes into 'parent' AFTER cursor 'child' node.
                     * <P>
                     * Note: Original cursor 'child' can no longer be an 'incompleteTail'.
                     */
                    if( insertionChildNdx === -1 ) {
                        insertionChildNdx = treeLoadResult.startChildNdx;
                    } else {
                        expectantParentNode.children[ cursorChildNdx ].incompleteTail = false;

                        insertionChildNdx++;
                    }

                    arrayUtils.insert( expectantParentNode.children, insertionChildNdx,
                        treeLoadResult.childNodes );
                } else {
                    /**
                     * Reset the 'end' info of the 'parent' node (Server bug? we should not have to do this)
                     */
                    if( origCursorObj ) {
                        expectantParentNode.cursorObject.endIndex = origCursorObj.endIndex;
                        expectantParentNode.cursorObject.endOccUid = origCursorObj.endOccUid;
                        expectantParentNode.cursorObject.endReached = origCursorObj.endReached;
                    }
                    /**
                     * Last new 'child' node inserted BEFORE another cannot be an 'incompleteTail'
                     */
                    _.last( treeLoadResult.childNodes ).incompleteTail = false;

                    /**
                     * Insert new 'child' nodes into 'parent' BEFORE cursor 'child' node.
                     * <P>
                     * Note: Original cursor 'child' can no longer be an 'incompleteHead'.
                     */
                    if( insertionChildNdx === -1 ) {
                        insertionChildNdx = treeLoadResult.startChildNdx;
                    } else {
                        expectantParentNode.children[ cursorChildNdx ].incompleteHead = false;
                    }

                    arrayUtils.insertBefore( expectantParentNode.children, insertionChildNdx,
                        treeLoadResult.childNodes );
                }
            }

            /**
             * Fire a 'resetState' event, sourced to this uwDataProvider, for all tree-table 'focused load'
             * cases.
             */
            if( !treeLoadResult.retainTreeExpansionStates ) {
                if( isParentRoot && treeLoadResult.isFocusedLoad ) {
                    eventBus.publish( dpSelf.name + '.resetState', {} );
                }
            }

            /**
             * Check if we were given a non-trivial path to a root (the new 'child' nodes are to be added to the
             * bottom of).
             */
            if( nRootPaths > 1 && newParent ) {
                dpSelf.topTreeNode = _.first( treeLoadResult.rootPathNodes );

                dpSelf.topNodeUid = dpSelf.topTreeNode.uid;
                if( !treeLoadResult.vmNodesInTreeHierarchyLevels ) {
                    var newNodes = [];

                    var prevParentNode = treeLoadResult.rootPathNodes[ 0 ];

                    for( var ndx = 1; ndx < treeLoadResult.rootPathNodes.length; ndx++ ) {
                        var parent = treeLoadResult.rootPathNodes[ ndx ];

                        newNodes.push( parent );

                        prevParentNode.children = [ parent ];

                        /**
                         * If expansion states are cleared after 'resetState' event, tree hierarchy that we are
                         * creating while building tree using rootPathNodes, those rootPathNodes should be saved in
                         * expansion state as they are expanded.
                         * <P>
                         * This is required for tree refresh scenarios (the level the user is working on should get
                         * restored after refresh)
                         */
                        eventBus.publish( dpSelf.name + '.saveRowExpanded', parent );

                        prevParentNode = parent;
                    }

                    /**
                     * Mark the children to be 1 level below the 'expectant' parent
                     */
                    var nextLevelNdx = _.last( treeLoadResult.rootPathNodes ).levelNdx + 1;

                    for( var ndx2 = 0; ndx2 < treeLoadResult.childNodes.length; ndx2++ ) {
                        var child = treeLoadResult.childNodes[ ndx2 ];

                        child.levelNdx = nextLevelNdx;
                        child.$$treeLevel = nextLevelNdx;

                        newNodes.push( child );
                    }

                    /**
                     * Put all the 'parent' path + 'child' nodes as the sole content of the collection
                     */
                    vmCollection.clear();

                    vmCollection.setTotalObjectsFound( treeLoadResult.rootPathNodes.length - 1 +
                        treeLoadResult.totalChildCount );

                    vmCollection.setViewModelObjects( newNodes );
                } else {
                    var currentlyLoadedRootPathNodeVMO = null;
                    var startLevelIndex = 0;
                    var loadedVMOs = vmCollection.getLoadedViewModelObjects();
                    var numberOfLevelsToBeInserted = 0;

                    // Check if there is request to merge new ViewModelTreeNodes from TreeLoadResult into existing loaded VMOs.
                    if( treeLoadResult.mergeNewNodesInCurrentlyLoadedTree && loadedVMOs ) {
                        for( startLevelIndex = treeLoadResult.rootPathNodes.length; startLevelIndex >= 1; startLevelIndex-- ) {
                            currentlyLoadedRootPathNodeVMO = loadedVMOs
                                .filter( function( vmo ) {
                                    return treeLoadResult.rootPathNodes[ startLevelIndex - 1 ] && vmo.id === treeLoadResult.rootPathNodes[ startLevelIndex - 1 ].id;
                                } )[ 0 ];

                            /**
                             * currentlyLoadedRootPathNodeVMO is the parent node which is currently loaded in
                             * VMO and its also present in response structure.
                             */
                            if( currentlyLoadedRootPathNodeVMO ) {
                                numberOfLevelsToBeInserted++;
                                currentlyLoadedRootPathNodeVMO.nextLevelInsert = true;
                                break;
                            }
                        }
                    }

                    /**
                     * 1)vmNodesInTreeHierarchyLevels is an array of arrays. Each array index represents vmNodes
                     * at given level (index 0 in array represents level -1 which is not displayed, index 1
                     * level 0 and so on). Each level will have node where next level nodes need to be inserted.
                     *
                     * 2)rootPathNodes contain array of parents with one or more having children under it.
                     *
                     * 3)At each level, you will have parent below which next level is supposed to be inserted.
                     */
                    // Iterate through all levels
                    for( ndx = startLevelIndex; ndx < treeLoadResult.vmNodesInTreeHierarchyLevels.length; ndx++ ) {
                        var vmNodes = treeLoadResult.vmNodesInTreeHierarchyLevels[ ndx ];

                        // Get parent node below which next level needs to be inserted.
                        var nextLevelParentNode = vmNodes
                            .filter( function( vmo ) {
                                return treeLoadResult.rootPathNodes[ ndx ] && vmo.id === treeLoadResult.rootPathNodes[ ndx ].id;
                            } )[ 0 ];

                        if( nextLevelParentNode ) {
                            nextLevelParentNode.nextLevelInsert = true;
                            numberOfLevelsToBeInserted++;
                        }
                    }

                    _updateViewModelCollectionInTreeHierarchyFormat( treeLoadResult, vmCollection,
                        currentlyLoadedRootPathNodeVMO, startLevelIndex, numberOfLevelsToBeInserted );
                }
            } else if( treeLoadResult.nonRootPathHierarchicalData ) {
                /**
                 * If we are given multiple expanded nodes which are all not necessarily on the "rootPath"
                 */
                _updateViewModelCollectionInTreeHierarchyFormatForTopDown( treeLoadResult, vmCollection );
            } else {
                /**
                 * Check if we are processing the unseen 'root' node.<br>
                 * If so: Just add the results as the only items in the collection.<BR>
                 * If not: Insert the results in at the correct location.
                 */
                if( isParentRoot && treeLoadResult.startChildNdx === 0 ) {
                    vmCollection.clear();
                    vmCollection.setTotalObjectsFound( treeLoadResult.totalChildCount );
                    vmCollection.setViewModelObjects( _.clone( treeLoadResult.childNodes ) );
                } else {
                    if( treeLoadResult.cursorNodeId ) {
                        _insertModelObjects( vmCollection, treeLoadResult.cursorNodeId,
                            treeLoadResult.childNodes, addAfter );
                    } else {
                        if( treeLoadResult.startChildNdx === 0 ) {
                            _insertModelObjects( vmCollection, uwUtilSvc.getEvaluatedId( expectantParentNode ),
                                treeLoadResult.childNodes, addAfter );
                        } else {
                            var insertionNode = expectantParentNode.children[ treeLoadResult.startChildNdx - 1 ];

                            _insertModelObjects( vmCollection, uwUtilSvc.getEvaluatedId( insertionNode ), treeLoadResult.childNodes,
                                addAfter );
                        }
                    }
                }

                /**
                 * Update the totalNumber of known 'child' nodes.
                 */
                expectantParentNode.totalChildCount = treeLoadResult.totalChildCount;
            }

            /**
             * Fire a 'modelObjectsUpdated' event, sourced to this uwDataProvider, but only for changes to the
             * outer-most level. This event includes the entire ViewModelCollection. This event is required to
             * have the aw-table controller know when to update the information in the GridWrapper.
             */
            if( isParentRoot ) {
                var nChild = resultParentNode.children ? resultParentNode.children.length : 0;

                moreAboveFirst = false;
                moreBelowLast = false;

                if( resultParentNode.cursorObject ) {
                    moreAboveFirst = !resultParentNode.cursorObject.startReached;
                    moreBelowLast = !resultParentNode.cursorObject.endReached;
                } else {
                    moreBelowLast = resultParentNode.totalChildCount > nChild;
                }

                _notifyModelObjectsUpdate( dataCtxNode, {
                    prevPage: moreAboveFirst,
                    nextPage: moreBelowLast
                } );
            } else {
                dpSelf.syncSelectionModel( dataCtxNode );
            }

            /**
             * Fire a 'treeNodesLoaded' event, sourced to this uwDataProvider, for all tree-table changes. This
             * event includes only the input/result structures for the current load operation. This event is
             * used to load additional properties in an async fashion.
             */
            eventBus.publish( dpSelf.name + '.treeNodesLoaded', {
                treeLoadInput: treeLoadInput,
                treeLoadResult: treeLoadResult
            } );

            /**
             * Check if the response indicates we should make sure the parent is expanded.
             */
            if( treeLoadResult.expandParent ) {
                eventBus.publish( dpSelf.name + '.expandTreeNode', {
                    parentNode: resultParentNode
                } );
            }
        } else if( isParentRoot ) {
            /**
             * If this is the 'top' level node we now know it IS empty.
             */
            dpSelf.noResults = true;

            /**
             * Check if the action has passed back a new 'top' (unseen) 'parent' node.
             * <P>
             * Note: It is a bad thing to change the 'top' node AFTER we have already been adding the previous
             * 'top' children into the ViewModelCollection. Do not do this!
             */
            newTopNode = treeLoadResult.newTopNode;

            if( newTopNode && newTopNode.levelNdx === -1 ) {
                dpSelf.topTreeNode = newTopNode;
                dpSelf.topTreeNode.children = null;

                dpSelf.topNodeUid = dpSelf.topTreeNode.uid;
            }

            /**
             * If empty child nodes are passed to provider, they should be honored and should get updated in UI.
             */
            if( treeLoadResult.startChildNdx === 0 ) {
                /**
                 * This change is when we delete a single row from the tree table
                 */
                moreAboveFirst = false;
                moreBelowLast = false;
                /**
                 * Determine if this node is NOT an 'incompleteHead' or 'incompleteTail'
                 */
                if( resultParentNode.cursorObject ) {
                    moreAboveFirst = !resultParentNode.cursorObject.startReached;
                    moreBelowLast = !resultParentNode.cursorObject.endReached;
                }

                var emptyChildNodes = !moreAboveFirst && !moreBelowLast;

                if( emptyChildNodes ) {
                    vmCollection.clear();
                    vmCollection.setTotalObjectsFound( treeLoadResult.totalChildCount );
                    vmCollection.setViewModelObjects( _.clone( treeLoadResult.childNodes ) );

                    _notifyModelObjectsUpdate( dataCtxNode, {
                        prevPage: moreAboveFirst,
                        nextPage: moreBelowLast
                    } );
                }
            }
        }

        return vmCollection;
    }

    /**
     * @param {TreeLoadResult} treeLoadResult - Object containing result/status information.
     * @param {ViewModelObjectArray} vmCollection - VMO array to set
     * @param {ViewModelObject} currentlyLoadedRootPathNodeVMO - ...
     * @param {Number} startLevelIndex -
     * @param {Number} numberOfLevelsToBeInserted -
     */
    function _updateViewModelCollectionInTreeHierarchyFormat( treeLoadResult, vmCollection,
        currentlyLoadedRootPathNodeVMO, startLevelIndex, numberOfLevelsToBeInserted ) {
        var finalVMOs = [];
        var lvlNdx = startLevelIndex;
        var numberOfLevelsInserted = 0;
        var indx = 0;

        if( currentlyLoadedRootPathNodeVMO ) {
            /**
             * currentlyLoadedRootPathNodeVMO is populated. That means parentNode that has come in
             * TreeLoadResult is already loaded in vmCollection. In that case , restore existing VMOs, merge new
             * VMOs that we got in response in currently loaded VMOs.
             */
            arrayUtils.insert( finalVMOs, 0, vmCollection.getLoadedViewModelObjects() );
            indx = finalVMOs.indexOf( currentlyLoadedRootPathNodeVMO );
        } else {
            // Build Final ViewModelTreeNodes array. Add zeroth level , iterate, check for next level insertion point,
            // and add new level there.Keep building and iterating through whole list.
            arrayUtils.insert( finalVMOs, 0, treeLoadResult.vmNodesInTreeHierarchyLevels[ lvlNdx++ ] );
        }

        while( indx < finalVMOs.length && numberOfLevelsInserted < numberOfLevelsToBeInserted ) {
            var vmo = finalVMOs[ indx ];

            if( vmo.nextLevelInsert ) {
                vmo.isExpanded = true;

                arrayUtils.insert( finalVMOs, indx, treeLoadResult.vmNodesInTreeHierarchyLevels[ lvlNdx ] );

                // Next level nodes should be stored as children under current level parent.
                vmo.children = _.clone( treeLoadResult.vmNodesInTreeHierarchyLevels[ lvlNdx ] );
                vmo.totalChildCount = vmo.children.length;
                vmo.isLeaf = false;

                // Store parent as expanded in state/local storage.
                eventBus.publish( dpSelf.name + '.saveRowExpanded', vmo );

                delete vmo.nextLevelInsert;
                lvlNdx++;
                numberOfLevelsInserted++;
            }

            indx++;
        }

        // filter out vmo with treeLevel -1 as we don't show topLevel Node.
        finalVMOs = finalVMOs.filter( function( vmo ) {
            return vmo.$$treeLevel !== -1;
        } );

        vmCollection.clear();
        vmCollection.setTotalObjectsFound( finalVMOs.length );
        vmCollection.setViewModelObjects( finalVMOs );
    }

    /**
     * @param {TreeLoadResult} treeLoadResult object containing result/status information.
     * @param {ViewModelObjectArray} vmCollection VMO array to set
     */
    function _updateViewModelCollectionInTreeHierarchyFormatForTopDown( treeLoadResult, vmCollection ) {
        let finalVMOs = [];

        if( treeLoadResult.mergeNewNodesInCurrentlyLoadedTree ) {
            finalVMOs = vmCollection.getLoadedViewModelObjects();
        }

        for( let index = 0; index < treeLoadResult.vmNodesInTreeHierarchyLevels.length; index++ ) {
            let currentNodes = treeLoadResult.vmNodesInTreeHierarchyLevels[ index ];

            for( let node = 0; node < currentNodes.length; node++ ) {
                let vmoIndex = -1;
                let levelIndex = 0;
                let currentNode = currentNodes[ node ];
                finalVMOs.forEach( ( vmo, index ) => {
                    if( currentNode ) {
                        if( vmo.id === currentNode.id ) {
                            vmoIndex = index;
                        }
                        if( vmo.id === currentNode.parentUid ) {
                            levelIndex = index;
                        }
                    }
                } );

                if( vmoIndex !== -1 ) {
                    _.assign( finalVMOs[ vmoIndex ], currentNode );
                } else {
                    arrayUtils.insert( finalVMOs, levelIndex + node, [ currentNode ] );
                }
                eventBus.publish( dpSelf.name + '.saveRowExpanded', currentNode );
            }
        }

        if( !treeLoadResult.mergeNewNodesInCurrentlyLoadedTree ) {
            vmCollection.clear();
            vmCollection.setTotalObjectsFound( finalVMOs.length );
            vmCollection.setViewModelObjects( finalVMOs );
        }
    }

    /**
     * @param {ViewModelTreeNode} parentNode - (Optional) The 'parent' to use when determining input.
     *
     * @param {String} cursorNodeId - (Optional) The ID of the node to insert above/below
     *
     * @param {Boolean} addAfter - (Optional) TRUE if any new children should be added AFTER the optional
     *            'cursorNodeId' (Default: TRUE)
     *
     * @return {Object} The resolved input object to pass to 'createTreeLoadInput'.
     */
    function _determineInput( parentNode, cursorNodeId, addAfter ) {
        /**
         * Determine 'child' index to use as basis for loading.
         *
         * <pre>
         * Handle various cases of 'parent' and/or 'cursorNodeId' validity:
         * 1) 'parent' and 'cursorNodeId' valid:             Locate the 'cursorNodeId' in the 'parent' and use its index.
         * 2) 'parent' valid and 'cursorNodeId' not valid:   Use either end of the 'parent' children as the index.
         * 3) 'parent' NOT valid and the 'cursor' is valid:  Locate the 'parent' of the 'cursor' and use the 'cursor' index.
         * 4) 'parent' NOT valid and the 'cursor' NOT valid: Fail assertion.
         * Note: Case 3) is used when dynamically loading the next page of 'children' directly after/before the
         * 'cursor' node.
         * </pre>
         */
        var startChildNdx = -1;

        if( parentNode ) {
            if( cursorNodeId ) {
                startChildNdx = _findChildNdx( parentNode, cursorNodeId );
                if( startChildNdx !== -1 ) {
                    startChildNdx++;
                }
            } else {
                if( addAfter ) {
                    var nChild = parentNode.children ? parentNode.children.length : 0;

                    startChildNdx = nChild;
                } else {
                    startChildNdx = 0;
                }
            }
        } else if( cursorNodeId ) {
            var vmCollection = dpSelf.viewModelCollection;

            var cursorNdx = vmCollection.findViewModelObjectById( cursorNodeId );

            if( cursorNdx !== -1 ) {
                var cursorNode = vmCollection.getViewModelObject( cursorNdx );

                var parentLevelNdx = cursorNode.levelNdx - 1;

                startChildNdx = 1;

                for( var ndx = cursorNdx - 1; ndx >= 0; ndx-- ) {
                    var currRow = vmCollection.getViewModelObject( ndx );

                    if( currRow.levelNdx === parentLevelNdx ) {
                        parentNode = currRow;
                        //Locate the 'parent' of the 'cursor' and use the Parent's 'cursor' index.
                        if( parentNode.cursorObject && parentNode.cursorObject.endIndex ) {
                            startChildNdx = parentNode.cursorObject.endIndex + 1;
                        }
                        break;
                    }

                    startChildNdx++;
                }
            }
        }

        assert( parentNode, 'Unable to determine \'parent\' node' );
        assert( startChildNdx !== -1, 'Unable to determine location in \'parent\' to insert loaded \'child\' nodes' );

        return {
            parentNode: parentNode,
            startChildNdx: startChildNdx
        };
    }

    /**
     * Using the given UID, determine which IModelObject should be set as the 'top' node (if any). That object
     * will be set as a new 'top' ViewModelTreeNode on the given dataProvider.
     * <P>
     * Note: The 'top' node is generally hidden from the user and is used only to access 'child' nodes and other
     * properties.
     *
     * @param {String} topNodeUid - (Optional) The ID of the 'top' (if known)
     *
     * @return {ViewModelTreeNode} The new 'top' node.
     */
    function _determineTopTreeNode( topNodeUid ) {
        /**
         * Create a 'straw' top node to use just in case.
         */
        var topTreeNode = {
            nodeId: 'top',
            nodeType: 'rootType',
            displayName: 'top',
            levelNdx: -1,
            childNdx: 0
        };

        if( !_.isEmpty( topNodeUid ) ) {
            topTreeNode.nodeId = topNodeUid;
            topTreeNode.nodeType = 'unknown';
        }

        return awTableSvc.createViewModelTreeNode( topTreeNode.nodeId, topTreeNode.nodeType,
            topTreeNode.displayName, topTreeNode.levelNdx, topTreeNode.childNdx, null );
    } // _determineTopTreeNode

    /**
     * Log a warning that there was an access to this UwDataProvider after it was destroyed.
     *
     * @param {String} functionName - Name of the function being accessed.
     */
    function _reportAccessToZombieDataProvider( functionName ) {
        logger.warn( 'Attempt to execute a function on a UwDataProvider after it was destroyed...' + '\n' + //
            'Function was therefore not executed...continuing.' + '\n' + //
            'UwDataProvider: ' + dpSelf.name + '\n' + //
            'Function: ' + functionName );
    }

    /**
     * Override the default implementation to return more helpful information.
     *
     * @return {String} Text used to identify the ID of the UsDataProvider (e.g. 'modelId' + an optional
     *         'name').
     */
    dpSelf.toString = function() {
        if( dpSelf ) {
            if( dpSelf.name ) {
                return dpSelf._modelId + '  name: ' + dpSelf.name;
            }

            return dpSelf._internal.modelId + '  name: ' + '???';
        }

        return 'UwDataProvider (destroyed)';
    };

    /**
     * Get all of the loaded objects that are currently selected.
     *
     * @return {IModelObjectArray} Array of selected {IModelObject}.
     */
    dpSelf.getSelectedObjects = function() {
        if( dpSelf.selectionModel ) {
            var loadedVMO = dpSelf.viewModelCollection.getLoadedViewModelObjects();
            return dpSelf.selectionModel.getSortedSelection( loadedVMO );
        }
        return [];
    };

    /**
     * Get the indices of the selected objects.
     *
     * @returns {NumberArray} Resolved with the indicies of the selected objects in the ViewModelCollection.
     */
    dpSelf.getSelectedIndices = function() {
        var loadedVMO = dpSelf.viewModelCollection.getLoadedViewModelObjects();

        return dpSelf.getSelectedObjects().map( function( vmo ) {
            return loadedVMO.indexOf( vmo );
        } );
    };

    // Define with this 'incorrect' spelling as well.
    dpSelf.getSelectedIndexes = dpSelf.getSelectedIndices;

    /**
     * Change the selection range
     *
     * @param {Number} start - String index in collection to add/remove/toggle.
     * @param {Number} end -  Ending index in collection to add/remove/toggle.
     * @param {Boolean} select - (Optional) TRUE, 'select'...FALSE, 'unselect'...UNDEFINED, 'toggle'.
     */
    dpSelf.changeObjectsSelection = function( start, end, select ) {
        var loadedVMO = dpSelf.viewModelCollection.getLoadedViewModelObjects();
        // Going down : Going up
        var e = start > end ? start : end;
        var s = start > end ? end : start;

        var objects = loadedVMO.slice( s, e + 1 );
        if( select === true ) {
            if( dpSelf.selectionModel.multiSelectEnabled || objects.length > 1 ) {
                dpSelf.selectionModel.addToSelection( objects );
            } else {
                dpSelf.selectionModel.setSelection( objects );
            }
        } else if( select === false ) {
            dpSelf.selectionModel.removeFromSelection( objects );
        } else {
            dpSelf.selectionModel.toggleSelection( objects );
        }
    };

    // activates multi Select mode on selection Model = multiple.
    dpSelf.multiSelectModeEvent = eventBus.subscribe( dpSelf.name + '.multiSelectModeAction', function(
        eventData ) {
        if( eventData && eventData.multiSelect ) {
            dpSelf.enableMultiSelect();
        } else {
            dpSelf.disableMultiSelect();
        }
    } );

    let _selectionModelDataCtxNode = null;

    // Event to expose various selection APIs on the selection model.
    dpSelf.selectActionEvent = eventBus.subscribe( dpSelf.name + '.selectAction', function(
        eventData ) {
        const oldSelection = dpSelf.selectionModel.getSelection();
        if( eventData ) {
            if( eventData.selectAll === true ) {
                dpSelf.selectAll();
            }

            if( eventData.selectAll === false ) {
                dpSelf.selectNone();
            }

            if( eventData.select ) {
                dpSelf.selectionModel.addToSelection( eventData.select );
            }

            if( eventData.deselect ) {
                dpSelf.selectionModel.removeFromSelection( eventData.deselect );
            }

            if( eventData.setSelection ) {
                dpSelf.selectionModel.setSelection( eventData.setSelection );
            }
        }

        const newSelection = dpSelf.selectionModel.getSelection();
        dpSelf.syncSelectionModel( _selectionModelDataCtxNode, newSelection, oldSelection );
    } );

    /**
     * Enable MultiSelect
     */
    dpSelf.enableMultiSelect = function() {
        if( dpSelf.selectionModel ) {
            dpSelf.selectionModel.setMultiSelectionEnabled( true );
        }
    };

    /**
     * disable MultiSelect
     */
    dpSelf.disableMultiSelect = function() {
        if( dpSelf.selectionModel ) {
            dpSelf.selectionModel.setMultiSelectionEnabled( false );
            dpSelf.selectNone();
        }
    };

    /**
     * Select all loaded objects
     */
    dpSelf.selectAll = function() {
        var loadedVMO = dpSelf.viewModelCollection.getLoadedViewModelObjects();
        dpSelf.selectionModel.addToSelection( loadedVMO );
        eventBus.publish( dpSelf.name + '.selectAll', {} );
    };

    /**
     * Clear selection
     */
    dpSelf.selectNone = function() {
        dpSelf.selectionModel.setSelection( [] );
        eventBus.publish( dpSelf.name + '.selectNone', {} );
    };

    dpSelf.setSelectionEnabled = function( isSelectionEnabled ) {
        dpSelf.selectionModel.setSelectionEnabled( isSelectionEnabled );

        eventBus.publish( dpSelf.name + '.isSelectionEnabledChanged', {
            isSelectionEnabled: isSelectionEnabled
        } );
    };

    /**
     * Sync the view with the updated selection model.
     *
     * @param {Object} dataCtxNode - The data context the access is occurring within.
     * @param {StringArray} newSelection -
     * @param {StringArray} oldSelection -
     */
    dpSelf.syncSelectionModel = function( dataCtxNode, newSelection, oldSelection ) {
        // Ensure the selection state is correct
        var loadedVMO = dpSelf.viewModelCollection.getLoadedViewModelObjects();

        loadedVMO.map( function( vmo ) {
            vmo.selected = dpSelf.selectionModel.isSelected( vmo );
        } );

        // Put the selected objects on the data provider
        // Makes binding in view models simpler
        var prevSelectedObjects = dpSelf.selectedObjects;

        dpSelf.selectedObjects = loadedVMO.filter( function( vmo ) {
            return vmo.selected;
        } );

        var emitEvents = function() {
            if( dataCtxNode.$emit ) {
                // Emit event is expected in all selection change cases (including initial selection)
                // Event bus is expected only when selection changes
                // Attempt to notify of selection change through angular
                dataCtxNode.$emit( 'dataProvider.selectionChangeEvent', {
                    selectionModel: dpSelf.selectionModel,
                    selected: dpSelf.getSelectedObjects(),
                    dataProviderName: dpSelf.name,
                    dataProvider: dpSelf
                } );
            }

            if( !_.isEqual( prevSelectedObjects, dpSelf.selectedObjects ) ) {
                // Always notify through event bus
                eventBus.publish( dpSelf.name + '.selectionChangeEvent', {
                    selectedObjects: dpSelf.getSelectedObjects(),
                    selectedUids: dpSelf.selectionModel.getSelection(),
                    scope: dataCtxNode
                } );
            }
        };

        // Handle case where something is selected that is not in data provider
        if( dpSelf.focusAction ) {
            var shouldEmitSelectionEvent = true;

            // Ignore the simple sync to mark objects as selected
            if( newSelection && oldSelection ) {
                var newlySelected = newSelection.filter( function( x ) {
                    return oldSelection.indexOf( x ) === -1;
                } );

                // If a single new object was selected attempt to focus
                if( newlySelected.length === 1 ) {
                    // Try to get object from current list
                    var newlySelectedObject = dpSelf.selectedObjects.filter( function( vmo ) {
                        return prevSelectedObjects.indexOf( vmo ) === -1;
                    } )[ 0 ];

                    // If not found clear current list and focus
                    if( !newlySelectedObject ) {
                        shouldEmitSelectionEvent = false;
                        var focusLoadAction = true;

                        // Reset cursor
                        if( dpSelf.cursorObject ) {
                            dpSelf.cursorObject = null;
                        }

                        if( dpSelf.accessMode === 'tree' ) {
                            dpSelf.topTreeNode = _determineTopTreeNode( dpSelf.topNodeUid );

                            dpSelf.getTreeNodePage( dataCtxNode, dpSelf.topTreeNode, null, true,
                                dpSelf.topTreeNode, focusLoadAction ).then( function() {
                                dpSelf.syncSelectionModel( dataCtxNode );
                            } );
                        } else {
                            dpSelf.startIndex = 0;

                            var listLoadInput = awTableSvc.createListLoadInput( null, dpSelf.startIndex, null,
                                true );

                            var actionRequestObj = {
                                listLoadInput: listLoadInput
                            };

                            dpSelf.someDataProviderSvc.executeLoadAction( dpSelf.focusAction, dpSelf.json,
                                dataCtxNode, actionRequestObj ).then(
                                function( response ) {
                                    var vmCollection = dpSelf.viewModelCollection;

                                    vmCollection.clear();
                                    vmCollection.setTotalObjectsFound( response.totalFound );

                                    if( response.totalFound > 0 && response.results ) {
                                        dpSelf.noResults = false;

                                        vmCollection.updateModelObjects( response.results,
                                            dpSelf.uidInResponse, dpSelf.preSelection );
                                    } else {
                                        dpSelf.noResults = true;
                                    }

                                    _notifyModelObjectsUpdate( dataCtxNode, {
                                        firstPage: true
                                    } );

                                    eventBus.publish( dpSelf.name + '.focusSelection' );
                                    return response;
                                } );
                        }
                    } else {
                        eventBus.publish( dpSelf.name + '.focusSelection' );
                    }
                }
            }

            if( shouldEmitSelectionEvent ) {
                emitEvents();
            }
        } else {
            var uidSet = new Set();
            _.forEach( dpSelf.selectedObjects, function( obj ) {
                var uid;
                if( typeof obj === 'object' ) {
                    uid = obj.uid;
                } else {
                    uid = obj;
                }
                uidSet.add( uid );
            } );

            if( uidSet.size !== dpSelf.selectionModel.getCurrentSelectedCount() ) {
                // Default behavior is to remove any object not found from the selection model
                dpSelf.selectionModel.setSelection( dpSelf.selectedObjects );
            } else {
                // If selection is out of sync it is going to be changing
                // So only fire the event when it will not change again
                emitEvents();
            }
        }

        // Check selection state
        dpSelf.selectionModel.evaluateSelectionStatusSummary( dpSelf );

        // Try to ensure an angular digest cycle is active when changing selected properties
        if( dataCtxNode.$evalAsync ) {
            dataCtxNode.$evalAsync();
        }
    };

    /**
     * Detach the selection model from the data provider. Should only be done when re-initializing.
     */
    dpSelf.detachSelectionModel = function() {
        if( dpSelf.syncSelectionEvent ) {
            dpSelf.syncSelectionEvent();
            dpSelf.syncSelectionEvent = null;
        }
    };

    /**
     * Attach the data provider to its current selection model. Ensures re-initialization of the data provider
     * will not result in duplicate event listeners / watches.
     *
     * @param {Object} dataCtxNode - The data context the access is occurring within.
     */
    dpSelf.attachSelectionModel = function( dataCtxNode ) {
        _selectionModelDataCtxNode = dataCtxNode;
        // Remove previous watch if it is still setup
        dpSelf.detachSelectionModel();

        // Keep selection model and view model collection in sync - only objects in selection model display as selected
        // Waits until after first page is loaded to prevent select / deselect command from briefly flickering
        if( dataCtxNode.$watchCollection ) {
            dpSelf.syncSelectionEvent = dataCtxNode.$watchCollection( function whenSelectionModelChanges1() {
                return dpSelf.selectionModel.getSelection();
            }, function( newVal, oldVal ) {
                dpSelf.syncSelectionModel( dataCtxNode, newVal, oldVal );
            } );
        } else {
            // Data context is not a real scope so it doesn't have watch
            // Have to borrow root scope
            dpSelf.syncSelectionEvent = AwRootScopeService.instance.$watchCollection( function whenSelectionModelChanges2() {
                return dpSelf.selectionModel.getSelection();
            }, function( newVal, oldVal ) {
                dpSelf.syncSelectionModel( dataCtxNode, newVal, oldVal );
            } );
        }
    };

    /**
     * Attach the selection model immediately. Will be detached / reattached if data provider is initialized.
     * However cannot assume data provider is ever initialized.
     */
    dpSelf.attachSelectionModel( {} );

    /**
     * Swap selection model with the new selection model provided as input. Detach current selection model and
     * attach the new one
     *
     * @param {Object} newSelectionModel - new selection model which is required to swap
     * @param {Object} dataCtxNode - The data context the access is occurring within.
     */
    dpSelf.swapSelectionModel = function( newSelectionModel, dataCtxNode ) {
        // Detach the selection model while initializing
        dpSelf.detachSelectionModel();

        dpSelf.selectionModel = newSelectionModel;

        dpSelf.attachSelectionModel( dataCtxNode );
    };
    // ======================== Edit Handler Interface ===================================================//
    /**
     *
     * @param {*} stateName current state of edit
     * @param {*} dpSelf data provider instance
     */
    var _notifyEditStateChange = function( stateName, dpSelf ) {
        dpSelf._editingState = stateName;
        dpSelf._editing = stateName === 'starting';

        // Add to the appCtx about the editing state
        appCtxService.updateCtx( dpSelf._appCtxEditInProgress, dpSelf._editing );
        eventBus.publish( dpSelf._eventTopicEditInProgress, dpSelf._editing );
    };

    if( !dpSelf._appCtxEditInProgress ) {
        dpSelf._appCtxEditInProgress = dpSelf.name + '_editInProgress';
        dpSelf._eventTopicEditInProgress = dpSelf.name + '.editInProgress';
    }

    appCtxService.unRegisterCtx( dpSelf._appCtxEditInProgress );

    /**
     * isDirty implementation of edit-handler interface.
     * It check if any of the view model property inside view model object is modified.
     * @returns {*} AwPromiseService.instance with promise true/false        *
     */
    dpSelf.isDirty = function() {
        var viewModelCollection = dpSelf.viewModelCollection.getLoadedViewModelObjects();
        return editUtilsService._isDirty( viewModelCollection );
    };

    /**
     * Determines if prop edit is enabled for this dataprovider
     * @param {Object} declViewModel the declarative view model
     * @returns {*} true if individual prop editing is enabled
     */
    dpSelf.isPropEditEnabled = function( declViewModel ) {
        if( dpSelf.json && dpSelf.json.enablePropEdit ) {
            // If boolean is used return it directly otherwise evaluate the value as a condition
            if( typeof dpSelf.json.enablePropEdit === 'boolean' ) {
                return dpSelf.json.enablePropEdit;
            }

            const evaluationEnv = {
                data: declViewModel,
                ctx: appCtxService.ctx,
                conditions: declViewModel._internal.conditionStates
            };
            return declUtils.evaluateCondition( declViewModel, dpSelf.json.enablePropEdit, evaluationEnv );
        } else if( dpSelf.json && dpSelf.json.enablePropEdit === false ) {
            return false;
        }
        // Default is true if enablePropEdit is not defined
        return true;
    };

    /**
     * This function implements the start edit function edit handler interface
     * @param {*} dataCtxNode data ctx Node.
     * @param {*} declViewModel declarative ViewModel.
     * @param {Object} editOptions - additional options object to specify specfic prop to edit and autosave mode { vmo, propertyNames, autoSave } (Optional)
     * @return {*} AwPromiseService.instance with promise.
     */
    dpSelf.startEdit = function( dataCtxNode, declViewModel, editOptions ) {
        var viewModelCollection = dpSelf.viewModelCollection.getLoadedViewModelObjects();
        var editConfig = dpSelf.json.editConfig;
        editConfig.sourceModel = dpSelf.name;
        const saveEditStateChangeCallback = function() {
            _notifyEditStateChange( 'saved', dpSelf );
        };
        return editUtilsService._startEdit( dataCtxNode, declViewModel, viewModelCollection, editConfig, saveEditStateChangeCallback, editOptions ).then( function() {
            if( !editOptions ) {
                _notifyEditStateChange( 'starting', dpSelf );
            }
        } );
    };

    /**
     * This is the cancel edits implementation of edit-handler interface.
     * @param  {*} dataCtxNode data ctx Node.
     * @param  {*} declViewModel declarative ViewModel.
     * @return {*} AwPromiseService.instance with promise
     */
    dpSelf.cancelEdits = function( dataCtxNode, declViewModel ) {
        var viewModelCollection = dpSelf.viewModelCollection.getLoadedViewModelObjects();
        var editConfig = dpSelf.json.editConfig;
        return editUtilsService._cancelEdits( dataCtxNode, declViewModel, viewModelCollection, editConfig ).then( function() {
            _notifyEditStateChange( 'canceling', dpSelf );
        } );
    };

    /**
     * This function implements the save edits function edit handler interface
     * @param {*} dataCtxNode data ctx Node.
     * @param {*} declViewModel declarative ViewModel.
     * @return {*} AwPromiseService.instance with promise.
     */
    dpSelf.saveEdits = function( dataCtxNode, declViewModel ) {
        var viewModelCollection = dpSelf.viewModelCollection.getLoadedViewModelObjects();
        var editConfig = dpSelf.json.editConfig;
        return editUtilsService._saveEdits( dataCtxNode, declViewModel, viewModelCollection, editConfig ).then( function() {
            _notifyEditStateChange( 'saved', dpSelf );
        } );
    };

    /**
     * @returns {*} boolean true/false
     */
    dpSelf.editInProgress = function() {
        return dpSelf._editing;
    };

    // ======================== End of Edit Handler Interface ===================================================//

    /**
     * Initialize and trigger first page of results.
     *
     * @param {Object} dataCtxNode - The data context the access is occurring within.
     *
     * @return {Promise} A promise object resolved with the ViewModelCollection returned by the current
     *         DataProviderService.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.initialize = function( dataCtxNode ) {
        var promise;

        if( dpSelf.cursorObject ) {
            dpSelf.cursorObject = null;
        }

        /**
         * If the constructor was told there would be some additional input data passed in from the data ctx
         * node attempt to get it at this point.
         * <P>
         * Note: The input data from the scope can only override specific properties.
         */
        if( !_.isEmpty( _ctorInputData ) ) {
            var declViewModel = declUtils.findViewModel( dataCtxNode );

            dataCtxService.applyScope( declViewModel, _ctorInputData, null, dataCtxNode );

            _.forEach( _ctorInputData, function( value, name ) {
                if( _modifiablePropertiesViaInputData.indexOf( name ) !== -1 ) {
                    dpSelf[ name ] = value;
                }
            } );

            _ctorInputData = null;
        }

        /** editHanlder */
        if( dpSelf.json.editContext ) {
            editHandlerSvc.setEditHandler( editHandlerFactory.createEditHandler( dataSourceService
                .createNewDataSource( {
                    dataProvider: dpSelf
                } ), dpSelf.editSupportParamKeys ), dpSelf.json.editContext );
            // set this handler active
            editHandlerSvc.setActiveEditHandlerContext( dpSelf.json.editContext );

            _editHandlerRegistered = true;
        }

        // Detach the selection model while initializing
        dpSelf.detachSelectionModel();

        if( dpSelf.accessMode === 'tree' ) {
            dpSelf.topTreeNode = _determineTopTreeNode( dpSelf.topNodeUid );

            promise = dpSelf.getTreeNodeInitial( dataCtxNode, dpSelf.topTreeNode, null, true,
                dpSelf.topTreeNode ).then( function( response ) {
                dpSelf.attachSelectionModel( dataCtxNode );

                return response;
            } );
        } else {
            dpSelf.startIndex = 0;

            var listLoadInput = awTableSvc.createListLoadInput( null, dpSelf.startIndex, null, true, false, dataCtxNode.filterStr );

            var actionRequestObj = {
                listLoadInput: listLoadInput
            };

            var action = dpSelf.initializeAction ? dpSelf.initializeAction : dpSelf.action;

            if( logger.isDeclarativeLogEnabled() ) {
                debugService.debugDataProviderInitialize( dpSelf, action, dpSelf.json, dataCtxNode, actionRequestObj, _ctorInputData );
            }

            promise = dpSelf.someDataProviderSvc.getFirstPage( action, dpSelf.json, dataCtxNode,
                actionRequestObj ).then(
                function( response ) {
                    eventBus.publish( dpSelf.name + '.resetScroll', {} );
                    var vmCollection = dpSelf.viewModelCollection;

                    vmCollection.clear();
                    vmCollection.setTotalObjectsFound( response.totalFound );

                    if( response.totalFound > 0 && response.results ) {
                        dpSelf.noResults = false;

                        vmCollection.updateModelObjects( response.results, dpSelf.uidInResponse,
                            dpSelf.preSelection );

                        /**
                         * Determine if the last node in the collection is an 'incompleteTail' because we know
                         * there are more found than currently loaded.
                         */
                        if( !_.isEmpty( vmCollection.loadedVMObjects ) &&
                            vmCollection.totalFound > dpSelf.viewModelCollection.getTotalUniqueObjectsLoaded() ) {
                            _.last( vmCollection.loadedVMObjects ).incompleteTail = true;
                        }
                    } else {
                        dpSelf.noResults = true;
                        // assigning no result found string if there is no data from rest service
                        if( dpSelf.json.noResultsFound ) {
                            var i18nkey = dpSelf.json.noResultsFound;
                            i18nkey = parsingUtils.geti18nKey( i18nkey );
                            dpSelf.noResultsFound = dataCtxNode.data.i18n[ i18nkey ];
                        }
                    }

                    dpSelf.attachSelectionModel( dataCtxNode );

                    _notifyModelObjectsUpdate( null, {
                        firstPage: true
                    } );

                    return response;
                },
                function( err ) {
                    logger.warn( err );
                } );
        }

        // Attach selection model once first page is loaded
        promise.then( function( response ) {
            if( dpSelf.selectionModel && dpSelf.selectionModel.getSelection().length > 0 ) {
                /**
                 * Fire modelObjects updated event using data provider name space
                 */
                eventBus.publish( dpSelf.name + '.focusSelection' );
            }

            /**
             * Note: Not all dataCtxNodes are actually AngularJS $scopes. So we have to check if the $scope API
             * exists before we try to use it.
             */
            if( dataCtxNode.$on ) {
                dataCtxNode.$on( 'dataProvider.selectAction', function( event, data ) {
                    if( data && data.selectAll ) {
                        dpSelf.selectAll();
                    } else {
                        dpSelf.selectNone();
                    }
                } );

                dataCtxNode.$on( 'dataProvider.multiSelectAction', function( event, data ) {
                    if( data && data.multiSelect ) {
                        dpSelf.enableMultiSelect();
                    } else {
                        dpSelf.disableMultiSelect();
                    }
                } );
            }

            return response;
        } );

        return promise;
    }; // initialize

    /**
     * validate the lovValueSections if it needs to call the "validateLOVValueSelections" soa
     *
     * @param {array} lovEntry - the lovEntry which is gotten from "getinitialValues" SOA and it's the selected
     *            item
     * @param {Object} dataCtxNode - The angular scope of this data provider
     * @return {Promise} A promise object.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.validateLOV = function( lovEntry, dataCtxNode ) {
        return dpSelf.someDataProviderSvc.validateLOVSection( lovEntry, dpSelf.json, dataCtxNode );
    };

    /**
     * Set the currently loaded view model objects based on the model object (or uid data) in the given array of
     * 'result' objects.
     *
     * @param {ViewModelObjectArray} newVMOs - Array of ViewModelObjects to set.
     * @param {Number} totalFound - total found
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.update = function( newVMOs, totalFound ) {
        if( newVMOs ) {
            var totalFoundIn = totalFound;

            if( _.isUndefined( totalFoundIn ) ) {
                totalFoundIn = newVMOs.length;
            }

            dpSelf.noResults = totalFoundIn === 0;

            var vmCollection = dpSelf.viewModelCollection;

            vmCollection.clear();
            vmCollection.setTotalObjectsFound( totalFoundIn );
            vmCollection.updateModelObjects( newVMOs, dpSelf.uidInResponse, dpSelf.preSelection );

            /**
             * Determine if the last node in the collection is an 'incompleteTail' because we know there are
             * more found than currently loaded.
             */
            if( !_.isEmpty( vmCollection.loadedVMObjects ) &&
                vmCollection.totalFound > dpSelf.viewModelCollection.getTotalUniqueObjectsLoaded() ) {
                _.last( vmCollection.loadedVMObjects ).incompleteTail = true;
            }

            /**
             * Maintain selections based on the new VMOs.
             */
            var selectedObjects = dpSelf.getSelectedObjects();

            dpSelf.selectionModel.setSelection( selectedObjects );

            _notifyModelObjectsUpdate();
        }
    };

    /**
     * Required. Get item at specified index
     *
     * @param {Number} index - index of the list
     * @param {Object} dataCtxNode - The angular scope of this data provider
     * @return {Object} object specified at the given index
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.getItemAtIndex = function( index, dataCtxNode ) {
        if( index > dpSelf.viewModelCollection.getTotalObjectsLoaded() ) {
            dpSelf.getNextPage( dataCtxNode );
            return null;
        }

        return dpSelf.viewModelCollection.getViewModelObject( index );
    };

    /**
     * Get ViewModelCollection being managed by this UwDataProvider.
     *
     * @return {ViewModelCollection} Reference to the ViewModelCollection being managed by this UwDataProvider.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.getViewModelCollection = function() {
        return dpSelf.viewModelCollection;
    };

    /**
     * return the same data structure of the list items in the link-with-popup window
     * <P>
     * Note: Used for aw-link-with-popup.directive<BR>
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     *
     * @param {Number} index - index of the list
     * @param {Object} dataCtxNode - The data context the queryy is occurring within.
     * @param {String} dataProviderType - The types of dataProvider: "static" "TcLOV" "Action"
     *
     * @return {Object} The same data structure of the list items in the link-with-popup window.
     */
    dpSelf.createPopupObject = function( index, dataCtxNode, dataProviderType ) {
        if( index > dpSelf.viewModelCollection.getTotalObjectsLoaded() ) {
            dpSelf.getNextPage( dataCtxNode );
            return null;
        }

        var listElement = {
            listElementDisplayValue: '',
            listElementObject: ''
        };

        var displayValue;
        var viewModelObject = dpSelf.getItemAtIndex( index, dataCtxNode );

        if( dataProviderType ) {
            if( dataProviderType === 'TcLOV' ) {
                displayValue = viewModelObject.propDisplayValue;
            } else if( dataProviderType === 'Action' ) {
                var displayStr;
                if( dataCtxNode.displayProperty ) {
                    displayStr = _.get( viewModelObject, dataCtxNode.displayProperty );
                } else {
                    displayStr = _.get( viewModelObject.props, 'object_string' );
                }
                displayValue = displayStr.uiValue;
            } else if( dataProviderType === 'Static' ) {
                if( viewModelObject.staticDisplayValue && viewModelObject.staticElementObject ) {
                    displayValue = viewModelObject.staticDisplayValue;
                    viewModelObject = viewModelObject.staticElementObject;
                } else {
                    displayValue = viewModelObject;
                }
            } else {
                displayValue = viewModelObject;
            }
        } else {
            displayValue = viewModelObject;
        }

        listElement.listElementDisplayValue = displayValue;
        listElement.listElementObject = viewModelObject;

        if( dpSelf.viewModelCollection.getTotalObjectsFound() ) {
            var totalFound = 0;
        }

        if( !viewModelObject && !totalFound ) {
            // no result found
            listElement.listElementDisplayValue = dataCtxNode.prop.uiValue;
            listElement.listElementObject = dataCtxNode.prop.dbValue;
        }

        if( dataCtxNode.isLoading ) {
            // no result found
            listElement.listElementDisplayValue = dpSelf.isLoading;
            listElement.listElementObject = dpSelf.isLoading;
        }

        return listElement;
    }; // createPopupObject

    /**
     * Required. For infinite scroll behavior, we always return a slightly higher number than the previously
     * loaded items.
     *
     * @return {Number} number of objects loaded.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.getLength = function() {
        return dpSelf.viewModelCollection.getVirtualLength();
    };

    /**
     * Check if there is more data to load
     *
     * @return {Boolean} True if there are more objects to load
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.hasMorePages = function() {
        if( dpSelf._isDestroyed ) {
            _reportAccessToZombieDataProvider( 'hasMorePages' );
            return false;
        }

        /**
         * Check if acting as a 'tree'<BR>
         * If so: We can only used the 'top' node cursor.
         */
        if( dpSelf.accessMode === 'tree' ) {
            if( dpSelf.topTreeNode && dpSelf.topTreeNode.cursorObject ) {
                return !dpSelf.topTreeNode.cursorObject.endReached;
            }

            return false;
        }

        /**
         * Check if we have a 'cursor' object.<BR>
         * If so: Use its state for whether there is more data.
         */
        if( dpSelf.cursorObject ) {
            return !dpSelf.cursorObject.endReached;
        }

        return dpSelf.viewModelCollection.getTotalObjectsFound() > dpSelf.viewModelCollection
            .getTotalUniqueObjectsLoaded();
    };

    /**
     * Check if there is more data to load before current position.
     *
     * @return {Boolean} True if there are more objects to load
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.hasMorePagesUp = function() {
        if( dpSelf._isDestroyed ) {
            _reportAccessToZombieDataProvider( 'hasMorePagesUp' );
            return false;
        }

        /**
         * Check if acting as a 'tree'<BR>
         * If so: We can only used the 'top' node cursor.
         */
        if( dpSelf.accessMode === 'tree' ) {
            if( dpSelf.topTreeNode && dpSelf.topTreeNode.cursorObject ) {
                return !dpSelf.topTreeNode.cursorObject.startReached;
            }

            return false;
        }

        /**
         * Check if we have a 'cursor' object.<BR>
         * If so: Use its state for whether there is more data.
         */
        if( dpSelf.cursorObject ) {
            return !dpSelf.cursorObject.startReached;
        }

        return false;
    };

    /**
     * Finds and returns a vmo with an incomplete head/tail in the given range.
     * @param { Number } startIdx - index of the first node in the range
     * @param { Number } endIdx - index of the last node in the range
     *
     * @return {Object} The node with an incomplete head/tail
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.findIncompleteNodeInRange = function( startIdx, endIdx ) {
        for( var i = startIdx; i <= endIdx; i++ ) {
            var vmNode = dpSelf.viewModelCollection.loadedVMObjects[ i ];
            if( vmNode && ( vmNode.incompleteHead === true || vmNode.incompleteTail ) ) {
                return vmNode;
            }
        }
        return null;
    };

    /**
     * Get previous page of results
     *
     * @param {Object} dataCtxNode - The data context the query is occurring within.
     *
     * @return {Promise} A promise resolved when the previous page is loaded and the viewModelCollection is
     *         updated. Resolved object is a reference to the 'viewModelColection' object associated with this
     *         dataProvider.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.getPreviousPage = function( dataCtxNode ) {
        if( dpSelf._isDestroyed ) {
            _reportAccessToZombieDataProvider( 'getPreviousPage' );
            return $q.reject( 'Access to destroyed UwDataProvider.' );
        }

        assert( dpSelf.previousAction, 'Invalid action specified' );

        if( dpSelf.accessMode === 'tree' ) {
            var cursorNode = _.first( dpSelf.topTreeNode.children );

            if( cursorNode ) {
                return dpSelf.getTreeNodePage( dataCtxNode, dpSelf.topTreeNode, cursorNode.id, false,
                    dpSelf.topTreeNode );
            }

            return $q.resolve( dpSelf.viewModelCollection );
        }

        var listLoadInput = awTableSvc.createListLoadInput( null, 0, null, false, true );

        var actionRequestObj = {
            listLoadInput: listLoadInput
        };

        return dpSelf.someDataProviderSvc.executeLoadAction( dpSelf.previousAction, dpSelf.json, dataCtxNode,
            actionRequestObj ).then(
            function( response ) {
                dpSelf.viewModelCollection.setTotalObjectsFound( response.totalFound );

                if( response.totalFound > 0 ) {
                    dpSelf.viewModelCollection.updateModelObjects( response.results, dpSelf.uidInResponse,
                        dpSelf.preSelection, true );
                }

                _notifyModelObjectsUpdate( dataCtxNode, {
                    prevPage: true
                } );

                return $q.resolve( dpSelf.viewModelCollection );
            } );
    };

    /**
     * Get next page of results
     *
     * @param {Object} dataCtxNode - The data context the query is occurring within.
     *
     * @return {Promise} A promise resolved when the next page is loaded and the viewModelCollection is updated.
     *         Resolved object is a reference to the 'viewModelColection' object associated with this
     *         dataProvider.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.getNextPage = function( dataCtxNode ) {
        if( dpSelf._isDestroyed ) {
            _reportAccessToZombieDataProvider( 'getNextPage' );
            return $q.reject( 'Access to destroyed UwDataProvider.' );
        }

        if( dpSelf.accessMode === 'tree' ) {
            var cursorNode = _.last( dpSelf.topTreeNode.children );

            if( cursorNode ) {
                return dpSelf.getTreeNodePage( dataCtxNode, dpSelf.topTreeNode, cursorNode.id, true,
                    dpSelf.topTreeNode );
            }

            return $q.resolve( dpSelf.viewModelCollection );
        }

        var totalFound = dpSelf.viewModelCollection.getTotalObjectsFound();
        var totalUniqueLoaded = dpSelf.viewModelCollection.getTotalUniqueObjectsLoaded();

        if( totalFound > totalUniqueLoaded || dpSelf.cursorObject && !dpSelf.cursorObject.endReached ) {
            dpSelf.startIndex = totalUniqueLoaded;

            var listLoadInput = awTableSvc.createListLoadInput( null, dpSelf.startIndex, null, true, true, dataCtxNode.filterStr );

            var actionRequestObj = {
                listLoadInput: listLoadInput
            };

            var action = dpSelf.nextAction ? dpSelf.nextAction : dpSelf.action;

            if( logger.isDeclarativeLogEnabled() ) {
                debugService.debugDataProviderNextPage( dpSelf, action, dpSelf.json, dataCtxNode, actionRequestObj );
            }

            return dpSelf.someDataProviderSvc.getNextPage( action, dpSelf.json, dataCtxNode, actionRequestObj )
                .then(
                    function( response ) {
                        var vmCollection = dpSelf.viewModelCollection;

                        vmCollection.setTotalObjectsFound( response.totalFound );

                        if( response.totalFound > 0 ) {
                            vmCollection.updateModelObjects( response.results, dpSelf.uidInResponse,
                                dpSelf.preSelection );
                        }

                        _notifyModelObjectsUpdate( dataCtxNode, {
                            nextPage: true
                        } );

                        if( !_.isEmpty( vmCollection.loadedVMObjects ) &&
                            vmCollection.totalFound > dpSelf.viewModelCollection.getTotalUniqueObjectsLoaded() ) {
                            _.last( vmCollection.loadedVMObjects ).incompleteTail = true;
                        }

                        if( dpSelf.accessMode === 'lov' ) {
                            // lov api expects incremental response, not the entire collection
                            return response;
                        }

                        return vmCollection;
                    } );
        }

        return $q.resolve( dpSelf.viewModelCollection );
    };

    /**
     * Validate selection
     *
     * @param {Object} lovScope - lov context
     * @param {Array} selected - selected object/s to validate
     * @param {Boolean} suggestion - does selected contain a suggested value?
     *
     * @return {Promise} Promise that is resolved upon completion of validateion.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.validateSelections = function( lovScope, selected, suggestion ) {
        var action = dpSelf.validateAction;

        if( action ) {
            var actionRequestObj = { selected: selected, suggestion: suggestion };
            return dpSelf.someDataProviderSvc.validateSelections( action, dpSelf.json, lovScope, actionRequestObj ).then( function( resp ) {
                if( !resp.valid ) {
                    resp.cause = { partialErrors: true };
                    throw resp;
                }
                eventBus.publish( dpSelf.name + '.validSelectionEvent', {
                    selectedObjects: selected
                } );
                return resp;
            } );
        }

        // if validate action is not defined, assume all valid
        eventBus.publish( dpSelf.name + '.validSelectionEvent', {
            selectedObjects: selected
        } );
        return AwPromiseService.instance.resolve( { valid: true } );
    };

    /**
     * Note: A "(dp_name).modelObjectsUpdated" event will be published on the 'eventBus'.
     *
     * @param {Object} dataCtxNode - The data context the expansion is occurring within.
     * @param {ViewModelTreeNode} parentNode - Node to use as the origin for any new nodes.
     *
     * @return {Promise} A promise resolved when the expansion is complete and the ViewModelCollection is
     *         updated. Resolved object is a reference to the 'ViewModelColection' object managed by this
     *         dataProvider.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.expandObject = function( dataCtxNode, parentNode ) {
        var begNdx = -1;

        if( dpSelf.cacheCollapse ) {
            var vmNodes = dpSelf.viewModelCollection.loadedVMObjects;
            // BMW: can use _, I am lazy now for prototype
            for( var ndx = 0; ndx < vmNodes.length; ndx++ ) {
                if( vmNodes[ ndx ].id === parentNode.id ) {
                    begNdx = ndx + 1;
                    break;
                }
            }
        }

        // BMW: Load __expendState if dpSelf.cacheCollapse == true
        if( begNdx >= 0 && parentNode.__expandState && dpSelf.cacheCollapse ) {
            // Apply __expandState.expandedNodes to vmoCollection
            var vmos = dpSelf.viewModelCollection.loadedVMObjects;
            vmos.splice.apply( vmos, [ begNdx, 0 ].concat( parentNode.__expandState.expandedNodes ) );
            dpSelf.viewModelCollection.setTotalObjectsFound( vmos.length );

            // Load parentNode context back
            parentNode.children = parentNode.__expandState.children;
            parentNode.startChildNdx = parentNode.__expandState.startChildNdx;
            parentNode.totalChildCount = parentNode.__expandState.totalChildCount;
            parentNode.cursorObject = parentNode.__expandState.cursorObject;

            // Clean up and return
            delete parentNode.__expandState;
            return $q.resolve( dpSelf.viewModelCollection );
        }

        // BMW: Clean up __expendState if dpSelf.cacheCollapse == false
        if( !dpSelf.cacheCollapse && parentNode.__expandState ) {
            delete parentNode.__expandState;
        }

        return dpSelf.getTreeNodePage( dataCtxNode, parentNode, null, true, dpSelf.topTreeNode );
    };

    /**
     *
     * Function to reset collapse cache when needed
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.resetCollapseCache = function() {
        if( !dpSelf.viewModelCollection || !dpSelf.viewModelCollection.loadedVMObjects ) {
            return;
        }
        _.forEach( dpSelf.viewModelCollection.loadedVMObjects, function( vmo ) {
            if( vmo.__expandState ) {
                delete vmo.__expandState;
            }
        } );
    };

    let _initialCacheCollapseState = false;

    /**
     *
     * Function to restore collapse cache to the initial value
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.restoreInitialCacheCollapseState = function() {
        if( !_initialCacheCollapseState ) {
            dpSelf.cacheCollapse = false;
            dpSelf.resetCollapseCache();
        } else {
            dpSelf.cacheCollapse = true;
        }
    };

    /**
     * Set valid source types for data provider, this is used for drag and drop usage
     *
     * @param {Object} validSourceTypes - valid source types for dataprovider which are set from xrt objectset
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.setValidSourceTypes = function( validSourceTypes ) {
        dpSelf.validSourceTypes = validSourceTypes;
    };

    /**
     * Note: A "(dp_name).modelObjectsUpdated" event will be published on the 'eventBus'.
     *
     * @param {Object} dataCtxNode - The data context the expansion is occurring within.
     * @param {ViewModelTreeNode} parentNode - Node to use as the origin for any 'child' nodes being removed as
     *            part of the collapse.
     * @return {Promise} A promise resolved when the collapse is complete and the ViewModelCollection is
     *         updated. Resolved object is a reference to the 'ViewModelColection' object managed by this
     *         dataProvider.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.collapseObject = function( dataCtxNode, parentNode ) {
        /**
         * Remove all 'child' nodes of this 'parent' from the 'loadedVMObjects' of the ViewModelCollection and
         * reset it's internal 'children' array.
         */
        var vmNodes = dpSelf.viewModelCollection.loadedVMObjects;

        var begNdx = -1;
        var nDelete = 0;

        // BMW Issue #5: add document to this algorithm.
        // - Loop through the whole vmoCollection
        // - When find the parent node, set state to start ( begNdx )
        // - Keep going, when hits node which node.level <= parent.level, stop ( next sibling )
        // - record all as nDelete.
        //
        // So we don't have to clen parentNode.children here...anyway it will be done later
        for( var ndx = 0; ndx < vmNodes.length; ndx++ ) {
            if( uwUtilSvc.getEvaluatedId( vmNodes[ ndx ] ) === uwUtilSvc.getEvaluatedId( parentNode ) ) {
                begNdx = ndx + 1;
                nDelete = 0;
            } else if( begNdx >= 0 ) {
                if( vmNodes[ ndx ].levelNdx > parentNode.levelNdx ) {
                    nDelete++;
                } else {
                    // BMW Issue #5:
                    // parentNode.children = null;
                    break;
                }
            }
        }

        if( nDelete > 0 ) {
            var collapsedNodes = vmNodes.splice( begNdx, nDelete );

            // BMW Issue #7: When any of the node is in loading status, don't cache
            var collapesdNodesIsLoading = _.reduce( collapsedNodes, function( sum, node ) {
                return sum ? sum : node.loadingStatus;
            }, false );

            // BMW: Cache collapse object here
            if( dpSelf.cacheCollapse && !collapesdNodesIsLoading ) {
                parentNode.__expandState = {
                    children: parentNode.children,
                    startChildNdx: parentNode.startChildNdx,
                    totalChildCount: parentNode.totalChildCount,
                    // BMW #5: actually cursorObject cache here is not needed since
                    // it is anyway leaking in current system when collapse. But for
                    // safe we can cache and load it too.
                    cursorObject: parentNode.cursorObject,
                    expandedNodes: collapsedNodes
                };
            }

            parentNode.children = null;
            parentNode.startChildNdx = 0;
            parentNode.totalChildCount = null;
        }

        // Re-evaluate selection state, since we have removed children selection state have changed.
        dpSelf.selectionModel.evaluateSelectionStatusSummary( dpSelf );

        return $q.resolve( dpSelf.viewModelCollection );
    }; // collapseObject

    /**
     * Access a page of 'child' nodes of the given 'parent' node and place the results into the
     * ViewModelColection of this UwDataProvider.
     * <P>
     * Note: Paging information stored in the 'parent' node is used to determine which 'child' nodes to get.
     * This paging information is then updated to be ready for any subsequent call to this API.
     *
     * @param {Object} dataCtxNode - The data context the access is occurring within.
     *
     * @param {ViewModelTreeNode} parentNode - (Optional) Node to use as the 'parent' for any new nodes.
     *
     * @param {String} cursorNodeId - ID of an existing node in the 'parent' (and, presumably a
     *            ViewModelCollection) to insert any new nodes after.
     *
     * @param {Boolean} addAfter - (Optional) TRUE if any new children should be added AFTER the optional
     *            'cursorNodeId' (Default: TRUE)
     *
     * @param {ViewModelTreeNode} rootNode - Root Node opened
     *
     * @param {Boolean} focusLoadAction - (Optional) TRUE if action is triggered to load selected object in tree
     *
     * @return {Promise} A promise resolved with a reference to the updated ViewModelCollection object.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.getTreeNodePage = function( dataCtxNode, parentNode, cursorNodeId, addAfter, rootNode,
        focusLoadAction ) {
        var action = addAfter ? dpSelf.nextAction || dpSelf.action : dpSelf.previousAction;

        assert( action, 'Invalid action specified' );

        /**
         * Set the dynamic properties of a 'TreeLoadInput' and start loading the next page of 'child' nodes for
         * the given 'parent'.
         */
        var inputData = _determineInput( parentNode, cursorNodeId, addAfter );

        var treeLoadInput = awTableSvc.createTreeLoadInput( inputData.parentNode, inputData.startChildNdx,
            null, cursorNodeId, dpSelf.treePageSize, addAfter, rootNode );

        var actionRequestObj = {
            treeLoadInput: treeLoadInput,
            loadIDs: {
                t_uid: dpSelf.topTreeNode.uid,
                o_uid: treeLoadInput.parentNode.uid
            }
        };

        // focusLoadAction will be true when object present in selection model needs to be loaded in tree.
        // (cross select between PWA and other sources e.g. Search Panel)
        if( focusLoadAction ) {
            treeLoadInput.focusLoadAction = focusLoadAction;
        }

        dataCtxNode.data.treeLoadInput = treeLoadInput;

        var origCursorObj = _.clone( treeLoadInput.parentNode.cursorObject );

        return dpSelf.someDataProviderSvc
            .executeLoadAction( action, dpSelf.json, dataCtxNode, actionRequestObj ).then(
                function( responseObj ) {
                    return _processLoadTreeNodePageResponse( treeLoadInput, responseObj, dataCtxNode,
                        origCursorObj );
                } );
    };

    /**
     * Access the initial page of data.
     *
     * @param {Object} dataCtxNode - The data context the access is occurring within.
     *
     * @param {ViewModelTreeNode} parentNode - (Optional) Node to use as the 'parent' for any new nodes.
     *
     * @param {String} cursorNodeId - ID of an existing node in the 'parent' (and, presumably a
     *            ViewModelCollection) to insert any new nodes after.
     *
     * @param {Boolean} addAfter - (Optional) TRUE if any new children should be added AFTER the optional
     *            'cursorNodeId' (Default: TRUE)
     *
     * @param {ViewModelTreeNode} rootNode - Root Node opened
     *
     * @return {Promise} A promise resolved with a reference to the updated ViewModelCollection object.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.getTreeNodeInitial = function( dataCtxNode, parentNode, cursorNodeId, addAfter, rootNode ) {
        var action = dpSelf.initializeAction;

        assert( action, 'Invalid action specified' );

        /**
         * Set the dynamic properties of a 'TreeLoadInput' and start loading the next page of 'child' nodes for
         * the given 'parent'.
         */
        var inputData = _determineInput( parentNode, cursorNodeId, addAfter );

        var treeLoadInput = awTableSvc.createTreeLoadInput( inputData.parentNode, inputData.startChildNdx,
            null, cursorNodeId, dpSelf.treePageSize, addAfter, rootNode );

        var actionRequestObj = {
            treeLoadInput: treeLoadInput
        };

        dataCtxNode.data.treeLoadInput = treeLoadInput;

        var origCursorObj = _.clone( treeLoadInput.parentNode.cursorObject );

        return dpSelf.someDataProviderSvc
            .executeLoadAction( action, dpSelf.json, dataCtxNode, actionRequestObj ).then(
                function( responseObj ) {
                    return _processLoadTreeNodePageResponse( treeLoadInput, responseObj, dataCtxNode,
                        origCursorObj );
                } );
    };

    /**
     * Access a page of 'child' nodes of the given 'parent' node (starting at a specific 'child' node) and place
     * the results into the ViewModelColection of this UwDataProvider.
     *
     * @param {Object} dataCtxNode - The data context the access is occurring within.
     * @param {ViewModelTreeNode} parentNode - (Optional) Node to use as the 'parent' for any new nodes.
     * @param {String} startChildId - ID of a node in the 'parent' to start loading at.
     * @param {String} cursorNodeId - ID of an existing node in the 'parent' (and, presumably a
     *            ViewModelCollection) to insert any new nodes after.
     * @param {Number} pageSize - Maximum number of 'child' nodes to return (including the 'startChild').
     * @param {Boolean} addAfter - (Optional) TRUE if any new children should be added AFTER the optional
     *            'cursorNodeId' (Default: TRUE)
     *
     * @return {Promise} A promise object resolved with a reference to the updated ViewModelColection object.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.getTreeNode = function( dataCtxNode, parentNode, startChildId, cursorNodeId, pageSize, addAfter ) {
        var action = addAfter ? dpSelf.nextAction : dpSelf.previousAction;

        assert( action, 'Invalid action specified' );

        /**
         * Set the dynamic properties of a 'TreeLoadInput' and start loading the next page of 'child' nodes for
         * the given 'parent'.
         */
        var inputData = _determineInput( parentNode, cursorNodeId, addAfter );

        var treeLoadInput = awTableSvc.createTreeLoadInput( inputData.parentNode, inputData.startChildNdx,
            startChildId, cursorNodeId, pageSize, addAfter );

        var actionRequestObj = {
            treeLoadInput: treeLoadInput
        };

        dataCtxNode.data.treeLoadInput = treeLoadInput;

        var origCursorObj = _.clone( parentNode.cursorObject );

        return dpSelf.someDataProviderSvc
            .executeLoadAction( action, dpSelf.json, dataCtxNode, actionRequestObj ).then(
                function( responseObj ) {
                    return _processLoadTreeNodePageResponse( treeLoadInput, responseObj, dataCtxNode,
                        origCursorObj );
                } );
    };

    /**
     * @param {Object} dataCtxNode - The data context the access is occurring within.
     * @param {PropertyLoadInput} propertyLoadInput - The object containing the PropertyLoadRequest(s) to
     *            process.
     *
     * @return {Promise} The Promise is resolved with a PropertyLoadResult object when the operation is
     *         complete.
     *
     * @memberof module:js/dataProviderFactory~UwDataProvider
     */
    dpSelf.getProperties = function( dataCtxNode, propertyLoadInput ) {
        assert( dpSelf.action, 'Invalid action specified' );

        var actionRequestObj = {
            propertyLoadInput: propertyLoadInput
        };

        return dpSelf.someDataProviderSvc.executeLoadAction( dpSelf.action, dpSelf.json, dataCtxNode,
            actionRequestObj ).then( function( response ) {
            return response.propertyLoadResult;
        } );
    };

    dpSelf.getFilterFacets = function( viewModel, filterFacetInput ) {
        var action = dpSelf.filterFacetAction;

        var dataCtxNode = {
            data: viewModel,
            filterFacetInput: filterFacetInput
        };

        if( action ) {
            return dpSelf.someDataProviderSvc.executeLoadAction( action, dpSelf.json, dataCtxNode ).then( function( response ) {
                return response.filterFacetResults;
            } );
        }
        return $q.resolve();
    };

    /**
     * Free up all resources held by this object.
     * <P>
     * Note: After this function, no API call should be considered valid. This function is intended to be called
     * when the $scope of any associated viewModel is also being 'destroyed'. After this call (and a GC event),
     * any objects managed by this class may be considered a 'memory leak'.
     */
    dpSelf.destroy = function() {
        dpSelf._isDestroyed = true;

        declModelRegistrySvc.unregisterModel( 'UwDataProvider', dpSelf, 'name', '_modelId' );

        if( dpSelf.selectionModel ) {
            dpSelf.detachSelectionModel();
            dpSelf.selectionModel = null;
        }

        if( dpSelf.viewModelCollection ) {
            dpSelf.viewModelCollection.destroy();
            dpSelf.viewModelCollection = null;
        }

        if( dpSelf.someDataProviderSvc && dpSelf.someDataProviderSvc.destroy ) {
            dpSelf.someDataProviderSvc.destroy();
            dpSelf.someDataProviderSvc = null;
        }

        if( dpSelf.json.editContext && _editHandlerRegistered ) {
            editHandlerSvc.removeEditHandler( dpSelf.json.editContext );
        }

        const editConfig = dpSelf.json.editConfig;
        if( editConfig ) {
            editUtilsService._removeListeners( editConfig.sourceModel );
        }

        dpSelf.cols = null;
        dpSelf.topTreeNode = null;
        dpSelf.actionObj = null;
        dpSelf.json = null;

        dpSelf.ttState = null;
        dpSelf.policy = null;

        eventBus.unsubscribe( dpSelf.toggleDecoratorsEvent );
        eventBus.unsubscribe( dpSelf.multiSelectModeEvent );
        eventBus.unsubscribe( dpSelf.selectActionEvent );
        dpSelf.toggleDecoratorsEvent = null;
        dpSelf.multiSelectModeEvent = null;
        dpSelf.selectActionEvent = null;
    }; // destroy

    /**
     * ---------------------------------------------------------------------------<BR>
     * Property & Function definition complete....Finish initialization. <BR>
     * ---------------------------------------------------------------------------<BR>
     */

    declModelRegistrySvc.registerModel( 'UwDataProvider', dpSelf, 'name', '_modelId' );

    /**
     * Load localized text for when we encounter cases of no results and loading .
     *
     * @param localTextBundle
     */
    localeSvc.getTextPromise().then( function( localTextBundle ) {
        if( dpSelf ) {
            if( declUtils.isNil( dpSelf.isLoading ) ) {
                dpSelf.isLoading = localTextBundle.LOADING_TEXT;
            }
        }
    } );

    if( actionObj ) {
        dpSelf.action = actionObj;
    }

    _.forEach( actionMap, function( actionDef, actionName ) {
        dpSelf[ actionName ] = actionDef;
    } );

    if( dataProviderJson ) {
        dpSelf.json = dataProviderJson;
        dpSelf.policy = dataProviderJson.policy;

        /** tree page size */
        if( dataProviderJson.treePageSize ) {
            dpSelf.treePageSize = dataProviderJson.treePageSize;
        }

        /** Row or Cell selection scope ? */
        if( dataProviderJson.selectionModelScope ) {
            dpSelf.selectionModel.scope = dataProviderJson.selectionModelScope;
        }

        /**
         * Only set the default text values if they are not already set in the dataProvider JSON definition.
         */
        if( dataProviderJson.noResultsFound ) {
            dpSelf.noResultsFound = dataProviderJson.noResultsFound;
        }

        if( dataProviderJson.isLoading ) {
            dpSelf.isLoading = dataProviderJson.isLoading;
        }

        if( dataProviderJson.cacheCollapse ) {
            _initialCacheCollapseState = dataProviderJson.cacheCollapse;
            dpSelf.cacheCollapse = _initialCacheCollapseState;
        }
    }

    /**
     * Get the editable object from the data provider
     *
     * In case of list, it sends the selected object.<BR>
     * In case of Table, it send the all the loaded objects.
     *
     * @return {object} viewModelObject - View model object(s).
     */
    dpSelf.getEditableObjects = function() {
        if( dataProviderJson && dataProviderJson.editContext ) {
            if( dataProviderJson.editContext === 'LIST_CELL_CONTEXT' ) {
                if( dpSelf.selectionModel && dpSelf.selectionModel.mode === 'single' ) {
                    return dpSelf.getSelectedObjects();
                }
            } else {
                var vmc = dpSelf.viewModelCollection;
                return vmc.getLoadedViewModelObjects();
            }
        }
        return null;
    };

    /**
     * Get a list of property names form the dataprovider
     *
     * @return {Array} propNames - list of property Names
     */
    dpSelf.getPropertyNames = function() {
        var propNames = [];

        if( dataProviderJson.editContext === 'LIST_CELL_CONTEXT' ) {
            if( dpSelf.selectionModel && dpSelf.selectionModel.mode === 'single' ) {
                var selectedObject = dpSelf.getSelectedObjects();
                if( selectedObject !== null ) {
                    _.forEach( selectedObject, function( viewModelObject ) {
                        _.forEach( viewModelObject.props, function( props ) {
                            if( props && props.type ) {
                                propNames.push( props.propertyName );
                            }
                        } );
                    } );
                }
            }
        } else {
            if( dpSelf.cols ) {
                _.forEach( dpSelf.cols, function( col ) {
                    if( col && col.typeName && !col.isTreeNavigation ) {
                        propNames.push( col.propertyName );
                    }
                } );
            }
        }

        return propNames;
    };

    /**
     * Gets the edit configuration object
     * @return {Object} The edit configuration object
     */
    dpSelf.getEditConfiguration = function() {
        return dpSelf.json.editConfig;
    };
}; // UwDataProvider

/**
 * ---------------------------------------------------------------------------<BR>
 * Define the public API for the 'dataProviderFactory' Service<BR>
 * ---------------------------------------------------------------------------<BR>
 */

var exports = {};

/**
 * Create a new DeclDataProvider object to manage and access List, LOV, flat-table and tree-table structured
 * ViewModelObjects.
 *
 * @param {DeclDataProviderJson} dataProviderJson - The JSON definition of the desired DeclDataProvider object
 *            from the DeclViewModel's JSON.
 *
 * @param {DeclAction} actionObj - The associated DeclAction object from the DeclViewModel's JSON.
 *
 * @param {String} dataProviderName - ID of the DeclDataProvider in the DeclViewModel structure.
 *
 * @param {Object} someDataProviderSvc - Some API object where various APIs (i.e. 'getFirstPage', 'getNextPage',
 *            etc.) methods are implemented (e.g. 'js/declDataProviderService').
 *
 * @param {StringMap} actionsMap - Map of action name to the action object from a declViewModel's JSON
 *            definition.
 *
 * @return {UwDataProvider} The newly created DeclDataProvider object.
 *
 * @memberof module:js/dataProviderFactory
 */
export let createDataProvider = function( dataProviderJson, actionObj, dataProviderName, someDataProviderSvc,
    actionsMap ) {
    var viewModelCollection = viewModelCollectionFactory.createViewModelCollection( dataProviderName );

    return new UwDataProvider( AwPromiseService.instance, dataProviderJson, actionObj, dataProviderName, someDataProviderSvc,
        viewModelCollection, actionsMap );
};

/**
 * Extract a parameter of a specific class from the given arguments array.
 * <P>
 * Note: The order or existence of parameters can vary when more-than-one property is specified in the
 * 'inputData' property of a DeclAction JSON. This code seeks out the requested one.
 *
 * @param {ObjectArray} argsIn - Array of argument objects
 *
 * @return {UwDataProvider} The DeclDataProvider from the given arguments (or undefined if not found)
 */
export let findDataProvider = function( argsIn ) {
    for( var ndx = 0; ndx < argsIn.length; ndx++ ) {
        var arg = argsIn[ ndx ];

        if( exports.isDataProvider( arg ) ) {
            return arg;
        }
    }
    return undefined;
};

/**
 * Test if the given object 'is-a' UwDataProvider created by this service.
 *
 * @param {Object} objectToTest - Object to check prototype history of.
 * @return {Boolean} TRUE if the given object is a DeclDataProvider.
 */
export let isDataProvider = function( objectToTest ) {
    return objectToTest instanceof UwDataProvider;
};

/**
 * Select all loaded objects in the dataprovider.
 *
 * @param {Object} dataProvider - dataProvider to call the selectAll command from
 */
export let selectAll = function( dataProvider ) {
    if( dataProvider ) {
        dataProvider.selectAll();
    }
};

/**
 * Deselect all loaded objects in the dataprovider.
 *
 * @param {Object} dataProvider - dataProvider to call the deSelectAll command from
 */
export let selectNone = function( dataProvider ) {
    if( dataProvider ) {
        dataProvider.selectNone();
    }
};

/**
 * Enable Multi Select Mode for selected dataprovider.
 *
 * @param {Object} dataProvider - dataProvider to call the selectAll command from
 */
export let dataProviderEnableMultiSelect = function( dataProvider ) {
    if( dataProvider ) {
        dataProvider.enableMultiSelect();
    }
};

/**
 * Disable Multi Select Mode for selected dataprovider.
 *
 * @param {Object} dataProvider - dataProvider to call the deSelectAll command from
 */
export let dataProviderDisableMultiSelect = function( dataProvider ) {
    if( dataProvider ) {
        dataProvider.disableMultiSelect();
    }
};

function loadDebugOption() {
    var urlAttrs = browserUtils.getUrlAttributes();

    _debug_logTreeLoadActivity = urlAttrs.logTreeLoadActivity !== undefined;
}

exports = {
    createDataProvider,
    findDataProvider,
    isDataProvider,
    selectAll,
    selectNone,
    dataProviderEnableMultiSelect,
    dataProviderDisableMultiSelect
};
export default exports;

loadDebugOption();

/**
/**
 * This factory creates 'UwDataProvider' objects used for lists, grids and other collections).
 *
 * @memberof NgServices
 * @member dataProviderFactory
 */
app.factory( 'dataProviderFactory', () => exports );

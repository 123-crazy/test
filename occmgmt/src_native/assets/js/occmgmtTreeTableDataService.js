/* eslint-disable max-lines */
//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*global
 define
 */

/**
 * @module js/occmgmtTreeTableDataService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import awTableSvc from 'js/awTableService';
import awColumnSvc from 'js/awColumnService';
import cdmSvc from 'soa/kernel/clientDataModel';
import dataManagementSvc from 'soa/dataManagementService';
import occmgmtGetSvc from 'js/occmgmtGetService';
import occmgmtUtils from 'js/occmgmtUtils';
import appCtxSvc from 'js/appCtxService';
import aceRestoreBWCStateService from 'js/aceRestoreBWCStateService';
import structureFilterService from 'js/structureFilterService';
import occmgmtTreeTableStateService from 'js/occmgmtTreeTableStateService';
import contextStateMgmtService from 'js/contextStateMgmtService';
import occmgmtVisibilityService from 'js/occmgmtVisibility.service';
import occmgmtIconSvc from 'js/occmgmtIconService';
import occmgmtTreeLoadResultBuilder from 'js/occmgmtTreeLoadResultBuilder';
import aceInContextOverrideService from 'js/aceInContextOverrideService';
import occmgmtCellRenderingService from 'js/occmgmtCellRenderingService';
import awTableStateService from 'js/awTableStateService';
import treeTableDataService from 'js/treeTableDataService';
import localStrg from 'js/localStorage';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';
import assert from 'assert';
import _ from 'lodash';
import logger from 'js/logger';
import browserUtils from 'js/browserUtils';
import eventBus from 'js/eventBus';
import acePartialSelectionService from 'js/acePartialSelectionService';
import occmgmtTreeTableBufferService from 'js/occmgmtTreeTableBufferService';

var _firstColumnConfigColumnPropertyName = null;

/**
 * ***********************************************************<BR>
 * Define external API<BR>
 * ***********************************************************<BR>
 */
var exports = {};

/**
 * {Boolean} TRUE if certain properties and/or events should be logged during occurrence loading.
 */
var _debug_logOccLoadActivity = false;

/**
 * Map from pci uid to "stableId" of nodes that are in expanded state
 */
var _pciToExpandedNodesStableIdsMap;

var _expandedNodes = {};

var updateExpansionState = function( treeLoadResult, declViewModel, contextState ) {
    if( appCtxSvc.ctx[ contextState.key ].resetTreeExpansionState || !_.isUndefined( treeLoadResult.retainTreeExpansionStatesForOpen ) && treeLoadResult.retainTreeExpansionStatesForOpen === false ) {
        awTableStateService.clearAllStates( declViewModel, _.keys( declViewModel.grids )[ 0 ] );
        delete appCtxSvc.ctx[ contextState.key ].resetTreeExpansionState;
        _pciToExpandedNodesStableIdsMap[ contextState.key ] = {};
    }

    _expandedNodes[ contextState.key ] = _expandedNodes[ contextState.key ] || _.cloneDeep( _expandedNodes.nodes ) || [];
    if( _expandedNodes[ contextState.key ] && _expandedNodes[ contextState.key ].length > 0 ) {
        _expandedNodes[ contextState.key ].map( function( uid ) {
            var gridId = Object.keys( declViewModel.grids )[ 0 ];
            awTableStateService.saveRowExpanded( declViewModel, gridId, uid );
        } );
        treeLoadResult.retainTreeExpansionStates = true;
        _expandedNodes[ contextState.key ] = [];
    }
};

function _getSelectedObjectIndex( uwDataProvider, contextState ) {
    var _selectedObjectIndex = -1;
    var _selectedObjects = contextState.context.selectedModelObjects;

    if( _selectedObjects.length > 0 ) {
        var _selectedObject = _selectedObjects[ _selectedObjects.length - 1 ];

        if( !_.isUndefined( uwDataProvider.topNodeUid ) && _.isEqual( _selectedObject.uid, uwDataProvider.topNodeUid ) ) {
            _selectedObjectIndex = 0;
        } else {
            _selectedObjectIndex = uwDataProvider.getViewModelCollection().findViewModelObjectById( _selectedObject.uid );
        }
    }
    return _selectedObjectIndex;
}

function _getPageInfo( treeNodes, isFocusOccurrenceConfigured, uwDataProvider, contextState ) {
    var _defaultPageSize = 20;

    // set the default values to scroll position.
    var _scrollPosition = {
        firstIndex: 0,
        lastIndex: _defaultPageSize
    };

    // If the tree node is selected, then the focused page after tree re-load is selected nodes page.
    // So, we are calculating the index of selected tree node in flat tree structure.
    // If the selected object index is not present with currently loaded page, then we need to load the tree nodes
    // of page around selected object.
    var _selectedObjectIndex = -1;
    if( isFocusOccurrenceConfigured ) {
        _selectedObjectIndex = _getSelectedObjectIndex( uwDataProvider, contextState );
    }

    // identify first and last index of currently loaded page using scroll position information
    var _firstIndex = uwDataProvider.scrollPosition.firstIndex;
    var _lastIndex = uwDataProvider.scrollPosition.lastIndex;
    var _loadedPageSize = _lastIndex - _firstIndex;
    var _pageSize = _defaultPageSize < _loadedPageSize ? _loadedPageSize : _defaultPageSize;

    // if tree node is selected and selected tree node is not present within currently loaded page,
    // then loaded tree will scroll the page to selected tree node.
    // Hence, calculate the page around selected occurrence.
    if( !_.isEqual( _selectedObjectIndex, -1 ) && ( _selectedObjectIndex > _lastIndex || _selectedObjectIndex < _firstIndex ) ) {
        var _pageSizeUp = Math.floor( _pageSize / 2 );
        // if selected object index is less than _pageSizeUp, then choose first index as zero
        // calculate last index based on first index and total page size.
        _firstIndex = _selectedObjectIndex - _pageSizeUp > 0 ? _selectedObjectIndex - _pageSizeUp : 0;
        _lastIndex = _firstIndex + _pageSize;
    }

    // If We are at first page and extra nodes are added in page ( e.g. unpack-all action performed )
    // And if we rely on first scrolled page info, then the additional nodes loading will get delayed with new SOA call.
    // This will cause jitter. i.e. first page may be half full, so we can not rely on scrolled page info when first index is 0.
    // So, we will go with default settings

    // Else we will use the loaded page information to calculate scroll position.
    if( _firstIndex !== 0 || _defaultPageSize < _loadedPageSize ) {
        //  adjust first and last index of page
        if( treeNodes.length < _lastIndex ) {
            // if our scroll is at position where newly loaded page can not reach.
            // so my page will be last elements of size equal to _pageSize.
            _firstIndex = treeNodes.length - _pageSize;
            _lastIndex = treeNodes.length;
        }

        // we are adding some pre and post nodes to avoid edge-conditions and avoiding extra SOA call.
        var _extraNodesToLoad = 3;
        _scrollPosition.firstIndex = _firstIndex - _extraNodesToLoad;
        _scrollPosition.lastIndex = _lastIndex + _extraNodesToLoad;
    }

    return _scrollPosition;
}

function _getScrolledPageNodes( treeNodes, treeLoadResult, isFocusOccurrenceConfigured, uwDataProvider, contextState ) {
    // get the start and end index of scrolled page
    var _scrollPosition = _getPageInfo( treeNodes, isFocusOccurrenceConfigured, uwDataProvider, contextState );

    // get nodes for which we want to load properties
    var allVMNodes = [];
    var nodesForPropertyLoadPage = [];
    if( !_.isUndefined( treeLoadResult.rootPathNodes ) ) {
        for( var inx = 0; inx < treeLoadResult.rootPathNodes.length; inx++ ) {
            allVMNodes.push( treeLoadResult.rootPathNodes[ inx ] );
            nodesForPropertyLoadPage.push( treeLoadResult.rootPathNodes[ inx ] );
        }
    }
    if( !_.isUndefined( treeLoadResult.newTopNode ) ) {
        allVMNodes.push( treeLoadResult.newTopNode );
        nodesForPropertyLoadPage.push( treeLoadResult.newTopNode );
    }

    // load tree nodes based on scroll position information.
    for( var index = _scrollPosition.firstIndex; index <= _scrollPosition.lastIndex; index++ ) {
        if( !_.isUndefined( treeNodes[ index ] ) ) {
            nodesForPropertyLoadPage.push( treeNodes[ index ] );
        }
    }
    allVMNodes.push.apply( allVMNodes, treeNodes );

    // add extra buffer to nodesForPropertyPageLoad based on settings
    var input = { vmNodes: nodesForPropertyLoadPage };
    occmgmtTreeTableBufferService.addExtraBufferToPage( input, uwDataProvider, allVMNodes );

    return input.vmNodes;
}

function _sortTreeNodesBasedOnParentChildHierarchy( treeNodes ) {
    // move all the children of parent node to immediate next in same order
    for( var inx = 0; inx < treeNodes.length; inx++ ) {
        var parentNode = treeNodes[ inx ];

        // identify children of parentNode from treeNodes
        var childNodesIndex = [];
        for( var jnx = 0; jnx < treeNodes.length; jnx++ ) {
            if( treeNodes[ jnx ].parentUid === parentNode.uid ) {
                childNodesIndex.push( jnx );
            }
        }

        // move them next to parentNode in same order
        for( var jnx = 0; jnx < childNodesIndex.length; jnx++ ) {
            if( childNodesIndex[ jnx ] !== inx + jnx + 1 ) {
                var childNode = treeNodes[ childNodesIndex[ jnx ] ];
                treeNodes.splice( childNodesIndex[ jnx ], 1 );
                treeNodes.splice( inx + jnx + 1, 0, childNode );
            }
        }
    }
}

// Loads tree node page with properties
// 1. Identify all the tree nodes
// 2. sort the tree nodes in flat tree structure
// 3. get the loaded page nodes
// 4. load tree properties for loaded page nodes.
function _loadTreeNodePageWithProperties( newlyLoadedNodes, treeLoadResult, isFocusOccurrenceConfigured, uwDataProvider, declViewModel, contextState ) {
    // identify tree nodes that will be rendered on tree.
    var treeNodes = !_.isUndefined( newlyLoadedNodes ) ? newlyLoadedNodes : treeLoadResult.childNodes;

    // sort the newly added nodes in the order they are going to render in tree.
    _sortTreeNodesBasedOnParentChildHierarchy( treeNodes );

    // get scrolled page nodes
    var nodesForPropertyLoadPage = _getScrolledPageNodes( treeNodes, treeLoadResult, isFocusOccurrenceConfigured, uwDataProvider, contextState );

    if( _.isEmpty( nodesForPropertyLoadPage ) ) {
        return {
            treeLoadResult: treeLoadResult
        };
    }
    // load properties for page of tree nodes.
    var contextKey = contextState.key;
    var columnInfos = [];
    _.forEach( uwDataProvider.cols, function( columnInfo ) {
        if( !columnInfo.isTreeNavigation ) {
            columnInfos.push( columnInfo );
        }
    } );
    var propertyLoadContext = {
        clientName: 'AWClient',
        clientScopeURI: contextState.context.sublocation.clientScopeURI,
        typesForArrange: uwDataProvider.columnConfig.typesForArrange
    };
    var propertyLoadRequest = {
        parentNode: null,
        childNodes: nodesForPropertyLoadPage,
        columnInfos: columnInfos
    };
    var propertyLoadInput = awTableSvc.createPropertyLoadInput( [ propertyLoadRequest ] );
    return exports.loadTreeTableProperties( {
        propertyLoadInput: propertyLoadInput,
        contextKey: contextKey,
        declViewModel: declViewModel,
        uwDataProvider: uwDataProvider,
        propertyLoadContext: propertyLoadContext,
        skipExtraBuffer: true
    } ).then(
        function( response ) {
            uwDataProvider.columnConfig = response.propertyLoadResult.columnConfig;
            return {
                treeLoadResult: treeLoadResult
            };
        } );
}

/**
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 * @param {Object} soaInput - Parameters to be sent to the 'pocc6' SOA call.
 * @param {*} uwDataProvider - Data Provider
 * @param {*} declViewModel - Decl ViewModel
 * @param {*} contextState - Context State
 * @return {Promise} A Promise resolved with a resulting TreeLoadResult object.
 */
function _loadTreeTableNodes( treeLoadInput, soaInput, uwDataProvider, declViewModel, contextState ) {
    var parentNode = treeLoadInput.parentNode;
    var sytemLocatorParams = appCtxSvc.getCtx( 'systemLocator' );
    if( sytemLocatorParams && sytemLocatorParams.isFocusedLoad !== undefined ) {
        treeLoadInput.isFocusedLoad = sytemLocatorParams.isFocusedLoad;
    }

    /**
     * If 'parent' has no 'child' nodes yet, there is no cursor that should be needed, or used.
     */
    if( _.isEmpty( parentNode.children ) ) {
        parentNode.cursorObject = null;
    }

    /**
     * If input has a known 'pci_uid', locate the IModelObject and set it in the inputData.
     *
     */
    if( treeLoadInput.pci_uid ) {
        soaInput.inputData.config.productContext = occmgmtUtils.getObject( treeLoadInput.pci_uid );
    }

    treeLoadInput.displayMode = 'Tree';

    /**
     * If a node other than the active product is being expanded then we must fetch and use filter parameters
     * from the cache
     */
    if( treeLoadInput.pci_uid && treeLoadInput.pci_uid !== contextState.context.currentState.pci_uid ) {
        treeLoadInput.filterString = updateFilterParamsOnInputForCurrentPciUid( treeLoadInput.pci_uid,
            contextState );
    }

    /**
     * Record if request is about jitter free tree load
     */
    if( !_.isUndefined( contextState.context.transientRequestPref.jitterFreePropLoad ) &&
        _.isEqual( contextState.context.transientRequestPref.jitterFreePropLoad, true ) ) {
        treeLoadInput.jitterFreePropLoad = true;
    }

    // get the hierarchy of focus object
    // if we get delta tree response, then we have to decide focus occurrence based on
    // this hierarchy of focus objects.
    var focusObjectHierarchy = [];
    var selectedObjects = contextState.context.selectedModelObjects;
    if( !_.isUndefined( selectedObjects ) && !_.isEmpty( selectedObjects ) ) {
        var focusObject = selectedObjects[ selectedObjects.length - 1 ];
        while( !_.isUndefined( focusObject ) && focusObject !== null ) {
            focusObjectHierarchy.push( focusObject );
            var parentFocusObject;
            if( focusObject.props && focusObject.props.awb0Parent ) {
                var parentFocusId = focusObject.props.awb0Parent.dbValues[ 0 ];
                parentFocusObject = cdmSvc.getObject( parentFocusId );
            }
            focusObject = parentFocusObject;
        }
    }
    treeLoadInput.focusObjectHierarchy = focusObjectHierarchy;

    return occmgmtGetSvc.getOccurrences( treeLoadInput, soaInput, contextState.context ).then(
        function( response ) {
            if( !declViewModel.isDestroyed() ) {
                var pciBeforeConfigurationChange = contextState.context.currentState.pci_uid;
                var treeLoadResult = occmgmtTreeLoadResultBuilder.processGetOccurrencesResponse( treeLoadInput, response, contextState, declViewModel );
                updateExpansionState( treeLoadResult, declViewModel, contextState );
                var isRestoreOptionApplicableForProduct = aceRestoreBWCStateService.addOpenedProductToSessionStorage( declViewModel, treeLoadInput, treeLoadResult, uwDataProvider, contextState );

                treeLoadResult.isRestoreOptionApplicableForProduct = isRestoreOptionApplicableForProduct;

                _pciToExpandedNodesStableIdsMap[ contextState.key ] = _pciToExpandedNodesStableIdsMap[ contextState.key ] || {};

                /**
                 * Currently expansion state is maintained in local storage and is based on "id" property of the
                 * nodes which is nothing but "uid" property of an element. When configuration changes, for ACE,
                 * "uid" of objects change and hence expansion state is lost. It is important from user
                 * perspective that we maintain expansion state. In order to achieve that what we do is use
                 * "stableId" (commonly referred to as clone stable id chain) property of expanded nodes to
                 * identify those on reload. This property remains same across configuration changes. Adding a
                 * mapping between product context and "stableId" further solidifies the proper identification
                 * of an element. Hence we build a map from "pci" to all "csid" that were expanded.
                 */
                if( !_.isEmpty( contextState.context.configContext ) || _.isEqual( contextState.context.retainTreeExpansionStateInJitterFreeWay, true ) ) {
                    occmgmtTreeTableStateService.setupCacheToRestoreExpansionStateOnConfigChange(
                        uwDataProvider, declViewModel, pciBeforeConfigurationChange,
                        contextState.context, _pciToExpandedNodesStableIdsMap[ contextState.key ] );
                    treeLoadResult.retainTreeExpansionStates = true;
                }

                var newlyLoadedNodes = treeLoadResult.childNodes;
                // If we have received multiple parent-child info consider those nodes too for maintaining expansion state.
                if( treeLoadResult.vmNodesInTreeHierarchyLevels ) {
                    newlyLoadedNodes = [];

                    _.forEach( treeLoadResult.vmNodesInTreeHierarchyLevels, function(
                        vmNodesInTreeHierarchyLevel ) {
                        newlyLoadedNodes = newlyLoadedNodes.concat( vmNodesInTreeHierarchyLevel );
                    } );
                }

                var isJitterFreeSupported = false;
                if( contextState.context.currentState.pci_uid ) {
                    var productContextInfo = cdmSvc.getObject( contextState.context.currentState.pci_uid );
                    isJitterFreeSupported = occmgmtUtils.isFeatureSupported( productContextInfo, 'Awb0JitterFreeRefreshBackButton' );
                }

                /**
                 * Restore expansion state of nodes that were identified as expanded when the request was made.
                 * It cannot be restricted to the call which made configuration change as not all expanded nodes
                 * are returned in a single load action. Hence we must try to identify nodes that need to be
                 * expanded from those that are returned after every call.
                 */
                if( uwDataProvider && _pciToExpandedNodesStableIdsMap[ contextState.key ] &&
                    Object.keys( _pciToExpandedNodesStableIdsMap[ contextState.key ] ).length > 0 ) {
                    var pciAfterConfigurationChange = contextState.context.currentState.pci_uid;

                    // In case of config change, we want to update the local storage with the entries in the _pciToExpandedNodesStableIdsMap.
                    // At this point the alternate id of the top node in the vmc is not yet updated with new PCI uid.
                    // This eventually happens in the dataProviderFactory which is after this call.
                    // Hence, to update the local storage with correct expanded node entries against the current_state.pci_uid,
                    // we update the top node alternate ID in the vmc.
                    if( isJitterFreeSupported ) {
                        uwDataProvider.topTreeNode.alternateID = contextState.context.currentState.pci_uid;
                        var vmcTopNodeObjNdx = uwDataProvider.viewModelCollection.findViewModelObjectById( uwDataProvider.topTreeNode.uid );
                        if( vmcTopNodeObjNdx !== -1 ) {
                            var vmcTopNode = uwDataProvider.viewModelCollection.getViewModelObject( vmcTopNodeObjNdx );
                            if( vmcTopNode.alternateID && vmcTopNode.alternateID !== uwDataProvider.topTreeNode.alternateID ) {
                                vmcTopNode.alternateID = uwDataProvider.topTreeNode.alternateID;
                            }
                        }
                    }

                    occmgmtTreeTableStateService.updateLocalStorageWithExpandedNodesOnConfigChange(
                        newlyLoadedNodes, declViewModel, pciAfterConfigurationChange,
                        _pciToExpandedNodesStableIdsMap[ contextState.key ] );

                    if( response.elementToPCIMap ) {
                        occmgmtTreeTableStateService.updateLocalStorageForProductNodesOfSWCOnConfigChange(
                            declViewModel, uwDataProvider.viewModelCollection.getLoadedViewModelObjects(),
                            pciBeforeConfigurationChange, newlyLoadedNodes, pciAfterConfigurationChange );
                    }
                }

                if( uwDataProvider && treeLoadResult && treeLoadResult.newTopNode && uwDataProvider.topTreeNode !== treeLoadResult.newTopNode.uid ) {
                    uwDataProvider.topNodeUid = treeLoadResult.newTopNode.uid;
                    uwDataProvider.topTreeNode = treeLoadResult.newTopNode;
                }

                if( isJitterFreeSupported && !uwDataProvider.topTreeNode.alternateID ) {
                    uwDataProvider.topTreeNode.alternateID = contextState.context.currentState.pci_uid;
                }

                if( treeLoadInput.gridOptions ) {
                    treeLoadInput.gridOptions.enableSorting = occmgmtUtils.isSortingSupported( contextState );
                    treeLoadInput.gridOptions.enableExpansionStateCaching = !aceRestoreBWCStateService.isRestoreOptionApplicable( treeLoadInput, treeLoadResult, contextState.context.currentState.uid );
                }

                if( !_.isUndefined( uwDataProvider.scrollPosition ) && _.isEqual( treeLoadInput.jitterFreePropLoad, true ) ) {
                    var isFocusOccurrenceConfigured = !_.isEmpty( response.focusChildOccurrence.occurrenceId );
                    return _loadTreeNodePageWithProperties( newlyLoadedNodes, treeLoadResult, isFocusOccurrenceConfigured, uwDataProvider, declViewModel, contextState );
                }
                return {
                    treeLoadResult: treeLoadResult
                };
            }
        } );
} // _loadTreeTableNodes

/**
 *
 * @param {TreeLoadInput} treeLoadInput TreeLoadInput
 * @param {*} loadIDs IDs to be loaded
 */
function _populateParentElementAndFocusElementInSoaInput( treeLoadInput, soaInput ) {
    /**
     * Since we are 'selecting' the 'opened' node. We want to make sure the 'opened' node is
     * expanded.
     */
    treeLoadInput.expandParent = true;
    var loadIDs = treeLoadInput.loadIDs;

    if( treeLoadInput.openOrUrlRefreshCase ) {
        //All uids i.e. top occurrence, opened occurrence and selected occurrence are same
        if( _.isEqual( loadIDs.t_uid, loadIDs.o_uid ) && _.isEqual( loadIDs.o_uid, loadIDs.c_uid ) ) {
            treeLoadInput.parentElement = loadIDs.t_uid;
        }
    }

    /**
     * Check if the 'parent' has already been loaded
     */
    var oUidObject = cdmSvc.getObject( loadIDs.o_uid );
    var grandParentUid = occmgmtUtils.getParentUid( oUidObject );

    if( grandParentUid ) {
        treeLoadInput.parentElement = grandParentUid;
        populateFocusElementInSoaInputIfApplicable( treeLoadInput, soaInput, oUidObject );
    }
}

/**
 *
 * @param {TreeLoadInput} treeLoadInput TreeLoadInput
 * @param {*} loadIDs IDs to be loaded
 */
function _populateSOAInputParamsAndLoadTreeTableNodes( treeLoadInput, loadIDs, soaInput, uwDataProvider, declViewModel, contextState ) {
    var oUidObject = cdmSvc.getObject( loadIDs.o_uid );
    var grandParentUid = occmgmtUtils.getParentUid( oUidObject );

    if( cdmSvc.isValidObjectUid( grandParentUid ) ) {
        treeLoadInput.parentElement = grandParentUid;
        populateFocusElementInSoaInputIfApplicable( treeLoadInput, soaInput, oUidObject );
    } else {
        treeLoadInput.parentElement = loadIDs.o_uid;
    }

    return _loadTreeTableNodes( treeLoadInput, soaInput, uwDataProvider, declViewModel, contextState );
}

/**
 *
 * @param {TreeLoadInput} treeLoadInput TreeLoadInput
 * @param {*} contextState Context State
 * @param {*} loadIDs IDs to be loaded
 * @param {*} newSortCriteria sortCriteria passed in argument input
 */
function _populateTreeLoadInputParamsForProvidedInput( treeLoadInput, contextState, loadIDs, newSortCriteria ) {
    if( treeLoadInput.parentNode.levelNdx === -1 ) {
        treeLoadInput.isTopNode = true;
        treeLoadInput.loadIDs = _getTreeNodeIdsToBeLoaded( loadIDs, contextState );
        treeLoadInput.topUid = treeLoadInput.loadIDs.t_uid ? treeLoadInput.loadIDs.t_uid : treeLoadInput.loadIDs.o_uid;
        treeLoadInput.parentElement = cdmSvc.NULL_UID;
    }

    if( _.isEmpty( contextState.context.previousState ) ) {
        treeLoadInput.openOrUrlRefreshCase = 'open';
        if( !_.isEmpty( contextState.context.currentState.pci_uid ) ) {
            if( _.isUndefined( appCtxSvc.ctx.aceSessionInitalized ) ) {
                treeLoadInput.openOrUrlRefreshCase = 'urlRefresh';
                appCtxSvc.updatePartialCtx( 'aceActiveContext.context.transientRequestPref.userGesture', 'REFRESH' );
            } else {
                treeLoadInput.openOrUrlRefreshCase = 'backButton';
            }
        }
        appCtxSvc.ctx.aceSessionInitalized = true;

        treeLoadInput.isProductInteracted = aceRestoreBWCStateService.isProductInteracted( contextState.context.currentState.uid );
        if( !_.isEqual( treeLoadInput.openOrUrlRefreshCase, 'urlRefresh' ) && !treeLoadInput.isProductInteracted ) {
            contextState.context.transientRequestPref.savedSessionMode = [ 'ignore' ];
        }
    }
    _populateRetainExpansionStatesParameterForProvidedInput( treeLoadInput, contextState );
    _populateSortCriteriaParameterForProvidedInput( treeLoadInput, contextState, newSortCriteria );

    if( contextState.context.openedElement && contextState.context.openedElement.modelType.typeHierarchyArray.indexOf( 'Awb0SavedBookmark' ) === -1 ) {
        _populateViewMoldelTreeNodeCreationStrategy( treeLoadInput, contextState );
    }
}

/**
 *
 * @param {TreeLoadInput} treeLoadInput TreeLoadInput
 * @param {*} contextState Context State
 * @param {*} loadIDs IDs to be loaded
 * @param {*} topUid topUid
 */
function _populateParentElementAndExpansionParamsForProvidedInput( treeLoadInput ) {
    var loadIDs = treeLoadInput.loadIDs;
    if( _.isEqual( loadIDs.c_uid, loadIDs.o_uid ) ) {
        treeLoadInput.expandParent = true;
    }
    if( _.isEqual( loadIDs.c_uid, loadIDs.t_uid ) ) {
        treeLoadInput.parentElement = treeLoadInput.topUid;
    }
}

/**

 * @param {TreeLoadInput} treeLoadInput TreeLoadInput
 * @param {*} contextState Context State
 */
function _resetCusrorParamsForProvidedParentNodeIfApplicable( treeLoadInput, contextState ) {
    if( contextState.context.requestPref.resetTreeDisplay || !_.isEmpty( contextState.context.configContext ) ) {
        if( treeLoadInput.parentNode.cursorObject && treeLoadInput.parentNode.cursorObject.endIndex ) {
            treeLoadInput.parentNode.cursorObject.endIndex = 0;
        }
        treeLoadInput.startChildNdx = 0;
    }
}

/**
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 *
 * @return {Promise} A Promise resolved with a resulting TreeLoadResult object.
 */
function _doTreeTableLoad( treeLoadInput, uwDataProvider, declViewModel, contextState, soaInput ) {
    var loadIDs = treeLoadInput.loadIDs;

    if( contextState.context.expansionCriteria && contextState.context.expansionCriteria.expandBelow ) {
        treeLoadInput.parentElement = contextState.context.currentState.o_uid;
        contextState.context.expansionCriteria.scopeForExpandBelow = appCtxSvc.ctx.aceActiveContext.context.nodeUnderExpandBelow.uid;
        treeLoadInput.expandBelow = true;
        if( contextState.context.expandNLevel ) {
            treeLoadInput.levelsToExpand = contextState.context.expandNLevel.levelsToExpand;
            contextState.context.expansionCriteria.levelsToExpand = contextState.context.expandNLevel.levelsToExpand;
        }
    } //Move to populateExpandBelowParamsIfAppliacble()
    /*
     * loadTreeTableData() is calling this method with skipFocusOccurrenceCheck to true. So , logic to set
     * skipFocusOccurrenceCheck to true is commented as default value is true. Going forward , we should try to
     * get rid of this flag skipFocusOccurrenceCheck
     */

    /**
     * Determine what 'parent' we should tell 'occ6' to focus on.
     */
    else if( treeLoadInput.isTopNode ) {
        if( !treeLoadInput.cursorObject ) {
            soaInput.inputData.requestPref.includePath = [ 'true' ];
            soaInput.inputData.requestPref.loadTreeHierarchyThreshold = [ '50' ];
        } //This should move to _populateTreeLoadInputParamsForProvidedInput()

        /**
         * Check if a 'top' occurrence is set
         */
        if( treeLoadInput.topUid ) {
            /**
             * Check if no 'selected' (c_uid) occurrence OR it is the same as the, valid, 'parent' (o_uid) being
             * loaded.<BR>
             * If so: Find the 'grandparent' and make the 'parent' the focus of the query.
             * <P>
             * TODO: This is where 'includePath' can be used to avoid needing access to the 'grandParent' when
             * the SOA API change to support this is fully deployed.
             */
            if( _isSelectedNodeEmptyOrSameAsOpenedNode( loadIDs ) ) {
                if( _debug_logOccLoadActivity ) {
                    logger.info( '_doTreeTableLoad: Case #1: Focus on parent o_uid:' + loadIDs.o_uid );
                }

                _populateParentElementAndFocusElementInSoaInput( treeLoadInput, soaInput, loadIDs.o_uid );

                /**
                 * We need to load the 'parent' before we can know the 'grandparent'
                 */
                if( _.isEqual( treeLoadInput.parentElement, cdmSvc.NULL_UID ) ) {
                    if( cdmSvc.isValidObjectUid( loadIDs.c_uid ) ) {
                        treeLoadInput.skipFocusOccurrenceCheck = false;
                    }

                    return dataManagementSvc.loadObjects( [ loadIDs.o_uid ] ).then( function() {
                        return _populateSOAInputParamsAndLoadTreeTableNodes( treeLoadInput, loadIDs, soaInput, uwDataProvider, declViewModel, contextState );
                    } );
                }
            } else {
                /**
                 * Check if the 'c_uid' and 'o_uid' are valid and 'c_uid' and 'o_uid' are NOT the same as the
                 * 'uid'. -- Need to check with use case is this.
                 */
                if( _areLoadIDsAndOpenedObjectDifferent( loadIDs ) ) {
                    if( _debug_logOccLoadActivity ) {
                        logger.info( '_doTreeTableLoad: Case #2: Focus on parent o_uid:' + loadIDs.o_uid //
                            +
                            ' c_uid: ' + loadIDs.c_uid );
                    }

                    _populateParentElementAndExpansionParamsForProvidedInput( treeLoadInput );

                    /**
                     * Check for case of the 'top' is selected<BR>
                     * If so: Just treat it as a normal 'top' expansion<BR>
                     * If not: Trust that the 'o_uid' is the immediate parent of the 'c_uid'.
                     */
                    if( !_.isEqual( loadIDs.c_uid, loadIDs.t_uid ) ) {
                        treeLoadInput.parentElement = loadIDs.o_uid; //already set above?
                        var cUidObject = cdmSvc.getObject( loadIDs.c_uid );

                        treeLoadInput.isFocusedLoad = true;

                        if( cUidObject ) {
                            if( !cdmSvc.isValidObjectUid( treeLoadInput.parentElement ) ) {
                                treeLoadInput.parentElement = occmgmtUtils.getParentUid( cUidObject );
                            }
                        } else {
                            cUidObject = occmgmtUtils.getObject( loadIDs.c_uid );
                        }

                        /**
                         * Check if we are changing the configuration<BR>
                         * If so: We need to reset inputs as if we are loading for the first time
                         */
                        _resetCusrorParamsForProvidedParentNodeIfApplicable( treeLoadInput, contextState );

                        if( !_.isEmpty( contextState.context.configContext ) ) {
                            treeLoadInput.skipFocusOccurrenceCheck = false;
                        }

                        soaInput.inputData.focusOccurrenceInput.element = cUidObject;
                    }

                    if( _debug_logOccLoadActivity ) {
                        logger.info( //
                            '_doTreeTableLoad: treeLoadInput:' + JSON.stringify( treeLoadInput, //
                                [ 'parentElement', 'cursorObject', 'isFocusedLoad', 'skipFocusOccurrenceCheck' ], 2 ) +
                            '\n' + 'soaInput.inputData.focusOccurrenceInput:' + '\n' +
                            JSON.stringify( soaInput.inputData.focusOccurrenceInput, [ 'element' ], 2 ) );
                    }
                } else {
                    if( _debug_logOccLoadActivity ) {
                        logger.info( '_doTreeTableLoad: Case #3: Focus on top o_uid:' + loadIDs.o_uid //
                            +
                            ' c_uid: ' + loadIDs.c_uid );
                    }

                    treeLoadInput.skipFocusOccurrenceCheck = false;
                    treeLoadInput.parentElement = treeLoadInput.topUid;
                }
            }
        } else {
            treeLoadInput.parentElement = cdmSvc.NULL_UID;
        }
    } else {
        /**
         * Assume the 'parent' node UID is good for the loading
         */
        treeLoadInput.parentElement = treeLoadInput.parentNode.uid;

        /**
         * Check if the 'c_uid' and 'o_uid' are valid and 'c_uid' and 'o_uid' are NOT the same as the 'uid'.
         */
        if( loadIDs && _areLoadIDsAndOpenedObjectDifferent( loadIDs ) ) {
            if( _debug_logOccLoadActivity ) {
                logger.info( '_doTreeTableLoad: Case #4: Focus on placeholder o_uid:' + loadIDs.o_uid //
                    +
                    ' c_uid: ' + loadIDs.c_uid );
            }

            cUidObject = cdmSvc.getObject( loadIDs.c_uid );

            if( cUidObject ) {
                if( !cdmSvc.isValidObjectUid( treeLoadInput.parentElement ) ) {
                    treeLoadInput.parentElement = occmgmtUtils.getParentUid( cUidObject );
                }
            } else {
                cUidObject = occmgmtUtils.getObject( loadIDs.c_uid );
            }

            soaInput.inputData.focusOccurrenceInput.element = cUidObject;
        }
    }

    return _loadTreeTableNodes( treeLoadInput, soaInput, uwDataProvider, declViewModel, contextState );
} // _doTreeTableLoad

function populateFocusElementInSoaInputIfApplicable( treeLoadInput, soaInput, focusObject ) {
    if( !treeLoadInput.skipFocusOccurrenceCheck ) {
        treeLoadInput.isFocusedLoad = true;
        soaInput.inputData.focusOccurrenceInput.element = focusObject;
    }
}

/**
 * @param {TreeLoadInput} loadIDs - Parameters for the operation.
 * @return {boolean} true if condition is met
 */
function _isSelectedNodeEmptyOrSameAsOpenedNode( loadIDs ) {
    return cdmSvc.isValidObjectUid( loadIDs.o_uid ) && ( !loadIDs.c_uid || cdmSvc.isValidObjectUid( loadIDs.c_uid ) && loadIDs.c_uid === loadIDs.o_uid );
}

/**
 * @param {TreeLoadInput} loadIDs - Parameters for the operation.
 * @return {boolean} true if condition is met
 */
function _areLoadIDsAndOpenedObjectDifferent( loadIDs ) {
    /**
     * Check if the 'c_uid' and 'o_uid' are valid and 'c_uid' and 'o_uid' are NOT the same as the
     * 'uid'.
     */
    return cdmSvc.isValidObjectUid( loadIDs.o_uid ) && cdmSvc.isValidObjectUid( loadIDs.c_uid ) && loadIDs.o_uid !== loadIDs.uid && loadIDs.c_uid !== loadIDs.uid;
}

/**
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 *
 * @return {Promise} A Promise resolved with a resulting TreeLoadResult object.
 */
function _doTreeTablePage( treeLoadInput, uwDataProvider, declViewModel, contextState, soaInput ) {
    var loadIDs = treeLoadInput.loadIDs;

    /**
     * Determine what 'parent' we should tell 'occ6' to focus on.
     */
    if( treeLoadInput.isTopNode ) {
        soaInput.inputData.requestPref.includePath = [ 'true' ];

        /**
         * Check if a 'top' occurrence is set
         */
        if( treeLoadInput.topUid ) {
            /**
             * Check if no 'selected' (c_uid) occurrence OR it is the same as the, valid, 'parent' (o_uid) being
             * loaded.<BR>
             * If so: Find the 'grandparent' and make the 'parent' the focus of the query.
             * <P>
             * TODO: This is where 'includePath' can be used to avoid needing access to the 'grandParent' when
             * the SOA API change to support this is fully deployed.
             */
            if( _isSelectedNodeEmptyOrSameAsOpenedNode( loadIDs ) ) {
                if( _debug_logOccLoadActivity ) {
                    logger.info( '_doTreeTablePage: Case #1: Focus on parent o_uid:' + loadIDs.o_uid );
                }

                _populateParentElementAndFocusElementInSoaInput( treeLoadInput, soaInput, loadIDs.o_uid );

                /**
                 * If parent is emtpy , we need to load the 'parent' before we can know the 'grandparent'
                 */
                if( _.isEqual( treeLoadInput.parentElement, cdmSvc.NULL_UID ) ) {
                    return dataManagementSvc.loadObjects( [ loadIDs.o_uid ] ).then( function() {
                        return _populateSOAInputParamsAndLoadTreeTableNodes( treeLoadInput, loadIDs, soaInput, uwDataProvider, declViewModel, contextState );
                    } );
                }
            } else {
                /**
                 * Check if the 'c_uid' and 'o_uid' are valid and 'c_uid' and 'o_uid' are NOT the same as the
                 * 'uid'.
                 */
                if( _areLoadIDsAndOpenedObjectDifferent( loadIDs ) ) {
                    if( _debug_logOccLoadActivity ) {
                        logger.info( '_doTreeTablePage: Case #2: Focus on parent o_uid:' + loadIDs.o_uid //
                            +
                            ' c_uid: ' + loadIDs.o_uid );
                    }

                    _populateParentElementAndExpansionParamsForProvidedInput( treeLoadInput );

                    /**
                     * Check for case of the 'top' is selected<BR>
                     * If so: Just treat it as a normal 'top' expansion<BR>
                     * If not: Trust that the 'o_uid' is the immediate parent of the 'c_uid'.
                     */
                    if( !_.isEqual( loadIDs.c_uid, loadIDs.t_uid ) ) {
                        treeLoadInput.parentElement = loadIDs.o_uid; //already set above?
                        var cUidObject = cdmSvc.getObject( loadIDs.c_uid );

                        if( cUidObject ) {
                            var parentElement = occmgmtUtils.getParentUid( cUidObject );

                            if( cdmSvc.isValidObjectUid( parentElement ) ) {
                                treeLoadInput.parentElement = parentElement;
                            }

                            populateFocusElementInSoaInputIfApplicable( treeLoadInput, soaInput, cUidObject );
                        } else {
                            cUidObject = occmgmtUtils.getObject( loadIDs.c_uid );
                        }

                        /**
                         * Check if we are changing the configuration<BR>
                         * If so: We need to reset inputs as if we are loading for the first time
                         */
                        _resetCusrorParamsForProvidedParentNodeIfApplicable( treeLoadInput, contextState );
                    }

                    if( _debug_logOccLoadActivity ) {
                        logger.info( //
                            '_doTreeTablePage: treeLoadInput:' + JSON.stringify( treeLoadInput, //
                                [ 'parentElement', 'cursorObject', 'isFocusedLoad', 'skipFocusOccurrenceCheck' ], 2 ) +
                            '\n' + 'soaInput.inputData.focusOccurrenceInput:' + '\n' +
                            JSON.stringify( soaInput.inputData.focusOccurrenceInput, [ 'element' ], 2 ) );
                    }
                } else {
                    if( _debug_logOccLoadActivity ) {
                        logger.info( '_doTreeTablePage: Case #3: Focus on top o_uid:' + loadIDs.o_uid //
                            +
                            ' c_uid: ' + loadIDs.o_uid );
                    }

                    treeLoadInput.parentElement = treeLoadInput.topUid;
                }
            }
        }
    } else {
        treeLoadInput.parentElement = treeLoadInput.parentNode.uid;
    }

    return _loadTreeTableNodes( treeLoadInput, soaInput, uwDataProvider, declViewModel, contextState );
} // __doTreeTablePage

/**
 *
 *
 */
export let updateColumnPropsAndNodeIconURLs = function( propColumns, occurrenceNodes, contextKey ) {
    var contextState = {
        context: appCtxSvc.ctx[ contextKey ],
        key: contextKey
    };
    var firstColumnConfigColumn = _.filter( propColumns, function( col ) { return _.isUndefined( col.clientColumn ); } )[ 0 ];
    var sortingSupported = occmgmtUtils.isSortingSupported( contextState );
    if( !sortingSupported ) {
        appCtxSvc.updatePartialCtx( contextKey + '.sortCriteria', null );
    }

    // first column is special here
    if( appCtxSvc.ctx.ViewModeContext.ViewModeContext === 'TreeSummaryView' || appCtxSvc.ctx.ViewModeContext.ViewModeContext === 'TreeView' ) {
        firstColumnConfigColumn.isTreeNavigation = true;
        firstColumnConfigColumn.enableColumnHiding = false;
    } else if( appCtxSvc.ctx.ViewModeContext.ViewModeContext === 'TableSummaryView' || appCtxSvc.ctx.ViewModeContext.ViewModeContext === 'TableView' ) {
        firstColumnConfigColumn.isTableCommand = true;
    }

    _.forEach( propColumns, function( col ) {
        if( !col.typeName && col.associatedTypeName ) {
            col.typeName = col.associatedTypeName;
            col.enableSorting = sortingSupported;

            var vmpOfColumnProp = occurrenceNodes[ 0 ].props[ col.propertyName ];

            if( col.sortDirection === 'Ascending' || col.sortDirection === 'Descending' ) {
                var newSortCriteria = [ { fieldName: col.propertyName, sortDirection: 'ASC' } ];
                if( col.sortDirection === 'Descending' ) {
                    newSortCriteria[ 0 ].sortDirection = 'DESC';
                }
                appCtxSvc.updatePartialCtx( contextState.key + '.sortCriteria', newSortCriteria );
            }

            //Disable Sorting on DCP property
            if( vmpOfColumnProp && vmpOfColumnProp.isDCP ) {
                col.enableSorting = false;
            }

            var sortCriteria = _.cloneDeep( appCtxSvc.getCtx( contextKey ).sortCriteria );
            if( !_.isEmpty( sortCriteria ) ) {
                if( sortCriteria[ 0 ].fieldName && _.eq( col.propertyName, sortCriteria[ 0 ].fieldName ) ) {
                    col.sort = {};
                    col.sort.direction = sortCriteria[ 0 ].sortDirection.toLowerCase();
                    col.sort.priority = 0;
                }
            }
        }
    } );

    firstColumnConfigColumn.enableColumnMoving = false;
    _firstColumnConfigColumnPropertyName = firstColumnConfigColumn.propertyName;

    // We got awb0ThumbnailImageTicket for nodes in SOA response. Update icon URL for all Nodes
    _.forEach( occurrenceNodes, function( childNode ) {
        childNode.iconURL = occmgmtIconSvc.getIconURL( childNode );
        treeTableDataService.updateVMODisplayName( childNode, _firstColumnConfigColumnPropertyName );
    } );

    if( appCtxSvc.ctx.aceActiveContext.context.vmc ) {
        exports.updateDisplayNames( { viewModelObjects: appCtxSvc.ctx.aceActiveContext.context.vmc.loadedVMObjects } );
    }
    occmgmtCellRenderingService.addCellClass( propColumns );
    occmgmtCellRenderingService.setOccmgmtCellTemplate( propColumns );
};

/**
 *
 */
function _resetContextState( contextKey ) {
    appCtxSvc.ctx[ contextKey ].retainTreeExpansionStates = false;
    appCtxSvc.updatePartialCtx( contextKey + '.treeLoadingInProgress', false );
    delete appCtxSvc.ctx[ contextKey ].retainTreeExpansionStateInJitterFreeWay;
}

/**
 *
 */
function _populateRetainExpansionStatesParameterForProvidedInput( treeLoadInput, contextState ) {
    treeLoadInput.retainTreeExpansionStates = false;

    //Retain expansion states if specified on context.
    if( contextState.context.retainTreeExpansionStates ) {
        treeLoadInput.retainTreeExpansionStates = true;
    }

    //Retain expansion states when initializeAction.
    if( _.isEqual( treeLoadInput.dataProviderActionType, 'initializeAction' ) ) {
        treeLoadInput.retainTreeExpansionStates = true;
    }
}

/**
 *
 */
function _populateSortCriteriaParameterForProvidedInput( treeLoadInput, contextState, newSortCriteria ) {
    var context = appCtxSvc.getCtx( contextState.key );
    var currentSortCriteria = context.sortCriteria;
    // If no sort criteria to sort criteria OR sort criteria to no sort criteria
    if( !_.isEmpty( newSortCriteria ) || !_.isEmpty( currentSortCriteria ) ) {
        if( !_.isEqual( newSortCriteria, currentSortCriteria ) ) {
            treeLoadInput.retainTreeExpansionStates = true;
            treeLoadInput.sortCriteriaChanged = true;
            // Enable jitter free propery load
            context.transientRequestPref.jitterFreePropLoad = true;
            // Return the child nodes without bom expansion
            context.transientRequestPref.returnChildrenNoExpansion = true;

            // Set loadTreeHierarchyThreshold to number of VMOs in the client
            if( !_.isEmpty( context.vmc ) && !_.isEmpty( context.vmc.loadedVMObjects ) ) {
                context.transientRequestPref.loadTreeHierarchyThreshold = [ context.vmc.loadedVMObjects.length.toString() ];
            }
            appCtxSvc.updatePartialCtx( contextState.key + '.sortCriteria', newSortCriteria );
        }
    }
    treeLoadInput.sortCriteria = appCtxSvc.getCtx( contextState.key ).sortCriteria;
}

/**
 * Populates the strategy for reuse of view model tree node during creation
 * reuseVMNode - If existing view mode tree node exists with collection then that will be reused.
 */
function _populateViewMoldelTreeNodeCreationStrategy( treeLoadInput, contextState ) {
    var reuseVMNode = !_.isEqual( treeLoadInput.dataProviderActionType, 'initializeAction' ) ||
        contextState.context.requestPref.filterOrRecipeChange ||
        treeLoadInput.sortCriteriaChanged;
    treeLoadInput.vmNodeCreationStrategy = {
        reuseVMNode: reuseVMNode
    };
    if( treeLoadInput.sortCriteriaChanged ) {
        treeLoadInput.vmNodeCreationStrategy.clearExpandState = true;
    }
}

/**
 *
 */
function _populateClearExistingSelectionsParameterForProvidedInput( treeLoadInput, contextState ) {
    var clearExistingSelections = appCtxSvc.getCtx( contextState.key ).clearExistingSelections;

    if( clearExistingSelections || !_.isEmpty( contextState.context.configContext ) ) {
        treeLoadInput.clearExistingSelections = true;
        appCtxSvc.updatePartialCtx( contextState.key + '.clearExistingSelections', false );
    }
}

/**
 *
 */
function _updateContextStateOnUrlRefresh( treeLoadInput, contextState ) {
    //If previous state is empty, that means it is open case/url refresh case
    if( treeLoadInput.openOrUrlRefreshCase ) {
        if( !_.isEmpty( contextState.context.currentState.incontext_uid ) ) {
            contextState.context.currentState.c_uid = contextState.context.currentState.incontext_uid;
        }
    }
}

/**
 * Local storage has 2 set of information stored per product(PCI uid), nodeStates and structure.
 * nodeStates has a flat list of expadedNodes sorted alphabetically and structure has expandedNodes in parent-children hierarchy.
 * This API iterates over the structure and gets the expandedNodes csids if the same entry is present in the nodeState.
 */
function _fetchCsidsForNodes( csids, structureNode, nodeStates ) {
    for( var node in structureNode ) {
        if( node && node !== 'childNdx' && nodeStates.includes( node ) ) {
            csids.push( node );
        }

        if( !_.isEmpty( structureNode[ node ] ) ) {
            _fetchCsidsForNodes( csids, structureNode[ node ], nodeStates );
        }
    }
}

/**
 *
 */
function _updateTreeLoadInputParameterForResetAction( treeLoadInput, contextState ) {
    var requestPref = appCtxSvc.getCtx( contextState.key ).requestPref;
    var isResetActionInProgress = requestPref && _.isEqual( requestPref.savedSessionMode, 'reset' );
    if( !isResetActionInProgress ) {
        let transientRequestPref = appCtxSvc.getCtx( contextState.key ).transientRequestPref;
        isResetActionInProgress = transientRequestPref && _.isEqual( transientRequestPref.savedSessionMode, 'reset' );
    }

    //When reset is done and UID of rootNode doesn't change, Tree widget doesn't populate children property.
    //Re-setting parentNode UID info to what it was when we open structure (state.uid ) helps. Correct way
    //to fix this is refactor dataProviderFactory processTreeNodes logic.
    if( isResetActionInProgress ) {
        treeLoadInput.parentNode.uid = contextState.context.currentState.uid;
        appCtxSvc.ctx[ contextState.key ].resetTreeExpansionState = true;
        treeLoadInput.isResetRequest = true;
    }
}

/**
 *
 */
function _getTreeNodeIdsToBeLoaded( loadIDs, contextState ) {
    if( !loadIDs ) {
        return {
            t_uid: contextState.context.currentState.t_uid,
            o_uid: contextState.context.currentState.o_uid,
            c_uid: contextState.context.currentState.c_uid,
            uid: contextState.context.currentState.uid
        };
    }
    return loadIDs;
}

/**
 *
 */
function _getEffectiveOverriddenPolicy() {
    var overriddenPropertyPolicy = propertyPolicySvc.getEffectivePolicy();

    //read preference AWB_ShowTypeIcon
    if( !_.isUndefined( appCtxSvc.ctx.preferences ) && !_.isUndefined( appCtxSvc.ctx.preferences.AWB_ShowTypeIcon ) &&
        appCtxSvc.ctx.preferences.AWB_ShowTypeIcon.length > 0 && appCtxSvc.ctx.preferences.AWB_ShowTypeIcon[ 0 ].toUpperCase() === 'TRUE' ) {
        // show thumbnail false, show type ICON true
        _.forEach( overriddenPropertyPolicy.types, function( type ) {
            var properties = [];
            _.forEach( type.properties, function( property ) {
                if( property.name !== 'awp0ThumbnailImageTicket' ) {
                    properties.push( property );
                }
            } );
            type.properties = properties;
        } );
    }

    return overriddenPropertyPolicy;
}
/**
 * @param {Object} uwDataProvider - An Object (usually a UwDataProvider) on the DeclViewModel on the $scope this
 *            action function is invoked from.
 * @param {Object} columnProvider:
 * @return {Promise} A Promise that will be resolved with the requested data when the data is available.
 *
 * <pre>
 * {
 *     columnInfos : {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 * }
 * </pre>
 */
export let loadTreeTableColumns = function( uwDataProvider, columnProvider ) {
    var deferred = AwPromiseService.instance.defer();
    var awColumnInfos = [];
    var firstColumnConfigCol = {
        name: 'object_string',
        displayName: '...',
        typeName: 'Awb0Element',
        width: 400,
        isTreeNavigation: true,
        enableColumnMoving: false,
        enableColumnResizing: false,
        columnOrder: 100
    };

    var clientColumns = columnProvider && columnProvider.clientColumns ? columnProvider.clientColumns : [];
    if( clientColumns ) {
        _.forEach( clientColumns, function( column ) {
            if( column.clientColumn ) {
                awColumnInfos.push( column );
            }
        } );
    }

    awColumnInfos.push( firstColumnConfigCol );
    awColumnInfos = _.sortBy( awColumnInfos, function( column ) { return column.columnOrder; } );

    occmgmtCellRenderingService.setOccmgmtCellTemplate( awColumnInfos );

    var sortCriteria = appCtxSvc.ctx.aceActiveContext.context.sortCriteria;
    if( !_.isEmpty( sortCriteria ) ) {
        if( sortCriteria[ 0 ].fieldName && _.eq( awColumnInfos[ 0 ].name, sortCriteria[ 0 ].fieldName ) ) {
            awColumnInfos[ 0 ].sort = {};
            awColumnInfos[ 0 ].sort.direction = sortCriteria[ 0 ].sortDirection.toLowerCase();
            awColumnInfos[ 0 ].sort.priority = 0;
        }
    }

    awColumnSvc.createColumnInfo( awColumnInfos );

    uwDataProvider.columnConfig = {
        columns: awColumnInfos
    };

    deferred.resolve( {
        columnInfos: awColumnInfos
    } );

    return deferred.promise;
};

/**
 * Get a page of row data for a 'tree' table.
 *
 * Note: This method assumes there is a single argument object being passed to it and that this object has the
 * following property(ies) defined in it.
 * <P>
 * {TreeLoadInput} treeLoadInput - An Object with details for this action for what to load. The object is
 * usually the result of processing the 'inputData' property of a DeclAction based on data from the current
 * DeclViewModel on the $scope). The 'pageSize' properties on this object is used (if defined).
 *
 * <pre>
 * {
 * Extra 'debug' Properties
 *     dbg_isLoadAllEnabled: {Boolean}
 *     dbg_pageDelay: {Number}
 * }
 * </pre>
 *
 * @return {Promise} A Promise that will be resolved with a TreeLoadResult object when the requested data is
 *         available.
 */
export let loadTreeTableData = function() { // eslint-disable-line no-unused-vars
    /**
     * Extract action parameters from the argument to this function.
     */
    assert( arguments.length === 1, 'Invalid argument count' );
    assert( arguments[ 0 ].treeLoadInput, 'Missing argument property' );
    assert( arguments[ 0 ].contextKey, 'Missing argument property : contextKey' );

    var treeLoadInput = arguments[ 0 ].treeLoadInput;
    var loadIDs = arguments[ 0 ].loadIDs;
    var gridOptions = arguments[ 0 ].gridOptions;
    var contextKey = arguments[ 0 ].contextKey;
    var dataProvider = arguments[ 0 ].uwDataProvider;
    var declViewModel = arguments[ 0 ].declViewModel;
    var newSortCriteria = _.cloneDeep( arguments[ 0 ].sortCriteria );
    var contextState = {
        context: appCtxSvc.ctx[ contextKey ],
        key: contextKey
    };

    treeLoadInput.dataProviderActionType = !_.isUndefined( arguments[ 0 ].dataProviderActionType ) ? arguments[ 0 ].dataProviderActionType : 'initializeAction';

    /**purpose of skipFocusOccurrenceCheck flag is to not pass selection to server when one object is selected and other is expanded.
     * Setting this to true makes sense only in that scenario.
     *
     * One more scenario is loading of placeHolder parent. In that case, skipFocusOccurrenceCheck should be true.
     */

    if( loadIDs && loadIDs.c_uid ) {
        var objNdx = dataProvider.viewModelCollection.findViewModelObjectById( loadIDs.c_uid );
        var vmNode = dataProvider.viewModelCollection.getViewModelObject( objNdx );

        /**isPlaceholder / _focusRequested property on vmNode indicates that it is placeHolder node. This is not actual focus
         * object. But passed as focus object to load that particular incomplete level in client. So set skipFocusOccurrenceCheck to true.
         **/
        if( vmNode && vmNode._focusRequested ) {
            treeLoadInput.skipFocusOccurrenceCheck = true;
            treeLoadInput.parentNode.cursorObject = null;
        }
    }

    _populateClearExistingSelectionsParameterForProvidedInput( treeLoadInput, contextState );
    _updateTreeLoadInputParameterForResetAction( treeLoadInput, contextState );

    treeLoadInput.gridOptions = gridOptions;

    /**
     * Check the validity of the parameters
     */
    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );

    if( failureReason ) {
        return AwPromiseService.instance.reject( failureReason );
    }

    appCtxSvc.updatePartialCtx( contextKey + '.treeLoadingInProgress', true );

    // When entering into the split view, the contextState.context.requestPref.expandedNodes is carried forward to the inactive view.
    // Hence, we cannot rely on the contextState.context.requestPref.expandedNodes.length
    // Check if the expandedNodes are populated for this call instead.
    var expandedNodesPopulatedForThisCall = false;

    // We need to send list of expanded nodes to server when,
    // 1. Changing configuration.
    // 2. Explicitly mentioned on the context.retainTreeExpansionStateInJitterFreeWay.
    // 3. Sorting is applied with new criteria OR sort criteria is reset.
    if( !_.isEmpty( contextState.context.configContext ) ||
        _.isEqual( contextState.context.retainTreeExpansionStateInJitterFreeWay, true ) ||
        ( !_.isEmpty( newSortCriteria ) || !_.isEmpty( contextState.context.sortCriteria ) ) &&
        !_.isEqual( newSortCriteria, contextState.context.sortCriteria )
    ) {
        contextState.context.requestPref.expandedNodes = occmgmtTreeTableStateService.getCSIDChainsForExpandedNodes( dataProvider );
        expandedNodesPopulatedForThisCall = !_.isEmpty( contextState.context.requestPref.expandedNodes );
        delete contextState.context.retainTreeExpansionStateInJitterFreeWay;
    }

    _populateTreeLoadInputParamsForProvidedInput( treeLoadInput, contextState, loadIDs, newSortCriteria );
    _updateContextStateOnUrlRefresh( treeLoadInput, contextState );

    // In case of urlRefresh and backButton, we send the expanded nodes cached in the local storage as input.
    // This is done to achieve jitterfree behaviour for the 2 scenarios.
    if( treeLoadInput.openOrUrlRefreshCase === 'urlRefresh' || treeLoadInput.openOrUrlRefreshCase === 'backButton' ) {
        var pciUid = '';
        if( treeLoadInput.pci_uid ) {
            pciUid = treeLoadInput.pci_uid;
        } else if( contextState.context.currentState && contextState.context.currentState.pci_uid ) {
            pciUid = contextState.context.currentState.pci_uid;
        }

        if( pciUid && !expandedNodesPopulatedForThisCall ) {
            // Check if PCI entry exists in the local storage.
            // Checking it from localstorage directly as the awTableStateService.getTreeTableState() resets the ttstate if no matching entry found
            var allLocalStates = localStrg.get( 'awTreeTableState' );
            var indexOfPciInLS = -1;
            if( allLocalStates ) {
                indexOfPciInLS = allLocalStates.indexOf( pciUid );
            }

            if( indexOfPciInLS > -1 ) {
                if( dataProvider.topTreeNode && !dataProvider.topTreeNode.alternateID ) {
                    dataProvider.topTreeNode.alternateID = pciUid;
                }

                var gridId = Object.keys( declViewModel.grids )[ 0 ];
                if( !_.isUndefined( appCtxSvc.ctx.clearLocalStorageForInactiveView ) && appCtxSvc.ctx.clearLocalStorageForInactiveView === gridId ) {
                    awTableStateService.clearAllStates( declViewModel, gridId );
                    appCtxSvc.updatePartialCtx( 'clearLocalStorageForInactiveView', null );
                }

                var ttState = awTableStateService.getTreeTableState( declViewModel, gridId );
                if( !_.isEmpty( ttState.nodeStates ) && !_.isEmpty( ttState.structure ) ) {
                    // Get the nodeStates in an array
                    var nodeStates = [];
                    for( var node in ttState.nodeStates ) {
                        nodeStates.push( node );
                    }

                    // Fetch the csids to an array from local storage
                    var tableStructure = ttState.structure;
                    var structureNodes = tableStructure[ pciUid ];
                    var csidChainsOfNodes = [];
                    csidChainsOfNodes.push( ':' );
                    _fetchCsidsForNodes( csidChainsOfNodes, structureNodes, nodeStates );

                    // While refresh/back button use case in split view,
                    // the expanded nodes from the first view getOcc call get carried over to the next view getOcc call.
                    // If the set of expanded nodes are same then use it, else use the new set from the local storage
                    if( csidChainsOfNodes.length > 1 ) {
                        contextState.context.requestPref.expandedNodes = csidChainsOfNodes;
                        contextState.context.transientRequestPref.jitterFreePropLoad = true;
                        contextState.context.transientRequestPref.loadTreeHierarchyThreshold = [ '2147483646' ];
                        contextState.context.transientRequestPref.returnChildrenNoExpansion = true;
                    } else if( !_.isEmpty( contextState.context.requestPref.expandedNodes ) ) {
                        contextState.context.transientRequestPref.jitterFreePropLoad = true;
                        contextState.context.transientRequestPref.loadTreeHierarchyThreshold = [ '2147483646' ];
                        contextState.context.transientRequestPref.returnChildrenNoExpansion = true;
                    }
                } else if( dataProvider.topTreeNode && dataProvider.topTreeNode.alternateID ) {
                    delete dataProvider.topTreeNode.alternateID;
                }
            }
        }

        // For split view the expandedNodes get carried forward
        // Set the RequestPref to retrieve nodes in jitterfree way
        if( appCtxSvc.ctx.splitView && appCtxSvc.ctx.splitView.mode ) {
            contextState.context.transientRequestPref.jitterFreePropLoad = true;
            contextState.context.transientRequestPref.loadTreeHierarchyThreshold = [ '2147483646' ];
            contextState.context.transientRequestPref.returnChildrenNoExpansion = true;
        }
    }

    /**
     * Get the 'child' nodes async
     */
    var soaInput = occmgmtGetSvc.getDefaultSoaInput();
    return _doTreeTableLoad( treeLoadInput, dataProvider, declViewModel, contextState, soaInput );
};

/*
 * Method registered against focusAction in viewModel json.
 * But currently this is not honored in Apollo. So, have kept this commented.
 */
export let loadOccurrencesWithFocusInTreeTable = function() {
    return exports.loadTreeTableData( arguments[ 0 ] );
};

/*
 * Method registered against nextAction in viewModel json
 */
export let loadNextOccurrencesInTreeTable = function() {
    return exports.loadTreeTableDataPage( arguments[ 0 ] );
};

/*
 * Method registered against previousAction in viewModel json
 */
export let loadPreviousOccurrencesInTreeTable = function() {
    return exports.loadTreeTableDataPage( arguments[ 0 ] );
};

/**
 * Get a page of row data for a 'tree' table.
 *
 * Note: This method assumes there is a single argument object being passed to it and that this object has the
 * following property(ies) defined in it.
 * <P>
 * {TreeLoadInput} treeLoadInput - An Object with details for this action for what to load. The object is
 * usually the result of processing the 'inputData' property of a DeclAction based on data from the current
 * DeclViewModel on the $scope). The 'pageSize' properties on this object is used (if defined).
 *
 * <pre>
 * {
 * Extra 'debug' Properties
 *     dbg_isLoadAllEnabled: {Boolean}
 *     dbg_pageDelay: {Number}
 * }
 * </pre>
 *
 * @return {Promise} A Promise that will be resolved with a TreeLoadResult object when the requested data is
 *         available.
 */
export let loadTreeTableDataPage = function() { // eslint-disable-line no-unused-vars
    /**
     * Extract action parameters from the argument to this function.
     */
    assert( arguments.length === 1, 'Invalid argument count' );
    assert( arguments[ 0 ].treeLoadInput, 'Missing argument property' );
    assert( arguments[ 0 ].contextKey, 'Missing argument property : contextKey' );

    var treeLoadInput = arguments[ 0 ].treeLoadInput;
    //var loadIDs = arguments[ 0 ].loadIDs;
    var loadIDs = null; //for focus action to work in _doTreeTablePage(), this has to be null.
    var gridOptions = arguments[ 0 ].gridOptions;
    var contextKey = arguments[ 0 ].contextKey;
    var dataProvider = arguments[ 0 ].uwDataProvider;
    var newSortCriteria = arguments[ 0 ].sortCriteria;
    var contextState = {
        context: appCtxSvc.ctx[ contextKey ],
        key: contextKey
    };

    if( ( contextState.context.expansionCriteria.expandBelow || treeLoadInput.parentNode.isInExpandBelowMode ) && _.isEmpty( contextState.context.configContext ) ) {
        var expandBelowPageSize = '500'; // default page size
        if( !_.isUndefined( appCtxSvc.ctx.preferences ) && !_.isUndefined( appCtxSvc.ctx.preferences.AWB_ExpandBelowResponsePageSize ) &&
            appCtxSvc.ctx.preferences.AWB_ExpandBelowResponsePageSize.length > 0 ) {
            expandBelowPageSize = appCtxSvc.ctx.preferences.AWB_ExpandBelowResponsePageSize[ 0 ];
        }
        contextState.context.expansionCriteria.expandBelow = 'true';
        contextState.context.expansionCriteria.loadTreeHierarchyThreshold = expandBelowPageSize;
        contextState.context.expansionCriteria.scopeForExpandBelow = appCtxSvc.ctx.aceActiveContext.context.nodeUnderExpandBelow.uid;
        treeLoadInput.expandBelow = true;
        if( contextState.context.expandNLevel ) {
            treeLoadInput.levelsToExpand = contextState.context.expandNLevel.levelsToExpand;
            contextState.context.expansionCriteria.levelsToExpand = contextState.context.expandNLevel.levelsToExpand;
        }
    }

    treeLoadInput.gridOptions = gridOptions;

    /*
     * This method is called in following scenarios : a) Object is added into selection,it is not displayed
     * currently in tree , needs to be fetched from server and focused. In this case, skipFocusOccurrenceCheck
     * should not be true so that focus occurrence is passed to server and it get focused after server response (
     * in case of 4G , different object comes from server) b) When Tree Node is expanded. In this case,
     * skipFocusOccurrenceCheck should be true so that current focus occurrence is not passed to server. Server
     * returns data based on parent of focus occurrence
     */
    if( treeLoadInput.parentNode ) {
        if( treeLoadInput.parentNode.isExpanded ) {
            //TreeNode expansion scenario
            treeLoadInput.skipFocusOccurrenceCheck = true;
            //We need loadIDs from data provider only in "Expand Node" use case. Otherwise, loadIDs
            //information is there on URL.
            loadIDs = arguments[ 0 ].loadIDs;

            if( contextState.context.elementToPCIMap ) {
                if( treeLoadInput.parentNode.pciUid ) {
                    treeLoadInput.pci_uid = treeLoadInput.parentNode.pciUid;
                } else {
                    treeLoadInput.pci_uid = occmgmtUtils.getProductContextForProvidedObject( treeLoadInput.parentNode );
                }
            }
        }
    }

    /*
     *For Load Next / Load Previous case , we need to skip focus occurrence. These flag population conditions
     *are technical debts which should get cleaned up with LCS-145929
     */
    if( treeLoadInput.cursorNodeId ) {
        var objNdx = dataProvider.viewModelCollection.findViewModelObjectById( treeLoadInput.cursorNodeId );
        var vmNode = dataProvider.viewModelCollection.getViewModelObject( objNdx );

        if( vmNode._loadTailRequested || vmNode._loadHeadRequested ) {
            treeLoadInput.skipFocusOccurrenceCheck = true;
        }
    }

    /**
     * Check the validity of the parameters
     */
    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );

    if( failureReason ) {
        return AwPromiseService.instance.reject( failureReason );
    }

    _populateTreeLoadInputParamsForProvidedInput( treeLoadInput, contextState, loadIDs, newSortCriteria );
    /*
     * If focus occurrence is hidden occurrence, then we should process tree update.
     */
    if( treeLoadInput.focusLoadAction &&
        treeLoadInput.focusLoadAction === true &&
        contextState.context ) {
        if( !_.isUndefined( treeLoadInput.loadIDs ) && !_.isUndefined( treeLoadInput.loadIDs.c_uid ) &&
            acePartialSelectionService.isPartiallySelected( treeLoadInput.loadIDs.c_uid ) &&
            acePartialSelectionService.isPartiallySelectedInTree( treeLoadInput.loadIDs.c_uid ) ) {
            return AwPromiseService.instance.reject( 'focus occurrence is hidden.' );
        }
    }
    appCtxSvc.updatePartialCtx( contextKey + '.treeLoadingInProgress', true );

    /**
     * Get the 'child' nodes async
     */
    var soaInput = occmgmtGetSvc.getDefaultSoaInput();
    // When focus load action triggered we need to send list of expanded nodes to server
    // Applications can consume expanded nodes information as needed
    if( treeLoadInput.focusLoadAction ) {
        contextState.context.requestPref.expandedNodes = occmgmtTreeTableStateService.getCSIDChainsForExpandedNodes( dataProvider );
        soaInput.inputData.requestPref.loadTreeHierarchyThreshold = [ '50' ];
    }

    return _doTreeTablePage( treeLoadInput, arguments[ 0 ].uwDataProvider, arguments[ 0 ].declViewModel, contextState, soaInput );
};

/**
 * Get a object containing callback function.
 * @return {Object} A object containing callback function.
 */
function getDataForUpdateColumnPropsAndNodeIconURLs() {
    var updateColumnPropsCallback = {};

    updateColumnPropsCallback.callUpdateColumnPropsAndNodeIconURLsFunction = function( propColumns, allChildNodes, contextKey, response, uwDataProvider ) {
        var columnConfigResult = null;
        let clientColumns = uwDataProvider && !_.isEmpty( uwDataProvider.cols ) ? _.filter( uwDataProvider.cols, { clientColumn: true } ) : [];
        propColumns = clientColumns.length > 0 ? _.concat( clientColumns, propColumns ) : propColumns;
        exports.updateColumnPropsAndNodeIconURLs( propColumns, allChildNodes, contextKey );

        let columnsConfig = response.output.columnConfig;
        columnsConfig.columns = _.sortBy( propColumns, function( column ) { return column.columnOrder; } );
        columnConfigResult = columnsConfig;

        _resetContextState( contextKey );
        return columnConfigResult;
    };

    return updateColumnPropsCallback;
}

/**
 * Get a page of row column data for a tree-table.
 *
 * Note: This method assumes there is a single argument object being passed to it and that this object has the
 * following property(ies) defined in it.
 * <P>
 * {PropertyLoadInput} propertyLoadInput - (found within the 'arguments' property passed to this function) The
 * PropertyLoadInput contains an array of PropertyLoadRequest objects this action function is invoked to
 * resolve.
 *
 * @return {Promise} A Promise resolved with a 'PropertyLoadResult' object containing the details of the result.
 */
export let loadTreeTableProperties = function() {
    arguments[ 0 ].updateColumnPropsCallback = getDataForUpdateColumnPropsAndNodeIconURLs();
    arguments[ 0 ].overriddenPropertyPolicy = _getEffectiveOverriddenPolicy();
    if( _.isUndefined( arguments[ 0 ].skipExtraBuffer ) || arguments[ 0 ].skipExtraBuffer === false ) {
        occmgmtTreeTableBufferService.addExtraBufferToPage( { propertyLoadInput: arguments[ 0 ].propertyLoadInput }, arguments[ 0 ].uwDataProvider );
    }
    return AwPromiseService.instance.resolve( treeTableDataService.loadTreeTableProperties( arguments[ 0 ] ) );
};

export let loadTreeTablePropertiesOnInitialLoad = function( vmNodes, declViewModel, uwDataProvider, context, contextKey ) {
    var updateColumnPropsCallback = getDataForUpdateColumnPropsAndNodeIconURLs();
    return AwPromiseService.instance.resolve( treeTableDataService.loadTreeTablePropertiesOnInitialLoad( vmNodes,
        declViewModel, uwDataProvider, context, contextKey, updateColumnPropsCallback, _getEffectiveOverriddenPolicy() ) );
};

export let getContextKeyFromParentScope = function( parentScope ) {
    return contextStateMgmtService.getContextKeyFromParentScope( parentScope );
};

/**
 * Makes sure the displayName on the ViewModelTreeNode is the same as the Column 0 ViewModelProperty
 * eventData : {Object} containing viewModelObjects and totalObjectsFound
 */
export let updateDisplayNames = function( eventData ) {
    //update the display name for all ViewModelObjects which should be viewModelTreeNodes
    if( eventData && eventData.viewModelObjects ) {
        _.forEach( eventData.viewModelObjects, function( updatedVMO ) {
            treeTableDataService.updateVMODisplayName( updatedVMO, _firstColumnConfigColumnPropertyName );
        } );
    }

    if( eventData && eventData.modifiedObjects && eventData.vmc ) {
        var loadedVMObjects = eventData.vmc.loadedVMObjects;
        _.forEach( eventData.modifiedObjects, function( modifiedObject ) {
            var modifiedVMOs = loadedVMObjects.filter( function( vmo ) { return vmo.id === modifiedObject.uid; } );
            _.forEach( modifiedVMOs, function( modifiedVMO ) {
                treeTableDataService.updateVMODisplayName( modifiedVMO, _firstColumnConfigColumnPropertyName );
            } );
        } );
    }
};

var _getTreeNodesToRemove = function( vmo, declViewModel ) {
    var treeNodesToRemove = [];
    if( vmo.children && vmo.children.length > 0 ) {
        _.forEach( vmo.children, function( childVMO ) {
            var childTreeNodesToRemove = _getTreeNodesToRemove( childVMO, declViewModel );
            treeNodesToRemove = treeNodesToRemove.concat( childTreeNodesToRemove );
            childVMO.children = [];
            childVMO.expanded = false;
        } );
        treeNodesToRemove = treeNodesToRemove.concat( vmo.children );
        vmo.children = [];
        vmo.expanded = false;
        var gridId = Object.keys( declViewModel.grids )[ 0 ];
        awTableStateService.saveRowCollapsed( declViewModel, gridId, vmo );
        delete vmo.isExpanded;
    }
    return treeNodesToRemove;
};

/**
 * Process the viewModelCollectionEvent
 *
 * @param {Object} event The viewModelCollectionEvent
 */
export let processViewModelCollectionEvent = function( data ) {
    var event = data.eventData;
    if( event.vmc ) {
        if( !_.isUndefined( appCtxSvc.ctx.clearInContextOverrides ) && appCtxSvc.ctx.clearInContextOverrides ) {
            appCtxSvc.updatePartialCtx( 'clearInContextOverrides', null );
        }
        var treeNodesToRemove = [];
        let incontext_uid = appCtxSvc.ctx.aceActiveContext.context.currentState.incontext_uid;
        var resetIncontextMode = false;
        _.forEach( event.modifiedObjects, function( mo ) {
            _.forEach( event.vmc.loadedVMObjects, function( vmo ) {
                if( mo.uid === vmo.uid ) {
                    //Update the display name
                    treeTableDataService.updateVMODisplayName( vmo, _firstColumnConfigColumnPropertyName );

                    // Understand the if the node is leaf or not
                    var numChildren = 0;
                    if( mo.props && mo.props.awb0NumberOfChildren &&
                        mo.props.awb0NumberOfChildren.dbValues &&
                        mo.props.awb0NumberOfChildren.dbValues.length ) {
                        numChildren = parseInt( mo.props.awb0NumberOfChildren.dbValues[ 0 ] );
                    }

                    //update children status
                    if( vmo.isLeaf !== ( numChildren === 0 ) ) {
                        vmo.isLeaf = numChildren === 0;
                        if( vmo.isLeaf && vmo.children && vmo.children.length > 0 ) {
                            treeNodesToRemove = _getTreeNodesToRemove( vmo, data );
                        }
                        // Come out of incontext mode if all its children are configured out
                        if( incontext_uid && _.isEqual( incontext_uid, vmo.uid ) && vmo.isLeaf ) {
                            resetIncontextMode = true;
                        }
                    }
                }
            } );
        } );

        // Come out of incontext mode if all its children or incontext node are configured out
        if( !_.isUndefined( incontext_uid ) && incontext_uid !== null ) {
            var treeNodeObj;
            if( treeNodesToRemove.length > 0 ) {
                treeNodeObj = treeNodesToRemove.filter( function( treeNode ) {
                    return incontext_uid === treeNode.uid;
                } );
            }

            if( resetIncontextMode ||  ( !_.isUndefined( treeNodeObj ) && treeNodeObj.length > 0 ) || ( !_.isUndefined( appCtxSvc.ctx.aceActiveContext.context.configContext )
                && !_.isUndefined( appCtxSvc.ctx.aceActiveContext.context.configContext.useGlobalRevRule ) &&  appCtxSvc.ctx.aceActiveContext.context.configContext.useGlobalRevRule ) ) {
                aceInContextOverrideService.cleanUpInContextOverrides();
                appCtxSvc.ctx.aceActiveContext.context.currentState.incontext_uid = incontext_uid;
                appCtxSvc.updatePartialCtx( 'clearInContextOverrides', true );
            }
        }

        if( treeNodesToRemove && treeNodesToRemove.length > 0 ) {
            event.vmc.removeLoadedObjects( treeNodesToRemove );
        }
    }
};

/**
 * @param {Object} loadedVMObjects all loaded view model objects whose visibility to be populated
 */
export let setOccVisibility = function( loadedVMObjects, contextKey, gridId ) {
    let viewKey = contextKey ? contextKey : appCtxSvc.ctx.aceActiveContext.key;
    let visibilityControlsCurrentValue = appCtxSvc.getCtx( viewKey + '.visibilityControls' );

    if( _.isArray( loadedVMObjects ) ) {
        var visibilityChangedVmos = [];
        var partialSelectionsToRemove = [];
        _.forEach( loadedVMObjects, function( target ) {
            var originalVisibility = target.visible;
            target.visible = occmgmtVisibilityService.getOccVisibility( cdmSvc.getObject( target.uid ), viewKey );
            if( originalVisibility !== target.visible ) {
                visibilityChangedVmos.push( target );
            }
            if( acePartialSelectionService.isHiddenNodePresentInPartialSelection( target.uid ) ) {
                partialSelectionsToRemove.push( target.uid );
            }
        } );
        if( partialSelectionsToRemove.length > 0 ) {
            acePartialSelectionService.removePartialSelection( [], partialSelectionsToRemove );
        }

        let visibilityControlsNewValue = appCtxSvc.getCtx( viewKey + '.visibilityControls' );

        if( visibilityChangedVmos.length || !_.isEqual( visibilityControlsCurrentValue, visibilityControlsNewValue ) ) {
            //event should also take visibilityStateChangedVMOs and update process only this.
            eventBus.publish( gridId + '.plTable.visibilityStateChanged' );
        }
    }
};

export let initialize = function() {
    _pciToExpandedNodesStableIdsMap = {};
    _expandedNodes = {};
    if( appCtxSvc.ctx.expandedNodes ) {
        _expandedNodes.nodes = _.cloneDeep( appCtxSvc.ctx.expandedNodes );
        delete appCtxSvc.ctx.expandedNodes;
    }
};

export let destroy = function() {
    _pciToExpandedNodesStableIdsMap = {};
    _.keys( _expandedNodes ).map( function( key ) {
        delete _expandedNodes[ key ];
    } );
    _expandedNodes = {};
};

export let retainCurrentExpansionState = function() {
    var expandedNodes = appCtxSvc.ctx.aceActiveContext.context.vmc.getLoadedViewModelObjects().filter( function( node ) {
        return node.isExpanded === true;
    } );
    appCtxSvc.ctx.expandedNodes = expandedNodes;
};

export let updateOccMgmtTreeTableColumns = function( data, dataProvider ) {
    if( dataProvider && data.newColumnConfig ) {
        var propColumns = data.newColumnConfig.columns;
        var context = appCtxSvc.ctx.aceActiveContext.key;
        let clientColumns = !_.isEmpty( dataProvider.cols ) ? _.filter( dataProvider.cols, { clientColumn: true } ) : [];
        propColumns = clientColumns.length > 0 ? _.concat( clientColumns, propColumns ) : propColumns;
        exports.updateColumnPropsAndNodeIconURLs( propColumns, dataProvider.getViewModelCollection().getLoadedViewModelObjects(), context );
        data.newColumnConfig.columns = _.sortBy( propColumns, function( column ) { return column.columnOrder; } );
        dataProvider.columnConfig = data.newColumnConfig;
    }
};

/**
 * In case of Saved Working Context in Tree view it can happen so that filter is applied to multiple products.<br>
 * The URL will have filter information only for the active product.<br>
 * If a non-active product is being expanded we check if its information is available in the cache and use it
 */
function updateFilterParamsOnInputForCurrentPciUid( currentPciUid, contextState ) {
    if( !contextState.context.requestPref.calculateFilters ) {
        return structureFilterService
            .computeFilterStringForNewProductContextInfo( currentPciUid );
    }
    return null;
}

/**
 * Updates the local storage with expanded nodes for input modelObjects.
 */
export let updateLocalStorage = function( eventData, declViewModel ) {
    // Earlier this was directly called from loadTreeTableData() before constructing the new VMOs.
    // Problem - awTableStateService.saveRowExpanded only updates the nodeStates and not the structure
    // As to update the structure, it relies on the vmc.loadedVMObjects which was not populated yet.
    // Solution - When the modelObjects are created the occDataProvider.modelObjectsUpdated event is fired.
    // We update the local storage now and both the nodeStates and structure is populated correctly, since the vmc.loadedVMObjects is available.
    if( declViewModel && eventData && eventData.viewModelObjects ) {
        var modelObjects = eventData.viewModelObjects;

        var gridId = Object.keys( declViewModel.grids )[ 0 ];
        for( var ndx = 0; ndx < modelObjects.length; ndx++ ) {
            if( modelObjects[ ndx ].isExpanded && !modelObjects[ ndx ].isLeaf ) {
                awTableStateService.saveRowExpanded( declViewModel, gridId, modelObjects[ ndx ] );
            }
        }
    }
};

var urlAttrs = browserUtils.getUrlAttributes();
_debug_logOccLoadActivity = urlAttrs.logOccLoadActivity !== undefined;

export default exports = {
    updateColumnPropsAndNodeIconURLs,
    loadTreeTableColumns,
    loadTreeTableData,
    loadTreeTableDataPage,
    loadOccurrencesWithFocusInTreeTable,
    loadNextOccurrencesInTreeTable,
    loadPreviousOccurrencesInTreeTable,
    loadTreeTableProperties,
    loadTreeTablePropertiesOnInitialLoad,
    getContextKeyFromParentScope,
    updateDisplayNames,
    processViewModelCollectionEvent,
    setOccVisibility,
    initialize,
    destroy,
    retainCurrentExpansionState,
    updateOccMgmtTreeTableColumns,
    updateLocalStorage
};
/**
 * @memberof NgServices
 * @member occmgmtTreeTableDataService
 */
app.factory( 'occmgmtTreeTableDataService', () => exports );
